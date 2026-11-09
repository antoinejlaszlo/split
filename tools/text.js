// Text tool: creates and edits text objects (see objects/text.js).
//
// - A text cursor (vertical bar) follows the pointer as a ghost. Over an
//   existing text, its box is outlined instead: clicking there edits it.
// - Click elsewhere to place the cursor, then type. The text object is created
//   with the first character.
// - Backspace deletes the last character; deleting them all removes the text.
// - Enter starts a new line, Escape stops editing.

import { state } from "../state.js";
import { LINE_HEIGHT } from "../font.js";
import { textEnd } from "../objects/text.js";
import { depthForCellSize, cellIndex, drawGhostRect, drawBoxOutline } from "./grid.js";

const TEXT_PIXEL_SIZE = 1.5; // CSS pixels per font pixel on screen, when placing the cursor

export function createTextTool({ camera, objects, requestRender }) {
  let hover = null; // last pointer position on screen, or null when outside
  let editing = null; // { object (null until the first character), params }

  // Cursor position (top of the bar) for a new text under a screen point,
  // snapped to the squares of the depth matching the current zoom.
  function caretAt(screenX, screenY) {
    const depth = depthForCellSize(camera, TEXT_PIXEL_SIZE);
    const world = camera.screenToWorld(screenX, screenY);
    const col = cellIndex(world.x, depth);
    const row = cellIndex(world.y, depth) - Math.floor(LINE_HEIGHT / 2);
    return { depth, col, row };
  }

  function hoveredText() {
    if (!hover) return null;
    const world = camera.screenToWorld(hover.x, hover.y);
    return objects.objectAt(world.x, world.y, "text");
  }

  // Sets the edited text, creating, updating or removing its object.
  function setText(text) {
    editing.params = { ...editing.params, text };
    if (!editing.object) {
      if (text) editing.object = objects.add("text", editing.params);
    } else if (!text) {
      objects.remove(editing.object);
      editing.object = null;
    } else {
      objects.update(editing.object, editing.params);
    }
    requestRender();
  }

  function drawCaret(ctx, camera, { depth, col, row }, color, alpha) {
    const size = 2 ** -depth;
    drawGhostRect(ctx, camera, col * size, row * size, size, LINE_HEIGHT * size, color, alpha);
  }

  const tool = {
    label: "Text",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 5h14M12 5v15M9 20h6"/>
    </svg>`,
    cursor: "text",

    // While editing, the keyboard is for typing (Space types a space).
    get capturesKeyboard() {
      return editing !== null;
    },

    deactivate() {
      hover = null;
      editing = null;
      requestRender({ tree: false });
    },

    onPointerDown(pointer) {
      if (pointer.event.button !== 0) return;
      hover = { x: pointer.screenX, y: pointer.screenY };
      const existing = hoveredText();
      if (existing) {
        editing = { object: existing, params: existing.params };
      } else {
        const { depth, col, row } = caretAt(hover.x, hover.y);
        editing = { object: null, params: { text: "", col, row, depth, color: state.color } };
      }
      requestRender({ tree: false });
    },

    onPointerMove(pointer) {
      hover = { x: pointer.screenX, y: pointer.screenY };
      requestRender({ tree: false });
    },

    onPointerLeave() {
      hover = null;
      requestRender({ tree: false });
    },

    drawOverlay(ctx, camera) {
      if (editing) {
        if (editing.object) drawBoxOutline(ctx, camera, editing.object.bounds);
        const end = textEnd(editing.params);
        drawCaret(ctx, camera, { ...end, depth: editing.params.depth }, editing.params.color, 1);
      }
      if (!hover) return;
      const existing = hoveredText();
      if (existing) {
        if (existing !== editing?.object) drawBoxOutline(ctx, camera, existing.bounds);
      } else {
        drawCaret(ctx, camera, caretAt(hover.x, hover.y), state.color, 0.4);
      }
    },
  };

  window.addEventListener("keydown", (event) => {
    if (state.activeTool !== tool || !editing) return;
    // Leave shortcuts (Ctrl+R…) to the browser; AltGr (Ctrl+Alt) still types.
    if (event.metaKey || (event.ctrlKey && !event.altKey)) return;

    const text = editing.params.text;
    if (event.key === "Escape") {
      editing = null;
      requestRender({ tree: false });
    } else if (event.key === "Enter") {
      setText(text + "\n");
    } else if (event.key === "Backspace") {
      setText(Array.from(text).slice(0, -1).join(""));
    } else if (event.key.length === 1) {
      setText(text + event.key);
    } else {
      return;
    }
    event.preventDefault();
  });

  return tool;
}
