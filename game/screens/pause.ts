// The pause menu: the game's only menu (Design, "The pause menu's tabs"). Escape, P or Start opens it;
// the bumpers or Q and E move between the tabs. Alone it freezes the game; online the world keeps going
// and your kart pulls up. Tabs: Journal (quests and events), Map (opens the county map), Scrapbook (fun
// stats, collectibles, rosettes), Racers, Garage, Friends (open your county, join one, leave), Settings,
// and Help and Quit (your spot is saved; close the game whenever you like).
import { box, label, button, input, image, styles } from "@pw/ui";
import { RACERS } from "../data/racers";

const display = pw.font("Lilita One");
styles(`
.gatecard { width: 600px; align-items: center; margin-bottom: 12px; }
.gatetitle { font-family: ${display}; font-size: 40px; color: #FFC531; }
.gaterow { display: flex; flex-direction: row; gap: 12px; }
.gaterow .go, .gaterow .go.second { margin-top: 0; font-size: 22px; padding: 12px 18px; }
.gatehint { font-size: 17px; color: #FFFBF2; margin: 4px 0 14px 0; }

.pause { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 24px 32px; box-sizing: border-box; background: #102616CC; overflow: auto; }
.tabs { width: min(1120px, 96vw); display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 4px; padding: 8px 10px; }
.tab { font-family: ${display}; font-size: 20px; color: #FFFBF2; background: transparent; border: 0; border-radius: 10px; padding: 7px 14px; }
.tab.on { background: #FFC531; color: #1D4426; box-shadow: 0 3px 0 #B07F12; }
.tab.small { font-size: 16px; color: #B9D6B4; }
.tabgap { flex-grow: 1; }
.tabhint { font-size: 13px; color: #B9D6B4; padding: 0 8px; }
.body { width: min(1120px, 96vw); }
.sheet { padding: 20px 24px; }
.ptitle { font-family: ${display}; font-size: 30px; color: #FFFBF2; margin-bottom: 8px; }
.ptext { font-size: 17px; color: #FFFBF2; margin: 4px 0; }
.pdim { font-size: 15px; color: #B9D6B4; margin: 4px 0; }
.prow { display: flex; flex-direction: row; align-items: center; gap: 10px; margin-top: 12px; }
.prow .go { font-size: 20px; padding: 10px 16px; line-height: 1.1; margin-top: 0; }
.pkey { font-size: 16px; color: #FFFBF2; margin: 3px 0; }

.book { display: flex; flex-direction: row; gap: 10px; padding: 14px; border-radius: 16px; background: #7A4A2A; box-shadow: inset 0 0 0 4px #5A321A, 0 8px 0 #3E2212; }
.page { flex: 1; min-width: 0; min-height: 360px; padding: 18px 22px; border-radius: 8px; background: #FBF4E2; color: #2A2A22; }
.bookh { font-family: ${display}; font-size: 26px; color: #1D4426; margin-bottom: 6px; }
.booktext { font-size: 15px; color: #4A4A3C; margin: 4px 0; }
.kind { font-size: 11px; color: #9C6B2E; letter-spacing: 1.5px; margin-top: 12px; }
.subs { display: flex; flex-direction: row; gap: 6px; margin-bottom: 12px; }
.sub { border: 0; border-radius: 999px; padding: 5px 12px; font-size: 14px; background: #EADFC2; color: #5A4A30; }
.sub.on { background: #2F6B3A; color: #FFFBF2; }

.scrap { display: flex; flex-direction: row; gap: 10px; padding: 14px; border-radius: 16px; background: #2F6B3A; box-shadow: inset 0 0 0 4px #1D4426, 0 8px 0 #0B1A0F; }
.kraft { flex: 1; min-width: 0; padding: 16px 20px; border-radius: 8px; background: #D9C29A; color: #2A2A22; }
.snaps { display: flex; flex-direction: row; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
.snap { width: 46%; padding: 10px 12px; background: #FFFBF2; border-radius: 3px; box-shadow: 0 3px 0 #0000002A; }
.num { font-family: ${display}; font-size: 30px; color: #1D4426; }
.cap { font-size: 14px; color: #3A3A30; }
.col { display: flex; flex-direction: row; justify-content: space-between; margin-top: 8px; font-size: 16px; }

.racers { display: flex; flex-direction: row; flex-wrap: wrap; gap: 12px; }
.racer { width: 23%; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; border-radius: 12px; background: #24552E; }
.racer.locked { opacity: 0.45; }
.racer.on { background: #FFC531; box-shadow: 0 4px 0 #B07F12; }
.racer.on .racername { color: #1D4426; }
.drive { border: 0; border-radius: 999px; padding: 5px 16px; font-size: 15px; background: #FFFBF2; color: #1D4426; }
.drive.on { background: #1D4426; color: #FFC531; }
.kind, .booktext, .bookh, .num, .cap, .ptitle, .ptext, .pdim, .pkey, .racername { display: block; }
.col, .col > * { color: #2A2A22; }

.who { display: flex; flex-direction: column; gap: 6px; margin: 10px 0; }
.whorow { display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 8px 14px; border-radius: 10px; background: #24552E; }
.whoname { display: block; font-family: ${display}; font-size: 20px; color: #FFFBF2; }
.setrow { display: flex; flex-direction: row; gap: 22px; }
.setnav { display: flex; flex-direction: column; gap: 6px; width: 170px; }
.setnav .sub { text-align: left; font-size: 16px; padding: 8px 14px; }
.setnav .sub.on { background: #FFC531; color: #1D4426; }
.setbody { flex: 1; min-width: 0; }
.srow { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid #4E8C5580; }
.sname { width: 240px; font-size: 16px; color: #FFFBF2; }
.keys { display: flex; flex-direction: row; flex-wrap: wrap; gap: 6px; flex: 1; }
.keycap { border: 0; border-radius: 8px; padding: 6px 12px; font-size: 14px; background: #FFFBF2; color: #1D4426; box-shadow: 0 3px 0 #B9D6B4; }
.keycap.changed { background: #FFE39A; }
.keycap.on { background: #FFC531; box-shadow: 0 3px 0 #B07F12; }
.keycap.danger { background: #D63B2F; color: #FFFBF2; box-shadow: 0 3px 0 #8E2A1C; }
.opt { border: 0; border-radius: 999px; padding: 6px 16px; font-size: 14px; background: #24552E; color: #B9D6B4; box-shadow: inset 0 0 0 2px #4E8C55; }
.opt.on { background: #FFC531; color: #1D4426; box-shadow: 0 3px 0 #B07F12; }
.step { width: 34px; height: 34px; border: 0; border-radius: 17px; font-size: 20px; background: #FFFBF2; color: #1D4426; box-shadow: 0 3px 0 #B9D6B4; }
.meter { width: 220px; height: 14px; border-radius: 8px; background: #0B1A0F; overflow: hidden; }
.meterfill { height: 100%; border-radius: 8px; background: #FFC531; }
.sval { width: 50px; font-size: 15px; color: #FFFBF2; }
.big .ptext, .big .booktext, .big .sname, .big .pkey { font-size: 21px; }
.big .pdim, .big .cap, .big .keycap { font-size: 18px; }
.big .tab { font-size: 24px; }
.snap:nth-child(odd) { transform: rotate(-1deg); }
.snap:nth-child(even) { transform: rotate(1deg); }
.racerhead { width: 84px; height: 84px; border-radius: 42px; border: 3px solid #FFFBF2; }
.racername { font-family: ${display}; font-size: 20px; color: #FFFBF2; }
`);

