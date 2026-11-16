// Places you pull up to (Design, "Other game UI"; systems/pull_ups.ts). Near one, a small prompt at the
// bottom says where you are and to stop; stopped, its board opens over the live county. Each kind's own
// board (the paddock's posters, the Post Office's jobs, a shop's shelves) is built with its feature;
// until then the board says what will be there.
import { box, label, button, styles } from "@pw/ui";

styles(`
.pullprompt { display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 10px 22px; border-radius: 999px; background: linear-gradient(180deg, #243027E6, #0E1510E6); box-shadow: inset 0 0 0 2px #FFFFFF33, 0 5px 0 #0007; font-size: 22px; color: #FFF8E7; margin-bottom: 130px; }
.pullicon { width: 30px; height: 30px; border-radius: 15px; background: #FFC531; box-shadow: 0 0 0 3px #3A1E08; }
.pullname { display: block; font-family: ${pw.font("Lilita One")}; color: #FFC531; }
.pullboard { width: min(640px, 92vw); }
.pullkind { display: block; font-size: 13px; letter-spacing: 1.5px; color: #B9D6B4; margin: 0 0 2px 4px; }
.pulltext { display: block; font-size: 17px; color: #FFFBF2; margin: 6px 4px; }
.pullrow { display: flex; flex-direction: row; justify-content: flex-end; margin-top: 14px; }
.pullrow .go { padding: 10px 26px; font-size: 22px; margin-top: 0; }
`);

const S = pw.component("seat");
const f = Object.fromEntries(["placeNear", "placeOpen", "placeKind", "placeDone", "phase", "menuOpen"].map((n) => [n, S.property(n)]));
const placeName = S.text("placeName");
const player = pw.field("controls", "player");
const ROAM = 3;

/** Each kind's heading and, until its own board is built, what it will hold. */
const KINDS = [
  ["NOTICE BOARD", "This track's race, the cup that starts here, the rival race and the challenges go up here, each with its medal eggs, pay and your best."],
  ["POST OFFICE", "Deliveries and odd jobs, with their cargo, distance, time and pay, and letters from the clubs."],
  ["SHOP", "What's for sale here: small attachments, paint or hats, tried on the kart before you buy."],
  ["RACE OFFICE", "The season board and the county's leaderboards."],
  ["TEA ROOM", "Have a word with the racers."],
  ["YOUR BARN", "Your kart parts, paint and trophies."],
];

const mine = (seat, objects) => objects.find((o) => o.get(player) === seat.player);

pw.screen("pull-up prompt", { includeComponents: [S], anchor: "bottom" }, ({ seat, objects }) => {
  const me = mine(seat, objects);
  if (me === undefined || me.get(f.phase) !== ROAM || me.get(f.placeNear) !== 1) return [];
  if (me.get(f.placeOpen) === 1 || me.get(f.placeDone) === 1 || me.get(f.menuOpen) === 1) return [];
  return box({ class: "pullprompt" }, [box({ class: "pullicon" }, []), label({ class: "pullname" }, me.get(placeName) ?? ""), label("Stop here")]);
});

pw.screen("pull-up board", { includeComponents: [S], anchor: "center" }, ({ seat, objects }) => {
  const me = mine(seat, objects);
  if (me === undefined || me.get(f.phase) !== ROAM || me.get(f.placeOpen) !== 1 || me.get(f.menuOpen) === 1) return [];
  const [kind, holds] = KINDS[me.get(f.placeKind)] ?? KINDS[0];
  return box({ class: "board pullboard" }, [
    label({ class: "pullkind" }, kind),
    label({ class: "boardtitle" }, me.get(placeName) ?? ""),
    label({ class: "pulltext" }, holds),
    label({ class: "pulltext" }, "Coming soon."),
    box({ class: "pullrow" }, [button({ class: "go", onclick: pw.emit("pullup", { what: "leave" }), focus: "back" }, "Leave")]),
  ]);
});
