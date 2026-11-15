// Fun stats for the Scrapbook (Design, "The pause menu's tabs"): time played, distance driven, the longest
// drift and the longest time in the air, how many drifts and mini-turbos. Counted on every machine from the
// shared game, kept in each player's seat while they play, and written to their save every few seconds and
// whenever the pause menu opens. The Scrapbook reads them off the seat. More stats join as their features do.
//
// Runs in `react`, after the laps are counted.
import { race, seats, ROAM, RACING } from "./state";
import { FRESH_STATS } from "../data/save";
import { pauseSave } from "./dev_seats";

/** Seconds between writes of the stats to the save. */
const FLUSH_EVERY = 5;
/** A drift or a jump shorter than this doesn't count, so a hop isn't a drift. */
const DRIFT_MIN = 0.4;
const AIR_MIN = 0.25;

// After physics: what each player's kart is doing this tick.
const K = pw.component("kart");
const k = Object.fromEntries(["human", "speed", "driftDir", "airborne", "boost"].map((n) => [n, K.property(n)]));
const doing = new Map();

pw.registerSystem("stats karts", { phase: "react", includeComponents: ["kart"] }, ({ objects }) => {
  doing.clear();
  for (const kart of objects) {
    const n = kart.get(k.human);
    if (n !== 0) doing.set(n, { speed: Math.abs(kart.get(k.speed)), drifting: kart.get(k.driftDir) !== 0, air: kart.get(k.airborne), boost: kart.get(k.boost) });
  }
});

const S = pw.component("seat");
const f = Object.fromEntries(
  ["statLoaded", "statFlush", "statPlayed", "statDriven", "statBestDrift", "statBestAir", "statDrifts", "statTurbos", "statDriftNow", "statAirNow", "eggs", "racerBits"].map((n) => [n, S.property(n)]),
);
const player = pw.field("controls", "player");
const KEYS = [["played", "statPlayed"], ["driven", "statDriven"], ["longestDrift", "statBestDrift"], ["longestAir", "statBestAir"], ["drifts", "statDrifts"], ["turbos", "statTurbos"]];

function flush(seat, n) {
  const save = pw.save(n);
  const kept = { ...FRESH_STATS, ...save.get("stats", {}) };
  for (const [key, field] of KEYS) kept[key] = Math.round(seat.get(f[field]) * 10) / 10;
  save.set("stats", kept);
  seat.set(f.statFlush, 0);
}

pw.registerSystem("stats", { phase: "react", includeComponents: ["seat", "controls"] }, ({ objects }) => {
  const dt = objects.dt;
  const counting = race.phase === ROAM || race.phase === RACING;
  for (const seat of objects) {
    const n = seat.get(player);
    if (!(seats.get(n)?.here ?? false)) {
      seat.set(f.statLoaded, 0);
      continue;
    }
    const save = pw.save(n);
    if (seat.get(f.statLoaded) === 0) {
      const s = { ...FRESH_STATS, ...save.get("stats", {}) };
      for (const [key, field] of KEYS) seat.set(f[field], s[key] ?? 0);
      seat.set(f.statDriftNow, 0);
      seat.set(f.statAirNow, 0);
      seat.set(f.statFlush, 0);
      seat.set(f.statLoaded, 1);
    }
    // For the Scrapbook and the Racers tab: golden eggs found and racers unlocked.
    const eggs = save.get("progress", {}).eggs;
    seat.set(f.eggs, Array.isArray(eggs) ? eggs.length : 0);
    const racers = save.get("unlocks", {}).racers;
    seat.set(f.racerBits, Array.isArray(racers) ? racers.reduce((bits, r) => bits | (1 << (r - 1)), 0) : 1);

    seat.set(f.statPlayed, seat.get(f.statPlayed) + dt);
    const kart = doing.get(n);
    if (counting && kart !== undefined) {
      seat.set(f.statDriven, seat.get(f.statDriven) + kart.speed * dt);
      // A drift: counted, and timed, when it ends; a mini-turbo when one starts.
      const driftNow = seat.get(f.statDriftNow);
      if (kart.drifting) seat.set(f.statDriftNow, driftNow + dt);
      else if (driftNow > 0) {
        if (driftNow >= DRIFT_MIN) {
          seat.set(f.statDrifts, seat.get(f.statDrifts) + 1);
          if (driftNow > seat.get(f.statBestDrift)) seat.set(f.statBestDrift, driftNow);
          if (kart.boost > 0) seat.set(f.statTurbos, seat.get(f.statTurbos) + 1);
        }
        seat.set(f.statDriftNow, 0);
      }
      // A jump: timed from leaving the ground to landing.
      if (kart.air > 0.05) seat.set(f.statAirNow, kart.air);
      else if (seat.get(f.statAirNow) > 0) {
        const air = seat.get(f.statAirNow);
        if (air >= AIR_MIN && air > seat.get(f.statBestAir)) seat.set(f.statBestAir, air);
        seat.set(f.statAirNow, 0);
      }
    }
    const t = seat.get(f.statFlush) + dt;
    if (t >= FLUSH_EVERY || pauseSave.has(n)) flush(seat, n);
    else seat.set(f.statFlush, t);
  }
});
