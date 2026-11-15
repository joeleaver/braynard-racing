// The county map: each player's map and waypoint (components/map_view.ts), and the route to it along
// the real roads. Design: Pimble, Braynard Racing/Design → "The map".
//
// The roads are read from the world itself: every Sweep road (an object with a curve and a world
// shape) becomes part of a road graph, sampled every 10 m, its ends joined to whatever road they
// meet. The graph is rebuilt only when the roads change, and every machine builds the same one.
// A route is the quickest way along it (the County Ring counts at freeway speed, the lanes at lane
// speed), laid out as breadcrumbs for the map.
//
// Runs in `act`, after the dev menu has said whose kart waits (dev_seats) and before the karts drive
// (dev_hold): a player with the map open waits too.
import { dev } from "./state";
import { SHEET, SNAP, ZOOM_MIN, ZOOM_MAX, ARRIVE, CRUMB, CRUMBS, REVEAL, KART, packCrumbs } from "../data/map";

const V = pw.component("map_view");
const f = Object.fromEntries(["open", "zoom", "cx", "cz", "held", "wpOn", "wpX", "wpZ", "heading", "dist", "bearing"].map((n) => [n, V.property(n)]));
const t = Object.fromEntries(["wpName", "route"].map((n) => [n, V.text(n)]));
const player = pw.field("controls", "player");
const position = pw.vec3("transform", "position");
const rotation = pw.quat("transform", "rotation");
// The map's controls live in the drive set, since a kart's Controls card reads one set: `map` opens and
// closes it, and while it's open the stick moves the cursor, rise and sink (E and Q, the bumpers) zoom,
// drift (Space, B) sets the waypoint and respawn (R, Back) clears it.
const a = { open: pw.action("drive", "map"), pan: pw.action("drive", "stick"), zoomIn: pw.action("drive", "rise"), zoomOut: pw.action("drive", "sink"), mark: pw.action("drive", "drift"), clear: pw.action("drive", "respawn") };
const BIT = { open: 1, zoomIn: 2, zoomOut: 4, mark: 8, clear: 16 };

/** Clockwise from north (−Z), in degrees, for a direction [x, z]. */
const compass = (x, z) => (Math.atan2(x, -z) * 180) / Math.PI;
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

// ---- The road graph ---------------------------------------------------------------------------

const FREEWAY = 33; // m/s on the County Ring (slipstream and near misses)
const LANE = 16; // m/s on the lanes
/** The graph as last built: nodes [x, y, z], each node's neighbours [node, seconds]. */
const roads = { key: "", nodes: [], next: [] };

function widthOf(o) {
  // A road's width from its Sweep outline (the widest point across), or a lane's if it can't be read.
  try {
    const outline = o.get(pw.field("world_shape", "outline"));
    if (Array.isArray(outline) && outline.length > 0) {
      const xs = outline.map((p) => p[0]);
      return Math.max(...xs) - Math.min(...xs);
    }
  } catch (e) {}
  return 8;
}

function build(objects) {
  const nodes = [];
  const next = [];
  const ends = []; // [node, road, width]
  const roadOf = [];
  objects.forEach((o, r) => {
    const curve = o.curve;
    const width = widthOf(o);
    const speed = width > 20 ? FREEWAY : LANE;
    const n = Math.max(2, Math.ceil(curve.length / 10));
    let last = -1;
    for (let i = 0; i <= n; i++) {
      const id = nodes.length;
      nodes.push(curve.at(i / n));
      next.push([]);
      roadOf.push(r);
      if (last >= 0) {
        const s = Math.hypot(nodes[id][0] - nodes[last][0], nodes[id][2] - nodes[last][2]) / speed;
        next[id].push([last, s]);
        next[last].push([id, s]);
      }
      last = id;
      if (i === 0 || i === n) ends.push([id, r, width]);
    }
  });
  // Join each road's ends to the nearest point of any other road it meets: a junction, or a slip
  // road merging into the Ring. Heights must agree, so a bridge never joins the road under it.
  for (const [e, r, w] of ends) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < nodes.length; j++) {
      if (roadOf[j] === r || Math.abs(nodes[j][1] - nodes[e][1]) > 2.5) continue;
      const d = Math.hypot(nodes[j][0] - nodes[e][0], nodes[j][2] - nodes[e][2]);
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best >= 0 && bestD < w / 2 + 17) {
      next[e].push([best, bestD / LANE]);
      next[best].push([e, bestD / LANE]);
    }
  }
  return { nodes, next };
}

