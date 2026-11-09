// Pencil tool: paints quadtree squares with the current color.
// The square size follows the zoom (about TARGET_CELL_SIZE pixels on screen,
// times the "Size" option),
// and a ghost shows the square that will be painted. When a stroke ends, the
// quadtree is minimized over the stroke's area (same-colored squares merged).

import { state, documentChanged } from "../state.js";
import { hexToRgb } from "../color.js";
import { depthForCellSize, clampWorld, cellIndex, drawGhostRect } from "./grid.js";

const TARGET_CELL_SIZE = 32; // CSS pixels

export function createPencilTool({ camera, quadtree, requestRender }) {
  let hover = null; // last pointer position on screen, or null when outside
  let stroke = null; // { depth, x, y, area } while the button is held

  // Size of the squares relative to TARGET_CELL_SIZE (powers of two, so each
  // step is one quadtree level).
  const optionValues = { size: 1 };

  function currentDepth() {
    return depthForCellSize(camera, TARGET_CELL_SIZE * optionValues.size);
  }

  function paint(x, y, depth) {
    x = clampWorld(x);
    y = clampWorld(y);
    // Grow the stroke's area to include this square.
    const size = 2 ** -depth;
    const left = Math.floor(x / size) * size;
    const top = Math.floor(y / size) * size;
    const area = stroke.area;
    area.left = Math.min(area.left, left);
    area.top = Math.min(area.top, top);
    area.right = Math.max(area.right, left + size);
    area.bottom = Math.max(area.bottom, top + size);
    return quadtree.paintAt(x, y, depth, hexToRgb(state.color));
  }

  // Paints every square along the segment, so fast strokes leave no gaps.
  function paintLine(x0, y0, x1, y1, depth) {
    const step = 2 ** -depth / 2;
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    let changed = false;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      changed = paint(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, depth) || changed;
    }
    return changed;
  }

  return {
    label: "Pencil",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 3l5 5L8 21H3v-5L16 3z"/><path d="M13 6l5 5"/>
    </svg>`,
    cursor: "crosshair",

    // Shown in the options panel.
    options: [
      {
        key: "size",
        label: "Size",
        choices: [
          { value: 0.25, label: "¼" },
          { value: 0.5, label: "½" },
          { value: 1, label: "1" },
          { value: 2, label: "2" },
          { value: 4, label: "4" },
        ],
      },
    ],
    optionValues,

    deactivate() {
      hover = null;
      stroke = null;
      requestRender({ tree: false });
    },

    onPointerDown(pointer) {
      if (pointer.event.button !== 0) return;
      hover = { x: pointer.screenX, y: pointer.screenY };
      // The square size stays the same for the whole stroke.
      stroke = {
        depth: currentDepth(),
        x: pointer.worldX,
        y: pointer.worldY,
        area: { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
      };
      paint(stroke.x, stroke.y, stroke.depth);
      requestRender();
    },

    onPointerMove(pointer) {
      hover = { x: pointer.screenX, y: pointer.screenY };
      if (!stroke) {
        requestRender({ tree: false });
        return;
      }
      const changed = paintLine(stroke.x, stroke.y, pointer.worldX, pointer.worldY, stroke.depth);
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

    // Ghost: the square under the pointer. Hidden when that square cannot be
    // painted (it has smaller squares inside).
    drawOverlay(ctx, camera) {
      if (!hover) return;
      const world = camera.screenToWorld(hover.x, hover.y);
      const depth = stroke?.depth ?? currentDepth();
      if (!quadtree.canPaintAt(clampWorld(world.x), clampWorld(world.y), depth)) return;
      const size = 2 ** -depth;
      const x = cellIndex(world.x, depth) * size;
      const y = cellIndex(world.y, depth) * size;
      drawGhostRect(ctx, camera, x, y, size, size, state.color, 0.5);
    },
  };
}
