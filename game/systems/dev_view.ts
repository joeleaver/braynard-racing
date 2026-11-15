// The testing tools after the cameras have followed their karts: a player flying their free camera
// looks through it, and it moves by their stick, look and rise; the dev menu's read-outs are copied
// onto each seat; and each Place knows who has the Go to page open, for the screen.
//
// Runs in `react`, after systems/views.ts, so a free camera wins over the chase camera.
import { dev, seats } from "./state";

const C = pw.component("freeCamera");
const c = Object.fromEntries(["seat", "speed", "turn", "mouse", "yaw", "pitch"].map((n) => [n, C.property(n)]));
const position = pw.vec3("transform", "position");
const rotation = pw.quat("transform", "rotation");
const LIMIT = 1.5;

pw.registerSystem("free cameras", { phase: "react", includeComponents: ["freeCamera", "camera"] }, ({ objects }) => {
  const dt = objects.dt;
  for (const cam of objects) {
    const seat = cam.get(c.seat);
    const input = dev.flying.get(seat);
    const flying = input !== undefined;
    const starting = flying && !cam.camera.rendering;
    cam.camera.rendering = flying;
    if (!flying) continue;
    // Taking off: from just behind and above the kart, looking the way it faces.
    const kart = dev.kartAt.get(seat);
    if (starting && kart !== undefined) {
      cam.set(position, [kart.at[0] + Math.sin(kart.heading) * 6, kart.at[1] + 3, kart.at[2] + Math.cos(kart.heading) * 6]);
      cam.set(c.yaw, kart.heading);
      cam.set(c.pitch, -0.25);
    }
    let yaw = cam.get(c.yaw) - input.look[0] * cam.get(c.turn) * dt - input.mouse[0] * cam.get(c.mouse);
    let pitch = cam.get(c.pitch) + input.look[1] * cam.get(c.turn) * dt - input.mouse[1] * cam.get(c.mouse);
    pitch = Math.max(-LIMIT, Math.min(LIMIT, pitch));
    const q = [
      Math.cos(yaw / 2) * Math.sin(pitch / 2),
      Math.sin(yaw / 2) * Math.cos(pitch / 2),
      -Math.sin(yaw / 2) * Math.sin(pitch / 2),
      Math.cos(yaw / 2) * Math.cos(pitch / 2),
    ];
    const ahead = pw.rotateVector([0, 0, -1], q);
    const right = pw.rotateVector([1, 0, 0], q);
    const speed = cam.get(c.speed) * (input.fast ? 4 : 1) * dt;
    const [mx, my] = input.move;
    const p = cam.get(position);
    cam.set(position, [
      p[0] + (ahead[0] * my + right[0] * mx) * speed,
      p[1] + (ahead[1] * my + input.rise) * speed,
      p[2] + (ahead[2] * my + right[2] * mx) * speed,
    ]);
    cam.set(rotation, q);
    cam.set(c.yaw, yaw);
    cam.set(c.pitch, pitch);
    pw.view.set(seat, cam);
  }
});

const S = pw.component("seat");
const s = Object.fromEntries(["seeHour", "seeWeather", "seeScale", "devOpen", "devPage"].map((n) => [n, S.property(n)]));
const player = pw.field("controls", "player");
let goTo = 0;

pw.registerSystem("dev read-outs", { phase: "react", includeComponents: ["seat", "controls"] }, ({ objects }) => {
  goTo = 0;
  for (const seat of objects) {
    seat.set(s.seeHour, dev.hour);
    seat.set(s.seeWeather, dev.weather);
    seat.set(s.seeScale, pw.time.scale);
    const n = seat.get(player);
    if ((seats.get(n)?.here ?? false) && seat.get(s.devOpen) === 1 && seat.get(s.devPage) === 0 && n >= 1 && n <= 30) goTo |= 1 << (n - 1);
  }
});

const menuFor = pw.field("place", "menuFor");
pw.registerSystem("places shown", { phase: "react", includeComponents: ["place"] }, ({ objects }) => {
  for (const o of objects) if (o.get(menuFor) !== goTo) o.set(menuFor, goTo);
});
