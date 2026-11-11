// Draws the quadtree on the bottom canvas, and the active tool's previews
// (ghosts, outlines…) on the top canvas. Each layer is redrawn only when needed,
// at most once per frame.
//
// The quadtree is drawn into a pixel buffer (one 32-bit value per pixel) that
// is copied to the canvas in one go, which is much faster than one fillRect
// call per square. When only the camera moved, without zooming and without
// any edit, the previous frame is shifted and only the strips that came into
// view are drawn.

import { state } from "./state.js";
import { QuadtreeNode } from "./quadtree.js";

// Pixel buffers store RGBA bytes; read as 32-bit numbers, their byte order
// depends on the machine (almost always little-endian: ABGR).
const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

function packColor(color) {
  const r = (color[0] + 0.5) | 0;
  const g = (color[1] + 0.5) | 0;
  const b = (color[2] + 0.5) | 0;
  return LITTLE_ENDIAN
    ? ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
    : ((r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
}

export class Renderer {
  constructor(treeCanvas, overlayCanvas, camera, quadtree) {
    this.treeCanvas = treeCanvas;
    this.overlayCanvas = overlayCanvas;
    this.treeCtx = treeCanvas.getContext("2d");
    this.overlayCtx = overlayCanvas.getContext("2d");
    this.camera = camera;
    this.quadtree = quadtree;
    this.treeDirty = false;
    this.overlayDirty = false;
    this.frameRequested = false;
    this.image = null; // ImageData of the tree layer
    this.pixels = null; // the same pixels, as 32-bit values
    this.drawn = null; // { originX, originY, scale, version } of the current frame
  }

  // Resizing a canvas clears it, so both layers are redrawn right away.
  resize(width, height) {
    for (const canvas of [this.treeCanvas, this.overlayCanvas]) {
      canvas.width = width;
      canvas.height = height;
    }
    this.image = this.treeCtx.createImageData(width, height);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.drawn = null;
    this.treeDirty = true;
    this.overlayDirty = true;
    this.flush();
  }

  // Schedules a redraw. Pass { tree: false } to redraw only the overlay.
  requestRender({ tree = true, overlay = true } = {}) {
    this.treeDirty ||= tree;
    this.overlayDirty ||= overlay;
    if (this.frameRequested) return;
    this.frameRequested = true;
    requestAnimationFrame(() => this.flush());
  }

  flush() {
    this.frameRequested = false;
    if (this.treeDirty) this.drawTree();
    if (this.overlayDirty) this.drawOverlay();
    this.treeDirty = false;
    this.overlayDirty = false;
  }

  drawTree() {
    if (!this.pixels) return;
    const { camera } = this;
    const width = this.treeCanvas.width;
    const height = this.treeCanvas.height;
    const frame = {
      originX: camera.originX,
      originY: camera.originY,
      scale: camera.scale,
      version: QuadtreeNode.version, // changes with every edit of the tree
    };
    const previous = this.drawn;

    if (previous && previous.scale === frame.scale && previous.version === frame.version) {
      const dx = previous.originX - frame.originX; // how far the picture moves
      const dy = previous.originY - frame.originY;
      if (dx === 0 && dy === 0) return; // nothing changed
      if (Math.abs(dx) < width && Math.abs(dy) < height) {
        this.shiftPixels(dx, dy, width, height);
        // Draw the strips that came into view.
        if (dx > 0) this.drawArea(0, 0, dx, height);
        if (dx < 0) this.drawArea(width + dx, 0, width, height);
        if (dy > 0) this.drawArea(0, 0, width, dy);
        if (dy < 0) this.drawArea(0, height + dy, width, height);
        this.treeCtx.putImageData(this.image, 0, 0);
        this.drawn = frame;
        return;
      }
    }

    this.drawArea(0, 0, width, height);
    this.treeCtx.putImageData(this.image, 0, 0);
    this.drawn = frame;
  }

  // Moves the buffer's content by (dx, dy) pixels.
  shiftPixels(dx, dy, width, height) {
    const pixels = this.pixels;
    const fromX = Math.max(0, -dx);
    const toX = Math.max(0, dx);
    const length = width - Math.abs(dx);
    const rows = height - Math.abs(dy);
    // Copy rows in an order that never overwrites rows still to be copied.
    for (let i = 0; i < rows; i++) {
      const row = dy > 0 ? height - 1 - i : i; // destination row
      const source = row - dy;
      pixels.copyWithin(row * width + toX, source * width + fromX, source * width + fromX + length);
    }
  }

  // Draws the part of the quadtree inside the screen rectangle
  // [left, right) x [top, bottom) into the buffer.
  drawArea(left, top, right, bottom) {
    const width = this.treeCanvas.width;
    for (let y = top; y < bottom; y++) this.pixels.fill(0, y * width + left, y * width + right);
    this.drawNode(this.quadtree, 0, 0, 1, left, top, right, bottom);
  }

  // Draws a node covering the world square of side `size` at (x, y), clipped
  // to the screen rectangle [clipLeft, clipRight) x [clipTop, clipBottom).
  drawNode(node, x, y, size, clipLeft, clipTop, clipRight, clipBottom) {
    const { scale, originX, originY } = this.camera;
    const left = Math.max(clipLeft, Math.round(x * scale) - originX);
    const right = Math.min(clipRight, Math.round((x + size) * scale) - originX);
    if (right <= left) return;
    const top = Math.max(clipTop, Math.round(y * scale) - originY);
    const bottom = Math.min(clipBottom, Math.round((y + size) * scale) - originY);
    if (bottom <= top) return;

    // Children smaller than a pixel are not drawn: the node is drawn instead,
    // with its color being the average over its area.
    const half = size / 2;
    if (node.children === null || half * scale < 1) {
      const value = packColor(node.color);
      const width = this.treeCanvas.width;
      const pixels = this.pixels;
      for (let row = top; row < bottom; row++) {
        pixels.fill(value, row * width + left, row * width + right);
      }
      return;
    }
    const children = node.children;
    this.drawNode(children[0], x, y, half, clipLeft, clipTop, clipRight, clipBottom);
    this.drawNode(children[1], x + half, y, half, clipLeft, clipTop, clipRight, clipBottom);
    this.drawNode(children[2], x, y + half, half, clipLeft, clipTop, clipRight, clipBottom);
    this.drawNode(children[3], x + half, y + half, half, clipLeft, clipTop, clipRight, clipBottom);
  }

  drawOverlay() {
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    state.activeTool?.drawOverlay?.(ctx, this.camera);
  }
}
