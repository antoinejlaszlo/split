# Split

A static website around quadtree drawings: every leaf square has a color,
larger squares show the average color of their area, and squares smaller than
a screen pixel are drawn as their nearest visible ancestor.

The site has three pages:

| Page | What it is |
| --- | --- |
| `index.html` | Gallery of published drawings (thumbnail and name). |
| `draw.html` | The editor: draw from scratch, Save to download a `.quad` file. |
| `view.html?d=<id>` | One published drawing, full screen, with pan and zoom, and a download link. |

## Running it

Everything is static files, so any static host works (GitHub Pages, …).
Locally, the pages need a web server, because browsers refuse to load
JavaScript modules and the drawing list from `file://`:

- **Windows:** double-click `start.bat`. It starts `server.py` (needs Python)
  and opens <http://localhost:8000>.
- **Anywhere else:** run `python server.py` in this folder and open
  <http://localhost:8000>.

`server.py` sends the right file types for `.js`/`.css` (Python's built-in
server may not on Windows) and disables caching, so a refresh always gets the
latest files.

## Publishing a drawing

1. Draw it in the editor and click Save to get a `.quad` file.
2. Run:

   ```
   python publish.py my-drawing.quad "My drawing"
   ```

   This copies the file to `drawings/`, renders a thumbnail
   (`drawings/<id>.png`) and adds the drawing at the top of
   `drawings/index.json`. The id comes from the name (`my-drawing` here) unless
   you pass `--id`. Publishing again with the same id replaces the drawing.
3. Upload the changed `drawings/` folder to the host (commit and push).

To unpublish: `python publish.py --remove my-drawing`.
Only the Python standard library is needed.

## Using the editor

Tools (left bar):

| Tool | What it does |
| --- | --- |
| Move | Drag to pan. |
| Select | Click a box (text, shape) to select it, Delete to remove it, drag the handles to resize shapes. |
| Pencil | Paint quadtree squares; size follows the zoom (Size option). |
| Fill | Recolor the leaf under the cursor, whatever its size (click or drag). |
| Text | Click and type; text is drawn in pixelated Comic Sans. Click an existing text to edit it. |
| Rectangle / Ellipse | Drag to draw; Filled or Outline option. |

Whatever the tool: mouse wheel zooms, middle-drag or Space + drag pans.
At the top of the bar: back to the gallery. Below the tools: the current
color and a quick palette. At the bottom: New, Save and Open (`.quad` files).
Everything is also autosaved in the browser's local storage.

## Code layout

| Path | Role |
| --- | --- |
| `js/core/` | Shared by all pages: quadtree (`quadtree.js`), camera, renderer, navigation (zoom/pan), `.quad` format (`storage.js`), colors, font, shared state. |
| `js/core/objects/` | Object layer: boxes recording how pixels were made (text, shapes), so they can be edited and removed. New kinds of objects are registered in `types.js`. |
| `js/editor/` | The editor: `main.js` wires everything; tool bar, palette, options panel, file menu, local storage autosave (`persistence.js`). |
| `js/editor/tools/` | One file per tool, plus shared grid/ghost helpers in `grid.js`. |
| `js/gallery.js`, `js/viewer.js`, `js/drawings.js` | Gallery page, viewer page, and loading the published drawing list. |
| `css/` | `editor.css` for the editor; `site.css` (shared), `gallery.css` and `viewer.css` for the other pages. |
| `drawings/` | Published drawings: `.quad` files, thumbnails and `index.json`. |
| `publish.py` | Publishes or removes a drawing. |
