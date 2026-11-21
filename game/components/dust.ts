// A trail a kart throws up behind it: dust off dirt, spray off mud, sparks off a boost, smoke from
// its exhaust. The emitters are the shared effects set every kart is fitted with ("Kart fx: …",
// components/kart_fx.ts), one of each kind (its Particles card says how it looks); systems/dust.ts
// starts the ones that match what the kart is doing and the ground under it, and stops the rest.
pw.defineComponent("dust", {
  kart: pw.object({ doc: "Unused since the effects set: the kart reaches its emitters through its Kart Build card." }),
  kind: pw.int(1, { doc: "What it is for: 1 dirt, 2 sand, 3 mud, 4 grass, 5 ice, 6 tyre smoke (drifting on tarmac), 7 boost sparks, 8 exhaust under throttle (dark and thick), 9 exhaust cruising (light), 10, 11 and 12 drift sparks at a rear tyre (blue, orange, purple: lit as the drift reaches that tier)." }),
});
