// Road signs (Design, "Roads: the Ring, back roads and road signs", Road signs). A sign is one data row:
// a `road_sign` names its family, its words, arrows, tab, distance, plate and size, and its builder lays
// the board to fit, then the posts, gantry or bracket, and the face. A `sign_plan` places many at once
// from the road graph, by the design's rules (below).
//
// Grey-box for now: world-shape boards and posts. The sign kit's models come later from hifipushie
// through the oxidegen MCP and replace these parts by name ("board", "post 1", "plate", "arm 2").
// Posts are solid and boards aren't, so a kart hits the post.
//
// The sign stands on its object's origin, its face towards +Z: the approaching driver is on the +Z
// side, driving towards -Z.
//
// Faces are baked until Playweft's World text lands: tools/sign_faces.py paints each face from the same
// spec, and the `sign_face` material lays it on the board. A face is named by a key ("stop",
// "give way", "plate:Stop 100 m", "finger:Home Farm|¾|right" ...); FACES below holds each baked key's
// material and size in metres. A key with no baked face leaves the board blank in its family's colour,
// and the card says which faces to bake:
//   python3 tools/sign_faces.py --keys workspace/signs/faces "<key>" ...
// then import the PNG into the library's Signs folder, make a material on sign_face.material.wgsl with
// its corner and size (flip_v for the shaped boards), and add a row here.

// ---- Materials -----------------------------------------------------------------------------------
const GALV = "01M7GDYVMA45G1HQY2B8SNNX92";        // galvanised posts and board backs
const WHITE_POST = "01M7GDYWSR37XET5PV63KFA4B7";  // painted white timber (fingerposts, plates)
const TIMBER = "01M7GE3QXSHAK4J99149B69BMJ";      // course and scenic posts
const GREEN = "01M823ZYZWXJ3PY4BA1GDC2YX8";
const RED = "01M8240019ZTXT5J6FQ91N7WMW";
const BROWN = "01M824019T2V5N6H5HTX1NJEKC";
const HAY = "01M824032RW7GQ6AH7BP3YVC7N";
const CREAM = "01M82403RM8R5BPPF07WFND267";

// ---- Baked faces: key → material and size (metres). `shaped` faces sit on an Extrude's top. ------
const FACES = {
  "stop": { m: "01M823ZR7YET56H4ECRJNDKPVN", w: 0.75, h: 0.75 },
  "give way": { m: "01M823ZT0CWCA36CJM25K99A3M", w: 0.9, h: 0.7781 },
  "plate:Stop 100 m": { m: "01M823ZVXKF2JYNX4STG3B5R20", w: 1.2312, h: 0.3 },
  "plate:Give way 50 m": { m: "01M823ZXR7BRYDFY05MT0DCNG4", w: 1.4906, h: 0.3 },
  "plate:Ford": { m: "01M7GE3HQ8DXCSDK3GQBGVFY8B", w: 1.0, h: 0.3 },
  "warn:bend right": { m: "01M7GE3CK524VA8DYN5THNRNEF", w: 1.2, h: 1.0406 },
  "warn:cattle": { m: "01M7GE3E9W4YBAY1GCPVV1WJPX", w: 1.2, h: 1.0406 },
  "warn:ford": { m: "01M7GE3G0KBE1VWM96030WWKZQ", w: 1.2, h: 1.0406 },
  "finger:Home Farm|¾|right": { m: "01M7GE37JCDGDE48HBQ1A34YDS", w: 1.7312, h: 0.3406 },
  "finger:Orchard Hills|2¼|right": { m: "01M7GE3AWR3YMCZ0V0ND5021MY", w: 1.9969, h: 0.3406 },
  "finger:Braynard Town|1½|left": { m: "01M7GE395RGCKS5T4760ZY4T61", w: 2.1688, h: 0.3406 },
  "finger:Braynard Town|½|right": { m: "01M824J3W8K4JZENPXQGH940JK", w: 2.0469, h: 0.3406 },
  "finger:Braynard Town|½|left": { m: "01M824J5KX91CNZ1M93BQZDDDH", w: 2.0469, h: 0.3406 },
  "finger:the Ring|¾|right": { m: "01M824J7FZBKMG90Y4Z6YK6V0J", w: 1.4219, h: 0.3406 },
  "finger:the Ring|¾|left": { m: "01M824J93KPYJG2SZ2JVEFTSNE", w: 1.4219, h: 0.3406 },
  "finger:Orchard Hills|2¼|left": { m: "01M824JAY81K51YCSAAQQRJCQV", w: 1.9969, h: 0.3406 },
  "finger:Mill River|3|right": { m: "01M824JCRX1H4TXC6CD2VD36RN", w: 1.5063, h: 0.3406 },
  "finger:Mill River|3|left": { m: "01M824JEKCAJNVD472QZYA1Z0D", w: 1.5063, h: 0.3406 },
  "warn:bend left": { m: "01M824J216JNPRNH2V9Y80TPMW", w: 1.2, h: 1.0406 },
  "street:Market Square": { m: "01M7GE3KCYS2M3DRD62VWFHC4E", w: 1.5, h: 0.5 },
  "course:Barnyard Loop": { m: "01M7GE3N36RB8XYHG10MGY6G1P", w: 4.4875, h: 1.0 },
  "scenic:The Orchard Way": { m: "01M7GE3Q04EDN80KKD8PETKSFP", w: 4.0, h: 0.9 },
  "ring advance:EXIT 7|600 m|Mill River|Braynard Woods": { m: "01M7GE04ZBR3SYZNZ2ED5XJ2AD", w: 7.35, h: 3.0 },
  "ring gore:EXIT 7": { m: "01M7GE35X5DS2ZP3MX2DTAC1NG", w: 2.6, h: 1.3 },
};

