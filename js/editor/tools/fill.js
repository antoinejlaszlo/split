// Fill tool: like the pencil, but the ghost is the leaf under the cursor,
// whatever its size, and clicking (or dragging over leaves) recolors those
// leaves with the current color. When the stroke ends, the quadtree is
// minimized over the stroke's area (same-colored squares merged).

import { state, documentChanged } from "../../core/state.js";
import { hexToRgb } from "../../core/color.js";
import { clampWorld, drawGhostRect } from "./grid.js";

export function createFillTool({ camera, quadtree, requestRender }) {
  let hover = null; // last pointer position on screen, or null when outside
  let stroke = null; // { x, y, area } while the button is held

  // Recolors the leaf containing the world point. Returns whether it changed.
  function fill(x, y) {
    const leaf = quadtree.leafAt(clampWorld(x), clampWorld(y));
    const area = stroke.area;
    area.left = Math.min(area.left, leaf.x);
    area.top = Math.min(area.top, leaf.y);
    area.right = Math.max(area.right, leaf.x + leaf.size);
    area.bottom = Math.max(area.bottom, leaf.y + leaf.size);
    // Painting at the leaf's own depth recolors it and updates its ancestors.
    return quadtree.paintAt(leaf.x + leaf.size / 2, leaf.y + leaf.size / 2, leaf.depth, hexToRgb(state.color));
  }

  // Fills every leaf along the segment, sampling about every screen pixel.
  function fillLine(x0, y0, x1, y1) {
    const step = 1 / camera.scale;
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    let changed = false;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      changed = fill(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) || changed;
    }
    return changed;
  }

  return {
    label: "Fill",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 12l7-7 8 8-7 7-8-8z"/><path d="M4 12h15"/><path d="M20 16s2 2.5 2 3.5a2 2 0 0 1-4 0c0-1 2-3.5 2-3.5z"/>
    </svg>`,
    cursor: "crosshair",

    deactivate() {
      hover = null;
      stroke = null;
      requestRender({ tree: false });
    },

    onPointerDown(pointer) {
      if (pointer.event.button !== 0) return;
      hover = { x: pointer.screenX, y: pointer.screenY };
      stroke = {
        x: pointer.worldX,
        y: pointer.worldY,
        area: { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
      };
      fill(stroke.x, stroke.y);
      requestRender();
    },

    onPointerMove(pointer) {
      hover = { x: pointer.screenX, y: pointer.screenY };
      if (!stroke) {
        requestRender({ tree: false });
        return;
      }
      const changed = fillLine(stroke.x, stroke.y, pointer.worldX, pointer.worldY);
      stroke.x = pointer.worldX;
      stroke.y = pointer.worldY;
      requestRender({ tree: changed });
    },

    onPointerUp() {
      if (!stroke) return;
      const { left, top, right, bottom } = stroke.area;
      quadtree.minimize({ x: left, y: top, width: right - left, height: bottom - top });
      stroke = null;
      documentChanged();
      requestRender();
    },

    onPointerLeave() {
      hover = null;
      requestRender({ tree: false });
    },

    // Ghost: the leaf under the pointer, at its real size.
    drawOverlay(ctx, camera) {
      if (!hover) return;
      const world = camera.screenToWorld(hover.x, hover.y);
      const leaf = quadtree.leafAt(clampWorld(world.x), clampWorld(world.y));
      drawGhostRect(ctx, camera, leaf.x, leaf.y, leaf.size, leaf.size, state.color, 0.5);
    },
  };
}
