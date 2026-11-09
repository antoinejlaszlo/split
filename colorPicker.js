// Pencil color picker: a swatch in the tool bar showing the current color.
// Clicking it opens the browser's color chooser.

import { state, setColor, onStateChange } from "./state.js";

export function createColorPicker(toolbar) {
  const separator = document.createElement("div");
  separator.className = "separator";

  const input = document.createElement("input");
  input.type = "color";
  input.title = "Pencil color";
  input.setAttribute("aria-label", "Pencil color");
  input.value = state.color;
  // "input" fires continuously while choosing, so the ghost updates live.
  input.addEventListener("input", () => setColor(input.value));

  onStateChange(() => {
    if (input.value !== state.color) input.value = state.color;
  });

  toolbar.append(separator, input);
}