// ---- Families: board colour, cap height, shape and where the board stands -----------------------
// shape: rect (a Box), octagon, up (triangle point up), down (triangle point down), arm (pointed).
// bottom: the board's bottom edge above the ground. posts: 1 (centre), 2 (near its ends), 0.
const FAMILIES = {
  "ring advance": { colour: GREEN, cap: 0.5, shape: "rect", bottom: 3.1, posts: 2, post: 0.22, thick: 0.12 },
  "ring gantry": { colour: GREEN, cap: 0.5, shape: "rect", bottom: 6.5, posts: 0, post: 0.4, thick: 0.12 },
  "ring gore": { colour: GREEN, cap: 0.3, shape: "rect", bottom: 1.3, posts: 2, post: 0.2, thick: 0.08 },
  "on-ramp": { colour: WHITE_POST, cap: 0.25, shape: "rect", bottom: 1.5, posts: 2, post: 0.16, thick: 0.08 },
  "junction board": { colour: WHITE_POST, cap: 0.25, shape: "rect", bottom: 1.5, posts: 2, post: 0.16, thick: 0.08 },
  "fingerpost": { colour: WHITE_POST, cap: 0.15, shape: "arm", bottom: 2.0, posts: 1, post: 0.16, thick: 0.05 },
  "street": { colour: CREAM, cap: 0.13, shape: "rect", bottom: 0.9, posts: 2, post: 0.08, thick: 0.05 },
  "warning": { colour: RED, cap: 0.13, shape: "up", bottom: 1.6, posts: 1, post: 0.1, thick: 0.05 },
  "stop": { colour: RED, cap: 0.18, shape: "octagon", bottom: 1.5, posts: 1, post: 0.1, thick: 0.05 },
  "give way": { colour: RED, cap: 0.13, shape: "down", bottom: 1.5, posts: 1, post: 0.1, thick: 0.05 },
  "scenic": { colour: BROWN, cap: 0.26, shape: "rect", bottom: 1.15, posts: 2, post: 0.16, thick: 0.08 },
  "course": { colour: HAY, cap: 0.36, shape: "rect", bottom: 1.2, posts: 2, post: 0.18, thick: 0.1 },
  "billboard": { colour: CREAM, cap: 0.8, shape: "rect", bottom: 3.0, posts: 3, post: 0.3, thick: 0.2 },
};
const FAMILY_NAMES = Object.keys(FAMILIES);
const ARROWS = ["none", "up", "up right", "right", "down right", "down", "down left", "left", "up left"];

// Unit outlines for the shaped boards, as an Extrude takes them after a quarter turn about X (its
// second number runs down the board: -0.5 is the top).
const K = 1 / (2 + Math.SQRT2);
const OUTLINES = {
  octagon: [[-0.5 + K, -0.5], [0.5 - K, -0.5], [0.5, -0.5 + K], [0.5, 0.5 - K], [0.5 - K, 0.5], [-0.5 + K, 0.5], [-0.5, 0.5 - K], [-0.5, -0.5 + K]],
  up: [[0, -0.5], [0.5, 0.5], [-0.5, 0.5]],
  down: [[-0.5, -0.5], [0.5, -0.5], [0, 0.5]],
};
function armOutline(w, h, left) {
  const tip = 1 - (h * 0.55) / w;             // where the point starts, as a share of the length
  const p = [[-0.5, -0.5], [tip - 0.5, -0.5], [0.5, 0], [tip - 0.5, 0.5], [-0.5, 0.5]];
  return left ? p.map(([x, z]) => [-x, z]).reverse() : p;
}

const r4 = (v) => Math.round(v * 10000) / 10000;
// A choice field may come through as its name or as its index among the choices.
const pick = (v, list) => (typeof v === "number" ? list[v] : v);

