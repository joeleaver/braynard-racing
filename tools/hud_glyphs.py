#!/usr/bin/env python3
"""Bake the HUD's outlined numerals into sprite sheets, until rinch can draw them as CSS.

The HUD's numbers are game graphics: Lilita One with a thick dark outline, a warm gradient fill, a
highlight and an extruded shadow (Design, "The HUD"). Rinch can't paint `background-clip: text` or
`-webkit-text-stroke` yet (rinch #2719), so for now each glyph is drawn by Chrome from that same CSS
and baked into a sheet of equal cells, one sheet per colour. A screen shows a number glyph by glyph
(`pw.image(name, { cell })`, `image(img, { frame })`), each glyph clipped to its own width.

When #2719 lands, the screens switch back to the CSS and these sheets go.

Writes art/ui/hud-numerals-<colour>.png and art/ui/hud-numerals.json (the glyph order, the cell size,
and each glyph's width). Usage: python3 tools/hud_glyphs.py
"""
import json
import pathlib
import re
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "art" / "ui"
FONT = ROOT / "art" / "fonts" / "lilita-one" / "LilitaOne-Regular.ttf"
GLYPHS = "0123456789/:.+-stndrhkmGo!"
CELL_W, CELL_H = 128, 160
SIZE = 120  # px font size inside a cell
COLS = 13

FILLS = {
    "gold": "linear-gradient(180deg, #FFF6B8 0%, #FFD24A 38%, #F7A21B 70%, #E06A12 100%)",
    "cream": "linear-gradient(180deg, #FFFFFF 0%, #FFF6E2 50%, #E8D4A6 100%)",
    "blue": "linear-gradient(180deg, #E6F3FF 0%, #8CC7FF 45%, #3D86E0 100%)",
    "red": "linear-gradient(180deg, #FFE1D6 0%, #FF8A6A 45%, #D6382A 100%)",
}
INKS = {"gold": "#3A1E08", "cream": "#3A1E08", "blue": "#0F2647", "red": "#3E0C06"}


def page(fill: str, ink: str) -> str:
    rows = (len(GLYPHS) + COLS - 1) // COLS
    cells = "".join(
        f'<div class="c" style="left:{(i % COLS) * CELL_W}px;top:{(i // COLS) * CELL_H}px">'
        f'<span class="g" data-i="{i}"><span class="k">{g}</span><span class="t">{g}</span><span class="h">{g}</span></span></div>'
        for i, g in enumerate(GLYPHS)
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: "Lilita One"; src: url("file://{FONT}"); }}
html, body {{ margin: 0; background: transparent; }}
#sheet {{ position: relative; width: {COLS * CELL_W}px; height: {rows * CELL_H}px; }}
.c {{ position: absolute; width: {CELL_W}px; height: {CELL_H}px; display: flex; align-items: center; justify-content: center; }}
.g {{ position: relative; display: inline-block; line-height: 1; font: {SIZE}px "Lilita One"; white-space: nowrap; margin-top: -10px; }}
.k {{ position: absolute; left: 0; top: 0; color: {ink}; -webkit-text-stroke: 16px {ink}; text-shadow: 0 7px 0 {ink}; }}
.t {{ position: relative; background: {fill}; -webkit-background-clip: text; background-clip: text; color: transparent; }}
.h {{ position: absolute; left: 0; top: 0; background: linear-gradient(180deg, #FFFFFFA6 0%, #FFFFFF00 42%); -webkit-background-clip: text; background-clip: text; color: transparent; }}
</style></head><body><div id="sheet">{cells}</div>
<script>
document.fonts.ready.then(() => {{
  const w = [...document.querySelectorAll('.g')].map(e => Math.ceil(e.getBoundingClientRect().width + 18));
  document.body.setAttribute('data-widths', JSON.stringify(w));
}});
</script></body></html>"""


def chrome(args: list[str]) -> str:
    return subprocess.run(["google-chrome", "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                           "--allow-file-access-from-files", "--virtual-time-budget=3000", *args],
                          capture_output=True, text=True, timeout=120).stdout


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = (len(GLYPHS) + COLS - 1) // COLS
    widths = None
    with tempfile.TemporaryDirectory() as tmp:
        for name, fill in FILLS.items():
            html = pathlib.Path(tmp) / f"{name}.html"
            html.write_text(page(fill, INKS[name]))
            png = OUT / f"hud-numerals-{name}.png"
            chrome(["--default-background-color=00000000", f"--window-size={COLS * CELL_W},{rows * CELL_H}", f"--screenshot={png}", f"file://{html}"])
            if widths is None:
                dom = chrome(["--dump-dom", f"file://{html}"])
                m = re.search(r'data-widths="([^"]+)"', dom)
                widths = json.loads(m.group(1).replace("&quot;", '"')) if m else [CELL_W] * len(GLYPHS)
            print("wrote", png.relative_to(ROOT))
    meta = {"glyphs": GLYPHS, "cell": [CELL_W, CELL_H], "columns": COLS, "widths": [min(CELL_W, w) for w in widths], "colours": list(FILLS)}
    (OUT / "hud-numerals.json").write_text(json.dumps(meta, indent=1))
    print("wrote", (OUT / "hud-numerals.json").relative_to(ROOT))


if __name__ == "__main__":
    main()
