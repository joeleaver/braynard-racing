#!/usr/bin/env python3
"""Paint Braynard Racing's road-sign faces from the sign spec.

Each face is a PNG laid over a sign board by the game's `sign_face` material. Colours, fonts and
proportions follow the sign spec in the Design (Pimble: Braynard Racing / Design / "Road signs").
This is the stand-in until signs carry live text (a general Playweft world-text feature); the spec
stays the same either way, so these faces and live text look alike.

    python3 tools/sign_faces.py OUT_DIR [name ...]
    python3 tools/sign_faces.py --keys OUT_DIR KEY ...

The second form paints faces by the keys the road_sign builder names them by ("stop", "give way",
"plate:Stop 100 m", "warn:bend left", "finger:Home Farm|¾|right" …) and prints each one's size in
metres for the FACES table in game/components/road_sign.ts.

Fonts: Lato Black for road signs, Lilita One for course, event and billboard signs (SIL OFL,
art/fonts/).
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LATO = os.path.join(ROOT, "art/fonts/lato/Lato-Black-Latin.ttf")
LILITA = os.path.join(ROOT, "art/fonts/lilita-one/LilitaOne-Regular.ttf")

PX = 320  # pixels a metre

# The sign families' colours (the spec's table).
RING_GREEN = (30, 123, 60)
WHITE = (250, 248, 240)
INK = (27, 27, 27)
TAB_YELLOW = (255, 199, 44)
CREAM = (247, 243, 232)
SIGNAL_RED = (200, 53, 43)
SCENIC_BROWN = (107, 62, 38)
HAY = (242, 194, 48)
EVENT_RED = (184, 38, 30)
# US signs (Joe, 2026-11-22: "American style markings, and we'd drive on the right"), MUTCD colours.
US_RED = (191, 23, 42)
US_YELLOW = (255, 204, 0)
US_GREEN = (0, 112, 60)

CAP = {"lato": 0.718, "lilita": 0.70}  # cap height as a share of the em


def font(kind, cap_m):
    """A font whose capitals stand cap_m metres tall."""
    path = LATO if kind == "lato" else LILITA
    return ImageFont.truetype(path, max(8, round(cap_m * PX / CAP[kind])))


def m(v):
    return round(v * PX)


def canvas(w, h, fill=(0, 0, 0, 0)):
    img = Image.new("RGBA", (m(w), m(h)), fill)
    return img, ImageDraw.Draw(img)


def width_m(s, f):
    """How wide a line of text is, in metres."""
    return f.getlength(s) / PX


def text_at(d, xy_m, s, f, fill, anchor="ls"):
    d.text((m(xy_m[0]), m(xy_m[1])), s, font=f, fill=fill, anchor=anchor)


def rounded_board(d, w, h, fill, border, border_m, inset_m, radius_m):
    d.rounded_rectangle((0, 0, m(w) - 1, m(h) - 1), radius=m(radius_m), fill=fill)
    if border:
        i = m(inset_m)
        d.rounded_rectangle((i, i, m(w) - 1 - i, m(h) - 1 - i), radius=max(1, m(radius_m - inset_m)),
                            outline=border, width=m(border_m))


def arrow(d, cx, cy, length, angle_deg, fill, stem=0.22, head=0.55):
    """The spec's arrow: a straight stem and a broad head. Angle 0 points up, clockwise positive.
    Sizes in metres; stem and head widths as shares of the length."""
    a = math.radians(angle_deg)
    ux, uy = math.sin(a), -math.cos(a)        # along (up on the sign is -y)
    px, py = -uy, ux                          # across
    L = length
    hl = L * 0.45                             # head length
    sw, hw = L * stem / 2, L * head / 2
    tip = (cx + ux * L / 2, cy + uy * L / 2)
    base = (cx - ux * L / 2, cy - uy * L / 2)
    neck = (tip[0] - ux * hl, tip[1] - uy * hl)
    pts = [
        (base[0] + px * sw, base[1] + py * sw), (neck[0] + px * sw, neck[1] + py * sw),
        (neck[0] + px * hw, neck[1] + py * hw), tip,
        (neck[0] - px * hw, neck[1] - py * hw), (neck[0] - px * sw, neck[1] - py * sw),
        (base[0] - px * sw, base[1] - py * sw),
    ]
    d.polygon([(m(x), m(y)) for x, y in pts], fill=fill)


def ring_shield(d, cx, cy, r):
    """The County Ring's shield: a white roundel ringed in green, with the loop inside it: a green
    ring with a gap and an arrowhead, going clockwise."""
    d.ellipse((m(cx - r), m(cy - r), m(cx + r), m(cy + r)), fill=WHITE)
    d.ellipse((m(cx - r * 0.92), m(cy - r * 0.92), m(cx + r * 0.92), m(cy + r * 0.92)), fill=RING_GREEN)
    d.ellipse((m(cx - r * 0.80), m(cy - r * 0.80), m(cx + r * 0.80), m(cy + r * 0.80)), fill=WHITE)
    rr = r * 0.62
    d.arc((m(cx - rr), m(cy - rr), m(cx + rr), m(cy + rr)), start=-50, end=250, fill=RING_GREEN, width=m(r * 0.2))
    # the loop's arrowhead at the arc's end
    a = math.radians(-50)
    hx, hy = cx + rr * math.cos(a), cy + rr * math.sin(a)
    s = r * 0.3
    d.polygon([(m(hx - s), m(hy - s * 0.2)), (m(hx + s), m(hy - s * 0.2)), (m(hx), m(hy + s * 1.1))], fill=RING_GREEN)


# ---- the faces -----------------------------------------------------------------------------------

def ring_exit_advance():
    """J7's advance sign on the Ring, 600 m before the exit: green board, yellow junction tab."""
    big = font("lato", 0.5)
    lines = ["Mill River", "Braynard Woods"]
    w, h = 0.35 + max(width_m(t, big) for t in lines) + 0.35 + 1.1 + 0.35, 3.0
    img, d = canvas(w, h)
    rounded_board(d, w, h, RING_GREEN, WHITE, 0.07, 0.09, 0.22)
    # junction tab, top left
    d.rounded_rectangle((m(0.3), m(0.3), m(1.75), m(0.95)), radius=m(0.08), fill=TAB_YELLOW)
    text_at(d, (1.025, 0.625), "EXIT 7", font("lato", 0.3), INK, anchor="mm")
    ring_shield(d, w - 0.7, 0.65, 0.38)
    text_at(d, (0.35, 1.75), lines[0], big, WHITE)
    text_at(d, (0.35, 2.45), lines[1], big, WHITE)
    arrow(d, w - 0.9, 2.0, 1.0, 45, WHITE)
    text_at(d, (2.1, 0.78), "600 m", font("lato", 0.3), WHITE)
    return img


