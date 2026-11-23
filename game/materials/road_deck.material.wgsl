material 3d;
// A road's deck, laid by the road builder (components/road.ts): plain grey-box tarmac with its
// markings drawn here, not placed. A Sweep's texture u is how far along its span, v how far across it
// from the middle, both in metres, so every line is worked out from those two and the params below.
// The road builder cuts its spans at whole numbers of `period`, so dashes run on unbroken from one
// span into the next. The tarmac's grain comes from the world position, so it never restarts at a
// joint either. One material per road profile; the params say how that profile is marked:
//
//   centre line (when there's no median) — lanes either side, `lanes` each way, `lane_width` wide,
//   dashed between them — a solid edge line where the lanes end — a hard shoulder out to the deck's
//   edge, hatched or plain. With a median, it has a solid line each side and is hatched between.
param base: color = (0.20, 0.20, 0.21, 1.0);
param line: color = (0.92, 0.92, 0.88, 1.0);
// US markings (Joe, 2026-11-22): centre lines and the left edge of a one-way road are yellow.
param yellow: color = (0.93, 0.72, 0.12, 1.0);
param one_way: f32 = 0.0 range(0, 1);           // 1: a one-way road (a ramp) driven along its curve
param half_width: f32 = 4.0 range(0.5, 40);    // metres from the middle to the deck's edge
param median: f32 = 0.0 range(0, 10);          // half the central reservation; 0 for a centre line
param lanes: f32 = 1.0 range(1, 6);            // lanes each way
param lane_width: f32 = 3.5 range(2, 6);
param centre: f32 = 1.0 range(0, 2);           // with no median: 0 none, 1 dashed, 2 solid
param dash: f32 = 4.0 range(0, 50);            // the centre dash's length
param lane_dash: f32 = 2.0 range(0, 50);       // the lane lines' dash
param period: f32 = 12.0 range(1, 100);        // metres from one dash to the next, for every dashed line
param line_width: f32 = 0.12 range(0.02, 0.5);
param edge_width: f32 = 0.15 range(0, 0.5);    // the solid edge lines; 0 for none
param hatch: f32 = 0.0 range(0, 10);           // metres between the shoulder's and median's hatch stripes; 0 plain
param grain: f32 = 0.35 range(0, 1);
param rough: f32 = 0.88 range(0, 1);
// Where a span meets a junction, its own values (components/road.ts writes them on that span, Playweft
// material values) draw the line across the way in. `_a` is the span's start end, `_b` its end end:
// stop: how far along the span (u) the line is, 0 for none; rule: 1 yield (shark's teeth), 2 stop and
// 3 lights (a solid white stop bar 0.45 m wide); warn: over this many metres before the line the centre
// line is a double solid yellow. US markings, and Braynard drives on the right (Joe, 2026-11-22), so the
// line crosses the half the traffic comes in on: at the start end that's the -across side, at the end
// end the +across side.
param stop_a: f32 = 0.0 range(0, 10000);
param rule_a: f32 = 0.0 range(0, 3);
param warn_a: f32 = 0.0 range(0, 100);
param stop_b: f32 = 0.0 range(0, 10000);
param rule_b: f32 = 0.0 range(0, 3);
param warn_b: f32 = 0.0 range(0, 100);
// A junction's pad (role 1) or a roundabout's (role 2), written by components/road.ts's junction builder,
// in the pad's own space (its texture's u and v are metres there): each mouth as [x, z, heading (radians,
// the way out along its arm), half-width]; with a priority road, through_1/2 name the two arms it runs
// between [i, j] and through_w/through_d say how it's marked [lanes out, line width, edge width, centre
// (1 dashed, 2 solid)] and [dash, period]; a roundabout's ring is [island radius, outer radius].
param role: f32 = 0.0 range(0, 5);    // 0 deck, 1 pad, 2 roundabout, 3 slip taper, 4 turn lane, 5 left-turn pocket
param arms: f32 = 0.0 range(0, 6);
param mouth_1: vec4f = (0.0, 0.0, 0.0, 0.0);
param mouth_2: vec4f = (0.0, 0.0, 0.0, 0.0);
param mouth_3: vec4f = (0.0, 0.0, 0.0, 0.0);
param mouth_4: vec4f = (0.0, 0.0, 0.0, 0.0);
param mouth_5: vec4f = (0.0, 0.0, 0.0, 0.0);
param mouth_6: vec4f = (0.0, 0.0, 0.0, 0.0);
param through_1: vec4f = (0.0, 0.0, 0.0, 0.0);
param through_2: vec4f = (0.0, 0.0, 0.0, 0.0);
param through_w: vec4f = (4.0, 0.12, 0.15, 1.0);
param through_d: vec4f = (4.0, 12.0, 0.0, 0.0);
param ring: vec4f = (0.0, 0.0, 0.0, 0.0);
// A roundabout arm's splitter island ends in a point on the road's last span: hatching runs on from it,
// [u at the point, how far it runs (+ toward larger u, - toward smaller), half-width at the point, 0].
param nose_a: vec4f = (0.0, 0.0, 0.0, 0.0);
param nose_b: vec4f = (0.0, 0.0, 0.0, 0.0);
// A slip road's taper (role 3), in its main road's u and across: [e (where the main road's deck ends),
// side (+1 right, -1 left), 0, 0], and its width along it as two straight runs [u0, w0, u1, w1].
param taper_e: vec4f = (0.0, 1.0, 0.0, 0.0);
param taper_w1: vec4f = (0.0, 0.0, 0.0, 0.0);
param taper_w2: vec4f = (0.0, 0.0, 0.0, 0.0);
// A turn lane (role 4), in its road's u and across: [lane centre across, lane half-width, which way
// traffic drives along u (+1/-1), arrow (1 ahead, 2 left, 3 right)], where its two arrows' tails are
// [u, u, 0, 0], and its line across [u, rule, 0, 0].
param lane: vec4f = (0.0, 0.0, 1.0, 1.0);
param arrows: vec4f = (0.0, 0.0, 0.0, 0.0);
param lane_line: vec4f = (0.0, 0.0, 0.0, 0.0);
// A left-turn pocket (role 5): the road laid again over an approach, widening by half a lane each side so
// a left-turn lane opens in its middle (US style). [u where it is thin, u where it is full, half a lane,
// 0]; its lane is [0, through lane width, which way traffic drives along u, 2], and arrows and lane_line
// as a turn lane's.
param pocket: vec4f = (0.0, 0.0, 0.0, 0.0);
// Wear: how strongly the wheel tracks, braking grime, dirty edges and patches show (0 none, 1 full).
param wear: f32 = 1.0 range(0, 2);

