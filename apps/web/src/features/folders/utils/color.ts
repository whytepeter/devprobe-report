// Deterministic color assignment for folders + workspaces, so the same id
// always renders in the same hue across reloads. Six tailwind-aligned tones
// that read well on both light + dark backgrounds.
const FOLDER_COLORS = [
  "text-sky-500",      // blue
  "text-emerald-500",  // green
  "text-rose-500",     // red
  "text-amber-500",    // amber
  "text-violet-500",   // violet
  "text-cyan-500",     // cyan
];

const WORKSPACE_BG = [
  "bg-rose-500",
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-cyan-500",
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i);
  return Math.abs(h);
}

export function folderColor(id: string): string {
  return FOLDER_COLORS[hash(id) % FOLDER_COLORS.length]!;
}

export function workspaceBg(id: string): string {
  return WORKSPACE_BG[hash(id) % WORKSPACE_BG.length]!;
}
