material 3d;
// A sign's painted face: one picture (made by tools/sign_faces.py from the sign spec) laid over a flat
// side of a board. `corner` is where the picture's top-left corner sits in the side's own texture
// coordinates, `size` how far (in those coordinates, metres on a world shape) it reaches across and
// down. Outside the picture the board shows its own colour. Paint is matte with a light clay grain.
param face: texture = white;
param board: color = (0.12, 0.45, 0.23, 1.0);
param corner: vec2f = (0.0, 0.0);
param size: vec2f = (1.0, 1.0);
param flip_u: bool = false;
param flip_v: bool = false;
param grain: f32 = 0.25 range(0, 1);
param rough: f32 = 0.7 range(0, 1);
param probe: bool = false;          // shows the side's texture coordinates instead, to line a picture up

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

fn surface(s: SurfaceIn) -> Surface {
    var out = standard(s);
    var t = (s.uv - params.corner) / params.size;
    if params.flip_u { t.x = 1.0 - t.x; }
    if params.flip_v { t.y = 1.0 - t.y; }
    var col = params.board.rgb;
    if params.probe {
        col = vec3<f32>(fract(s.uv.x), fract(s.uv.y), 0.2);
    } else if t.x >= 0.0 && t.x <= 1.0 && t.y >= 0.0 && t.y <= 1.0 {
        let p = sample(params.face, t);
        col = mix(col, p.rgb, p.a);
    }
    // A light clay grain: the paint is hand-laid, never glossy.
    let g = vnoise(s.world.xy * 40.0 + s.world.zz * 40.0) - 0.5;
    col *= 1.0 + g * params.grain * 0.2;
    out.base_color = vec4<f32>(col, 1.0);
    out.roughness = params.rough;
    out.metallic = 0.0;
    return out;
}
