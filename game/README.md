# Braynard Racing — the Playweft project

Open it with the Playweft desktop editor (`pw-studio-desktop --open game`) and press **Play**.

**The game so far:** a race of up to eight on the blocked-out Barnyard Loop, three laps. The game's link loads and
plays the game in the browser and lands on the title's menu. **Single player** picks a racer and races seven bots
on the player's own machine (Back returns to the title). **Multiplayer** joins the game Playweft runs online for
the link (`net.join` with no address); if it can't, the title says why and offers **Host on this computer**
(`net.host`, the desktop app). In the shared lobby each player picks one of the eight racers: Hettie,
Max, Puddles, The Major, Mabel, Scraps, Marmalade or Duvet, each a kart with its own handling (speed,
acceleration, handling, drift and weight, shown on its card and set from `data/racers.ts`). The first player to
pick is the host and starts the race, and Leave goes back to playing alone; bots drive every kart nobody picked, each in its own style. The race starts on
a three-second countdown from a shuffled grid, each player watches from behind their own kart, and the results
list everyone in order, with the county fair's ribbons for the first three, until the host goes back to the
lobby. Someone arriving mid-race watches the leader and races the next one. (The karts have no animals in them
yet, apart from Hettie; the lobby shows each racer's headshot on their kart's card.)

The loop starts on a low
plateau with a kicker that throws the kart onto the road falling away below it, climbs a right-hander onto the barn
hill, goes light over the crest, drops through an S and rounds a hairpin banked 15°.

| Do | Keys | Gamepad |
|---|---|---|
| Steer, throttle, brake / reverse | WASD or the arrows | left stick, right and left triggers |
| Drift (hold with a direction; let go for a mini-turbo) | Space or Shift | right bumper or B |
| Back on the road | R | Back |
| Dev menu (where a Dev Tools card allows it) | backtick or F1 | right-stick press |

The road has surfaces of its own: dirt on the inside of the first right-hander (so the
kart grips differently on each side), mud on the outside of the climb, ice through the S, sand on the run back
up to the start, and a boost pad before the kicker. Each is a material saying how a tyre grips it and how hard
it is to roll on, so the physics does the slipping and the dragging; only the boost pad is a game rule.

A drift builds blue, orange and then purple sparks; letting go gives a mini-turbo that lasts longer
the higher the tier. Grass slows the kart too. Laps are counted along the track's centre line, so a
shortcut across the infield or driving the wrong way doesn't count.

- `systems/race_phase.ts`, `systems/seats.ts`, `systems/race.ts`, `systems/grid.ts`: the race's phase (lobby,
  racing, results), who is in the game and what they picked, the host's start and the end of the race, and
  who drives which kart from where. One Seat object for each of the eight seats tells the game who is here.
- Sound: picking a racer plays one of its race-start lines for everyone (the library's "<Name> pick" sound,
  its takes from `audio/callouts/` as the variations, on the mix's Voices bus, which lowers the music).
  `systems/music.ts` plays the title song (`audio/music/title-screen.mp3`) on the title and in the lobby and the
  race song (`audio/music/barnyard-loop.mp3`) through the race and its results, on the Music bus.
- `systems/views.ts`: each player's camera (`pw.view.set`): their own kart's chase camera in a race, the
  leader's when watching, the grid in the lobby.
- `systems/driver.ts`: a player's controls, turned into what the kart is asked to do.
- `systems/rivals.ts`: the rivals' driving: they follow the centre line a lane to one side, slow for the
  corners they see coming, and drift the long ones. Each rival's Rival card holds the dials for how good it is
  (its pace, how hard it corners and brakes, its lane).
- `systems/kart.ts`: driving, the drift and the mini-turbo, on the engine's Vehicle and Wheels. A rival and a
  player drive the same kart by the same rules; they only ask differently.
- `systems/tyres.ts`: the rear tyres' sideways grip while drifting.
- `systems/laps.ts`: laps, places, the race clock and respawns.
- `systems/chase_camera.ts`: the camera.
- `systems/telemetry.ts`: a testing aid that logs a kart's motion and its wheels' contact every tick, for objects
  given a Telemetry card.
- `screens/`: the title and lobby, the race read-out and the results; their look is `data/style.ts` (the
  county show: green boards, the karts on straw, rosettes for who is who). Fonts: Lilita One and Lato (SIL
  Open Font License, in `art/fonts/`). The card pictures are `tools/kart_cards.py` (Blender renders of each
  kart) and `tools/headshots.py` (from each racer's concept).
- **Free roam and testing tools** (Design, "Game systems", in Pimble): a scene with a Free Roam card on its
  Race object is the open world. There is no lobby: each player drives the kart on their seat's Controls card
  from the first tick. `systems/save.ts` and `data/save.ts` keep the player's save (versioned; progress, unlocks,
  money, loadout, settings, stats) and their last safe spot, saved every 10 seconds on the road and restored when
  they arrive; guests arrive beside the host. The dev menu (`screens/dev.ts`, `systems/dev_seats.ts`,
  `dev_hold.ts`, `dev_view.ts`, `world.ts`) goes to any Place marker, flies a free camera, sets the time of day
  (a Daylight card on the sun), the weather (a Weather card beside the Fog card) and the time scale, restarts,
  and edits the save. Every action is the `dev` event, so an agent in Play can say it:
  `playInput say dev {what: "goto", place: "Bridge over the Ring"}`. The Home Farm spike scene is set up
  with all of these.
- `components/`: the cards (a kart's stats, its tyres, the camera), with every number tunable in the Inspector.
- The kart's wheels are separate models made by `tools/split_kart.py` from `art/karts/hettie/kart.glb`.
  The loop's layout is `tools/barnyard_loop.py`: its road and hay walls are Sweeps with square rings (mitred
  ones of this length can take the editor minutes and gigabytes to build).
