// The race's phase, read off the race card at the top of every tick into systems/state.ts, for the
// tick's other systems. Runs first.
import { race, dev } from "./state";

const phase = pw.field("race", "phase");

pw.registerSystem("race phase", { includeComponents: ["race"] }, ({ objects }) => {
  for (const r of objects) race.phase = r.get(phase);
  race.started = false;
  race.backToLobby = false;
  // Read afresh by systems/roam.ts and the dev systems, every tick.
  race.roam = false;
  dev.enabled = false;
  dev.scene = "";
  dev.flying.clear();
  dev.holding.clear();
  dev.sends.clear();
  dev.cameras.clear();
  dev.kartAt.clear();
  dev.places = [];
  dev.spawns = [];
});
