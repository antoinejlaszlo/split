// Color picker tool (eyedropper): click, or drag, to make the color under the
// cursor the current color. It picks the color as displayed: where squares are
// smaller than a pixel, that is the average color of the visible square.
// A swatch next to the cursor previews the color that would be picked.

import { setColor } from "../../core/state.js";
import { rgbToHex } from "../../core/color.js";
import { clampWorld } from "./grid.js";

const SWATCH_SIZE = 28; // CSS pixels
const SWATCH_OFFSET = 14; // CSS pixels from the cursor

export function createPickerTool({ camera, quadtree, requestRender }) {
  let hover = null; // last pointer position on screen, or null when outside
  let picking = false;

  // Color shown at a screen point: the leaf there, or its smallest ancestor
  // that is at least one pixel wide (like the renderer draws it).
  function colorAt(screenX, screenY) {
    const world = camera.screenToWorld(screenX, screenY);
    let x = clampWorld(world.x);
    let y = clampWorld(world.y);
    let node = quadtree;
    let size = 1;
    while (node.children !== null && (size / 2) * camera.scale >= 1) {
      size /= 2;
      const right = x >= 0.5 ? 1 : 0;
      const bottom = y >= 0.5 ? 1 : 0;
      node = node.children[bottom * 2 + right];
      x = 2 * x - right;
      y = 2 * y - bottom;
    }
    return rgbToHex(node.color);
  }

  function pick() {
    if (hover) setColor(colorAt(hover.x, hover.y));
  }

  return {
    label: "Color picker",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 4.5l5 5"/><path d="M17 2.5a2.1 2.1 0 0 1 3 3l-2.5 2.5-3-3L17 2.5z"/><path d="M14.5 7.5L5 17v2h2l9.5-9.5"/>
    </svg>`,
    cursor: "crosshair",

    deactivate() {
      hover = null;
      picking = false;
      requestRender({ tree: false });
    },

    onPointerDown(pointer) {
      if (pointer.event.button !== 0) return;
      hover = { x: pointer.screenX, y: pointer.screenY };
      picking = true;
      pick();
    },

    onPointerMove(pointer) {
      hover = { x: pointer.screenX, y: pointer.screenY };
      if (picking) pick();
      requestRender({ tree: false });
    },

    onPointerUp() {
      picking = false;
    },

    onPointerLeave() {
      hover = null;
      requestRender({ tree: false });
    },

    // Swatch of the color under the cursor, below-right of it (kept inside the view).
    drawOverlay(ctx, camera) {
      if (!hover) return;
      const ratio = window.devicePixelRatio || 1;
      const size = Math.round(SWATCH_SIZE * ratio);
      const offset = Math.round(SWATCH_OFFSET * ratio);
      let left = Math.round(hover.x) + offset;
      let top = Math.round(hover.y) + offset;
      if (left + size > camera.width) left = Math.round(hover.x) - offset - size;
      if (top + size > camera.height) top = Math.round(hover.y) - offset - size;

      ctx.fillStyle = colorAt(hover.x, hover.y);
      ctx.fillRect(left, top, size, size);
      ctx.lineWidth = Math.max(1, Math.round(2 * ratio));
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(left, top, size, size);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#000";
      ctx.strokeRect(left - 1.5, top - 1.5, size + 3, size + 3);
    },
  };
}
