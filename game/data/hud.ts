// The HUD's drawn numerals (Design, "The HUD"): outlined, gradient-filled game graphics, drawn as CSS.
//
// Lilita One, with `-webkit-text-stroke` for the dark outline, a gradient fill through
// `background-clip: text` on top, a shine over it, and a hard `drop-shadow` under the whole glyph for
// the extruded edge (rinch's text-shadow takes only the fill, so the shadow is a filter on the glyph).
// Rinch's software painter is heavy for these (about 36 ms at 2x for 24 numerals); the GPU renderer is
// fine (about 2 ms).
//
// Used by the screens: `const draw = numerals(); draw("3rd", "gold", 120)`.
import { box, label } from "@pw/ui";

export const COLOURS = ["gold", "cream", "blue", "red"];
/** The font size that gives a line `height` px tall (a 120 px glyph in a 160 px line). */
const FONT_OF_HEIGHT = 120 / 160;

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
export function numerals() {
  return (text, colour = "gold", height = 80, small = 0.5) =>
    box({ class: "glyrow", style: `height: ${height}px` }, runs(text, small).map((r) =>
      // A hidden copy that sizes the glyph, then the outline, the gradient fill on top and the shine over
      // it, all laid over it in order; the glyph's drop-shadow is the extrusion.
      box({ class: `num ${colour}`, style: `font-size: ${height * r.scale * FONT_OF_HEIGHT}px` }, [
        label({ class: "numz" }, r.text),
        label({ class: "numk" }, r.text),
        label({ class: "numt" }, r.text),
        label({ class: "numh" }, r.text),
      ])));
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
.num { position: relative; display: inline-block; line-height: 1; white-space: nowrap; font-family: ${pw.font("Lilita One")}; }
.numz { visibility: hidden; }
.numk { position: absolute; left: 0; top: 0; }
.numt { position: absolute; left: 0; top: 0; -webkit-background-clip: text; background-clip: text; color: transparent; }
.numh { position: absolute; left: 0; top: 0; background: linear-gradient(180deg, #FFFFFFA6 0%, #FFFFFF00 42%); -webkit-background-clip: text; background-clip: text; color: transparent; }
${Object.entries(FILLS).map(([c, [fill, ink]]) =>
  // Each colour's ink written out: rinch doesn't take a custom property inside a text stroke or a filter.
  `.num.${c} { filter: drop-shadow(0 0.06em 0 ${ink}); } .num.${c} .numk { -webkit-text-stroke: 0.13em ${ink}; color: ${ink}; } .num.${c} .numt { background-image: ${fill}; }`).join("\n")}
`;
