// Helpers shared by tools that work on quadtree squares of a given depth.

const MAX_DEPTH = 30;

// The depth whose squares are about `cssPixels` wide on screen at the current zoom.
export function depthForCellSize(camera, cssPixels) {
  const ratio = window.devicePixelRatio || 1;
  const depth = Math.round(Math.log2(camera.scale / (cssPixels * ratio)));
  return Math.min(Math.max(depth, 0), MAX_DEPTH);
}

// Keeps a world coordinate inside the root square.
export function clampWorld(value) {
  return Math.min(Math.max(value, 0), 1 - Number.EPSILON);
}

// Column/row of the square at `depth` containing the world coordinate.
export function cellIndex(value, depth) {
  return Math.floor(clampWorld(value) * 2 ** depth);
}

// Draws a ghost over the world rectangle (x, y, width, height): filled with
// `color` at `alpha` opacity, outlined in black and white to show on any color.
export function drawGhostRect(ctx, camera, x, y, width, height, color, alpha) {
  const left = Math.round(camera.worldToScreenX(x));
  const top = Math.round(camera.worldToScreenY(y));
  const w = Math.round(camera.worldToScreenX(x + width)) - left;
  const h = Math.round(camera.worldToScreenY(y + height)) - top;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(left, top, w, h);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(left + 0.5, top + 0.5, w - 1, h - 1);
  if (w > 3 && h > 3) {
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(left + 1.5, top + 1.5, w - 3, h - 3);
  }
}

// Draws a dashed outline around an object's bounds (world coordinates).
export function drawBoxOutline(ctx, camera, bounds) {
  const left = Math.round(camera.worldToScreenX(bounds.x)) - 2;
  const top = Math.round(camera.worldToScreenY(bounds.y)) - 2;
  const right = Math.round(camera.worldToScreenX(bounds.x + bounds.width)) + 2;
  const bottom = Math.round(camera.worldToScreenY(bounds.y + bounds.height)) + 2;
  const ratio = window.devicePixelRatio || 1;

  ctx.lineWidth = Math.max(1, Math.round(ratio));
  ctx.setLineDash([4 * ratio, 4 * ratio]);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(left + 0.5, top + 0.5, right - left - 1, bottom - top - 1);
  ctx.lineDashOffset = 4 * ratio;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(left + 0.5, top + 0.5, right - left - 1, bottom - top - 1);
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

// Draws a solid highlight around a selected object's bounds (world coordinates).
export function drawSelectionOutline(ctx, camera, bounds) {
  const ratio = window.devicePixelRatio || 1;
  const pad = Math.round(3 * ratio);
  const left = Math.round(camera.worldToScreenX(bounds.x)) - pad;
  const top = Math.round(camera.worldToScreenY(bounds.y)) - pad;
  const right = Math.round(camera.worldToScreenX(bounds.x + bounds.width)) + pad;
  const bottom = Math.round(camera.worldToScreenY(bounds.y + bounds.height)) + pad;

  ctx.lineWidth = Math.round(4 * ratio);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(left, top, right - left, bottom - top);
  ctx.lineWidth = Math.round(2 * ratio);
  ctx.strokeStyle = "#2f7de1";
  ctx.strokeRect(left, top, right - left, bottom - top);
}

// Draws a ghost of a shape over a world rectangle: `path(ctx, left, top,
// width, height)` traces it in screen coordinates. A filled ghost is filled
// with `color` at `alpha` opacity; an outline ghost is a thick stroke of
// `color`. Both get a thin black and white outline to show on any color.
export function drawPathGhost(ctx, camera, x, y, width, height, path, color, alpha, filled = true) {
  const left = Math.round(camera.worldToScreenX(x));
  const top = Math.round(camera.worldToScreenY(y));
  const w = Math.round(camera.worldToScreenX(x + width)) - left;
  const h = Math.round(camera.worldToScreenY(y + height)) - top;

  ctx.beginPath();
  path(ctx, left, top, w, h);
  ctx.globalAlpha = alpha;
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#000";
  ctx.stroke();
}

// World rectangle of a box given in squares at `depth`.
export function boxToWorld({ col, row, width, height }, depth) {
  const size = 2 ** -depth;
  return { x: col * size, y: row * size, width: width * size, height: height * size };
}