fn hash2(p: vec2<f32>) -> f32 {
    let q = fract(p * vec2<f32>(0.1031, 0.1030));
    let r = q + dot(q, q.yx + 33.33);
    return fract((r.x + r.y) * r.x);
}

fn vnoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2<f32>(1.0, 0.0)), u.x), mix(hash2(i + vec2<f32>(0.0, 1.0)), hash2(i + vec2<f32>(1.0, 1.0)), u.x), u.y);
}

// Paint on a line `half` wide either side of 0, soft over a pixel.
fn stroke(d: f32, half: f32, aa: f32) -> f32 {
    return 1.0 - smoothstep(half - aa, half + aa, abs(d));
}

// On for the first `on` metres of every `period` metres along.
fn dashed(along: f32, on: f32, period: f32, aa: f32) -> f32 {
    let t = fract(along / period) * period;
    return smoothstep(-aa, aa, t) * (1.0 - smoothstep(on - aa, on + aa, t));
}

// The line across the way in, `d` metres from where it stands toward the traffic coming in, across
// `side` from `lo` to `hi`: every approach lane, from the centre line's edge to the edge line's. (Not
// `from`/`to`: `from` is reserved in WGSL, and a material that fails to compile shows nothing.)
fn way_in(d: f32, side: f32, lo: f32, hi: f32, rule: f32, aa: f32) -> f32 {
    if rule < 0.5 || side < lo - aa || side > hi + aa { return 0.0; }
    let within = smoothstep(lo - aa, lo + aa, side) * (1.0 - smoothstep(hi - aa, hi + aa, side));
    if rule < 1.5 { return shark_teeth(d, side - lo, aa) * within; }   // yield
    return stroke(d - 0.225, 0.225, aa) * within;                        // stop, or a signal's stop bar: 0.45 m
}