const S = pw.component("seat");
const f = Object.fromEntries(
  ["menuOpen", "menuPage", "menuSub", "setSub", "opts", "confirmClear", "froze", "money", "statPlayed", "statDriven", "statBestDrift", "statBestAir", "statDrifts", "statTurbos", "eggs", "racerBits", "here", "racer"].map((n) => [n, S.property(n)]),
);
const nameOf = S.text("name");
const bindText = Object.fromEntries(["stick", "gas", "brake", "drift", "respawn", "menu", "map"].map((a) => [a, S.text(`bind${a[0].toUpperCase()}${a.slice(1)}`)]));
const player = pw.field("controls", "player");
const heads = RACERS.map((r) => pw.image(`${r.name} headshot`));
const TABS = ["Journal", "Map", "Scrapbook", "Racers", "Garage", "Friends", "Settings"];
const HELP = 7;
const QUIT = 8;
const KEYS = [
  ["Steer, throttle, brake", "WASD or the arrows · left stick and triggers"],
  ["Drift (let go for a mini-turbo)", "Space or Shift · right bumper or B"],
  ["Back on the road", "R · Back"],
  ["County map", "M · d-pad down"],
  ["This menu", "Escape or P · Start; Q and E or the bumpers change tab"],
];

const say = (what, n = 0) => pw.emit("menu", { what, n });
const one = (v) => (Math.round(v * 10) / 10).toFixed(1);
const played = (s) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min` : `${Math.floor(s / 60)} min`);

function journal(me) {
  const sub = me.get(f.menuSub);
  const subs = box({ class: "subs" }, [
    button({ class: sub === 0 ? "sub on" : "sub", onclick: say("sub", 0) }, "Quests"),
    button({ class: sub === 1 ? "sub on" : "sub", onclick: say("sub", 1) }, "Events"),
  ]);
  if (sub === 0)
    return box({ class: "book" }, [
      box({ class: "page" }, [
        subs,
        label({ class: "kind" }, "STORY"),
        label({ class: "booktext" }, "Nothing yet. The season's story starts at the Home Farm Cup."),
        label({ class: "kind" }, "CLUBS"),
        label({ class: "booktext" }, "Each region's racing club appears here when you find its paddock."),
        label({ class: "kind" }, "JOBS"),
        label({ class: "booktext" }, "Jobs you take at the Post Office."),
        label({ class: "kind" }, "RUMOURS"),
        label({ class: "booktext" }, "What you hear at the Bakery and the Tea Room."),
      ]),
      box({ class: "page" }, [
        label({ class: "bookh" }, "Your journal"),
        label({ class: "booktext" }, "Quests, jobs and rumours collect here as you find them. Choose one to see who gave it, what's left to do and what it pays, and track it to put it on your compass."),
      ]),
    ]);
  return box({ class: "book" }, [
    box({ class: "page" }, [subs, label({ class: "bookh" }, "The county"), label({ class: "booktext" }, "Every region's courses, with a medal egg for each way to run them: forward, reversed, at night and in the wet.")]),
    box({ class: "page" }, [label({ class: "bookh" }, "Home Farm"), label({ class: "booktext" }, "Courses appear here as they're built. Practise one by driving under its start arch.")]),
  ]);
}

function scrapbook(me) {
  const snap = (n, what) => box({ class: "snap" }, [label({ class: "num" }, n), label({ class: "cap" }, what)]);
  const racers = [...Array(8).keys()].filter((i) => (me.get(f.racerBits) >> i) & 1).length;
  return box({ class: "scrap" }, [
    box({ class: "kraft" }, [
      label({ class: "bookh" }, "Your scrapbook"),
      box({ class: "snaps" }, [
        snap(`${one(me.get(f.statDriven) / 1000)} km`, "driven"),
        snap(played(me.get(f.statPlayed)), "played"),
        snap(`${one(me.get(f.statBestDrift))} s`, "longest drift"),
        snap(`${one(me.get(f.statBestAir))} s`, "longest in the air"),
        snap(`${me.get(f.statDrifts)}`, "drifts"),
        snap(`${me.get(f.statTurbos)}`, "mini-turbos"),
      ]),
    ]),
    box({ class: "kraft" }, [
      label({ class: "bookh" }, "Collected"),
      box({ class: "col" }, [label("Golden eggs"), label(`${me.get(f.eggs)} found`)]),
      box({ class: "col" }, [label("Racers"), label(`${racers} of 8`)]),
      box({ class: "col" }, [label("Money"), label(`${me.get(f.money)}`)]),
      label({ class: "bookh" }, "Rosettes"),
      label({ class: "booktext" }, "No rosettes yet. Secret ones show as ??? until you win them."),
    ]),
  ]);
}

// Pick who you drive in the county: an unlocked racer's card says "menu" with what "racer"
// (systems/players.ts keeps it in the loadout and swaps your kart).
function racers(me) {
  const driving = me.get(f.racer);
  return box({ class: "board sheet" }, [
    label({ class: "ptitle" }, "Racers"),
    box({ class: "racers", focus: "group" }, RACERS.map((r, i) => {
      const open = ((me.get(f.racerBits) >> i) & 1) === 1;
      const mine = driving === i + 1;
      const card = [image(heads[i], { class: "racerhead" }), label({ class: "racername" }, r.name)];
      if (!open) return box({ class: "racer locked" }, [...card, label({ class: "pdim" }, "Beat their club")]);
      return box({ class: mine ? "racer on" : "racer" }, [
        ...card,
        button({ class: mine ? "drive on" : "drive", onclick: say("racer", i + 1), ...(mine ? { focus: "first" } : {}) }, mine ? "Driving" : "Drive"),
      ]);
    })),
  ]);
}

/** Who's in the county: everyone here, lowest seat first. The lowest seat is the host, whose county it is. */
function whoIsHere(seats, mine) {
  const here = seats.filter((s) => s.get(f.here) === 1).sort((a, b) => a.get(player) - b.get(player));
  return box({ class: "who" }, here.map((s, i) => {
    const n = s.get(player);
    const name = s.get(nameOf) || `Player ${n}`;
    const tags = [n === mine ? "you" : "", i === 0 ? "host" : ""].filter((t) => t !== "").join(" · ");
    return box({ class: "whorow" }, [label({ class: "whoname" }, name), label({ class: "pdim" }, tags)]);
  }));
}

function friends(net, typed, seats, mine) {
  const shared = net.joined || net.hosting;
  const rows = [label({ class: "ptitle" }, "Friends")];
  if (shared) {
    rows.push(label({ class: "ptext" }, net.hosting ? `Your county is open · ${net.taken} of 8 here` : `In a friend's county · ${net.taken} of 8 here`));
    rows.push(whoIsHere(seats, mine));
    if (net.address !== "") rows.push(label({ class: "pdim" }, `Invite link: ${net.address}`));
    rows.push(box({ class: "prow" }, [button({ class: "go second", onclick: pw.emit("net.leave") }, net.hosting ? "Close my county" : "Back to my county")]));
  } else {
    rows.push(label({ class: "ptext" }, "Open your county and friends arrive beside you, or join theirs."));
    rows.push(box({ class: "prow" }, [
      button({ class: "go", onclick: pw.emit("net.create") }, "Open my county"),
      button({ class: "go second", onclick: pw.emit("net.join") }, "Public county"),
    ]));
    rows.push(box({ class: "prow" }, [
      input({ class: "code", name: "code", placeholder: "Friend's code" }),
      button({ class: "go second", onclick: pw.emit("net.join", { code: typed.code ?? "" }) }, "Join"),
    ]));
  }
  if (net.problem !== "") rows.push(label({ class: "pdim" }, net.problem));
  return box({ class: "board sheet" }, rows);
}

