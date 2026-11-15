// A settings change, said by the pause menu's Settings tab (or an agent in Play: playInput say "setting").
// `what` is the change; `key` and `n` its details:
//   sub       the section shown (n: 0 Controls, 1 Sound, 2 Picture, 3 Accessibility, 4 Game)
//   volume    a bus (key: its name) to a volume (n: 0 to 1)
//   preset    the picture's quality preset (key: low, medium, high or ultra)
//   scale     the render scale (n: 0.25 to 1)
//   opt       turn an option on or off (key: driftToggle, autoGas, bigText, reduceMotion, subtitles, colourSafe, mph, ghosts, friendsGhosts)
//   bind      listen for a new control for one binding (key: "action:binding:slot", as the list shows it)
//   stop      stop listening, changing nothing
//   reset     put every control back to the game's defaults
//   clear     delete my save: asks twice, then does it; cancel takes it back
//   cancel    take back a delete that hasn't happened
pw.defineEvent("setting", { what: pw.text(), key: pw.text(), n: pw.float(0) });
