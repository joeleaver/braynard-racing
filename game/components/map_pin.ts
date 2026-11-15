// Something the county map shows: a place, a course's start arch, a shop, an event, a secret, or a
// player's kart. Put one beside a Place, a start arch or a shop; every player's kart carries one too,
// so the map (screens/map.ts) sees them all in one go. Design: Pimble, Braynard Racing/Design → "The map".
pw.defineComponent("map_pin", {
  kind: pw.int(0, { doc: "0 a place, 1 a course's start, 2 home (the farm), 3 a shop, 4 an event, 5 a secret, 9 a player's kart." }),
  label: pw.text("", { doc: "Its name on the map: \"Barnyard Loop\", \"Spanners & Sprockets\". Empty for a kart." }),
  always: pw.int(0, { doc: "1 to show it from the start; otherwise a player finds it by driving within sight of it." }),
  found: pw.int(0, { doc: "Which players have found it, one bit each (seat 1 is 1, seat 2 is 2, seat 3 is 4 …). Kept by systems/map.ts." }),
  layer: pw.int(0, { doc: "Which map it's on: 0 the county, 1 underground, 2 Over the Moon." }),
});
