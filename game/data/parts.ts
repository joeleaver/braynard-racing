// The parts a player can fit to a kart (Design, "Racers and karts" → "Attachments"): wheels, small
// attachments and paint. Each part is a small blueprint fitted to a socket on the racer's base kart
// (data/karts.ts), and may nudge the kart's handling. A kart's handling is its racer's base
// (data/handling.ts) with every fitted part's changes added on top; physics and the HUD read only the
// result, on the kart's own card.
//
// A player's build is kept per racer in their save: loadout.karts[racer] =
//   { parts: { wheels: name }, attachments: { socket: name }, paint: name }
// A part is fitted only if the player has unlocked it (unlocks.parts / unlocks.attachments / unlocks.paint).
//
// Changes stay small, so no part is a must-have: `add` adds to a stat (data/handling.ts's names, or
// `mass`), and `grip` multiplies the tyres' grip.
import { statsOf } from "./handling";

/** Wheels: one blueprint fitted to every wheel socket, made one metre in radius and scaled to each wheel. */
export const WHEELS = {
  knobbly: { name: "Knobbly tyres", blueprint: "Wheels: knobbly", add: { topSpeed: -0.4, mass: 4 }, grip: 1.06 },
};

/** Attachments: each goes on one socket. */
export const ATTACHMENTS = {
  headlamp: { name: "Headlamp", blueprint: "Lamp: headlamp", socket: "lights", add: {} },
};

/** Paint: a colour for the body's paint, once the karts' bodies carry recolour masks (a later step). */
export const PAINT = {};

/** The sockets an attachment can go on, in the order the Kart Build card lists them. */
export const SOCKETS = ["front", "rear", "exhaust", "horn", "dash", "lights"];

const STOCK = { wheels: "", attachments: {}, paint: "" };

/** The build a seat's player has for racer `n`, with only what exists and they have unlocked; the stock kart for seat 0 (the game's). */
export function buildOf(seat, n) {
  if (seat === 0) return STOCK;
  const save = pw.save(seat);
  const kept = save.get("loadout", null)?.karts?.[n] ?? null;
  if (kept === null || typeof kept !== "object") return STOCK;
  const open = save.get("unlocks", null) ?? {};
  const has = (list, name) => Array.isArray(list) && list.includes(name);
  const wheels = kept.parts?.wheels ?? "";
  const attachments = {};
  for (const socket of SOCKETS) {
    const name = kept.attachments?.[socket] ?? "";
    const a = ATTACHMENTS[name];
    if (a !== undefined && a.socket === socket && has(open.attachments, name)) attachments[socket] = name;
  }
  const paint = kept.paint ?? "";
  return {
    wheels: WHEELS[wheels] !== undefined && has(open.parts, wheels) ? wheels : "",
    attachments,
    paint: PAINT[paint] !== undefined && has(open.paint, paint) ? paint : "",
  };
}

/** A build as a short line, for the Kart Build card's `fitted`: what is fitted is refitted when this changes. */
export function signatureOf(n, build) {
  const a = SOCKETS.map((s) => build.attachments[s] ?? "").join(",");
  return `${n}|${build.wheels}|${a}|${build.paint}`;
}

/** The parts of a build, each with what it changes. */
function partsOf(build) {
  const parts = [];
  if (build.wheels !== "") parts.push(WHEELS[build.wheels]);
  for (const s of SOCKETS) if (build.attachments[s] !== undefined) parts.push(ATTACHMENTS[build.attachments[s]]);
  return parts;
}

/** A kart's stats with its build on top: data/handling.ts's for racer ratings `r`, each part's `add` added, and the tyres' grip share. */
export function handlingOf(r, build) {
  const stats = { ...statsOf(r), grip: 1 };
  for (const part of partsOf(build)) {
    for (const [k, v] of Object.entries(part.add ?? {})) if (k in stats) stats[k] += v;
    if (part.grip !== undefined) stats.grip *= part.grip;
  }
  return stats;
}
