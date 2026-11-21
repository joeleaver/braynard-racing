// Each kart's trail (components/dust.ts): what the ground under it throws up as it goes, so a kart
// leaves a cloud on dirt, clods on mud, glints on ice, smoke when it drifts on tarmac and sparks in a
// boost, and its exhaust smokes dark and thick under throttle and lightly as it cruises. Visual only:
// it starts and stops emitters, and rewinds with the game.
//
// The emitters are the shared effects set every kart is fitted with (systems/kart_build.ts): its trail,
// its exhaust and a set of drift sparks at each rear tyre, reached through the kart's Kart Build card.
// Drift sparks show the drift's tier: one emitter per tier (kinds 10 blue, 11 orange, 12 purple), and
// only the tier reached is lit. Each is bigger, denser and brighter than the last, and gives a burst as
// it starts, so a tier-up pops; they differ in size and density as well as colour, so they read for a
// colour-blind player too. (One emitter recoloured would do, but game code can't set a Particles card's
// colours yet.)
//
// A third of the karts are looked at each tick: a trail a twentieth of a second late is not seen, and
// the system stays cheap. Starting a playing emitter (or stopping a stopped one) does nothing.
const kind = pw.field("dust", "kind");
const speedOf = pw.field("kart", "speed");
const driftOf = pw.field("kart", "driftDir");
const boostOf = pw.field("kart", "boost");
const tierOf = pw.field("kart", "tier");
const gasOf = pw.field("kart", "gasAsk");
const topOf = pw.field("kart", "topSpeed");
const position = pw.vec3("transform", "position");
const PIECES = ["fxTrail", "fxExhaust", "fxSparkL", "fxSparkR"].map((n) => pw.object("kart_build", n));
const EMITTERS = ["e1", "e2", "e3", "e4", "e5", "e6", "e7"].map((n) => pw.object("kart_fx", n));

const BY_SURFACE = { dirt: 1, sand: 2, mud: 3, grass: 4, ice: 5 };
const SMOKE = 6;
const SPARKS = 7;
const EXHAUST_HARD = 8;
const EXHAUST_SOFT = 9;
/** The first drift-sparks kind: 10 blue, 11 orange, 12 purple. */
const DRIFT_SPARKS = 10;
const SHARES = 3;

let turn = 0;

pw.registerSystem("dust", { includeComponents: ["kart", "kart_build"] }, ({ objects, physics }) => {
  turn = (turn + 1) % SHARES;
  let i = -1;
  for (const kart of objects) {
    i += 1;
    if (i % SHARES !== turn) continue;
    const speed = Math.abs(kart.get(speedOf));
    // Pulling hard: the throttle open, the kart moving and still well short of its top speed.
    const pulling = kart.get(gasOf) > 0.3 && speed > 0.5 && speed < kart.get(topOf) * 0.85;
    const drifting = kart.get(driftOf) !== 0;
    const at = kart.get(position);
    const hit = physics.ray([at[0], at[1] + 0.5, at[2]], [0, -1, 0], 1.6, { exclude: kart });
    const ground = hit === null ? "" : hit.surface;
    // Blue (10), orange (11) or purple (12): only the drift's own tier is lit, on the ground.
    const tier = drifting && speed > 6 && ground !== "" ? kart.get(tierOf) : 0;
    for (const piece of PIECES) {
      const fx = kart.get(piece);
      if (fx === null || !fx.exists) continue;
      for (const e of EMITTERS) {
        const trail = fx.get(e);
        if (trail === null || !trail.exists) continue;
        const k = trail.get(kind);
        let on;
        if (k === EXHAUST_HARD) on = pulling;
        else if (k === EXHAUST_SOFT) on = !pulling;
        else if (k === SMOKE) on = ground === "tarmac" && drifting && speed > 6;
        else if (k === SPARKS) on = kart.get(boostOf) > 0 && speed > 5;
        else if (k >= DRIFT_SPARKS) on = tier === k - DRIFT_SPARKS + 1;
        else on = BY_SURFACE[ground] === k && speed > (k === 5 ? 6 : 3);
        if (on) trail.particles.start();
        else trail.particles.stop();
      }
    }
  }
});