def ring_gore():
    """The gore sign where the slip road leaves the Ring."""
    w, h = 2.6, 1.3
    img, d = canvas(w, h)
    rounded_board(d, w, h, RING_GREEN, WHITE, 0.06, 0.07, 0.16)
    d.rounded_rectangle((m(0.22), m(0.25), m(1.7), m(1.05)), radius=m(0.08), fill=TAB_YELLOW)
    text_at(d, (0.96, 0.65), "EXIT 7", font("lato", 0.3), INK, anchor="mm")
    arrow(d, 2.1, 0.65, 0.72, 45, WHITE)
    return img


def finger_arm(place, dist, h=0.34, left=False):
    """One fingerpost arm, pointing right: white, black lettering, a black edge, the point cut in.
    As long as its words need."""
    f = font("lato", 0.15)
    pt = h * 0.55
    w = 0.1 + width_m(place, f) + 0.14 + width_m(dist, f) + 0.06 + pt
    img, d = canvas(w, h)
    poly = [(0, 0), (w - pt, 0), (w, h / 2), (w - pt, h), (0, h)]
    d.polygon([(m(x), m(y)) for x, y in poly], fill=WHITE)
    e = 0.025
    inner = [(e, e), (w - pt - e * 0.4, e), (w - e * 1.6, h / 2), (w - pt - e * 0.4, h - e), (e, h - e)]
    d.line([(m(x), m(y)) for x, y in inner + inner[:1]], fill=INK, width=m(0.022), joint="curve")
    text_at(d, (0.1, h / 2), place, f, INK, anchor="lm")
    text_at(d, (w - pt - 0.06, h / 2), dist, f, INK, anchor="rm")
    if left:
        # pointing left: the arm's shape mirrored, its words laid in again the right way round
        shape = img.transpose(Image.FLIP_LEFT_RIGHT)
        img, d = canvas(w, h)
        img.paste(shape, (0, 0))
        d.rectangle((m(pt), m(0.05), m(w - 0.05), m(h - 0.05)), fill=WHITE)
        text_at(d, (pt + 0.06, h / 2), dist, f, INK, anchor="lm")
        text_at(d, (w - 0.1, h / 2), place, f, INK, anchor="rm")
    return img


