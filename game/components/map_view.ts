// A player's county map: what they see on it and where they're heading. One on each player's kart
// (beside its Controls card). systems/map.ts keeps it, screens/map.ts draws it. Design: Pimble,
// Braynard Racing/Design → "The map".
pw.defineComponent("map_view", {
  open: pw.int(0, { doc: "1 while this player has the full map open." }),
  zoom: pw.float(1, { doc: "How far in the map is: 1 shows the whole map sheet across the frame, 4 a quarter of it." }),
  cx: pw.float(0, { unit: "m", doc: "World x at the middle of the map frame (the cursor)." }),
  cz: pw.float(0, { unit: "m", doc: "World z at the middle of the map frame (the cursor)." }),
  held: pw.int(0, { doc: "The map controls held last tick, one bit each, so a press acts once." }),

  // The waypoint: one at a time, set on the map, cleared there or on arrival.
  wpOn: pw.int(0, { group: "Waypoint", doc: "1 while a waypoint is set." }),
  wpX: pw.float(0, { group: "Waypoint", unit: "m" }),
  wpZ: pw.float(0, { group: "Waypoint", unit: "m" }),
  wpName: pw.text("", { group: "Waypoint", doc: "The place it marks, or empty for a spot on the map." }),

  // Copied here each tick for the screens, which only read.
  heading: pw.float(0, { group: "For the screens", unit: "°", doc: "Which way the kart faces, clockwise from north (−Z)." }),
  dist: pw.float(0, { group: "For the screens", unit: "m", doc: "How far the waypoint is, along the route when there is one, else straight." }),
  bearing: pw.float(0, { group: "For the screens", unit: "°", doc: "Where the waypoint lies from the kart's nose, −180 to 180, clockwise." }),
  route: pw.text("", { group: "For the screens", doc: "Breadcrumbs along the roads to the waypoint, packed four letters a crumb (data/map.ts), at most 64 of them." }),
});
