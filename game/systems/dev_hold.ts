// Karts and the testing tools: a kart whose player has the dev menu open, or is flying their free
// camera, waits (no throttle, no steering); and a kart sent somewhere — by the dev menu, or by the save
// on arrival (systems/save.ts) — is put there, facing the way it should, at rest.
//
// Runs in `act`, after the drivers ask and before the kart turns the asks into driving.
import { dev } from "./state";

const K = pw.component("kart");
const ask = Object.fromEntries(["steerAsk", "gasAsk", "brakeAsk", "driftAsk", "respawnAsk"].map((n) => [n, K.property(n)]));
const human = K.property("human");
const speed = K.property("speed");
const reset = ["boost", "driftDir", "charge", "held", "penalty", "rolledFor"].map((n) => K.property(n));
const player = pw.field("controls", "player");
const position = pw.vec3("transform", "position");
const rotation = pw.quat("transform", "rotation");

/** How high above the ground a sent kart is dropped, so its wheels settle onto it. */
const LIFT = 0.6;

pw.registerSystem("dev hold", { includeComponents: ["kart", "controls", "rigid_body"] }, ({ objects, physics }) => {
  // Where each seat's kart is now, for a player arriving beside another.
  const at = new Map();
  for (const kart of objects) {
    at.set(kart.get(player), kart.get(position));
    const nose = pw.rotateVector([0, 0, -1], kart.get(rotation));
    dev.kartAt.set(kart.get(player), { at: kart.get(position), heading: Math.atan2(-nose[0], -nose[2]) });
  }

  for (const kart of objects) {
    const seat = kart.get(player);
    if (seat === 0) continue;
    if (dev.holding.has(seat) && kart.get(human) === seat) {
      kart.set(ask.steerAsk, 0);
      kart.set(ask.gasAsk, 0);
      // Brake to a stop, then let go: held on, the brake would start reversing.
      kart.set(ask.brakeAsk, kart.get(speed) > 0.3 ? 1 : 0);
      kart.set(ask.driftAsk, 0);
      kart.set(ask.respawnAsk, 0);
    }
    const send = dev.sends.get(seat);
    if (send === undefined) continue;
    let to = send.to;
    let heading = send.heading ?? 0;
    if (send.beside !== undefined) {
      // Beside another player's kart: four metres to its right, facing the same way.
      const there = at.get(send.beside);
      if (there === undefined) continue;
      const other = objects.find((o) => o.get(player) === send.beside);
      const q = other === undefined ? [0, 0, 0, 1] : other.get(rotation);
      const right = pw.rotateVector([1, 0, 0], q);
      to = [there[0] + right[0] * 4, there[1], there[2] + right[2] * 4];
      const nose = pw.rotateVector([0, 0, -1], q);
      heading = Math.atan2(-nose[0], -nose[2]);
    }
    // Onto whatever is under the spot (a free camera's spot is usually in the air).
    const hit = physics.ray([to[0], to[1] + (send.drop ? 0 : 2), to[2]], [0, -1, 0], send.drop ? 500 : 10, { exclude: kart });
    const y = hit !== null ? hit.point[1] : to[1];
    kart.rigidBody.teleport([to[0], y + LIFT, to[2]]);
    kart.rigidBody.velocity = [0, 0, 0];
    kart.rigidBody.angularVelocity = [0, 0, 0];
    kart.set(rotation, pw.axisAngle([0, 1, 0], heading));
    for (const r of reset) kart.set(r, 0);
  }
});
