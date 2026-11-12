import { createRequire } from "node:module";
import { KIBI_PLUGIN_API_VERSION, defineKibiPlugin } from "kibi-plugin-sdk";
import { createJevSemanticClassifier } from "./semantic-classifier.js";
import type { JevSemanticClassifierOptions } from "./semantic-classifier.js";
import { createJevVocabularyAlignment } from "./vocabulary-alignment.js";

const packageJson = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

export {
  createJevSemanticClassifier,
  JEV_DEFAULT_MODEL,
  JEV_MAX_TIMEOUT_MS,
  resolveJevModel,
  resolveJevTimeoutMs,
  type JevSemanticClassifierOptions,
} from "./semantic-classifier.js";
export {
  createJevVocabularyAlignment,
  JEV_SUBJECT_TOP_K,
  type JevVocabularyAlignmentOptions,
} from "./vocabulary-alignment.js";
export { createTypeSafeJevClient } from "./typesafe-client.js";
export {
  JevProviderError,
  mapJevError,
  type JevClient,
  type JevClientFactory,
} from "./jev-client.js";

/**
 * Named plugin export required by the Kibi host loader.
 * Importing this module must not create a TypeSafe client or make network calls.
 */
export const kibiPlugin = defineKibiPlugin({
  apiVersion: KIBI_PLUGIN_API_VERSION,
  id: "kibi-plugin-jev",
  version: packageJson.version,
  permissions: {
    network: true,
    metered: true,
    secrets: ["TYPESAFE_API_KEY"],
  },
  capabilities: {
    semanticClassifier: createJevSemanticClassifier(),
    vocabularyAlignment: createJevVocabularyAlignment(),
  },
});

export function createJevPlugin(options: JevSemanticClassifierOptions = {}) {
  return defineKibiPlugin({
    ...kibiPlugin,
    capabilities: {
      semanticClassifier: createJevSemanticClassifier(options),
      vocabularyAlignment: createJevVocabularyAlignment(options),
    },
  });
}

export default kibiPlugin;
