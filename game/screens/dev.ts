// The dev menu: testing tools for building the county (Design, "Game systems" → "Testing tools").
// Backtick, F1 or the right-stick press opens and closes it, where a Dev Tools card allows it. Five
// pages: Go to (every Place, listed by the screen below), World (time of day, weather, time scale),
// Camera (the free camera), Restart, Save, Spawn (any blueprint, in front of your kart). Every button says the "dev" event, which an agent in Play can
// say directly. Plain styling for now: this is a tool, not the game's face.
import { box, label, button, styles } from "@pw/ui";

styles(`
.devmenu { width: 330px; background: #102616ee; border: 3px solid #FFC531; border-radius: 12px; padding: 10px 12px 12px 12px; display: flex; flex-direction: column; font-size: 15px; color: #FFFBF2; }
.devtitle { font-size: 18px; color: #FFC531; margin-bottom: 8px; }
.devtabs { display: flex; flex-direction: row; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
.devtab { font-size: 14px; padding: 4px 8px; border-radius: 6px; border: 0; background: #24552E; color: #FFFBF2; }
.devtab.on { background: #FFC531; color: #1D4426; }
.devrow { display: flex; flex-direction: row; flex-wrap: wrap; gap: 4px; margin: 2px 0 8px 0; }
.devbtn { font-size: 14px; padding: 5px 9px; border-radius: 6px; border: 0; background: #FFFBF2; color: #1D4426; }
.devbtn.on { background: #FFC531; }
.devnote { font-size: 13px; color: #B9D6B4; margin: 2px 0 6px 0; }
.devhead { font-size: 14px; color: #FFC531; margin-top: 4px; }
.devplaces { width: 330px; max-height: 60vh; overflow: auto; background: #102616ee; border: 3px solid #FFC531; border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; color: #FFFBF2; }
.devplace { font-size: 14px; padding: 5px 9px; border-radius: 6px; border: 0; background: #FFFBF2; color: #1D4426; text-align: left; }
.devplace.course { background: #FFE39A; }
`);

const S = pw.component("seat");
const f = Object.fromEntries(["devOpen", "devPage", "devOk", "fly", "seeHour", "seeWeather", "seeScale", "money", "spotSaved", "host", "devListMore"].map((n) => [n, S.property(n)]));
const player = pw.field("controls", "player");
const devList = S.text("devList");

const PAGES = ["Go to", "World", "Camera", "Restart", "Save", "Spawn"];
const HOURS = [[6, "Dawn"], [9, "Morning"], [12, "Noon"], [16.5, "Afternoon"], [19.5, "Dusk"], [23, "Night"]];
const WEATHER = ["Clear", "Overcast", "Fog"];
const SCALES = [[0, "Frozen"], [0.25, "¼"], [0.5, "½"], [1, "1×"], [2, "2×"]];

const say = (what, more = {}) => pw.emit("dev", { what, ...more });
const btn = (text, what, more, on = false, focus = false) =>
  button({ class: on ? "devbtn on" : "devbtn", onclick: say(what, more), ...(focus ? { focus: "first" } : {}) }, text);
