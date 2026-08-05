/**
 * The color-consistency rule (spec item #3 / #10: "maintain chunk color
 * consistency throughout the application") lives in exactly one place.
 * Every stage that renders a chunk swatch imports `chunkColorClass`
 * instead of computing its own palette index, so there is only ever one
 * mapping from chunk → color in the whole app.
 */
const PALETTE_SIZE = 6;

/**
 * The literal hex values behind chunk-palette-0..5 in tokens.css. Mirrors
 * that file exactly (single source of truth is tokens.css; this is a
 * read-only reflection of it) — needed anywhere a gradient or canvas draw
 * needs an actual color value rather than a CSS class name, e.g. the
 * Chunk Explorer's overlap-region gradient, which blends two different
 * chunks' colors and can't be expressed with one class alone.
 */
const CHUNK_PALETTE_HEX: { bg: string; fg: string }[] = [
  { bg: "#eaf7f1", fg: "#1f8f63" },
  { bg: "#fdf1ea", fg: "#d97a3e" },
  { bg: "#f1effc", fg: "#7c6ae0" },
  { bg: "#fef6e6", fg: "#d9a62e" },
  { bg: "#eaf3fc", fg: "#3e7fd9" },
  { bg: "#fceef3", fg: "#d95c8c" },
];

export function chunkColorHex(index: number): { bg: string; fg: string } {
  const i = ((index % CHUNK_PALETTE_HEX.length) + CHUNK_PALETTE_HEX.length) % CHUNK_PALETTE_HEX.length;
  return CHUNK_PALETTE_HEX[i]!;
}

export function chunkColorClass(index: number): string {
  return `chunk-palette-${((index % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE}`;
}

export function pageColorClass(pageNumber: number): string {
  const PAGE_PALETTE_SIZE = 5;
  return `page-palette-${((pageNumber - 1) % PAGE_PALETTE_SIZE + PAGE_PALETTE_SIZE) % PAGE_PALETTE_SIZE}`;
}
