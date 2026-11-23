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
// stop: how far along the span (u) the line is, 0 for none; rule: 1 give way (a double dashed line),
// 2 stop (one solid line 0.45 m wide), 3 lights (one solid line 0.2 m wide); warn: over this many metres before the line
// the centre line turns to long warning dashes. Braynard drives on the left, so the line crosses the half
// the traffic comes in on: at the start end that's the +across side, at the end end the -across side.
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
param role: f32 = 0.0 range(0, 2);
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

// The line across the way in: `d` metres from where it stands, onto the road; `side` metres across into
// the incoming half; `out` where that half ends.
fn way_in(d: f32, side: f32, out: f32, rule: f32, aa: f32) -> f32 {
    if rule < 0.5 || side < 0.0 || side > out { return 0.0; }
    if rule < 1.5 {
        // Give way: two dashed lines, 0.6 m dashes across the lane.
        let dashes = dashed(side, 0.6, 0.9, aa);
        return max(stroke(d - 0.15, 0.1, aa), stroke(d - 0.55, 0.1, aa)) * dashes;
    }
    if rule < 2.5 { return stroke(d - 0.225, 0.225, aa); }    // stop: 0.45 m, to read apart from lights
    return stroke(d - 0.1, 0.1, aa);                            // lights
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
fn through(p: vec2<f32>, pair: vec4<f32>, aa: f32) -> f32 {
    let i = i32(pair.x + 0.5);
    let j = i32(pair.y + 0.5);
    if i < 1 || j < 1 { return 0.0; }
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
    let lines = params.through_w;
    if lines.w >= 1.5 {
        paint = stroke(side, lines.y * 0.5, aa);
    } else if lines.w >= 0.5 {
        paint = stroke(side, lines.y * 0.5, aa) * dashed(along, params.through_d.x, params.through_d.y, aa);
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
    return paint;
}

// A roundabout's markings: a dashed give-way line round the ring's outer edge across each way in (the
// half the traffic comes in on).
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
        let s = dot(p, lk);
        if dot(p, uk) > 0.0 && s > 0.0 && s < mk.w + 1.0 {
            let lines = max(stroke(r - outer - 0.15, 0.1, aa), stroke(r - outer - 0.55, 0.1, aa));
            paint = max(paint, lines * dashed(s, 0.6, 0.9, aa));
        }
    }
    return paint;
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

    var paint = 0.0;
    let lanes_out = params.median + params.lanes * params.lane_width;   // where the lanes end
    // Near a junction's line the centre line turns to long warning dashes.
    let warning = (params.warn_a > 0.0 && along < params.stop_a + params.warn_a)
        || (params.warn_b > 0.0 && params.stop_b > 0.0 && along > params.stop_b - params.warn_b);
    if params.median <= 0.0 {
        if params.centre >= 1.5 {
            paint = max(paint, stroke(across, params.line_width * 0.5, aa));
        } else if warning {
            paint = max(paint, stroke(across, params.line_width * 0.5, aa) * dashed(along, params.period * 0.75, params.period, aa));
        } else if params.centre >= 0.5 {
            paint = max(paint, stroke(across, params.line_width * 0.5, aa) * dashed(along, params.dash, params.period, aa));
        }
    } else {
        paint = max(paint, stroke(side - params.median, params.edge_width * 0.5, aa));
        if params.hatch > 0.0 && side < params.median {
            paint = max(paint, hatched(along, side, params.hatch, aa));
        }
    }
    // Lane lines between the lanes each way.
    for (var k = 1.0; k < params.lanes; k = k + 1.0) {
        let at = params.median + k * params.lane_width;
        paint = max(paint, stroke(side - at, params.line_width * 0.5, aa) * dashed(along, params.lane_dash, params.period, aa));
    }
    // The edge line where the lanes end, and the hard shoulder beyond it.
    if params.edge_width > 0.0 && lanes_out < params.half_width {
        paint = max(paint, stroke(side - lanes_out, params.edge_width * 0.5, aa));
        if params.hatch > 0.0 && side > lanes_out + params.edge_width && side < params.half_width - 0.2 {
            paint = max(paint, hatched(along, side, params.hatch, aa));
        }
    }

    // A junction's pad: the priority road carried through; a roundabout's: its give-way lines.
    if params.role > 0.5 {
        let p = s.uv;
        if params.role < 1.5 {
            paint = max(paint, through(p, params.through_1, aa));
            paint = max(paint, through(p, params.through_2, aa));
        } else {
            paint = max(paint, roundabout(p, aa));
        }
    }

    // The lines across the way in at the span's ends.
    let lanes_in = min(lanes_out, params.half_width);
    if params.stop_a > 0.0 {
        paint = max(paint, way_in(along - params.stop_a, across, lanes_in, params.rule_a, aa));
    }
    if params.stop_b > 0.0 {
        paint = max(paint, way_in(params.stop_b - along, -across, lanes_in, params.rule_b, aa));
    }

    let worn = 0.75 + 0.25 * smoothstep(0.2, 0.5, vnoise(s.world.xz * 2.5));
    col = mix(col, params.line.rgb, paint * worn * 0.92);

    out.base_color = vec4<f32>(col, 1.0);
    out.roughness = mix(params.rough, 0.6, paint);
    out.metallic = 0.0;
    return out;
}