// The face's key for a sign's values (one board; fingerpost arms have their own).
function faceKey(s) {
  const f = s.family, l1 = s["line_1"] || "";
  if (f === "stop" || f === "give way") return f;
  if (f === "warning") return "warn:" + (s.picto || "");
  if (f === "street" || f === "course" || f === "scenic") return f + ":" + l1;
  if (f === "ring gore") return "ring gore:" + (s.tab || "");
  if (f === "ring advance") return "ring advance:" + [s.tab || "", s.distance || "", l1, s["line_2"] || ""].join("|");
  return f + ":" + [l1, s["line_2"] || "", s["line_3"] || ""].filter((t) => t).join("|");
}
const fingerKey = (place, dist, left) => "finger:" + place + "|" + dist + "|" + (left ? "left" : "right");

// A board's size when its face isn't baked: the words at the family's cap height, with margins.
function guessSize(s, fam) {
  if (fam.shape === "octagon") return [0.75, 0.75];
  if (fam.shape === "down") return [0.9, 0.7794];
  if (fam.shape === "up") return [1.2, 1.0392];
  const lines = [s["line_1"], s["line_2"], s["line_3"]].filter((t) => t);
  const longest = Math.max(4, ...lines.map((t) => t.length));
  const w = longest * fam.cap * 0.62 + fam.cap * 2 + (s.tab || s.shield ? fam.cap * 3 : 0) + (s.arrow && s.arrow !== "none" ? fam.cap * 2.5 : 0);
  const h = Math.max(1, lines.length) * fam.cap * 1.6 + fam.cap * 1.4 + (s.tab ? fam.cap * 1.5 : 0);
  return [w, h];
}

// One board: a Box (rect) or a shaped Extrude. Its front, towards +Z, wears the baked face or, with
// none baked, the family's colour; its back and edges are galvanised, as a real board's are.
function board(name, shape, w, h, t, cx, cy, face, colour, outline, back) {
  const front = face || colour;
  if (shape === "rect") {
    const ws = { shape: "Box", solid: false, cast_shadows: true, faces: { "+Z": front } };
    return { name, position: [cx, cy, 0], scale: [r4(w), r4(h), t], components: { world_shape: ws, material: { asset: back || GALV } } };
  }
  const ws = { shape: "Extrude", outline: outline || OUTLINES[shape], solid: false, cast_shadows: true, faces: { top: front } };
  return { name, position: [cx, cy, 0], rotation: [90, 0, 0], scale: [r4(w), t, r4(h)], components: { world_shape: ws, material: { asset: back || GALV } } };
}

function post(name, x, z, height, d, colour) {
  return {
    name, position: [x, height / 2, z], scale: [d, height, d],
    components: { world_shape: { shape: "Cylinder", solid: true, cast_shadows: true }, material: { asset: colour } },
  };
}

function boxPart(name, pos, scale, colour, solid) {
  return { name, position: pos, scale, components: { world_shape: { shape: "Box", solid, cast_shadows: true }, material: { asset: colour } } };
}

