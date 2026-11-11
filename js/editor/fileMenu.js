// New, Save and Open buttons at the bottom of the tool bar (.quad files).

import { serialize, deserialize, clearDocument } from "../core/storage.js";

const NEW_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>
</svg>`;

const SAVE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>
</svg>`;

const OPEN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/>
</svg>`;

function makeButton(label, icon, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = icon;
  button.addEventListener("click", onClick);
  return button;
}

// `onLoaded` is called after the content was replaced (new or opened file).
export function createFileMenu(toolbar, { quadtree, objects, onLoaded }) {
  const spacer = document.createElement("div");
  spacer.className = "spacer";

  const clear = makeButton("New", NEW_ICON, () => {
    const message = "Start a new drawing?\n\nThe current quadtree and boxes will be cleared. " +
      "Use Save first if you want to keep them.";
    if (!confirm(message)) return;
    clearDocument(quadtree, objects);
    onLoaded();
  });

  const save = makeButton("Save (.quad)", SAVE_ICON, () => {
    const blob = new Blob([serialize(quadtree, objects)], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "quadtree.quad";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".quad";
  input.hidden = true;
  input.addEventListener("change", async () => {
    const file = input.files[0];
    input.value = ""; // so the same file can be opened again
    if (!file) return;
    try {
      deserialize(await file.text(), quadtree, objects);
      onLoaded();
    } catch (error) {
      alert(`Could not open ${file.name}: ${error.message}`);
    }
  });

  const open = makeButton("Open (.quad)", OPEN_ICON, () => input.click());

  toolbar.append(spacer, clear, save, open, input);
}
