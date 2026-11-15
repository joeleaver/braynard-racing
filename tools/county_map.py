"""Bake Braynard's county map from the world's own data.

The map is drawn, never painted by hand, so it can't go stale: run this again whenever the ground or
the roads change. It reads a height map (the same 16-bit PNG the world's Height Map shape uses) and
road curves (each road's centre line, width and class), and draws a claymation relief map: land
tinted by height, lit warm from the north-west like the game's late-afternoon sun, faint contours,
and roads as raised strips with a soft shadow, the County Ring widest. Labels, markers, the player
and routes are NOT baked: the game draws them live over this picture (screens/map.ts).

    python3 tools/county_map.py --heights heightmap.png --roads roads.json --out map.png [--px 1024]

roads.json: {"box": {"x0", "z0", "size", "bottom", "top"}, "roads": [{"name", "width", "path":
[[x, y, z], ...], "class"?: "ring" | "ramp" | "lane" | "track", "bridge"?: true}]}. World x is the
image's x and world z its y, so north (−Z) is up, as on the County map.

Design: Pimble, Braynard Racing/Design → "The map". Writes the PNG and prints the box the game needs.
"""
import argparse, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, zoom

# The map's palette: the county-show board greens and straw, true to the game's screens (data/style.ts).
LAND = [  # (height m, colour) — low meadow to high ground
    (0, (126, 186, 96)), (60, (150, 196, 98)), (120, (176, 196, 104)),
    (200, (190, 178, 110)), (400, (176, 140, 96)), (800, (150, 132, 120)), (1200, (226, 226, 230)),
]
ROADS = {  # class: (fill, edge, width scale, minimum px)
    "ring": ((250, 238, 205), (36, 85, 46), 1.0, 5.0),
    "ramp": ((255, 247, 226), (90, 70, 48), 2.0, 3.4),
    "lane": ((255, 247, 226), (90, 70, 48), 2.0, 4.0),
    "track": ((222, 196, 140), (110, 84, 52), 1.4, 2.0),
}
ORDER = ["track", "lane", "ramp", "ring"]


def road_class(road):
    if "class" in road:
        return road["class"]
    n = road["name"].lower()
    return "ring" if n.startswith("ring") else "ramp" if "ramp" in n else "lane"


def tint(h):
    hs = [p[0] for p in LAND]
    out = np.zeros(h.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(h, hs, [p[1][c] for p in LAND])
    return out


def bake(heights_png, box, roads, px, out):
    raw = np.asarray(Image.open(heights_png)).astype(np.float64)
    hmax = 65535.0 if raw.max() > 255 else 255.0
    h = box["bottom"] + raw / hmax * (box["top"] - box["bottom"])
    h = zoom(h, px / h.shape[0], order=1)
    mpp = box["size"] / px  # metres per pixel

    # Light from the north-west, low and warm: the hillshade the clay table would show.
    gy, gx = np.gradient(gaussian_filter(h, 1.2), mpp)
    az, alt = math.radians(315), math.radians(35)
    lx, ly, lz = math.cos(alt) * math.cos(az), -math.cos(alt) * math.sin(az), math.sin(alt)
    nz = 1 / np.sqrt(1 + gx * gx + gy * gy)
    shade = np.clip((-gx * lx - gy * ly + lz) * nz, 0, 1)
    shade = (shade - shade.mean()) * 3.2 + 1.0  # exaggerate the gentle spike relief
    rgb = tint(h) * np.clip(shade, 0.55, 1.35)[..., None]
    rgb = rgb * np.array([1.03, 1.0, 0.94])  # a touch of late-afternoon warmth

    # Contours: faint every 10 m, a little stronger every 50 m.
    for step, strength in ((10, 0.06), (50, 0.12)):
        f = h / step
        line = np.abs(f - np.round(f)) * step / (np.hypot(gx, gy) * mpp + 1e-3)
        rgb *= 1 - strength * np.clip(1.2 - line, 0, 1)[..., None]

    # A light clay grain, so it reads as a modelled table rather than a flat print.
    rng = np.random.default_rng(7)
    grain = gaussian_filter(rng.standard_normal(h.shape), 1.0)
    rgb *= 1 + 0.025 * grain[..., None]
    base = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")

    # Roads at twice the size, then down, for clean edges. Each class: shadow, edge, fill.
    ss = 2
    big = base.resize((px * ss, px * ss), Image.BICUBIC)
    to_px = lambda p: ((p[0] - box["x0"]) / mpp * ss, (p[2] - box["z0"]) / mpp * ss)
    def stroke(d, pts, col, w):
        d.line(pts, fill=col, width=int(w), joint="curve")
        for p in (pts[0], pts[-1]):  # round the ends, so spans join without a seam
            d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=col)

    # Draw a class at a time, bottom up, and a bridge after everything it crosses: all the class's
    # shadows, then all its edges, then all its fills, so joined spans read as one road.
    groups = {}
    for r in roads:
        groups.setdefault((r.get("bridge", False), ORDER.index(road_class(r))), []).append(r)
    for key in sorted(groups):
        group = [(r, ROADS[road_class(r)], [to_px(p) for p in r["path"]]) for r in groups[key]]
        width = lambda r, st: max(r["width"] * st[2] / mpp, st[3]) * ss
        shadow = Image.new("L", big.size, 0)
        for r, st, pts in group:
            stroke(ImageDraw.Draw(shadow), [(x + 2.5 * ss, y + 3 * ss) for x, y in pts], 120, width(r, st) + 3 * ss)
        shadow = shadow.filter(ImageFilter.GaussianBlur(3 * ss))
        big = Image.composite(Image.new("RGB", big.size, (40, 52, 30)), big, shadow)
        d = ImageDraw.Draw(big)
        for r, st, pts in group:
            stroke(d, pts, st[1], width(r, st) + 3 * ss)
        for r, st, pts in group:
            stroke(d, pts, st[0], width(r, st))
            if road_class(r) == "ring":  # a dashed centre line, so the freeway reads as one road
                for a, b in zip(pts[::2], pts[1::2]):
                    d.line([a, b], fill=st[1], width=max(1, int(ss)))
    img = big.resize((px, px), Image.LANCZOS)
    img.save(out, optimize=True)
    return {"x0": box["x0"], "z0": box["z0"], "size": box["size"], "px": px}


if __name__ == "__main__":
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--heights", required=True)
    a.add_argument("--roads", required=True)
    a.add_argument("--out", required=True)
    a.add_argument("--px", type=int, default=1024)
    o = a.parse_args()
    data = json.load(open(o.roads))
    print(json.dumps(bake(o.heights, data["box"], data["roads"], o.px, o.out)))
