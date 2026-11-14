# Braynard Racing

Playweft's flagship game: an open-world kart racer with drift physics and barnyard animals. It's public,
featured and polished, so it sets the quality bar.

- **Planning, tasks and docs live in Pimble,** in Joe's Personal store, node "Braynard Racing": Design (keep it
  current when a decision changes it), Board, Decisions, Knowledge base and Status log. Use the Pimble tools.
  Don't keep plans, task lists, design docs or handovers in this repo, on Overboard or in notes folders.
- **This repo is public.** Stage by path, never `git add -A`. Nothing private (keys, tokens, personal data)
  goes in.
- **Game code lives here; the engine lives in `../playweft`.** A gap found here becomes a **general** Playweft
  feature (its own PR there, following its CLAUDE.md) or a card on the Playweft Overboard board tagged
  `braynard-racing`. Never a Braynard-only hack in the engine. Braynard sessions may open those Playweft PRs and
  pin to them, in order, to keep going, but never merge them: the Playweft side reviews and merges. Playweft
  sessions may check out, fork or PR from this repo when troubleshooting issues reported in the game.
- **Art:** `art/` holds sources and approved pieces (`concepts/`, `racers/`, `karts/`, `world/`). Concepts come from
  oxidegen (through its MCP, with the style guide). Characters, props and scenery are built in hifipushie on
  Joe's local runners from those concepts, never with oxidegen's mesh generation. Big working files (models, renders, scripts)
  go in `workspace/` (git-ignored).
- **Project files** (`playweft.json`, `scene.weave` …) are made by the Playweft editor
  (`pw-studio-desktop --new <folder>`), never hand-written.
- Plain words with Joe; recommend rather than list options.
