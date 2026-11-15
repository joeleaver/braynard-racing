// A named place in the world: somewhere the dev menu can send you, and where a new player starts.
// Put the object where a kart should stand, facing the way it should face (its −Z). Placing one is all
// it takes to add a destination.
pw.defineComponent("place", {
  name: pw.text("", { doc: "What it's called in the dev menu: \"Home Farm yard\", \"Barnyard Loop start\"." }),
  kind: pw.int(0, { doc: "0 a place, 1 a course's start, 2 where a new player starts (the first one is used)." }),
  menuFor: pw.int(0, { group: "Doing", doc: "Which seats have the dev menu's Go to page open, one bit each (seat 1 is 1, seat 2 is 2, seat 3 is 4 …), for the screen." }),
});