const hh = (h) => `${Math.floor(h)}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;

pw.screen("dev", { includeComponents: [S], anchor: "top-right" }, ({ seat, objects }) => {
  const me = objects.find((o) => o.get(player) === seat.player);
  if (me === undefined || me.get(f.devOk) !== 1 || me.get(f.devOpen) !== 1) return [];
  const page = me.get(f.devPage);
  const flying = me.get(f.fly) === 1;
  const isHost = me.get(f.host) === seat.player || me.get(f.host) === 0;
  const tabs = box({ class: "devtabs", focus: "group" }, PAGES.map((name, i) =>
    button({ class: i === page ? "devtab on" : "devtab", onclick: say("page", { n: i }), ...(i === page ? { focus: "first" } : {}) }, name)));

  let body = [];
  if (page === 0) body = [label({ class: "devnote" }, "Pick a place below to drive from there.")];
  else if (page === 1) {
    const hour = me.get(f.seeHour);
    const scale = me.get(f.seeScale);
    body = [
      label({ class: "devhead" }, `Time of day: ${hh(hour)}`),
      box({ class: "devrow" }, HOURS.map(([h, name]) => btn(name, "time", { n: h }, Math.abs(hour - h) < 0.05))),
      box({ class: "devrow" }, [btn("−1 h", "time", { n: hour - 1 }), btn("+1 h", "time", { n: hour + 1 }), btn("Hold time", "clock", { n: 0 }), btn("Day in 4 min", "clock", { n: 6 })]),
      label({ class: "devhead" }, "Weather"),
      box({ class: "devrow" }, WEATHER.map((name, i) => btn(name, "weather", { n: i }, me.get(f.seeWeather) === i))),
      label({ class: "devhead" }, "Time scale"),
      box({ class: "devrow" }, SCALES.map(([n, name]) => btn(name, "speed", { n }, Math.abs(scale - n) < 0.01))),
      ...(isHost ? [] : [label({ class: "devnote" }, "Only the host changes the world.")]),
    ];
  } else if (page === 2) {
    body = [
      box({ class: "devrow" }, [btn(flying ? "Stop flying" : "Fly the free camera", "fly", { n: flying ? 0 : 1 }, flying, true), ...(flying ? [btn("Put the kart here", "here")] : [])]),
      label({ class: "devnote" }, "Stick or WASD to move, right stick or mouse to look, E and Q (or the bumpers) up and down, drift held to go fast. The kart waits where it was."),
    ];
  } else if (page === 3) {
    body = [
      box({ class: "devrow" }, [btn("Back on the road", "road", {}, false, true), btn("Reload the scene", "reload")]),
      label({ class: "devnote" }, "Back on the road takes you to your last safe spot (or the start)."),
    ];
  } else if (page === 4) {
    body = [
      label({ class: "devhead" }, `Money: ${me.get(f.money)}`),
      box({ class: "devrow" }, [btn("+100", "money", { n: 100 }, false, true), btn("+1000", "money", { n: 1000 }), btn("Unlock everything", "unlock")]),
      label({ class: "devhead" }, me.get(f.spotSaved) === 1 ? "A spot is saved." : "No spot saved yet."),
      box({ class: "devrow" }, [btn("Save this spot", "spot"), btn("Clear my save", "clear")]),
      label({ class: "devnote" }, "Your spot saves itself every 10 seconds of driving on the road."),
    ];
  } else if (page === 5) {
    // The blueprints' names, written onto the seat by systems/dev_seats.ts (screens can't list them).
    const names = (me.get(devList) ?? "").split("\n").filter((n) => n !== "");
    const more = me.get(f.devListMore);
    body = [
      box({ class: "devrow" }, names.map((name, i) => btn(name, "spawn", { place: name }, false, i === 0))),
      ...(more > 0 ? [label({ class: "devnote" }, `And ${more} more that don't fit here: an agent can say "dev" with what "spawn" and the name.`)] : []),
      label({ class: "devnote" }, names.length === 0 ? "This project has no blueprints yet." : "Placed on the ground in front of your kart. Reload the scene to clear them."),
    ];
  }
  return box({ class: "devmenu" }, [label({ class: "devtitle" }, "Dev menu"), tabs, ...body, btn("Close", "close")]);
});

// The Go to page's places, from every Place in the scene (each knows who has the page open).
const P = pw.component("place");
const placeName = P.text("name");
const kind = P.property("kind");
const menuFor = P.property("menuFor");

pw.screen("dev places", { includeComponents: [P], anchor: "bottom-right" }, ({ seat, objects }) => {
  const shown = objects.filter((o) => ((o.get(menuFor) >> (seat.player - 1)) & 1) === 1);
  if (shown.length === 0) return [];
  const sorted = [...shown].sort((a, b) => a.get(kind) - b.get(kind) || (a.get(placeName) < b.get(placeName) ? -1 : 1));
  return box({ class: "devplaces", focus: "group" }, sorted.map((o) =>
    button({ class: o.get(kind) === 1 ? "devplace course" : "devplace", onclick: say("goto", { place: o.get(placeName) }) }, o.get(placeName) || "(unnamed place)")));
});
