// Switches the dev menu on for this scene. One object carries it; a published build ships with it off
// (or without it). Until Playweft can tell a testing run from a release, this card is the switch.
pw.defineComponent("devTools", {
  enabled: pw.int(1, { doc: "1 lets every player open the dev menu (backtick, F1 or the right-stick press)." }),
  scene: pw.text("", { doc: "This scene's name, for the dev menu's Reload scene. Empty hides it." }),
});
