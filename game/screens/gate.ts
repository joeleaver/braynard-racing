// The front gate card: a small card over the live county for the first seconds after a player arrives
// in free roam. Continue (or any drive input) dismisses it; Play with friends and Settings open the pause
// menu on those pages. There is no title screen and no lobby (Design, "Game systems").
import { box, label, button } from "@pw/ui";

const S = pw.component("seat");
const f = Object.fromEntries(["gateDone", "placed", "phase", "menuOpen", "gateClock"].map((n) => [n, S.property(n)]));
const player = pw.field("controls", "player");
const ROAM = 3;

pw.screen("gate", { includeComponents: [S], anchor: "bottom" }, ({ seat, objects }) => {
  const me = objects.find((o) => o.get(player) === seat.player);
  if (me === undefined || me.get(f.phase) !== ROAM || me.get(f.placed) !== 1 || me.get(f.gateDone) === 1 || me.get(f.menuOpen) === 1) return [];
  return box({ class: "board gatecard" }, [
    label({ class: "gatetitle" }, "Braynard Racing"),
    label({ class: "gatehint" }, "Back where you left off. Just drive, or:"),
    box({ class: "gaterow", focus: "group" }, [
      button({ class: "go", onclick: pw.emit("menu", { what: "continue" }), focus: "first" }, "Continue"),
      button({ class: "go second", onclick: pw.emit("menu", { what: "open", n: 5 }) }, "Play with friends"),
      button({ class: "go second", onclick: pw.emit("menu", { what: "open", n: 6 }) }, "Settings"),
    ]),
  ]);
});
