// The HUD's drawn numerals (Design, "The HUD"): outlined, gradient-filled game graphics. Rinch can't
// paint them as CSS yet (rinch #2719: `background-clip: text`, `-webkit-text-stroke`), so they are baked
// by tools/hud_glyphs.py into a sprite sheet per colour ("HUD numerals gold", "… cream", "… blue",
// "… red") and shown glyph by glyph, each clipped to its own width. When #2719 lands, `numerals` draws
// the same thing with CSS and the sheets go.
//
// Used by the screens: `const n = numerals(sheets); n("3rd", "gold", 120)`.
import { box, image } from "@pw/ui";

/** The glyphs on each sheet, in order, and each one's width in the sheet's 128 × 160 cells. */
export const GLYPHS = "0123456789/:.+-stndrhkmGo!";
export const WIDTHS = [95, 67, 81, 82, 90, 81, 87, 78, 87, 86, 87, 52, 46, 91, 81, 72, 63, 85, 86, 66, 79, 82, 113, 93, 80, 53];
export const CELL = [128, 160];
export const COLOURS = ["gold", "cream", "blue", "red"];
/** How far each glyph tucks under the last, so their outlines touch as set type does. */
const TUCK = 14;

/** The sheets, named once at the top of a screens file. */
export function sheets() {
  return Object.fromEntries(COLOURS.map((c) => [c, pw.image(`HUD numerals ${c}`, { cell: CELL })]));
}

/**
 * A drawer of numerals from the sheets: `draw(text, colour, height, small)` lays out `text` at `height`
 * px; letters (an ordinal's "rd", "km") are drawn at `small` of that height, sitting on the baseline.
 * A character the sheets don't have is left out.
 */
export function numerals(sheet) {
  return (text, colour = "gold", height = 80, small = 0.5) => {
    const glyphs = [];
    const s = String(text);
    // Letters beside digits are a unit or an ordinal's ending: drawn smaller. Words ("Go!") are full size.
    const withDigits = /[0-9]/.test(s);
    for (const ch of s) {
      const i = GLYPHS.indexOf(ch);
      if (i < 0) continue;
      const h = height * (withDigits && /[a-z]/.test(ch) ? small : 1);
      const k = h / CELL[1];
      const w = WIDTHS[i] * k;
      glyphs.push(box({ class: "gly", style: `width: ${w}px; height: ${h}px; margin-right: ${-TUCK * k}px` }, [
        image(sheet[colour] ?? sheet.gold, { frame: i, class: "glyimg", style: `width: ${CELL[0] * k}px; height: ${h}px; left: ${-((CELL[0] - WIDTHS[i]) / 2) * k}px` }),
      ]));
    }
    return box({ class: "glyrow", style: `height: ${height}px` }, glyphs);
  };
}

/** "1st", "2nd", "3rd", "4th" … */
export function ordinal(n) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen || n % 10 > 3 || n % 10 === 0 ? "th" : ["", "st", "nd", "rd"][n % 10]}`;
}

/** CSS the numerals need; add it with styles() in any screens file that draws them. */
export const NUMERAL_CSS = `
.glyrow { display: flex; flex-direction: row; align-items: flex-end; }
.gly { position: relative; overflow: hidden; flex: none; }
.glyimg { position: absolute; left: 0; top: 0; }
`;
