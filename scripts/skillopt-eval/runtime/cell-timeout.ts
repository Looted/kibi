/**
 * Wall-clock limit for one target cell when the operator sets none. A correct
 * requirement split takes 50 to 70 tool events and up to about four minutes
 * on a low-effort target, so a three-minute limit cut off correct answers.
 */
export const DEFAULT_CELL_TIMEOUT_MS = 300_000;
