// Colors are stored as [r, g, b] arrays with components in [0, 255].
// Averaged colors may have fractional components; they are rounded only for display.

export function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToCss([r, g, b]) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function sameColor(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function averageColor(colors) {
  const sum = [0, 0, 0];
  for (const color of colors) {
    sum[0] += color[0];
    sum[1] += color[1];
    sum[2] += color[2];
  }
  return sum.map((component) => component / colors.length);
}

export function rgbToHex(color) {
  return "#" + color.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

export function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
