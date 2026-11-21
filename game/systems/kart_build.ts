// Putting a kart together (Design, "Racers and karts" → "How a kart is put together in the game"). A
// racer's base kart arrives bare: a player's is spawned when they pick the racer (systems/players.ts),
// and a race's karts are placed in the scene. On its first tick here it is fitted with the shared
// effects set, and with the build of the player driving it (data/parts.ts: wheels, attachments, paint),
// each part a small blueprint on its socket; a build that changes is taken off and fitted afresh. Then
// its handling is its racer's base with the build's changes on top, written to its own card, which is
// all physics and the HUD read.
//
// Parts are fitted from the kart's own system, so the kart's card can link each one: that is how the
// effects and the tyres are reached later (systems/dust.ts, systems/front_tyres.ts).
//
// Runs in `act`, after the players pick and the grid hands out the karts, before anyone drives.
import { racer } from "../data/racers";
import { kartOf, EFFECTS } from "../data/karts";
import { WHEELS, ATTACHMENTS, SOCKETS, buildOf, signatureOf, handlingOf } from "../data/parts";
import { STAT_NAMES } from "../data/handling";

const B = pw.component("kart_build");
const L = Object.fromEntries(
  ["wheel1", "wheel2", "wheel3", "wheel4", "stock1", "stock2", "stock3", "stock4", "tyre1", "tyre2", "tyre3", "tyre4",
    "fxTrail", "fxExhaust", "fxSparkL", "fxSparkR", ...SOCKETS].map((n) => [n, pw.object("kart_build", n)]),
);
const fitted = B.text("fitted");
const grip = B.property("grip");
const racerOf = pw.field("kart", "racer");
const player = pw.field("controls", "player");
const radius = pw.field("wheel", "radius");
const mass = pw.field("rigid_body", "mass");
const STATS = STAT_NAMES.map((n) => [n, pw.field("kart", n)]);

/** How every kart's tyre models hang under their wheels: turned half round, outside face out (systems/front_tyres.ts). */
const REST = pw.axisAngle([0, 1, 0], Math.PI);

/** Spawn a part on the kart, saying in the log (not throwing) when the kart has no such socket. */
function fit(kart, blueprint, socket, more = {}) {
  try {
    return pw.spawn(pw.blueprint(blueprint), { parent: kart, socket, ...more });
  } catch (e) {
    console.error(`kart build: ${blueprint} on ${socket}: ${e}`);
    return null;
  }
}

/** Take the build's parts off, and show the stock tyres again. */
function strip(kart) {
  for (let i = 1; i <= 4; i++) {
    const tyre = kart.get(L[`tyre${i}`]);
    if (tyre !== null && tyre.exists) tyre.despawn();
    kart.set(L[`tyre${i}`], null);
    const stock = kart.get(L[`stock${i}`]);
    if (stock !== null && stock.exists && !stock.active) stock.active = true;
  }
  for (const s of SOCKETS) {
    const part = kart.get(L[s]);
    if (part !== null && part.exists) part.despawn();
    kart.set(L[s], null);
  }
}

pw.registerSystem("kart build", { includeComponents: ["kart", "kart_build", "controls"] }, ({ objects }) => {
  for (const kart of objects) {
    const n = kart.get(racerOf);
    const base = kartOf(n);
    if (base === undefined) continue;
    // The effects set, once: it is the same on every kart, whatever the build.
    for (const fx of EFFECTS) {
      const on = kart.get(L[fx.link]);
      if (on === null) {
        const copy = fit(kart, fx.blueprint, fx.socket);
        if (copy !== null) kart.set(L[fx.link], copy);
      }
    }
    const build = buildOf(kart.get(player), n);
    const want = signatureOf(n, build);
    if (kart.get(fitted) === want) continue;
    strip(kart);
    if (build.wheels !== "") {
      const wheels = WHEELS[build.wheels];
      base.wheels.forEach((socket, i) => {
        const wheel = kart.get(L[`wheel${i + 1}`]);
        const size = wheel !== null && wheel.exists ? wheel.get(radius) : 0.15;
        const stock = kart.get(L[`stock${i + 1}`]);
        if (stock !== null && stock.exists) stock.active = false;
        const tyre = fit(kart, wheels.blueprint, socket, { rotation: REST, scale: size });
        if (tyre !== null) kart.set(L[`tyre${i + 1}`], tyre);
      });
    }
    for (const s of SOCKETS) {
      const name = build.attachments[s];
      if (name === undefined) continue;
      const part = fit(kart, ATTACHMENTS[name].blueprint, s);
      if (part !== null) kart.set(L[s], part);
    }
    kart.set(fitted, want);
  }
});

// The handling the build gives: the racer's base with each part's changes, written only when it differs.
pw.registerSystem("kart handling", { includeComponents: ["kart", "kart_build", "controls", "rigid_body"] }, ({ objects }) => {
  for (const kart of objects) {
    const n = kart.get(racerOf);
    const r = racer(n);
    if (r === undefined) continue;
    const stats = handlingOf(r, buildOf(kart.get(player), n));
    for (const [name, field] of STATS) if (kart.get(field) !== stats[name]) kart.set(field, stats[name]);
    if (kart.get(mass) !== stats.mass) kart.set(mass, stats.mass);
    if (kart.get(grip) !== stats.grip) kart.set(grip, stats.grip);
  }
});