// ---- The layout: a sign's values → its parts, in the sign's own frame, and any faces it lacks ------
function layoutSign(values) {
  const s = Object.assign({}, values, { family: pick(values.family, FAMILY_NAMES), arrow: pick(values.arrow, ARROWS) });
  const fam = FAMILIES[s.family] || FAMILIES["junction board"];
  const k = s.size > 0 ? s.size : 1;
  const parts = [], missing = [];
  const postColour = s.family === "fingerpost" ? WHITE_POST : (s.family === "course" || s.family === "scenic") ? TIMBER : GALV;
  const t = fam.thick;

  if (s.family === "fingerpost") {
    const top = 3.1 * k, d = fam.post * k;
    parts.push(post("post", 0, 0, top, d, WHITE_POST));
    parts.push({ name: "finial", position: [0, top + 0.06 * k, 0], scale: [0.2 * k, 0.2 * k, 0.2 * k], components: { world_shape: { shape: "Sphere", solid: true }, material: { asset: WHITE_POST } } });
    let n = 0;
    for (let i = 1; i <= 4; i++) {
      const place = s["arm_" + i];
      if (!place) continue;
      const dist = s["arm_" + i + "_distance"] || "";
      // Heading: degrees round from pointing right (+X), counter-clockwise seen from above; 90 points
      // ahead, away from the driver. An arm pointing back over the driver's left is the left-hand face.
      let hd = ((s["arm_" + i + "_heading"] % 360) + 360) % 360;
      const left = hd > 90 && hd < 270;
      const key = fingerKey(place, dist, left);
      const baked = FACES[key];
      if (!baked) missing.push(key);
      const h = baked ? baked.h : 0.34;
      const w = baked ? baked.w : 0.4 + (place.length + dist.length + 1) * 0.15 * 0.62;
      const yaw = left ? hd - 180 : hd;
      const a = (hd * Math.PI) / 180;
      const reach = d / 2 + (w * k) / 2;
      const y = (2.75 - n * 0.35) * k;
      parts.push({
        name: "arm " + i,
        position: [r4(Math.cos(a) * reach), r4(y), r4(-Math.sin(a) * reach)],
        rotation: [90, r4(yaw), 0],
        scale: [r4(w * k), t, r4(h * k)],
        components: {
          world_shape: { shape: "Extrude", outline: armOutline(w, h, left), solid: false, cast_shadows: true, faces: baked ? { top: baked.m } : {} },
          material: { asset: WHITE_POST },
        },
      });
      n++;
    }
    return { parts, missing };
  }

  const key = faceKey(s);
  const baked = FACES[key];
  if (!baked) missing.push(key);
  const [w0, h0] = baked ? [baked.w, baked.h] : guessSize(s, fam);
  const w = w0 * k, h = h0 * k;
  // A plate under the board pushes the board up by its own height.
  let plateH = 0;
  if (s.plate) {
    const pk = "plate:" + s.plate;
    const pb = FACES[pk];
    if (!pb) missing.push(pk);
    const pw = (pb ? pb.w : Math.max(1, s.plate.length * 0.13 * 0.62 + 0.3)) * k, ph = (pb ? pb.h : 0.3) * k;
    const pBottom = (s.height > 0 ? s.height : fam.bottom) * k - 0.25 * k;
    parts.push(board("plate", "rect", pw, ph, 0.04, 0, pBottom + ph / 2, pb ? pb.m : null, WHITE_POST));
    // The plate hangs from a quarter metre below the family's bottom edge; the board sits 5 cm above it.
    plateH = ph + 0.05 * k - 0.25 * k;
  }
  const bottom = (s.height > 0 ? s.height : fam.bottom) * k + Math.max(0, plateH);
  const cy = bottom + h / 2;
  parts.push(board("board", fam.shape, w, h, t, 0, cy, baked ? baked.m : null, fam.colour));

  const d = fam.post * k, behind = -(t / 2 + d / 2);
  if (s.family === "ring gantry") {
    const span = s.span > 0 ? s.span : 16;
    const legH = bottom + h + 0.6;
    parts.push(boxPart("leg 1", [-span / 2, legH / 2, behind], [d, legH, d], GALV, true));
    parts.push(boxPart("leg 2", [span / 2, legH / 2, behind], [d, legH, d], GALV, true));
    parts.push(boxPart("truss", [0, bottom + h + 0.3, behind - 0.3], [span, 0.6, 0.6], GALV, false));
    return { parts, missing };
  }
  const top = cy + h / 2 - 0.05 * k;
  if (fam.posts === 1) parts.push(post("post", 0, behind, top, d, postColour));
  if (fam.posts === 2) {
    const x = Math.max(w * 0.3, w / 2 - Math.max(0.35, w * 0.15));
    parts.push(post("post 1", -x, behind, top, d, postColour));
    parts.push(post("post 2", x, behind, top, d, postColour));
  }
  if (fam.posts === 3) for (const [i, x] of [[1, -w * 0.35], [2, 0], [3, w * 0.35]]) parts.push(post("post " + i, x, behind, top, d, postColour));
  return { parts, missing };
}

const SIGN_FIELDS = {
  family: pw.oneOf(...FAMILY_NAMES, { doc: "Which kind of sign: its board, colours, lettering and where it stands." }),
  "line_1": pw.text("", { group: "Words", doc: "The first line: a place, a street, a course." }),
  "line_2": pw.text("", { group: "Words", doc: "The second line." }),
  "line_3": pw.text("", { group: "Words", doc: "The third line." }),
  tab: pw.text("", { group: "Words", doc: "The junction tab on a Ring sign: \"EXIT 7\"." }),
  distance: pw.text("", { group: "Words", doc: "A distance: \"600 m\" on the Ring, \"¾\" on the lanes." }),
  arrow: pw.oneOf(...ARROWS, { group: "Words", doc: "The board's arrow." }),
  shield: pw.onOff(false, { group: "Words", doc: "Show the County Ring's shield." }),
  picto: pw.text("", { group: "Words", doc: "A warning's pictogram: bend right, ford, cattle …" }),
  plate: pw.text("", { group: "Words", doc: "The plate beneath: \"Ford\", \"Stop 100 m\"." }),
  "arm_1": pw.text("", { group: "Fingerpost", doc: "The place the first arm names." }),
  "arm_1_distance": pw.text("", { group: "Fingerpost" }),
  "arm_1_heading": pw.float(0, { unit: "°", range: [-360, 360], group: "Fingerpost", doc: "Where it points: 0 right, 90 ahead, 180 left, seen from the approach." }),
  "arm_2": pw.text("", { group: "Fingerpost" }),
  "arm_2_distance": pw.text("", { group: "Fingerpost" }),
  "arm_2_heading": pw.float(0, { unit: "°", range: [-360, 360], group: "Fingerpost" }),
  "arm_3": pw.text("", { group: "Fingerpost" }),
  "arm_3_distance": pw.text("", { group: "Fingerpost" }),
  "arm_3_heading": pw.float(0, { unit: "°", range: [-360, 360], group: "Fingerpost" }),
  "arm_4": pw.text("", { group: "Fingerpost" }),
  "arm_4_distance": pw.text("", { group: "Fingerpost" }),
  "arm_4_heading": pw.float(0, { unit: "°", range: [-360, 360], group: "Fingerpost" }),
  size: pw.float(1, { range: [0.25, 4], doc: "Scales the whole sign; 1 is the spec's (1.33 for a warning on the Ring)." }),
  height: pw.float(0, { unit: "m", range: [0, 20], doc: "The board's bottom edge above the ground; 0 takes the family's." }),
  span: pw.float(16, { unit: "m", range: [2, 60], group: "Gantry", doc: "How far apart a gantry's legs stand." }),
};