// A US yield line: white triangles 0.6 m wide and 0.9 m long, 0.3 m apart, each pointing back at the
// driver coming in (d metres from the line toward them).
fn shark_teeth(d: f32, side: f32, aa: f32) -> f32 {
    if d < -aa || d > 0.9 + aa { return 0.0; }
    let x = fract(side / 0.9) * 0.9 - 0.3;
    let half = 0.3 * (1.0 - clamp(d, 0.0, 0.9) / 0.9);
    return (1.0 - smoothstep(half - aa, half + aa, abs(x))) * smoothstep(-aa, aa, d);
}

fn mouth_of(k: i32) -> vec4<f32> {
    switch k {
        case 1: { return params.mouth_1; }
        case 2: { return params.mouth_2; }
        case 3: { return params.mouth_3; }
        case 4: { return params.mouth_4; }
        case 5: { return params.mouth_5; }
        default: { return params.mouth_6; }
    }
}

// The priority road carried across a pad, from mouth i to mouth j as a curve leaving each mouth along its
// arm: the paint of its centre line and edge lines at `p`, the edges broken where a side road joins.
// White (x) and yellow (y) paint: the centre line is yellow, the edges white.
fn through(p: vec2<f32>, pair: vec4<f32>, aa: f32) -> vec2<f32> {
    let i = i32(pair.x + 0.5);
    let j = i32(pair.y + 0.5);
    if i < 1 || j < 1 { return vec2<f32>(0.0, 0.0); }
    let mi = mouth_of(i);
    let mj = mouth_of(j);
    let ui = vec2<f32>(cos(mi.z), sin(mi.z));
    let uj = vec2<f32>(cos(mj.z), sin(mj.z));
    let reach = distance(mi.xy, mj.xy) * 0.4;
    let c0 = mi.xy;
    let c1 = mi.xy - ui * reach;
    let c2 = mj.xy - uj * reach;
    let c3 = mj.xy;
    // The nearest point on the curve, in 16 straight pieces: how far off (signed) and how far along.
    var best = 1e9;
    var side = 0.0;
    var along = 0.0;
    var run = 0.0;
    var prev = c0;
    for (var n = 1; n <= 16; n = n + 1) {
        let t = f32(n) / 16.0;
        let v = 1.0 - t;
        let q = c0 * (v * v * v) + c1 * (3.0 * v * v * t) + c2 * (3.0 * v * t * t) + c3 * (t * t * t);
        let seg = q - prev;
        let len = max(length(seg), 1e-4);
        let f = clamp(dot(p - prev, seg) / (len * len), 0.0, 1.0);
        let near = prev + seg * f;
        let d = distance(p, near);
        if d < best {
            best = d;
            side = sign(seg.x * (p.y - prev.y) - seg.y * (p.x - prev.x)) * d;
            along = run + len * f;
        }
        run = run + len;
        prev = q;
    }
    var paint = 0.0;
    var centre = 0.0;
    let lines = params.through_w;
    if lines.w >= 1.5 {
        centre = max(stroke(side - lines.y, lines.y * 0.5, aa), stroke(side + lines.y, lines.y * 0.5, aa));
    } else if lines.w >= 0.5 {
        centre = stroke(side, lines.y * 0.5, aa) * dashed(along, params.through_d.x, params.through_d.y, aa);
    }
    if lines.z > 0.0 {
        var edge = stroke(abs(side) - lines.x, lines.z * 0.5, aa);
        // Broken where a side road comes in: inside another arm's corridor.
        let count = i32(params.arms + 0.5);
        for (var k = 1; k <= count; k = k + 1) {
            if k == i || k == j { continue; }
            let mk = mouth_of(k);
            let uk = vec2<f32>(cos(mk.z), sin(mk.z));
            let lk = vec2<f32>(-uk.y, uk.x);
            let rel = p - mk.xy;
            if abs(dot(rel, lk)) < mk.w + 0.5 && dot(rel, uk) < 0.0 {
                edge = edge * dashed(along, 1.0, 2.0, aa);
            }
        }
        paint = max(paint, edge);
    }
    return vec2<f32>(paint, centre);
}

