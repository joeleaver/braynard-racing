// Each racer's base kart (Design, "Racers and karts" → "How a kart is put together in the game"): the
// blueprint picked racers' karts are spawned from, and its wheels as sockets, in the order a Kart Build
// card's wheel1 … wheel4 link them. A three-wheeler lists three.

export const KARTS = [
  { blueprint: "Hettie's Kart", wheels: ["Wheel FL", "Wheel FR", "Wheel RL", "Wheel RR"] },
  { blueprint: "Max's Racer", wheels: ["Wheel FL", "Wheel FR", "Wheel RL", "Wheel RR"] },
  { blueprint: "Puddles' Bathtub", wheels: ["Wheel FL", "Wheel FR", "Wheel RL", "Wheel RR"] },
  { blueprint: "The Major's Boat", wheels: ["Wheel FL", "Wheel FR", "Wheel RL", "Wheel RR"] },
  { blueprint: "Mabel's Churn", wheels: ["Wheel FL", "Wheel FR", "Wheel RL", "Wheel RR"] },
  { blueprint: "Scraps' Can Kart", wheels: ["Wheel FL", "Wheel FR", "Wheel RL", "Wheel RR"] },
  { blueprint: "Marmalade's Scoop", wheels: ["Wheel FL", "Wheel FR", "Wheel RL", "Wheel RR"] },
  // Duvet's wheelbarrow: one fixed front wheel between the handles (its two hidden Wheels hold it up).
  { blueprint: "Duvet's Wheelbarrow", wheels: ["Wheel F", "Wheel RL", "Wheel RR"] },
];

/** Racer `n`'s base kart (1 to 8). */
export const kartOf = (n) => KARTS[n - 1];

/** The shared effects set: each piece's blueprint, the socket it goes on, and the Kart Build link that keeps it. */
export const EFFECTS = [
  { blueprint: "Kart fx: trail", socket: "trail", link: "fxTrail" },
  { blueprint: "Kart fx: exhaust", socket: "exhaust", link: "fxExhaust" },
  { blueprint: "Kart fx: sparks", socket: "spark_l", link: "fxSparkL" },
  { blueprint: "Kart fx: sparks", socket: "spark_r", link: "fxSparkR" },
];
