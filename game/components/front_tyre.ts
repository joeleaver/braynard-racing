// A front wheel's tyre model: the model under a steering Wheel, which the engine draws turned by the
// kart's whole steer. This card lets systems/front_tyres.ts hold the drawn turn to its kart's
// `wheelSteerLock`, so the model doesn't pass through the body, while the steering itself stays as it is.
pw.defineComponent("front_tyre", {
  wheel: pw.object({ doc: "The Wheel it hangs under." }),
  kart: pw.object({ doc: "The kart it belongs to." }),
});
