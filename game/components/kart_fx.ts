// One piece of the shared effects set every kart wears ("Kart fx: trail", "Kart fx: exhaust", "Kart fx:
// sparks"): the root of the piece, linking its emitters, so the kart it is fitted to can reach them
// (components/kart_build.ts). Each emitter's Dust card says what it is for; systems/dust.ts lights them.
const emitter = (doc) => pw.object({ doc });

pw.defineComponent("kart_fx", {
  e1: emitter("An emitter of this piece."),
  e2: emitter("Another; empty where the piece has fewer."),
  e3: emitter("Another."),
  e4: emitter("Another."),
  e5: emitter("Another."),
  e6: emitter("Another."),
  e7: emitter("Another."),
});