function sheet(title, lines, buttons = []) {
  return box({ class: "board sheet" }, [label({ class: "ptitle" }, title), ...lines, ...(buttons.length ? [box({ class: "prow" }, buttons)] : [])]);
}

// Settings: five sections down the side, the chosen one beside them.
const SECTIONS = ["Controls", "Sound", "Picture", "Accessibility", "Game"];
const ACTIONS = { stick: "Steer and throttle", gas: "Throttle", brake: "Brake", drift: "Drift", respawn: "Back on the road", menu: "This menu", map: "County map" };
const SLOTS = { up: "forward", down: "back", left: "left", right: "right" };
const PRESETS = [["low", "Low"], ["medium", "Medium"], ["high", "High"], ["ultra", "Ultra"]];
const set = (what, key = "", n = 0) => pw.emit("setting", { what, key, n });

function toggle(me, key, words, bit) {
  const on = (me.get(f.opts) & bit) !== 0;
  return box({ class: "srow" }, [
    label({ class: "sname" }, words),
    button({ class: on ? "opt on" : "opt", onclick: set("opt", key) }, on ? "On" : "Off"),
  ]);
}

function controlsSection(me) {
  let listening = false;
  const groups = Object.keys(ACTIONS).map((action) => {
    const text = me.get(bindText[action]) || "";
    if (text === "") return null;
    const keys = text.split("|").map((raw, i) => {
      const on = raw.startsWith("*");
      const changed = raw.startsWith("~");
      const body = on || changed ? raw.slice(1) : raw;
      const [first, ...rest] = body.split(" ");
      const slot = SLOTS[first] !== undefined && rest.length > 0 ? SLOTS[first] : "";
      const shown = slot ? rest.join(" ") : body;
      if (on) listening = true;
      return button({ class: on ? "keycap on" : changed ? "keycap changed" : "keycap", onclick: set("bind", `${action}:${i}`) }, `${slot ? `${slot}: ` : ""}${on ? "Press a key…" : shown}`);
    });
    return box({ class: "srow" }, [label({ class: "sname" }, ACTIONS[action]), box({ class: "keys" }, keys)]);
  }).filter((g) => g !== null);
  return [
    ...groups,
    toggle(me, "driftToggle", "Drift: press to start, press to stop", 1),
    toggle(me, "autoGas", "Accelerate by itself", 2),
    box({ class: "prow" }, [
      ...(listening ? [button({ class: "go second", onclick: set("stop") }, "Stop listening")] : []),
      button({ class: "go second", onclick: set("reset") }, "Reset controls"),
    ]),
    label({ class: "pdim" }, "Choose a key, then press the one you want. Escape cancels."),
  ];
}

