// The object layer: metadata boxes living alongside the raw quadtree.
//
// An object records how some pixels of the quadtree were made, e.g. "the text
// 'hello', at this position, with this pixel scale and color". Its pixels are
// painted into the quadtree like any other, but the object remembers:
// - its type and parameters (enough to draw it again),
// - its bounding box in world coordinates ({ x, y, width, height }),
// - the color each pixel had before (to remove or change the object).
//
// Drawing an object is delegated to its type (see types.js): a type turns
// parameters into pixels. Adding a new kind of object (image, circle…) only
// needs a new type; adding, changing and removing are handled here.
//
// Everything stored is plain data, so objects can be saved as JSON later.
//
// After an object is painted or erased, the quadtree is minimized over its
// area: groups of 4 same-colored squares are merged into bigger squares.

import { objectTypes } from "./types.js";
import { sameColor } from "../color.js";
import { documentChanged } from "../state.js";

export class ObjectLayer {
  constructor(quadtree) {
    this.quadtree = quadtree;
    this.objects = []; // bottom to top, in creation order
    this.nextId = 1;
  }

  // Creates an object of the given type and paints it into the quadtree.
  add(type, params) {
    if (!objectTypes[type]) throw new Error(`Unknown object type: ${type}`);
    const object = { id: this.nextId++, type, params, depth: 0, bounds: null, painted: [] };
    this.paint(object);
    this.objects.push(object);
    documentChanged();
    return object;
  }

  // Changes an object's parameters: erases it, then paints it again.
  update(object, params) {
    this.erase(object);
    object.params = params;
    this.paint(object);
    documentChanged();
  }

  // Erases an object from the quadtree and forgets it.
  remove(object) {
    this.erase(object);
    this.objects = this.objects.filter((other) => other !== object);
    documentChanged();
  }

  // Replaces all objects (used when loading a file). Their pixels must
  // already be in the quadtree.
  replaceAll(objects) {
    this.objects = objects;
    this.nextId = objects.reduce((max, object) => Math.max(max, object.id), 0) + 1;
  }

  // The topmost object (optionally of a given type) whose box contains the world point.
  objectAt(x, y, type = null) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const object = this.objects[i];
      if (type && object.type !== type) continue;
      const { bounds } = object;
      if (x >= bounds.x && x < bounds.x + bounds.width && y >= bounds.y && y < bounds.y + bounds.height) {
        return object;
      }
    }
    return null;
  }

  // Paints an object's pixels, remembering the color each one replaced.
  // Pixels outside the root square, or on squares that have smaller squares
  // inside, are skipped.
  paint(object) {
    const { depth, pixels, box } = objectTypes[object.type].rasterize(object.params);
    const count = 2 ** depth;
    const painted = [];

    let minCol = box.col;
    let minRow = box.row;
    let maxCol = box.col + box.width;
    let maxRow = box.row + box.height;

    for (const { col, row, color } of pixels) {
      if (col < 0 || row < 0 || col >= count || row >= count) continue;
      const x = (col + 0.5) / count;
      const y = (row + 0.5) / count;
      const previous = this.quadtree.leafColorAt(x, y, depth);
      if (previous === null) continue;
      this.quadtree.paintAt(x, y, depth, color);
      painted.push({ col, row, color, previous: [...previous] });
      minCol = Math.min(minCol, col);
      minRow = Math.min(minRow, row);
      maxCol = Math.max(maxCol, col + 1);
      maxRow = Math.max(maxRow, row + 1);
    }

    object.depth = depth;
    object.painted = painted;
    object.bounds = {
      x: minCol / count,
      y: minRow / count,
      width: (maxCol - minCol) / count,
      height: (maxRow - minRow) / count,
    };
    this.quadtree.minimize(object.bounds);
  }

  // Restores the colors an object's pixels replaced, in reverse order.
  // A pixel is only restored if it still has the object's color, so edits
  // made over the object afterwards (e.g. with the pencil) are kept.
  erase(object) {
    const count = 2 ** object.depth;
    for (let i = object.painted.length - 1; i >= 0; i--) {
      const { col, row, color, previous } = object.painted[i];
      const x = (col + 0.5) / count;
      const y = (row + 0.5) / count;
      const current = this.quadtree.leafColorAt(x, y, object.depth);
      if (current !== null && sameColor(current, color)) {
        this.quadtree.paintAt(x, y, object.depth, previous);
      }
    }
    object.painted = [];
    if (object.bounds) this.quadtree.minimize(object.bounds);
  }
}
