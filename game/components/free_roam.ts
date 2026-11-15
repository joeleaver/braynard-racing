// Marks a scene as the open world: put it on the object with the Race card. In free roam every player
// present drives their own kart straight away, with no title or lobby (Design, "Game systems"), and the
// game keeps their last safe spot in their save.
pw.defineComponent("freeRoam", {
  on: pw.int(1, { doc: "1 for free roam." }),
});
