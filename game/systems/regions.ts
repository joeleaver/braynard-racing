// Regions (components/region.ts): which one each player is driving in. When a player drives into a
// region, or arrives in one, its name shows on the free-roam HUD for a few seconds (screens/roam_hud.ts).
// Out of every region (between them, on the Ring) nothing shows.
//
// Runs in `react`, after physics, where the karts have moved.
import { race, seats, ROAM } from "./state";
import { drivenKart } from "./players";

/** How long a region's name stays on the HUD after you drive in, in seconds. */
const NAME_SHOWS = 4;
/** Points taken round each region's curve to make its outline. */
const SAMPLES = 96;

const R = pw.component("region");
const regionName = R.text("name");
// The outlines, rebuilt only when a region's curve or name changes (derived from the scene, so a rewind
// can't leave them wrong).
const outlines = { key: "", list: [] };

pw.registerSystem("region outlines", { phase: "react", includeComponents: ["region", "curve"] }, ({ objects }) => {
  const list = [...objects];
  const key = list.map((o) => `${o.get(regionName)}:${o.curve.length.toFixed(2)}`).join("|");
  if (key === outlines.key) return;
  outlines.key = key;
  outlines.list = list.map((o) => ({
    name: o.get(regionName) ?? "",
    points: [...Array(SAMPLES).keys()].map((i) => {
      const p = o.curve.at(i / SAMPLES);
      return [p[0], p[2]];
    }),
  }));
});

/** Whether [x, z] is inside a closed outline (even-odd rule). */
function inside(points, x, z) {
  let yes = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i];
    const [xj, zj] = points[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) yes = !yes;
  }
  return yes;
}

/** The region at [x, z]: its name, or "" between regions. The first that holds it wins. */
export function regionAt(x, z) {
  for (const r of outlines.list) if (inside(r.points, x, z)) return r.name;
  return "";
}

const S = pw.component("seat");
const regionOf = S.text("region");
const shows = S.property("regionShow");
const player = pw.field("controls", "player");
const position = pw.vec3("transform", "position");

pw.registerSystem("regions", { phase: "react", includeComponents: ["seat", "controls"] }, ({ objects }) => {
  const dt = objects.dt;
  for (const seat of objects) {
    const kart = drivenKart(seat);
    const here = seats.get(seat.get(player))?.here ?? false;
    if (race.phase !== ROAM || !here || kart === null || !kart.exists || !kart.active) {
      if ((seat.get(regionOf) ?? "") !== "") seat.set(regionOf, "");
      seat.set(shows, 0);
      continue;
    }
    const at = kart.get(position);
    const now = regionAt(at[0], at[2]);
    if (now !== (seat.get(regionOf) ?? "")) {
      seat.set(regionOf, now);
      seat.set(shows, now === "" ? 0 : NAME_SHOWS);
    } else seat.set(shows, Math.max(0, seat.get(shows) - dt));
  }
});
