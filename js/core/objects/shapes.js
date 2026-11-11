// Filled shape objects (rectangle, ellipse). Parameters:
//   col, row       top-left corner, in squares at `depth`
//   width, height  size, in squares at `depth` (at least 1)
//   depth          quadtree depth of a pixel (the pixel scale)
//   color          "#rrggbb"
//   filled         true for a filled shape, false for its outline only
//                  (missing = filled)
//
// Shapes are resizable: `box(params)` gives their area in squares, and
// `withBox(params, box)` returns the parameters for a new area.

import { hexToRgb } from "../color.js";

function createShapeType(contains, path) {
  return {
    rasterize({ col, row, width, height, depth, color, filled = true }) {
      const rgb = hexToRgb(color);

      // Whether the pixel (x, y) of the box is inside the shape, testing its
      // center in [-1, 1] across the box.
      const inside = (x, y) =>
        x >= 0 && y >= 0 && x < width && y < height &&
        contains(((x + 0.5) / width) * 2 - 1, ((y + 0.5) / height) * 2 - 1);

      const pixels = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!inside(x, y)) continue;
          // Outline: keep only pixels with a neighbor outside the shape.
          if (!filled && inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1)) {
            continue;
          }
          pixels.push({ col: col + x, row: row + y, color: rgb });
        }
      }
      return { depth, pixels, box: { col, row, width, height } };
    },

    box({ col, row, width, height }) {
      return { col, row, width, height };
    },

    withBox(params, { col, row, width, height }) {
      return { ...params, col, row, width: Math.max(1, width), height: Math.max(1, height) };
    },

    // Traces the shape in a screen rectangle (for ghost previews).
    path,
  };
}

export const rectangleType = createShapeType(
  () => true,
  (ctx, left, top, width, height) => ctx.rect(left, top, width, height)
);

export const ellipseType = createShapeType(
  (u, v) => u * u + v * v <= 1,
  (ctx, left, top, width, height) =>
    ctx.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI)
);
