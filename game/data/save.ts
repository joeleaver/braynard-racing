// What a player's save holds, and how an older save is brought up to date. One save per player
// (`pw.save(seat)`); the engine writes it to disk within two seconds of a change and when the game
// closes, so there is no manual saving. Design, "Game systems" → "What's saved, when and where".
//
//   v         the save's version, SAVE_VERSION once upgraded
//   name      the name the player goes by (systems/seats.ts)
//   progress  { season, won: { event: 1 }, courses: { course: { medal, best } }, eggs: [ids], achievements: [ids] }
//   unlocks   { racers: [1..8], parts: [names], attachments: [names], paint: [names] }
//   money     a whole number
//   loadout   { racer, karts: { racer: { parts, attachments, paint } } }
//   settings  { audio: { bus: volume }, graphics: { … }, access: { … }, game: { … } } (controls: the engine's rebinding)
//   where     { x, y, z, heading, region }: the last safe spot in the player's own county, and the region it is in
//   stats     { played (s), driven (m), longestDrift (s), longestAir (s), drifts, turbos, respawns }
//   journal   { tracked: quest id or "", quests: { id: { step, done } }, rumours: [ids] }

export const SAVE_VERSION = 2;

/** The fun stats the Scrapbook shows, and what each starts at. More join as their features do (tomato hits, honks, near misses). */
export const FRESH_STATS = { played: 0, driven: 0, longestDrift: 0, longestAir: 0, drifts: 0, turbos: 0, respawns: 0 };

/** What a new save starts with. */
export const FRESH = {
  progress: { season: 1, won: {}, courses: {}, eggs: [], achievements: [] },
  unlocks: { racers: [1], parts: [], attachments: [], paint: [] },
  money: 0,
  loadout: { racer: 1, karts: {} },
  settings: { audio: {}, graphics: {}, access: {}, game: {} },
  stats: FRESH_STATS,
  journal: { tracked: "", quests: {}, rumours: [] },
};

/** Each step brings a save from one version to the next. Add one with each change to the save's shape. */
const UPGRADES = {
  // 0 → 1: the first versioned save. Today's saves hold only `name`; give them the rest.
  0: (save) => {
    for (const [key, value] of Object.entries(FRESH)) if (save.get(key, null) === null) save.set(key, value);
  },
  // 1 → 2: the journal (quests, the tracked one, rumours heard) and more fun stats for the Scrapbook.
  1: (save) => {
    if (save.get("journal", null) === null) save.set("journal", FRESH.journal);
    save.set("stats", { ...FRESH_STATS, ...save.get("stats", {}) });
  },
};

/** Bring a player's save up to SAVE_VERSION. Safe to call every tick: it does nothing once it is. */
export function upgrade(seat) {
  const save = pw.save(seat);
  let v = save.get("v", 0);
  while (v < SAVE_VERSION) {
    UPGRADES[v](save);
    v += 1;
    save.set("v", v);
  }
  return save;
}

/** The player's last safe spot, or null when they have none. */
export function spotOf(seat) {
  const w = pw.save(seat).get("where", null);
  return w !== null && typeof w === "object" && typeof w.x === "number" ? w : null;
}

/** Keep a spot as the player's last safe one. */
export function keepSpot(seat, at, heading, region = "") {
  const r = (v) => Math.round(v * 100) / 100;
  pw.save(seat).set("where", { x: r(at[0]), y: r(at[1]), z: r(at[2]), heading: r(heading), region });
}

/** Add to (or, below 0, take from) the player's money; it never goes below 0. */
export function addMoney(seat, amount) {
  const save = pw.save(seat);
  save.set("money", Math.max(0, Math.round(save.get("money", 0) + amount)));
}

/** Unlock every racer (the dev menu's Unlock everything). Parts and paint join as they exist. */
export function unlockAll(seat) {
  const save = pw.save(seat);
  const unlocks = save.get("unlocks", FRESH.unlocks);
  save.set("unlocks", { ...unlocks, racers: [1, 2, 3, 4, 5, 6, 7, 8] });
}
