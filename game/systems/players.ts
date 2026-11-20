// The open world's players (Design, "Game systems" → "Playing together"): up to eight in a county, each
// with their own rig (the "Player 1" blueprint: a seat, a kart for every racer with a chase camera each,
// and a free camera). While a player is here, the kart of the racer in their loadout is switched on and
// the rest of their karts are off; an empty seat's karts are all off, so they aren't drawn, hit nothing
// and aren't driven by the game. systems/save.ts puts an arriving player's kart where it belongs.
//
// Picking another racer (the pause menu's Racers tab says "menu" with what "racer") saves it in the
// loadout; the new racer's kart takes the old one's place and heading, and its racer's handling
// (data/handling.ts).
//
// Runs in `act`, after the seats are counted and before the grid hands out the karts.
import { race, dev, seats, ROAM } from "./state";
import { racer as racerOf } from "../data/racers";
import { statsOf, STAT_NAMES } from "../data/handling";

const S = pw.component("seat");
/** A seat's karts, in racer order: Hettie's (racer 1) first. */
const KARTS = ["kart", "kart2", "kart3", "kart4", "kart5", "kart6", "kart7", "kart8"].map((n) => pw.object("seat", n));
const f = Object.fromEntries(["kartOn", "racer", "racerShown", "swapPending", "swapHeading", "swapX", "swapY", "swapZ"].map((n) => [n, S.property(n)]));
const player = pw.field("controls", "player");
const position = pw.vec3("transform", "position");
const rotation = pw.quat("transform", "rotation");

/** Which way a kart faces on the ground (radians, 0 is −Z), as systems/dev_seats.ts measures it. */
function headingOf(q) {
  const nose = pw.rotateVector([0, 0, -1], q);
  return Math.atan2(-nose[0], -nose[2]);
}

/** The kart a seat's player drives now (null outside the open world's rigs). */
export function drivenKart(seat) {
  const r = seat.get(f.racerShown) || seat.get(f.racer) || 1;
  const kart = seat.get(KARTS[r - 1]);
  return kart !== null && kart.exists ? kart : null;
}

/** The racer a player's loadout names, if they've unlocked it; Hettie otherwise. */
function loadoutRacer(n) {
  const save = pw.save(n);
  const want = save.get("loadout", { racer: 1 })?.racer ?? 1;
  const open = save.get("unlocks", { racers: [1] })?.racers ?? [1];
  return Array.isArray(open) && open.includes(want) ? want : 1;
}

pw.registerSystem("players", { includeComponents: ["seat", "controls"], events: ["menu"] }, ({ objects, events }) => {
  if (race.phase !== ROAM) return;
  for (const e of events) {
    if (e.what !== "racer" || e.n < 1 || e.n > 8) continue;
    const save = pw.save(e.seat);
    const open = save.get("unlocks", { racers: [1] })?.racers ?? [1];
    if (Array.isArray(open) && open.includes(e.n)) save.set("loadout", { ...save.get("loadout", { racer: 1, karts: {} }), racer: e.n });
  }
  for (const seat of objects) {
    const n = seat.get(player);
    const here = seats.get(n)?.here ?? false;
    const want = here ? loadoutRacer(n) : 0;
    const shown = seat.get(f.racerShown);
    seat.set(f.racer, want || 1);
    // A swap while driving: the new kart starts where the old one is, facing the same way.
    if (here && shown !== 0 && shown !== want) {
      const old = seat.get(KARTS[shown - 1]);
      if (old !== null && old.exists) {
        const at = old.get(position);
        seat.set(f.swapX, at[0]);
        seat.set(f.swapY, at[1]);
        seat.set(f.swapZ, at[2]);
        seat.set(f.swapHeading, headingOf(old.get(rotation)));
        seat.set(f.swapPending, 1);
      }
      seat.set(f.kartOn, 0);
    }
    seat.set(f.racerShown, want);
    for (let r = 1; r <= 8; r++) {
      const kart = seat.get(KARTS[r - 1]);
      if (kart === null || !kart.exists) continue;
      const on = r === want;
      if (kart.active !== on) kart.active = on;
    }
    // A kart switched on joins the world's sets at the tick's end, so it can be moved from the next tick.
    seat.set(f.kartOn, here ? Math.min(2, seat.get(f.kartOn) + 1) : 0);
    if (seat.get(f.swapPending) === 1 && seat.get(f.kartOn) >= 2) {
      dev.sends.set(n, { to: [seat.get(f.swapX), seat.get(f.swapY), seat.get(f.swapZ)], heading: seat.get(f.swapHeading) });
      seat.set(f.swapPending, 0);
    }
    if (!here) seat.set(f.swapPending, 0);
  }
});

// Each kart drives as its racer does: the racer's handling, as a race gives it (systems/grid.ts).
const K = pw.component("kart");
const kRacer = K.property("racer");
const mass = pw.field("rigid_body", "mass");
const STATS = STAT_NAMES.map((n) => [n, K.property(n)]);

pw.registerSystem("roam handling", { includeComponents: ["kart", "rigid_body"] }, ({ objects }) => {
  if (race.phase !== ROAM) return;
  for (const kart of objects) {
    const r = racerOf(kart.get(kRacer));
    if (r === undefined) continue;
    const stats = statsOf(r);
    for (const [n, field] of STATS) if (kart.get(field) !== stats[n]) kart.set(field, stats[n]);
    if (kart.get(mass) !== stats.mass) kart.set(mass, stats.mass);
  }
});
