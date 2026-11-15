// The race as this tick's systems share it. Every field is read afresh from the scene's cards at the
// top of each tick (systems/race.ts and systems/seats.ts), so a rewound or joined game rebuilds it
// from the game state and never from what a machine remembered.

/** Where the race is: the lobby (picking racers), racing (countdown included), or the results. */
export const LOBBY = 0;
export const RACING = 1;
export const RESULTS = 2;
/** Free roam: the open world, where every player drives their own kart with no lobby (a Free Roam card). */
export const ROAM = 3;

/** The number of karts on the grid, one for each racer. */
export const FIELD = 8;

export const race = {
  phase: LOBBY,
  /** The tick the race moved into its phase: a race starting this tick, or the lobby coming back. */
  started: false,
  backToLobby: false,
  /** Everyone in the lobby has been ready long enough: the race starts this tick (systems/seats.ts). */
  startNow: false,
  /** This scene is the open world (a Free Roam card): systems/roam.ts. */
  roam: false,
};

/** The testing tools this tick (systems/roam.ts, systems/dev.ts, systems/world.ts). */
export const dev = {
  /** A Dev Tools card lets players open the dev menu. */
  enabled: false,
  /** This scene's name, for Reload scene; empty when the card doesn't say. */
  scene: "",
  /** The time of day and the weather, for the menu. */
  hour: 0,
  weather: 0,
  /** Each seat's input to its free camera this tick: { move, look, mouse, rise, fast }. */
  flying: new Map(),
  /** Seats whose kart should wait: their menu is open or they fly. */
  holding: new Set(),
  /** Karts' last orders this tick, by seat: { to: [x, y, z], heading } from the save or the dev menu. */
  sends: new Map(),
  /** Each free camera's place this tick, by seat, for "the kart to the camera". */
  cameras: new Map(),
  /** Where each seat's kart is this tick: { at, heading } (systems/dev_hold.ts). */
  kartAt: new Map(),
  /** Every Place this tick: { name, kind, at, heading }. */
  places: [],
};

/** Each seat in the game this tick, by seat number: whether somebody is there, and what they chose. */
export const seats = new Map();

/** Seat numbers with somebody on them who has come past the title screen, lowest first. */
export function players() {
  return [...seats.entries()].filter(([, s]) => s.here && s.entered).map(([n]) => n).sort((a, b) => a - b);
}

/** The player who takes everyone back to the lobby after a race: whoever has been in the game longest — the lowest seat with somebody
 * on it, the creator of a private game — or 0 with nobody there. On a player's own machine that is
 * them. */
export function host() {
  return [...seats.entries()].filter(([, s]) => s.here).map(([n]) => n).sort((a, b) => a - b)[0] ?? 0;
}

/** The racer a seat picked, 0 for none. */
export function pickOf(seat) {
  const s = seats.get(seat);
  return s && s.here && s.entered ? s.picked : 0;
}
