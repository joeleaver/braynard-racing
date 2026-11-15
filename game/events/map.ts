// What a map screen's buttons say (and an agent in Play can say directly): open or close the map,
// zoom, set the waypoint on a place or at a spot, or clear it.
// what: "open" | "close" | "zoom" (n: the zoom) | "mark" (place, or x and z) | "clear".
pw.defineEvent("map", {
  what: pw.text(""),
  place: pw.text(""),
  n: pw.float(0),
  x: pw.float(0),
  z: pw.float(0),
});
