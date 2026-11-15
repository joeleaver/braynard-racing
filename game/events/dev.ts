// A dev menu action, said by the dev menu's buttons or by an agent in Play (playInput say "dev").
// `what` is the action:
//   open, close, page (n: 0 Go to, 1 World, 2 Camera, 3 Restart, 4 Save)
//   goto (place: a Place's name), here (the kart to the free camera)
//   time (n: the hour), clock (n: game hours per real minute), weather (n: 0 clear, 1 overcast, 2 fog)
//   speed (n: the time scale, 0 to 10)
//   fly (n: 1 on, 0 off)
//   road (back to the last safe spot), reload (the scene again)
//   money (n: added), unlock (everything), spot (save this spot now), clear (forget the save)
pw.defineEvent("dev", { what: pw.text(), place: pw.text(), n: pw.float(0) });
