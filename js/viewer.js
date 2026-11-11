// Viewer page: shows one published drawing (view.html?d=<id>), read-only,
// with pan (drag) and zoom (mouse wheel), and a link to download its file.

import { QuadtreeNode } from "./core/quadtree.js";
import { ObjectLayer } from "./core/objects/objectLayer.js";
import { deserialize } from "./core/storage.js";
import { Camera } from "./core/camera.js";
import { Renderer } from "./core/renderer.js";
import { createNavigation } from "./core/navigation.js";
import { DRAWINGS_FOLDER, loadDrawingList } from "./drawings.js";

const viewport = document.getElementById("viewport");
const treeCanvas = document.getElementById("tree-layer");
const overlayCanvas = document.getElementById("overlay-layer");
const message = document.getElementById("message");

function fail(text) {
  message.textContent = text;
  message.hidden = false;
}

async function loadDrawing() {
  const id = new URLSearchParams(location.search).get("d");
  const drawing = (await loadDrawingList()).find((entry) => entry.id === id);
  if (!drawing) throw new Error("This drawing does not exist.");

  document.title = `${drawing.name} – Split`;
  document.getElementById("title").textContent = drawing.name;
  const download = document.getElementById("download");
  download.href = DRAWINGS_FOLDER + drawing.file;
  download.download = `${drawing.id}.quad`;
  download.hidden = false;

  const response = await fetch(DRAWINGS_FOLDER + drawing.file);
  if (!response.ok) throw new Error("This drawing could not be loaded.");
  const tree = new QuadtreeNode([255, 255, 255]);
  deserialize(await response.text(), tree, new ObjectLayer(tree));
  return tree;
}

let tree;
try {
  tree = await loadDrawing();
  message.hidden = true;
} catch (error) {
  console.error(error);
  fail(error.message.endsWith(".") ? error.message : "This drawing could not be loaded.");
}

if (tree) {
  const camera = new Camera();
  const renderer = new Renderer(treeCanvas, overlayCanvas, camera, tree);
  const requestRender = (layers) => renderer.requestRender(layers);

  // Wheel zoom, middle-drag and Space + drag come from the shared navigation.
  const navigation = createNavigation({
    canvas: overlayCanvas,
    camera,
    requestRender,
    onCursorChange() {},
  });

  // Any drag pans (left or middle button).
  let panning = false;
  overlayCanvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    panning = true;
    overlayCanvas.setPointerCapture(event.pointerId);
    overlayCanvas.classList.add("dragging");
    navigation.onPointerDown(pointerInfo(event));
  });
  overlayCanvas.addEventListener("pointermove", (event) => {
    if (panning) navigation.onPointerMove(pointerInfo(event));
  });
  function stopPanning() {
    if (!panning) return;
    panning = false;
    overlayCanvas.classList.remove("dragging");
    navigation.onPointerUp();
  }
  overlayCanvas.addEventListener("pointerup", stopPanning);
  overlayCanvas.addEventListener("pointercancel", stopPanning);

  function pointerInfo(event) {
    const ratio = window.devicePixelRatio || 1;
    const rect = overlayCanvas.getBoundingClientRect();
    return { event, screenX: (event.clientX - rect.left) * ratio, screenY: (event.clientY - rect.top) * ratio };
  }

  // Keep the canvases matched to the viewport's size in device pixels.
  let initialized = false;
  new ResizeObserver(() => {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(viewport.clientWidth * ratio);
    const height = Math.round(viewport.clientHeight * ratio);
    camera.setViewport(width, height);
    if (!initialized) {
      camera.reset();
      initialized = true;
    }
    renderer.resize(width, height);
  }).observe(viewport);
}
