// Move tool: drag with the left button to pan.

import { createPanGesture } from "../navigation.js";

export function createMoveTool({ camera, requestRender }) {
  const pan = createPanGesture(camera, requestRender);

  return {
    label: "Move",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>
    </svg>`,

    get cursor() {
      return pan.active ? "grabbing" : "grab";
    },

    deactivate() {
      pan.end();
    },

    onPointerDown(pointer) {
      if (pointer.event.button === 0) pan.start(pointer);
    },
    onPointerMove(pointer) {
      pan.move(pointer);
    },
    onPointerUp() {
      pan.end();
    },
  };
}
