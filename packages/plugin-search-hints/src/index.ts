import { createRequire } from "node:module";

import {
  KIBI_PLUGIN_API_VERSION,
  type SearchHint,
  type SearchHintsInput,
  type SearchHintsResult,
  type SearchHintsV1,
  defineKibiPlugin,
} from "kibi-plugin-sdk";

import { VectorCache } from "./cache.js";
import { MODEL_LABEL, type StaticModel, loadStaticModel } from "./model.js";

export { VectorCache } from "./cache.js";
export {
  MODEL_ID,
  MODEL_LABEL,
  MODEL_REVISION,
  loadStaticModel,
} from "./model.js";
export type { StaticModel } from "./model.js";
export { WordPieceTokenizer, normalize, preTokenize } from "./tokenizer.js";

const packageJson = createRequire(import.meta.url)("../package.json") as {
  version: string;
};

let model: StaticModel | undefined;
const caches = new Map<string, VectorCache>();
/** kibi.search-hints.v1 caps a request at 20 hints. */
const MAX_LIMIT = 20;

function dot(left: Float32Array, right: Float32Array): number {
  return left.reduce(
    (sum, value, index) => sum + value * (right[index] as number),
    0,
  );
}

/**
 * Rank the supplied entities by cosine similarity to the query. Scores are
 * cosine clamped to [0, 1]; ties are ordered by id, so the same input always
 * gives the same hints.
 */
// implements REQ-kibi-plugin-search-hints
export function rankByMeaning(
  staticModel: StaticModel,
  cache: VectorCache,
  input: SearchHintsInput,
): SearchHint[] {
  const vectors = cache.vectorsFor(input.entities, (text) =>
    staticModel.encode(text),
  );
  cache.retain(input.entities);
  cache.save();
  const query = staticModel.encode(input.query);
  const limit = Math.max(0, Math.min(input.limit, MAX_LIMIT));
  return input.entities
    .map((entity, index) => ({
      id: entity.id,
      score: Math.min(
        1,
        Math.max(0, dot(query, vectors[index] as Float32Array)),
      ),
    }))
    .filter((hint) => hint.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        // rationale: the host sends each id once, so ids never tie and < and
        // <= order alike.
        // Stryker disable next-line EqualityOperator
        (left.id < right.id ? -1 : 1),
    )
    .slice(0, limit);
}

// implements REQ-kibi-plugin-search-hints
export function createSearchHints(): SearchHintsV1 {
  return {
    id: "kibi-plugin-search-hints.potion-base-8M",
    model: MODEL_LABEL,
    hint(input: SearchHintsInput): SearchHintsResult {
      // The table loads on the first hint, not when the plugin is resolved.
      model ??= loadStaticModel();
      const staticModel = model;
      let cache = caches.get(input.cacheDirectory);
      if (cache === undefined) {
        cache = VectorCache.open(
          input.cacheDirectory,
          staticModel.id,
          staticModel.dims,
        );
        caches.set(input.cacheDirectory, cache);
      }
      return { hints: rankByMeaning(staticModel, cache, input) };
    },
  };
}

/**
 * Offline meaning-based hints for weak kb_search answers, from the bundled
 * potion-base-8M static embedding. No network, no native code.
 */
// implements REQ-kibi-plugin-search-hints
export const kibiPlugin = defineKibiPlugin({
  apiVersion: KIBI_PLUGIN_API_VERSION,
  id: "kibi-plugin-search-hints",
  version: packageJson.version,
  permissions: { network: false, metered: false, secrets: [] },
  capabilities: { searchHints: createSearchHints() },
});

export default kibiPlugin;
