// Saving and loading the quadtree and its objects as ".quad" files.
//
// A .quad file is JSON text:
// {
//   "format": "quad", "version": 1,
//   "tree": node,      a leaf is its color "#rrggbb"; a non-leaf is an array of
//                      its 4 children [top-left, top-right, bottom-left, bottom-right]
//                      (non-leaf colors are averages, recomputed when loading)
//   "objects": [{ id, type, params, depth, bounds,
//                 painted: [[col, row, "#color", "#previous color"], …] }]
// }

import { QuadtreeNode } from "./quadtree.js";
import { objectTypes } from "./objects/types.js";
import { hexToRgb, rgbToHex, isHexColor } from "./color.js";

const FORMAT = "quad";
const VERSION = 1;

function treeToData(node) {
  return node.isLeaf() ? rgbToHex(node.color) : node.children.map(treeToData);
}

function treeFromData(data) {
  if (isHexColor(data)) return new QuadtreeNode(hexToRgb(data));
  if (Array.isArray(data) && data.length === 4) {
    return new QuadtreeNode(null, data.map(treeFromData)); // color = average of children
  }
  throw new Error("invalid tree node");
}

function objectToData(object) {
  return {
    id: object.id,
    type: object.type,
    params: object.params,
    depth: object.depth,
    bounds: object.bounds,
    painted: object.painted.map(({ col, row, color, previous }) => [
      col, row, rgbToHex(color), rgbToHex(previous),
    ]),
  };
}

function objectFromData(data) {
  if (!data || !objectTypes[data.type]) throw new Error(`unknown object type: ${data?.type}`);
  return {
    id: data.id,
    type: data.type,
    params: data.params,
    depth: data.depth,
    bounds: data.bounds,
    painted: data.painted.map(([col, row, color, previous]) => ({
      col, row, color: hexToRgb(color), previous: hexToRgb(previous),
    })),
  };
}

// Returns the .quad file content for the current tree and objects.
export function serialize(quadtree, objects) {
  return JSON.stringify({
    format: FORMAT,
    version: VERSION,
    tree: treeToData(quadtree),
    objects: objects.objects.map(objectToData),
  });
}

// Replaces the current tree and objects with the content of a .quad file.
// Throws if the file is invalid, leaving the current content untouched.
export function deserialize(text, quadtree, objects) {
  const data = JSON.parse(text);
  if (data?.format !== FORMAT) throw new Error("not a .quad file");
  if (data.version !== VERSION) throw new Error(`unsupported version: ${data.version}`);

  const tree = treeFromData(data.tree);
  const loadedObjects = (data.objects ?? []).map(objectFromData);

  // The root object is shared by the whole app, so it is updated in place.
  quadtree.color = tree.color;
  quadtree.children = tree.children;
  QuadtreeNode.version++;
  objects.replaceAll(loadedObjects);
}

// Clears the drawing: a single white square, no objects.
export function clearDocument(quadtree, objects) {
  quadtree.color = [255, 255, 255];
  quadtree.children = null;
  QuadtreeNode.version++;
  objects.replaceAll([]);
}
