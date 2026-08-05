// ---------------------------------------------------------------------------
// Padded, axis-labeled chart layout — used by the "Query Similarity" chart
// (real gridlines/ticks/axis titles, not a bare box).
// ---------------------------------------------------------------------------

export const AXIS_CHART_WIDTH = 620;
export const AXIS_CHART_HEIGHT = 380;
export const AXIS_PADDING = { left: 46, right: 20, top: 14, bottom: 38 };

export interface AxisBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** Data-space bounds across every point that will be plotted (chunks plus
 *  the question point, if any) — computed from real coordinates, not a
 *  fixed range, so the chart always frames whatever's actually on it. */
export function computeAxisBounds(points: { x: number; y: number }[]): AxisBounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs) - 0.4;
  const xMax = Math.max(...xs) + 0.4;
  const yMin = Math.min(...ys) - 0.4;
  const yMax = Math.max(...ys) + 0.4;
  return { xMin, xMax, yMin, yMax };
}

export function toAxisCoords(x: number, y: number, bounds: AxisBounds) {
  const plotWidth = AXIS_CHART_WIDTH - AXIS_PADDING.left - AXIS_PADDING.right;
  const plotHeight = AXIS_CHART_HEIGHT - AXIS_PADDING.top - AXIS_PADDING.bottom;
  const px = AXIS_PADDING.left + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * plotWidth;
  const py = AXIS_PADDING.top + plotHeight - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * plotHeight;
  return { px, py };
}

/** 5 evenly-spaced tick values across a data-space range, for gridlines
 *  and axis tick labels. */
export function axisTicks(min: number, max: number, count = 5): number[] {
  return Array.from({ length: count + 1 }, (_, i) => min + ((max - min) * i) / count);
}

/**
 * Percentile-trimmed bounds, used instead of raw min/max when plotting
 * real backend embeddings. Real 2D projections can contain a genuine
 * outlier chunk whose position is far from the rest — with a plain
 * min/max range, that single point stretches the whole chart's scale
 * until every other point collapses into one corner, unreadable (this
 * is exactly what real testing surfaced). Trimming to the 10th-90th
 * percentile per axis keeps the chart legible for the cluster where
 * almost all the real data actually is; outlier points still render,
 * just clamped to the plot's edge via clampToBounds below rather than
 * being allowed to compress everything else.
 */
export function computeRobustAxisBounds(points: { x: number; y: number }[]): AxisBounds {
  if (points.length <= 4) return computeAxisBounds(points);
  const percentile = (sorted: number[], p: number) => sorted[Math.floor((sorted.length - 1) * p)]!;
  const xs = points.map((p) => p.x).sort((a, b) => a - b);
  const ys = points.map((p) => p.y).sort((a, b) => a - b);
  const xMin = percentile(xs, 0.1) - 0.4;
  const xMax = percentile(xs, 0.9) + 0.4;
  const yMin = percentile(ys, 0.1) - 0.4;
  const yMax = percentile(ys, 0.9) + 0.4;
  // Degenerate case (e.g. every point nearly identical after trimming) —
  // fall back to plain bounds rather than risk a zero-width range.
  if (xMax - xMin < 0.1 || yMax - yMin < 0.1) return computeAxisBounds(points);
  return { xMin, xMax, yMin, yMax };
}

/** Clamps a data-space point into an AxisBounds range before projecting
 *  to pixel coords — used together with computeRobustAxisBounds so an
 *  outlier point still appears (pinned to the edge) instead of vanishing
 *  off-chart. */
export function clampToBounds(x: number, y: number, bounds: AxisBounds): { x: number; y: number } {
  return {
    x: Math.min(bounds.xMax, Math.max(bounds.xMin, x)),
    y: Math.min(bounds.yMax, Math.max(bounds.yMin, y)),
  };
}
