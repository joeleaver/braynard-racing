// The weather, on the object that carries the scene's Fog card. systems/world.ts sets the fog from it,
// thickens the sky's haze and dims the sun under cloud. Rain waits on Playweft's particles.
pw.defineComponent("weather", {
  kind: pw.int(0, { doc: "0 clear, 1 overcast, 2 fog." }),
  clearView: pw.float(20000, { unit: "m", doc: "How far you see on a clear day." }),
  overcastView: pw.float(4000, { unit: "m", doc: "How far you see under cloud." }),
  fogView: pw.float(120, { unit: "m", doc: "How far you see in fog." }),
  thins: pw.float(54, { unit: "m", doc: "How far above the fog's object the air halves its haze, clear or overcast." }),
  fogThins: pw.float(600, { unit: "m", doc: "The same in fog, so it reaches up over the hills." }),
});
