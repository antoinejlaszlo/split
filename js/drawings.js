// The list of published drawings: drawings/index.json.
//
// {
//   "drawings": [
//     { "id": "my-drawing", "name": "My drawing", "file": "my-drawing.quad",
//       "thumbnail": "my-drawing.png", "published": "2026-11-11" }
//   ]
// }
//
// Files are relative to the drawings/ folder. publish.py maintains this list.

export const DRAWINGS_FOLDER = "drawings/";

export async function loadDrawingList() {
  const response = await fetch(`${DRAWINGS_FOLDER}index.json`, { cache: "no-cache" });
  if (!response.ok) throw new Error(`could not load the list (${response.status})`);
  const data = await response.json();
  return Array.isArray(data.drawings) ? data.drawings : [];
}
