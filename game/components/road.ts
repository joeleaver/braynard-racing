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
// Signal heads, grey-box: the poles and heads wear the parapet's grey; each lamp wears its colour's
// "Signal lamp" material (materials/signal_lamp.material.wgsl), whose `on` game code sets per lamp.
const SIGNAL_GREY = "01M7TXFYWMQTG4T8QK8K89JRY2";
const SIGNAL_LAMP = { red: "01M82DQB7H9V8EKH8RG6N0S2QW", amber: "01M82DQCSRSATFASKQZGCKGGNF", green: "01M82DQE41AMV0SNFC17TY9Z82" };

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
// How far a natural road's embankment runs on in under a bridge at each end, sinking by its depth + 2 m
// (1 in 2), so the bank slopes away into the ground with no square end face.
const ABUTMENT = 8;
// How far below the deck the tail's top starts under the bridge.
const ABUT_BELOW = 0.15;
// How deep a natural road's banks run near a bridge. The profiles' own depth (2 m) left the bank's toe
// standing in the air where a road rides up onto a bridge (the Lane's approach stands 6 m up), its square
// ends a sawtooth every interval. Builders can't read the ground yet (asked of Playweft), so the bank
// deepens where fills are: FILL_DEPTH at a bridge's end, easing back to the profile's depth over FILL_RUN
// metres. Where the ground is higher the extra bank is hidden in it.
const FILL_DEPTH = 6;
const FILL_RUN = 80;
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
// How far a cutting's rim is rounded. 0 for now: on Playweft 2026.11.22-f5f67017 a rounded cut (0.4) stalls
// the build and Studio's memory climbs (seen on Home Farm and on the scratch 6-way). Try again for the
// sawtooth at a cut's rim once Playweft's memory fix and #666 are in.
const CUT_BLEND = 0;
// How far a junction's cutting reaches along each arm, past the mouth.
const CUT_REACH = 3;
// A roundabout's islands stand this far above the deck, kerbed, and go this deep.
const ISLAND_UP = 0.15;
const ISLAND_DEPTH = 0.6;
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

// How far before a junction's line the centre line turns to long warning dashes.
const WARN = 30;
// How far a splitter island's hatching runs on from its point.
const NOSE = 10;
const RULE_CODES = { "give way": 1, stop: 2, lights: 3 };

// A road's rule where it meets a junction, as the junction's rulesOf gives it, worked out from the
// junction alone: its control, and whether this road is one of its priority roads. A build doesn't know
// its own object's id yet (asked of Playweft); until it does, a road at a junction that names a priority
// road can't tell whether it is that road, and draws no line ("priority").
function ruleFor(j, roadId) {
  const jn = j.components.junction;
  const control = controlOf(jn);
  if (control === "lights") return "lights";
  if (control === "all-way stop") return "stop";
  // A roundabout's give-way line is drawn by its pad, round the ring; the road draws none.
  if (control === "roundabout") return "priority";
  const minor = control === "stop" ? "stop" : "give way";
  const pri = [jn.priority, jn.priority_2].filter(Boolean);
  if (!pri.length) return minor;
  if (roadId === undefined) return "priority";
  return pri.includes(roadId) ? "priority" : minor;
}

// The material values that draw the lines across the way in on a span from d0 to d1 (and the warning
// dashes before them), or null. In the span's own u (metres from d0). Traffic driving toward larger d meets
// its line at the span's end side (_b); toward smaller d, at its start side (_a).
function linesOn(mouths, d0, d1) {
  const v = {};
  const r3 = (x) => Math.round(x * 1000) / 1000;
  for (const mo of mouths) {
    // Hatching on from a roundabout splitter's point, away from the junction.
    if (mo.nose > 0 && mo.point > d0 - NOSE && mo.point < d1 + NOSE) {
      v[mo.toward > 0 ? "nose_b" : "nose_a"] = [r3(mo.point - d0), mo.toward > 0 ? -NOSE : NOSE, r3(mo.nose), 0];
    }
    const code = RULE_CODES[mo.rule] || 0;
    if (!code) continue;
    if (mo.toward > 0) {
      if (mo.at < d0 - 1 || mo.at - WARN > d1) continue;
      v.stop_b = Math.round((mo.at - d0) * 1000) / 1000;
      v.rule_b = code;
      v.warn_b = WARN;
    } else {
      if (mo.at > d1 + 1 || mo.at + WARN < d0) continue;
      if (mo.at >= d0) {
        v.stop_a = Math.round((mo.at - d0) * 1000) / 1000;
        v.rule_a = code;
        v.warn_a = WARN;
      } else {
        v.warn_a = Math.round((mo.at + WARN - d0) * 1000) / 1000;
      }
    }
  }
  return Object.keys(v).length ? v : null;
}

