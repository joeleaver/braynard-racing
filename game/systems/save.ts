// The save, kept as you play (Design, "Game systems" → "What's saved, when and where"). Nothing here
// asks the player to save: the engine writes a save to disk within two seconds of a change.
//
// - Arriving: a player's save is brought up to date (data/save.ts), and in free roam the host (the
//   county's owner) is put back at their last safe spot, or at the start for a new player. Everyone
//   else arrives beside the host. systems/dev_hold.ts moves the karts.
// - Driving: every 10 seconds of safe driving in free roam (on the ground, upright, something solid
//   under the wheels) the host's spot is saved. Only the host's: a guest's spot belongs to their own
//   county.
//
// The arrival runs in `act`, before the karts drive; the spots in `react`, after the laps are counted.
import { race, dev, seats, host, ROAM } from "./state";
import { upgrade, spotOf, keepSpot } from "../data/save";
import { startOf, headingOf, saveNow } from "./dev_seats";

/** Seconds of safe driving between saved spots. */
const SPOT_EVERY = 10;

const S = pw.component("seat");
const f = Object.fromEntries(["placed", "spotClock", "money", "spotSaved"].map((n) => [n, S.property(n)]));
const player = pw.field("controls", "player");

pw.registerSystem("arrivals", { includeComponents: ["seat", "controls"] }, ({ objects }) => {
  const boss = host();
  for (const seat of objects) {
    const n = seat.get(player);
    if (!(seats.get(n)?.here ?? false)) {
      seat.set(f.placed, 0);
      seat.set(f.spotClock, 0);
      continue;
    }
    const save = upgrade(n);
    seat.set(f.money, save.get("money", 0));
    seat.set(f.spotSaved, spotOf(n) === null ? 0 : 1);
    if (race.phase !== ROAM || seat.get(f.placed) === 1) continue;
    seat.set(f.placed, 1);
    if (n === boss) {
      const spot = spotOf(n) ?? startOf();
      if (spot !== null) dev.sends.set(n, { to: [spot.x, spot.y, spot.z], heading: spot.heading });
    } else dev.sends.set(n, { beside: boss });
  }
});

// After physics: where each player's kart is, and whether it is somewhere safe to come back to.
const K = pw.component("kart");
const human = K.property("human");
const airborne = K.property("airborne");
const position = pw.vec3("transform", "position");
const rotation = pw.quat("transform", "rotation");
const standing = new Map();

pw.registerSystem("safe spots", { phase: "react", includeComponents: ["kart", "rigid_body"] }, ({ objects, physics }) => {
  standing.clear();
  for (const kart of objects) {
    const n = kart.get(human);
    if (n === 0) continue;
    const at = kart.get(position);
    const q = kart.get(rotation);
    const upright = 1 - 2 * (q[0] * q[0] + q[2] * q[2]);
    const ground = physics.ray([at[0], at[1] + 0.5, at[2]], [0, -1, 0], 2.5, { exclude: kart });
    const safe = race.phase === ROAM && kart.get(airborne) < 0.2 && upright > 0.9 && ground !== null;
    standing.set(n, { at, heading: headingOf(q), safe });
  }
});

pw.registerSystem("spots", { phase: "react", includeComponents: ["seat", "controls"] }, ({ objects }) => {
  const boss = host();
  const dt = objects.dt;
  for (const seat of objects) {
    const n = seat.get(player);
    const kart = standing.get(n);
    if (kart === undefined) continue;
    if (saveNow.has(n)) {
      keepSpot(n, kart.at, kart.heading);
      seat.set(f.spotClock, 0);
      continue;
    }
    if (n !== boss || !kart.safe) continue;
    const t = seat.get(f.spotClock) + dt;
    if (t >= SPOT_EVERY) {
      keepSpot(n, kart.at, kart.heading);
      seat.set(f.spotClock, 0);
    } else seat.set(f.spotClock, t);
  }
});
