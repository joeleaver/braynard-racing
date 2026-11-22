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

// Natural shoulders (Joe, 2026-11-22: "use the profile to good effect to give it natural shoulders"):
// crossfall: the deck falls this much per metre from its crown to each edge; edge: a strip beyond the
// deck in the kerb material (gravel, or the freeway's hard strip); shoulder: grass that rolls over
// from the edge, dropping `drop` metres across its width; bank: metres across per metre down, then a
// rounded toe; depth: how far the bank goes into the ground.
const PROFILES = {
  "two-lane": { deck: 4.0, kerb: 0, verge: 1.0, depth: 3, slope: 1.0, repeat: 12, span: 240, material: "01M7TXFYJPTJAS48M04QG70FKG",
    natural: { crossfall: 0.015, edge: 0.3, shoulder: 1.5, drop: 0.15, bank: 3, depth: 2 } },
  "back lane": { deck: 3.5, kerb: 0, verge: 1.0, depth: 3, slope: 1.0, repeat: 12, span: 240, material: "01M7TXFYMXDGKDQYM3SWJXG6WZ",
    natural: { crossfall: 0.015, edge: 0.2, shoulder: 1.2, drop: 0.12, bank: 3, depth: 1.5 } },
  "slip road": { deck: 3.0, kerb: 0, verge: 1.0, depth: 3, slope: 1.0, repeat: 12, span: 240, material: "01M7TXFYQ0S2THNY9H6XM2ECWK",
    natural: { crossfall: 0.02, edge: 0.3, shoulder: 1.2, drop: 0.12, bank: 2.5, depth: 2 } },
  "freeway": { deck: 15.0, kerb: 0.5, verge: 1.5, depth: 3, slope: 1.0, repeat: 9, span: 252, material: "01M7TXFYRYTSYEGTM31KAXFADF",
    natural: { crossfall: 0.02, edge: 1.0, shoulder: 2.0, drop: 0.2, bank: 2, depth: 3 } },
};
// Over this many metres before a junction's mouth a natural road's crossfall eases to level, so it
// meets the junction's pad with no kink.
const EASE = 10;
// Whether those easing spans carry per-point sections (lofted). Off: they keep the crowned section, and
// the mouth meets the pad with the crown's small kink. A switch for testing the Rounded-build stall.
const EASE_LOFT = true;
// The lip from a natural road's tarmac edge down onto its grass shoulder: across, down (metres). It
// must be steep: a gentle crease is rounded away by the blend and the tarmac-to-grass line comes out
// ragged at the mesh's resolution; a 6 cm drop over 2 cm keeps it crisp.
const LIP = [0.02, 0.06];
// Cuttings: where the ground stands above a road, the road clears it. Each span carries a Subtract
// that names the ground's shape in `cuts`, so it acts on the ground just after it is laid and before
// the roads join; it removes everything above the road's top surface (CUT_BELOW under it, which the
// road fills again) out to its shoulders, then rises in cutting sides CUT_SLOPE across per metre up,
// to CUT_H above the road.
const CUT_H = 6;
const CUT_SLOPE = 1.5;
const CUT_BELOW = 0.08;
// How far a cutting's rim is rounded. Rounding a cut's rim lifts the ground a little beside it, and
// where a pad's cut meets a road's at a sharp angle that lift stood up as a fin; sharp rims don't.
const CUT_BLEND = 0;
// How far a junction's cutting reaches along each arm, past the mouth.
const CUT_REACH = 3;
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
const SHOULDERS = ["natural", "stepped"];
const isNatural = (road) => !!road && (typeof road.shoulders === "number" ? SHOULDERS[road.shoulders] : road.shoulders || "natural") === "natural";
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
    for (let i = 0; i < 24; i++) {
      const m = (a + b) / 2, fm = off(m);
      if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  };
  // Walk the curve; far from the circle, jump ahead by most of the distance still to go (the curve can't
  // come closer faster than it runs), so a long road costs a few dozen samples, not one a metre. A
  // builder has a fixed budget of work, and a metre at a time along a 2 km road with two junctions
  // ran it out.
  const out = [];
  let o = off(0);
  let start = o < 0 ? 0 : null;
  let prevD = 0, prevIn = o < 0;
  for (;;) {
    const dd = Math.min(prevD + Math.max(1, Math.abs(o) * 0.8), path.length);
    o = off(dd);
    const isIn = o < 0;
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

// A natural shoulder on the right, outward from (x0, y0): the edge strip, the rolled grass, the bank
// and its rounded toe. Answers points with the role of the segment leading to each.
function shoulderOut(n, x0, y0, cf, depth) {
  const pts = [];
  let x = x0 + n.edge, y = y0 - n.edge * cf;
  pts.push([x, y, "edge"]);
  // A small lip where the tarmac meets the grass: the verge sits just below the edge, and the crease
  // keeps the line between them crisp (a near-flat join is cut at the mesh's resolution, raggedly).
  x += LIP[0]; y -= LIP[1];
  pts.push([x, y, "grass"]);
  for (const t of [1 / 3, 2 / 3, 1]) pts.push([x + n.shoulder * t, y - n.drop * t * t, "grass"]);
  x += n.shoulder; y -= n.drop;
  const toe = Math.min(0.3, Math.max(0, (y + depth) / 2));
  const xb = x + (y - (-depth + toe)) * n.bank;
  pts.push([xb, -depth + toe, "grass"]);
  pts.push([xb + toe * n.bank * 2, -depth, "grass"]);
  return pts;
}

// The whole natural cross-section: a crowned deck, edge strips, rolled shoulders and banks. `level`
// takes the crossfall away (where the road meets a junction). Same number of points either way.
function naturalSection(p, level) {
  const n = p.natural, cf = level ? 0 : n.crossfall, y = DECK_Y, depth = n.depth;
  const half = p.deck + p.kerb;
  const right = [[0, y, "deck"], [half, y - half * cf, "deck"]].concat(shoulderOut(n, half, y - half * cf, cf, depth));
  // Round the outline as a Sweep takes it: the bottom, up the right side to the crown, down the left.
  const pts = [[-right[right.length - 1][0], -depth, "grass"]];      // bottom-left; its segment is the bottom
  for (let i = right.length - 1; i >= 0; i--) {
    const [a, b] = right[i];
    // The segment from this point onward (towards the crown) has the role of the segment leading to it.
    pts.push([a, b, i > 0 ? right[i][2] : "deck"]);
  }
  for (let i = 1; i < right.length; i++) pts.push([-right[i][0], right[i][1], i + 1 < right.length ? right[i + 1][2] : "grass"]);
  pts.pop();                                                          // the last is the bottom-left again
  // Each point's role names the segment from it to the next.
  const roles = pts.map((q, i) => {
    if (i === 0) return "grass";                                      // the bottom
    return q[2];
  });
  const outline = pts.map(([a, b]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]);
  const faces = {};
  // The edge strip is plain tarmac: the deck's material, beyond where its markings stop.
  roles.forEach((role, i) => {
    if (role === "grass") faces["band " + (i + 1)] = GRASS;
  });
  faces["start"] = faces["end"] = GRASS;
  return { outline, faces };
}

// The road's top surface on the right, from its middle out to the end of its shoulder or verge.
function topChain(p, natural) {
  if (natural) {
    const n = p.natural, half = p.deck + p.kerb, yh = DECK_Y - half * n.crossfall;
    return [[0, DECK_Y], [half, yh]].concat(shoulderOut(n, half, yh, n.crossfall, n.depth).slice(0, 5).map(([a, b]) => [a, b]));
  }
  const edge = p.deck + p.kerb, vy = DECK_Y - VERGE_STEP;
  return [[0, DECK_Y], [edge, DECK_Y], [edge, vy], [edge + p.verge, vy]];
}

// The cutting's outline: under the road's top surface by CUT_BELOW from one shoulder to the other, then
// up the cutting sides to CUT_H.
function cutSection(p, natural) {
  const right = topChain(p, natural);
  const left = right.slice(1).map(([a, b]) => [-a, b]).reverse();
  const chain = left.concat(right).map(([a, b]) => [a, b - CUT_BELOW]);
  const [xe, ye] = chain[chain.length - 1];
  const out = xe + (CUT_H - ye) * CUT_SLOPE;
  const outline = chain.concat([[out, CUT_H], [-out, CUT_H]]);
  return outline.map(([a, b]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]);
}

pw.defineComponent("road", {
  profile: pw.oneOf("two-lane", "back lane", "slip road", "freeway", { doc: "The road's cross-section and markings." }),
  span: pw.float(0, { unit: "m", range: [0, 2000], doc: "How long each span is aimed at; 0 takes the profile's. A span is always a whole number of dash periods." }),
  blend: pw.float(1.5, { unit: "m", range: [0, 10], doc: "How far the road melts into the ground it joins. 1.5 rounds the verges into a soft bank; the joints between spans are clean since Playweft 42af726f. A road forking off another blends cleanly since Playweft 37df8065, and crossings blend cleanly with Rounded blends (Playweft d766ef66)." }),
  ground: pw.object({ doc: "The object whose world shapes the road is built among (the Height Map's group), so it blends into that ground." }),
  bridge_from: pw.float(0, { unit: "m", group: "Bridge", doc: "Where a bridge starts, in metres along the curve; 0 for no bridge." }),
  bridge_to: pw.float(0, { unit: "m", group: "Bridge", doc: "Where the bridge ends, in metres along the curve." }),
  interval: pw.float(2, { unit: "m", range: [0, 20], doc: "How far apart the Sweeps take their curve." }),
  terrain: pw.object({ doc: "The ground's own shape (its Height Map). Where the ground stands above the road, the road clears it: a cutting with sides 1:1.5. None: no cutting." }),
  shoulders: pw.oneOf("natural", "stepped", { doc: "natural (Joe, 2026-11-22): a crowned deck, a tarmac edge strip, a small lip, a grass shoulder that rolls over and a gentle bank with a rounded toe, as the profile says. stepped: the first slice's 6 cm step down to a flat verge and a 1:1 bank." }),
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
    const terrain = object.refs && object.refs.terrain ? object.refs.terrain.id : null;
    let pieces = piecesOf(m.total, road.span > 0 ? road.span : p.span, rep, bridge, gaps).filter((q) => q.kind !== "gap");
    const natural = isNatural(road);
    // A natural road eases its crossfall to level over EASE metres before each junction mouth, so its
    // deck meets the junction's flat pad with no kink: those last metres are spans of their own whose
    // far end carries the level section.
    // A bridge's deck is level too, so a natural road eases to level where it meets one.
    const levelEnds = gaps.slice();
    if (bridge) levelEnds.push(bridge);
    if (natural && levelEnds.length) {
      const eased = [];
      for (const q of pieces) {
        if (q.kind !== "road") { eased.push(q); continue; }
        let { d0, d1 } = q;
        const atStart = levelEnds.some((g) => Math.abs(g[1] - d0) < 0.01 && g[1] < m.total - 0.01);
        const atEnd = levelEnds.some((g) => Math.abs(g[0] - d1) < 0.01 && g[0] > 0.01);
        let first = null, lastPiece = null;
        if (atStart && d1 - d0 > EASE + 2) { first = { d0, d1: d0 + EASE, kind: "road", levelStart: true }; d0 += EASE; }
        if (atEnd && d1 - d0 > EASE + 2) { lastPiece = { d0: d1 - EASE, d1, kind: "road", levelEnd: true }; d1 -= EASE; }
        const mid = { d0, d1, kind: "road" };
        if (atStart && !first) mid.levelStart = true;
        if (atEnd && !lastPiece) mid.levelEnd = true;
        if (first) eased.push(first);
        eased.push(mid);
        if (lastPiece) eased.push(lastPiece);
      }
      pieces = eased;
    }
    const ground = object.refs && object.refs.ground ? object.refs.ground.id : null;
    const count = pieces.length;
    const name = (k) => "span " + (k + 1);
    const out = [];
    let last = null, lastEnd = -1;
    let cutRun = [], cuts = 0;
    const flushCut = () => {
      if (cutRun.length >= 2) {
        cuts++;
        out.push({
          name: "clear " + cuts,
          components: {
            world_shape: { shape: "Sweep", operation: "Subtract", outline: cutSection(p, natural), follow: "Upright", rings: "Square", interval: road.interval, cuts: terrain, blend: CUT_BLEND },
            curve: { closed: false, points: cutRun },
          },
        });
      }
      cutRun = [];
    };
    for (let k = 0; k < count; k++) {
      const { d0, d1, kind, levelStart, levelEnd } = pieces[k];
      const isBridge = kind === "bridge";
      const points = piece(m, d0, d1);
      if (last && Math.abs(d0 - lastEnd) < 0.01) points[0].position = last;   // the joint is one point, exactly
      last = points[points.length - 1].position;
      lastEnd = d1;
      const joinsBefore = k > 0 && Math.abs(pieces[k - 1].d1 - d0) < 0.01;
      const joinsAfter = k + 1 < count && Math.abs(pieces[k + 1].d0 - d1) < 0.01;
      const { outline, faces } = natural && !isBridge ? naturalSection(p, false) : section(p, isBridge);
      if (EASE_LOFT && natural && !isBridge && (levelStart || levelEnd)) {
        const flatSec = naturalSection(p, true).outline;
        points[0].section = levelStart ? flatSec : outline;
        points[points.length - 1].section = levelEnd ? flatSec : outline;
      }
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
      // The cutting runs as one Sweep along each unbroken stretch of road (no joints between cuts,
      // whose meeting end faces built badly), broken only at junction gaps and bridges.
      if (terrain) {
        const strip = (q) => ({ position: q.position, handle_in: q.handle_in, handle_out: q.handle_out });
        if (!isBridge) {
          if (!cutRun.length) cutRun.push(...points.map(strip));
          else { cutRun[cutRun.length - 1].handle_out = points[0].handle_out; cutRun.push(...points.slice(1).map(strip)); }
        }
        if (isBridge || !joinsAfter) flushCut();
      }
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
  approach_1: pw.object({ group: "Approaches", doc: "An approach object that sets one arm apart: its turn lanes (and later its own rule and crossing)." }),
  approach_2: pw.object({ group: "Approaches", doc: "Another approach." }),
  approach_3: pw.object({ group: "Approaches", doc: "Another approach." }),
  approach_4: pw.object({ group: "Approaches", doc: "Another approach." }),
  approach_5: pw.object({ group: "Approaches", doc: "Another approach." }),
  approach_6: pw.object({ group: "Approaches", doc: "Another approach." }),
  mouth: pw.float(12, { unit: "m", range: [3, 60], doc: "How far from the junction's centre its roads stop. A road reads this too, so name the junction on the road (junction_1…) as well as here." }),
  radius: pw.float(8, { unit: "m", range: [0, 50], doc: "The corners' radius. A corner too tight for it between two arms shrinks to fit." }),
  depth: pw.float(0.6, { unit: "m", range: [0.05, 5], doc: "How deep the pad goes below the deck." }),
  blend: pw.float(0, { unit: "m", range: [0, 10], doc: "How far the pad and its verge melt into the ground they join. 0 keeps the pad's edge crisp against its verge, a 6 cm step as along the roads; 3 frays it into the grass." }),
  terrain: pw.object({ doc: "The ground's own shape (its Height Map). The pad clears the ground above it, as the roads do." }),
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

// A oneOf field's value, whether it comes as its name or its index.
function pick(v, list) { return (typeof v === "number" ? list[v] : v) || list[0]; }
const APPROACH_FIELDS = ["approach_1", "approach_2", "approach_3", "approach_4", "approach_5", "approach_6"];
const TURNS = ["none", "left", "right", "both"];
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
          natural: isNatural(ref.components.road),
          road: ref.name, id: ref.id, profile: profileName(ref.components.road ? ref.components.road.profile : "two-lane"), at: d, dir: out ? "out" : "in", u,
          p: f.position, half: prof.deck + prof.kerb, verge: prof.verge,
          angle: Math.atan2(f.position[2], f.position[0]),
        });
      }
    }
  }
  arms.sort((x, y) => x.angle - y.angle);
  // Approaches with turn lanes widen their arm's mouth on the turning side. Traffic coming in drives
  // against the arm's heading, so its left is the arm's back edge and its right the front edge.
  for (const field of APPROACH_FIELDS) {
    const ref = object.refs && object.refs[field];
    const a = ref && ref.components.approach;
    if (!a) continue;
    const arm = arms.find((x) => x.id === a.road && x.dir === pick(a.dir, ["in", "out"]));
    if (!arm) continue;
    const turn = pick(a.turn, TURNS);
    const w = profileOf(arm.profile).deck;     // one lane, as wide as the profile's half-deck
    if (turn === "left" || turn === "both") arm.wBack = (arm.wBack || 0) + w;
    if (turn === "right" || turn === "both") arm.wFront = (arm.wFront || 0) + w;
  }
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
    const hb = arm.half + widen + (arm.wBack || 0), hf = arm.half + widen + (arm.wFront || 0);
    return { back: add(arm.p, scaled(left, -hb)), front: add(arm.p, scaled(left, hf)) };
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
  // Each corner's run, from one arm's front mouth end to the next arm's back mouth end, and its radius.
  ring.corners = [];
  for (let i = 0; i < n; i++) {
    const arm = arms[i];
    ring.push(mouthEnd(i, "back"), mouthEnd(i, "front"));
    const corner = { from: i, points: [ring[ring.length - 1]], radius: Infinity };
    ring.corners.push(corner);
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
      corner.points.push(t1);
      corner.radius = rr;
      const steps = Math.max(4, Math.ceil(Math.abs(sweep) * rr / 0.75));
      for (let k = 1; k < steps; k++) {
        const ang = a1 + sweep * (k / steps);
        const q2 = [centre[0] + Math.cos(ang) * rr, 0, centre[2] + Math.sin(ang) * rr];
        ring.push(q2);
        corner.points.push(q2);
      }
      ring.push(t2);
      corner.points.push(t2);
    }
    // Otherwise the edges part (the straight side of a T, a wide bend): the outline runs straight on
    // from this mouth to the next.
  }
  if (n >= 2) ring.corners.forEach((c, i) => c.points.push(mouthEnd((i + 1) % n, "back")));
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