def warning_triangle(picto, side=1.2):
    """A warning sign: white triangle, red border, black pictogram. Point up."""
    hgt = side * math.sqrt(3) / 2
    img, d = canvas(side, hgt)
    tri = [(side / 2, 0), (side, hgt), (0, hgt)]
    d.polygon([(m(x), m(y)) for x, y in tri], fill=SIGNAL_RED)
    # the white field, inset
    c = (side / 2, hgt * 2 / 3)
    k = 0.72
    inner = [(c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k) for x, y in tri]
    d.polygon([(m(x), m(y)) for x, y in inner], fill=WHITE)
    # The pictogram is drawn on its own layer, then fitted inside the white field's inscribed
    # circle (with a margin), so it never touches the red border whatever its shape.
    layer, ld = canvas(side, hgt)
    picto(ld, side, hgt)
    box = layer.getbbox()
    if box:
        layer = layer.crop(box)
        r_in = k * side * math.sqrt(3) / 6           # the white field's inscribed radius
        fit = 2 * r_in * 0.92                        # the picture's diagonal fits inside it
        diag = math.hypot(layer.width, layer.height) / PX
        sc = fit / diag
        layer = layer.resize((max(1, round(layer.width * sc)), max(1, round(layer.height * sc))), Image.LANCZOS)
        img.alpha_composite(layer, (round(m(c[0]) - layer.width / 2), round(m(c[1]) - layer.height / 2)))
    return img


def picto_bend_right(d, side, hgt):
    cx, cy = side / 2, hgt * 0.64
    s = side * 0.2
    w = m(side * 0.055)
    # a road bending right ahead: up, then curving away to the right, with an arrowhead
    pts = []
    for i in range(0, 41):
        t = i / 40
        y = cy + s * 1.1 - t * s * 1.9
        x = cx - s * 0.35 + (max(0, t - 0.45) ** 2) * s * 3.2
        pts.append((m(x), m(y)))
    d.line(pts, fill=INK, width=w, joint="curve")
    tx, ty = pts[-1]
    ax, ay = pts[-4]
    ang = math.degrees(math.atan2(tx - ax, -(ty - ay)))
    arrow(d, tx / PX, ty / PX, side * 0.12, ang, INK, stem=0.0, head=1.0)


def picto_ford(d, side, hgt):
    cx, cy = side / 2, hgt * 0.66
    w = m(side * 0.03)
    for row in range(3):
        y0 = cy - side * 0.02 + row * side * 0.075
        pts = [(m(cx - side * 0.2 + t * side * 0.4 / 40), m(y0 + math.sin(t / 40 * math.pi * 4) * side * 0.018))
               for t in range(41)]
        d.line(pts, fill=INK, width=w, joint="curve")


