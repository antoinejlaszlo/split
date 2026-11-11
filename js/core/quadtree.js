import { averageColor, sameColor } from "./color.js";

// A node of the quadtree. Every node has a color ([r, g, b]):
// a leaf's own color, or for a non-leaf, the average color over its area.
// `children` is null for a leaf, or an array of 4 nodes in the order:
// [top-left, top-right, bottom-left, bottom-right].
export class QuadtreeNode {
  // Incremented by every change to any node, so the renderer can tell whether
  // the tree changed since its last frame.
  static version = 0;

  constructor(color, children = null) {
    if (children !== null && children.length !== 4) {
      throw new Error("A non-leaf node must have exactly 4 children.");
    }
    this.color = color;
    this.children = children;
    if (children !== null) this.updateColor();
  }

  isLeaf() {
    return this.children === null;
  }

  // Recomputes a non-leaf node's color as the average of its children.
  // Children all cover the same area, so this is the average over the node's area.
  updateColor() {
    this.color = averageColor(this.children.map((child) => child.color));
    QuadtreeNode.version++;
  }

  // Turns a leaf into 4 leaves of the same color.
  subdivide() {
    this.children = [0, 1, 2, 3].map(() => new QuadtreeNode([...this.color]));
    QuadtreeNode.version++;
  }

  // Color of the square at `depth` levels below this node containing the
  // point (x, y), if that square is a leaf or lies inside a leaf; otherwise
  // (it has smaller squares inside) null.
  leafColorAt(x, y, depth) {
    let node = this;
    for (; depth > 0; depth--) {
      if (node.isLeaf()) return node.color;
      const right = x >= 0.5 ? 1 : 0;
      const bottom = y >= 0.5 ? 1 : 0;
      node = node.children[bottom * 2 + right];
      x = 2 * x - right;
      y = 2 * y - bottom;
    }
    return node.isLeaf() ? node.color : null;
  }

  // The leaf containing the point (x, y), given in this node's local
  // coordinates ([0, 1) x [0, 1)), with its position and size in those
  // coordinates and its depth below this node.
  leafAt(x, y) {
    let node = this;
    let left = 0;
    let top = 0;
    let size = 1;
    let depth = 0;
    while (!node.isLeaf()) {
      size /= 2;
      const right = x >= left + size ? 1 : 0;
      const bottom = y >= top + size ? 1 : 0;
      left += right * size;
      top += bottom * size;
      node = node.children[bottom * 2 + right];
      depth++;
    }
    return { node, x: left, y: top, size, depth };
  }

  // Whether the square at `depth` levels below this node containing the point
  // (x, y) can be painted: it must be a leaf, or lie inside a leaf.
  // Non-leaf nodes cannot be painted over.
  canPaintAt(x, y, depth) {
    return this.leafColorAt(x, y, depth) !== null;
  }

  // Paints the square at `depth` levels below this node containing the point
  // (x, y), given in this node's local coordinates ([0, 1) x [0, 1)).
  // Only a leaf can be recolored, or split into smaller leaves; a non-leaf
  // node is left untouched. The colors of the ancestors of the painted square
  // are recomputed. Returns whether anything changed.
  paintAt(x, y, depth, color) {
    if (depth === 0) {
      if (!this.isLeaf() || sameColor(this.color, color)) return false;
      this.color = [...color];
      QuadtreeNode.version++;
      return true;
    }
    if (this.isLeaf()) {
      if (sameColor(this.color, color)) return false;
      this.subdivide();
    }
    const right = x >= 0.5 ? 1 : 0;
    const bottom = y >= 0.5 ? 1 : 0;
    const child = this.children[bottom * 2 + right];
    const changed = child.paintAt(2 * x - right, 2 * y - bottom, depth - 1, color);
    if (changed) this.updateColor();
    return changed;
  }

  // Merges every non-leaf node whose 4 children are leaves of the same color
  // into a single leaf, from the bottom up (so merges can cascade into bigger
  // squares). This reduces the number of nodes without changing the picture.
  // If `area` ({ x, y, width, height }, world coordinates) is given, only nodes
  // overlapping it are visited. `x`, `y`, `size` locate this node in the world.
  minimize(area = null, x = 0, y = 0, size = 1) {
    if (this.isLeaf()) return;
    if (area && (x >= area.x + area.width || x + size <= area.x ||
                 y >= area.y + area.height || y + size <= area.y)) return;
    const half = size / 2;
    this.children.forEach((child, i) => {
      child.minimize(area, x + (i % 2) * half, y + Math.floor(i / 2) * half, half);
    });
    const first = this.children[0];
    if (this.children.every((child) => child.isLeaf() && sameColor(child.color, first.color))) {
      this.color = [...first.color];
      this.children = null;
      QuadtreeNode.version++;
    }
  }

  // Number of nodes in the tree (leaves and non-leaves).
  countNodes() {
    return this.isLeaf() ? 1 : 1 + this.children.reduce((sum, child) => sum + child.countNodes(), 0);
  }
}

// The quadtree starts as a single white square.
export const quadtree = new QuadtreeNode([255, 255, 255]);
