// The time of day and the weather. The sun (a Daylight card on a directional light) is turned across
// the sky from the hour and dimmed toward sunrise and sunset, and under cloud; the sky darkens on its own
// once the sun is down. The Weather card sets the fog and the haze. The dev menu sets the hour, how fast
// it passes, the weather and the game's time scale, and in a shared game only the host's word counts:
// the world is everybody's.
//
// Runs in `act`.
import { dev, host } from "./state";

const W = pw.component("weather");
const w = Object.fromEntries(["kind", "clearView", "overcastView", "fogView", "thins", "fogThins"].map((n) => [n, W.property(n)]));
const visibility = pw.field("fog", "visibility");
const thins = pw.field("fog", "thins");
const haze = pw.field("sky", "haze");
/** How much of the sun gets through, and how hazy the air is, for each kind of weather. */
const SUN = [1, 0.35, 0.55];
const HAZE = [1.3, 3, 6];
let sunShare = 1;

const said = (events, what) => events.filter((e) => e.what === what && e.seat === host());

let kindNow = -1;
pw.registerSystem("weather", { includeComponents: ["weather", "fog"], events: ["dev"] }, ({ objects, events }) => {
  sunShare = 1;
  kindNow = -1;
  for (const o of objects) {
    for (const e of said(events, "weather")) o.set(w.kind, Math.max(0, Math.min(2, Math.round(e.n))));
    const kind = o.get(w.kind);
    o.set(visibility, o.get([w.clearView, w.overcastView, w.fogView][kind]));
    o.set(thins, kind === 2 ? o.get(w.fogThins) : o.get(w.thins));
    sunShare = SUN[kind];
    kindNow = kind;
    dev.weather = kind;
  }
});

// The air thickens with the weather.
pw.registerSystem("weather sky", { includeComponents: ["sky"] }, ({ objects }) => {
  if (kindNow < 0) return;
  for (const o of objects) o.set(haze, HAZE[kindNow]);
});

const D = pw.component("daylight");
const d = Object.fromEntries(["hour", "speed", "sunrise", "sunset", "noonHeight", "facing", "lux"].map((n) => [n, D.property(n)]));
const intensity = pw.field("light", "intensity");
const rotation = pw.quat("transform", "rotation");
const RAD = Math.PI / 180;

/** q · r, both [x, y, z, w]. */
function mul(q, r) {
  const [ax, ay, az, aw] = q;
  const [bx, by, bz, bw] = r;
  return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
}

pw.registerSystem("daylight", { includeComponents: ["daylight", "light"], events: ["dev"] }, ({ objects, events }) => {
  for (const e of said(events, "speed")) pw.time.scale = Math.max(0, Math.min(10, e.n));
  for (const o of objects) {
    for (const e of said(events, "time")) o.set(d.hour, ((e.n % 24) + 24) % 24);
    for (const e of said(events, "clock")) o.set(d.speed, Math.max(0, e.n));
    // The clock: game hours per real minute.
    const hour = (((o.get(d.hour) + (o.get(d.speed) * objects.dt) / 60) % 24) + 24) % 24;
    o.set(d.hour, hour);
    dev.hour = hour;

    // Up from the sunrise side, over the midday sun's direction, down on the sunset side; below the
    // horizon through the night.
    const rise = o.get(d.sunrise);
    const set = o.get(d.sunset);
    const day = set - rise;
    const t = (hour - rise) / day;
    const up = t >= 0 && t <= 1;
    const nightT = up ? 0 : ((hour - set + 24) % 24) / (24 - day);
    const height = up ? o.get(d.noonHeight) * Math.sin(Math.PI * t) : -20 * Math.sin(Math.PI * nightT);
    const across = up ? t : 1 - nightT;
    const compass = o.get(d.facing) - 90 + 180 * across;
    // The light shines along its −Z: turned to face away from where the sun is.
    const yaw = (180 - compass) * RAD;
    const pitch = -height * RAD;
    const q = mul([0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], [Math.sin(pitch / 2), 0, 0, Math.cos(pitch / 2)]);
    o.set(rotation, q);
    // Full light once the sun is about 20° up, none below the horizon.
    const share = Math.max(0, Math.min(1, Math.sin(height * RAD) * 3));
    o.set(intensity, o.get(d.lux) * share * sunShare);
  }
});
