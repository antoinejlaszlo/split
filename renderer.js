// Draws the quadtree on the bottom canvas, and the active tool's previews
// (ghosts, outlines…) on the top canvas. Each layer is redrawn only when needed,
// at most once per frame.

import { state } from "./state.js";
import { rgbToCss } from "./color.js";

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
  }

  // Resizing a canvas clears it, so both layers are redrawn right away.
  resize(width, height) {
    for (const canvas of [this.treeCanvas, this.overlayCanvas]) {
      canvas.width = width;
      canvas.height = height;
    }
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
    const ctx = this.treeCtx;
    ctx.clearRect(0, 0, this.treeCanvas.width, this.treeCanvas.height);
    this.drawNode(this.quadtree, 0, 0, 1);
  }

  // Draws a node covering the world square of side `size` at (x, y).
  drawNode(node, x, y, size) {
    const camera = this.camera;
    const left = Math.round(camera.worldToScreenX(x));
    const top = Math.round(camera.worldToScreenY(y));
    const right = Math.round(camera.worldToScreenX(x + size));
    const bottom = Math.round(camera.worldToScreenY(y + size));

    // Skip nodes entirely outside the view.
    if (right <= 0 || bottom <= 0 || left >= camera.width || top >= camera.height) return;

    // Children smaller than a pixel are not drawn: the node is drawn instead,
    // with its color being the average over its area.
    if (node.isLeaf() || (size / 2) * camera.scale < 1) {
      this.treeCtx.fillStyle = rgbToCss(node.color);
      this.treeCtx.fillRect(left, top, right - left, bottom - top);
      return;
    }
    const half = size / 2;
    const [topLeft, topRight, bottomLeft, bottomRight] = node.children;
    this.drawNode(topLeft, x, y, half);
    this.drawNode(topRight, x + half, y, half);
    this.drawNode(bottomLeft, x, y + half, half);
    this.drawNode(bottomRight, x + half, y + half, half);
  }

  drawOverlay() {
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    state.activeTool?.drawOverlay?.(ctx, this.camera);
  }
}
