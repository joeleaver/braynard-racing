// How a racer's ratings (data/racers.ts, 1 to 5) become their kart's stats: 3 is the kart the game was
// tuned with, and each step either side moves it by the same amount.
//
// The drift's feel is here too, so it is tuned in one place and every kart takes it when a race starts
// or a roaming kart is picked (systems/grid.ts, systems/players.ts), whatever its card was saved with.
// The drift target these numbers were tuned to is in Pimble: Braynard Racing › Design › Driving.

/** The drift every racer shares: how it swings in, holds its speed, builds its sparks and pays out. */
export const DRIFT = {
  driftRange: 0.05,
  driftSwing: 6,
  driftSwingMost: 2,
  driftSwingHeld: 0.25,
  driftKeep: 0.92,
  driftDrive: 700,
  tierBlue: 0.6,
  tierOrange: 1.3,
  tierPurple: 2.2,
  boostForce: 1500,
  boostSpeed: 4,
  boostBlue: 0.5,
  boostOrange: 0.9,
  boostPurple: 1.4,
};

/** The kart card's stats for `r`, a racer's ratings, and the rigid body's mass. */
export function statsOf(r) {
  const step = (rating, middle, per) => middle + (rating - 3) * per;
  return {
    topSpeed: step(r.speed, 21, 0.9),
    engineForce: step(r.accel, 520, 45),
    steerFast: step(r.handling, 0.2, 0.025),
    steerSlow: step(r.handling, 0.5, 0.03),
    driftTurn: step(r.drift, 1.1, 0.1),
    driftCarve: step(r.drift, 450, 45),
    ...DRIFT,
    mass: step(r.weight, 120, 14),
  };
}

/** The kart card fields statsOf sets (everything but the rigid body's mass). */
export const STAT_NAMES = Object.keys(statsOf({ speed: 3, accel: 3, handling: 3, drift: 3, weight: 3 })).filter((n) => n !== "mass");