// A Sweep of a natural shoulder along a junction corner's run: the run's points at the pad's height,
// the section starting half a metre in on the pad and rolling down outward (to the right going round).
// A tight corner gets a shallower bank, so the shoulder never folds over its own arc's centre.
function shoulderSweep(p, corner, heightAt) {
  const pts = [];
  for (const q of corner.points) {
    if (pts.length && Math.hypot(q[0] - pts[pts.length - 1][0], q[2] - pts[pts.length - 1][2]) < 0.2) continue;
    pts.push([q[0], heightAt(q), q[2]]);
  }
  if (pts.length < 2) return null;
  const n = p.natural;
  // How far out the shoulder may reach: on a corner's arc, less than the arc's radius, or it folds over
  // the arc's centre into a fin. Shallower banks first; if even the shallowest is too wide, the part
  // beyond the rolled shoulder is squeezed in.
  const room = isFinite(corner.radius) ? 0.8 * corner.radius : Infinity;
  let depth = n.depth, out = shoulderOut(n, 0, 0, 0, depth);
  while (out[out.length - 1][0] > room && depth > 0.3) {
    depth = Math.max(0.3, depth - 0.1);
    out = shoulderOut(n, 0, 0, 0, depth);
  }
  const foot = out[out.length - 1][0];
  if (foot > room) {
    const keep = out[4][0];                                  // the end of the rolled shoulder
    const k = Math.max(0.05, (room - keep) / Math.max(0.01, foot - keep));
    out = out.map(([a, b, r], i) => [i > 4 ? keep + (a - keep) * k : Math.min(a, room), b, r]);
  }
  const outline = [[-0.5, -depth], [out[out.length - 1][0], -depth]];
  const roles = ["grass"];
  for (let i = out.length - 2; i >= 0; i--) { outline.push([out[i][0], out[i][1]]); roles.push(out[i + 1][2]); }
  outline.push([0, 0]); roles.push(out[0][2]);
  outline.push([-0.5, 0]); roles.push("deck");
  roles.push("grass");                                    // the inside wall, back to the start
  // Going round the pad this way the pad is on the run's right (a Sweep's +across), so the shoulder
  // goes on its left: the same shape mirrored, still going round the same way.
  const mirrored = outline.map(([a, b]) => [-a, b]).reverse();
  const mroles = roles.slice(0, -1).reverse().concat(roles.slice(-1));
  outline.length = 0; outline.push(...mirrored);
  roles.length = 0; roles.push(...mroles);
  const faces = {};
  roles.forEach((role, i) => {
    if (role === "grass") faces["band " + (i + 1)] = GRASS;
  });
  faces["start"] = faces["end"] = GRASS;
  // Smooth handles through the run (Catmull-Rom), so the arcs stay round.
  const points = pts.map((q, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const h = scaled(sub(b, a), i === 0 || i === pts.length - 1 ? 1 / 3 : 1 / 6);
    return { position: r3(q), handle_in: r3(scaled(h, -1)), handle_out: r3(h) };
  });
  const r3o = (a) => [Math.round(a[0] * 1000) / 1000, Math.round(a[1] * 1000) / 1000];
  return {
    shape: { shape: "Sweep", outline: outline.map(r3o), follow: "Upright", rings: "Square", interval: 1, faces },
    curve: { closed: false, points },
  };
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
  const padRing = outlineOf(arms, 0, junction.radius, OVERLAP);
  const pad = onPlane(padRing, y, plane.b, plane.c, depth);
  const padFaces = { bottom: GRASS };
  for (let w = 1; w <= pad.outline.length; w++) padFaces["wall " + w] = GRASS;
  const padShape = { shape: "Extrude", outline: pad.outline, faces: padFaces, blend: junction.blend };
  if (ground) padShape[JOINS] = ground;
  children.push({ name: "pad", position: pad.position, rotation: pad.rotation, scale: [1, depth, 1], components: { world_shape: padShape, material: { asset: PLAIN } } });
  // The verge ring: the same outline widened by the verge, a step below the deck, all grass. Inside the
  // pad the pad's deck stands above it; beyond, it meets each road's verge at the same height, and it
  // melts into the ground below by `verge_blend`, as a road's banks do.
  const terrainId = object.refs && object.refs.terrain ? object.refs.terrain.id : null;
  if (terrainId) {
    // The pad clears the ground above it out to the arms' shoulders, as the roads do.
    const reachOut = arms.reduce((v, arm) => {
      const pr = profileOf(arm.profile);
      return Math.max(v, arm.natural ? pr.natural.edge + LIP[0] + pr.natural.shoulder : pr.verge);
    }, 0);
    // It reaches CUT_REACH along each arm, well into the arm's own cutting, so no sliver of ground is
    // left standing between the two.
    const cut = onPlane(outlineOf(arms, reachOut, junction.radius, CUT_REACH), y - CUT_BELOW + CUT_H, plane.b, plane.c, CUT_H);
    children.push({
      name: "clear",
      position: cut.position, rotation: cut.rotation, scale: [1, CUT_H, 1],
      components: { world_shape: { shape: "Extrude", operation: "Subtract", outline: cut.outline, cuts: terrainId, blend: CUT_BLEND } },
    });
  }
  if (arms.some((arm) => arm.natural)) {
    // Natural shoulders: along each corner, from one arm's mouth round to the next, a Sweep of the
    // same rolled shoulder the arms have, starting at the pad's edge, so pad and road edges are one.
    padRing.corners.forEach((corner, i) => {
      const prof = profileOf(arms[corner.from].profile);
      const sh = shoulderSweep(prof, corner, (q) => y + plane.b * q[0] + plane.c * q[2]);
      if (!sh) return;
      sh.shape.blend = junction.verge_blend;
      if (ground) sh.shape[JOINS] = ground;
      children.push({ name: "shoulder " + (i + 1), components: { world_shape: sh.shape, curve: sh.curve, material: { asset: PLAIN } } });
    });
  } else if (verge > 0) {
    const ring = onPlane(outlineOf(arms, verge, junction.radius, OVERLAP), y - VERGE_STEP, plane.b, plane.c, depth);
    const vShape = { shape: "Extrude", outline: ring.outline, blend: junction.verge_blend };
    if (ground) vShape[JOINS] = ground;
    children.push({ name: "verge", position: ring.position, rotation: ring.rotation, scale: [1, depth, 1], components: { world_shape: vShape, material: { asset: GRASS } } });
  }
  return children;
}

