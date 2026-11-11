// Wiring: creates the camera, renderer, navigation and tools, and sends the
// pointer events of the top canvas to navigation or to the active tool.

import { quadtree } from "../core/quadtree.js";
import { Camera } from "../core/camera.js";
import { Renderer } from "../core/renderer.js";
import { ObjectLayer } from "../core/objects/objectLayer.js";
import { createNavigation } from "../core/navigation.js";
import { createToolbar } from "./toolbar.js";
import { createColorPicker } from "./colorPicker.js";
import { createPalette } from "./palette.js";
import { createFileMenu } from "./fileMenu.js";
import { createOptionsPanel } from "./optionsPanel.js";
import { state, onStateChange, documentChanged } from "../core/state.js";
import { restoreDocument, restoreSettings, startAutosave } from "./persistence.js";
import { createMoveTool } from "./tools/move.js";
import { createPencilTool } from "./tools/pencil.js";
import { createFillTool } from "./tools/fill.js";
import { createPickerTool } from "./tools/picker.js";
import { createTextTool } from "./tools/text.js";
import { createSelectTool } from "./tools/select.js";
import { createShapeTool } from "./tools/shape.js";

const viewport = document.getElementById("viewport");
const treeCanvas = document.getElementById("tree-layer");
const overlayCanvas = document.getElementById("overlay-layer");

const camera = new Camera();
const renderer = new Renderer(treeCanvas, overlayCanvas, camera, quadtree);
const requestRender = (layers) => renderer.requestRender(layers);

const navigation = createNavigation({
  canvas: overlayCanvas,
  camera,
  requestRender,
  onCursorChange: updateCursor,
});

// Metadata boxes (texts…) recording how parts of the quadtree were made.
const objects = new ObjectLayer(quadtree);

// The drawing saved in local storage, if any.
restoreDocument(quadtree, objects);

const context = { camera, quadtree, objects, requestRender };
const tools = [
  createMoveTool(context),
  createSelectTool(context),
  createPencilTool(context),
  createFillTool(context),
  createPickerTool(context),
  createTextTool(context),
  createShapeTool({
    type: "rectangle",
    label: "Rectangle",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="1"/>
    </svg>`,
  }, context),
  createShapeTool({
    type: "ellipse",
    label: "Ellipse",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <ellipse cx="12" cy="12" rx="9" ry="6.5"/>
    </svg>`,
  }, context),
];

// Saved color, palette, tool options and active tool, before building the UI.
const savedCamera = restoreSettings(tools);

const toolbar = document.getElementById("toolbar");
createToolbar(toolbar, tools);
createColorPicker(toolbar);
createPalette(toolbar);
createOptionsPanel(viewport);
createFileMenu(toolbar, {
  quadtree,
  objects,
  // Tools may hold old objects (selection, edited text): reset them, then redraw.
  onLoaded() {
    state.activeTool?.deactivate?.();
    state.activeTool?.activate?.();
    documentChanged();
    requestRender();
  },
});
onStateChange(() => {
  updateCursor();
  requestRender({ tree: false });
});

// Shown when the drawing no longer fits in local storage.
const notice = document.createElement("div");
notice.id = "notice";
notice.hidden = true;
notice.textContent = "Autosave failed: the drawing is too big for the browser's storage. " +
  "Use Save to keep it in a file.";
viewport.append(notice);

startAutosave({
  quadtree,
  objects,
  camera,
  tools,
  onDocumentSaved(ok) {
    notice.hidden = ok;
  },
});

function updateCursor() {
  overlayCanvas.style.cursor = navigation.cursor ?? state.activeTool?.cursor ?? "default";
}

// Pointer position in screen (device pixel) and world coordinates.
function pointerInfo(event) {
  const ratio = window.devicePixelRatio || 1;
  const rect = overlayCanvas.getBoundingClientRect();
  const screenX = (event.clientX - rect.left) * ratio;
  const screenY = (event.clientY - rect.top) * ratio;
  const world = camera.screenToWorld(screenX, screenY);
  return { event, screenX, screenY, worldX: world.x, worldY: world.y };
}

// Whoever received the press (navigation or a tool) gets the whole gesture.
let gestureOwner = null;

overlayCanvas.addEventListener("pointerdown", (event) => {
  if (gestureOwner) return;
  gestureOwner = navigation.wantsPointer(event) ? navigation : state.activeTool;
  if (!gestureOwner) return;
  overlayCanvas.setPointerCapture(event.pointerId);
  gestureOwner.onPointerDown?.(pointerInfo(event));
  updateCursor();
});

overlayCanvas.addEventListener("pointermove", (event) => {
  const pointer = pointerInfo(event);
  gestureOwner?.onPointerMove?.(pointer);
  // The active tool always follows the pointer (for hover previews),
  // even while navigation is panning.
  if (gestureOwner !== state.activeTool) state.activeTool?.onPointerMove?.(pointer);
  updateCursor(); // tools may change cursor on hover (e.g. resize handles)
});

overlayCanvas.addEventListener("pointerleave", () => {
  if (!gestureOwner) state.activeTool?.onPointerLeave?.();
});

function endGesture(event) {
  if (!gestureOwner) return;
  gestureOwner.onPointerUp?.(pointerInfo(event));
  gestureOwner = null;
  updateCursor();
}

overlayCanvas.addEventListener("pointerup", endGesture);
overlayCanvas.addEventListener("pointercancel", endGesture);

// Keep both canvases matched to the viewport's size in device pixels.
let initialized = false;
new ResizeObserver(() => {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(viewport.clientWidth * ratio);
  const height = Math.round(viewport.clientHeight * ratio);
  camera.setViewport(width, height);
  if (!initialized) {
    // Start where the camera was before the refresh, or at the default view.
    if (savedCamera) {
      Object.assign(camera, savedCamera);
      camera.clamp();
    } else {
      camera.reset();
    }
    initialized = true;
  }
  renderer.resize(width, height);
}).observe(viewport);
