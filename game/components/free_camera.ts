// A free camera for one seat, flown from the dev menu's Camera page: the stick or WASD moves, the right
// stick or the mouse looks, E and Q (or the bumpers) rise and sink, drift held goes faster. The object
// needs a Camera card too. The kart waits where it was while the camera flies.
pw.defineComponent("freeCamera", {
  seat: pw.int(1, { doc: "The seat it belongs to." }),
  speed: pw.float(18, { unit: "m/s", doc: "How fast it flies; drift held is four times as fast." }),
  turn: pw.float(2.2, { unit: "rad/s", doc: "How fast the right stick turns it." }),
  mouse: pw.float(0.003, { unit: "rad/px", doc: "How far a pixel of mouse movement turns it." }),
  yaw: pw.float(0, { group: "Doing", doc: "Which way it faces, about the vertical." }),
  pitch: pw.float(0, { group: "Doing", doc: "How far it looks up or down." }),
});
