// The open world's players (Design, "Game systems" → "Playing together"): up to eight in a county, each
// with their own rig (the "Player 1" blueprint: a seat, a free camera and a chase camera). While a
// player is here, the kart of the racer in their loadout is spawned from that racer's base kart
// (data/karts.ts) and linked from their seat; systems/kart_build.ts then fits it with the effects set
// and the player's build. When they leave, it goes. systems/save.ts puts an arriving player's kart where
// it belongs.
//
// Picking another racer (the pause menu's Racers tab says "menu" with what "racer") saves it in the
// loadout; the old kart goes and the new racer's kart is spawned in its place, facing the same way.
//
// Runs in `act`, after the seats are counted and before the grid hands out the karts.
import { race, seats, ROAM } from "./state";
import { kartOf } from "../data/karts";

const S = pw.component("seat");
const kartLink = pw.object("seat", "kart");
const f = Object.fromEntries(["kartOn", "racer", "racerShown"].map((n) => [n, S.property(n)]));
const player = pw.field("controls", "player");
const position = pw.vec3("transform", "position");
const rotation = pw.quat("transform", "rotation");

/** How high above the ground a kart is spawned, so its wheels settle onto it. */
const DROP = 0.4;

/** Which way a kart faces on the ground (radians, 0 is −Z), as systems/dev_seats.ts measures it. */
function headingOf(q) {
  const nose = pw.rotateVector([0, 0, -1], q);
  return Math.atan2(-nose[0], -nose[2]);
}

/** The kart a seat's player drives now; null outside the open world's rigs, and on the tick it is spawned. */
export function drivenKart(seat) {
  const kart = seat.get(kartLink);
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
    const kart = seat.get(kartLink);
    const landed = kart !== null && kart.exists;
    if (!here) {
      if (landed) kart.despawn();
      if (kart !== null) seat.set(kartLink, null);
      seat.set(f.racerShown, 0);
      seat.set(f.kartOn, 0);
      continue;
    }
    const want = loadoutRacer(n);
    seat.set(f.racer, want);
    if (seat.get(f.racerShown) !== want) {
      // A swap while driving: the new kart starts where the old one is, facing the same way. Arriving,
      // it starts at the seat, and systems/save.ts puts it at the player's spot once it has landed.
      let at = seat.get(position);
      let heading = 0;
      if (landed) {
        at = kart.get(position);
        heading = headingOf(kart.get(rotation));
        kart.despawn();
      }
      const [x, y, z] = at;
      seat.set(kartLink, pw.spawn(pw.blueprint(kartOf(want).blueprint), { position: { x, y: y + DROP, z }, rotation: pw.axisAngle([0, 1, 0], heading) }));
      seat.set(f.racerShown, want);
      seat.set(f.kartOn, 1);
      continue;
    }
    // The tick after it is spawned the kart has landed: it is this seat's to drive from now on.
    if (landed && kart.get(player) !== n) kart.set(player, n);
    seat.set(f.kartOn, landed ? 2 : seat.get(f.kartOn));
  }
});
