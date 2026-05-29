import type { TuiPlugin } from "@opencode-ai/plugin/tui";

const tui: TuiPlugin = async (api, _options, _meta) => {
  void api;
};

export { tui };

export default {
  id: "kibi-opencode",
  tui,
} as const;
