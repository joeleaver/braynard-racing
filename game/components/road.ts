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
// Play, so game code finds the road graph by looking for `road_segment` and `road_crossing` cards.
//
// A `junction` names the roads it joins and adds what goes between them. For now that's two roads
// crossing at grade as through-roads, at one height: the junction fills the four corners with
// rounded tarmac fillets and leaves a `road_crossing` card where they cross.

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
// `repeat`, with the bridge's ends (rounded out to the repeat) as cuts of their own.
function cutsOf(total, aim, repeat, bridge) {
  const step = Math.max(repeat, Math.round(aim / repeat) * repeat);
  const fixed = [0];
  if (bridge) fixed.push(bridge[0], bridge[1]);
  fixed.push(total);
  const cuts = [];
  for (let k = 0; k + 1 < fixed.length; k++) {
    const a = fixed[k], b = fixed[k + 1];
    cuts.push(a);
    if (bridge && a === bridge[0]) continue;      // the bridge is one span
    let d = a + step;
    while (d < b - step * 0.5) { cuts.push(d); d += step; }
  }
  cuts.push(total);
  return cuts;
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
    const cuts = cutsOf(m.total, road.span > 0 ? road.span : p.span, rep, bridge);
    const ground = object.refs && object.refs.ground ? object.refs.ground.id : null;
    const count = cuts.length - 1;
    const name = (k) => "span " + (k + 1);
    const out = [];
    let last = null;
    for (let k = 0; k < count; k++) {
      const d0 = cuts[k], d1 = cuts[k + 1];
      const isBridge = bridge !== null && d0 === bridge[0];
      const points = piece(m, d0, d1);
      if (last) points[0].position = last;               // the joint is one point, exactly
      last = points[points.length - 1].position;
      const { outline, faces } = section(p, isBridge);
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
            previous: k > 0 ? name(k - 1) : "", next: k + 1 < count ? name(k + 1) : "",
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

// The distance along `path` nearest to `point` (in x and z), searched every `step` metres between
// `from` and `to`, then narrowed.
function nearest(path, point, from, to, step) {
  const off = (d) => { const q = path.at(d).position; return Math.hypot(q[0] - point[0], q[2] - point[2]); };
  from = Math.max(0, from); to = Math.min(path.length, to);
  let best = from, bestD = off(from);
  for (let d = from + step; d <= to; d += step) {
    const e = off(d);
    if (e < bestD) { bestD = e; best = d; }
  }
  let h = step;
  while (h > 0.01) {
    h /= 2;
    for (const d of [best - h, best + h]) {
      if (d < 0 || d > path.length) continue;
      const e = off(d);
      if (e < bestD) { bestD = e; best = d; }
    }
  }
  return best;
}

pw.defineComponent("junction", {
  a: pw.object({ doc: "One road it joins." }),
  b: pw.object({ doc: "The other road it joins." }),
  radius: pw.float(8, { unit: "m", range: [0, 50], doc: "The corners' radius." }),
  depth: pw.float(0.6, { unit: "m", range: [0.05, 5], doc: "How deep the corner fillets go below the deck." }),
  blend: pw.float(0, { unit: "m", range: [0, 10], doc: "How far the corners melt into the ground they join. With Rounded blends (Playweft d766ef66) 3 rounds the corners cleanly into the grass; 0 leaves the fillet's edge as a dark 26 cm wall, and 0.75–1.5 a dark fuzzy rim." }),
  ground: pw.object({ doc: "The object whose world shapes the corners are built among (the Height Map's group), as the roads' ground." }),
}, {
  build(junction, object) {
    return buildJunction(junction, object);
  },
});

// The junction's children: where the roads cross, and a rounded tarmac fillet in each corner.
function buildJunction(junction, object) {
  {
    const ra = object.refs && object.refs.a, rb = object.refs && object.refs.b;
    if (!ra || !rb || !ra.components.curve || !rb.components.curve) return [];
    const pa = pw.curve.path(ra.components.curve, ra.matrix);
    const pb = pw.curve.path(rb.components.curve, rb.matrix);
    const half = (ref) => { const p = profileOf(ref.components.road ? ref.components.road.profile : "two-lane"); return p.deck + p.kerb; };
    const ha = half(ra), hb = half(rb);
    // Where they cross: start from the junction's own place and walk the two curves onto each other.
    let da = nearest(pa, [0, 0, 0], 0, pa.length, 4);
    let db = nearest(pb, [0, 0, 0], 0, pb.length, 4);
    for (let i = 0; i < 4; i++) {
      da = nearest(pa, pb.at(db).position, da - 20, da + 20, 1);
      db = nearest(pb, pa.at(da).position, db - 20, db + 20, 1);
    }
    const fa = pa.at(da), fb = pb.at(db);
    const c = fa.position;
    const y = (fa.position[1] + fb.position[1]) / 2 + DECK_Y;
    const ta = flat(fa.along), tb = flat(fb.along);
    const na = [ta[2], 0, -ta[0]], nb = [tb[2], 0, -tb[0]];
    const children = [{
      name: "crossing",
      position: [c[0], y, c[2]],
      components: { road_crossing: { a: ra.name, b: rb.name, at_a: Math.round(da * 100) / 100, at_b: Math.round(db * 100) / 100 } },
    }];
    const r = junction.radius;
    if (r <= 0) return children;
    const ground = object.refs && object.refs.ground ? object.refs.ground.id : null;
    let n = 0;
    for (const sa of [-1, 1]) {
      for (const sb of [-1, 1]) {
        // The corner where road a's edge on side sa meets road b's edge on side sb.
        // Solve c + na*sa*ha + ta*s = c + nb*sb*hb + tb*t in x and z.
        const ox = nb[0] * sb * hb - na[0] * sa * ha, oz = nb[2] * sb * hb - na[2] * sa * ha;
        const det = ta[0] * -tb[2] - ta[2] * -tb[0];
        if (Math.abs(det) < 1e-6) continue;
        const s = (ox * -tb[2] - oz * -tb[0]) / det;
        const q = [c[0] + na[0] * sa * ha + ta[0] * s, 0, c[2] + na[2] * sa * ha + ta[2] * s];
        // Along each edge, away from the other road.
        const ua = scaled(ta, Math.sign(dotXZ(ta, nb) * sb) || 1);
        const ub = scaled(tb, Math.sign(dotXZ(tb, na) * sa) || 1);
        const cos = Math.max(-0.999, Math.min(0.999, dotXZ(ua, ub)));
        const theta = Math.acos(cos);
        const t = r / Math.tan(theta / 2);
        const bis = flat(add(ua, ub));
        const centre = add(q, scaled(bis, r / Math.sin(theta / 2)));
        const t1 = add(q, scaled(ua, t)), t2 = add(q, scaled(ub, t));
        const a1 = Math.atan2(t1[2] - centre[2], t1[0] - centre[0]);
        let a2 = Math.atan2(t2[2] - centre[2], t2[0] - centre[0]);
        let sweep = a2 - a1;
        while (sweep > Math.PI) sweep -= 2 * Math.PI;
        while (sweep < -Math.PI) sweep += 2 * Math.PI;
        // The fillet: from just inside the corner, out along one edge, round the arc, back along the
        // other edge. It reaches half a metre into both decks, along the whole of both edges, so
        // the roads' own verges (a step below their decks) are covered and nothing shows between.
        const inner = sub(q, scaled(bis, 0.5));
        const t1in = add(t1, scaled(na, -sa * OVERLAP)), t2in = add(t2, scaled(nb, -sb * OVERLAP));
        const ring = [inner, t1in, t1];
        const steps = Math.max(4, Math.ceil(Math.abs(sweep) * r / 1.0));
        for (let i = 1; i < steps; i++) {
          const ang = a1 + sweep * (i / steps);
          ring.push([centre[0] + Math.cos(ang) * r, 0, centre[2] + Math.sin(ang) * r]);
        }
        ring.push(t2, t2in);
        const at =[q[0], y - junction.depth / 2, q[2]];
        let outline = ring.map((p) => [Math.round((p[0] - at[0]) * 1000) / 1000, Math.round((p[2] - at[2]) * 1000) / 1000]);
        // An Extrude's outline goes round one way; keep it counter-clockwise seen from above.
        let area = 0;
        for (let i = 0; i < outline.length; i++) {
          const u = outline[i], v = outline[(i + 1) % outline.length];
          area += u[0] * v[1] - v[0] * u[1];
        }
        if (area > 0) outline = outline.reverse();
        n++;
        const corner = { shape: "Extrude", outline, blend: junction.blend };
        if (ground) corner[JOINS] = ground;
        children.push({
          name: "corner " + n,
          position: at,
          scale: [1, junction.depth, 1],
          components: { world_shape: corner, material: { asset: PLAIN } },
        });
      }
    }
    return children;
  }
}
