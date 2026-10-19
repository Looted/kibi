import type { TuiPlugin } from "@opencode-ai/plugin/tui";

// The TUI half of kibi-opencode is intentionally empty; all behaviour lives in
// the server plugin. The default export carries both shapes:
// - OpenCode v1 reads `{ id, tui }` and calls `tui(api, options, meta)`.
// - OpenCode v2 resolves the `./tui` entry and requires `{ id, setup }`;
//   it rejects `{ id, tui }` with "Invalid V2 TUI plugin module".

// implements REQ-opencode-v2-plugin-api
export const tui: TuiPlugin = async (api, _options, _meta) => {
  void api;
};

/** OpenCode v2 TUI setup: registers nothing, so there is nothing to clean up. */
// implements REQ-opencode-v2-plugin-api
export const setup = (_context: unknown): void => {};

export default {
  id: "kibi-opencode",
  tui,
  setup,
} as const;
