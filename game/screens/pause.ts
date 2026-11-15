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
.kind, .booktext, .bookh, .num, .cap, .ptitle, .ptext, .pdim, .pkey, .racername { display: block; }
.col, .col > * { color: #2A2A22; }
.snap:nth-child(odd) { transform: rotate(-1deg); }
.snap:nth-child(even) { transform: rotate(1deg); }
.racerhead { width: 84px; height: 84px; border-radius: 42px; border: 3px solid #FFFBF2; }
.racername { font-family: ${display}; font-size: 20px; color: #FFFBF2; }
`);

const S = pw.component("seat");
const f = Object.fromEntries(
  ["menuOpen", "menuPage", "menuSub", "froze", "money", "statPlayed", "statDriven", "statBestDrift", "statBestAir", "statDrifts", "statTurbos", "eggs", "racerBits"].map((n) => [n, S.property(n)]),
);
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

function racers(me) {
  return box({ class: "board sheet" }, [
    label({ class: "ptitle" }, "Racers"),
    box({ class: "racers" }, RACERS.map((r, i) => {
      const open = ((me.get(f.racerBits) >> i) & 1) === 1;
      return box({ class: open ? "racer" : "racer locked" }, [
        image(heads[i], { class: "racerhead" }),
        label({ class: "racername" }, r.name),
        label({ class: "pdim" }, open ? "Ready to race" : "Beat their club"),
      ]);
    })),
  ]);
}

function friends(net, typed) {
  const shared = net.joined || net.hosting;
  const rows = [label({ class: "ptitle" }, "Friends")];
  if (shared) {
    rows.push(label({ class: "ptext" }, net.hosting ? `Your county is open · ${net.taken} here` : `In a friend's county · ${net.taken} here`));
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

function tab(n, me, net, typed) {
  if (n === 0) return journal(me);
  if (n === 1) return sheet("Map", [label({ class: "ptext" }, "The whole county: tracks, jobs, friends and where you've been.")], [button({ class: "go", onclick: pw.emit("map", { what: "open" }) }, "Open the map")]);
  if (n === 2) return scrapbook(me);
  if (n === 3) return racers(me);
  if (n === 4) return sheet("Garage", [label({ class: "ptext" }, "Your barn at Home Farm: kart parts, paint and your trophies. Coming soon.")]);
  if (n === 5) return friends(net, typed);
  if (n === 6) return sheet("Settings", [label({ class: "ptext" }, "Sound, picture, controls and accessibility. Coming soon.")]);
  if (n === HELP) return sheet("Help", KEYS.map(([what, keys]) => label({ class: "pkey" }, `${what}: ${keys}`)));
  return sheet("Quit", [label({ class: "ptext" }, "Your spot and everything you've earned are saved. Close the game whenever you like.")], [button({ class: "go", onclick: say("close") }, "Keep playing")]);
}

pw.screen("pause", { includeComponents: [S], anchor: "fill" }, ({ seat, objects, net, typed }) => {
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
  return box({ class: "pause" }, [tabs, box({ class: "body" }, [tab(current, me, net, typed)]), note]);
});
