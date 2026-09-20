import { KIBI_PLUGIN_API_VERSION, defineKibiPlugin } from "kibi-plugin-sdk";
import { createJevSemanticClassifier } from "./semantic-classifier.js";
import type { JevSemanticClassifierOptions } from "./semantic-classifier.js";

// implements REQ-capability-plugin-jev-fallback-v1
export {
  createJevSemanticClassifier,
  type JevSemanticClassifierOptions,
} from "./semantic-classifier.js";
// implements REQ-capability-plugin-jev-fallback-v1
export {
  createTypeSafeJevClient,
} from "./typesafe-client.js";
// implements REQ-capability-plugin-jev-fallback-v1
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
// implements REQ-capability-plugin-jev-fallback-v1
export const kibiPlugin = defineKibiPlugin({
  apiVersion: KIBI_PLUGIN_API_VERSION,
  id: "kibi-plugin-jev",
  version: "0.1.0",
  permissions: {
    network: true,
    metered: true,
    secrets: ["TYPESAFE_API_KEY"],
  },
  capabilities: {
    semanticClassifier: createJevSemanticClassifier(),
  },
});

// implements REQ-capability-plugin-jev-fallback-v1
export function createJevPlugin(options: JevSemanticClassifierOptions = {}) {
  return defineKibiPlugin({
    ...kibiPlugin,
    capabilities: {
      semanticClassifier: createJevSemanticClassifier(options),
    },
  });
}

// implements REQ-capability-plugin-jev-fallback-v1
export default kibiPlugin;
