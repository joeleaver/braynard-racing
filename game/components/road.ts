// Roads (Design, "Roads: how Braynard builds them on Playweft"). A road is one object: a Curve along
// its middle at the deck's own heights, and a `road` card naming its profile. Its builder cuts the
// curve into spans of about `span` metres that share their end points and tangents, each a whole
// number of the profile's dash period long, so the markings run on unbroken across every joint. Each
// span is one Sweep whose outline is the whole cross-section (deck, kerbs, verges and the slopes down
// to the ground) as bands, each band's material set through `faces`, so grip follows the surface.
// The deck's markings are drawn by its material (materials/road_deck.material.wgsl), not placed.
//
// Every span also carries a `road_segment` card: which road it belongs to, where along it it starts,
// how long it is and its neighbours. Its own Curve is the span's geometry. Built children ship in
// Play, so game code finds the road graph by looking for `road_segment` and `road_node` cards.
//
// Junctions (Design, "Junctions, ramps and roundabouts"): a road stops at a junction's mouth, and the
// junction builds everything inside. A road names its junctions (junction_1…) and leaves a gap where
// it passes within the junction's `mouth` of its centre. The junction names its roads (arm_1…), finds
// every place one crosses the mouth circle (an arm), sorts the arms round its centre, and builds one
// tarmac pad out to every mouth with a rounded corner between each two neighbours, a verge ring a
// step lower round it, and a `road_node` for the road graph. Any number of arms at any angles.

// ---- Profiles, as data -------------------------------------------------------------------------
// deck: half its width; kerb: a flush strip beyond the deck, 0 for none; verge: flat grass beyond
// that; depth and slope: the bank from the verge down into the ground (metres down, and across per
// metre down). repeat: the deck material's dash period (metres): every span is a whole number of
// them. span: how long a span is aimed at. material: the deck's material.
const GRASS = "01M7401DG253AMVJXK6H82N33K";
const KERB = "01M7TXFYTVTZPQ53CG8VXAMNFN";
const PARAPET = "01M7TXFYWMQTG4T8QK8K89JRY2";
const PLAIN = "01M7TXHM4N940498SBC5G8HKVR";

const PROFILES = {
  "two-lane": { deck: 4.0, kerb: 0, verge: 1.0, depth: 3, slope: 1.0, repeat: 12, span: 240, material: "01M7TXFYJPTJAS48M04QG70FKG" },
  "back lane": { deck: 3.5, kerb: 0, verge: 1.0, depth: 3, slope: 1.0, repeat: 12, span: 240, material: "01M7TXFYMXDGKDQYM3SWJXG6WZ" },
  "slip road": { deck: 3.0, kerb: 0, verge: 1.0, depth: 3, slope: 1.0, repeat: 12, span: 240, material: "01M7TXFYQ0S2THNY9H6XM2ECWK" },
  "freeway": { deck: 15.0, kerb: 0.5, verge: 1.5, depth: 3, slope: 1.0, repeat: 9, span: 252, material: "01M7TXFYRYTSYEGTM31KAXFADF" },
};
const PROFILE_NAMES = ["two-lane", "back lane", "slip road", "freeway"];
// A bridge's deck carries the same markings between parapets this wide and high, over a slab this deep.
const BRIDGE = { parapet: 0.5, height: 1.0, under: 1.4 };
// The deck stands this far above its curve.
const DECK_Y = 0.06;
// And the verges this far below the deck.
const VERGE_STEP = 0.06;
// How far a junction's corner fillets reach into the decks they sit between.
const OVERLAP = 0.5;
// The engine's world shape field that puts a shape among another object's shapes (Playweft PR).
const JOINS = "joins";

function profileName(value) {
  const name = typeof value === "number" ? PROFILE_NAMES[value] : value;
  return PROFILES[name] ? name : "two-lane";
}
const profileOf = (value) => PROFILES[profileName(value)];
const JUNCTION_FIELDS = ["junction_1", "junction_2", "junction_3", "junction_4"];
// How far from a junction's centre the roads stop.
const mouthOf = (junction) => (junction && junction.mouth > 0 ? junction.mouth : 12);

// ---- The curve, measured as the engine measures it (32 straight steps per Bezier span) ----------
const STEPS = 32;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scaled = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const r3 = (a) => [Math.round(a[0] * 1000) / 1000, Math.round(a[1] * 1000) / 1000, Math.round(a[2] * 1000) / 1000];

function bezier(c, u) {
  const v = 1 - u;
  return add(add(scaled(c[0], v * v * v), scaled(c[1], 3 * v * v * u)), add(scaled(c[2], 3 * v * u * u), scaled(c[3], u * u * u)));
}

