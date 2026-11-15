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
  menuPage: pw.int(0, { group: "Menu", doc: "The pause menu's page: 0 Map, 1 Friends, 2 Garage, 3 Settings, 4 Help, 5 Quit." }),
  menuHeld: pw.int(0, { group: "Menu", doc: "1 while the menu button is held, so a press toggles it once." }),
  froze: pw.int(0, { group: "Menu", doc: "1 while this player's pause menu has frozen the game (they are alone in it)." }),
  scaleBefore: pw.float(1, { group: "Menu", doc: "The time scale before the pause menu froze it, to put back." }),
  alone: pw.int(1, { group: "Menu", doc: "1 while this player is the only one in the game, copied here for the screens." }),

  // The save (systems/save.ts).
  placed: pw.int(0, { group: "Save", doc: "1 once this player has been put at their saved spot (or beside the host) this run." }),
  spotClock: pw.float(0, { group: "Save", doc: "Seconds of safe driving since their spot was last saved." }),
  money: pw.int(0, { group: "Save", doc: "Their money, copied from their save for the screens." }),
  spotSaved: pw.int(0, { group: "Save", doc: "1 while their save holds a spot in the world." }),
});
