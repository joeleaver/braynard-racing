material 3d;
// One lamp of a junction's signal head (components/road.ts, signal_lamp). Dark glass until lit: game code
// sets `on` (0 to 1) per lamp from the junction's signal plan and the clock (obj.material.set), and
// `colour` says which lamp it is. Grey-box: the art comes later, by the lamps' names.
param colour: color = (1.0, 0.15, 0.1, 1.0);
param on: f32 = 0.0 range(0, 1);
param glow: f32 = 6.0 range(0, 50);    // how bright a lit lamp shines

fn surface(s: SurfaceIn) -> Surface {
    var out = standard(s);
    // Unlit: the colour dimmed behind dark glass, so you can still tell red from green.
    out.base_color = vec4<f32>(params.colour.rgb * 0.12 + vec3<f32>(0.02), 1.0);
    out.roughness = 0.25;
    out.metallic = 0.0;
    out.emission = params.colour.rgb * params.on * params.glow;
    return out;
}
