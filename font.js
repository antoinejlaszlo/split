// Rasterizes characters of the Comic Sans font into small pixel grids.
// Each character is drawn at FONT_SIZE pixels on a hidden canvas; every pixel
// covered at least COVERAGE_THRESHOLD (out of 255) becomes an "on" pixel.
// Below half coverage, so that thin strokes are not lost. Results are cached.

const FONT_SIZE = 24;
const COVERAGE_THRESHOLD = 64;
const FONT = `${FONT_SIZE}px "Comic Sans MS", "Comic Sans", "Comic Neue", cursive`;

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

ctx.font = FONT;
const metrics = ctx.measureText("Mg");
const ASCENT = Math.ceil(metrics.fontBoundingBoxAscent ?? FONT_SIZE);
const DESCENT = Math.ceil(metrics.fontBoundingBoxDescent ?? FONT_SIZE * 0.3);

// Height of a line of text, in font pixels.
export const LINE_HEIGHT = ASCENT + DESCENT;

const cache = new Map();

// Returns { advance, pixels }: how far the caret moves after the character,
// and the [x, y] font pixels to fill, relative to the caret's top-left.
export function rasterizeChar(char) {
  if (cache.has(char)) return cache.get(char);

  ctx.font = FONT;
  const m = ctx.measureText(char);
  const advance = Math.max(1, Math.round(m.width));
  const left = Math.ceil(m.actualBoundingBoxLeft ?? 0) + 1; // room for overhangs
  const width = left + Math.ceil(Math.max(m.actualBoundingBoxRight ?? 0, m.width)) + 2;

  canvas.width = width; // also clears the canvas and resets its state
  canvas.height = LINE_HEIGHT;
  ctx.font = FONT;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(char, left, ASCENT);

  const data = ctx.getImageData(0, 0, width, LINE_HEIGHT).data;
  const pixels = [];
  for (let y = 0; y < LINE_HEIGHT; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] >= COVERAGE_THRESHOLD) pixels.push([x - left, y]);
    }
  }

  const glyph = { advance, pixels };
  cache.set(char, glyph);
  return glyph;
}
