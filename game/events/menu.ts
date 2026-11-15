// A front gate card or pause menu action, said by their buttons (or an agent in Play: playInput say "menu").
//   continue   dismiss the front gate card
//   open       open the pause menu (n: the page to open on)
//   close      close it
//   page       show a page (n: 0 Map, 1 Friends, 2 Garage, 3 Settings, 4 Help, 5 Quit)
//   quit       save your spot now, then say it's safe to close the game
pw.defineEvent("menu", { what: pw.text(), n: pw.float(0) });