const missingSentence = (keys) => "No baked face for " + keys.map((k) => "\"" + k + "\"").join(", ") + ": the board is blank. Bake it with tools/sign_faces.py --keys and add it to FACES in road_sign.ts.";

pw.defineComponent("road_sign", SIGN_FIELDS, {
  check(s) {
    const { missing } = layoutSign(s);
    return missing.length ? [missingSentence(missing)] : [];
  },
  build(s) {
    return layoutSign(s).parts;
  },
});

// ---- Plans: many signs from the road graph ------------------------------------------------------
// A plan's children are every part of every sign it places, named "<sign> <part>" ("arm 2 stop
// board"), each in the plan object's space. A built object's own builders don't run, so a plan lays
// the parts itself through the same layout as a road_sign.

const DEG = Math.PI / 180;
const yawOf = (n) => Math.atan2(n[0], n[1]) / DEG;          // the yaw that turns +Z onto n, given as [x, z]
const norm2 = (x, z) => { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; };
// The driver's left, driving along d (x, z), with y up.
const leftOf = (d) => [d[1], -d[0]];

// Place one sign's parts: at `at`, its face turned to `yaw` degrees.
function placeSign(out, prefix, values, at, yaw) {
  const s = Object.assign({ size: 1, height: 0, span: 16 }, values);
  const { parts, missing } = layoutSign(s);
  const c = Math.cos(yaw * DEG), sn = Math.sin(yaw * DEG);
  for (const p of parts) {
    const [x, y, z] = p.position || [0, 0, 0];
    const r = p.rotation || [0, 0, 0];
    out.push(Object.assign({}, p, {
      name: prefix + " " + p.name,
      // Ry(yaw): x' = x cos + z sin, z' = -x sin + z cos. The engine's Euler order is YXZ, so a part
      // turned only about X and Y turns with the sign by adding the yaw.
      position: [r4(at[0] + x * c + z * sn), r4(at[1] + y), r4(at[2] - x * sn + z * c)],
      rotation: [r[0], r4(r[1] + yaw), r[2]],
    }));
  }
  return missing;
}

// How a sign faces traffic coming along `toward` (x, z: the way the traffic drives), standing on the
// driver's `side`: its face back along the road, turned 5° towards the driver.
function facing(toward, side) {
  const back = [-toward[0], -toward[1]];
  const inward = side === "left" ? [-leftOf(toward)[0], -leftOf(toward)[1]] : leftOf(toward);
  const n = norm2(back[0] * Math.cos(5 * DEG) + inward[0] * Math.sin(5 * DEG), back[1] * Math.cos(5 * DEG) + inward[1] * Math.sin(5 * DEG));
  return yawOf(n);
}

// Road profiles' half widths and verges, as road.ts has them (deck + kerb, verge).
const PROFILE_EDGE = { "two-lane": [4.0, 1.0], "back lane": [3.5, 1.0], "slip road": [3.0, 1.0], "freeway": [15.5, 1.5] };
const PROFILE_LIST = ["two-lane", "back lane", "slip road", "freeway"];
const edgeOf = (road) => {
  const p = road && road.profile !== undefined ? (typeof road.profile === "number" ? PROFILE_LIST[road.profile] : road.profile) : "two-lane";
  return PROFILE_EDGE[p] || PROFILE_EDGE["two-lane"];
};
const fastRoad = (road) => { const p = road && road.profile; return p === undefined || p === "two-lane" || p === 0 || p === "freeway" || p === 3; };

