// The race HUD (Design, "The HUD"): game graphics, four things in the corners and no labels.
// - Place, bottom right: the biggest thing on screen, in drawn gold numerals.
// - Lap, bottom left: a chequered flag and the lap in a small slanted capsule.
// - The field, right: the whole race as a straight line, start at the bottom and finish at the top, with
//   every racer's head placed by how far through the race they are (yours ringed gold, other players'
//   blue). It needs no map, so it works on any course.
// - The countdown in the middle, then nothing there but short notices (flipped, finished).
// Sparks and boosts show at the kart in the world, not here. Speed is off.
// The numerals are drawn with CSS (data/hud.ts).
import { box, label, image, styles } from "@pw/ui";
import { RACERS } from "../data/racers";
import { numerals, ordinal, NUMERAL_CSS } from "../data/hud";

const display = pw.font("Lilita One");
styles(`
${NUMERAL_CSS}
.racehud { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; font-family: ${display}; }
.hudplace { position: absolute; right: 40px; bottom: 26px; transform: skewX(-9deg); }
.hudlap { position: absolute; left: 36px; bottom: 34px; display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 8px 18px 10px 14px; border-radius: 14px; background: linear-gradient(180deg, #1F2A22E6, #0E1510E6); box-shadow: inset 0 0 0 2px #FFFFFF2E, 0 5px 0 #0008; transform: skewX(-12deg); }
.flag { display: flex; flex-direction: column; width: 30px; height: 22px; border: 2px solid #1A1A1A; transform: skewX(12deg); }
.flagrow { display: flex; flex-direction: row; flex: 1; }
.sq { flex: 1; background: #FFFFFF; }
.sq.k { background: #1A1A1A; }
.bar { position: absolute; right: 64px; top: 16vh; width: 60px; height: 44vh; }
.barline { position: absolute; left: 24px; top: 0; width: 12px; height: 100%; border-radius: 6px; background: #FFFFFF; box-shadow: 0 0 0 4px #1E1E1E66; }
.barlap { position: absolute; left: 18px; width: 24px; height: 5px; margin-top: -2px; border-radius: 3px; background: #1E1E1E99; }
.barflag { position: absolute; left: 14px; top: -34px; }
.rhead { position: absolute; width: 36px; height: 36px; margin-left: -18px; margin-top: -18px; border-radius: 18px; border: 3px solid #FFFFFF; box-shadow: 0 4px 6px #0008; overflow: hidden; }
.rimg { width: 100%; height: 100%; }
.rhead.fr { border-color: #7DB8FF; }
.rhead.me { width: 46px; height: 46px; margin-left: -23px; margin-top: -23px; border-radius: 23px; border: 4px solid #FFC531; box-shadow: 0 0 0 2px #3A1E08, 0 5px 8px #0009; }
.hudmid { position: absolute; left: 0; right: 0; top: 34%; display: flex; flex-direction: column; align-items: center; }
.hudpill { display: flex; flex-direction: row; align-items: center; gap: 10px; padding: 10px 22px; border-radius: 999px; background: linear-gradient(180deg, #243027E6, #0E1510E6); box-shadow: inset 0 0 0 2px #FFFFFF33, 0 5px 0 #0007; font-size: 22px; color: #FFF8E7; }
.hudpill.red { background: linear-gradient(180deg, #F0604A, #B82A1E); box-shadow: inset 0 0 0 2px #FFB8A8, 0 5px 0 #5A140A; }
.hudbottom { position: absolute; left: 0; right: 0; bottom: 120px; display: flex; justify-content: center; }
`);

const K = pw.component("kart");
const [laps, progress, finished, place, clockOf, startDelay, phase, racerOf, human, penalty] =
  ["laps", "progress", "finished", "place", "clock", "startDelay", "phase", "racer", "human", "penalty"].map((n) => K.property(n));
const heads = RACERS.map((r) => pw.image(`${r.name} headshot`));
const draw = numerals();
const BAR_X = 30;

function flag() {
  const row = (start) => box({ class: "flagrow" }, [0, 1, 2, 3].map((i) => box({ class: (i + start) % 2 ? "sq k" : "sq" }, [])));
  return box({ class: "flag" }, [row(0), row(1), row(0)]);
}

/**
 * The whole race as a straight line up the right edge: the start at the bottom, the finish at the top, a
 * tick for each lap, and every racer's head placed by how far through the race they are, so who's in
 * front, and by how much, reads at a glance.
 */
function raceBar(karts, me) {
  const total = Math.max(1, karts[0]?.get(laps) ?? 1);
  const ticks = [...Array(total - 1).keys()].map((i) => box({ class: "barlap", style: `top: ${(1 - (i + 1) / total) * 100}%` }, []));
  const placed = karts.map((k) => {
    const done = Math.max(0, Math.min(1, k.get(progress) / total));
    // Neighbours nudge left and right so heads in a bunch stay visible; yours stays on the line.
    const who = k.get(human);
    const x = who === me ? BAR_X : BAR_X + (k.get(place) % 2 === 0 ? -9 : 9);
    const cls = who === me ? "rhead me" : who > 0 ? "rhead fr" : "rhead";
    // Rinch doesn't round an image's own corners, so each head sits in a round box that clips it.
    return { order: who === me ? 2 : who > 0 ? 1 : 0, el: box({ class: cls, style: `left: ${x}px; top: ${(1 - done) * 100}%` }, [image(heads[k.get(racerOf) - 1], { class: "rimg" })]) };
  });
  // Yours drawn last, on top.
  placed.sort((a, b) => a.order - b.order);
  return box({ class: "bar" }, [box({ class: "barline" }, []), ...ticks, box({ class: "barflag" }, [flag()]), ...placed.map((p) => p.el)]);
}

pw.screen("race", { includeComponents: [K], anchor: "fill" }, ({ seat, objects }) => {
  if (objects.length === 0 || objects[0].get(phase) !== 1) return [];
  const field = raceBar([...objects], seat.player);
  const kart = seat.objects[0];
  if (kart === undefined) {
    return box({ class: "racehud" }, [field, box({ class: "hudbottom" }, [box({ class: "hudpill" }, [label("Race on. You'll race in the next one.")])])]);
  }

  const out = [field];
  const total = kart.get(laps);
  const done = kart.get(finished) > 0;
  const lap = Math.min(total, Math.max(1, Math.floor(kart.get(progress)) + 1));
  out.push(box({ class: "hudlap" }, [flag(), draw(`${lap}/${total}`, "cream", 44)]));
  if (kart.get(place) > 0) out.push(box({ class: "hudplace" }, [draw(ordinal(kart.get(place)), "gold", 150, 0.42)]));

  const toGo = kart.get(startDelay) - kart.get(clockOf);
  if (toGo > -1) out.push(box({ class: "hudmid" }, [draw(toGo > 0 ? `${Math.ceil(toGo)}` : "Go!", "gold", 190)]));
  const waiting = kart.get(penalty);
  if (waiting > 0) out.push(box({ class: "hudbottom" }, [box({ class: "hudpill red" }, [label(`Flipped! Back on the road in ${Math.ceil(waiting)}`)])]));
  else if (done) out.push(box({ class: "hudbottom" }, [box({ class: "hudpill" }, [label("Finished! Waiting for the others")])]));
  return box({ class: "racehud" }, out);
});
