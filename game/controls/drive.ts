// Driving a kart. The stick (WASD, the arrows or a gamepad's left stick) steers with x; pushed forward
// it is the throttle and pulled back the brake, then reverse. A gamepad's triggers are the throttle and
// the brake too. Hold drift with a direction to hop into a drift; let go for the mini-turbo. The last five
// are testing tools: the dev menu's button, and the free camera's look, rise and sink.
pw.defineControls("drive", {
  stick: pw.stick(["wasd", "arrows", "pad:left-stick"]),
  gas: pw.axis(["pad:right-trigger"]),
  brake: pw.axis(["pad:left-trigger"]),
  drift: pw.button(["key:space", "key:shift", "pad:right-bumper", "pad:b"]),
  respawn: pw.button(["key:r", "pad:back"]),
  // The pause menu (systems/menu.ts).
  menu: pw.button(["key:escape", "key:p", "pad:start"]),
  // Testing: the dev menu, and the free camera it flies (systems/dev.ts).
  dev: pw.button(["key:`", "key:f1", "pad:right-stick-press"]),
  look: pw.stick(["pad:right-stick"]),
  mouse: pw.delta(["mouse:delta"]),
  rise: pw.button(["key:e", "pad:right-bumper"]),
  sink: pw.button(["key:q", "pad:left-bumper"]),
});
