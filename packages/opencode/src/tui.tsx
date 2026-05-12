/** @jsxImportSource @opentui/solid */
import type { TuiPlugin } from "@opencode-ai/plugin/tui";

const tui: TuiPlugin = async (_api, _options, _meta) => {
  // TODO: implement Kibi TUI panels and slots
};

export { tui };

export default {
  id: "kibi-opencode",
  tui,
} as const;