// ---- Slip roads: on- and off-ramps -----------------------------------------------------------------
// A `slip` joins a ramp road to the side of a main road (Design, "Junctions, ramps and roundabouts":
// merges and diverges). It builds the taper: an extra lane that grows out of the main road's edge from
// nothing to the ramp's width over `taper` metres, runs on at full width for `parallel` metres, and
// meets the ramp there. It's one Sweep along the main road's own curve whose cross-section changes
// along it (each curve point carries its own section, Playweft #632), so it follows the main road's
// heights and bends. An off-ramp widens going forward along the main road; an on-ramp narrows. The
// ramp road's own curve starts (off) or ends (on) at the "ramp mouth" the slip leaves as a child, so
// it meets the full-width lane; the slip's road_link tells the road graph how they join.
pw.defineComponent("slip", {
  main: pw.object({ doc: "The road the slip joins." }),
  ramp: pw.object({ doc: "The ramp road. Its curve should start (off-ramp) or end (on-ramp) at the slip's ramp mouth." }),
  kind: pw.oneOf("off-ramp", "on-ramp", { doc: "off-ramp: the lane leaves the main road going forward along it; on-ramp: it joins it." }),
  side: pw.oneOf("right", "left", { doc: "Which side of the main road, facing along its curve." }),
  at: pw.float(0, { unit: "m", doc: "Where along the main road the slip starts: the taper's thin end for an off-ramp, the ramp mouth for an on-ramp." }),
  taper: pw.float(60, { unit: "m", range: [5, 300], doc: "How long the lane takes to grow from nothing to full width." }),
  parallel: pw.float(40, { unit: "m", range: [0, 300], doc: "How long it runs on at full width beside the main road." }),
  blend: pw.float(-1, { unit: "m", range: [-1, 10], doc: "How far the taper melts into the ground; -1 takes the main road's." }),
  ground: pw.object({ doc: "The object whose world shapes the slip is built among (the ground's group), as the roads' ground." }),
}, {
  build(slip, object) {
    return buildSlip(slip, object);
  },
});

