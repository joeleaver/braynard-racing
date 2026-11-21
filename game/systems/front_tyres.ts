// Front tyres turn no further than they fit. The engine draws a steering Wheel turned by its whole
// steer, then rolled about its axle by its angle (pw_ecs `wheel_pose`), and the tyre model under it with
// it. Past the kart's `wheelSteerLock`, the tyre is turned back by the difference, about the Wheel's own
// up as it was before the roll, so it is drawn at the lock while the kart steers on as its handling
// says. Only the drawing changes.
//
// The tyre is whichever is on the wheel: the racer's own (the Kart Build card's stock link) or the
// fitted wheels' (its tyre link), so a kart's wheels can be swapped (systems/kart_build.ts).
//
// Runs in `react`, after the steer has been asked and the wheels have rolled.
const lockOf = pw.field("kart", "wheelSteerLock");
const steers = pw.field("wheel", "steers");
const rotation = pw.quat("transform", "rotation");
const SLOTS = [1, 2, 3, 4].map((i) => ({
  wheel: pw.object("kart_build", `wheel${i}`),
  stock: pw.object("kart_build", `stock${i}`),
  tyre: pw.object("kart_build", `tyre${i}`),
}));

/** How every kart's tyre models hang under their wheels: turned half round, outside face out. */
const REST = pw.axisAngle([0, 1, 0], Math.PI);

/** The rotation `a` then `b` (b applied first), quaternions [x, y, z, w]. */
function mul(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

pw.registerSystem("front tyres", { phase: "react", includeComponents: ["kart", "kart_build", "vehicle"] }, ({ objects }) => {
  for (const kart of objects) {
    const lock = (kart.get(lockOf) * Math.PI) / 180;
    const steer = kart.vehicle.steer;
    const held = lock > 0 ? Math.max(-lock, Math.min(lock, steer)) : steer;
    for (const slot of SLOTS) {
      const wheel = kart.get(slot.wheel);
      if (wheel === null || !wheel.exists || !wheel.get(steers)) continue;
      const fitted = kart.get(slot.tyre);
      const tyre = fitted !== null && fitted.exists ? fitted : kart.get(slot.stock);
      if (tyre === null || !tyre.exists) continue;
      // Drawn: wheel × turn(steer) × roll(−angle) × tyre. Wanted: wheel × turn(held) × roll(−angle) × rest.
      // So the tyre is roll(angle) × turn(held − steer) × roll(−angle) × rest.
      const angle = wheel.wheel.angle;
      const want = held === steer
        ? REST
        : mul(mul(pw.axisAngle([1, 0, 0], angle), pw.axisAngle([0, 1, 0], held - steer)), mul(pw.axisAngle([1, 0, 0], -angle), REST));
      tyre.set(rotation, want);
    }
  }
});
