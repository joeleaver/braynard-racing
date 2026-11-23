// How the game's drivers treat the road's rules: traffic lights, stop lines and give-way lines. Put it on
// the object with the Race card. Without one, the design's proposal holds (Junction control, 2026-11-22):
// rivals keep racing through lights and lines in a race, and obey them in free roam. Joe hasn't ruled on
// that yet, so it's a setting.
pw.defineComponent("road_rules", {
  rivals: pw.oneOf("obey in free roam", "always obey", "never obey", {
    doc: "Whether rivals stop for red lights and slow at stop and give-way lines: only in free roam (racing on through them in a race), always, or never.",
  }),
});
