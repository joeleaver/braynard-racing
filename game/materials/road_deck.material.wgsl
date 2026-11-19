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
    if params.median <= 0.0 {
        if params.centre >= 1.5 {
            paint = max(paint, stroke(across, params.line_width * 0.5, aa));
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

    let worn = 0.75 + 0.25 * smoothstep(0.2, 0.5, vnoise(s.world.xz * 2.5));
    col = mix(col, params.line.rgb, paint * worn * 0.92);

    out.base_color = vec4<f32>(col, 1.0);
    out.roughness = mix(params.rough, 0.6, paint);
    out.metallic = 0.0;
    return out;
}
