// Select tool: works on objects (texts, shapes…) of the object layer.
// - Hovering an object outlines its box.
// - Click an object to select it; click elsewhere to deselect.
// - Resizable objects (shapes) show handles: drag one to resize. A ghost shows
//   the new shape, which is applied when the button is released.
// - Delete or Backspace removes the selected object entirely; Escape deselects.

import { state } from "../../core/state.js";
import { objectTypes } from "../../core/objects/types.js";
import {
  cellIndex, boxToWorld, drawBoxOutline, drawSelectionOutline, drawPathGhost,
} from "./grid.js";

const HANDLE_SIZE = 8; // CSS pixels

// Handles as [horizontal, vertical] sides: -1 = left/top, 1 = right/bottom, 0 = middle.
const HANDLES = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];

function handleCursor([hx, hy]) {
  if (hx === 0) return "ns-resize";
  if (hy === 0) return "ew-resize";
  return hx === hy ? "nwse-resize" : "nesw-resize";
}

export function createSelectTool({ camera, objects, requestRender }) {
  let hover = null; // last pointer position on screen, or null when outside
  let selected = null;
  let resize = null; // { handle, box } while dragging a handle

  function isResizable(object) {
    const type = objectTypes[object.type];
    return Boolean(type.box && type.withBox);
  }

  function objectUnder(screen) {
    if (!screen) return null;
    const world = camera.screenToWorld(screen.x, screen.y);
    return objects.objectAt(world.x, world.y);
  }

  // Screen positions of the selected object's handles.
  function handlePositions() {
    const { x, y, width, height } = selected.bounds;
    const left = camera.worldToScreenX(x);
    const right = camera.worldToScreenX(x + width);
    const top = camera.worldToScreenY(y);
    const bottom = camera.worldToScreenY(y + height);
    return HANDLES.map((handle) => ({
      handle,
      x: [left, (left + right) / 2, right][handle[0] + 1],
      y: [top, (top + bottom) / 2, bottom][handle[1] + 1],
    }));
  }

  function handleUnder(screen) {
    if (!screen || !selected || !isResizable(selected)) return null;
    const reach = (HANDLE_SIZE / 2 + 3) * (window.devicePixelRatio || 1);
    for (const { handle, x, y } of handlePositions()) {
      if (Math.abs(screen.x - x) <= reach && Math.abs(screen.y - y) <= reach) return handle;
    }
    return null;
  }

  // New box (in squares) when dragging `handle` to the pointer.
  function resizedBox(handle, pointer) {
    const start = objectTypes[selected.type].box(selected.params);
    const depth = selected.depth;
    let left = start.col;
    let top = start.row;
    let right = start.col + start.width;
    let bottom = start.row + start.height;
    const col = cellIndex(pointer.worldX, depth);
    const row = cellIndex(pointer.worldY, depth);
    if (handle[0] < 0) left = Math.min(col, right - 1);
    if (handle[0] > 0) right = Math.max(col + 1, left + 1);
    if (handle[1] < 0) top = Math.min(row, bottom - 1);
    if (handle[1] > 0) bottom = Math.max(row + 1, top + 1);
    return { col: left, row: top, width: right - left, height: bottom - top };
  }

  function drawHandles(ctx) {
    const ratio = window.devicePixelRatio || 1;
    const size = Math.round(HANDLE_SIZE * ratio);
    ctx.lineWidth = Math.max(1, Math.round(ratio));
    for (const { x, y } of handlePositions()) {
      const left = Math.round(x - size / 2);
      const top = Math.round(y - size / 2);
      ctx.fillStyle = "#fff";
      ctx.fillRect(left, top, size, size);
      ctx.strokeStyle = "#2f7de1";
      ctx.strokeRect(left + 0.5, top + 0.5, size - 1, size - 1);
    }
  }

  const tool = {
    label: "Select",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 3l14 8-6 2-3 6L5 3z"/>
    </svg>`,

    get cursor() {
      const handle = resize?.handle ?? handleUnder(hover);
      return handle ? handleCursor(handle) : "default";
    },

    deactivate() {
      hover = null;
      selected = null;
      resize = null;
      requestRender({ tree: false });
    },

    onPointerDown(pointer) {
      if (pointer.event.button !== 0) return;
      hover = { x: pointer.screenX, y: pointer.screenY };
      const handle = handleUnder(hover);
      if (handle) {
        resize = { handle, box: objectTypes[selected.type].box(selected.params) };
      } else {
        selected = objectUnder(hover);
      }
      requestRender({ tree: false });
    },

    onPointerMove(pointer) {
      hover = { x: pointer.screenX, y: pointer.screenY };
      if (resize) resize.box = resizedBox(resize.handle, pointer);
      requestRender({ tree: false });
    },

    onPointerUp() {
      if (!resize) return;
      const type = objectTypes[selected.type];
      objects.update(selected, type.withBox(selected.params, resize.box));
      resize = null;
      requestRender();
    },

    onPointerLeave() {
      hover = null;
      requestRender({ tree: false });
    },

    drawOverlay(ctx, camera) {
      if (resize) {
        const bounds = boxToWorld(resize.box, selected.depth);
        const type = objectTypes[selected.type];
        if (type.path) {
          drawPathGhost(ctx, camera, bounds.x, bounds.y, bounds.width, bounds.height,
            type.path, selected.params.color, 0.5, selected.params.filled !== false);
        }
        drawSelectionOutline(ctx, camera, bounds);
        return;
      }
      const hovered = objectUnder(hover);
      if (hovered && hovered !== selected) drawBoxOutline(ctx, camera, hovered.bounds);
      if (selected) {
        drawSelectionOutline(ctx, camera, selected.bounds);
        if (isResizable(selected)) drawHandles(ctx);
      }
    },
  };

  window.addEventListener("keydown", (event) => {
    if (state.activeTool !== tool || !selected || resize) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      objects.remove(selected);
      selected = null;
      requestRender();
      event.preventDefault();
    } else if (event.key === "Escape") {
      selected = null;
      requestRender({ tree: false });
    }
  });

  return tool;
}