def picto_cattle(d, side, hgt):
    """A cow in side view, simple and chunky: body, head, legs, horns, tail."""
    cx, cy = side / 2, hgt * 0.66
    s = side
    body = (cx - s * 0.15, cy - s * 0.07, cx + s * 0.11, cy + s * 0.05)
    d.rounded_rectangle(tuple(m(v) for v in body), radius=m(s * 0.035), fill=INK)
    d.rounded_rectangle((m(cx + s * 0.09), m(cy - s * 0.10), m(cx + s * 0.19), m(cy - s * 0.02)), radius=m(s * 0.02), fill=INK)
    d.line([(m(cx + s * 0.11), m(cy - s * 0.10)), (m(cx + s * 0.10), m(cy - s * 0.135))], fill=INK, width=m(s * 0.018))
    d.line([(m(cx + s * 0.16), m(cy - s * 0.10)), (m(cx + s * 0.17), m(cy - s * 0.135))], fill=INK, width=m(s * 0.018))
    for lx in (-0.13, -0.08, 0.04, 0.09):
        d.rectangle((m(cx + s * lx - s * 0.013), m(cy + s * 0.03), m(cx + s * lx + s * 0.013), m(cy + s * 0.12)), fill=INK)
    d.line([(m(cx - s * 0.15), m(cy - s * 0.05)), (m(cx - s * 0.19), m(cy + s * 0.04))], fill=INK, width=m(s * 0.014))


def plate(text, w=1.0, h=0.3):
    """The supplementary plate under a warning sign: white, black edge, black words."""
    img, d = canvas(w, h)
    rounded_board(d, w, h, WHITE, INK, 0.02, 0.03, 0.05)
    text_at(d, (w / 2, h / 2), text, font("lato", 0.13), INK, anchor="mm")
    return img


def street_name(name, sub="Braynard Town", w=1.5, h=0.5):
    """A town street nameplate: cream, red edge, black name, the town's name small beneath."""
    img, d = canvas(w, h)
    rounded_board(d, w, h, CREAM, SIGNAL_RED, 0.025, 0.035, 0.06)
    # Two lines set on their baselines as one block, centred in the red edge with equal space
    # above the name's capitals and below the town's.
    cap, sub_cap, gap = 0.13, 0.06, 0.055
    inner_top, inner_bottom = 0.06, h - 0.06
    margin = (inner_bottom - inner_top - (cap + gap + sub_cap)) / 2
    base1 = inner_top + margin + cap
    base2 = base1 + gap + sub_cap
    text_at(d, (w / 2, base1), name, font("lato", cap), INK, anchor="ms")
    text_at(d, (w / 2, base2), sub, font("lato", sub_cap), SIGNAL_RED, anchor="ms")
    return img


def course_board(name, h=1.0):
    """A course sign: hay-yellow board, white edge, the course's name in red Lilita One, an arrow."""
    f = font("lilita", 0.36)
    w = 0.25 + width_m(name, f) + 0.25 + 0.55 + 0.2
    img, d = canvas(w, h)
    rounded_board(d, w, h, HAY, WHITE, 0.05, 0.06, 0.18)
    text_at(d, (0.25, h / 2 + 0.02), name, f, EVENT_RED, anchor="lm")
    arrow(d, w - 0.42, h / 2, 0.52, 90, EVENT_RED)
    return img


def scenic_board(name, h=0.9):
    """A scenic drive's start sign: brown, cream lettering, a viewpoint mark."""
    f = font("lato", 0.26)
    w = 0.85 + width_m(name, f) + 0.3
    img, d = canvas(w, h)
    rounded_board(d, w, h, SCENIC_BROWN, CREAM, 0.04, 0.05, 0.12)
    # viewpoint mark: a little hill under a sun, cream
    d.ellipse((m(0.32), m(0.22), m(0.52), m(0.42)), outline=CREAM, width=m(0.035))
    d.polygon([(m(0.18), m(0.7)), (m(0.42), m(0.42)), (m(0.68), m(0.7))], fill=CREAM)
    text_at(d, (0.85, h / 2), name, f, CREAM, anchor="lm")
    return img


