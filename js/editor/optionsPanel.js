// Floating panel on the right of the view, showing the active tool's options.
//
// A tool declares its options as:
//   options: [{ key, label, choices: [{ value, label }] }]
//   optionValues: { [key]: value }
// The panel is hidden for tools without options.

import { state, setToolOption, onStateChange } from "../core/state.js";

export function createOptionsPanel(container) {
  const panel = document.createElement("div");
  panel.id = "options-panel";
  container.append(panel);

  let shownTool = undefined;
  const buttons = []; // [{ key, value, button }]

  function build(tool) {
    panel.replaceChildren();
    buttons.length = 0;
    panel.hidden = !tool?.options?.length;
    if (panel.hidden) return;

    const title = document.createElement("div");
    title.className = "options-title";
    title.textContent = tool.label;
    panel.append(title);

    for (const option of tool.options) {
      const row = document.createElement("div");
      row.className = "option";

      const label = document.createElement("span");
      label.className = "option-label";
      label.textContent = option.label;

      const group = document.createElement("div");
      group.className = "segmented";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", option.label);

      for (const choice of option.choices) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = choice.label;
        button.addEventListener("click", () => setToolOption(tool, option.key, choice.value));
        group.append(button);
        buttons.push({ key: option.key, value: choice.value, button });
      }

      row.append(label, group);
      panel.append(row);
    }
  }

  function update() {
    const tool = state.activeTool;
    if (tool !== shownTool) {
      build(tool);
      shownTool = tool;
    }
    for (const { key, value, button } of buttons) {
      const active = tool.optionValues[key] === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active);
    }
  }

  onStateChange(update);
  update();
}
