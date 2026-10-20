// The default export is a plugin definition object accepted by both
// OpenCode v1 (`{ id, server }`) and OpenCode v2 (`{ id, setup }`).
// Keep the package root free of function exports: legacy OpenCode loaders
// invoke every function exported from the plugin entrypoint.
// implements REQ-opencode-v2-plugin-api
import { createPluginDefinition } from "./opencode-v2.js";
import kibiOpencodePlugin from "./plugin.js";

const kibiOpencodePluginDefinition = createPluginDefinition(kibiOpencodePlugin);

export default kibiOpencodePluginDefinition;
export type {
  KibiOpencodePluginDefinition,
  V2PluginContext,
} from "./opencode-v2.js";
export type { Hooks, Plugin, PluginInput } from "./plugin.js";
