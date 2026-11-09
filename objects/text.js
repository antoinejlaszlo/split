// Text objects. Parameters:
//   text   the string ("\n" for new lines)
//   col    left of the first line, in squares at `depth`
//   row    top of the first line, in squares at `depth`
//   depth  quadtree depth of a font pixel (the pixel scale)
//   color  "#rrggbb"

import { rasterizeChar, LINE_HEIGHT } from "../font.js";
import { hexToRgb } from "../color.js";

export const textType = {
  rasterize({ text, col, row, depth, color }) {
    const rgb = hexToRgb(color);
    const pixels = [];
    let x = 0;
    let y = 0;
    let width = 0;

    for (const char of text) {
      if (char === "\n") {
        x = 0;
        y += LINE_HEIGHT;
        continue;
      }
      const glyph = rasterizeChar(char);
      for (const [px, py] of glyph.pixels) {
        pixels.push({ col: col + x + px, row: row + y + py, color: rgb });
      }
      x += glyph.advance;
      width = Math.max(width, x);
    }

    return {
      depth,
      pixels,
      box: { col, row, width: Math.max(width, 1), height: y + LINE_HEIGHT },
    };
  },
};

// Where the text cursor goes after the last character, in squares at `depth`.
export function textEnd({ text, col, row }) {
  let x = 0;
  let y = 0;
  for (const char of text) {
    if (char === "\n") {
      x = 0;
      y += LINE_HEIGHT;
    } else {
      x += rasterizeChar(char).advance;
    }
  }
  return { col: col + x, row: row + y };
}
