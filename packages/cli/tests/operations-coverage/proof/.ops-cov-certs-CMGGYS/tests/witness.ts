import type { Color } from "../src/limits.js";
import { COLORS } from "../src/limits.js";
export function name(color: Color): string {
  switch (color) {
    case "red": return "r";
    case "blue": return "b";
    default: { const never: never = color; return never; }
  }
}
export const all = COLORS;