def octagon_pts(w):
    """A regular octagon w across its flats, flats top and bottom, in metres from its top-left."""
    k = w / (2 + math.sqrt(2))                # the corner cut
    return [(k, 0), (w - k, 0), (w, k), (w, w - k), (w - k, w), (k, w), (0, w - k), (0, k)]


def inset(pts, d):
    """A convex outline pulled in by d metres (each corner moved toward the centre)."""
    cx = sum(x for x, _ in pts) / len(pts)
    cy = sum(y for _, y in pts) / len(pts)
    out = []
    for x, y in pts:
        r = math.hypot(x - cx, y - cy)
        out.append((cx + (x - cx) * (r - d) / r, cy + (y - cy) * (r - d) / r))
    return out


def stop_sign(w=0.75):
    """Stop: a red octagon with a thin white edge and STOP in white capitals."""
    img, d = canvas(w, w)
    pts = octagon_pts(w)
    d.polygon([(m(x), m(y)) for x, y in pts], fill=WHITE)
    d.polygon([(m(x), m(y)) for x, y in inset(pts, w * 0.035)], fill=SIGNAL_RED)
    f = font("lato", w * 0.24)
    # STOP fits the octagon's middle band with a margin either side.
    while width_m("STOP", f) > w * 0.78:
        f = font("lato", f.size / PX * CAP["lato"] * 0.97)
    text_at(d, (w / 2, w / 2), "STOP", f, WHITE, anchor="mm")
    return img


def give_way_sign(side=0.9):
    """Give way: a white triangle pointing down, with a broad red edge. No words: the shape says it."""
    hgt = side * math.sqrt(3) / 2
    img, d = canvas(side, hgt)
    tri = [(0, 0), (side, 0), (side / 2, hgt)]
    d.polygon([(m(x), m(y)) for x, y in tri], fill=SIGNAL_RED)
    c = (side / 2, hgt / 3)
    k = 0.62
    d.polygon([(m(c[0] + (x - c[0]) * k), m(c[1] + (y - c[1]) * k)) for x, y in tri], fill=WHITE)
    return img


def yield_sign(side=0.9):
    """US Yield: a triangle pointing down, a broad red border, a white centre with YIELD in red."""
    hgt = side * math.sqrt(3) / 2
    img, d = canvas(side, hgt)
    tri = [(0, 0), (side, 0), (side / 2, hgt)]
    d.polygon([(m(x), m(y)) for x, y in tri], fill=US_RED)
    c = (side / 2, hgt / 3)
    k = 0.56
    d.polygon([(m(c[0] + (x - c[0]) * k), m(c[1] + (y - c[1]) * k)) for x, y in tri], fill=WHITE)
    f = font("lato", side * 0.075)
    while width_m("YIELD", f) > side * 0.34:
        f = font("lato", f.size / PX * CAP["lato"] * 0.95)
    text_at(d, (side / 2, hgt * 0.33), "YIELD", f, US_RED, anchor="mm")
    return img


def warning_diamond(picto, width=1.2):
    """A US warning sign: a yellow diamond (a square on its point) with a thin black edge and a black
    pictogram, fitted inside the yellow field."""
    w = width
    img, d = canvas(w, w)
    dia = [(w / 2, 0), (w, w / 2), (w / 2, w), (0, w / 2)]
    d.polygon([(m(x), m(y)) for x, y in dia], fill=INK)
    d.polygon([(m(x), m(y)) for x, y in inset(dia, w * 0.025)], fill=US_YELLOW)
    d.line([(m(x), m(y)) for x, y in inset(dia, w * 0.045) + inset(dia, w * 0.045)[:1]], fill=INK, width=m(w * 0.012))
    layer, ld = canvas(w, w)
    picto(ld, w, w)
    box = layer.getbbox()
    if box:
        layer = layer.crop(box)
        fit = w * 0.46                           # the picture's diagonal fits the diamond's middle
        diag = math.hypot(layer.width, layer.height) / PX
        sc = fit / diag
        layer = layer.resize((max(1, round(layer.width * sc)), max(1, round(layer.height * sc))), Image.LANCZOS)
        img.alpha_composite(layer, (round(m(w / 2) - layer.width / 2), round(m(w / 2) - layer.height / 2)))
    return img


