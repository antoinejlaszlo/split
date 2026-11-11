// Gallery page: one card (thumbnail + name) per published drawing,
// linking to the viewer.

import { DRAWINGS_FOLDER, loadDrawingList } from "./drawings.js";

const gallery = document.getElementById("gallery");
const empty = document.getElementById("empty");

try {
  const drawings = await loadDrawingList();
  for (const drawing of drawings) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.className = "card";
    link.href = `view.html?d=${encodeURIComponent(drawing.id)}`;

    const image = document.createElement("img");
    image.src = DRAWINGS_FOLDER + drawing.thumbnail;
    image.alt = "";
    image.loading = "lazy";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = drawing.name;

    link.append(image, name);
    item.append(link);
    gallery.append(item);
  }
  empty.hidden = drawings.length > 0;
} catch (error) {
  console.error(error);
  empty.textContent = "The gallery could not be loaded.";
  empty.hidden = false;
}
