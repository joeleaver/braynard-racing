// Reads the scene's switches at the top of every tick, for the tick's other systems: a Free Roam card
// makes it the open world, and a Dev Tools card lets players open the dev menu. Runs right after
// systems/race_phase.ts, which clears them.
import { race, dev } from "./state";

const roamOn = pw.field("freeRoam", "on");
const enabled = pw.field("devTools", "enabled");
const sceneName = pw.component("devTools").text("scene");

pw.registerSystem("free roam", { includeComponents: ["freeRoam"] }, ({ objects }) => {
  for (const o of objects) if (o.get(roamOn) === 1) race.roam = true;
});

pw.registerSystem("dev tools", { includeComponents: ["devTools"] }, ({ objects }) => {
  for (const o of objects) {
    if (o.get(enabled) === 1) dev.enabled = true;
    dev.scene = o.get(sceneName) ?? "";
  }
});