function soundSection(volume) {
  const buses = Object.keys(volume);
  if (buses.length === 0) return [label({ class: "ptext" }, "This game's mix has no buses to set yet.")];
  return buses.map((bus) => {
    const v = volume[bus];
    return box({ class: "srow" }, [
      label({ class: "sname" }, bus),
      button({ class: "step", onclick: set("volume", bus, Math.max(0, v - 0.1)) }, "−"),
      box({ class: "meter" }, [box({ class: "meterfill", style: `width: ${Math.round(v * 100)}%` }, [])]),
      button({ class: "step", onclick: set("volume", bus, Math.min(1, v + 0.1)) }, "+"),
      label({ class: "sval" }, `${Math.round(v * 100)}%`),
    ]);
  });
}

function pictureSection(quality) {
  const ms = quality.gpuTime ?? quality.frameTime;
  return [
    box({ class: "srow" }, [label({ class: "sname" }, "Quality"), box({ class: "keys" }, PRESETS.map(([key, words]) => button({ class: "keycap", onclick: set("preset", key) }, words)))]),
    box({ class: "srow" }, [
      label({ class: "sname" }, "Sharpness"),
      button({ class: "step", onclick: set("scale", "", quality.renderScale - 0.1) }, "−"),
      box({ class: "meter" }, [box({ class: "meterfill", style: `width: ${Math.round(quality.renderScale * 100)}%` }, [])]),
      button({ class: "step", onclick: set("scale", "", quality.renderScale + 0.1) }, "+"),
      label({ class: "sval" }, `${Math.round(quality.renderScale * 100)}%`),
    ]),
    label({ class: "pdim" }, `${Math.round(ms * 10) / 10} ms a frame${quality.gpuTime !== null ? " on the graphics card" : ""}. Lower quality or sharpness if it feels slow.`),
  ];
}

