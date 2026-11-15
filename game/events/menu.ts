// A front gate card or pause menu action, said by their buttons (or an agent in Play: playInput say "menu").
//   continue   dismiss the front gate card
//   open       open the pause menu (n: the page to open on)
//   close      close it
//   page       show a tab (n: 0 Journal, 1 Map, 2 Scrapbook, 3 Racers, 4 Garage, 5 Friends, 6 Settings, 7 Help, 8 Quit)
//   sub        the Journal's page (n: 0 Quests, 1 Events)
//   quit       save your spot now, then say it's safe to close the game
pw.defineEvent("menu", { what: pw.text(), n: pw.float(0) });
