// The map sheets the game shows, each baked from the world's own data by tools/county_map.py (the
// height map and the road curves), so they never go stale: bake again when the ground or roads change.
// A sheet is an image in the library and the square of the world it covers, north (−Z) up.
// Design: Pimble, Braynard Racing/Design → "The map".
export const SHEET = {
  image: "Map: Home Farm",
  x0: -1200,
  z0: -800,
  size: 2000,
};

/** How close the cursor must come to a place for the waypoint to snap to it, in metres at zoom 1. */
export const SNAP = 60;
/** Zoom limits: 1 shows the whole sheet, 8 about 250 m across. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 8;
/** A pin is found by driving this close to it (or seeing it from a viewpoint, later). */
export const REVEAL = 150;
/** Pin kinds (components/map_pin.ts). */
export const KART = 9;
/** Arriving this close clears the waypoint. */
export const ARRIVE = 25;
/** Breadcrumbs along the route, at least this far apart (further on a long route, to fit). */
export const CRUMB = 30;
/** The most breadcrumbs a route shows: game text is at most 256 bytes, four letters a crumb. */
export const CRUMBS = 64;

// A crumb is packed as four letters, two for x and two for z, each 0–4095 across the sheet (half a
// metre on a 2 km sheet), so a route fits one text field.
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const q = (v, o) => Math.max(0, Math.min(4095, Math.round(((v - o) / SHEET.size) * 4095)));
export function packCrumbs(points) {
  return points.map(([x, z]) => {
    const a = q(x, SHEET.x0);
    const b = q(z, SHEET.z0);
    return ABC[a >> 6] + ABC[a & 63] + ABC[b >> 6] + ABC[b & 63];
  }).join("");
}
export function unpackCrumbs(s) {
  const out = [];
  const n = (c) => ABC.indexOf(c);
  for (let i = 0; i + 3 < s.length; i += 4) {
    out.push([
      SHEET.x0 + (((n(s[i]) << 6) | n(s[i + 1])) / 4095) * SHEET.size,
      SHEET.z0 + (((n(s[i + 2]) << 6) | n(s[i + 3])) / 4095) * SHEET.size,
    ]);
  }
  return out;
}
