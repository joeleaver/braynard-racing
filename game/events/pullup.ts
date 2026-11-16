// A place you pulled up to (systems/pull_ups.ts), said by its board's buttons or by an agent in Play.
// `what`: leave (close the board; it opens again once you've driven off).
pw.defineEvent("pullup", { what: pw.text() });
