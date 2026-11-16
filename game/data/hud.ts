// The HUD's drawn numerals (Design, "The HUD"): outlined, gradient-filled game graphics.
//
// Two ways to draw them, behind one switch:
// - CSS (the goal): Lilita One with `-webkit-text-stroke` and a hard `text-shadow` underneath, and a
//   gradient fill through `background-clip: text` on top. Rinch can paint these from rinch 6539714c6
//   (#2729). They reach the game when Playweft moves its rinch pin.
// - Baked sheets (the stopgap until then): tools/hud_glyphs.py draws each glyph from that same CSS in
//   Chrome, into a sprite sheet per colour ("HUD numerals gold", "… cream", "… blue", "… red"). They
//   are shown glyph by glyph, each clipped to its own width.
// When the game's rinch has #2729, set CSS_NUMERALS to true, check the race HUD in Play, and delete
// the sheets, tools/hud_glyphs.py and the baked branch below. Rinch's software painter is heavy for
// these (about 36 ms at 2x for 24 numerals); the GPU renderer is fine (about 2 ms).
//
// Used by the screens: `const draw = numerals(sheets()); draw("3rd", "gold", 120)`.
import { box, label, image } from "@pw/ui";

/** Draw the numerals with CSS (true) or from the baked sheets (false). */
export const CSS_NUMERALS = false;

/** The glyphs on each sheet, in order, and each one's width in the sheet's 128 × 160 cells. */
export const GLYPHS = "0123456789/:.+-stndrhkmGo!";
export const WIDTHS = [95, 67, 81, 82, 90, 81, 87, 78, 87, 86, 87, 52, 46, 91, 81, 72, 63, 85, 86, 66, 79, 82, 113, 93, 80, 53];
export const CELL = [128, 160];
export const COLOURS = ["gold", "cream", "blue", "red"];
/** How far each glyph tucks under the last, so their outlines touch as set type does. */
const TUCK = 14;
/** The font size that gives a line `height` px tall, for the CSS numerals (the sheets' 120 px glyph in a 160 px cell). */
const FONT_OF_HEIGHT = 120 / 160;

/** The sheets, named once at the top of a screens file (unused when the numerals are CSS). */
export function sheets() {
  return CSS_NUMERALS ? {} : Object.fromEntries(COLOURS.map((c) => [c, pw.image(`HUD numerals ${c}`, { cell: CELL })]));
}

/** Split text into runs drawn full size and runs drawn small (letters beside digits: "rd", "km"). */
function runs(text, small) {
  const s = String(text);
  const withDigits = /[0-9]/.test(s);
  const out = [];
  for (const ch of s) {
    const scale = withDigits && /[a-z]/.test(ch) ? small : 1;
    const last = out[out.length - 1];
    if (last && last.scale === scale) last.text += ch;
    else out.push({ text: ch, scale });
  }
  return out;
}

/**
 * A drawer of numerals: `draw(text, colour, height, small)` lays out `text` at `height` px; letters
 * beside digits (an ordinal's "rd", "km") are drawn at `small` of that height, sitting on the baseline.
 */
export function numerals(sheet) {
  if (CSS_NUMERALS) {
    return (text, colour = "gold", height = 80, small = 0.5) =>
      box({ class: "glyrow", style: `height: ${height}px` }, runs(text, small).map((r) => {
        const size = height * r.scale * FONT_OF_HEIGHT;
        // The extrusion (the outline again, a little lower), the outline, the gradient fill on top and the
        // shine over it. Rinch takes a text-shadow from the fill alone, so a shadow would hide behind the
        // outline: the extrusion is its own layer instead.
        return box({ class: `num ${colour}`, style: `font-size: ${size}px` }, [
          label({ class: "nums" }, r.text),
          label({ class: "numk" }, r.text),
          label({ class: "numt" }, r.text),
          label({ class: "numh" }, r.text),
        ]);
      }));
  }
  return (text, colour = "gold", height = 80, small = 0.5) => {
    const glyphs = [];
    for (const r of runs(text, small)) {
      for (const ch of r.text) {
        const i = GLYPHS.indexOf(ch);
        if (i < 0) continue;
        const h = height * r.scale;
        const k = h / CELL[1];
        const w = WIDTHS[i] * k;
        glyphs.push(box({ class: "gly", style: `width: ${w}px; height: ${h}px; margin-right: ${-TUCK * k}px` }, [
          image(sheet[colour] ?? sheet.gold, { frame: i, class: "glyimg", style: `width: ${CELL[0] * k}px; height: ${h}px; left: ${-((CELL[0] - WIDTHS[i]) / 2) * k}px` }),
        ]));
      }
    }
    return box({ class: "glyrow", style: `height: ${height}px` }, glyphs);
  };
}

/** "1st", "2nd", "3rd", "4th" … */
export function ordinal(n) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen || n % 10 > 3 || n % 10 === 0 ? "th" : ["", "st", "nd", "rd"][n % 10]}`;
}

const FILLS = {
  gold: ["linear-gradient(180deg, #FFF6B8 0%, #FFD24A 38%, #F7A21B 70%, #E06A12 100%)", "#3A1E08"],
  cream: ["linear-gradient(180deg, #FFFFFF 0%, #FFF6E2 50%, #E8D4A6 100%)", "#3A1E08"],
  blue: ["linear-gradient(180deg, #E6F3FF 0%, #8CC7FF 45%, #3D86E0 100%)", "#0F2647"],
  red: ["linear-gradient(180deg, #FFE1D6 0%, #FF8A6A 45%, #D6382A 100%)", "#3E0C06"],
};

/** CSS the numerals need; add it with styles() in any screens file that draws them. */
export const NUMERAL_CSS = `
.glyrow { display: flex; flex-direction: row; align-items: flex-end; }
.gly { position: relative; overflow: hidden; flex: none; }
.glyimg { position: absolute; left: 0; top: 0; }
.num { position: relative; display: inline-block; line-height: 1; white-space: nowrap; font-family: "Lilita One", sans-serif; }
.nums { position: absolute; left: 0; top: 0.06em; -webkit-text-stroke: 0.13em var(--ink); color: var(--ink); }
.numk { position: absolute; left: 0; top: 0; -webkit-text-stroke: 0.13em var(--ink); color: var(--ink); }
.numt { position: relative; -webkit-background-clip: text; background-clip: text; color: transparent; }
.numh { position: absolute; left: 0; top: 0; background: linear-gradient(180deg, #FFFFFFA6 0%, #FFFFFF00 42%); -webkit-background-clip: text; background-clip: text; color: transparent; }
${Object.entries(FILLS).map(([c, [fill, ink]]) => `.num.${c} { --ink: ${ink}; } .num.${c} .numt { background-image: ${fill}; }`).join("\n")}
`;