// Where a slip road joins a main road, as game code reads the road graph.
pw.defineComponent("road_link", {
  main: pw.text("", { doc: "The main road's name." }),
  ramp: pw.text("", { doc: "The ramp road's name." }),
  kind: pw.text("off-ramp", { doc: "off-ramp or on-ramp." }),
  side: pw.text("right", { doc: "Which side of the main road." }),
  main_from: pw.float(0, { unit: "m", doc: "Where along the main road the slip starts." }),
  main_to: pw.float(0, { unit: "m", doc: "Where along the main road it ends." }),
  mouth: pw.float(0, { unit: "m", doc: "Where along the main road the ramp meets the full-width lane." }),
});

const SLIP_KINDS = ["off-ramp", "on-ramp"];
// How wide a taper's thin end is beyond the main road's edge (it starts inside the main road's deck).
const THIN = 0.6;
const SIDES = ["right", "left"];

// A curve's points carried through a matrix (twelve numbers, as object.refs gives), into the builder's space.
function throughMatrix(curve, m) {
  const at = (p) => [m[0] * p[0] + m[3] * p[1] + m[6] * p[2] + m[9], m[1] * p[0] + m[4] * p[1] + m[7] * p[2] + m[10], m[2] * p[0] + m[5] * p[1] + m[8] * p[2] + m[11]];
  const dir = (v) => [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
  return {
    closed: curve.closed,
    points: curve.points.map((q) => ({ position: at(q.position), handle_in: dir(q.handle_in || [0, 0, 0]), handle_out: dir(q.handle_out || [0, 0, 0]) })),
  };
}

// The taper's cross-section on the right of the path, `w` metres wide beyond the main road's edge `e`:
// a deck strip from just inside the main road's deck out to e + w, then a verge a step lower and a bank
// down into the ground, as a road's own section. Answers the outline and each band's role.
function taperSection(p, e, w, mirror, natural) {
  if (natural) return taperNatural(p, e, w, mirror);
  const y = DECK_Y, vy = y - VERGE_STEP;
  const inner = e - 0.3, out = e + w, vout = out + p.verge, foot = vout + p.depth * p.slope;
  let outline = [[inner, -p.depth], [foot, -p.depth], [vout, vy], [out, vy], [out, y], [inner, y]];
  let roles = ["grass", "grass", "grass", "kerb", "deck", "grass"];
  if (mirror) {
    // The same shape on the left, still going round the same way.
    outline = outline.map(([a, b]) => [-a, b]).reverse();
    roles = roles.slice(0, -1).reverse().concat(roles.slice(-1));
  }
  return { outline: outline.map(([a, b]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]), roles };
}

// The taper's section for a natural main road: its deck carries on the main road's crossfall out to
// e + w, then the same edge strip, rolled shoulder and bank as the road's own.
function taperNatural(p, e, w, mirror) {
  const n = p.natural, cf = n.crossfall, depth = n.depth;
  const yAt = (x) => DECK_Y - x * cf;
  const inner = e - 0.3, out = e + w;
  const sh = shoulderOut(n, out, yAt(out), cf, depth);
  let outline = [[inner, -depth], [sh[sh.length - 1][0], -depth]];
  let roles = ["grass"];
  for (let i = sh.length - 2; i >= 0; i--) { outline.push([sh[i][0], sh[i][1]]); roles.push(sh[i + 1][2]); }
  outline.push([out, yAt(out)]); roles.push(sh[0][2]);
  outline.push([inner, yAt(inner)]); roles.push("deck");
  roles.push("grass");
  if (mirror) {
    outline = outline.map(([a, b]) => [-a, b]).reverse();
    roles = roles.slice(0, -1).reverse().concat(roles.slice(-1));
  }
  return { outline: outline.map(([a, b]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]), roles };
}

function buildSlip(slip, object) {
  const main = object.refs && object.refs.main;
  if (!main || !main.components.curve || !main.components.road) return [];
  const kind = pick(slip.kind, SLIP_KINDS), side = pick(slip.side, SIDES);
  const mp = profileOf(main.components.road.profile);
  const nat = isNatural(main.components.road);
  const ramp = object.refs && object.refs.ramp;
  const rp = profileOf(ramp && ramp.components.road ? ramp.components.road.profile : "slip road");
  const curve = throughMatrix(main.components.curve, main.matrix);
  const m = measure(curve);
  const e = mp.deck + mp.kerb, width = 2 * rp.deck;
  // Off-ramp: thin end at `at`, widening to full over the taper, then full to the mouth.
  // On-ramp: the mouth at `at`, full along the parallel, then narrowing to nothing.
  const t = Math.max(1, slip.taper), par = Math.max(0, slip.parallel);
  const from = Math.max(0, Math.min(m.total, slip.at)), to = Math.min(m.total, from + t + par);
  if (to - from < 1) return [];
  const stations = kind === "off-ramp"
    ? [[from, THIN], [from + t, width], [to, width]]
    : [[from, width], [from + par, width], [to, THIN]];
  const mirror = side === "left";
  // The taper's curve: the main road's curve cut at each station, so every station is a curve point
  // carrying its own section.
  const points = [];
  for (let k = 0; k + 1 < stations.length; k++) {
    const [d0, w0] = stations[k], [d1] = stations[k + 1];
    if (d1 - d0 < 0.01) continue;
    const pts = piece(m, d0, d1);
    if (points.length) { points[points.length - 1].handle_out = pts[0].handle_out; pts.shift(); }
    else pts[0].section = taperSection(mp, e, w0, mirror, nat).outline;
    pts[pts.length - 1].section = taperSection(mp, e, stations[k + 1][1], mirror, nat).outline;
    // Points inside a stretch (where the main curve has a point of its own) take the width they fall at.
    for (let i = 0; i + 1 < pts.length; i++) {
      if (pts[i].section) continue;
      const along = nearestAlong(m, pts[i].position, d0, d1);
      const f = (along - d0) / (d1 - d0);
      pts[i].section = taperSection(mp, e, w0 + (stations[k + 1][1] - w0) * f, mirror, nat).outline;
    }
    for (const q of pts) points.push(q);
  }
  const { outline, roles } = taperSection(mp, e, width, mirror, nat);
  const faces = {};
  roles.forEach((role, i) => {
    if (role === "grass") faces["band " + (i + 1)] = GRASS;
    else if (role === "kerb") faces["band " + (i + 1)] = KERB;
  });
  faces["start"] = faces["end"] = GRASS;
  const ground = object.refs && object.refs.ground ? object.refs.ground.id : null;
  const blend = slip.blend >= 0 ? slip.blend : main.components.road.blend != null ? main.components.road.blend : 1.5;
  const interval = main.components.road.interval > 0 ? main.components.road.interval : 2;
  const shape = { shape: "Sweep", outline, follow: "Upright", rings: "Square", interval, faces, blend };
  if (ground) shape[JOINS] = ground;
  // The ramp mouth: the middle of the full-width lane where the ramp road meets it.
  const mouthAt = kind === "off-ramp" ? to : from;
  const sgn = mirror ? -1 : 1;
  const path = pw.curve.path(curve);
  const mouth = path.offset(mouthAt, sgn * (e + width / 2), 0);
  const r3d = (v) => Math.round(v * 1000) / 1000;
  return [
    {
      name: "taper",
      components: { world_shape: shape, curve: { closed: false, points }, material: { asset: mp.material } },
    },
    {
      name: "ramp mouth",
      position: mouth.map(r3d),
      components: {
        road_link: {
          main: main.name, ramp: ramp ? ramp.name : "", kind, side,
          main_from: r3d(from), main_to: r3d(to), mouth: r3d(mouthAt),
        },
      },
    },
  ];
}

// How far along a measured curve the point nearest `q` is, between d0 and d1.
function nearestAlong(m, q, d0, d1) {
  const path = { at: (d) => { const [i, u] = locate(m, d); return bezier(m.spans[i], u); } };
  let best = d0, bestD = Infinity;
  for (let d = d0; d <= d1; d += 0.5) {
    const p = path.at(d), e = Math.hypot(p[0] - q[0], p[2] - q[2]);
    if (e < bestD) { bestD = e; best = d; }
  }
  return best;
}

// ---- Approaches: turn lanes ----------------------------------------------------------------------
// An `approach` sets one arm of a junction apart (Design, "Junction control, turn lanes and crossings").
// For now it adds turn lanes: the arm widens on the turning side over `taper` metres, then runs a full
// lane wide for `length` metres up to the mouth. The approach builds that lane along the road's own
// curve (the slip's widening Sweep); the junction, naming the approach in approach_1…, widens its pad
// at that mouth so the lane runs on into it. Sides are as the traffic coming in sees them.
pw.defineComponent("approach", {
  junction: pw.object({ doc: "The junction this arm belongs to. Name this approach on the junction too (approach_1…)." }),
  road: pw.object({ doc: "The arm's road." }),
  dir: pw.oneOf("in", "out", { doc: "Which of the road's arms at the junction: in where going forward along the road enters it, out where it leaves." }),
  turn: pw.oneOf("none", "left", "right", "both", { doc: "Turn lanes: on the incoming traffic's left, right or both sides." }),
  length: pw.float(40, { unit: "m", range: [5, 200], doc: "How long the full-width turn lane runs before the mouth." }),
  taper: pw.float(20, { unit: "m", range: [5, 200], doc: "How long it takes to widen to full width." }),
  ground: pw.object({ doc: "The ground's group, as the roads' ground." }),
}, {
  build(approach, object) {
    return buildApproach(approach, object);
  },
});

function buildApproach(approach, object) {
  const j = object.refs && object.refs.junction, road = object.refs && object.refs.road;
  if (!j || !j.components.junction || !road || !road.components.curve) return [];
  const turn = pick(approach.turn, TURNS);
  if (turn === "none") return [];
  const dir = pick(approach.dir, ["in", "out"]);
  const p = profileOf(road.components.road ? road.components.road.profile : "two-lane");
  const nat = isNatural(road.components.road);
  const curve = throughMatrix(road.components.curve, road.matrix);
  const m = measure(curve);
  const path = pw.curve.path(curve);
  const centre = [j.matrix[9], j.matrix[10], j.matrix[11]];
  const gaps = within(path, centre, mouthOf(j.components.junction));
  if (!gaps.length) return [];
  // The mouth this arm reaches: the gap's start for an incoming arm, its end for an outgoing one.
  const g = gaps[0];
  const dm = dir === "in" ? g[0] : g[1];
  if ((dir === "in" && dm <= 0.01) || (dir === "out" && dm >= m.total - 0.01)) return [];
  const e = p.deck + p.kerb, w = p.deck, len = approach.length, tap = approach.taper;
  // Stations along the road, from far to the mouth (and 0.5 m on into the pad).
  const stations = dir === "in"
    ? [[dm - len - tap, THIN], [dm - len, w], [dm + OVERLAP, w]]
    : [[dm - OVERLAP, w], [dm + len, w], [dm + len + tap, THIN]];
  for (const st of stations) st[0] = Math.max(0, Math.min(m.total, st[0]));
  // Incoming traffic drives forward along the road on an "in" arm, backward on an "out" arm; its left
  // is the road's left (−across) on "in", the road's right on "out".
  const sides = [];
  if (turn === "left" || turn === "both") sides.push(dir === "in" ? "left" : "right");
  if (turn === "right" || turn === "both") sides.push(dir === "in" ? "right" : "left");
  const ground = object.refs && object.refs.ground ? object.refs.ground.id : null;
  const blend = road.components.road && road.components.road.blend != null ? road.components.road.blend : 1.5;
  return sides.map((side) => {
    const mirror = side === "left";
    const points = [];
    for (let k = 0; k + 1 < stations.length; k++) {
      const [d0, w0] = stations[k], [d1, w1] = stations[k + 1];
      if (d1 - d0 < 0.01) continue;
      const pts = piece(m, d0, d1);
      if (points.length) { points[points.length - 1].handle_out = pts[0].handle_out; pts.shift(); }
      else pts[0].section = taperSection(p, e, w0, mirror, nat).outline;
      pts[pts.length - 1].section = taperSection(p, e, w1, mirror, nat).outline;
      for (let i = 0; i + 1 < pts.length; i++) {
        if (pts[i].section) continue;
        const f = (nearestAlong(m, pts[i].position, d0, d1) - d0) / (d1 - d0);
        pts[i].section = taperSection(p, e, w0 + (w1 - w0) * f, mirror, nat).outline;
      }
      for (const q of pts) points.push(q);
    }
    const { outline, roles } = taperSection(p, e, w, mirror, nat);
    const faces = {};
    roles.forEach((role, i) => {
      if (role === "grass") faces["band " + (i + 1)] = GRASS;
      else if (role === "kerb") faces["band " + (i + 1)] = KERB;
    });
    faces["start"] = faces["end"] = GRASS;
    const shape = { shape: "Sweep", outline, follow: "Upright", rings: "Square", interval: 1, faces, blend };
    if (ground) shape[JOINS] = ground;
    return { name: "turn lane " + side, components: { world_shape: shape, curve: { closed: false, points }, material: { asset: p.material } } };
  });
}
