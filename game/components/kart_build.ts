// How a kart is put together: on a racer's base kart (the blueprints named after the karts, "Hettie's Kart" …), the links to its
// own wheels and stock tyres, and to what has been fitted to its sockets since — the shared effects set
// and the player's build (data/parts.ts). systems/kart_build.ts fits them and writes the handling that
// results; the effects (systems/dust.ts) and the front tyres (systems/front_tyres.ts) are driven from
// here, kart by kart.
//
// A socket is an ordinary object under the kart, found by its name (Playweft DESIGN §3 "Sockets"): the
// base karts carry `trail`, `exhaust`, `spark_l`, `spark_r`, `front`, `rear`, `horn`, `dash` and
// `lights`, and each wheel is its own socket by its Wheel's name (data/karts.ts).
const link = (group, doc) => pw.object({ group, doc });

pw.defineComponent("kart_build", {
  wheel1: link("Wheels", "The kart's first Wheel, in data/karts.ts's order (front left; a three-wheeler's single front wheel)."),
  wheel2: link("Wheels", "Its second Wheel."),
  wheel3: link("Wheels", "Its third Wheel."),
  wheel4: link("Wheels", "Its fourth Wheel; empty on a three-wheeler."),
  stock1: link("Wheels", "The racer's own tyre model on wheel 1, hidden while other wheels are fitted."),
  stock2: link("Wheels", "… on wheel 2."),
  stock3: link("Wheels", "… on wheel 3."),
  stock4: link("Wheels", "… on wheel 4."),

  fxTrail: link("Fitted", "The effects set's trail (dust, spray, glints, tyre smoke, boost sparks), at the `trail` socket."),
  fxExhaust: link("Fitted", "The effects set's exhaust smoke, at the `exhaust` socket."),
  fxSparkL: link("Fitted", "The effects set's drift sparks at the left rear tyre (`spark_l`)."),
  fxSparkR: link("Fitted", "… and at the right rear tyre (`spark_r`)."),
  tyre1: link("Fitted", "The fitted wheels' tyre on wheel 1; empty with the stock tyres."),
  tyre2: link("Fitted", "… on wheel 2."),
  tyre3: link("Fitted", "… on wheel 3."),
  tyre4: link("Fitted", "… on wheel 4."),
  front: link("Fitted", "The attachment at the `front` socket."),
  rear: link("Fitted", "The attachment at the `rear` socket."),
  exhaust: link("Fitted", "The attachment at the `exhaust` socket (an exhaust swap)."),
  horn: link("Fitted", "The attachment at the `horn` socket."),
  dash: link("Fitted", "The attachment at the `dash` socket."),
  lights: link("Fitted", "The attachment at the `lights` socket."),

  fitted: pw.text("", { group: "Doing", doc: "The build fitted now, as data/parts.ts writes it; empty before the first fitting. A different wanted build is fitted afresh." }),
  grip: pw.float(1, { group: "Doing", doc: "The fitted parts' share of the tyres' grip (1 for the stock tyres), for systems/tyres.ts." }),
});