def picto_junction(d, side, hgt):
    """A crossroads ahead: a broad plus."""
    cx, cy, s = side / 2, hgt / 2, side * 0.3
    t = side * 0.07
    d.rectangle((m(cx - t), m(cy - s), m(cx + t), m(cy + s)), fill=INK)
    d.rectangle((m(cx - s * 0.8), m(cy - t), m(cx + s * 0.8), m(cy + t)), fill=INK)


def picto_signal(d, side, hgt):
    """A traffic signal ahead: a black head with red, yellow and green lamps."""
    cx, cy = side / 2, hgt / 2
    w, h = side * 0.16, side * 0.42
    d.rounded_rectangle((m(cx - w / 2), m(cy - h / 2), m(cx + w / 2), m(cy + h / 2)), radius=m(side * 0.03), fill=INK)
    for k, col in enumerate([US_RED, US_YELLOW, (0, 150, 70)]):
        y = cy - h / 2 + h * (k + 0.5) / 3
        r = w * 0.32
        d.ellipse((m(cx - r), m(y - r), m(cx + r), m(y + r)), fill=col)


def picto_stop_ahead(d, side, hgt):
    """Stop ahead: a red octagon above an arrow pointing up."""
    cx, cy = side / 2, hgt / 2
    o = side * 0.22
    pts = [(cx - o / 2 + x, cy - side * 0.2 + y) for x, y in octagon_pts(o)]
    d.polygon([(m(x), m(y)) for x, y in pts], fill=US_RED)
    arrow(d, cx, cy + side * 0.15, side * 0.24, 0, INK)


def picto_yield_ahead(d, side, hgt):
    """Yield ahead: a red-edged triangle pointing down above an arrow pointing up."""
    cx, cy = side / 2, hgt / 2
    w = side * 0.26
    h = w * math.sqrt(3) / 2
    top = cy - side * 0.2
    tri = [(cx - w / 2, top), (cx + w / 2, top), (cx, top + h)]
    d.polygon([(m(x), m(y)) for x, y in tri], fill=US_RED)
    c = (cx, top + h / 3)
    d.polygon([(m(c[0] + (x - c[0]) * 0.5), m(c[1] + (y - c[1]) * 0.5)) for x, y in tri], fill=WHITE)
    arrow(d, cx, cy + side * 0.15, side * 0.24, 0, INK)


GUIDE_ARROWS = {"left": -90, "ahead": 0, "right": 90}


def guide_sign(lines, cap=0.2):
    """A US guide sign at a junction: green, a white edge, one line per destination, each with its
    arrow (left, ahead or right), its name and its distance, in white."""
    f = font("lato", cap)
    gap = cap * 1.0
    a = cap * 1.4                                # the arrow's length
    name_w = max(width_m(p, f) for p, _, _ in lines)
    dist_w = max([width_m(dd, f) for _, dd, _ in lines] + [0])
    w = 0.12 + a + gap + name_w + gap * 1.4 + dist_w + 0.18
    row = cap * 2.0
    h = 0.12 + row * len(lines) + 0.1
    img, d = canvas(w, h)
    rounded_board(d, w, h, US_GREEN, WHITE, cap * 0.18, cap * 0.22, cap * 0.5)
    for i, (place, dist, way) in enumerate(lines):
        cy = 0.12 + row * (i + 0.5) + 0.02
        arrow(d, 0.12 + a / 2 + 0.04, cy, a * 0.8, GUIDE_ARROWS.get(way, 0), WHITE)
        text_at(d, (0.12 + a + gap, cy), place, f, WHITE, anchor="lm")
        if dist:
            text_at(d, (w - 0.18, cy), dist, f, WHITE, anchor="rm")
    return img


