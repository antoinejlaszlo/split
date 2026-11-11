"""Publish a drawing to the gallery, or remove one.

    python publish.py my-drawing.quad "My drawing"     publish (or update) a drawing
    python publish.py my-drawing.quad "My drawing" --id custom-id
    python publish.py --remove my-drawing              unpublish a drawing

Publishing copies the .quad file into drawings/, renders a pixel-art
thumbnail (drawings/<id>.png) from its quadtree, and adds the drawing to
drawings/index.json (newest first). Publishing again with the same id
replaces the drawing and its thumbnail.

Only the Python standard library is needed.
"""

import argparse
import datetime
import json
import re
import struct
import sys
import unicodedata
import zlib
from pathlib import Path

DRAWINGS = Path(__file__).resolve().parent / "drawings"
INDEX = DRAWINGS / "index.json"
THUMBNAIL_SIZE = 256  # pixels


# --- Quadtree -------------------------------------------------------------
# In a .quad file, a leaf is its color "#rrggbb" and a non-leaf is the list
# of its 4 children [top-left, top-right, bottom-left, bottom-right].

def hex_to_rgb(value):
    return (int(value[1:3], 16), int(value[3:5], 16), int(value[5:7], 16))


def average_color(node):
    """Average color over a node's area, as the website computes it."""
    if isinstance(node, str):
        return hex_to_rgb(node)
    colors = [average_color(child) for child in node]
    return tuple(sum(color[i] for color in colors) / 4 for i in range(3))


def render(tree, size):
    """Renders the tree into a size x size grid of RGB tuples. Squares smaller
    than a pixel are drawn as their nearest ancestor of at least one pixel,
    with its average color, like the website does."""
    pixels = [[(255, 255, 255)] * size for _ in range(size)]

    def draw(node, x, y, side):
        left, top = round(x), round(y)
        right, bottom = round(x + side), round(y + side)
        if isinstance(node, str) or side / 2 < 1:
            r, g, b = average_color(node)
            color = (int(r + 0.5), int(g + 0.5), int(b + 0.5))
            for row in range(top, bottom):
                pixels[row][left:right] = [color] * (right - left)
            return
        half = side / 2
        draw(node[0], x, y, half)
        draw(node[1], x + half, y, half)
        draw(node[2], x, y + half, half)
        draw(node[3], x + half, y + half, half)

    draw(tree, 0, 0, size)
    return pixels


# --- PNG --------------------------------------------------------------------

def write_png(path, pixels):
    height, width = len(pixels), len(pixels[0])
    raw = b"".join(b"\x00" + bytes(c for pixel in row for c in pixel) for row in pixels)

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8-bit RGB
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


# --- Gallery list -----------------------------------------------------------

def load_index():
    if INDEX.exists():
        return json.loads(INDEX.read_text(encoding="utf-8"))
    return {"drawings": []}


def save_index(index):
    INDEX.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def make_id(name):
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-") or "drawing"


def publish(source, name, drawing_id):
    data = json.loads(Path(source).read_text(encoding="utf-8"))
    if data.get("format") != "quad" or "tree" not in data:
        sys.exit(f"{source} is not a .quad file.")

    DRAWINGS.mkdir(exist_ok=True)
    quad_file = f"{drawing_id}.quad"
    thumbnail = f"{drawing_id}.png"
    (DRAWINGS / quad_file).write_bytes(Path(source).read_bytes())
    write_png(DRAWINGS / thumbnail, render(data["tree"], THUMBNAIL_SIZE))

    index = load_index()
    entries = [entry for entry in index["drawings"] if entry["id"] != drawing_id]
    entries.insert(0, {
        "id": drawing_id,
        "name": name,
        "file": quad_file,
        "thumbnail": thumbnail,
        "published": datetime.date.today().isoformat(),
    })
    index["drawings"] = entries
    save_index(index)
    print(f'Published "{name}" as drawings/{quad_file} (thumbnail drawings/{thumbnail}).')


def remove(drawing_id):
    index = load_index()
    entry = next((entry for entry in index["drawings"] if entry["id"] == drawing_id), None)
    if entry is None:
        sys.exit(f'No published drawing with id "{drawing_id}".')
    index["drawings"].remove(entry)
    save_index(index)
    for name in (entry["file"], entry["thumbnail"]):
        (DRAWINGS / name).unlink(missing_ok=True)
    print(f'Removed "{entry["name"]}".')


def main():
    parser = argparse.ArgumentParser(description="Publish a .quad drawing to the gallery.")
    parser.add_argument("file", nargs="?", help="the .quad file to publish")
    parser.add_argument("name", nargs="?", help="the name shown in the gallery")
    parser.add_argument("--id", help="id used in the page address and file names (default: from the name)")
    parser.add_argument("--remove", metavar="ID", help="unpublish the drawing with this id")
    args = parser.parse_args()

    if args.remove:
        remove(args.remove)
    elif args.file and args.name:
        publish(args.file, args.name, args.id or make_id(args.name))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
