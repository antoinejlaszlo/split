import { state } from "./state.js";

// Moving around the quadtree, available whatever the active tool:
// - mouse wheel: zoom around the cursor
// - middle mouse button, or Space + left button: drag to pan

const ZOOM_SPEED = 0.0015;

// A drag that pans the camera. Also used by the move tool.
export function createPanGesture(camera, requestRender) {
  let last = null;
  return {
    get active() {
      return last !== null;
    },
    start(pointer) {
      last = { x: pointer.screenX, y: pointer.screenY };
    },
    move(pointer) {
      if (!last) return;
      camera.panBy(pointer.screenX - last.x, pointer.screenY - last.y);
      last = { x: pointer.screenX, y: pointer.screenY };
      requestRender();
    },
    end() {
      last = null;
    },
  };
}

export function createNavigation({ canvas, camera, requestRender, onCursorChange }) {
  const pan = createPanGesture(camera, requestRender);
  let spaceHeld = false;

  // Wheel zoom.
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    // Normalize the wheel delta to pixels (Firefox often reports lines).
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16;
    else if (event.deltaMode === 2) delta *= canvas.clientHeight;

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    camera.zoomAt(
      (event.clientX - rect.left) * ratio,
      (event.clientY - rect.top) * ratio,
      Math.exp(-delta * ZOOM_SPEED)
    );
    requestRender();
  }, { passive: false });

  // Stop the browser's middle-click auto-scroll.
  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 1) event.preventDefault();
  });

  // Space to pan temporarily.
  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space") return;
    // Space is typed as text when the active tool takes the keyboard.
    if (state.activeTool?.capturesKeyboard) return;
    event.preventDefault();
    if (!spaceHeld) {
      spaceHeld = true;
      onCursorChange();
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.code !== "Space") return;
    spaceHeld = false;
    onCursorChange();
  });
  window.addEventListener("blur", () => {
    spaceHeld = false;
    onCursorChange();
  });

  return {
    // Whether a pointer press should pan instead of going to the active tool.
    wantsPointer(event) {
      return event.button === 1 || (event.button === 0 && spaceHeld);
    },
    onPointerDown(pointer) {
      pan.start(pointer);
    },
    onPointerMove(pointer) {
      pan.move(pointer);
    },
    onPointerUp() {
      pan.end();
    },
    // Cursor overriding the active tool's, or null.
    get cursor() {
      if (pan.active) return "grabbing";
      if (spaceHeld) return "grab";
      return null;
    },
  };
}
