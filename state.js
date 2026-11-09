// Shared application state, read by the tools and written by the UI.

export const state = {
  activeTool: null,
  color: "#000000", // color used by the pencil, text and shapes
  // Quick palette slots: a color, or null for an empty slot.
  palette: [
    "#000000", "#ffffff",
    "#808080", "#e53935",
    "#fb8c00", "#fdd835",
    "#43a047", "#1e88e5",
    null, null,
    null, null,
  ],
};

const listeners = new Set();

export function onStateChange(listener) {
  listeners.add(listener);
}

function notify() {
  for (const listener of listeners) listener(state);
}

export function setActiveTool(tool) {
  if (state.activeTool === tool) return;
  state.activeTool?.deactivate?.();
  state.activeTool = tool;
  tool?.activate?.();
  notify();
}

export function setColor(color) {
  if (state.color === color) return;
  state.color = color;
  notify();
}

export function setPaletteSlot(index, color) {
  if (state.palette[index] === color) return;
  state.palette[index] = color;
  notify();
}

// Changes one of a tool's options (shown in the options panel).
export function setToolOption(tool, key, value) {
  if (tool.optionValues[key] === value) return;
  tool.optionValues[key] = value;
  notify();
}

// The drawing (quadtree and objects) changed: anything listening (autosave)
// is told about it.
const documentListeners = new Set();

export function onDocumentChange(listener) {
  documentListeners.add(listener);
}

export function documentChanged() {
  for (const listener of documentListeners) listener();
}
