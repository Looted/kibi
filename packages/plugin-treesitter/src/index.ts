import { readFileSync } from "node:fs";
import type { KibiPluginV1 } from "kibi-plugin-sdk";
import {
  createTreeSitterReferenceExtractor,
  createTreeSitterSymbolExtractor,
  createTreeSitterWorkerPool,
} from "./extractor.js";

const packageVersion = (
  JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as {
    version: string;
  }
).version;

export {
  createTreeSitterReferenceExtractor,
  createTreeSitterSymbolExtractor,
  TREE_SITTER_LANGUAGES,
} from "./extractor.js";

const pool = createTreeSitterWorkerPool();

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
    symbolExtractorV2: createTreeSitterSymbolExtractor(pool),
    referenceExtractor: createTreeSitterReferenceExtractor(pool),
  },
} satisfies KibiPluginV1;

export default kibiPlugin;