// Where a road's curve crosses the circle of `mouth` metres round the plan's origin (in x and z):
// each crossing is an arm, with its point, the way out of the junction along the road, and how far
// along the road it is. A road ending inside gives one arm, a road running through gives two.
function armsOf(path, mouth) {
  const arms = [];
  const dist = (d) => { const q = path.at(d).position; return Math.hypot(q[0], q[2]); };
  const step = 1;
  let prev = dist(0);
  for (let d = step; d <= path.length + 1e-6; d += step) {
    const dd = Math.min(d, path.length);
    const cur = dist(dd);
    const outside = (r) => r >= mouth;
    if (outside(prev) !== outside(cur)) {
      let a = dd - step, b = dd;
      for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (outside(dist(a)) !== outside(dist(m))) b = m; else a = m; }
      const at = (a + b) / 2;
      const f = path.at(at);
      // Out of the junction: along the road if it's leaving the circle here, against it if entering.
      const sign = cur > prev ? 1 : -1;
      arms.push({ at, position: f.position, out: norm2(f.along[0] * sign, f.along[2] * sign), sign });
    }
    prev = cur;
  }
  return arms;
}

const RULES = ["auto", "priority", "give way", "stop", "lights", "none"];
const CONTROLS = ["priority", "stop", "all-way stop", "lights", "roundabout"];

const PLAN_FIELDS = {
  drive: pw.oneOf("left", "right", { doc: "Which side the county drives on; signs stand on the driver's side." }),
  mouth: pw.float(0, { unit: "m", range: [0, 100], doc: "How far from the centre the roads stop; 0 takes the junction's (12 if it has none)." }),
  line: pw.float(1, { unit: "m", range: [0, 20], doc: "How far out from the mouth the stop or give-way line is." }),
  control: pw.oneOf("junction's", ...CONTROLS, { doc: "Who goes; \"junction's\" reads the junction's own control field." }),
  fingerpost: pw.onOff(true, { doc: "A fingerpost on the corner, one arm per road." }),
  advance: pw.onOff(true, { doc: "\"Stop 100 m\" and \"Give way 50 m\" signs on fast roads." }),
};
for (let i = 1; i <= 6; i++) {
  const g = "Arm " + i;
  PLAN_FIELDS["arm_" + i] = pw.object({ group: g, doc: "The road on the junction's arm_" + i + ": name the same road here as on the junction. A builder reads only its own component's objects, as a road names its junction and the junction its roads." });
  PLAN_FIELDS["place_" + i] = pw.text("", { group: g, doc: "Where the road leads (towards its curve's end, if it runs through), for the fingerpost: \"Home Farm\"." });
  PLAN_FIELDS["distance_" + i] = pw.text("", { group: g, doc: "How far, in the lanes' halves and quarters of a km: \"¾\"." });
  PLAN_FIELDS["place_" + i + "_start"] = pw.text("", { group: g, doc: "For a road running through: where it leads towards its curve's start." });
  PLAN_FIELDS["distance_" + i + "_start"] = pw.text("", { group: g });
  PLAN_FIELDS["rule_" + i] = pw.oneOf(...RULES, { group: g, doc: "Its rule; auto follows the control and the priority arms." });
}

