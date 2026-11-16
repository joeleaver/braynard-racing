// Places you pull up to (components/pull_up.ts). For each player in the open world: the nearest one
// whose radius their kart is inside is "near" (the HUD prompts), and once the kart has stood still there
// for a moment its board opens (screens/pull_up.ts) and the kart is held. Leave (the board's button, or
// the menu button: systems/menu.ts) closes it; it doesn't open again until the kart has left the radius.
//
// Runs in `act`, after the menus and before systems/dev_hold.ts, which holds the karts.
import { race, dev, seats, ROAM } from "./state";
import { drivenKart } from "./players";

/** Below this speed a kart counts as stopped, in metres a second. */
const STOPPED = 1;
/** How long a kart stands still before the board opens, in seconds. */
const SETTLE = 0.3;

const P = pw.component("pull_up");
const pName = P.text("name");
const pKind = P.property("kind");
const pRadius = P.property("radius");
const position = pw.vec3("transform", "position");
// This tick's places, for the seats below.
const places = [];

pw.registerSystem("pull-up places", { includeComponents: ["pull_up"] }, ({ objects }) => {
  places.length = 0;
  for (const o of objects) places.push({ name: o.get(pName) ?? "", kind: o.get(pKind), radius: o.get(pRadius), at: o.get(position) });
});

const S = pw.component("seat");
const f = Object.fromEntries(["placeNear", "placeOpen", "placeKind", "placeStill", "placeDone", "menuOpen", "devOpen", "gateDone"].map((n) => [n, S.property(n)]));
const placeName = S.text("placeName");
const player = pw.field("controls", "player");
const speed = pw.field("kart", "speed");

pw.registerSystem("pull-ups", { includeComponents: ["seat", "controls"], events: ["pullup"] }, ({ objects, events }) => {
  const dt = objects.dt;
  for (const seat of objects) {
    const n = seat.get(player);
    const kart = drivenKart(seat);
    const here = seats.get(n)?.here ?? false;
    if (race.phase !== ROAM || !here || kart === null || !kart.exists || !kart.active) {
      for (const k of ["placeNear", "placeOpen", "placeStill", "placeDone"]) seat.set(f[k], 0);
      continue;
    }
    // The nearest place whose radius the kart is inside.
    const at = kart.get(position);
    let near = null;
    let best = Infinity;
    for (const p of places) {
      const d = Math.hypot(at[0] - p.at[0], at[2] - p.at[2]);
      if (d <= p.radius && d < best) {
        near = p;
        best = d;
      }
    }
    if (near === null) {
      for (const k of ["placeNear", "placeOpen", "placeStill", "placeDone"]) seat.set(f[k], 0);
      continue;
    }
    if ((seat.get(placeName) ?? "") !== near.name) seat.set(placeName, near.name);
    seat.set(f.placeKind, near.kind);
    seat.set(f.placeNear, 1);

    for (const e of events) if (e.seat === n && e.what === "leave") {
      seat.set(f.placeOpen, 0);
      seat.set(f.placeDone, 1);
    }
    // Stood still for a moment, with no other menu or the front gate card up: the board opens.
    const busy = seat.get(f.menuOpen) === 1 || seat.get(f.devOpen) === 1 || seat.get(f.gateDone) !== 1;
    const still = Math.abs(kart.get(speed)) < STOPPED ? seat.get(f.placeStill) + dt : 0;
    seat.set(f.placeStill, still);
    if (seat.get(f.placeOpen) === 0 && seat.get(f.placeDone) === 0 && !busy && still >= SETTLE) seat.set(f.placeOpen, 1);
    if (seat.get(f.placeOpen) === 1) dev.holding.add(n);
  }
});