// A roundabout's markings: a yield line (shark's teeth) round the ring's outer edge across each way in (the
// half the traffic comes in on, its right).
fn roundabout(p: vec2<f32>, aa: f32) -> f32 {
    let outer = params.ring.y;
    if outer <= 0.0 { return 0.0; }
    let r = length(p);
    let count = i32(params.arms + 0.5);
    var paint = 0.0;
    for (var k = 1; k <= count; k = k + 1) {
        let mk = mouth_of(k);
        let uk = vec2<f32>(cos(mk.z), sin(mk.z));
        let lk = vec2<f32>(-uk.y, uk.x);
        // Coming in on the right (Braynard drives on the right): traffic comes in against uk, and its right
        // is the -lk half.
        let s = -dot(p, lk);
        if dot(p, uk) > 0.0 && s > 0.0 && s < mk.w + 1.0 {
            paint = max(paint, shark_teeth(r - outer, s, aa) * (1.0 - smoothstep(mk.w + 1.0 - aa, mk.w + 1.0 + aa, s)));
        }
    }
    return paint;
}

fn seg_dist(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
    let ab = b - a;
    let f = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    return distance(p, a + ab * f);
}

fn in_tri(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>, c: vec2<f32>) -> bool {
    let d1 = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
    let d2 = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y);
    let d3 = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y);
    let neg = d1 < 0.0 || d2 < 0.0 || d3 < 0.0;
    let pos = d1 > 0.0 || d2 > 0.0 || d3 > 0.0;
    return !(neg && pos);
}

// A lane arrow 6 m long, its tail at the origin: x forward, y to the traffic's left. 1 ahead, 2 left, 3 right.
fn arrow(q: vec2<f32>, kind: f32, aa: f32) -> f32 {
    if q.x < -0.5 || q.x > 6.5 || abs(q.y) > 2.0 { return 0.0; }
    if kind < 1.5 {
        let shaft = 1.0 - smoothstep(0.15 - aa, 0.15 + aa, seg_dist(q, vec2<f32>(0.0, 0.0), vec2<f32>(4.2, 0.0)));
        let head = select(0.0, 1.0, in_tri(q, vec2<f32>(4.0, 0.55), vec2<f32>(4.0, -0.55), vec2<f32>(6.0, 0.0)));
        return max(shaft, head);
    }
    let y = select(-q.y, q.y, kind < 2.5);              // a right arrow is a left one mirrored
    let p = vec2<f32>(q.x, y);
    let bend = vec2<f32>(4.2, 0.9);
    let d = vec2<f32>(0.8, 0.6);
    let n = vec2<f32>(-0.6, 0.8);
    let shaft = min(seg_dist(p, vec2<f32>(0.0, 0.0), vec2<f32>(3.0, 0.0)), seg_dist(p, vec2<f32>(3.0, 0.0), bend));
    let body = 1.0 - smoothstep(0.15 - aa, 0.15 + aa, shaft);
    let head = select(0.0, 1.0, in_tri(p, bend + n * 0.55, bend - n * 0.55, bend + d * 1.5));
    return max(body, head);
}

// Chevron hatching in a strip: stripes `spacing` apart along u, folded about the strip's middle.
fn chevrons(u: f32, from_mid: f32, spacing: f32, aa: f32) -> f32 {
    let t = fract((u + abs(from_mid)) / spacing) * spacing;
    let w = spacing * 0.2;
    return smoothstep(-aa, aa, t) * (1.0 - smoothstep(w - aa, w + aa, t));
}

// Hatching run on from a splitter island's point, narrowing to nothing, with a border.
fn nose(along: f32, across: f32, n: vec4<f32>, aa: f32) -> f32 {
    if n.y == 0.0 { return 0.0; }
    let t = (along - n.x) / n.y;                         // 0 at the point, 1 where it ends
    if t < 0.0 || t > 1.0 { return 0.0; }
    let half = n.z * (1.0 - t);
    if abs(across) > half + 0.1 { return 0.0; }
    let border = stroke(abs(across) - half, 0.06, aa);
    let fill = select(0.0, chevrons(along, across, 1.5, aa), abs(across) < half);
    return max(border, fill);
}

// Diagonal stripes, `spacing` apart, about a third of it wide.
fn hatched(along: f32, across: f32, spacing: f32, aa: f32) -> f32 {
    let t = fract((along + across) / spacing) * spacing;
    let w = spacing * 0.18;
    return smoothstep(-aa, aa, t) * (1.0 - smoothstep(w - aa, w + aa, t));
}

