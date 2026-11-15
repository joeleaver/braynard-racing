// The pause menu: the game's only menu (Design, "Game systems"). Escape, P or Start opens it. Alone it
// freezes the game; online the world keeps going and your kart pulls up. Pages: Map (opens the county map),
// Friends (open your county, join one, leave), Garage, Settings and Help, and Quit (your spot is saved;
// close the game whenever you like). Plain styling for now, in the county-show colours.
import { box, label, button, input, styles } from "@pw/ui";

const display = pw.font("Lilita One");
styles(`
.gatecard { width: 600px; align-items: center; margin-bottom: 12px; }
.gatetitle { font-family: ${display}; font-size: 40px; color: #FFC531; }
.gaterow .go, .gaterow .go.second { margin-top: 0; }
.ptitle, .pitem { font-family: ${display}; }
.gatehint { font-size: 17px; color: #FFFBF2; margin: 4px 0 14px 0; }
.gaterow { display: flex; flex-direction: row; gap: 12px; }
.gaterow .go { font-size: 22px; padding: 12px 18px; }
.pause { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; display: flex; flex-direction: row; align-items: flex-start; gap: 24px; padding: 32px 48px; box-sizing: border-box; background: #10261699; overflow: auto; }
.pausemenu { width: 280px; }
.pitem { font-size: 21px; color: #FFFBF2; background: transparent; border: 0; border-radius: 12px; padding: 6px 14px; text-align: left; }
.pitem.on { background: #FFC531; color: #1D4426; }
.ppage { width: 460px; }
.ptitle { font-size: 30px; color: #FFFBF2; margin-bottom: 8px; }
.ptext { font-size: 17px; color: #FFFBF2; margin: 4px 0; }
.pdim { font-size: 15px; color: #B9D6B4; margin: 4px 0; }
.prow { display: flex; flex-direction: row; align-items: center; gap: 10px; margin-top: 12px; }
.prow .go { font-size: 20px; padding: 10px 16px; line-height: 1.1; margin-top: 0; }
.pausemenu .logo { font-size: 28px; }
.pkey { font-size: 16px; color: #FFFBF2; margin: 3px 0; }
`);

const S = pw.component("seat");
const f = Object.fromEntries(["menuOpen", "menuPage", "alone", "money", "froze"].map((n) => [n, S.property(n)]));
const player = pw.field("controls", "player");
const PAGES = ["Map", "Friends", "Garage", "Settings", "Help", "Quit"];
const KEYS = [
  ["Steer, throttle, brake", "WASD or the arrows · left stick and triggers"],
  ["Drift (let go for a mini-turbo)", "Space or Shift · right bumper or B"],
  ["Back on the road", "R · Back"],
  ["County map", "M · d-pad down"],
  ["This menu", "Escape or P · Start"],
];

const say = (what, n = 0) => pw.emit("menu", { what, n });

function page(n, net, typed, me) {
  if (n === 0)
    return [
      label({ class: "ptitle" }, "Map"),
      label({ class: "ptext" }, "The whole county: tracks, jobs, friends and where you've been."),
      box({ class: "prow" }, [button({ class: "go", onclick: pw.emit("map", { what: "open" }), focus: "first" }, "Open the map")]),
    ];
  if (n === 1) {
    const shared = net.joined || net.hosting;
    const rows = [label({ class: "ptitle" }, "Friends")];
    if (shared) {
      rows.push(label({ class: "ptext" }, net.hosting ? `Your county is open · ${net.taken} here` : `In a friend's county · ${net.taken} here`));
      if (net.address !== "") rows.push(label({ class: "pdim" }, `Invite link: ${net.address}`));
      rows.push(box({ class: "prow" }, [button({ class: "go second", onclick: pw.emit("net.leave"), focus: "first" }, net.hosting ? "Close my county" : "Back to my county")]));
    } else {
      rows.push(label({ class: "ptext" }, "Open your county and friends arrive beside you, or join theirs."));
      rows.push(box({ class: "prow" }, [
        button({ class: "go", onclick: pw.emit("net.create"), focus: "first" }, "Open my county"),
        button({ class: "go second", onclick: pw.emit("net.join") }, "Public county"),
      ]));
      rows.push(box({ class: "prow" }, [
        input({ class: "code", name: "code", placeholder: "Friend's code" }),
        button({ class: "go second", onclick: pw.emit("net.join", { code: typed.code ?? "" }) }, "Join"),
      ]));
    }
    if (net.problem !== "") rows.push(label({ class: "pdim" }, net.problem));
    return rows;
  }
  if (n === 2) return [label({ class: "ptitle" }, "Garage"), label({ class: "ptext" }, "Your barn at Home Farm: kart parts, paint and your trophies. Coming soon.")];
  if (n === 3) return [label({ class: "ptitle" }, "Settings"), label({ class: "ptext" }, "Sound, picture, controls and accessibility. Coming soon.")];
  if (n === 4) return [label({ class: "ptitle" }, "Help"), ...KEYS.map(([what, keys]) => label({ class: "pkey" }, `${what}: ${keys}`))];
  return [
    label({ class: "ptitle" }, "Quit"),
    label({ class: "ptext" }, "Your spot and everything you've earned are saved. Close the game whenever you like."),
    box({ class: "prow" }, [button({ class: "go", onclick: say("close"), focus: "first" }, "Keep playing")]),
  ];
}

pw.screen("pause", { includeComponents: [S], anchor: "fill" }, ({ seat, objects, net, typed }) => {
  const me = objects.find((o) => o.get(player) === seat.player);
  if (me === undefined || me.get(f.menuOpen) !== 1) return [];
  const current = me.get(f.menuPage);
  const menu = box({ class: "board pausemenu", focus: "group" }, [
    label({ class: "logo" }, "Braynard Racing"),
    ...PAGES.map((name, i) =>
      button({ class: i === current ? "pitem on" : "pitem", onclick: i === 5 ? say("quit") : say("page", i), ...(i === current ? { focus: "first" } : {}) }, name)),
    label({ class: "pdim" }, me.get(f.froze) === 1 ? "Paused. Saved a moment ago." : "The county keeps going while you're here."),
    button({ class: "pick back", onclick: say("close"), focus: "back" }, "Back to the county"),
  ]);
  return box({ class: "pause" }, [menu, box({ class: "board ppage" }, page(current, net, typed, me))]);
});
