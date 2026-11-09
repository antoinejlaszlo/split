// Shape tools (rectangle, ellipse): drag from one corner to the opposite one
// to create a shape object with the current color, filled or as an outline
// (tool option). A ghost shows the shape while dragging, and the starting
// pixel while hovering.

import { state } from "../state.js";
import { objectTypes } from "../objects/types.js";
import { depthForCellSize, cellIndex, drawGhostRect, drawPathGhost, boxToWorld } from "./grid.js";

const SHAPE_PIXEL_SIZE = 2; // CSS pixels per shape pixel on screen, when starting a shape

export function createShapeTool({ type, label, icon }, { camera, objects, requestRender }) {
  const shape = objectTypes[type];
  let hover = null; // last pointer position on screen, or null when outside
  let drag = null; // { depth, startCol, startRow, endCol, endRow } while dragging

  function dragBox() {
    return {
      col: Math.min(drag.startCol, drag.endCol),
      row: Math.min(drag.startRow, drag.endRow),
      width: Math.abs(drag.endCol - drag.startCol) + 1,
      height: Math.abs(drag.endRow - drag.startRow) + 1,
    };
  }

  const optionValues = { style: "filled" };
  const isFilled = () => optionValues.style === "filled";

  return {
    label,
    icon,
    cursor: "crosshair",

    // Shown in the options panel.
    options: [
      {
        key: "style",
        label: "Style",
        choices: [
          { value: "filled", label: "Filled" },
          { value: "outline", label: "Outline" },
        ],
      },
    ],
    optionValues,

    deactivate() {
      hover = null;
      drag = null;
      requestRender({ tree: false });
    },

    onPointerDown(pointer) {
      if (pointer.event.button !== 0) return;
      const depth = depthForCellSize(camera, SHAPE_PIXEL_SIZE);
      const col = cellIndex(pointer.worldX, depth);
      const row = cellIndex(pointer.worldY, depth);
      drag = { depth, startCol: col, startRow: row, endCol: col, endRow: row };
      requestRender({ tree: false });
    },

    onPointerMove(pointer) {
      hover = { x: pointer.screenX, y: pointer.screenY };
      if (drag) {
        drag.endCol = cellIndex(pointer.worldX, drag.depth);
        drag.endRow = cellIndex(pointer.worldY, drag.depth);
      }
      requestRender({ tree: false });
    },

    onPointerUp() {
      if (!drag) return;
      const box = dragBox();
      // A click without dragging creates nothing.
      if (box.width > 1 || box.height > 1) {
        objects.add(type, { ...box, depth: drag.depth, color: state.color, filled: isFilled() });
      }
      drag = null;
      requestRender();
    },

    onPointerLeave() {
      hover = null;
      requestRender({ tree: false });
    },

    drawOverlay(ctx, camera) {
      if (drag) {
        const { x, y, width, height } = boxToWorld(dragBox(), drag.depth);
        drawPathGhost(ctx, camera, x, y, width, height, shape.path, state.color, 0.5, isFilled());
      } else if (hover) {
        const depth = depthForCellSize(camera, SHAPE_PIXEL_SIZE);
        const world = camera.screenToWorld(hover.x, hover.y);
        const size = 2 ** -depth;
        const x = cellIndex(world.x, depth) * size;
        const y = cellIndex(world.y, depth) * size;
        drawGhostRect(ctx, camera, x, y, size, size, state.color, 0.5);
      }
    },
  };
}