fn surface(s: SurfaceIn) -> Surface {
    var out = standard(s);
    let along = s.uv.x;
    let across = -s.uv.y;
    let side = abs(across);
    let aa = max(fwidth(across), fwidth(along)) * 0.75 + 0.002;

    // Grey-box tarmac: broad blotches and a fine speckle, both from where it is in the world.
    let blotch = vnoise(s.world.xz * 0.07);
    var col = params.base.rgb * (0.9 + blotch * 0.2);
    col *= 1.0 + (vnoise(s.world.xz * 11.0) - 0.5) * params.grain * 0.5;

    // Wear, so the road looks driven on. On a deck it follows the lanes; on a pad it is patchier.
    var polish = 0.0;          // smoother, darker: the wheel tracks
    var grime = 0.0;           // darker: braking, the edges
    let lanes_w = params.median + params.lanes * params.lane_width;
    // A slip's taper and a turn lane lie in their road's own u and across, so they wear as its deck does.
    let deck_like = params.role < 0.5 || params.role > 2.5;
    if deck_like {
        // Two wheel tracks in each lane, a little wandering.
        let wander = (vnoise(vec2<f32>(along * 0.05, 3.0)) - 0.5) * 0.4;
        for (var k = 0.0; k < params.lanes; k = k + 1.0) {
            let mid = params.median + (k + 0.5) * params.lane_width + wander;
            let t1 = 1.0 - smoothstep(0.15, 0.45, abs(side - mid + 0.75));
            let t2 = 1.0 - smoothstep(0.15, 0.45, abs(side - mid - 0.75));
            polish = max(polish, max(t1, t2));
        }
        // The edges gather dirt, over the last 0.6 m of the deck.
        grime = max(grime, smoothstep(params.half_width - 0.6, params.half_width, side) * (1.0 - smoothstep(params.half_width, params.half_width + 0.3, side)) * 0.8);
        // Braking: darker over the last 20 m before a line, strongest at it, in the half that stops there.
        if params.stop_a > 0.0 && params.rule_a > 0.5 && across < 0.0 && -across < lanes_w {
            let d = along - params.stop_a;
            grime = max(grime, (1.0 - smoothstep(0.0, 20.0, d)) * step(0.0, d) * 0.7);
        }
        if params.stop_b > 0.0 && params.rule_b > 0.5 && across > 0.0 && across < lanes_w {
            let d = params.stop_b - along;
            grime = max(grime, (1.0 - smoothstep(0.0, 20.0, d)) * step(0.0, d) * 0.7);
        }
    } else if params.role < 2.5 {
        // A pad: turning karts smear it all over, worst in the middle.
        grime = max(grime, smoothstep(0.35, 0.8, vnoise(s.world.xz * 0.35)) * 0.5);
    }
    // Patches: oblongs of newer, darker tarmac here and there, laid along the road on a deck (along and
    // across), in the world's own grid turned off square on a pad; each its own size, edges a little soft.
    var pq = s.world.xz;
    if deck_like { pq = vec2<f32>(along, across); }
    else { pq = vec2<f32>(pq.x * 0.866 - pq.y * 0.5, pq.x * 0.5 + pq.y * 0.866); }
    let cell_size = vec2<f32>(5.0, 2.5);
    let cell = floor(pq / cell_size);
    let pick = hash2(cell + vec2<f32>(17.0, 5.0));
    let size = vec2<f32>(0.25 + 0.2 * hash2(cell + vec2<f32>(3.0, 9.0)), 0.2 + 0.25 * hash2(cell + vec2<f32>(8.0, 1.0)));
    let inside = abs(fract(pq / cell_size) - 0.5);
    let edge_soft = 0.04;
    let patched = select(0.0, 1.0, pick > 0.96)
        * (1.0 - smoothstep(size.x - edge_soft, size.x, inside.x)) * (1.0 - smoothstep(size.y - edge_soft, size.y, inside.y));
    // Cracks: a few thin dark lines, only in the odd stretch.
    let crack_field = vnoise(s.world.xz * 0.9) + 0.5 * vnoise(s.world.xz * 2.3);
    let crack = (1.0 - smoothstep(0.0, 0.008, abs(crack_field - 0.75))) * smoothstep(0.72, 0.8, vnoise(s.world.xz * 0.11 + 7.0));
    let wear_k = params.wear;
    col *= 1.0 - polish * 0.06 * wear_k;
    col *= 1.0 - grime * 0.25 * wear_k;
    col = mix(col, params.base.rgb * 0.8, patched * 0.5 * wear_k);
    col *= 1.0 - crack * 0.15 * wear_k;

    var paint = 0.0;           // white
    var ypaint = 0.0;          // yellow
    let lanes_out = params.median + params.lanes * params.lane_width;   // where the lanes end
    // Near a junction's line the centre line turns to a double solid yellow: no passing on the approach.
    let warning = (params.warn_a > 0.0 && along < params.stop_a + params.warn_a)
        || (params.warn_b > 0.0 && params.stop_b > 0.0 && along > params.stop_b - params.warn_b);
    let lw = params.line_width;
    // A left-turn pocket draws its own lanes; the road's centre, lane and edge lines are not its.
    let own_lanes = params.role < 4.5;
    if !own_lanes {
    } else if params.median <= 0.0 {
        if params.centre >= 1.5 || (warning && params.centre >= 0.5) {
            ypaint = max(ypaint, max(stroke(across - lw, lw * 0.5, aa), stroke(across + lw, lw * 0.5, aa)));
        } else if params.centre >= 0.5 {
            ypaint = max(ypaint, stroke(across, lw * 0.5, aa) * dashed(along, params.dash, params.period, aa));
        }
    } else {
        // A divided road: each carriageway's left edge, by the median, is yellow, and so is its hatching.
        ypaint = max(ypaint, stroke(side - params.median, params.edge_width * 0.5, aa));
        if params.hatch > 0.0 && side < params.median {
            ypaint = max(ypaint, hatched(along, side, params.hatch, aa));
        }
    }
    // Lane lines between the lanes each way.
    for (var k = 1.0; own_lanes && k < params.lanes; k = k + 1.0) {
        let at = params.median + k * params.lane_width;
        paint = max(paint, stroke(side - at, params.line_width * 0.5, aa) * dashed(along, params.lane_dash, params.period, aa));
    }
    // The edge line where the lanes end, and the hard shoulder beyond it.
    if own_lanes && params.edge_width > 0.0 && lanes_out < params.half_width {
        let edge_line = stroke(side - lanes_out, params.edge_width * 0.5, aa);
        // A one-way road's left edge (driving along u, its left is -across) is yellow.
        if params.one_way > 0.5 && across < 0.0 { ypaint = max(ypaint, edge_line); }
        else { paint = max(paint, edge_line); }
        if params.hatch > 0.0 && side > lanes_out + params.edge_width && side < params.half_width - 0.2 {
            paint = max(paint, hatched(along, side, params.hatch, aa));
        }
    }

    // A junction's pad: the priority road carried through; a roundabout's: its give-way lines.
    if params.role > 0.5 {
        // In the junction builder's own x and z (the mouths' terms): a top face's v runs against z.
        let p = vec2<f32>(s.uv.x, -s.uv.y);
        if params.role < 1.5 {
            let t1 = through(p, params.through_1, aa);
            let t2 = through(p, params.through_2, aa);
            paint = max(paint, max(t1.x, t2.x));
            ypaint = max(ypaint, max(t1.y, t2.y));
        } else {
            paint = max(paint, roundabout(p, aa));
        }
    }

    // A roundabout arm's splitter-island points.
    // (Yellow: it parts opposing traffic.)
    ypaint = max(ypaint, nose(along, across, params.nose_a, aa));
    ypaint = max(ypaint, nose(along, across, params.nose_b, aa));

    // A slip road's taper: its outer edge line where it is wide enough, chevrons where it is narrow.
    if params.role > 2.5 && params.role < 3.5 {
        let e = params.taper_e.x;
        let into = across * params.taper_e.y - e;
        var w = params.taper_w1.y;
        if along <= params.taper_w1.z {
            w = mix(params.taper_w1.y, params.taper_w1.w, clamp((along - params.taper_w1.x) / max(params.taper_w1.z - params.taper_w1.x, 0.01), 0.0, 1.0));
        } else {
            w = mix(params.taper_w2.y, params.taper_w2.w, clamp((along - params.taper_w2.x) / max(params.taper_w2.z - params.taper_w2.x, 0.01), 0.0, 1.0));
        }
        if w > 1.5 {
            paint = max(paint, stroke(into - (w - 0.45), 0.075, aa));
        }
        if w < 1.8 && into > 0.0 && into < w - 0.3 {
            paint = max(paint, chevrons(along, into - w * 0.5, 2.0, aa));
        }
    }

    // A turn lane: its two arrows, and the line across it.
    if params.role > 3.5 && params.role < 4.5 {
        let dir = params.lane.z;
        let lat = (across - params.lane.x) * -dir;
        if params.arrows.x > 0.0 {
            paint = max(paint, arrow(vec2<f32>((along - params.arrows.x) * dir, lat), params.lane.w, aa));
            paint = max(paint, arrow(vec2<f32>((along - params.arrows.y) * dir, lat), params.lane.w, aa));
        }
        // Its line runs on from the deck's, from lane_line.z to lane_line.w across the road.
        if params.lane_line.y > 0.5 {
            paint = max(paint, way_in((params.lane_line.x - along) * dir, abs(across), params.lane_line.z, params.lane_line.w, params.lane_line.y, aa));
        }
    }

    // A left-turn pocket: the double yellow moves left round the turn lane, a white line opens on its
    // right, arrows in both lanes, and the stop bar across every approach lane. q is metres across toward
    // the incoming traffic's right (it drives along u when lane.z is +1).
    if params.role > 4.5 {
        let dir = params.lane.z;
        let q = across * dir;
        let open = params.pocket.z * clamp((along - params.pocket.x) / (params.pocket.y - params.pocket.x), 0.0, 1.0);
        let lane_w = params.lane.y;
        // The double yellow, on the turn lane's left.
        ypaint = max(ypaint, max(stroke(q + open - lw, lw * 0.5, aa), stroke(q + open + lw, lw * 0.5, aa)));
        // The white line between the turn lane and the through lane: solid over the last 30 m, dashed before.
        let near_line = abs(along - params.lane_line.x) < 30.0;
        let lane_line = stroke(q - open, lw * 0.5, aa) * select(dashed(along, params.dash * 0.5, params.period * 0.5, aa), 1.0, near_line);
        paint = max(paint, lane_line * smoothstep(0.3, 0.6, open));
        // Edge lines, both sides.
        paint = max(paint, stroke(abs(q) - (open + lane_w), params.edge_width * 0.5, aa));
        // Arrows: left in the turn lane, ahead in the through lane (x forward, y to the traffic's left).
        if params.arrows.x > 0.0 && open > params.pocket.z * 0.9 {
            for (var n = 0; n < 2; n = n + 1) {
                let tail = select(params.arrows.y, params.arrows.x, n == 0);
                let fwd = (along - tail) * dir;
                paint = max(paint, arrow(vec2<f32>(fwd, -q), 2.0, aa));
                paint = max(paint, arrow(vec2<f32>(fwd, -(q - open - lane_w * 0.5)), 1.0, aa));
            }
        }
        // The stop bar (or yield teeth) across the turn lane and the through lane.
        if params.lane_line.y > 0.5 {
            paint = max(paint, way_in((params.lane_line.x - along) * dir, q, -open + lw * 1.5, open + lane_w + params.edge_width, params.lane_line.y, aa));
        }
    }

    // The lines across the way in at the span's ends: from the yellow centre line's outer edge (the whole
    // width on a one-way road) to the edge line's outer edge, with no gap at either.
    let bar_to = min(lanes_out + params.edge_width, params.half_width);
    var bar_from = 0.0;
    if params.one_way > 0.5 || params.median > 0.0 { bar_from = select(params.median, -bar_to, params.one_way > 0.5); }
    else if params.centre >= 0.5 { bar_from = lw * 1.5; }       // past a double yellow (it is always double at a line)
    if params.stop_a > 0.0 {
        paint = max(paint, way_in(along - params.stop_a, -across, bar_from, bar_to, params.rule_a, aa));
    }
    if params.stop_b > 0.0 {
        paint = max(paint, way_in(params.stop_b - along, across, bar_from, bar_to, params.rule_b, aa));
    }

    let worn = 0.75 + 0.25 * smoothstep(0.2, 0.5, vnoise(s.world.xz * 2.5));
    col = mix(col, params.line.rgb, paint * worn * 0.92);
    col = mix(col, params.yellow.rgb, ypaint * worn * 0.92);

    out.base_color = vec4<f32>(col, 1.0);
    out.roughness = mix(params.rough - polish * 0.18 * params.wear, 0.6, max(paint, ypaint));
    out.metallic = 0.0;
    return out;
}
