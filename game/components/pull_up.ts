// A place you pull up to (Design, "Other game UI: places you pull up to"): a notice board, the Post
// Office counter, a shop. Put the object where karts stop, on the road's edge or in the yard. Driving
// within `radius` shows a prompt; stopping there opens its board over the live county
// (systems/pull_ups.ts, screens/pull_up.ts); Leave, or the menu button, closes it, and it opens again
// only once you've driven off.
pw.defineComponent("pull_up", {
  name: pw.text("", { doc: "What the board says at the top: \"Home Farm notice board\", \"Spanners & Sprockets\"." }),
  kind: pw.int(0, { doc: "0 a notice board, 1 the Post Office, 2 a shop, 3 the Race Office, 4 the Tea Room, 5 your barn." }),
  radius: pw.float(10, { unit: "m", doc: "How close a kart has to be, from the object, to pull up here." }),
});
