// Quick color palette under the color picker: a fixed number of slots
// (state.palette), some filled with common colors, the others empty.
// - Click a filled slot to use its color.
// - Click an empty slot to store the current color in it.
// - Right-click a slot to replace it with the current color.

import { state, setColor, setPaletteSlot, onStateChange } from "../core/state.js";

export function createPalette(toolbar) {
  const grid = document.createElement("div");
  grid.className = "palette";

  const slots = state.palette.map((_, index) => {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "palette-slot";
    slot.addEventListener("click", () => {
      const color = state.palette[index];
      if (color) setColor(color);
      else setPaletteSlot(index, state.color);
    });
    slot.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      setPaletteSlot(index, state.color);
    });
    grid.append(slot);
    return slot;
  });

  function update() {
    slots.forEach((slot, index) => {
      const color = state.palette[index];
      slot.classList.toggle("empty", !color);
      slot.classList.toggle("current", color?.toLowerCase() === state.color.toLowerCase());
      slot.style.background = color ?? "";
      slot.title = color
        ? `${color} (right-click to replace with the current color)`
        : "Empty: click to store the current color";
    });
  }

  onStateChange(update);
  update();
  toolbar.append(grid);
}
