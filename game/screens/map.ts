// The county map and the compass strip (Design: Pimble, Braynard Racing/Design → "The map").
//
// The map is a sheet baked from the world's own data (tools/county_map.py, data/map.ts) with
// everything live drawn over it: the places, the waypoint and the breadcrumbs of the route to it,
// the other players and you. Everything is placed in percentages of the sheet, so it draws the same
// at any window size and any zoom. The compass strip sits at the top while you drive.
import { box, label, button, image, styles } from "@pw/ui";
import { SHEET, KART, unpackCrumbs } from "../data/map";

styles(`
.mapback { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #10261699; }
.mapframe { position: fixed; left: 50%; top: 50%; width: 82vh; height: 82vh; transform: translate(-50%, -48%); background: #2F6B3A; border: 4px solid #1D4426; border-radius: 18px; box-shadow: inset 0 3px 0 #4E8C55, 0 6px 0 #1D4426; padding: 10px; }
.mapview { position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 10px; background: #7EBA60; box-shadow: inset 0 0 0 2px #1D4426; }
.mapsheet { position: absolute; }
.mapimg { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.mapat { position: absolute; width: 0; height: 0; }
.crumb { position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; border-radius: 4px; background: #FFC531; box-shadow: 0 0 0 2px #1D4426; }
.pin { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 9px; border: 3px solid #FFFBF2; background: #1D4426; padding: 0; box-shadow: 0 2px 0 #10261A; }
.pin.course { background: #B8261E; border-radius: 3px; }
.pin.home { background: #2F6FD6; }
.pin.shop { background: #FFC531; }
.pin.event { background: #B8261E; border-color: #FFC531; }
.pin.secret { background: #6B3E26; }
.pinname { position: absolute; left: 14px; top: -10px; white-space: nowrap; font-size: 14px; color: #FFFBF2; text-shadow: 0 1px 0 #1D4426, 0 0 4px #1D4426; }
.wp { position: absolute; left: -14px; top: -34px; width: 28px; height: 28px; border-radius: 14px 14px 14px 2px; transform: rotate(-45deg); background: #FFC531; border: 3px solid #1D4426; }
.other { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 9px; border: 3px solid #FFFBF2; background: #2F6FD6; }
.me { position: absolute; left: -16px; top: -16px; width: 32px; height: 32px; }
.mebody { position: absolute; left: 4px; top: 6px; width: 24px; height: 24px; border-radius: 12px; background: #D63B2F; border: 3px solid #FFFBF2; box-shadow: 0 2px 0 #10261A; }
.menose { position: absolute; left: 12px; top: -2px; width: 8px; height: 14px; border-radius: 4px; background: #FFFBF2; }
.cursor { position: absolute; left: -15px; top: -15px; width: 30px; height: 30px; border: 2px solid #FFFBF2bb; border-radius: 15px; }
.mapbar { position: fixed; left: 50%; top: 2vh; transform: translateX(-50%); display: flex; flex-direction: row; align-items: center; gap: 12px; }
.maptitle { font-size: 30px; color: #FFFBF2; text-shadow: 0 3px 0 #1D4426; }
.mapbtn { font-size: 16px; padding: 6px 12px; border-radius: 8px; border: 0; background: #FFFBF2; color: #1D4426; box-shadow: 0 3px 0 #B9D6B4; }
.mapinfo { position: fixed; left: 50%; bottom: 1.5vh; transform: translateX(-50%); font-size: 15px; color: #FFFBF2; text-shadow: 0 1px 3px #000c; white-space: nowrap; }
.compass { position: relative; width: 520px; height: 34px; overflow: hidden; border-radius: 17px; background: #102616cc; border: 3px solid #1D4426; }
.tick { position: absolute; top: 4px; width: 2px; height: 8px; margin-left: -1px; background: #B9D6B4; }
.card { position: absolute; top: 6px; width: 30px; margin-left: -15px; text-align: center; font-size: 17px; color: #FFFBF2; }
.card.n { color: #FFC531; }
.cwp { position: absolute; top: 5px; width: 18px; height: 18px; margin-left: -9px; border-radius: 9px 9px 9px 2px; transform: rotate(-45deg); background: #FFC531; border: 2px solid #1D4426; }
.cwp.edge { opacity: 0.6; }
.cmid { position: absolute; left: 50%; top: 0; width: 2px; height: 34px; margin-left: -1px; background: #FFFBF288; }
.cdist { margin-top: 4px; text-align: center; font-size: 16px; color: #FFFBF2; text-shadow: 0 1px 3px #000c; }
`);

const V = pw.component("map_view");
const f = Object.fromEntries(["open", "zoom", "cx", "cz", "wpOn", "wpX", "wpZ", "heading", "dist", "bearing"].map((n) => [n, V.property(n)]));
const t = Object.fromEntries(["wpName", "route"].map((n) => [n, V.text(n)]));
const player = pw.field("controls", "player");
const position = pw.vec3("transform", "position");
const sheet = pw.image(SHEET.image);
const Pin = pw.component("map_pin");
const pinKind = Pin.property("kind");
const pinLabel = Pin.text("label");
const pinFound = Pin.property("found");
const PIN_CLASS = ["pin", "pin course", "pin home", "pin shop", "pin event", "pin secret"];

/** Where the sheet sits in the frame for this view: zoomed, with the cursor in the middle, and the
 * sheet always filling the frame. */