function accessSection(me) {
  return [
    toggle(me, "bigText", "Bigger text in menus", 4),
    toggle(me, "subtitles", "Subtitles for what the racers say", 16),
    toggle(me, "reduceMotion", "Less camera shake and wobble", 8),
    toggle(me, "colourSafe", "Colour-blind-safe markers", 256),
    label({ class: "pdim" }, "Bigger text works now; the others take effect as their parts of the game arrive."),
  ];
}

function gameSection(me, typed) {
  const asked = me.get(f.confirmClear);
  return [
    toggle(me, "mph", "Speed in mph", 32),
    toggle(me, "ghosts", "Your ghost when practising", 64),
    toggle(me, "friendsGhosts", "Friends' ghosts when practising", 128),
    box({ class: "srow" }, [
      label({ class: "sname" }, "Your name"),
      input({ class: "code", name: "playername", placeholder: "Your name" }),
      button({ class: "keycap", onclick: pw.emit("rename", { to: typed.playername ?? "" }) }, "Save"),
    ]),
    box({ class: "srow" }, [
      label({ class: "sname" }, asked === 0 ? "Delete my save" : asked === 1 ? "Everything you've earned goes. Sure?" : "Really? This can't be undone."),
      button({ class: asked === 0 ? "keycap" : "keycap danger", onclick: set("clear") }, asked === 0 ? "Delete" : asked === 1 ? "Yes, delete" : "Delete it all"),
      ...(asked > 0 ? [button({ class: "keycap", onclick: set("cancel") }, "Keep it")] : []),
    ]),
  ];
}

