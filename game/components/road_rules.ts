// How the game's drivers treat the road's rules: traffic lights, stop lines and yield lines. Put it on the
// object with the Race card. Without one, Joe's ruling holds (2026-11-22, "stoplights aren't obeyed in
// races"): rivals keep racing through lights and lines in a race, and obey them in free roam. The other
// choices are for testing and special events.
pw.defineComponent("road_rules", {
  rivals: pw.oneOf("obey in free roam", "always obey", "never obey", {
    doc: "Whether rivals stop for red lights and slow at stop and yield lines: only in free roam (racing on through them in a race), always, or never.",
  }),
});
