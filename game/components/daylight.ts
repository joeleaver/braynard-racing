// The time of day, on the scene's sun (a directional light). systems/world.ts turns the sun across the
// sky from the hour and dims it toward sunrise and sunset; the sky darkens on its own once the sun is down.
pw.defineComponent("daylight", {
  hour: pw.float(16.5, { unit: "h", doc: "The time of day, 0 to 24. 16.5 is the warm late afternoon the look is built on." }),
  speed: pw.float(0, { unit: "h/min", doc: "Game hours that pass each real minute; 0 holds the time." }),
  sunrise: pw.float(6, { unit: "h", doc: "When the sun comes up." }),
  sunset: pw.float(20, { unit: "h", doc: "When it goes down." }),
  noonHeight: pw.float(58, { unit: "°", doc: "How high the sun climbs at midday." }),
  facing: pw.float(200, { unit: "°", doc: "The compass direction of the midday sun, clockwise from north (−Z)." }),
  lux: pw.float(100000, { unit: "lx", doc: "The sun's light at midday on a clear day." }),
});
