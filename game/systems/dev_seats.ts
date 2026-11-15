// The dev menu, for each player: the button that opens and closes it, its pages, the free camera's
// switch, and the actions that send a kart somewhere or change the player's save. The world's actions
// (time of day, weather, time scale) are systems/world.ts's, and only the host's count there.
//
// Every action is the "dev" event (events/dev.ts), said by the menu's buttons or by an agent in Play.
// The kart's moves are carried out by systems/dev_hold.ts, which runs before the kart drives.
//
// Runs in `act`, after the grid.
import { dev, seats } from "./state";
import { spotOf, addMoney, unlockAll, upgrade } from "../data/save";

const P = pw.component("place");
const placeName = P.text("name");
const placeKind = P.property("kind");
const position = pw.vec3("transform", "position");
const rotation = pw.quat("transform", "rotation");

/** Which way an object faces, as a heading about the vertical (0 faces −Z). */
export function headingOf(q) {
  const nose = pw.rotateVector([0, 0, -1], q);
  return Math.atan2(-nose[0], -nose[2]);
}

// Every Place in the scene, for the menu's Go to page and for where a new player starts.
pw.registerSystem("places", { includeComponents: ["place"] }, ({ objects }) => {
  saveNow.clear();
  for (const o of objects) dev.places.push({ name: o.get(placeName) ?? "", kind: o.get(placeKind), at: o.get(position), heading: headingOf(o.get(rotation)) });
});

// Where each free camera is, for "the kart to the camera".
const camSeat = pw.field("freeCamera", "seat");
pw.registerSystem("free camera places", { includeComponents: ["freeCamera"] }, ({ objects }) => {
  for (const o of objects) dev.cameras.set(o.get(camSeat), { at: o.get(position), heading: headingOf(o.get(rotation)) });
});

const S = pw.component("seat");
const f = Object.fromEntries(["devOpen", "devPage", "devHeld", "devOk", "fly", "placed"].map((n) => [n, S.property(n)]));
const player = pw.field("controls", "player");
const a = Object.fromEntries(["dev", "stick", "look", "mouse", "rise", "sink", "drift"].map((n) => [n, pw.action("drive", n)]));

pw.registerSystem("dev seats", { includeComponents: ["seat", "controls"], events: ["dev"] }, ({ objects, events }) => {
  for (const seat of objects) {
    const n = seat.get(player);
    seat.set(f.devOk, dev.enabled ? 1 : 0);
    if (!dev.enabled || !(seats.get(n)?.here ?? false)) {
      seat.set(f.devOpen, 0);
      seat.set(f.fly, 0);
      seat.set(f.devHeld, 0);
      continue;
    }
    // The menu's button: a press opens or closes it.
    const down = seat.get(a.dev) === true;
    if (down && seat.get(f.devHeld) === 0) seat.set(f.devOpen, seat.get(f.devOpen) === 1 ? 0 : 1);
    seat.set(f.devHeld, down ? 1 : 0);

    for (const e of events) {
      if (e.seat !== n) continue;
      const what = e.what;
      if (what === "open") seat.set(f.devOpen, 1);
      else if (what === "close") seat.set(f.devOpen, 0);
      else if (what === "page") seat.set(f.devPage, Math.max(0, Math.min(4, Math.round(e.n))));
      else if (what === "fly") {
        const on = e.n !== 0 && dev.cameras.has(n);
        seat.set(f.fly, on ? 1 : 0);
        if (on) pw.pointer.lock(n);
        else pw.pointer.unlock(n);
      } else if (what === "goto") {
        const place = dev.places.find((p) => p.name === e.place);
        if (place !== undefined) dev.sends.set(n, { to: place.at, heading: place.heading });
      } else if (what === "here") {
        const cam = dev.cameras.get(n);
        if (cam !== undefined) dev.sends.set(n, { to: cam.at, heading: cam.heading, drop: true });
        seat.set(f.fly, 0);
        pw.pointer.unlock(n);
      } else if (what === "road") {
        const spot = spotOf(n) ?? startOf();
        if (spot !== null) dev.sends.set(n, { to: [spot.x, spot.y, spot.z], heading: spot.heading });
      } else if (what === "reload" && dev.scene !== "") {
        pw.changeScene(dev.scene);
      } else if (what === "money") addMoney(n, e.n);
      else if (what === "unlock") unlockAll(n);
      // Where the kart is now is known after physics: systems/save.ts saves it then.
      else if (what === "spot") saveNow.add(n);
      else if (what === "clear") {
        pw.save(n).clear();
        upgrade(n);
      }
    }

    const open = seat.get(f.devOpen) === 1;
    const flying = seat.get(f.fly) === 1;
    if (open || flying) dev.holding.add(n);
    if (flying) {
      dev.flying.set(n, {
        move: seat.get(a.stick) ?? [0, 0],
        look: seat.get(a.look) ?? [0, 0],
        mouse: seat.get(a.mouse) ?? [0, 0],
        rise: (seat.get(a.rise) === true ? 1 : 0) - (seat.get(a.sink) === true ? 1 : 0),
        fast: seat.get(a.drift) === true,
      });
    }
  }
});

/** Seats that asked for their spot to be saved this tick (systems/save.ts saves it after physics). */
export const saveNow = new Set();

/** Where a new player starts: the first Place of kind 2, else the first Place, else nowhere. */
export function startOf() {
  const p = dev.places.find((q) => q.kind === 2) ?? dev.places[0];
  return p === undefined ? null : { x: p.at[0], y: p.at[1], z: p.at[2], heading: p.heading };
}