function settings(me, volume, quality, typed) {
  const sub = me.get(f.setSub);
  const sections = [controlsSection(me), soundSection(volume), pictureSection(quality), accessSection(me), gameSection(me, typed)];
  return box({ class: "board sheet setrow" }, [
    box({ class: "setnav" }, SECTIONS.map((name, i) => button({ class: i === sub ? "sub on" : "sub", onclick: set("sub", "", i) }, name))),
    box({ class: "setbody" }, [label({ class: "ptitle" }, SECTIONS[sub]), ...sections[sub]]),
  ]);
}

function tab(n, me, net, typed, volume, quality, seats) {
  if (n === 0) return journal(me);
  if (n === 1) return sheet("Map", [label({ class: "ptext" }, "The whole county: tracks, jobs, friends and where you've been.")], [button({ class: "go", onclick: pw.emit("map", { what: "open" }) }, "Open the map")]);
  if (n === 2) return scrapbook(me);
  if (n === 3) return racers(me);
  if (n === 4) return sheet("Garage", [label({ class: "ptext" }, "Your barn at Home Farm: kart parts, paint and your trophies. Coming soon.")]);
  if (n === 5) return friends(net, typed, seats, me.get(player));
  if (n === 6) return settings(me, volume, quality, typed);
  if (n === HELP) return sheet("Help", KEYS.map(([what, keys]) => label({ class: "pkey" }, `${what}: ${keys}`)));
  return sheet("Quit", [label({ class: "ptext" }, "Your spot and everything you've earned are saved. Close the game whenever you like.")], [button({ class: "go", onclick: say("close") }, "Keep playing")]);
}

pw.screen("pause", { includeComponents: [S], anchor: "fill" }, ({ seat, objects, net, typed, volume, quality }) => {
  const me = objects.find((o) => o.get(player) === seat.player);
  if (me === undefined || me.get(f.menuOpen) !== 1) return [];
  const current = me.get(f.menuPage);
  const tabs = box({ class: "board tabs", focus: "group" }, [
    ...TABS.map((name, i) => button({ class: i === current ? "tab on" : "tab", onclick: say("page", i), ...(i === current ? { focus: "first" } : {}) }, name)),
    box({ class: "tabgap" }, []),
    button({ class: current === HELP ? "tab small on" : "tab small", onclick: say("page", HELP) }, "Help"),
    button({ class: current === QUIT ? "tab small on" : "tab small", onclick: say("quit") }, "Quit"),
    button({ class: "tab small", onclick: say("close"), focus: "back" }, "Back"),
  ]);
  const note = label({ class: "pdim" }, me.get(f.froze) === 1 ? "Paused. Saved a moment ago." : "The county keeps going while you're here.");
  const big = (me.get(f.opts) & 4) !== 0;
  return box({ class: big ? "pause big" : "pause" }, [tabs, box({ class: "body" }, [tab(current, me, net, typed, volume, quality, [...objects])]), note]);
});