function measure(curve) {
  const pts = curve.points;
  const n = pts.length;
  const joins = n < 2 ? 0 : curve.closed ? n : n - 1;
  const spans = [], lengths = [];
  let total = 0;
  for (let i = 0; i < joins; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const c = [a.position, add(a.position, a.handle_out || [0, 0, 0]), add(b.position, b.handle_in || [0, 0, 0]), b.position];
    spans.push(c);
    let from = c[0];
    for (let s = 1; s <= STEPS; s++) {
      const to = bezier(c, s / STEPS);
      total += len(sub(to, from));
      lengths.push(total);
      from = to;
    }
  }
  return { spans, lengths, total };
}

// Which Bezier span `d` metres along lands in, and how far along it (0 to 1).
function locate(m, d) {
  const n = m.lengths.length;
  if (d <= 0) return [0, 0];
  if (d >= m.total) return [m.spans.length - 1, 1];
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (m.lengths[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  const step = Math.min(lo, n - 1);
  const start = step === 0 ? 0 : m.lengths[step - 1];
  const long = m.lengths[step] - start;
  const within = long > 0 ? (d - start) / long : 0;
  return [Math.floor(step / STEPS), (step % STEPS) / STEPS + within / STEPS];
}

// A Bezier span cut at `u`: the part before and the part after (de Casteljau, so the joint keeps one
// tangent on both sides).
function split(c, u) {
  const a = lerp(c[0], c[1], u), b = lerp(c[1], c[2], u), e = lerp(c[2], c[3], u);
  const ab = lerp(a, b, u), be = lerp(b, e, u);
  const p = lerp(ab, be, u);
  return [[c[0], a, ab, p], [p, be, e, c[3]]];
}

// The curve from `d0` to `d1` metres along, as a curve's points.
function piece(m, d0, d1) {
  let [i0, u0] = locate(m, d0);
  let [i1, u1] = locate(m, d1);
  if (u0 >= 1 && i0 < i1) { i0++; u0 = 0; }
  if (u1 <= 0 && i1 > i0) { i1--; u1 = 1; }
  const parts = [];
  if (i0 === i1) {
    const after = split(m.spans[i0], u0)[1];
    parts.push(split(after, u0 < 1 ? (u1 - u0) / (1 - u0) : 1)[0]);
  } else {
    parts.push(split(m.spans[i0], u0)[1]);
    for (let i = i0 + 1; i < i1; i++) parts.push(m.spans[i]);
    parts.push(split(m.spans[i1], u1)[0]);
  }
  const points = [];
  for (let k = 0; k <= parts.length; k++) {
    const before = parts[k - 1], next = parts[k];
    const at = next ? next[0] : before[3];
    const hin = before ? sub(before[2], before[3]) : scaled(sub(next[1], next[0]), -1);
    const hout = next ? sub(next[1], next[0]) : scaled(hin, -1);
    points.push({ position: r3(at), handle_in: r3(hin), handle_out: r3(hout) });
  }
  return points;
}

// Where the spans start and end, in metres along: about `aim` apart, every one a whole number of
// `repeat` from the start of its stretch. The bridge (rounded out to the repeat) is one span, and the
// gaps where the road passes through a junction are left empty, so a joint never lands in a junction.
// Answers the stretches as { d0, d1, kind }, kind "road", "bridge" or "gap".
function piecesOf(total, aim, repeat, bridge, gaps) {
  const step = Math.max(repeat, Math.round(aim / repeat) * repeat);
  const special = [];
  for (const g of gaps) special.push({ d0: Math.max(0, g[0]), d1: Math.min(total, g[1]), kind: "gap" });
  if (bridge) special.push({ d0: bridge[0], d1: bridge[1], kind: "bridge" });
  special.sort((a, b) => a.d0 - b.d0);
  // Gaps that touch or overlap become one; a bridge that meets a gap gives way to it.
  const merged = [];
  for (const s of special) {
    const prev = merged[merged.length - 1];
    if (prev && s.d0 <= prev.d1 + 0.01) {
      if (s.kind === "gap" || prev.kind === "gap") prev.kind = "gap";
      prev.d1 = Math.max(prev.d1, s.d1);
    } else merged.push({ d0: s.d0, d1: s.d1, kind: s.kind });
  }
  const pieces = [];
  const road = (a, b) => {
    if (b - a < 0.05) return;
    let d = a;
    while (b - d > step * 1.5) { pieces.push({ d0: d, d1: d + step, kind: "road" }); d += step; }
    pieces.push({ d0: d, d1: b, kind: "road" });
  };
  let at = 0;
  for (const s of merged) {
    road(at, s.d0);
    if (s.d1 - s.d0 >= 0.05) pieces.push(s);
    at = s.d1;
  }
  road(at, total);
  return pieces;
}

// Where a road passes within `mouth` metres (flat) of `centre`: the stretches, in metres along, as
// [enter, leave]. A road that starts or ends inside gives a stretch from 0 or to its length.
function within(path, centre, mouth) {
  const off = (d) => { const q = path.at(d).position; return Math.hypot(q[0] - centre[0], q[2] - centre[2]) - mouth; };
  const edge = (a, b) => {                       // off(a) and off(b) differ in sign
    let fa = off(a);
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2, fm = off(m);
      if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  };
  const step = 1;
  const out = [];
  let start = off(0) < 0 ? 0 : null;
  let prevD = 0, prevIn = off(0) < 0;
  for (let d = step; ; d += step) {
    const dd = Math.min(d, path.length);
    const isIn = off(dd) < 0;
    if (isIn !== prevIn) {
      const e = edge(prevD, dd);
      if (isIn) start = e; else { out.push([start, e]); start = null; }
    }
    prevD = dd; prevIn = isIn;
    if (dd >= path.length) break;
  }
  if (start !== null) out.push([start, path.length]);
  return out;
}

// The cross-section, round the outline as a Sweep takes it, and the material on each band.
function section(p, bridge) {
  const y = DECK_Y;
  if (bridge) {
    const w = p.deck + BRIDGE.parapet, h = BRIDGE.height, under = -BRIDGE.under;
    const outline = [[-w, under], [w, under], [w, h], [p.deck, h], [p.deck, y], [-p.deck, y], [-p.deck, h], [-w, h]];
    const faces = {};
    for (let k = 1; k <= outline.length; k++) if (k !== 5) faces["band " + k] = PARAPET;
    // A span's end faces have their own slots; left alone they take the deck's tarmac.
    faces["start"] = faces["end"] = PARAPET;
    return { outline, faces };
  }
  // The verge sits a step below the deck, so where another road crosses, its deck stays on top.
  const edge = p.deck + p.kerb, out = edge + p.verge, foot = out + p.depth * p.slope, vy = y - VERGE_STEP;
  const outline = [[-foot, -p.depth], [foot, -p.depth], [out, vy]];
  const roles = ["grass", "grass"];                       // the bottom, the right bank
  if (p.verge > 0) { outline.push([edge, vy]); roles.push("grass"); }
  outline.push([edge, y]); roles.push("kerb");            // the step up to the deck
  if (p.kerb > 0) { outline.push([p.deck, y]); roles.push("kerb"); }
  outline.push([-p.deck, y]); roles.push("deck");
  if (p.kerb > 0) { outline.push([-edge, y]); roles.push("kerb"); }
  outline.push([-edge, vy]); roles.push("kerb");
  if (p.verge > 0) { outline.push([-out, vy]); roles.push("grass"); }
  roles.push("grass");                                    // the left bank, back to the start
  const faces = {};
  roles.forEach((role, i) => {
    if (role === "grass") faces["band " + (i + 1)] = GRASS;
    else if (role === "kerb") faces["band " + (i + 1)] = KERB;
  });
  // The end faces, where a span stops against a bridge or the ground, are grass, not the deck's tarmac.
  faces["start"] = faces["end"] = GRASS;
  return { outline, faces };
}

pw.defineComponent("road", {
  profile: pw.oneOf("two-lane", "back lane", "slip road", "freeway", { doc: "The road's cross-section and markings." }),
  span: pw.float(0, { unit: "m", range: [0, 2000], doc: "How long each span is aimed at; 0 takes the profile's. A span is always a whole number of dash periods." }),
  blend: pw.float(1.5, { unit: "m", range: [0, 10], doc: "How far the road melts into the ground it joins. 1.5 rounds the verges into a soft bank; the joints between spans are clean since Playweft 42af726f. A road forking off another blends cleanly since Playweft 37df8065, and crossings blend cleanly with Rounded blends (Playweft d766ef66)." }),
  ground: pw.object({ doc: "The object whose world shapes the road is built among (the Height Map's group), so it blends into that ground." }),
  bridge_from: pw.float(0, { unit: "m", group: "Bridge", doc: "Where a bridge starts, in metres along the curve; 0 for no bridge." }),
  bridge_to: pw.float(0, { unit: "m", group: "Bridge", doc: "Where the bridge ends, in metres along the curve." }),
  interval: pw.float(2, { unit: "m", range: [0, 20], doc: "How far apart the Sweeps take their curve." }),
  junction_1: pw.object({ group: "Junctions", doc: "A junction the road meets: it stops at the junction's mouth, and the junction builds the rest." }),
  junction_2: pw.object({ group: "Junctions", doc: "Another junction it meets." }),
  junction_3: pw.object({ group: "Junctions", doc: "Another junction it meets." }),
  junction_4: pw.object({ group: "Junctions", doc: "Another junction it meets." }),
}, {
  build(road, object) {
    const curve = object.components.curve;
    if (!curve || !curve.points || curve.points.length < 2) return [];
    const p = profileOf(road.profile);
    const m = measure(curve);
    const rep = p.repeat;
    let bridge = null;
    if (road.bridge_to > road.bridge_from && road.bridge_to > 0) {
      bridge = [Math.max(0, Math.floor(road.bridge_from / rep) * rep), Math.min(m.total, Math.ceil(road.bridge_to / rep) * rep)];
    }
    // Where the road meets its junctions: it leaves a gap within each one's mouth.
    const path = pw.curve.path(curve);
    const gaps = [];
    for (const field of JUNCTION_FIELDS) {
      const j = object.refs && object.refs[field];
      if (!j || !j.components.junction) continue;
      const centre = [j.matrix[9], j.matrix[10], j.matrix[11]];
      for (const g of within(path, centre, mouthOf(j.components.junction))) gaps.push(g);
    }
    const pieces = piecesOf(m.total, road.span > 0 ? road.span : p.span, rep, bridge, gaps).filter((q) => q.kind !== "gap");
    const ground = object.refs && object.refs.ground ? object.refs.ground.id : null;
    const count = pieces.length;
    const name = (k) => "span " + (k + 1);
    const out = [];
    let last = null, lastEnd = -1;
    for (let k = 0; k < count; k++) {
      const { d0, d1, kind } = pieces[k];
      const isBridge = kind === "bridge";
      const points = piece(m, d0, d1);
      if (last && Math.abs(d0 - lastEnd) < 0.01) points[0].position = last;   // the joint is one point, exactly
      last = points[points.length - 1].position;
      lastEnd = d1;
      const joinsBefore = k > 0 && Math.abs(pieces[k - 1].d1 - d0) < 0.01;
      const joinsAfter = k + 1 < count && Math.abs(pieces[k + 1].d0 - d1) < 0.01;
      const { outline, faces } = section(p, isBridge);
      // Where the span stops at a junction's mouth its end is inside the pad: tarmac, so where the
      // blend rounds the deck into the pad no grass shows across the road.
      const atMouth = (d) => gaps.some((g) => Math.abs(g[0] - d) < 0.01 || Math.abs(g[1] - d) < 0.01);
      if (!isBridge && atMouth(d0)) delete faces["start"];
      if (!isBridge && atMouth(d1)) delete faces["end"];
      const shape = { shape: "Sweep", outline, follow: "Upright", rings: "Square", interval: road.interval, faces, blend: isBridge ? 0 : road.blend };
      if (ground && !isBridge) shape[JOINS] = ground;
      const a = points[0].position, b = points[points.length - 1].position;
      out.push({
        name: name(k),
        components: {
          world_shape: shape,
          curve: { closed: false, points },
          material: { asset: p.material },
          road_segment: {
            road: object.name, index: k + 1, kind: isBridge ? "bridge" : "road", profile: profileName(road.profile),
            start: Math.round(d0 * 1000) / 1000, length: Math.round((d1 - d0) * 1000) / 1000,
            previous: joinsBefore ? name(k - 1) : "", next: joinsAfter ? name(k + 1) : "",
            start_x: a[0], start_y: a[1], start_z: a[2], end_x: b[0], end_y: b[1], end_z: b[2],
          },
        },
      });
    }
    return out;
  },
});

// One span of a road, as game code reads the road graph. Its object's Curve is the span itself.
pw.defineComponent("road_segment", {
  road: pw.text("", { doc: "The road object it belongs to." }),
  index: pw.int(1, { doc: "Which span it is, from the curve's start." }),
  kind: pw.oneOf("road", "bridge", { doc: "What it is." }),
  profile: pw.text("two-lane", { doc: "The road's profile." }),
  start: pw.float(0, { unit: "m", doc: "How far along the road it starts." }),
  length: pw.float(0, { unit: "m", doc: "How long it is along the road." }),
  previous: pw.text("", { group: "Neighbours", doc: "The span before it on its road; empty at the road's start." }),
  next: pw.text("", { group: "Neighbours", doc: "The span after it; empty at the road's end." }),
  start_x: pw.float(0, { group: "Ends" }), start_y: pw.float(0, { group: "Ends" }), start_z: pw.float(0, { group: "Ends" }),
  end_x: pw.float(0, { group: "Ends" }), end_y: pw.float(0, { group: "Ends" }), end_z: pw.float(0, { group: "Ends" }),
});

// Where two roads cross, as game code reads the road graph: left by a junction, standing at the
// crossing.
pw.defineComponent("road_crossing", {
  a: pw.text("", { doc: "The first road." }),
  b: pw.text("", { doc: "The second road." }),
  at_a: pw.float(0, { unit: "m", doc: "How far along the first road they cross." }),
  at_b: pw.float(0, { unit: "m", doc: "How far along the second road they cross." }),
});

// ---- Junctions ----------------------------------------------------------------------------------
const flat = (v) => { const l = Math.hypot(v[0], v[2]); return l > 0 ? [v[0] / l, 0, v[2] / l] : [1, 0, 0]; };
const dotXZ = (a, b) => a[0] * b[0] + a[2] * b[2];

pw.defineComponent("junction", {
  arm_1: pw.object({ group: "Arms", doc: "A road it joins. A road that runs through gives two arms; one that ends here gives one." }),
  arm_2: pw.object({ group: "Arms", doc: "Another road it joins." }),
  arm_3: pw.object({ group: "Arms", doc: "Another road it joins." }),
  arm_4: pw.object({ group: "Arms", doc: "Another road it joins." }),
  arm_5: pw.object({ group: "Arms", doc: "Another road it joins." }),
  arm_6: pw.object({ group: "Arms", doc: "Another road it joins." }),
  a: pw.object({ group: "Arms", doc: "An older name for an arm; works as one." }),
  b: pw.object({ group: "Arms", doc: "An older name for an arm; works as one." }),
  control: pw.oneOf("priority", "stop", "all-way stop", "lights", "roundabout", { group: "Control", doc: "Who goes. priority: the priority road's arms run through and the rest give way; stop: the same, but the rest stop; all-way stop; lights; roundabout: everyone gives way to the ring." }),
  priority: pw.object({ group: "Control", doc: "The road with priority through the junction (both its arms), for priority and stop control. None: every arm gives way." }),
  priority_2: pw.object({ group: "Control", doc: "When the priority route turns here: the second road on it. Its arm and the priority road's arm are the pair that run through." }),
  mouth: pw.float(12, { unit: "m", range: [3, 60], doc: "How far from the junction's centre its roads stop. A road reads this too, so name the junction on the road (junction_1…) as well as here." }),
  radius: pw.float(8, { unit: "m", range: [0, 50], doc: "The corners' radius. A corner too tight for it between two arms shrinks to fit." }),
  depth: pw.float(0.6, { unit: "m", range: [0.05, 5], doc: "How deep the pad goes below the deck." }),
  blend: pw.float(0, { unit: "m", range: [0, 10], doc: "How far the pad and its verge melt into the ground they join. 0 keeps the pad's edge crisp against its verge, a 6 cm step as along the roads; 3 frays it into the grass." }),
  verge_blend: pw.float(1.5, { unit: "m", range: [0, 10], doc: "How far the verge ring melts into the ground below it, as the roads' banks do." }),
  ground: pw.object({ doc: "The object whose world shapes the pad is built among (the ground's group), as the roads' ground." }),
}, {
  build(junction, object) {
    return buildJunction(junction, object);
  },
});

// A place a junction's roads reach, as game code reads the road graph: on the junction's "node" child,
// at its centre. Each arm is a child "arm N" carrying a road_arm, standing at the middle of its stop line.
pw.defineComponent("road_node", {
  junction: pw.text("", { doc: "The junction object's name." }),
  control: pw.text("priority", { doc: "priority, stop, all-way stop, lights or roundabout." }),
  arms: pw.int(0, { doc: "How many arms." }),
  mouth: pw.float(12, { unit: "m", doc: "How far from the centre the roads stop." }),
});

// One arm of a junction, in order round its centre (index from 1), as game code and the sign plan read
// it. A through road gives two arms: dir "out" where the road runs on out of the junction, "in" where
// it comes into it.
pw.defineComponent("road_arm", {
  junction: pw.text("", { doc: "The junction object's name." }),
  index: pw.int(1, { doc: "Which arm, in order round the centre (counter-clockwise seen from above, from -x)." }),
  road: pw.text("", { doc: "The road object's name." }),
  dir: pw.oneOf("in", "out", { doc: "out: going forward along the road leaves the junction here; in: it comes in." }),
  at: pw.float(0, { unit: "m", doc: "How far along the road its mouth is." }),
  heading: pw.float(0, { unit: "°", doc: "Its heading out of the junction, in the junction's space: 0 along +x, 90 along +z." }),
  half_width: pw.float(0, { unit: "m", doc: "From the road's middle to its deck's edge." }),
  profile: pw.text("two-lane", { doc: "The road's profile." }),
  rule: pw.oneOf("priority", "give way", "stop", "lights", { doc: "What traffic coming in on this arm does." }),
  signal_group: pw.int(0, { doc: "With lights, the group whose phase it follows (arms facing each other share one); 0 without." }),
  stop_at: pw.float(0, { unit: "m", doc: "How far from the centre the stop line is, along the arm." }),
  stop_l_x: pw.float(0, { group: "Stop line" }), stop_l_y: pw.float(0, { group: "Stop line" }), stop_l_z: pw.float(0, { group: "Stop line" }),
  stop_r_x: pw.float(0, { group: "Stop line" }), stop_r_y: pw.float(0, { group: "Stop line" }), stop_r_z: pw.float(0, { group: "Stop line" }),
});

// The stop line stands this far out along each arm from its mouth, on the road's own deck.
const STOP_OUT = 1.0;

const ARM_FIELDS = ["arm_1", "arm_2", "arm_3", "arm_4", "arm_5", "arm_6", "a", "b"];
const r2 = (p) => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000];

// Where two lines cross, in x and z: p + u·t = q + w·s. Answers [t, s], or null when they run parallel.
function cross2(p, u, q, w) {
  const det = u[0] * -w[2] - u[2] * -w[0];
  if (Math.abs(det) < 1e-6) return null;
  const ox = q[0] - p[0], oz = q[2] - p[2];
  return [(ox * -w[2] - oz * -w[0]) / det, (u[0] * oz - u[2] * ox) / det];
}

// The arms: every place a named road crosses the mouth circle. Each has its mouth's middle, its heading
// out of the junction, its half-width to the deck's edge and its verge, all in the junction's space.
function armsOf(junction, object) {
  const mouth = mouthOf(junction);
  const arms = [];
  const seen = {};
  for (const field of ARM_FIELDS) {
    const ref = object.refs && object.refs[field];
    if (!ref || seen[ref.id] || !ref.components.curve) continue;
    seen[ref.id] = true;
    const prof = profileOf(ref.components.road ? ref.components.road.profile : "two-lane");
    const path = pw.curve.path(ref.components.curve, ref.matrix);
    for (const [enter, leave] of within(path, [0, 0, 0], mouth)) {
      // A stretch inside the circle has a mouth at each end that's not the road's own end.
      for (const [d, out] of [[enter, false], [leave, true]]) {
        if ((d <= 0.01 && !out) || (d >= path.length - 0.01 && out)) continue;
        const f = path.at(d);
        const u = flat(out ? f.along : scaled(f.along, -1));
        arms.push({
          road: ref.name, id: ref.id, profile: profileName(ref.components.road ? ref.components.road.profile : "two-lane"), at: d, dir: out ? "out" : "in", u,
          p: f.position, half: prof.deck + prof.kerb, verge: prof.verge,
          angle: Math.atan2(f.position[2], f.position[0]),
        });
      }
    }
  }
  arms.sort((x, y) => x.angle - y.angle);
  return arms;
}

// The outline round the arms, at `widen` metres beyond each deck's edge, with corners of `radius`
// (less `widen`, so the corners of a verge ring share their centres with the pad's). Each mouth is
// carried `reach` metres out along its arm, into the road, so the pad covers the road's end.
function outlineOf(arms, widen, radius, reach) {
  const ring = [];
  const n = arms.length;
  // Each arm's two edges, as seen going round: its "back" edge (towards the arm before) and its "front"
  // edge (towards the arm after), the front being to the left of its heading.
  const edges = arms.map((arm) => {
    const left = [-arm.u[2], 0, arm.u[0]];
    const h = arm.half + widen;
    return { back: add(arm.p, scaled(left, -h)), front: add(arm.p, scaled(left, h)) };
  });
  // Two arms so close that their decks overlap at the mouths: their edges cross outside the circle,
  // and the pad runs out to where they cross, so the outline never crosses itself. (A larger `mouth`
  // gives them room for a corner.)
  const hits = arms.map((arm, i) => {
    const next = arms[(i + 1) % n], e = edges[i], en = edges[(i + 1) % n];
    return n < 2 ? null : cross2(e.front, arm.u, en.back, next.u);
  });
  const mouthEnd = (i, side) => {
    const arm = arms[i], e = edges[i];
    const hit = side === "front" ? hits[i] : hits[(i + n - 1) % n];
    if (hit && hit[0] >= 0 && hit[1] >= 0) {
      return side === "front" ? add(e.front, scaled(arm.u, Math.max(hit[0], reach))) : add(e.back, scaled(arm.u, Math.max(hit[1], reach)));
    }
    return add(side === "front" ? e.front : e.back, scaled(arm.u, reach));
  };
  for (let i = 0; i < n; i++) {
    const arm = arms[i];
    ring.push(mouthEnd(i, "back"), mouthEnd(i, "front"));
    if (n < 2) break;
    const next = arms[(i + 1) % n], e = edges[i];
    // The corner between this arm's front edge and the next arm's back edge.
    const hit = hits[i];
    const r = Math.max(0, radius - widen);
    if (hit && hit[0] < 0 && hit[1] < 0 && r > 0.05) {
      // The edge lines meet inside, -t and -s metres in from the two mouths.
      const q = add(e.front, scaled(arm.u, hit[0]));
      const ta = -hit[0], tb = -hit[1];
      const cos = Math.max(-0.999, Math.min(0.999, dotXZ(arm.u, next.u)));
      const theta = Math.acos(cos);
      const tan = Math.tan(theta / 2);
      const rr = Math.min(r, Math.min(ta, tb) * tan);
      const t = rr / tan;
      const bis = flat(add(arm.u, next.u));
      const centre = add(q, scaled(bis, rr / Math.sin(theta / 2)));
      const t1 = add(q, scaled(arm.u, t)), t2 = add(q, scaled(next.u, t));
      const a1 = Math.atan2(t1[2] - centre[2], t1[0] - centre[0]);
      let sweep = Math.atan2(t2[2] - centre[2], t2[0] - centre[0]) - a1;
      while (sweep > Math.PI) sweep -= 2 * Math.PI;
      while (sweep < -Math.PI) sweep += 2 * Math.PI;
      ring.push(t1);
      const steps = Math.max(4, Math.ceil(Math.abs(sweep) * rr / 0.75));
      for (let k = 1; k < steps; k++) {
        const ang = a1 + sweep * (k / steps);
        ring.push([centre[0] + Math.cos(ang) * rr, 0, centre[2] + Math.sin(ang) * rr]);
      }
      ring.push(t2);
    }
    // Otherwise the edges part (the straight side of a T, a wide bend): the outline runs straight on
    // from this mouth to the next.
  }
  return ring;
}

// An Extrude's outline, counter-clockwise seen from above, about `at`.
function extrudeOutline(ring, at) {
  let outline = ring.map((q) => r2([q[0] - at[0], q[2] - at[2]]));
  let area = 0;
  for (let i = 0; i < outline.length; i++) {
    const u = outline[i], v = outline[(i + 1) % outline.length];
    area += u[0] * v[1] - v[0] * u[1];
  }
  if (area > 0) outline = outline.reverse();
  return outline;
}

// The plane y = a + b·x + c·z that best fits the arms' mouths, both edges of each (least squares). With
// two arms or fewer it leans only along them.
function planeOf(arms) {
  const pts = [];
  for (const arm of arms) {
    const left = [-arm.u[2], 0, arm.u[0]];
    pts.push(add(arm.p, scaled(left, arm.half)), add(arm.p, scaled(left, -arm.half)));
  }
  // Normal equations, with a whisper of damping on the slopes so a straight pair still solves.
  let n = 0, sx = 0, sz = 0, sxx = 0, sxz = 0, szz = 0, sy = 0, sxy = 0, szy = 0;
  for (const q of pts) {
    n++; sx += q[0]; sz += q[2]; sxx += q[0] * q[0]; sxz += q[0] * q[2]; szz += q[2] * q[2];
    sy += q[1]; sxy += q[0] * q[1]; szy += q[2] * q[1];
  }
  const damp = 1e-3 * n;
  const M = [[n, sx, sz], [sx, sxx + damp, sxz], [sz, sxz, szz + damp]], v = [sy, sxy, szy];
  const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det3(M);
  if (Math.abs(D) < 1e-9) return { a: sy / n, b: 0, c: 0 };
  const col = (k) => M.map((row, i) => row.map((x, j) => (j === k ? v[i] : x)));
  return { a: det3(col(0)) / D, b: det3(col(1)) / D, c: det3(col(2)) / D };
}

// A flat Extrude laid on the plane y = top + b·x + c·z: where it stands, how it's turned (Euler
// degrees, Y then X then Z, as a built child takes them) and its outline in its own space.
function onPlane(ring, top, b, c, depth) {
  const len = Math.hypot(b, 1, c);
  const N = [-b / len, 1 / len, -c / len];
  const rz = Math.asin(-N[0]), rx = Math.atan2(N[2], N[1]);
  const O = [0, top, 0];
  // Into the shape's own space: undo X, then undo Z.
  const local = (P) => {
    const d = sub(P, O);
    const cx = Math.cos(-rx), sx = Math.sin(-rx);
    const e = [d[0], d[1] * cx - d[2] * sx, d[1] * sx + d[2] * cx];
    const cz = Math.cos(-rz), sz = Math.sin(-rz);
    return [e[0] * cz - e[1] * sz, e[0] * sz + e[1] * cz, e[2]];
  };
  const pts = ring.map((q) => local([q[0], top + b * q[0] + c * q[2], q[2]]));
  return {
    position: sub(O, scaled(N, depth / 2)).map((x) => Math.round(x * 10000) / 10000),
    rotation: [rx * 180 / Math.PI, 0, rz * 180 / Math.PI].map((x) => Math.round(x * 10000) / 10000),
    outline: extrudeOutline(pts, [0, 0, 0]),
  };
}

// Each arm's rule and signal group, from the junction's control and its priority roads.
const CONTROLS = ["priority", "stop", "all-way stop", "lights", "roundabout"];
const controlOf = (junction) => (typeof junction.control === "number" ? CONTROLS[junction.control] : junction.control) || "priority";
function rulesOf(junction, object, arms) {
  const control = controlOf(junction);
  const pri = [object.refs && object.refs.priority, object.refs && object.refs.priority_2].filter(Boolean).map((r) => r.id);
  return arms.map((arm, i) => {
    if (control === "lights") {
      // Arms that face each other (headings within 30° of opposite) share a group.
      let group = i + 1;
      for (let k = 0; k < i; k++) {
        if (dotXZ(arms[k].u, arm.u) < -Math.cos(Math.PI / 6)) { group = k + 1; break; }
      }
      return { rule: "lights", group };
    }
    if (control === "all-way stop") return { rule: "stop", group: 0 };
    if (control === "roundabout") return { rule: "give way", group: 0 };
    const minor = control === "stop" ? "stop" : "give way";
    return { rule: pri.includes(arm.id) ? "priority" : minor, group: 0 };
  });
}

// The junction's children: the pad (tarmac on top, grass walls) out to each arm's mouth with a rounded
// corner between every two neighbouring arms, a verge ring round it a step lower, and its road_node.
// The pad lies on the plane that best fits the mouths, so a junction on a slope meets its arms.
function buildJunction(junction, object) {
  const arms = armsOf(junction, object);
  if (arms.length === 0) return [];
  const plane = planeOf(arms);
  const y = plane.a + DECK_Y;
  const ground = object.refs && object.refs.ground ? object.refs.ground.id : null;
  const verge = arms.reduce((v, arm) => Math.max(v, arm.verge), 0);
  const children = [{
    name: "node",
    position: [0, y, 0],
    components: { road_node: { junction: object.name, control: controlOf(junction), arms: arms.length, mouth: mouthOf(junction) } },
  }];
  const rules = rulesOf(junction, object, arms);
  arms.forEach((arm, i) => {
    const left = [-arm.u[2], 0, arm.u[0]];
    const mid = add(arm.p, scaled(arm.u, STOP_OUT));
    const sy = y + plane.b * mid[0] + plane.c * mid[2];
    const l = add(mid, scaled(left, arm.half)), r = add(mid, scaled(left, -arm.half));
    const rd = (v) => Math.round(v * 1000) / 1000;
    children.push({
      name: "arm " + (i + 1),
      position: [rd(mid[0]), rd(sy), rd(mid[2])],
      components: {
        road_arm: {
          junction: object.name, index: i + 1, road: arm.road, dir: arm.dir, at: rd(arm.at),
          heading: Math.round(Math.atan2(arm.u[2], arm.u[0]) * 1800 / Math.PI) / 10,
          half_width: arm.half, profile: arm.profile, rule: rules[i].rule, signal_group: rules[i].group,
          stop_at: rd(mouthOf(junction) + STOP_OUT),
          stop_l_x: rd(l[0]), stop_l_y: rd(sy), stop_l_z: rd(l[2]), stop_r_x: rd(r[0]), stop_r_y: rd(sy), stop_r_z: rd(r[2]),
        },
      },
    });
  });
  if (arms.length < 2) return children;
  const depth = junction.depth;
  // The pad: tarmac on top only; its walls and bottom are grass, so where a round passes over its edge
  // it reads as a kerbed apron into the verge.
  const pad = onPlane(outlineOf(arms, 0, junction.radius, OVERLAP), y, plane.b, plane.c, depth);
  const padFaces = { bottom: GRASS };
  for (let w = 1; w <= pad.outline.length; w++) padFaces["wall " + w] = GRASS;
  const padShape = { shape: "Extrude", outline: pad.outline, faces: padFaces, blend: junction.blend };
  if (ground) padShape[JOINS] = ground;
  children.push({ name: "pad", position: pad.position, rotation: pad.rotation, scale: [1, depth, 1], components: { world_shape: padShape, material: { asset: PLAIN } } });
  // The verge ring: the same outline widened by the verge, a step below the deck, all grass. Inside the
  // pad the pad's deck stands above it; beyond, it meets each road's verge at the same height, and it
  // melts into the ground below by `verge_blend`, as a road's banks do.
  if (verge > 0) {
    const ring = onPlane(outlineOf(arms, verge, junction.radius, OVERLAP), y - VERGE_STEP, plane.b, plane.c, depth);
    const vShape = { shape: "Extrude", outline: ring.outline, blend: junction.verge_blend };
    if (ground) vShape[JOINS] = ground;
    children.push({ name: "verge", position: ring.position, rotation: ring.rotation, scale: [1, depth, 1], components: { world_shape: vShape, material: { asset: GRASS } } });
  }
  return children;
}
