// Braynard Racing's systems, in the order they run each tick.
//
// Before physics: the race's phase is read, the seats counted (who is here, what they picked), the
// race moves on (the host starts it; it ends when every kart is in), the grid hands each kart to a
// player or the game, each kart is fitted with its effects and its driver's build and takes the handling
// that gives (systems/kart_build.ts), the drivers ask (a player through their controls, a rival by reading the
// track), the kart turns those asks into the Vehicle's engine, brake and steer and its drift and
// boost, and the tyres take the grip the drift gives them. In the open world (a Free Roam card) there is no
// lobby: each player drives their own kart (spawned from their racer's base kart while they're here, systems/players.ts), put back at the safe spot their save keeps (systems/save.ts),
// and the dev menu's tools (systems/dev_seats.ts, world.ts, dev_hold.ts, dev_view.ts) sit alongside. After physics: laps and places are counted
// along the track, the chase cameras follow, each player is shown their own, and the music follows
// the race.
import "./systems/race_phase";
import "./systems/roam";
import "./systems/seats";
import "./systems/race";
import "./systems/players";
import "./systems/grid";
import "./systems/kart_build";
import "./systems/dev_seats";
import "./systems/map";
import "./systems/save";
import "./systems/menu";
import "./systems/pull_ups";
import "./systems/settings";
import "./systems/world";
import "./systems/driver";
import "./systems/signals";
import "./systems/rivals";
import "./systems/dev_hold";
import "./systems/kart";
import "./systems/tyres";
import "./systems/dust";
import "./systems/laps";
import "./systems/regions";
import "./systems/stats";
import "./systems/front_tyres";
import "./systems/chase_camera";
import "./systems/views";
import "./systems/dev_view";
import "./systems/music";
import "./systems/telemetry";
