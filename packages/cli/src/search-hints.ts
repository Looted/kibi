import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

import {
  type PluginProviderStamp,
  SEARCH_HINTS_MAX_LIMIT,
  type SearchHintsEntity,
  type SearchHintsV1,
} from "kibi-plugin-sdk";

import type { MeaningItem, MeaningScores } from "./decision-search.js";
import { runtimeDirectory } from "./engine.js";
import {
  type SearchHintsDiagnostic,
  composeSearchHints,
} from "./plugins/compose-search-hints.js";
import type { CapabilityModeResolution } from "./plugins/registry.js";

/**
 * The meaning ranking of kb_search. A kibi.search-hints.v1 provider scores
 * every decision and every scenario, test and fact a decision links by
 * similarity to the question; decision search fuses those scores with the
 * word ranking and lists the closest decisions that are not already a card.
 * Without a provider, or when it fails, search ranks by words alone.
 */

/** A provider's first call in a process may build its vectors. */
const FIRST_CALL_TIMEOUT_MS = 3000;
const WARM_CALL_TIMEOUT_MS = 500;
/** Providers that answered once in this process; later calls get less time. */
const warmedProviders = new WeakSet<object>();

export type SearchHintsAnalysis = Readonly<{
  provider: PluginProviderStamp | null;
  /** Decisions related by meaning that are not already a card. */
  items: readonly MeaningItem[];
  shadow?: readonly {
    readonly provider: PluginProviderStamp;
    readonly items: readonly { readonly id: string; readonly score: number }[];
  }[];
  diagnostics?: readonly SearchHintsDiagnostic[];
}>;

function cacheDirectory(workspaceRoot: string): string {
  const workspace = createHash("sha256")
    .update(path.resolve(workspaceRoot))
    .digest("hex")
    .slice(0, 24);
  const directory = path.join(runtimeDirectory(), `search-hints-${workspace}`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

/** What one search's meaning ranking reported, for queryAnalysis.hints. */
export type MeaningReport = Readonly<{
  provider: PluginProviderStamp | null;
  shadow: NonNullable<SearchHintsAnalysis["shadow"]>;
  diagnostics: readonly SearchHintsDiagnostic[];
}>;

/**
 * A meaning ranker over the configured provider. `report()` gives what the
 * last call returned besides the scores: the provider's stamp, shadow
 * comparisons and diagnostics.
 */
export function providerMeaningRanker(
  resolution: CapabilityModeResolution<SearchHintsV1>,
  workspaceRoot: string,
): {
  rank: (
    query: string,
    entities: readonly SearchHintsEntity[],
  ) => Promise<MeaningScores | undefined>;
  report: () => MeaningReport | undefined;
} {
  let report: MeaningReport | undefined;
  return {
    report: () => report,
    async rank(query, all) {
      if (resolution.replace === null && resolution.shadow.length === 0)
        return undefined;
      const entities = all.slice(0, SEARCH_HINTS_MAX_LIMIT);
      const composed = await composeSearchHints(
        resolution,
        {
          query,
          limit: entities.length,
          entities,
          cacheDirectory: cacheDirectory(workspaceRoot),
        },
        {
          operationName: "kb_search",
          timeoutMs: (binding) =>
            warmedProviders.has(binding.capability)
              ? WARM_CALL_TIMEOUT_MS
              : FIRST_CALL_TIMEOUT_MS,
        },
      );
      for (const binding of [resolution.replace, ...resolution.shadow])
        if (binding) warmedProviders.add(binding.capability);
      report = {
        provider: composed.stamp,
        shadow: composed.shadowComparisons.map((comparison) => ({
          provider: comparison.stamp,
          items: comparison.hints.slice(0, 10),
        })),
        diagnostics: composed.diagnostics,
      };
      if (composed.stamp === null || composed.fallbackUsed) return undefined;
      return new Map(composed.hints.map((hint) => [hint.id, hint.score]));
    },
  };
}

/** queryAnalysis.hints for a search: the meaning list and its provider. */
export function searchHintsAnalysis(
  items: readonly MeaningItem[],
  report: MeaningReport | undefined,
): SearchHintsAnalysis | undefined {
  if (report === undefined) return undefined;
  return {
    provider: report.provider,
    items,
    ...(report.shadow.length > 0 ? { shadow: report.shadow } : {}),
    ...(report.diagnostics.length > 0
      ? { diagnostics: report.diagnostics }
      : {}),
  };
}

/** The sentence a search answer's text adds for the meaning list. */
export function searchHintsNote(
  hints: SearchHintsAnalysis | undefined,
): string {
  if (hints === undefined || hints.items.length === 0) return "";
  return ` Related by meaning: ${hints.items.map((item) => item.id).join(", ")}.`;
}