pw.registerSystem("map roads", { includeComponents: ["curve", "world_shape"] }, ({ objects }) => {
  const list = [...objects];
  const key = list.map((o) => o.curve.length.toFixed(1)).join(",");
  if (key === roads.key) return;
  const g = build(list);
  roads.key = key;
  roads.nodes = g.nodes;
  roads.next = g.next;
});

function nearest(x, y, z) {
  let best = -1;
  let bestD = Infinity;
  roads.nodes.forEach((p, i) => {
    const d = Math.hypot(p[0] - x, p[2] - z) + Math.max(0, Math.abs(p[1] - y) - 3) * 4;
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

/** The quickest way from node `from` to node `to`, as a list of nodes, or null. */
function quickest(from, to) {
  const n = roads.nodes.length;
  const time = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  time[from] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && time[i] < Infinity && (u < 0 || time[i] < time[u])) u = i;
    if (u < 0) return null;
    if (u === to) break;
    done[u] = 1;
    for (const [v, s] of roads.next[u]) if (time[u] + s < time[v]) { time[v] = time[u] + s; prev[v] = u; }
  }
  const path = [];
  for (let u = to; u >= 0; u = prev[u]) path.push(u);
  return path.reverse();
}

/** Breadcrumbs along points [x, z], evenly spaced (at least CRUMB apart, at most CRUMBS of them), and the length. */
function crumbs(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  const gap = Math.max(CRUMB, length / CRUMBS);
  const out = [];
  let carry = 0;
  for (let i = 1; i < points.length && out.length < CRUMBS; i++) {
    const [x0, z0] = points[i - 1];
    const [x1, z1] = points[i];
    const seg = Math.hypot(x1 - x0, z1 - z0);
    let d = gap - carry;
    while (d <= seg && out.length < CRUMBS) {
      out.push([x0 + ((x1 - x0) * d) / seg, z0 + ((z1 - z0) * d) / seg]);
      d += gap;
    }
    carry = (carry + seg) % gap;
  }
  return { out, length };
}

/** Each seat's last route, so it's worked out again only when its ends move. Rebuilt if missing. */
const routes = new Map();

// ---- Pins: what the map shows, and who has found what ----------------------------------------

const pinKind = pw.field("map_pin", "kind");
const pinLabel = pw.text("map_pin", "label");
const pinAlways = pw.field("map_pin", "always");
const pinFound = pw.field("map_pin", "found");
/** This tick's pins: { name, kind, x, z, found }. Rebuilt every tick from the pins in the world. */
let pins = [];

pw.registerSystem("map pins", { includeComponents: ["map_pin"] }, ({ objects }) => {
  const list = [...objects];
  const karts = list.filter((o) => o.get(pinKind) === KART && o.get(player) > 0).map((o) => [o.get(player), o.get(position)]);
  pins = [];
  for (const o of list) {
    const kind = o.get(pinKind);
    if (kind === KART) continue;
    const [x, , z] = o.get(position);
    let found = o.get(pinFound);
    for (const [seat, at] of karts) {
      const bit = 1 << (seat - 1);
      if ((found & bit) === 0 && Math.hypot(at[0] - x, at[2] - z) < REVEAL) found |= bit;
    }
    if (o.get(pinAlways) === 1) found = 255;
    if (found !== o.get(pinFound)) o.set(pinFound, found);
    pins.push({ name: o.get(pinLabel), kind, x, z, found });
  }
});
const seen = (p, seat) => ((p.found >> (seat - 1)) & 1) === 1;

// ---- Each player's map ------------------------------------------------------------------------

pw.registerSystem("map", { includeComponents: ["map_view", "map_pin", "controls"], events: ["map"] }, ({ objects, events }) => {
  const players = [...objects].filter((o) => o.get(player) !== 0).map((o) => {
    const at = o.get(position);
    const nose = pw.rotateVector([0, 0, -1], o.get(rotation));
    return [o.get(player), at, compass(nose[0], nose[2])];
  });

  for (const me of objects) {
    const seat = me.get(player);
    if (seat === 0) continue;
    const [, at, heading] = players.find((p) => p[0] === seat);
    const mark = (x, z, name) => { me.set(f.wpOn, 1); me.set(f.wpX, x); me.set(f.wpZ, z); me.set(t.wpName, name); };
    const clear = () => { me.set(f.wpOn, 0); me.set(t.wpName, ""); me.set(t.route, ""); routes.delete(seat); };
    const show = (on) => {
      me.set(f.open, on ? 1 : 0);
      if (on) { me.set(f.cx, at[0]); me.set(f.cz, at[2]); } // opens on you
    };

    // Buttons on the map screen, and agents in Play.
    for (const e of events) {
      if (e.seat !== seat || e.name !== "map") continue;
      if (e.what === "open") show(true);
      else if (e.what === "close") show(false);
      else if (e.what === "zoom") me.set(f.zoom, Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, e.n)));
      else if (e.what === "clear") clear();
      else if (e.what === "mark") {
        const p = pins.find((q) => q.name === e.place && seen(q, seat));
        if (p !== undefined) mark(p.x, p.z, p.name);
        else if (e.place === "") mark(e.x, e.z, "");
      }
    }

    // The map's own controls: a press acts once.
    const held = me.get(f.held);
    const now = (me.get(a.open) ? BIT.open : 0) | (me.get(a.zoomIn) ? BIT.zoomIn : 0) | (me.get(a.zoomOut) ? BIT.zoomOut : 0) | (me.get(a.mark) ? BIT.mark : 0) | (me.get(a.clear) ? BIT.clear : 0);
    const pressed = (b) => (now & b) !== 0 && (held & b) === 0;
    me.set(f.held, now);
    if (pressed(BIT.open)) show(me.get(f.open) !== 1);

    if (me.get(f.open) === 1) {
      dev.holding.add(seat);
      const zoom = me.get(f.zoom);
      if (pressed(BIT.zoomIn)) me.set(f.zoom, Math.min(ZOOM_MAX, zoom * 2));
      if (pressed(BIT.zoomOut)) me.set(f.zoom, Math.max(ZOOM_MIN, zoom / 2));
      // The cursor crosses the frame in about two seconds at any zoom.
      const [px, py] = me.get(a.pan) ?? [0, 0];
      const step = (SHEET.size / me.get(f.zoom)) * 0.5 * objects.dt;
      me.set(f.cx, me.get(f.cx) + px * step);
      me.set(f.cz, me.get(f.cz) - py * step);
      // The cursor stays on the sheet. (The screen keeps the sheet filling the frame, so near an edge
      // the sheet stops and the cursor walks on towards the edge.)
      me.set(f.cx, Math.min(SHEET.x0 + SHEET.size, Math.max(SHEET.x0, me.get(f.cx))));
      me.set(f.cz, Math.min(SHEET.z0 + SHEET.size, Math.max(SHEET.z0, me.get(f.cz))));
      if (pressed(BIT.mark)) {
        const cx = me.get(f.cx);
        const cz = me.get(f.cz);
        let snap = null;
        let snapD = SNAP / me.get(f.zoom);
        for (const p of pins) {
          const d = Math.hypot(p.x - cx, p.z - cz);
          if (seen(p, seat) && d < snapD) { snapD = d; snap = p; }
        }
        if (snap !== null) mark(snap.x, snap.z, snap.name);
        else mark(cx, cz, "");
      }
      if (pressed(BIT.clear)) clear();
    }

    // The waypoint: where it lies, the route to it, and arriving.
    me.set(f.heading, heading);
    if (me.get(f.wpOn) === 1) {
      const wx = me.get(f.wpX);
      const wz = me.get(f.wpZ);
      const straight = Math.hypot(wx - at[0], wz - at[2]);
      me.set(f.bearing, wrap(compass(wx - at[0], wz - at[2]) - heading));
      if (straight < ARRIVE) clear();
      else if (roads.nodes.length > 0) {
        const from = nearest(at[0], at[1], at[2]);
        const to = nearest(wx, at[1], wz);
        const old = routes.get(seat);
        if (old === undefined || old.from !== from || old.to !== to || old.key !== roads.key) {
          const path = quickest(from, to);
          const points = path === null ? [] : [[at[0], at[2]], ...path.map((i) => [roads.nodes[i][0], roads.nodes[i][2]]), [wx, wz]];
          const c = crumbs(points);
          routes.set(seat, { from, to, key: roads.key, length: c.length });
          me.set(t.route, packCrumbs(c.out));
          me.set(f.dist, path === null ? straight : c.length);
        }
      } else me.set(f.dist, straight);
    }
  }
});
