// The 2D camera. The root square occupies [0, 1] x [0, 1] in world coordinates.
// Screen coordinates are in device pixels, relative to the top-left of the view.

const MAX_ZOOM = 2 ** 20; // relative to the most unzoomed scale

export class Camera {
  constructor() {
    this.x = 0; // world coordinates of the view's top-left corner
    this.y = 0;
    this.scale = 1; // screen pixels per world unit
    this.width = 1; // view size in screen pixels
    this.height = 1;
  }

  // The smallest scale at which the view still fits inside the root square.
  get minScale() {
    return Math.max(this.width, this.height);
  }

  get maxScale() {
    return this.minScale * MAX_ZOOM;
  }

  // Updates the view size, keeping the zoom unless the view no longer fits.
  setViewport(width, height) {
    this.width = width;
    this.height = height;
    this.scale = Math.max(this.scale, this.minScale);
    this.clamp();
  }

  // Most unzoomed view, aligned with the top of the quadtree, centered horizontally.
  reset() {
    this.scale = this.minScale;
    this.x = (1 - this.width / this.scale) / 2;
    this.y = 0;
  }

  // Keeps the view strictly inside the root square.
  clamp() {
    this.scale = Math.min(Math.max(this.scale, this.minScale), this.maxScale);
    this.x = Math.min(Math.max(this.x, 0), 1 - this.width / this.scale);
    this.y = Math.min(Math.max(this.y, 0), 1 - this.height / this.scale);
  }

  screenToWorld(screenX, screenY) {
    return {
      x: this.x + screenX / this.scale,
      y: this.y + screenY / this.scale,
    };
  }

  worldToScreenX(worldX) {
    return (worldX - this.x) * this.scale;
  }

  worldToScreenY(worldY) {
    return (worldY - this.y) * this.scale;
  }

  // Moves the content by (dx, dy) screen pixels.
  panBy(dx, dy) {
    this.x -= dx / this.scale;
    this.y -= dy / this.scale;
    this.clamp();
  }

  // Multiplies the zoom by `factor`, keeping the point under (screenX, screenY) fixed.
  zoomAt(screenX, screenY, factor) {
    const world = this.screenToWorld(screenX, screenY);
    this.scale *= factor;
    this.clamp();
    this.x = world.x - screenX / this.scale;
    this.y = world.y - screenY / this.scale;
    this.clamp();
  }
}
