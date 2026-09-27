import { readFileSync } from "node:fs";
import type { KibiPluginV1 } from "kibi-plugin-sdk";
import { createTreeSitterSymbolExtractor } from "./extractor.js";

const packageVersion = (
  JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as {
    version: string;
  }
).version;

// implements REQ-capability-plugin-protocol-v1
export {
  createTreeSitterSymbolExtractor,
  TREE_SITTER_LANGUAGES,
} from "./extractor.js";

// implements REQ-source-analysis-v2
/** Default offline Tree-sitter capability plugin. */
export const kibiPlugin = {
  apiVersion: "kibi.plugin.v1",
  id: "kibi-plugin-treesitter",
  version: packageVersion,
  permissions: {
    network: false,
    metered: false,
    secrets: [],
  },
  capabilities: {
    symbolExtractorV2: createTreeSitterSymbolExtractor(),
  },
} satisfies KibiPluginV1;

export default kibiPlugin;
