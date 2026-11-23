// The traffic lights, run from each junction's signal plan and its clock (components/road.ts: road_node,
// road_arm, signal_lamp). A junction's lights are worked out each tick from the plan and the seconds its
// lights have run, which is game state on its road_node: so every player sees the same colour, and a
// rewind or a player joining mid-game is right at once. Nothing else is remembered.
//
// Runs before the rivals (they read the colours and the stop lines); the lamps are lit after physics.
import { race } from "./state";

const N = pw.component("road_node");
const node = {
  key: N.text("key"),
  phases: N.property("phases"),
  green: N.property("green"),
  amber: N.property("amber"),
  allRed: N.property("all_red"),
  clock: N.property("clock"),
  phase: [1, 2, 3, 4].map((i) => N.text("phase_" + i)),
};
const A = pw.component("road_arm");
const arm = { key: A.text("key"), rule: pw.choice("road_arm", "rule"), group: A.property("signal_group") };
const L = pw.component("signal_lamp");
const lamp = { key: L.text("key"), group: L.property("group"), colour: pw.choice("signal_lamp", "colour") };
const rivalsRule = pw.choice("road_rules", "rivals");

/** This tick's lights, by junction key, and stop lines, for the rivals (and later traffic). */
const lights = new Map();
/** Each junction arm's stop line: its key, rule, signal group, its middle and its incoming edge in the world. */
export const stopLines = [];
/** The road rules card's choice this tick; the design's proposal without one. */
let rivalsChoice = "obey in free roam";

/** "green", "amber" or "red" for a junction's signal group now; null where the junction has no lights. */
export function colourOf(key, group) {
  const plan = lights.get(key);
  if (plan === undefined) return null;
  const per = plan.green + plan.amber + plan.allRed;
  if (per <= 0 || plan.phases.length === 0) return null;
  const t = plan.clock % (per * plan.phases.length);
  const k = Math.floor(t / per);
  const into = t - k * per;
  if (!plan.phases[k].has(group)) return "red";
  if (into < plan.green) return "green";
  if (into < plan.green + plan.amber) return "amber";
  return "red";
}

/** Whether rivals obey lights and lines this tick: the road rules card's choice, with the game's mode. */
export function rivalsObey() {
  if (rivalsChoice === "always obey") return true;
  if (rivalsChoice === "never obey") return false;
  return race.roam;
}

pw.registerSystem("road rules", { includeComponents: ["road_rules"] }, ({ objects }) => {
  for (const o of objects) rivalsChoice = o.get(rivalsRule) ?? "obey in free roam";
});

pw.registerSystem("signals", { includeComponents: ["road_node"] }, ({ objects }) => {
  const dt = objects.dt;
  lights.clear();
  for (const o of objects) {
    const count = o.get(node.phases);
    if (count <= 0) continue;
    const clock = o.get(node.clock) + dt;
    o.set(node.clock, clock);
    const phases = [];
    for (let i = 0; i < Math.min(4, count); i++) {
      phases.push(new Set((o.get(node.phase[i]) ?? "").split(",").map((g) => Number(g)).filter((g) => g > 0)));
    }
    lights.set(o.get(node.key) ?? "", { phases, green: o.get(node.green), amber: o.get(node.amber), allRed: o.get(node.allRed), clock });
  }
});

// Arms never move while the game runs, so the lines are read once, and again only when the arms change
// (a junction rebuilt in the editor, a scene with other junctions): an arm added, or one gone.
let armsSeen = -1;
pw.registerSystem("stop lines", { includeComponents: ["road_arm", "curve"] }, ({ objects }) => {
  const added = objects.added.length;
  if (added === 0 && objects.count === armsSeen) return;
  armsSeen = objects.count;
  stopLines.length = 0;
  for (const o of objects) {
    const curve = o.curve;
    stopLines.push({
      key: o.get(arm.key) ?? "",
      rule: o.get(arm.rule) ?? "",
      group: o.get(arm.group),
      middle: curve.at(0),
      edge: curve.at(1),
    });
  }
});

pw.registerSystem("signal lamps", { phase: "react", includeComponents: ["signal_lamp", "material"] }, ({ objects }) => {
  for (const o of objects) {
    const lit = colourOf(o.get(lamp.key) ?? "", o.get(lamp.group));
    o.material.set("on", lit !== null && lit === o.get(lamp.colour) ? 1 : 0);
  }
});