// The junction's signs: a stop or give-way sign at each minor arm's line (with an advance sign on a
// fast road), and a fingerpost on a corner. It stands on the junction object, at the junction's centre.
function planJunction(values, object) {
  const plan = Object.assign({}, values, { drive: pick(values.drive, ["left", "right"]), control: pick(values.control, ["junction's", ...CONTROLS]) });
  for (let i = 1; i <= 6; i++) plan["rule_" + i] = pick(values["rule_" + i], RULES);
  const out = [], missing = [];
  const j = object.components.junction || {};
  const mouth = plan.mouth > 0 ? plan.mouth : (j.mouth > 0 ? j.mouth : 12);
  // The junction's control may come through as an index into its choices, as road.ts reads it.
  const own = typeof j.control === "number" ? CONTROLS[j.control] : j.control;
  const control = plan.control === "junction's" ? (CONTROLS.includes(own) ? own : "priority") : plan.control;
  // The priority roads: the junction names them by object (priority, priority_2); the plan knows each of
  // its own roads' ids from its refs. With none named, every arm gives way, as the junction has it.
  const through = [j.priority, j.priority_2].filter((id) => typeof id === "string" && id);
  const arms = [];
  for (let i = 1; i <= 6; i++) {
    const ref = object.refs && object.refs["arm_" + i];
    if (!ref || !ref.components.curve) continue;
    const path = pw.curve.path(ref.components.curve, ref.matrix);
    const found = armsOf(path, mouth);
    // A road through the junction is two arms; they share its place and rule.
    for (const a of found) arms.push(Object.assign(a, { index: i, id: ref.id, path, road: ref.components.road, name: ref.name }));
  }
  // Numbered as the junction numbers its arms (and its road_arm children): by the angle of the mouth
  // point, atan2(z, x), smallest first, from 1.
  arms.sort((p, q) => Math.atan2(p.position[2], p.position[0]) - Math.atan2(q.position[2], q.position[0]));
  arms.forEach((a, k) => { a.n = k + 1; a.heading = Math.atan2(-a.out[1], a.out[0]); });

  for (const a of arms) {
    let rule = plan["rule_" + a.index] || "auto";
    if (rule === "auto") {
      if (control === "all-way stop") rule = "stop";
      else if (control === "lights") rule = "lights";
      else if (control === "roundabout") rule = "give way";
      else rule = through.includes(a.id) ? "priority" : (control === "stop" ? "stop" : "give way");
    }
    a.rule = rule;
    if (rule !== "stop" && rule !== "give way") continue;
    const [hw, verge] = edgeOf(a.road);
    const toward = [-a.out[0], -a.out[1]];               // the way its traffic drives in
    const side = plan.drive === "right" ? leftOf(toward).map((v) => -v) : leftOf(toward);
    const off = hw + verge * 0.7;
    const yaw = facing(toward, plan.drive);
    // At the line: `line` metres out from the mouth, along the road.
    const lineAt = a.at + a.sign * plan.line;
    const p = a.path.at(Math.max(0, Math.min(a.path.length, lineAt))).position;
    missing.push(...placeSign(out, "arm " + a.n + " " + rule, { family: rule }, [p[0] + side[0] * off, p[1], p[2] + side[1] * off], yaw));
    // The advance sign on a fast road, if the road runs that far out.
    const ahead = rule === "stop" ? 100 : 50;
    const advAt = lineAt + a.sign * ahead;
    if (plan.advance && fastRoad(a.road) && advAt > 0 && advAt < a.path.length) {
      const f = a.path.at(advAt);
      const tw = norm2(-f.along[0] * a.sign, -f.along[2] * a.sign);
      const sd = plan.drive === "right" ? leftOf(tw).map((v) => -v) : leftOf(tw);
      const q = f.position;
      missing.push(...placeSign(out, "arm " + a.n + " " + rule + " ahead", { family: rule, plate: (rule === "stop" ? "Stop " : "Give way ") + ahead + " m" },
        [q[0] + sd[0] * off, q[1], q[2] + sd[1] * off], facing(tw, plan.drive)));
    }
  }

  // The fingerpost: on the corner the first minor arm's traffic sees on its own side (or arm 1's),
  // facing that traffic, one arm per arm of the junction that names a place.
  // A road running through has two arms: "place N" names where it leads towards its curve's end, and
  // "place N start" towards its start. A road with one arm here takes "place N" whichever way it runs.
  const one = (a) => arms.filter((b) => b.index === a.index).length === 1;
  const placeOf = (a) => (a.sign > 0 || one(a) ? plan["place_" + a.index] : plan["place_" + a.index + "_start"]) || "";
  const distOf = (a) => (a.sign > 0 || one(a) ? plan["distance_" + a.index] : plan["distance_" + a.index + "_start"]) || "";
  const named = arms.filter((a) => placeOf(a));
  if (plan.fingerpost && named.length >= 2) {
    const reader = arms.find((a) => a.rule === "stop" || a.rule === "give way") || arms[0];
    const toward = [-reader.out[0], -reader.out[1]];
    const sideDir = plan.drive === "right" ? leftOf(toward).map((v) => -v) : leftOf(toward);
    // The neighbouring arm on that side: the corner between them.
    let best = null, bestDot = -2;
    for (const b of arms) {
      if (b === reader) continue;
      const d = b.out[0] * sideDir[0] + b.out[1] * sideDir[1];
      if (d > bestDot) { bestDot = d; best = b; }
    }
    const [hw, verge] = edgeOf(reader.road);
    const [hw2, verge2] = best ? edgeOf(best.road) : [hw, verge];
    const bis = best ? norm2(reader.out[0] + best.out[0], reader.out[1] + best.out[1]) : sideDir;
    const half = best ? Math.acos(Math.max(-1, Math.min(1, reader.out[0] * best.out[0] + reader.out[1] * best.out[1]))) / 2 : Math.PI / 2;
    const clear = Math.max(hw + verge, hw2 + verge2) + 1;
    const r = Math.min(mouth + 6, clear / Math.max(0.2, Math.sin(half)));
    const y = reader.position[1];
    const yaw = yawOf([-toward[0], -toward[1]]);
    const values = { family: "fingerpost" };
    named.slice(0, 4).forEach((a, k) => {
      values["arm_" + (k + 1)] = placeOf(a);
      values["arm_" + (k + 1) + "_distance"] = distOf(a);
      // The arm's heading in the post's own frame (0 right, 90 ahead, counter-clockwise from above):
      // heading h points along (cos h, -sin h) in x and z, and the post is turned by yaw about y, which
      // turns every heading by the same yaw, so a world heading H is H - yaw in its frame.
      values["arm_" + (k + 1) + "_heading"] = r4(a.heading / DEG - yaw);
    });
    missing.push(...placeSign(out, "fingerpost", values, [bis[0] * r, y, bis[1] * r], yaw));
  }
  return { children: out, missing, arms };
}

pw.defineComponent("sign_plan", PLAN_FIELDS, {
  build(plan, object) {
    return planJunction(plan, object).children;
  },
});