// How each profile's deck is marked, as its material says (assets "Road deck: …"), for carrying a
// priority road's lines across a pad: [lanes out, line width, edge width, centre (1 dashed, 2 solid)],
// [dash, period].
const MARKS = {
  "two-lane": [[3.5, 0.12, 0.15, 1], [4, 12]],
  "back lane": [[3, 0.1, 0.12, 1], [3, 12]],
  "slip road": [[2.5, 0.12, 0.15, 0], [4, 12]],
  "freeway": [[15, 0.15, 0.2, 0], [4, 9]],
};

// A pad's material values (materials/road_deck.material.wgsl, role 1 or 2): its mouths in its own space,
// and the priority road's way through, or a roundabout's ring.
function padMarks(arms, rules, pad, round, junction) {
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const v = { role: round ? 2 : 1, arms: Math.min(6, arms.length) };
  arms.slice(0, 6).forEach((arm, i) => {
    const a = pad.local(arm.p), b = pad.local(add(arm.p, arm.u));
    v["mouth_" + (i + 1)] = [r3(a[0]), r3(a[2]), r3(Math.atan2(b[2] - a[2], b[0] - a[0])), r3(arm.half)];
  });
  if (round) {
    const island = junction.island > 0 ? junction.island : 8;
    v.ring = [island, island + (junction.ring > 0 ? junction.ring : 8), 0, 0];
    return v;
  }
  // The priority road runs through between its two arms (a road's two arms share its id).
  const byRoad = {};
  rules.forEach((r, i) => { if (r.rule === "priority" && i < 6) (byRoad[arms[i].id] = byRoad[arms[i].id] || []).push(i + 1); });
  let n = 0;
  for (const id of Object.keys(byRoad)) {
    const ends = byRoad[id];
    if (ends.length < 2 || n >= 2) continue;
    n++;
    v["through_" + n] = [ends[0], ends[1], 0, 0];
    const marks = MARKS[arms[ends[0] - 1].profile] || MARKS["two-lane"];
    if (n === 1) { v.through_w = marks[0]; v.through_d = marks[1]; }
  }
  return v;
}

