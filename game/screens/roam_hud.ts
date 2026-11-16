// The free-roam HUD (Design, "The HUD"): almost nothing, so the county is the picture. The compass
// strip at the top is the map's (screens/map.ts). Here: your money, top right, for a few seconds when it
// changes, with how much it changed by; and the region's name, bottom left, for a few seconds as you
// drive in (systems/regions.ts). Collectibles stay in the Scrapbook, never on the main screen.
import { box, label, styles } from "@pw/ui";
import { sheets, numerals, NUMERAL_CSS } from "../data/hud";

styles(`
${NUMERAL_CSS}
.roammoney { display: flex; flex-direction: row; align-items: center; gap: 12px; margin-top: 8px; }
.coin { width: 40px; height: 40px; border-radius: 20px; background: radial-gradient(circle at 40% 32%, #FFF2A8, #FFC531 55%, #D98A12); box-shadow: 0 0 0 3.5px #3A1E08, 0 4px 0 3.5px #3A1E08; display: flex; align-items: center; justify-content: center; }
.regionname { font-family: ${pw.font("Lilita One")}; font-size: 58px; color: #FFF6E2; transform: skewX(-6deg);
  text-shadow: 3px 0 0 #3A1E08, -3px 0 0 #3A1E08, 0 3px 0 #3A1E08, 0 -3px 0 #3A1E08, 2px 2px 0 #3A1E08, -2px 2px 0 #3A1E08, 2px -2px 0 #3A1E08, -2px -2px 0 #3A1E08, 0 7px 0 #3A1E08; }
.coinring { width: 20px; height: 20px; border-radius: 10px; border: 3px solid #B0660F; }
`);

const S = pw.component("seat");
const [money, flash, delta, phase, regionShow] = ["money", "moneyFlash", "moneyDelta", "phase", "regionShow"].map((n) => S.property(n));
const regionOf = S.text("region");
const player = pw.field("controls", "player");
const draw = numerals(sheets());
const ROAM = 3;

pw.screen("roam hud", { includeComponents: [S], anchor: "top-right", margin: 28 }, ({ seat, objects }) => {
  const me = objects.find((o) => o.get(player) === seat.player);
  if (me === undefined || me.get(phase) !== ROAM || me.get(flash) <= 0) return [];
  const d = me.get(delta);
  return box({ class: "roammoney" }, [
    draw(`${d > 0 ? "+" : "-"}${Math.abs(d)}`, d > 0 ? "gold" : "red", 30),
    box({ class: "coin" }, [box({ class: "coinring" }, [])]),
    draw(`${me.get(money)}`, "gold", 54),
  ]);
});

// The region's name as you drive in. Plain text with a drawn outline (text-shadow) until rinch can
// stroke text (data/hud.ts): the baked numerals have no full alphabet.
pw.screen("roam region", { includeComponents: [S], anchor: "bottom-left", margin: 40 }, ({ seat, objects }) => {
  const me = objects.find((o) => o.get(player) === seat.player);
  if (me === undefined || me.get(phase) !== ROAM || me.get(regionShow) <= 0) return [];
  return label({ class: "regionname" }, me.get(regionOf) ?? "");
});
