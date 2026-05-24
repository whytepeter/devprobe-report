/**
 * inline-markdown
 * ───────────────
 * Tiny, SAFE renderer for the small subset of markdown pin comments use:
 *   • [text](url)      → link (http/https/mailto only)
 *   • **bold**         → <strong>
 *   • _italic_         → <em>
 *   • `code`           → <code>
 *   • newlines         → <br>
 *
 * Everything is HTML-escaped FIRST, then only the whitelisted tags are
 * re-introduced, so a comment can never inject arbitrary markup. URLs are
 * scheme-checked to block javascript:/data: vectors.
 *
 * This is intentionally NOT a full markdown engine — pin comments are short.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(raw: string): string | null {
  const url = raw.trim();
  if (/^(https?:|mailto:)/i.test(url)) return url;
  // Allow protocol-relative + bare domains by assuming https.
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(url)) return `https://${url}`;
  return null;
}

/** Render inline markdown to a sanitized HTML string (safe for v-html). */
export function renderInlineMarkdown(input: string): string {
  // 1. Escape everything.
  let html = escapeHtml(input);

  // 2. Links: [text](url) — note the text/url are already escaped.
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, rawUrl: string) => {
    // rawUrl was escaped; unescape &amp; back for the href check only.
    const url = safeUrl(rawUrl.replace(/&amp;/g, "&"));
    if (!url) return `${text}`;
    const href = escapeHtml(url);
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80">${text}</a>`;
  });

  // 3. Bold / italic / code.
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[\s(])_([^_]+)_(?=[\s).,!?]|$)/g, "$1<em>$2</em>");
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono">$1</code>');

  // 4. Newlines.
  html = html.replace(/\n/g, "<br>");

  return html;
}