// The whole natural cross-section: a crowned deck, edge strips, rolled shoulders and banks. `level`
// takes the crossfall away (where the road meets a junction). Same number of points either way.
function naturalSection(p, level, deep) {
  const n = p.natural, cf = level ? 0 : n.crossfall, y = DECK_Y, depth = deep > n.depth ? deep : n.depth;
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
    // Each mouth where traffic comes in, for the lines across the way in: where along the road the line
    // is, which way the traffic drives there (+1 toward larger d), and the junction's rule for this road.
    const mouths = [];
    for (const field of JUNCTION_FIELDS) {
      const j = object.refs && object.refs[field];
      if (!j || !j.components.junction) continue;
      const centre = [j.matrix[9], j.matrix[10], j.matrix[11]];
      const rule = ruleFor(j, object.id);
      // A roundabout's splitter island reaches 4 m out onto the road, ending in a point (buildJunction).
      const round = pick(j.components.junction.kind, ["crossroads", "roundabout"]) === "roundabout";
      const nose = round ? Math.min(1.6, (p.deck + p.kerb) * 0.45) : 0;
      for (const g of within(path, centre, mouthOf(j.components.junction))) {
        gaps.push(g);
        if (g[0] > 0.01) mouths.push({ at: g[0] - STOP_OUT, toward: 1, rule, nose, point: g[0] - 4 });
        if (g[1] < m.total - 0.01) mouths.push({ at: g[1] + STOP_OUT, toward: -1, rule, nose, point: g[1] + 4 });
      }
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
    const bridgeEnds = [];
    for (const pc of pieces) if (pc.kind === "bridge") bridgeEnds.push(pc.d0, pc.d1);
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
      // How deep the bank runs at a distance along the road: deep at a bridge's ends, easing back.
      const deepAt = (d) => {
        let near = Infinity;
        for (const b of bridgeEnds) near = Math.min(near, Math.abs(d - b));
        return near >= FILL_RUN ? 0 : p.natural.depth + (FILL_DEPTH - p.natural.depth) * (1 - near / FILL_RUN);
      };
      const deepSpan = natural && !isBridge && bridgeEnds.some((b) => b > d0 - FILL_RUN && b < d1 + FILL_RUN);
      if (deepSpan) {
        // Every point carries its own section (a loft), by its distance along: the chord length from d0.
        let along = d0;
        points.forEach((q, i) => {
          if (i > 0) along += Math.hypot(q.position[0] - points[i - 1].position[0], q.position[2] - points[i - 1].position[2]);
          const lvl = EASE_LOFT && ((i === 0 && levelStart) || (i === points.length - 1 && levelEnd));
          q.section = naturalSection(p, lvl, deepAt(Math.min(along, d1))).outline;
        });
      } else if (EASE_LOFT && natural && !isBridge && (levelStart || levelEnd)) {
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
      const lines = isBridge ? null : linesOn(mouths, d0, d1);
      if (ground && !isBridge) shape[JOINS] = ground;
      const a = points[0].position, b = points[points.length - 1].position;
      out.push({
        name: name(k),
        components: {
          world_shape: shape,
          curve: { closed: false, points },
          material: { asset: p.material },
          ...(lines ? { material_values: lines } : {}),
          road_segment: {
            road: object.name, index: k + 1, kind: isBridge ? "bridge" : "road", profile: profileName(road.profile),
            start: Math.round(d0 * 1000) / 1000, length: Math.round((d1 - d0) * 1000) / 1000,
            previous: joinsBefore ? name(k - 1) : "", next: joinsAfter ? name(k + 1) : "",
            start_x: a[0], start_y: a[1], start_z: a[2], end_x: b[0], end_y: b[1], end_z: b[2],
          },
        },
      });
      if (isBridge && natural) {
        // The embankment's ends at a bridge: the road's own section carried ABUTMENT metres in under the
        // bridge, sinking as it goes, so the bank slopes away forwards with no square end face.
        // Under the bridge's own width the tail starts a little below the deck: a top level with it tied
        // with the deck for the surface and showed through as grass; much lower, and the road's rounded end
        // left a groove at the joint. Beyond the parapets it carries the shoulder on.
        const sec = naturalSection(p, true, FILL_DEPTH);
        const sink = p.natural.depth + 2;
        const w = p.deck + BRIDGE.parapet, below = DECK_Y - ABUT_BELOW;
        const top = sec.outline.map(([a, b]) => [a, Math.abs(a) <= w ? Math.min(b, below) : b]);
        const sunk = top.map(([a, b]) => [a, Math.round((b - sink) * 1000) / 1000]);
        for (const [end, from, to] of [["start", d0, Math.min(d1, d0 + ABUTMENT)], ["end", Math.max(d0, d1 - ABUTMENT), d1]]) {
          const pts = piece(m, from, to);
          pts[0].section = end === "start" ? top : sunk;
          pts[pts.length - 1].section = end === "start" ? sunk : top;
          const faces = Object.assign({}, sec.faces);
          delete faces[end === "start" ? "start" : "end"];          // the face against the road is inside it
          const tail = { shape: "Sweep", outline: top, follow: "Upright", rings: "Square", interval: 1, faces, blend: road.blend };
          if (ground) tail[JOINS] = ground;
          out.push({ name: "abutment " + end, components: { world_shape: tail, curve: { closed: false, points: pts }, material: { asset: GRASS } } });
        }
      }
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
  green: pw.float(18, { unit: "s", range: [4, 120], group: "Control", doc: "With lights: how long each phase is green." }),
  priority: pw.object({ group: "Control", doc: "The road with priority through the junction (both its arms), for priority and stop control. None: every arm gives way." }),
  priority_2: pw.object({ group: "Control", doc: "When the priority route turns here: the second road on it. Its arm and the priority road's arm are the pair that run through." }),
  approach_1: pw.object({ group: "Approaches", doc: "An approach object that sets one arm apart: its turn lanes (and later its own rule and crossing)." }),
  approach_2: pw.object({ group: "Approaches", doc: "Another approach." }),
  approach_3: pw.object({ group: "Approaches", doc: "Another approach." }),
  approach_4: pw.object({ group: "Approaches", doc: "Another approach." }),
  approach_5: pw.object({ group: "Approaches", doc: "Another approach." }),
  approach_6: pw.object({ group: "Approaches", doc: "Another approach." }),
  kind: pw.oneOf("crossroads", "roundabout", { group: "Shape", doc: "crossroads: one pad with a rounded corner between each two arms. roundabout: a ring round a raised island, a flared entry from each arm and a splitter island in each mouth." }),
  island: pw.float(8, { unit: "m", range: [2, 60], group: "Shape", doc: "A roundabout's island radius." }),
  ring: pw.float(8, { unit: "m", range: [4, 20], group: "Shape", doc: "A roundabout's carriageway width round the island." }),
  flare: pw.float(10, { unit: "m", range: [2, 40], group: "Shape", doc: "A roundabout's entry and exit radius, between each arm's edge and the ring." }),
  mouth: pw.float(12, { unit: "m", range: [3, 80], doc: "How far from the junction's centre its roads stop. A road reads this too, so name the junction on the road (junction_1…) as well as here." }),
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
  key: pw.text("", { doc: "Names this junction apart from others of the same name: its roads' ids, sorted. Its arms and lamps carry it too." }),
  control: pw.text("priority", { doc: "priority, stop, all-way stop, lights or roundabout." }),
  arms: pw.int(0, { doc: "How many arms." }),
  mouth: pw.float(12, { unit: "m", doc: "How far from the centre the roads stop." }),
  // The signal plan, with lights: phases in turn, each giving green to some signal groups for a time,
  // then amber, then all red. Game code runs it from the race clock, so every player sees the same.
  phases: pw.int(0, { group: "Signals", doc: "How many phases; 0 without lights." }),
  phase_1: pw.text("", { group: "Signals", doc: "The signal groups green in phase 1, as \"1,3\"." }),
  phase_2: pw.text("", { group: "Signals" }),
  phase_3: pw.text("", { group: "Signals" }),
  phase_4: pw.text("", { group: "Signals" }),
  green: pw.float(18, { unit: "s", group: "Signals", doc: "How long each phase is green." }),
  amber: pw.float(3, { unit: "s", group: "Signals", doc: "Amber after each green." }),
  all_red: pw.float(2, { unit: "s", group: "Signals", doc: "All red between phases." }),
  clock: pw.float(0, { unit: "s", group: "Signals", doc: "Seconds the lights have run (systems/signals.ts). Game state, so a rewind or a joining player has it." }),
});

// One lamp of a junction's signal head, as game code finds it: it sets the lamp's brightness (through
// its material's values) from the junction's signal plan and the clock.
pw.defineComponent("signal_lamp", {
  junction: pw.text("", { doc: "The junction object's name." }),
  key: pw.text("", { doc: "Its junction's road_node key." }),
  arm: pw.int(1, { doc: "Which arm's head." }),
  group: pw.int(1, { doc: "The signal group it shows." }),
  colour: pw.oneOf("red", "amber", "green", { doc: "Which lamp." }),
});

// One arm of a junction, in order round its centre (index from 1), as game code and the sign plan read
// it. A through road gives two arms: dir "out" where the road runs on out of the junction, "in" where
// it comes into it.
pw.defineComponent("road_arm", {
  junction: pw.text("", { doc: "The junction object's name." }),
  key: pw.text("", { doc: "Its junction's road_node key." }),
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
    // A point of the junction's space (on the plane) into the shape's own space, for its material values.
    local: (P) => local([P[0], top + b * P[0] + c * P[2], P[2]]),
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

// A roundabout's outline: the ring's outer circle (radius `outer` + widen) joined to each arm's edges by
// an arc of `flare` (less widen) tangent to both the edge and the circle, the arms carried `reach`
// metres out past their mouths. Answers the ring of points (going round as outlineOf does) with
// `corners`: each run from one arm's front mouth end round the circle to the next arm's back mouth end.
function roundaboutOutline(arms, widen, outer, flare, reach) {
  const R = outer + widen, rf = Math.max(0.5, flare - widen), n = arms.length;
  const ring = [];
  ring.corners = [];
  const ang = (p) => Math.atan2(p[2], p[0]);
  const arcPts = (c, r, a1, a2, step) => {
    let sweep = a2 - a1;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    const k = Math.max(2, Math.ceil(Math.abs(sweep) * r / step));
    const out = [];
    for (let i = 1; i < k; i++) {
      const a = a1 + sweep * (i / k);
      out.push([c[0] + Math.cos(a) * r, 0, c[2] + Math.sin(a) * r]);
    }
    return out;
  };
  // The fillet from one edge of an arm to the circle: the points from the edge's tangent point to the
  // circle's, or null when the edge passes too far out to meet it.
  const fillet = (arm, side) => {
    const left = [-arm.u[2], 0, arm.u[0]];
    const sgn = side === "front" ? 1 : -1;
    const h = arm.half + widen + (side === "front" ? (arm.wFront || 0) : (arm.wBack || 0));
    const E = add(arm.p, scaled(left, sgn * h));
    const nrm = scaled(left, sgn);
    const A = add(E, scaled(nrm, rf));
    const au = dotXZ(A, arm.u), aa = A[0] * A[0] + A[2] * A[2];
    const disc = au * au - aa + (R + rf) * (R + rf);
    if (disc < 0) return null;
    const t = au - Math.sqrt(disc);
    if (t < -reach) return null;
    const C = sub(A, scaled(arm.u, t));
    const Tl = sub(E, scaled(arm.u, t));
    const cl = Math.hypot(C[0], C[2]);
    const Tc = [C[0] * R / cl, 0, C[2] * R / cl];
    const pts = [Tl].concat(arcPts(C, rf, Math.atan2(Tl[2] - C[2], Tl[0] - C[0]), Math.atan2(Tc[2] - C[2], Tc[0] - C[0]), 0.75), [Tc]);
    return { E, pts, Tc };
  };
  const ends = arms.map((arm) => ({ front: fillet(arm, "front"), back: fillet(arm, "back") }));
  for (let i = 0; i < n; i++) {
    const arm = arms[i], next = arms[(i + 1) % n];
    const left = [-arm.u[2], 0, arm.u[0]];
    const hb = arm.half + widen + (arm.wBack || 0), hf = arm.half + widen + (arm.wFront || 0);
    const backEnd = add(add(arm.p, scaled(left, -hb)), scaled(arm.u, reach));
    const frontEnd = add(add(arm.p, scaled(left, hf)), scaled(arm.u, reach));
    ring.push(backEnd, frontEnd);
    const corner = { from: i, points: [frontEnd], radius: rf };
    const f = ends[i].front, b = ends[(i + 1) % n].back;
    if (f && b) {
      // Out along this arm's front edge, round its flare, round the circle, round the next arm's flare.
      // The circle runs from this flare round to the next, counter-clockwise; it can't be longer than
      // the gap between the two arms, so a longer one means the flares already meet (no circle between).
      const a1 = ang(f.Tc);
      let a2 = ang(b.Tc);
      while (a2 < a1) a2 += 2 * Math.PI;
      let gap = ang(next.p) - ang(arm.p);
      while (gap <= 0) gap += 2 * Math.PI;
      let run;
      if (a2 - a1 < gap) run = f.pts.concat(bigArc(R, a1, a2), b.pts.slice().reverse());
      else {
        // The two flares cross before they reach the ring: cut both where they cross, so the outline
        // meets in a point there and never crosses itself. The shoulder splits at that point too.
        const x = crossing(f.pts, b.pts);
        if (x) {
          run = f.pts.slice(0, x.i + 1).concat([x.p], b.pts.slice(0, x.j + 1).reverse());
          corner.split = x.i + 2;                    // the index of the meeting point in corner.points
        } else run = f.pts.concat(b.pts.slice().reverse());
      }
      for (const q of run) { ring.push(q); corner.points.push(q); }
    }
    const nl = [-next.u[2], 0, next.u[0]];
    const nb = add(add(next.p, scaled(nl, -(next.half + widen + (next.wBack || 0)))), scaled(next.u, reach));
    corner.points.push(nb);
    ring.corners.push(corner);
  }
  return ring;
}

// Where two polylines cross (in x and z): the segment indices and the point, or null.
function crossing(a, b) {
  for (let i = 0; i + 1 < a.length; i++) {
    for (let j = 0; j + 1 < b.length; j++) {
      const p = a[i], r = sub(a[i + 1], a[i]), q = b[j], t2 = sub(b[j + 1], b[j]);
      const den = r[0] * t2[2] - r[2] * t2[0];
      if (Math.abs(den) < 1e-9) continue;
      const qp = sub(q, p);
      const t = (qp[0] * t2[2] - qp[2] * t2[0]) / den, u = (qp[0] * r[2] - qp[2] * r[0]) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { i, j, p: add(p, scaled(r, t)) };
    }
  }
  return null;
}

// Points along the circle of radius R from angle a1 up to a2 (counter-clockwise in atan2's sense).
function bigArc(R, a1, a2) {
  const k = Math.max(2, Math.ceil((a2 - a1) * R / 1.0));
  const out = [];
  for (let i = 1; i < k; i++) {
    const a = a1 + (a2 - a1) * (i / k);
    out.push([Math.cos(a) * R, 0, Math.sin(a) * R]);
  }
  return out;
}

// A flat-topped raised island on the plane: an Extrude with kerb walls and a grass top.
function islandChild(name, outline2d, top, plane, ground) {
  const ring = outline2d.map(([x, z]) => [x, 0, z]);
  const isl = onPlane(ring, top, plane.b, plane.c, ISLAND_DEPTH);
  const faces = { top: GRASS, bottom: GRASS };
  for (let w = 1; w <= isl.outline.length; w++) faces["wall " + w] = KERB;
  const shape = { shape: "Extrude", outline: isl.outline, faces, blend: 0 };
  if (ground) shape[JOINS] = ground;
  return { name, position: isl.position, rotation: isl.rotation, scale: [1, ISLAND_DEPTH, 1], components: { world_shape: shape, material: { asset: GRASS } } };
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
  // The end faces stay the pad's tarmac: they stand at the mouths, where a grass face showed as a thin
  // green line across the road wherever it rose a hair above the deck.
  const faces = {};
  roles.forEach((role, i) => {
    if (role === "grass") faces["band " + (i + 1)] = GRASS;
  });
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
  // Junction objects share names; their roads don't share ids.
  const key = [...new Set(arms.map((a) => a.id))].sort().join("+");
  const children = [{
    name: "node",
    position: [0, y, 0],
    components: { road_node: { junction: object.name, key, control: controlOf(junction), arms: arms.length, mouth: mouthOf(junction) } },
  }];
  const rules = rulesOf(junction, object, arms);
  // With lights: one phase per signal group, in order round the junction (at most four).
  if (controlOf(junction) === "lights") {
    const groups = [...new Set(rules.map((r) => r.group))].sort((a, b) => a - b).slice(0, 4);
    const node = children[0].components.road_node;
    node.phases = groups.length;
    groups.forEach((g, k) => { node["phase_" + (k + 1)] = String(g); });
    node.green = junction.green > 0 ? junction.green : 18;
    node.amber = 3;
    node.all_red = 2;
  }
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
          junction: object.name, key, index: i + 1, road: arm.road, dir: arm.dir, at: rd(arm.at),
          heading: Math.round(Math.atan2(arm.u[2], arm.u[0]) * 1800 / Math.PI) / 10,
          half_width: arm.half, profile: arm.profile, rule: rules[i].rule, signal_group: rules[i].group,
          stop_at: rd(mouthOf(junction) + STOP_OUT),
          stop_l_x: rd(l[0]), stop_l_y: rd(sy), stop_l_z: rd(l[2]), stop_r_x: rd(r[0]), stop_r_y: rd(sy), stop_r_z: rd(r[2]),
        },
        // The stop line across the way in, from the road's middle to its incoming edge (Braynard drives on
        // the left), as a curve: game code reads a curve in the world, so rivals find the line wherever the
        // junction stands.
        curve: { closed: false, points: [{ position: [0, 0, 0], handle_in: [0, 0, 0], handle_out: [0, 0, 0] }, { position: [rd(l[0] - mid[0]), 0, rd(l[2] - mid[2])], handle_in: [0, 0, 0], handle_out: [0, 0, 0] }] },
      },
    });
  });
  if (controlOf(junction) === "lights") {
    // A grey-box signal head at each arm's stop line, on the incoming traffic's left (Braynard drives on
    // the left; traffic comes in against the arm's heading u, and its left is then +[-u.z, 0, u.x], the
    // arm's front edge): a pole, a head and three lamps facing the traffic. The art comes later through
    // hifipushie, by these names.
    arms.forEach((arm, i) => {
      const left = [-arm.u[2], 0, arm.u[0]];
      const d = STOP_OUT + 0.5;
      const base = add(add(arm.p, scaled(arm.u, d)), scaled(left, arm.half + (arm.wFront || 0) + 1.0));
      const by = y + plane.b * base[0] + plane.c * base[2];
      const rd = (v) => Math.round(v * 1000) / 1000;
      const yaw = Math.round(-Math.atan2(arm.u[2], arm.u[0]) * 1800 / Math.PI) / 10;
      const g = rules[i].group, nm = "arm " + (i + 1) + " lights";
      children.push({
        name: nm + " pole", position: [rd(base[0]), rd(by + 1.6), rd(base[2])], scale: [0.16, 3.2, 0.16],
        components: { world_shape: { shape: "Cylinder" }, material: { asset: SIGNAL_GREY } },
      });
      children.push({
        name: nm + " head", position: [rd(base[0]), rd(by + 3.0), rd(base[2])], rotation: [0, yaw, 0], scale: [0.3, 1.0, 0.36],
        components: { world_shape: { shape: "Box" }, material: { asset: SIGNAL_GREY } },
      });
      ["red", "amber", "green"].forEach((colour, k) => {
        const at = add(base, scaled(arm.u, 0.24));
        children.push({
          name: nm + " " + colour, position: [rd(at[0]), rd(by + 3.3 - k * 0.3), rd(at[2])], scale: [0.2, 0.2, 0.2],
          components: { mesh: { shape: "Sphere", cast_shadows: false }, material: { asset: SIGNAL_LAMP[colour] }, signal_lamp: { junction: object.name, key, arm: i + 1, group: g, colour } },
        });
      });
    });
  }
  if (arms.length < 2) return children;
  const depth = junction.depth;
  // The pad: tarmac on top only; its walls and bottom are grass, so where a round passes over its edge
  // it reads as a kerbed apron into the verge.
  const round = pick(junction.kind, ["crossroads", "roundabout"]) === "roundabout";
  const outer = (junction.island > 0 ? junction.island : 8) + (junction.ring > 0 ? junction.ring : 8);
  const flareR = junction.flare > 0 ? junction.flare : 10;
  const shapeOf = (widen, reach) => round ? roundaboutOutline(arms, widen, outer, flareR, reach) : outlineOf(arms, widen, junction.radius, reach);
  const padRing = shapeOf(0, OVERLAP);
  const pad = onPlane(padRing, y, plane.b, plane.c, depth);
  const padFaces = { bottom: GRASS };
  for (let w = 1; w <= pad.outline.length; w++) padFaces["wall " + w] = GRASS;
  const padShape = { shape: "Extrude", outline: pad.outline, faces: padFaces, blend: junction.blend };
  if (ground) padShape[JOINS] = ground;
  children.push({ name: "pad", position: pad.position, rotation: pad.rotation, scale: [1, depth, 1], components: { world_shape: padShape, material: { asset: PLAIN }, material_values: padMarks(arms, rules, pad, round, junction) } });
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
    const cut = onPlane(shapeOf(reachOut, CUT_REACH), y - CUT_BELOW + CUT_H, plane.b, plane.c, CUT_H);
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
      // A corner that meets in a point (two flares crossing) gets a shoulder each side of the point.
      const parts = corner.split ? [
        { from: corner.from, points: corner.points.slice(0, corner.split + 1), radius: corner.radius },
        { from: corner.from, points: corner.points.slice(corner.split), radius: corner.radius },
      ] : [corner];
      parts.forEach((part, k) => {
        const sh = shoulderSweep(prof, part, (q) => y + plane.b * q[0] + plane.c * q[2]);
        if (!sh) return;
        sh.shape.blend = junction.verge_blend;
        if (ground) sh.shape[JOINS] = ground;
        children.push({ name: "shoulder " + (i + 1) + (parts.length > 1 ? "abc"[k] : ""), components: { world_shape: sh.shape, curve: sh.curve, material: { asset: PLAIN } } });
      });
    });
  } else if (verge > 0) {
    const ring = onPlane(shapeOf(verge, OVERLAP), y - VERGE_STEP, plane.b, plane.c, depth);
    const vShape = { shape: "Extrude", outline: ring.outline, blend: junction.verge_blend };
    if (ground) vShape[JOINS] = ground;
    children.push({ name: "verge", position: ring.position, rotation: ring.rotation, scale: [1, depth, 1], components: { world_shape: vShape, material: { asset: GRASS } } });
  }
  if (round) {
    // The island in the middle, and a splitter island in each arm's mouth along its centre line, from
    // just off the ring out onto the road: wide and round by the ring, narrowing to a point.
    const islandR = junction.island > 0 ? junction.island : 8;
    const disc = [];
    for (let k = 0; k < 32; k++) disc.push([Math.cos(k * Math.PI / 16) * islandR, Math.sin(k * Math.PI / 16) * islandR]);
    children.push(islandChild("island", disc, y + ISLAND_UP, plane, ground));
    arms.forEach((arm, i) => {
      const left = [-arm.u[2], 0, arm.u[0]];
      const at = (d, across) => add(add(arm.p, scaled(arm.u, d - mouthOf(junction))), scaled(left, across));
      const w0 = Math.min(1.6, arm.half * 0.45), d0 = outer + 1.5, d1 = mouthOf(junction) + 4;
      if (d1 - d0 < 2 * w0 + 2) return;
      const c0 = d0 + w0, pts = [];
      for (let k = 0; k <= 8; k++) {                  // the round end by the ring, from one side to the other
        const a = Math.PI / 2 + Math.PI * (k / 8);
        pts.push(at(c0 + Math.cos(a) * w0, Math.sin(a) * w0));
      }
      pts.push(at(d1, -0.3), at(d1 + 0.3, 0), at(d1, 0.3));
      children.push(islandChild("splitter " + (i + 1), pts.map((q) => [q[0], q[2]]), y + ISLAND_UP, plane, ground));
    });
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
  terrain: pw.object({ doc: "The ground's own shape (its Height Map): where the main road cuts the ground, the taper does too." }),
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

// A taper's cutting: under the taper's top surface by CUT_BELOW from inside the main road's deck out to
// the end of its shoulder, then up the cutting side to CUT_H. Same number of points at every width, so
// it lofts with the taper.
function taperCut(p, e, w, mirror, natural) {
  const cf = natural ? p.natural.crossfall : 0;
  const yAt = (x) => DECK_Y - x * cf;
  const inner = e - 0.3, out = e + w;
  let chain;
  if (natural) chain = [[inner, yAt(inner)], [out, yAt(out)]].concat(shoulderOut(p.natural, out, yAt(out), cf, p.natural.depth).slice(0, 5).map(([a, b]) => [a, b]));
  else {
    const vy = DECK_Y - VERGE_STEP;
    chain = [[inner, DECK_Y], [out, DECK_Y], [out + 0.01, vy], [out + p.verge, vy], [out + p.verge + 0.01, vy], [out + p.verge + 0.02, vy], [out + p.verge + 0.03, vy]];
  }
  chain = chain.map(([a, b]) => [a, b - CUT_BELOW]);
  const [xe, ye] = chain[chain.length - 1];
  let outline = chain.concat([[xe + (CUT_H - ye) * CUT_SLOPE, CUT_H], [inner, CUT_H]]);
  // Round the outline the other way for a Sweep: the chain runs along the bottom, left to right.
  if (mirror) outline = outline.map(([a, b]) => [-a, b]).reverse();
  return outline.map(([a, b]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]);
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
    else { pts[0].section = taperSection(mp, e, w0, mirror, nat).outline; pts[0]._w = w0; }
    pts[pts.length - 1].section = taperSection(mp, e, stations[k + 1][1], mirror, nat).outline;
    pts[pts.length - 1]._w = stations[k + 1][1];
    // Points inside a stretch (where the main curve has a point of its own) take the width they fall at.
    for (let i = 0; i + 1 < pts.length; i++) {
      if (pts[i].section) continue;
      const along = nearestAlong(m, pts[i].position, d0, d1);
      const f = (along - d0) / (d1 - d0);
      pts[i]._w = w0 + (stations[k + 1][1] - w0) * f;
      pts[i].section = taperSection(mp, e, pts[i]._w, mirror, nat).outline;
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
  // On a crowned (natural) main road the lane is lower out at its edge by the crossfall: the ramp meets
  // it there.
  const fall = nat ? (e + width / 2) * mp.natural.crossfall : 0;
  const mouth = path.offset(mouthAt, sgn * (e + width / 2), -fall);
  const r3d = (v) => Math.round(v * 1000) / 1000;
  const widths = points.map((q) => q._w);
  for (const q of points) delete q._w;
  // Where the main road cuts the ground, so does the taper, widening with it.
  const terrain = object.refs && object.refs.terrain ? object.refs.terrain.id : null;
  const cutKids = [];
  if (terrain) {
    const cutPts = points.map((q, i) => ({ position: q.position, handle_in: q.handle_in, handle_out: q.handle_out, section: taperCut(mp, e, widths[i] != null ? widths[i] : width, mirror, nat) }));
    cutKids.push({
      name: "clear",
      components: {
        world_shape: { shape: "Sweep", operation: "Subtract", outline: taperCut(mp, e, width, mirror, nat), follow: "Upright", rings: "Square", interval: 1, cuts: terrain, blend: CUT_BLEND },
        curve: { closed: false, points: cutPts },
      },
    });
  }
  return cutKids.concat([
    {
      name: "taper",
      components: {
        world_shape: shape, curve: { closed: false, points }, material: { asset: mp.material },
        // Its edge line and the chevrons at its thin end (materials/road_deck.material.wgsl, role 3), in
        // the main road's u (from this taper's start) and across.
        material_values: {
          role: 3, taper_e: [e, mirror ? -1 : 1, 0, 0],
          taper_w1: [0, stations[0][1], stations[1][0] - from, stations[1][1]].map((x) => Math.round(x * 1000) / 1000),
          taper_w2: [stations[1][0] - from, stations[1][1], stations[2][0] - from, stations[2][1]].map((x) => Math.round(x * 1000) / 1000),
        },
      },
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
  ]);
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
  // The line across the turn lane and its arrows (materials/road_deck.material.wgsl, role 4), in the
  // road's u from the lane's start: traffic drives along +u on an "in" arm, -u on an "out" arm.
  const dirSign = dir === "in" ? 1 : -1;
  const uLine = dir === "in" ? dm - STOP_OUT - stations[0][0] : dm + STOP_OUT - stations[0][0];
  const code = RULE_CODES[ruleFor(j, road.id)] || 0;
  return sides.map((side) => {
    const mirror = side === "left";
    // The way it turns, to the traffic: on an "in" arm the road's left is the traffic's left.
    const turnsLeft = dir === "in" ? mirror : !mirror;
    const r3 = (x) => Math.round(x * 1000) / 1000;
    const marks = {
      role: 4,
      lane: [r3((mirror ? -1 : 1) * (e + w / 2)), r3(w / 2), dirSign, turnsLeft ? 2 : 3],
      arrows: [r3(uLine - dirSign * 12), r3(uLine - dirSign * 24), 0, 0],
      lane_line: [r3(uLine), code, 0, 0],
    };
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
    return { name: "turn lane " + side, components: { world_shape: shape, curve: { closed: false, points }, material: { asset: p.material }, material_values: marks } };
  });
}
