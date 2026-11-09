// The tool bar on the left: one button per tool, highlighting the active one.

import { state, setActiveTool, onStateChange } from "./state.js";

export function createToolbar(element, tools) {
  const buttons = new Map();

  for (const tool of tools) {
    const button = document.createElement("button");
    button.type = "button";
    button.title = tool.label;
    button.setAttribute("aria-label", tool.label);
    button.innerHTML = tool.icon;
    button.addEventListener("click", () => setActiveTool(tool));
    element.append(button);
    buttons.set(tool, button);
  }

  function update() {
    for (const [tool, button] of buttons) {
      const active = tool === state.activeTool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active);
    }
  }

  onStateChange(update);
  update();
}
