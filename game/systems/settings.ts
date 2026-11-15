// Settings (Design, "Game systems" → "Settings"): the Settings tab's changes, kept in the player's save
// and put back when they arrive. The engine forgets sound and picture settings at Stop, so they are set
// again from the save every visit.
// - Sound: each bus of the game's mix (pw.volume), on this player's machine only.
// - Picture: a quality preset and the render scale (pw.quality), on this player's machine only.
// - Controls: rebinding through the engine's pw.controls, which keeps the choices itself; drift as a toggle
//   and auto-accelerate are the game's own (the driver reads them from here).
// - Accessibility and game options: kept as on/off in the save and on the seat for the screens.
// - Delete my save: asks twice.
//
// Runs in `act`, after the seats are counted and before the drivers ask.
import { seats } from "./state";
import { upgrade } from "../data/save";

/** Each option's bit on the seat, which part of the save keeps it, and whether it starts on. */
export const OPTIONS = {
  driftToggle: [1, "game", false],
  autoGas: [2, "game", false],
  bigText: [4, "access", false],
  reduceMotion: [8, "access", false],
  subtitles: [16, "access", true],
  mph: [32, "game", false],
  ghosts: [64, "game", true],
  friendsGhosts: [128, "game", true],
  colourSafe: [256, "access", false],
};
/** The drive controls a player can rebind, in the order the screen lists them. */
const REBINDABLE = ["stick", "gas", "brake", "drift", "respawn", "menu", "map"];

/** What the driver asks for each seat this tick, when an option changes it: { drift, autoGas }. */
export const driving = new Map();

const S = pw.component("seat");
const f = Object.fromEntries(["settingsApplied", "setSub", "opts", "confirmClear", "driftLatch", "driftWas", "menuOpen", "menuPage"].map((n) => [n, S.property(n)]));
const bindText = Object.fromEntries(REBINDABLE.map((a) => [a, S.text(`bind${a[0].toUpperCase()}${a.slice(1)}`)]));
const player = pw.field("controls", "player");
const driftButton = pw.action("drive", "drift");
const statLoaded = S.property("statLoaded");
const SETTINGS_TAB = 6;

function settingsOf(save) {
  const s = save.get("settings", {});
  return { audio: s.audio ?? {}, graphics: s.graphics ?? {}, access: s.access ?? {}, game: s.game ?? {} };
}

function optsOf(settings) {
  let bits = 0;
  for (const [name, [bit, part, start]] of Object.entries(OPTIONS)) if (settings[part][name] ?? start) bits |= bit;
  return bits;
}

/** Set sound or picture values on this player's machine, without letting a bad value stop the game. */
function apply(what, n, values) {
  try {
    if (what === "volume") pw.volume.set(n, values);
    else pw.quality.set(n, values);
  } catch (e) {
    console.log(`settings: ${what} ${JSON.stringify(values)} not taken: ${e}`);
  }
}

