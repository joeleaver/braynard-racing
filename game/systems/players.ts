// The open world's players (Design, "Game systems" → "Playing together"): up to eight in a county, each
// with their own rig (the "Player" blueprint: a seat, a kart, a chase camera and a free camera). A kart is
// switched on while its seat has somebody on it and off while it is empty, so an empty seat's kart is not
// drawn, hits nothing and isn't driven by the game. systems/save.ts then puts an arriving player's kart
// where it belongs, once it is on.
//
// Runs in `act`, after the seats are counted and before the grid hands out the karts.
import { race, seats, ROAM } from "./state";

const kartOf = pw.object("seat", "kart");
const player = pw.field("controls", "player");
const kartOn = pw.component("seat").property("kartOn");

pw.registerSystem("players", { includeComponents: ["seat", "controls"] }, ({ objects }) => {
  if (race.phase !== ROAM) return;
  for (const seat of objects) {
    const kart = seat.get(kartOf);
    if (kart === null || !kart.exists) continue;
    const here = seats.get(seat.get(player))?.here ?? false;
    if (kart.active !== here) kart.active = here;
    // A kart switched on joins the world's sets at the tick's end, so it can be moved from the next tick.
    seat.set(kartOn, here ? Math.min(2, seat.get(kartOn) + 1) : 0);
  }
});