function sheetPlace(me) {
  const zoom = me.get(f.zoom);
  const edge = 0.5 / zoom;
  const u = Math.min(1 - edge, Math.max(edge, (me.get(f.cx) - SHEET.x0) / SHEET.size));
  const v = Math.min(1 - edge, Math.max(edge, (me.get(f.cz) - SHEET.z0) / SHEET.size));
  return { width: `${zoom * 100}%`, height: `${zoom * 100}%`, left: `${50 - u * zoom * 100}%`, top: `${50 - v * zoom * 100}%` };
}
const far = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
/** A spot on the sheet, as percentages from its top left (north up). */
const at = (x, z) => ({ left: `${((x - SHEET.x0) / SHEET.size) * 100}%`, top: `${((z - SHEET.z0) / SHEET.size) * 100}%` });
const say = (what, more = {}) => pw.emit("map", { what, ...more });

// One screen for the whole map: it sees every pin, and every player's kart carries one, so it finds
// the viewer's map (on their kart) among them.
pw.screen("map", { includeComponents: [Pin], anchor: "fill" }, ({ seat, objects }) => {
  const karts = objects.filter((o) => o.get(pinKind) === KART);
  const me = karts.find((o) => o.get(player) === seat.player);
  if (me === undefined || me.get(f.open) !== 1) return [];
  const bit = 1 << (seat.player - 1);
  const zoom = me.get(f.zoom);
  const place = sheetPlace(me);
  const [mx, , mz] = me.get(position);
  const wpOn = me.get(f.wpOn) === 1;
  const name = me.get(t.wpName);

  const marks = [
    ...unpackCrumbs(me.get(t.route)).map(([x, z]) => box({ class: "mapat", style: at(x, z) }, [box({ class: "crumb" })])),
    // The places, course starts, shops and events this player has found. Click one to head there.
    ...objects.filter((o) => o.get(pinKind) !== KART && (o.get(pinFound) & bit) !== 0).map((o) => {
      const [x, , z] = o.get(position);
      const kind = o.get(pinKind);
      const n = o.get(pinLabel);
      return box({ class: "mapat", style: at(x, z) }, [
        button({ class: PIN_CLASS[kind] ?? "pin", onclick: say("mark", { place: n }) }, ""),
        ...(zoom >= 2 || kind !== 0 ? [label({ class: "pinname" }, n)] : []),
      ]);
    }),
    // The other players.
    ...karts.filter((o) => o !== me && o.get(player) !== 0).map((o) => {
      const [x, , z] = o.get(position);
      return box({ class: "mapat", style: at(x, z) }, [box({ class: "other" })]);
    }),
    ...(wpOn ? [box({ class: "mapat", style: at(me.get(f.wpX), me.get(f.wpZ)) }, [box({ class: "wp" })])] : []),
    box({ class: "mapat", style: at(mx, mz) }, [
      box({ class: "me", style: { transform: `rotate(${Math.round(me.get(f.heading))}deg)` } }, [box({ class: "mebody" }), box({ class: "menose" })]),
    ]),
  ];

  return [
    box({ class: "mapback" }),
    box({ class: "mapframe" }, [
      box({ class: "mapview" }, [
        box({ class: "mapsheet", style: place }, [
          image(sheet, { class: "mapimg" }),
          ...marks,
          box({ class: "mapat", style: at(me.get(f.cx), me.get(f.cz)) }, [box({ class: "cursor" })]),
        ]),
      ]),
    ]),
    box({ class: "mapbar" }, [
      label({ class: "maptitle" }, "Home Farm"),
      button({ class: "mapbtn", onclick: say("zoom", { n: zoom / 2 }) }, "−"),
      button({ class: "mapbtn", onclick: say("zoom", { n: zoom * 2 }) }, "+"),
      ...(wpOn ? [button({ class: "mapbtn", onclick: say("clear") }, "Clear waypoint")] : []),
      button({ class: "mapbtn", onclick: say("close") }, "Close"),
    ]),
    label({ class: "mapinfo" }, wpOn
      ? `Waypoint: ${name || "a spot on the map"} · ${far(me.get(f.dist))} by road · Enter on a place to change it`
      : "Stick to move · Z and X to zoom · Enter or click a place to set a waypoint · M to close"),
  ];
});

// The compass strip: north and the quarters, and the waypoint with how far it is, while driving.
const CARDS = [[0, "N"], [45, ""], [90, "E"], [135, ""], [180, "S"], [225, ""], [270, "W"], [315, ""]];
const SPAN = 200; // degrees across the strip

pw.screen("compass", { includeComponents: [V], anchor: "top", margin: 14 }, ({ seat, objects }) => {
  const me = objects.find((o) => o.get(player) === seat.player);
  if (me === undefined || me.get(f.open) === 1) return [];
  const heading = me.get(f.heading);
  const x = (rel) => `${50 + (rel / SPAN) * 100}%`;
  const rel = (deg) => ((((deg - heading + 180) % 360) + 360) % 360) - 180;
  const marks = [];
  for (const [deg, text] of CARDS) {
    const r = rel(deg);
    if (Math.abs(r) > SPAN / 2) continue;
    marks.push(text === "" ? box({ class: "tick", style: { left: x(r) } }) : label({ class: text === "N" ? "card n" : "card", style: { left: x(r) } }, text));
  }
  const wpOn = me.get(f.wpOn) === 1;
  if (wpOn) {
    const b = me.get(f.bearing);
    const edge = Math.abs(b) > SPAN / 2 - 6;
    marks.push(box({ class: edge ? "cwp edge" : "cwp", style: { left: x(Math.max(-SPAN / 2 + 6, Math.min(SPAN / 2 - 6, b))) } }));
  }
  return [
    box({ class: "compass" }, [box({ class: "cmid" }), ...marks]),
    ...(wpOn ? [label({ class: "cdist" }, `${me.get(t.wpName) || "Waypoint"} · ${far(me.get(f.dist))}`)] : []),
  ];
});
