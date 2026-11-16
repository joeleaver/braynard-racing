// A region of the county (Design, "The county"): Home Farm, Braynard Town, Mill River … Give the object
// a closed Curve round the region's edge, seen from above; heights don't matter. The free-roam HUD shows
// the name as a player drives in (systems/regions.ts), the save keeps which region a spot is in, and
// the county map will draw the outline and tint from the same object.
pw.defineComponent("region", {
  name: pw.text("", { doc: "What it's called on the HUD, the map and the signs: \"Home Farm\", \"Mill River\"." }),
  tint: pw.text("#8CB85C", { doc: "Its colour on the county map, as #rrggbb." }),
  season: pw.int(1, { doc: "The campaign season it opens in: 1 spring, 2 summer, 3 autumn." }),
});
