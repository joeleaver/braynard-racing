// Logs a kart's motion and each wheel's contact every tick, for any object carrying a Telemetry card:
//   K <tick> <label> <height> <up speed> <speed> <pitch°> <roll°> <drift> <progress>
//   W <tick> <label> <on ground> <compression> <load> <surface>
// Runs in `react`, after physics. Nothing carries a Telemetry card in the scene as shipped; put one on
// the kart and its wheels to measure a run.
import { dev } from "./state";

const label = pw.field("telemetry", "label");
const position = pw.vec3("transform", "position");
const rotation = pw.quat("transform", "rotation");
const speed = pw.field("kart", "speed");
const driftDir = pw.field("kart", "driftDir");
const progress = pw.field("kart", "progress");
let tick = 0;
const deg = (r) => ((r * 180) / Math.PI).toFixed(1);

pw.registerSystem("telemetry karts", { phase: "react", includeComponents: ["telemetry", "kart", "rigid_body"] }, ({ objects }) => {
  tick += 1;
  for (const k of objects) {
    const rot = k.get(rotation);
    const fwd = pw.rotateVector([0, 0, -1], rot);
    const right = pw.rotateVector([1, 0, 0], rot);
    const at = k.get(position);
    const v = k.rigidBody.velocity;
    console.log(`K ${tick} ${k.get(label)} ${at[1].toFixed(3)} ${v[1].toFixed(2)} ${k.get(speed).toFixed(2)} ${deg(Math.asin(fwd[1]))} ${deg(Math.asin(right[1]))} ${k.get(driftDir)} ${k.get(progress).toFixed(4)}`);
  }
});

pw.registerSystem("telemetry wheels", { phase: "react", includeComponents: ["telemetry", "wheel"] }, ({ objects }) => {
  for (const w of objects) {
    console.log(`W ${tick} ${w.get(label)} ${w.wheel.onGround ? 1 : 0} ${w.wheel.compression.toFixed(3)} ${w.wheel.load.toFixed(0)} ${w.wheel.surface ?? "-"}`);
  }
});

// The drift probe, for measuring handling in Play without touching the scene: an agent says the "dev"
// event with what "probe" (n: 1 on, 0 off) and that seat's kart logs, every tick,
//   D <tick> <seat> <x> <z> <heading°> <speed> <slip°> <yaw°/s> <drift> <charge> <boost> <steer ask> <surface>
// slip is how far the nose is turned across the kart's path (positive into a right turn's outside);
// heading is 0 along −Z, positive turning right. Nothing in a player's game says it.
const probing = new Set();
// "solo" (n: 1 on, 0 off): every kart the game drives is parked high in the sky, out of the way, so a
// measured run is the same each time. Testing only.
let solo = false;
// "put" (place: "x,z,heading°", heading 0 along −Z, positive turning right): that seat's kart is dropped
// there at rest, for a run on open ground. Testing only.
const puts = new Map();
let ptick = 0;
const P = Object.fromEntries(["human", "speed", "driftDir", "charge", "boost", "steerAsk"].map((n) => [n, pw.field("kart", n)]));

pw.registerSystem("telemetry drift probe", { phase: "react", includeComponents: ["kart", "rigid_body"], events: ["dev"] }, ({ objects, events, physics }) => {
  // Only where the dev tools are on (a Dev Tools card), as the dev menu's own actions: in a shared game
  // nobody can park the others' karts or drop their own somewhere.
  for (const e of dev.enabled ? events : []) {
    if (e.what === "solo") solo = e.n !== 0;
    if (e.what === "put") puts.set(e.seat, e.place.split(",").map(Number));
    if (e.what !== "probe") continue;
    if (e.n !== 0) probing.add(e.seat);
    else probing.delete(e.seat);
  }
  ptick += 1;
  if (!dev.enabled) solo = false;
  if (solo) {
    let n = 0;
    for (const k of objects) {
      if (k.get(P.human) !== 0) continue;
      k.rigidBody.teleport([n * 6, 300, 0]);
      k.rigidBody.velocity = [0, 0, 0];
      k.rigidBody.angularVelocity = [0, 0, 0];
      n += 1;
    }
  }
  if (puts.size > 0) {
    for (const k of objects) {
      const to = puts.get(k.get(P.human));
      if (to === undefined) continue;
      const hit = physics.ray([to[0], 500, to[1]], [0, -1, 0], 1000, { exclude: k });
      k.rigidBody.teleport([to[0], (hit === null ? 0 : hit.point[1]) + 0.6, to[1]]);
      k.rigidBody.velocity = [0, 0, 0];
      k.rigidBody.angularVelocity = [0, 0, 0];
      k.set(rotation, pw.axisAngle([0, 1, 0], (-(to[2] ?? 0) * Math.PI) / 180));
    }
    puts.clear();
  }
  if (probing.size === 0) return;
  for (const k of objects) {
    const seat = k.get(P.human);
    if (seat === 0 || !probing.has(seat)) continue;
    const rot = k.get(rotation);
    const fwd = pw.rotateVector([0, 0, -1], rot);
    const right = pw.rotateVector([1, 0, 0], rot);
    const up = pw.rotateVector([0, 1, 0], rot);
    const at = k.get(position);
    const v = k.rigidBody.velocity;
    const w = k.rigidBody.angularVelocity;
    const along = v[0] * fwd[0] + v[1] * fwd[1] + v[2] * fwd[2];
    const across = v[0] * right[0] + v[1] * right[1] + v[2] * right[2];
    const yaw = -(w[0] * up[0] + w[1] * up[1] + w[2] * up[2]);
    const hit = physics.ray([at[0], at[1] + 0.5, at[2]], [0, -1, 0], 1.6, { exclude: k });
    console.log(
      `D ${ptick} ${seat} ${at[0].toFixed(2)} ${at[2].toFixed(2)} ${deg(Math.atan2(fwd[0], -fwd[2]))} ${along.toFixed(2)} ` +
        `${deg(Math.atan2(across, Math.max(Math.abs(along), 0.1)))} ${deg(yaw)} ${k.get(P.driftDir)} ${k.get(P.charge).toFixed(2)} ` +
        `${k.get(P.boost).toFixed(2)} ${k.get(P.steerAsk).toFixed(2)} ${hit === null ? "-" : hit.surface}`,
    );
  }
});
