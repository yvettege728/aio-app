// aio brand tokens (palette from the 11/7 reference, see aio branding canvas).
export const brand = {
  sky: "#E6EFFA",
  mist: "#F6DDE6",
  white: "#FBFCFF",
  periwinkle: "#6C7FD8",
  periwinkleText: "#4E5FB8", // small text on light ground, passes 4.5:1
  dot: "#9FD3EE",
  mint: "#CFE8C9",
  rose: "#EE8FA6",
  coral: "#E4625A",
  ink: "#5E4636",
  muted: "#75685F",
  line: "#C9D3F6",
  error: "#A8433B",
} as const;

export const markLiquid = require("./assets/mark-liquid.png");
export const ground = require("./assets/ground.png");
// mark-liquid.png is 936x420 (3x of 312x140pt)
export const MARK_RATIO = 420 / 936;
