# Quadtree editor

A small web app to view and edit a quadtree where every leaf square has a color.
Non-leaf squares show the average color of their area, and squares smaller than
a screen pixel are drawn as their nearest visible ancestor.

## Running it

The code uses JavaScript modules, which browsers refuse to load from `file://`,
so it needs a local web server:

- **Windows:** double-click `start.bat`. It starts `server.py` (needs Python)
  and opens <http://localhost:8000>.
- **Anywhere else:** run `python server.py` in this folder and open
  <http://localhost:8000>.

`server.py` sends the right file types for `.js`/`.css` (Python's built-in
server may not on Windows) and disables caching, so a refresh always gets the
latest files.

## Using it

Tools (left bar):

| Tool | What it does |
| --- | --- |
| Move | Drag to pan. |
| Select | Click a box (text, shape) to select it, Delete to remove it, drag the handles to resize shapes. |
| Pencil | Paint quadtree squares; size follows the zoom (Size option). |
| Text | Click and type; text is drawn in pixelated Comic Sans. Click an existing text to edit it. |
| Rectangle / Ellipse | Drag to draw; Filled or Outline option. |

Whatever the tool: mouse wheel zooms, middle-drag or Space + drag pans.
Below the tools: the current color and a quick palette. At the bottom: New,
Save and Open (`.quad` files). Everything is also autosaved in the browser's
local storage.

## Code layout

| File | Role |
| --- | --- |
| `quadtree.js` | Quadtree nodes: painting, average colors, merging (`minimize`). |
| `objects/` | Object layer: boxes recording how pixels were made (text, shapes), so they can be edited and removed. New kinds of objects are registered in `objects/types.js`. |
| `tools/` | One file per tool, plus shared grid/ghost helpers in `grid.js`. |
| `camera.js`, `navigation.js`, `renderer.js` | View, zoom/pan, drawing on two stacked canvases (content + previews). |
| `state.js` | Shared state: active tool, color, palette, change notifications. |
| `storage.js`, `persistence.js`, `fileMenu.js` | `.quad` format, local storage autosave, New/Save/Open. |
| `toolbar.js`, `colorPicker.js`, `palette.js`, `optionsPanel.js` | User interface. |
| `font.js`, `color.js` | Font rasterization and color helpers. |