pw.registerSystem("settings", { includeComponents: ["seat", "controls"], events: ["setting"] }, ({ objects, events }) => {
  driving.clear();
  for (const seat of objects) {
    const n = seat.get(player);
    if (!(seats.get(n)?.here ?? false)) {
      seat.set(f.settingsApplied, 0);
      seat.set(f.confirmClear, 0);
      continue;
    }
    const save = pw.save(n);
    let settings = settingsOf(save);

    // Arriving: put the saved sound and picture back, and the options on the seat.
    if (seat.get(f.settingsApplied) === 0) {
      if (Object.keys(settings.audio).length > 0) apply("volume", n, settings.audio);
      const { preset, ...picture } = settings.graphics;
      if (Object.keys(picture).length > 0) apply("quality", n, picture);
      seat.set(f.opts, optsOf(settings));
      seat.set(f.settingsApplied, 1);
    }

    for (const e of events) {
      if (e.seat !== n) continue;
      const controls = pw.controls(n);
      if (e.what === "sub") seat.set(f.setSub, Math.max(0, Math.min(4, Math.round(e.n))));
      else if (e.what === "volume" && e.key !== "") {
        const v = Math.round(Math.max(0, Math.min(1, e.n)) * 100) / 100;
        apply("volume", n, { [e.key]: v });
        settings.audio = { ...settings.audio, [e.key]: v };
      } else if (e.what === "preset" && pw.quality.presets[e.key] !== undefined) {
        const values = { ...pw.quality.presets[e.key], ...(settings.graphics.renderScale !== undefined ? { renderScale: settings.graphics.renderScale } : {}) };
        apply("quality", n, values);
        settings.graphics = { ...values, preset: e.key };
      } else if (e.what === "scale") {
        const v = Math.round(Math.max(0.25, Math.min(1, e.n)) * 100) / 100;
        apply("quality", n, { renderScale: v });
        settings.graphics = { ...settings.graphics, renderScale: v };
      } else if (e.what === "opt" && OPTIONS[e.key] !== undefined) {
        const [bit, part] = OPTIONS[e.key];
        const on = (seat.get(f.opts) & bit) === 0;
        seat.set(f.opts, on ? seat.get(f.opts) | bit : seat.get(f.opts) & ~bit);
        settings[part] = { ...settings[part], [e.key]: on };
        if (e.key === "driftToggle") seat.set(f.driftLatch, 0);
      } else if (e.what === "bind") {
        // key: "action:i", the i-th control the screen showed for that action.
        const [action, i] = e.key.split(":");
        const row = controls.list("drive").filter((r) => r.action === action)[Number(i)];
        if (row !== undefined) controls.listen(row, { cancel: "key:escape" });
      } else if (e.what === "stop") controls.cancel();
      else if (e.what === "reset") controls.reset();
      else if (e.what === "cancel") seat.set(f.confirmClear, 0);
      else if (e.what === "clear") {
        const asked = seat.get(f.confirmClear);
        if (asked < 2) seat.set(f.confirmClear, asked + 1);
        else {
          save.clear();
          upgrade(n);
          settings = settingsOf(save);
          seat.set(f.opts, optsOf(settings));
          seat.set(f.confirmClear, 0);
          // The fun stats start over too, rather than the next write putting the old ones back.
          seat.set(statLoaded, 0);
          continue;
        }
      }
      // Kept in the save; its `settings` holds every section.
      if (["volume", "preset", "scale", "opt"].includes(e.what)) save.set("settings", settings);
    }

    // The controls, listed for the screen while the Settings tab is open.
    if (seat.get(f.menuOpen) === 1 && seat.get(f.menuPage) === SETTINGS_TAB) {
      const rows = pw.controls(n).list("drive");
      for (const action of REBINDABLE) {
        const text = rows.filter((r) => r.action === action)
          .map((r) => `${r.listening ? "*" : r.changed ? "~" : ""}${r.slot ? `${r.slot} ` : ""}${r.label}`.replaceAll("|", "/"))
          .join("|").slice(0, 250);
        if (seat.get(bindText[action]) !== text) seat.set(bindText[action], text);
      }
    }

    // Drift as a toggle, and auto-accelerate, for the driver.
    const opts = seat.get(f.opts);
    if (opts & (OPTIONS.driftToggle[0] | OPTIONS.autoGas[0])) {
      const ask = {};
      if (opts & OPTIONS.driftToggle[0]) {
        const down = seat.get(driftButton) === true;
        if (down && seat.get(f.driftWas) === 0) seat.set(f.driftLatch, seat.get(f.driftLatch) === 1 ? 0 : 1);
        seat.set(f.driftWas, down ? 1 : 0);
        ask.drift = seat.get(f.driftLatch);
      }
      if (opts & OPTIONS.autoGas[0]) ask.autoGas = true;
      driving.set(n, ask);
    }
  }
});
