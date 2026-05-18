/**
 * Offscreen recording host.
 *
 * Lives in a hidden chrome offscreen document so that the MediaRecorder is
 * NOT tied to the captured page's JS lifecycle. The captured tab can reload,
 * navigate, or be closed-and-reopened without losing the in-flight recording.
 *
 * Message contract (chrome.runtime.sendMessage / onMessage):
 *
 *   ◀ START_OFFSCREEN  { streamId, mimeType?, startedAt }   → owner: background
 *     Begin a new recording from the given chrome.tabCapture stream id.
 *
 *   ◀ PAUSE_OFFSCREEN                                       → owner: background
 *   ◀ RESUME_OFFSCREEN                                      → owner: background
 *
 *   ◀ STOP_OFFSCREEN                                        → owner: background
 *     Finalises the WebM blob and replies asynchronously via a SEND with the
 *     blob base64-encoded so any context can rebuild it. Once SEND is dispatched
 *     the offscreen document closes itself (caller closes via background).
 *
 *   ▶ OFFSCREEN_READY                                       → broadcast on load
 *   ▶ OFFSCREEN_BLOB  { base64, mimeType, durationMs }      → on stop, success
 *   ▶ OFFSCREEN_ERROR { message }                           → on any failure
 *
 * Privacy: the offscreen never persists outside its own window.
 */

interface ActiveRecording {
  stream:    MediaStream;
  recorder:  MediaRecorder;
  chunks:    Blob[];
  mimeType:  string;
  startedAt: number;     // performance.now() in this document
  startedAtEpoch: number; // Date.now() — useful for cross-context timestamps
}

let active: ActiveRecording | null = null;

const PREFERRED_MIME = 'video/webm;codecs=vp9';

function pickMime(): string {
  if (MediaRecorder.isTypeSupported(PREFERRED_MIME)) return PREFERRED_MIME;
  if (MediaRecorder.isTypeSupported('video/webm'))   return 'video/webm';
  return '';
}

/** Hand a chrome.tabCapture stream id to getUserMedia, returns a MediaStream. */
async function streamFromTabCaptureId(streamId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    // Chrome's legacy constraint shape — DOM types don't model it.
    video: {
      mandatory: {
        chromeMediaSource:   'tab',
        chromeMediaSourceId: streamId,
      },
    } as unknown as MediaTrackConstraints,
  });
}

async function start(streamId: string, startedAtEpoch: number) {
  if (active) return; // ignore double-start
  const stream    = await streamFromTabCaptureId(streamId);
  const mimeType  = pickMime() || 'video/webm';
  const recorder  = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  active = { stream, recorder, chunks, mimeType, startedAt: performance.now(), startedAtEpoch };

  // 250ms chunks so the buffer stays small even if recording is long.
  recorder.start(250);

  // If the user clicks the browser's native "Stop sharing", finalise.
  stream.getVideoTracks()[0]?.addEventListener('ended', () => { void stop(); });
}

async function pause() { active?.recorder.state === 'recording' && active.recorder.pause(); }
async function resume() { active?.recorder.state === 'paused'    && active.recorder.resume(); }

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

async function stop() {
  if (!active) return;
  const a = active;
  active  = null;

  await new Promise<void>((resolve) => {
    a.recorder.addEventListener('stop', () => resolve(), { once: true });
    try { a.recorder.stop(); } catch { resolve(); }
  });

  // Release the screen-capture tracks so the browser's "Sharing this tab"
  // indicator goes away promptly.
  a.stream.getTracks().forEach((t) => t.stop());

  const blob       = new Blob(a.chunks, { type: a.mimeType });
  const durationMs = Math.round(performance.now() - a.startedAt);

  try {
    const base64 = bufferToBase64(await blob.arrayBuffer());
    chrome.runtime.sendMessage({
      type:       'OFFSCREEN_BLOB',
      base64,
      mimeType:   a.mimeType,
      durationMs,
      startedAtEpoch: a.startedAtEpoch,
      stoppedAtEpoch: Date.now(),
    });
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
          // Don't await — the actual blob comes back via OFFSCREEN_BLOB.
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
