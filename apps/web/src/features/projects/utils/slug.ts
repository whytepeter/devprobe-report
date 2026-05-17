/** Lower-case, dash-separated, ascii-only. Trims leading/trailing dashes. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const SLUG_RE = /^[a-z0-9-]+$/;
