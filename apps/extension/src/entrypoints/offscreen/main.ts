/**
 * Offscreen recording host.
 *
 * Lives in a hidden chrome offscreen document so that the MediaRecorder is
 * NOT tied to the captured page's JS lifecycle. The captured tab can reload,
 * navigate, or be closed-and-reopened without losing the in-flight recording.
 *
 * Multi-segment recording (reload recovery)
 * ─────────────────────────────────────────
 * When the captured tab reloads/navigates, Chrome ends the tabCapture stream
 * (the underlying framebuffer is destroyed). We cannot silently re-acquire —
 * `chrome.tabCapture.getMediaStreamId` requires a fresh user gesture. So:
 *
 *   1. On track 'ended', ask the background what to do.
 *   2. If background says 'pause' (tab still alive → reload/nav): finalise the
 *      current segment into `segments[]` and clear `active`. Don't notify the
 *      user yet; the new page's content script will show a Resume banner.
 *   3. If background says 'finalise' (real stop or tab gone): combine all
 *      segments and emit OFFSCREEN_BLOB.
 *
 * Resume = the user clicks "Resume" on the new page → user gesture → background
 * mints a fresh stream → START_OFFSCREEN again. `segments[]` survives because
 * the offscreen document does.
 *
 * Message contract (chrome.runtime.sendMessage / onMessage):
 *
 *   ◀ START_OFFSCREEN  { streamId, startedAtEpoch }       → owner: background
 *     Begin a recording (initial) OR resume after interruption (segments[]
 *     accumulated so far is preserved).
 *
 *   ◀ PAUSE_OFFSCREEN                                     → owner: background
 *   ◀ RESUME_OFFSCREEN                                    → owner: background
 *     User-initiated pause/resume (vs. interruption — that's different).
 *
 *   ◀ STOP_OFFSCREEN                                      → owner: background
 *     Finalise: combine `segments[]` + current chunks → emit OFFSCREEN_BLOB.
 *
 *   ▶ OFFSCREEN_READY                                     → broadcast on load
 *   ▶ OFFSCREEN_TRACK_ENDED                               → on track 'ended'
 *     Background replies with { action: 'pause' | 'finalise' }.
 *   ▶ OFFSCREEN_BLOB    { segments: { base64; mimeType; durationMs }[] }
 *     Emitted on real finalise (STOP_OFFSCREEN). Includes ALL segments from
 *     the session in chronological order.
 *   ▶ OFFSCREEN_ERROR   { message }                       → on any failure
 */

interface ActiveRecording {
  stream:         MediaStream;
  recorder:       MediaRecorder;
  chunks:         Blob[];
  mimeType:       string;
  startedAt:      number;     // performance.now() when this segment started
  startedAtEpoch: number;     // Date.now() — for cross-context timestamps
}

interface SegmentBlob {
  base64:     string;
  mimeType:   string;
  durationMs: number;
}

let active: ActiveRecording | null = null;
const segments: SegmentBlob[] = []; // accumulated across interruptions

const PREFERRED_MIME    = 'video/webm;codecs=vp9';
const MAX_RECORDING_MS  = 5 * 60 * 1000;

function pickMime(): string {
  if (MediaRecorder.isTypeSupported(PREFERRED_MIME)) return PREFERRED_MIME;
  if (MediaRecorder.isTypeSupported('video/webm'))   return 'video/webm';
  return '';
}

/** Hand a chrome.tabCapture stream id to getUserMedia → MediaStream. */
async function streamFromTabCaptureId(streamId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource:   'tab',
        chromeMediaSourceId: streamId,
      },
    } as unknown as MediaTrackConstraints,
  });
}

/** Convert ArrayBuffer → base64 in chunks to dodge call-stack overflow on big blobs. */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  }
  return btoa(binary);
}

/** Wait for the current MediaRecorder's `stop` event, then return the resulting blob + duration. */
async function flushRecorder(a: ActiveRecording): Promise<{ blob: Blob; durationMs: number }> {
  await new Promise<void>((resolve) => {
    a.recorder.addEventListener('stop', () => resolve(), { once: true });
    try { a.recorder.stop(); } catch { resolve(); }
  });
  a.stream.getTracks().forEach((t) => t.stop());
  const blob       = new Blob(a.chunks, { type: a.mimeType });
  const durationMs = Math.round(performance.now() - a.startedAt);
  return { blob, durationMs };
}

/**
 * Park the current segment into `segments[]` so a future Resume can keep
 * recording without losing what was captured. Used when an interruption is
 * detected (track ended but tab is still around).
 */
async function parkCurrentSegment(): Promise<void> {
  if (!active) return;
  const a = active;
  active = null;
  const { blob, durationMs } = await flushRecorder(a);
  const base64 = bufferToBase64(await blob.arrayBuffer());
  segments.push({ base64, mimeType: a.mimeType, durationMs });
}

async function start(streamId: string, startedAtEpoch: number) {
  if (active) return; // double-start guard; segments[] is preserved as-is

  const stream   = await streamFromTabCaptureId(streamId);
  const mimeType = pickMime() || 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  active = { stream, recorder, chunks, mimeType, startedAt: performance.now(), startedAtEpoch };

  recorder.start(250);

  // Track ended → reload, nav, or user clicked "Stop sharing". Ask background
  // which case it is; finalise vs park accordingly.
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    void handleTrackEnded();
  });

  // Hard cap.
  setTimeout(() => { void stop(); }, MAX_RECORDING_MS);
}

async function pause()  { active?.recorder.state === 'recording' && active.recorder.pause();  }
async function resume() { active?.recorder.state === 'paused'    && active.recorder.resume(); }

async function handleTrackEnded() {
  if (!active) return;
  let action: 'pause' | 'finalise' = 'finalise';
  try {
    const res = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_TRACK_ENDED' });
    if (res?.action === 'pause') action = 'pause';
  } catch { /* background unreachable; default to finalise */ }

  if (action === 'pause') {
    await parkCurrentSegment();
    // Stay alive — wait for the next START_OFFSCREEN (Resume).
  } else {
    await stop();
  }
}

async function stop() {
  if (active) {
    await parkCurrentSegment();
  }
  if (segments.length === 0) {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', message: 'No segments to emit' });
    return;
  }
  const payload = { type: 'OFFSCREEN_BLOB', segments: segments.slice(), stoppedAtEpoch: Date.now() };
  segments.length = 0; // clear for next session
  try {
    chrome.runtime.sendMessage(payload);
  } catch (e) {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_ERROR', message: (e as Error).message });
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg?.type) {
        case 'START_OFFSCREEN':
          await start(msg.streamId, msg.startedAtEpoch ?? Date.now());
          sendResponse({ ok: true });
          break;
        case 'PAUSE_OFFSCREEN':
          await pause();
          sendResponse({ ok: true });
          break;
        case 'RESUME_OFFSCREEN':
          await resume();
          sendResponse({ ok: true });
          break;
        case 'STOP_OFFSCREEN':
          void stop();
          sendResponse({ ok: true });
          break;
        default:
          sendResponse({ ok: false, error: `Unknown offscreen msg: ${msg?.type}` });
      }
    } catch (e) {
      sendResponse({ ok: false, error: (e as Error).message });
    }
  })();
  return true; // async response
});

// Broadcast readiness so the background can stop waiting on createDocument().
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' });