# ---- faces by key: the road_sign builder names each face it wants by a key ------------------------
# US (2026-11-22): "yield", "diamond:<pictogram>", "guide:<place>|<distance>|<left|ahead|right>;…".
# "stop", "give way", "plate:<words>", "warn:<pictogram>", "finger:<place>|<distance>|left|right",
# "street:<name>", "course:<name>", "scenic:<name>". Its table of baked faces (road_sign.ts, FACES)
# holds each key's material and size, which `--table` prints.
def picto_bend_left(d, side, hgt):
    """The right-hand bend, mirrored."""
    layer, ld = canvas(side, hgt)
    picto_bend_right(ld, side, hgt)
    d._image.alpha_composite(layer.transpose(Image.FLIP_LEFT_RIGHT))


PICTOS = {"bend right": picto_bend_right, "bend left": picto_bend_left, "ford": picto_ford, "cattle": picto_cattle,
          "junction ahead": picto_junction, "signal ahead": picto_signal, "stop ahead": picto_stop_ahead,
          "yield ahead": picto_yield_ahead}


def face_for_key(key):
    kind, _, rest = key.partition(":")
    if kind == "stop":
        return stop_sign()
    if kind == "give way":
        return give_way_sign()
    if kind == "yield":
        return yield_sign()
    if kind == "diamond":
        return warning_diamond(PICTOS[rest])
    if kind == "guide":
        # guide:<place>|<distance>|<left|ahead|right>;<place>|…
        return guide_sign([tuple((part.split("|") + ["", ""])[:3]) for part in rest.split(";") if part])
    if kind == "plate":
        f = font("lato", 0.13)
        return plate(rest, w=max(1.0, round(width_m(rest, f) + 0.3, 2)))
    if kind == "warn":
        return warning_triangle(PICTOS[rest])
    if kind == "finger":
        place, dist, side = rest.split("|")
        return finger_arm(place, dist, left=(side == "left"))
    if kind == "street":
        return street_name(rest)
    if kind == "course":
        return course_board(rest)
    if kind == "scenic":
        return scenic_board(rest)
    raise KeyError(key)


FACES = {
    "ring-exit-7-advance": ring_exit_advance,
    "ring-exit-7-gore": ring_gore,
    "finger-braynard-town": lambda: finger_arm("Braynard Town", "1½", left=True),
    "finger-home-farm": lambda: finger_arm("Home Farm", "¾"),
    "finger-orchard-hills": lambda: finger_arm("Orchard Hills", "2¼"),
    "warn-bend-right": lambda: warning_triangle(picto_bend_right),
    "warn-ford": lambda: warning_triangle(picto_ford),
    "warn-cattle": lambda: warning_triangle(picto_cattle),
    "plate-ford": lambda: plate("Ford"),
    "street-market-square": lambda: street_name("Market Square"),
    "course-barnyard-loop": lambda: course_board("Barnyard Loop"),
    "scenic-orchard-way": lambda: scenic_board("The Orchard Way"),
    "stop": stop_sign,
    "give-way": give_way_sign,
    "plate-stop-100": lambda: face_for_key("plate:Stop 100 m"),
    "plate-give-way-50": lambda: face_for_key("plate:Give way 50 m"),
}


def slug(key):
    return "".join(c if c.isalnum() else "-" for c in key.lower()).strip("-")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    if sys.argv[1] == "--keys":
        # python3 tools/sign_faces.py --keys OUT_DIR KEY ...: paint faces by road_sign key, and print
        # each one's file and size in metres (the size goes in road_sign.ts's FACES table).
        out = sys.argv[2]
        os.makedirs(out, exist_ok=True)
        for k in sys.argv[3:]:
            img = face_for_key(k)
            p = os.path.join(out, f"sign-{slug(k)}.png")
            img.save(p)
            print(f"{k}\t{p}\t{img.width / PX:.4f}\t{img.height / PX:.4f}")
        return
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    names = sys.argv[2:] or list(FACES)
    for n in names:
        img = FACES[n]()
        p = os.path.join(out, f"sign-{n}.png")
        img.save(p)
        print(p, img.size)


if __name__ == "__main__":
    main()
