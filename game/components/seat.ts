// A seat in the game: one object for each of the eight, carrying a Controls card for that seat's
// player, so the game can tell who is here (their controls read something) and what they chose.
pw.defineComponent("seat", {
  here: pw.int(0, { doc: "1 while a player is on this seat." }),
  entered: pw.int(0, { doc: "1 once they are past the title screen." }),
  picked: pw.int(0, { doc: "The racer they picked, 1 to 8 as on a kart's card; 0 for none yet." }),
  ready: pw.int(0, { doc: "1 while they are ready to race." }),
  name: pw.text("", { doc: "The name they go by, kept in their save; empty until they choose one." }),
  countdown: pw.float(0, { unit: "s", doc: "Seconds until the race starts once everyone is ready, 0 while not everyone is; copied here for the screens." }),
  phase: pw.int(0, { doc: "The race's phase (0 the lobby, 1 racing, 2 the results), copied here for the screens." }),
  host: pw.int(0, { doc: "The seat that takes everyone back to the lobby after a race, copied here for the screens." }),

  // The dev menu (systems/dev.ts, screens/dev.ts).
  devOpen: pw.int(0, { group: "Dev", doc: "1 while this player has the dev menu open." }),
  devPage: pw.int(0, { group: "Dev", doc: "The dev menu's page: 0 Go to, 1 World, 2 Camera, 3 Restart, 4 Save." }),
  devHeld: pw.int(0, { group: "Dev", doc: "1 while the dev menu's button is held, so a press toggles it once." }),
  devOk: pw.int(0, { group: "Dev", doc: "1 when this scene lets players open the dev menu (a Dev Tools card), copied here for the screens." }),
  fly: pw.int(0, { group: "Dev", doc: "1 while this player flies their free camera." }),
  seeHour: pw.float(0, { group: "Dev", doc: "The time of day, copied here for the dev menu." }),
  seeWeather: pw.int(0, { group: "Dev", doc: "The weather, copied here for the dev menu." }),
  seeScale: pw.float(1, { group: "Dev", doc: "The time scale, copied here for the dev menu." }),

  // The front gate card and the pause menu (systems/menu.ts, screens/gate.ts, screens/pause.ts).
  gateDone: pw.int(0, { group: "Menu", doc: "1 once this player has dismissed the front gate card this visit." }),
  gateClock: pw.float(0, { group: "Menu", doc: "Seconds the front gate card has been up." }),
  menuOpen: pw.int(0, { group: "Menu", doc: "1 while this player has the pause menu open." }),
  menuPage: pw.int(0, { group: "Menu", doc: "The pause menu's tab: 0 Journal, 1 Map, 2 Scrapbook, 3 Racers, 4 Garage, 5 Friends, 6 Settings, 7 Help, 8 Quit." }),
  menuSub: pw.int(0, { group: "Menu", doc: "The Journal's page: 0 Quests, 1 Events." }),
  tabHeld: pw.int(0, { group: "Menu", doc: "Which tab buttons are held (1 next, 2 previous), so a press moves one tab." }),
  menuHeld: pw.int(0, { group: "Menu", doc: "1 while the menu button is held, so a press toggles it once." }),
  froze: pw.int(0, { group: "Menu", doc: "1 while this player's pause menu has frozen the game (they are alone in it)." }),
  scaleBefore: pw.float(1, { group: "Menu", doc: "The time scale before the pause menu froze it, to put back." }),
  alone: pw.int(1, { group: "Menu", doc: "1 while this player is the only one in the game, copied here for the screens." }),

  // Settings (systems/settings.ts, the pause menu's Settings tab).
  settingsApplied: pw.int(0, { group: "Settings", doc: "1 once this player's saved sound and picture settings have been put back this visit." }),
  setSub: pw.int(0, { group: "Settings", doc: "The Settings tab's section: 0 Controls, 1 Sound, 2 Picture, 3 Accessibility, 4 Game." }),
  opts: pw.int(0, { group: "Settings", doc: "Options on, one bit each: 1 drift toggles, 2 auto-accelerate, 4 big text, 8 reduced motion, 16 subtitles, 32 mph, 64 ghosts, 128 friends' ghosts, 256 colour-safe markers." }),
  confirmClear: pw.int(0, { group: "Settings", doc: "Delete my save: 0 not asked, 1 asked once, 2 asked twice." }),
  // This player's controls for each action, for the screen: labels joined by "|", "*" before the one
  // being listened for and "~" before one they changed. (A card's text holds 256 bytes, so one per action.)
  bindStick: pw.text("", { group: "Settings", doc: "Steer and throttle's controls." }),
  bindGas: pw.text("", { group: "Settings", doc: "Throttle's controls." }),
  bindBrake: pw.text("", { group: "Settings", doc: "Brake's controls." }),
  bindDrift: pw.text("", { group: "Settings", doc: "Drift's controls." }),
  bindRespawn: pw.text("", { group: "Settings", doc: "Back on the road's controls." }),
  bindMenu: pw.text("", { group: "Settings", doc: "The pause menu's controls." }),
  bindMap: pw.text("", { group: "Settings", doc: "The county map's controls." }),
  driftLatch: pw.int(0, { group: "Settings", doc: "With drift as a toggle: 1 while drift is on." }),
  driftWas: pw.int(0, { group: "Settings", doc: "With drift as a toggle: 1 while the drift button was down last tick." }),

  // Fun stats, counted as you play (systems/stats.ts) and kept in the save; copied here for the Scrapbook.
  statLoaded: pw.int(0, { group: "Stats", doc: "1 once this player's stats have been read from their save this visit." }),
  statFlush: pw.float(0, { group: "Stats", doc: "Seconds since the stats were last written to the save." }),
  statPlayed: pw.float(0, { group: "Stats", unit: "s", doc: "Time played." }),
  statDriven: pw.float(0, { group: "Stats", unit: "m", doc: "Distance driven." }),
  statBestDrift: pw.float(0, { group: "Stats", unit: "s", doc: "Longest drift." }),
  statBestAir: pw.float(0, { group: "Stats", unit: "s", doc: "Longest time in the air." }),
  statDrifts: pw.int(0, { group: "Stats", doc: "Drifts." }),
  statTurbos: pw.int(0, { group: "Stats", doc: "Mini-turbos." }),
  statDriftNow: pw.float(0, { group: "Stats", unit: "s", doc: "The drift going on now, so far." }),
  statAirNow: pw.float(0, { group: "Stats", unit: "s", doc: "The jump going on now, so far." }),
  eggs: pw.int(0, { group: "Stats", doc: "Golden eggs found, copied from the save for the Scrapbook." }),
  racerBits: pw.int(1, { group: "Stats", doc: "Racers unlocked, one bit each (Hettie is 1), copied from the save for the Racers tab." }),

  // The save (systems/save.ts).
  placed: pw.int(0, { group: "Save", doc: "1 once this player has been put at their saved spot (or beside the host) this run." }),
  spotClock: pw.float(0, { group: "Save", doc: "Seconds of safe driving since their spot was last saved." }),
  money: pw.int(0, { group: "Save", doc: "Their money, copied from their save for the screens." }),
  spotSaved: pw.int(0, { group: "Save", doc: "1 while their save holds a spot in the world." }),
});
