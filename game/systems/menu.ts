// The front gate card and the pause menu (Design, "Game systems" → "From boot to free roam").
//
// - The front gate card: in free roam, a small card over the live world for the first seconds after a
//   player arrives (Continue, Play with friends, Settings). Any drive input, or ten seconds, dismisses it.
// - The pause menu: the menu button (Escape, P or Start) opens and closes it; it's the only menu. Alone
//   in the game, it freezes time and puts it back after; with others, the game never pauses and the
//   player's kart pulls up while the menu is open. Opening it saves the player's spot if it's a safe one.
//
// Runs in `act`, after the dev menu's seats and before systems/dev_hold.ts, which holds the karts.
import { race, dev, seats, ROAM } from "./state";
import { pauseSave, saveNow } from "./dev_seats";

/** How long the front gate card stays up if nobody touches anything, in seconds. */
const GATE_FOR = 10;
/** How long before a drive input can dismiss it, so a held key from loading doesn't. */
const GATE_SETTLE = 0.6;

const S = pw.component("seat");
const f = Object.fromEntries(["gateDone", "gateClock", "menuOpen", "menuPage", "menuHeld", "froze", "scaleBefore", "alone", "placed", "devOpen"].map((n) => [n, S.property(n)]));
const player = pw.field("controls", "player");
const a = Object.fromEntries(["menu", "map", "stick", "gas", "brake", "drift"].map((n) => [n, pw.action("drive", n)]));

function open(seat, n, page) {
  if (seat.get(f.menuOpen) === 0) pauseSave.add(n);
  seat.set(f.menuOpen, 1);
  seat.set(f.menuPage, page);
  seat.set(f.gateDone, 1);
}

pw.registerSystem("menus", { includeComponents: ["seat", "controls"], events: ["menu", "map"] }, ({ objects, events }) => {
  const here = [...seats.values()].filter((s) => s.here).length;
  const alone = here <= 1;
  let freezing = false;
  let froze = false;
  let before = 1;
  for (const seat of objects) {
    const n = seat.get(player);
    seat.set(f.alone, alone ? 1 : 0);
    if (seat.get(f.froze) === 1) {
      froze = true;
      before = seat.get(f.scaleBefore);
    }
    if (!(seats.get(n)?.here ?? false)) {
      seat.set(f.gateDone, 0);
      seat.set(f.gateClock, 0);
      seat.set(f.menuOpen, 0);
      seat.set(f.menuHeld, 0);
      continue;
    }

    // The front gate card: free roam only, once the player has been put in the world.
    if (race.phase === ROAM && seat.get(f.placed) === 1 && seat.get(f.gateDone) === 0) {
      const t = seat.get(f.gateClock) + objects.dt;
      const [sx, sy] = seat.get(a.stick) ?? [0, 0];
      const driving = Math.hypot(sx, sy) > 0.4 || (seat.get(a.gas) ?? 0) > 0.3 || (seat.get(a.brake) ?? 0) > 0.3 || seat.get(a.drift) === true;
      seat.set(f.gateClock, t);
      // Opening the county map (M or the d-pad) dismisses it too.
      if (t >= GATE_FOR || (t >= GATE_SETTLE && driving) || seat.get(a.map) === true) seat.set(f.gateDone, 1);
    }

    // The menu button: a press opens or closes the pause menu (it closes the dev menu first if that's open).
    const down = seat.get(a.menu) === true;
    if (down && seat.get(f.menuHeld) === 0) {
      if (seat.get(f.menuOpen) === 1) seat.set(f.menuOpen, 0);
      else if (seat.get(f.devOpen) !== 1) open(seat, n, 0);
    }
    seat.set(f.menuHeld, down ? 1 : 0);

    for (const e of events) {
      if (e.seat !== n) continue;
      // Opening the county map from the menu hands over to it (systems/map.ts).
      if (e.name === "map") {
        if (e.what === "open") {
          seat.set(f.menuOpen, 0);
          seat.set(f.gateDone, 1);
        }
        continue;
      }
      const page = Math.max(0, Math.min(5, Math.round(e.n)));
      if (e.what === "continue") seat.set(f.gateDone, 1);
      else if (e.what === "open") open(seat, n, page);
      else if (e.what === "close") seat.set(f.menuOpen, 0);
      else if (e.what === "page") seat.set(f.menuPage, page);
      else if (e.what === "quit") {
        saveNow.add(n);
        seat.set(f.menuPage, 5);
      }
    }

    const menuOpen = seat.get(f.menuOpen) === 1;
    if (menuOpen) dev.holding.add(n);
    if (menuOpen && alone) freezing = true;
  }

  // Alone with the menu open, time stands still; when it closes, or someone joins, it runs as before.
  if (freezing && !froze) {
    before = pw.time.scale;
    pw.time.scale = 0;
  } else if (!freezing && froze) pw.time.scale = before;
  for (const seat of objects) {
    seat.set(f.froze, freezing ? 1 : 0);
    seat.set(f.scaleBefore, before);
  }
});
