// Registry of object types. Each type turns its parameters into pixels:
//
//   rasterize(params) → {
//     depth,   // quadtree depth of the pixels (their size: 2^-depth)
//     pixels,  // [{ col, row, color: [r, g, b] }], squares at that depth
//     box,     // { col, row, width, height }: the object's area, in squares
//   }
//
// The object's bounds are this box, enlarged to include all its pixels.
//
// Optional, for resizable types:
//   box(params) → { col, row, width, height }   current area, in squares
//   withBox(params, box) → params               parameters for a new area
//   path(ctx, left, top, width, height)         traces the shape (ghost previews)
// To add a new kind of object, write a type and register it here.

import { textType } from "./text.js";
import { rectangleType, ellipseType } from "./shapes.js";

export const objectTypes = {
  text: textType,
  rectangle: rectangleType,
  ellipse: ellipseType,
};