// ---- A road's own signs: warnings before its tight bends and its hazards, both ways ---------------
const HAZARDS = ["none", "ford", "cattle", "cattle grid", "humpback bridge", "tractors", "ducks crossing"];
const ROAD_SIGN_FIELDS = {
  drive: pw.oneOf("left", "right", { doc: "Which side the county drives on." }),
  speed: pw.float(16, { unit: "m/s", range: [1, 60], doc: "The road's speed: lanes 16, the Ring 33. Sets how tight a bend earns a warning, and how far ahead it goes." }),
  grip: pw.float(3.5, { unit: "m/s²", range: [0.5, 10], doc: "The sideways pull a bend at speed may ask for before it's warned: a bend of radius under speed² / grip." }),
  ahead: pw.float(6, { unit: "s", range: [1, 15], doc: "How many seconds at speed before the hazard its warning stands (5–7 on lanes)." }),
  bends: pw.onOff(true, { doc: "Warn of tight bends." }),
};
for (let i = 1; i <= 3; i++) {
  ROAD_SIGN_FIELDS["hazard_" + i] = pw.oneOf(...HAZARDS, { group: "Hazards", doc: "Something on the road to warn of." });
  ROAD_SIGN_FIELDS["hazard_" + i + "_at"] = pw.float(0, { unit: "m", range: [0, 100000], group: "Hazards", doc: "Where it is, in metres along the road." });
}

// The tight bends along a path: [{ at, turn: "left"|"right" as driven forwards }], at their start.
function tightBends(path, limit) {
  const step = 2, win = 6;
  const out = [];
  let inBend = false;
  for (let d = win; d <= path.length - win; d += step) {
    const a = path.at(d - win).along, b = path.at(d + win).along;
    const ta = norm2(a[0], a[2]), tb = norm2(b[0], b[2]);
    const cross = ta[0] * tb[1] - ta[1] * tb[0];
    const ang = Math.acos(Math.max(-1, Math.min(1, ta[0] * tb[0] + ta[1] * tb[1])));
    const radius = ang > 1e-4 ? (2 * win) / ang : Infinity;
    if (radius < limit) {
      // Seen from above with y up, a positive x×z cross turns towards -x of +z, which is right.
      if (!inBend) out.push({ at: d - win, end: d + win, turn: cross > 0 ? "right" : "left" });
      else out[out.length - 1].end = d + win;
      inBend = true;
    } else inBend = false;
  }
  return out;
}

function planRoad(values, object) {
  const rs = Object.assign({}, values, { drive: pick(values.drive, ["left", "right"]) });
  for (let i = 1; i <= 3; i++) rs["hazard_" + i] = pick(values["hazard_" + i], HAZARDS);
  const out = [], missing = [];
  const curve = object.components.curve;
  if (!curve || !curve.points || curve.points.length < 2) return { children: out, missing };
  const path = pw.curve.path(curve);
  const [hw, verge] = edgeOf(object.components.road);
  const off = hw + verge * 0.7;
  const lead = rs.speed * rs.ahead;
  // Each hazard, driven each way: [where it starts as met, family values, label].
  const hazards = [];
  if (rs.bends) {
    for (const b of tightBends(path, (rs.speed * rs.speed) / rs.grip)) {
      hazards.push({ at: b.at, dir: 1, values: { family: "warning", picto: "bend " + b.turn }, label: "bend" });
      hazards.push({ at: b.end, dir: -1, values: { family: "warning", picto: "bend " + (b.turn === "left" ? "right" : "left") }, label: "bend" });
    }
  }
  for (let i = 1; i <= 3; i++) {
    const h = rs["hazard_" + i];
    if (!h || h === "none") continue;
    const at = rs["hazard_" + i + "_at"];
    const plate = h === "ford" ? "Ford" : h === "cattle grid" ? "Cattle grid" : "";
    for (const dir of [1, -1]) hazards.push({ at, dir, values: { family: "warning", picto: h, plate }, label: h.replace(/ /g, "-") });
  }
  let n = 0;
  for (const hz of hazards) {
    const d = hz.at - hz.dir * lead;
    if (d < 0 || d > path.length) continue;
    const f = path.at(d);
    const toward = norm2(f.along[0] * hz.dir, f.along[2] * hz.dir);
    const side = rs.drive === "right" ? leftOf(toward).map((v) => -v) : leftOf(toward);
    const p = f.position;
    n++;
    missing.push(...placeSign(out, "warning " + n + " " + hz.label + (hz.dir > 0 ? " fwd" : " back"), hz.values,
      [p[0] + side[0] * off, p[1], p[2] + side[1] * off], facing(toward, rs.drive)));
  }
  return { children: out, missing };
}

pw.defineComponent("road_signs", ROAD_SIGN_FIELDS, {
  build(rs, object) {
    return planRoad(rs, object).children;
  },
});
