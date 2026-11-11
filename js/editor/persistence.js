// Keeps everything in the browser's local storage, so it survives a refresh:
// - the drawing (quadtree and objects), in the .quad format, saved shortly
//   after each change;
// - the settings: current color, palette, active tool, tool options and
//   camera position, saved when they change and when leaving the page.

import { serialize, deserialize } from "../core/storage.js";
import { isHexColor } from "../core/color.js";
import { state, onStateChange, onDocumentChange, setActiveTool } from "../core/state.js";

const DOCUMENT_KEY = "quadtree:document";
const SETTINGS_KEY = "quadtree:settings";
const SAVE_DELAY = 500; // ms after the last change

// Local storage may be unavailable (private browsing, blocked) or full.
function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Could not save ${key}:`, error);
    return false;
  }
}

// Loads the saved drawing into the (empty) quadtree and object layer.
export function restoreDocument(quadtree, objects) {
  const text = read(DOCUMENT_KEY);
  if (!text) return;
  try {
    deserialize(text, quadtree, objects);
  } catch (error) {
    console.warn("Ignoring the saved drawing:", error);
  }
}

// Restores the settings and the active tool. Returns the saved camera
// ({ x, y, scale }) or null.
export function restoreSettings(tools) {
  let data = null;
  try {
    data = JSON.parse(read(SETTINGS_KEY));
  } catch {
    // Invalid settings are ignored.
  }

  if (isHexColor(data?.color)) state.color = data.color;
  if (Array.isArray(data?.palette) && data.palette.length === state.palette.length) {
    state.palette = data.palette.map((color) => (isHexColor(color) ? color : null));
  }
  for (const tool of tools) {
    const saved = data?.toolOptions?.[tool.label];
    for (const option of tool.options ?? []) {
      const value = saved?.[option.key];
      if (option.choices.some((choice) => choice.value === value)) {
        tool.optionValues[option.key] = value;
      }
    }
  }
  setActiveTool(tools.find((tool) => tool.label === data?.activeTool) ?? tools[0]);

  const camera = data?.camera;
  return Number.isFinite(camera?.x) && Number.isFinite(camera?.y) && camera?.scale > 0 ? camera : null;
}

// Saves the drawing after each change and the settings when they change.
// `onDocumentSaved(ok)` tells whether saving the drawing worked (it fails
// when the drawing is too big for local storage).
export function startAutosave({ quadtree, objects, camera, tools, onDocumentSaved }) {
  let timer = null;
  let dirty = false;

  function saveDocument() {
    clearTimeout(timer);
    timer = null;
    if (!dirty) return;
    dirty = false;
    onDocumentSaved(write(DOCUMENT_KEY, serialize(quadtree, objects)));
  }

  function saveSettings() {
    const toolOptions = {};
    for (const tool of tools) {
      if (tool.optionValues) toolOptions[tool.label] = tool.optionValues;
    }
    write(SETTINGS_KEY, JSON.stringify({
      color: state.color,
      palette: state.palette,
      activeTool: state.activeTool?.label,
      toolOptions,
      camera: { x: camera.x, y: camera.y, scale: camera.scale },
    }));
  }

  onDocumentChange(() => {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(saveDocument, SAVE_DELAY);
  });
  onStateChange(saveSettings);

  // Save everything right away when leaving the page (refresh, close, tab change).
  function saveAll() {
    saveDocument();
    saveSettings();
  }
  window.addEventListener("pagehide", saveAll);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveAll();
  });
}
