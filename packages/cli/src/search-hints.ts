import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

import type {
  PluginProviderStamp,
  SearchHintsEntity,
  SearchHintsV1,
} from "kibi-plugin-sdk";

import { runtimeDirectory } from "./engine.js";
import {
  type IntentSearchAnalysis,
  type MarkdownBodyCache,
  NON_GOVERNING_STATUSES,
  queryGraphEdges,
} from "./intent-search.js";
import {
  type SearchHintsDiagnostic,
  composeSearchHints,
} from "./plugins/compose-search-hints.js";
import type { CapabilityModeResolution } from "./plugins/registry.js";
import { isProvenanceStub } from "./provenance-stub.js";
import type { PrologPort } from "./public/operations/runtime-types.js";
import { loadMarkdownBodySync } from "./search-ranking.js";
import { tokenSourceHash } from "./search-token-cache.js";

/**
 * Below this top score a lexical answer is weak enough to show hints. On
 * Kibi's own KB, 17 of 18 reworded questions the ranker got wrong scored
 * below it, against 6 of 30 gold questions it got right. Host-owned, so no
 * provider can move it.
 */
// implements REQ-kibi-search-hints-host
export const SEARCH_HINT_WEAK_SCORE = 0.44;
/** Requirements shown as hints. */
// implements REQ-kibi-search-hints-host
export const SEARCH_HINT_LIMIT = 10;
/** Entities asked of the provider before they are lifted to requirements. */
const PROVIDER_LIMIT = 20;
/** Text a provider sees per entity: title, statement, then body. */
const ENTITY_TEXT_CHARS = 2000;
/** A provider's first call in a process may build its index. */
const FIRST_CALL_TIMEOUT_MS = 3000;
const WARM_CALL_TIMEOUT_MS = 500;
/** Providers that answered once in this process; later calls get less time. */
const warmedProviders = new WeakSet<object>();

// implements REQ-kibi-search-hints-host
export type SearchHintsTrigger = "abstained" | "weak";

// implements REQ-kibi-search-hints-host
export type SearchHintItem = Readonly<{
  id: string;
  title: string;
  score: number;
  /** The entity the provider matched, when the hint is its requirement. */
  via?: string;
}>;

// implements REQ-kibi-search-hints-host
export type SearchHintsAnalysis = Readonly<{
  trigger: SearchHintsTrigger;
  provider: PluginProviderStamp | null;
  items: readonly SearchHintItem[];
  shadow?: readonly {
    readonly provider: PluginProviderStamp;
    readonly items: readonly { readonly id: string; readonly score: number }[];
  }[];
  diagnostics?: readonly SearchHintsDiagnostic[];
}>;

/** Why a lexical answer needs hints, or null when it is strong enough. */
// implements REQ-kibi-search-hints-host
export function searchHintsTrigger(
  analysis: IntentSearchAnalysis,
): SearchHintsTrigger | null {
  if (analysis.abstained || analysis.topScore === null) return "abstained";
  return analysis.topScore < SEARCH_HINT_WEAK_SCORE ? "weak" : null;
}

function isCurrent(entity: Record<string, unknown>): boolean {
  const status = String(entity.status).trim().toLowerCase();
  return (
    !NON_GOVERNING_STATUSES.has(status) &&
    status !== "closed" &&
    !isProvenanceStub(entity)
  );
}

function entityBody(
  entity: Record<string, unknown>,
  bodies: MarkdownBodyCache,
  workspaceRoot: string,
): string {
  // The ranking may not have read every body; read the rest so an entity's
  // text, and so its cached vector, never depends on the query.
  const source = entity.source;
  if (typeof source !== "string") return "";
  if (!bodies.has(source))
    bodies.set(source, loadMarkdownBodySync(source, workspaceRoot));
  return bodies.get(source) as string;
}

function entityText(
  entity: Record<string, unknown>,
  bodies: MarkdownBodyCache,
  workspaceRoot: string,
): string {
  return [
    entity.title,
    entity.semantic_text,
    entityBody(entity, bodies, workspaceRoot),
  ]
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join("\n")
    .slice(0, ENTITY_TEXT_CHARS);
}

/** The current entities a provider may hint at, as the search loaded them. */
// implements REQ-kibi-search-hints-host
export function searchHintsEntities(
  entities: readonly Record<string, unknown>[],
  bodies: MarkdownBodyCache,
  workspaceRoot: string,
): SearchHintsEntity[] {
  const seen = new Set<string>();
  const rows: SearchHintsEntity[] = [];
  for (const entity of entities) {
    const id = String(entity.id ?? "");
    if (id === "" || seen.has(id) || !isCurrent(entity)) continue;
    seen.add(id);
    const text = entityText(entity, bodies, workspaceRoot);
    rows.push({
      id,
      type: String(entity.type ?? ""),
      title: String(entity.title ?? ""),
      text,
      hash: tokenSourceHash([text]),
    });
  }
  return rows;
}

function cacheDirectory(workspaceRoot: string): string {
  const workspace = createHash("sha256")
    .update(path.resolve(workspaceRoot))
    .digest("hex")
    .slice(0, 24);
  const directory = path.join(runtimeDirectory(), `search-hints-${workspace}`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

/**
 * A hint on a scenario, test, fact or ADR is shown as the current
 * requirement it belongs to, so the agent re-asks about what governs; an
 * entity no current requirement links to is shown as itself.
 */
async function liftToRequirements(
  prolog: Pick<PrologPort, "query">,
  hints: readonly { readonly id: string; readonly score: number }[],
  byId: ReadonlyMap<string, SearchHintsEntity>,
): Promise<SearchHintItem[]> {
  const isRequirement = (id: string) => byId.get(id)?.type === "req";
  const seeds = new Set(
    hints.map((hint) => hint.id).filter((id) => !isRequirement(id)),
  );
  const requirementsOf = new Map<string, Set<string>>();
  for (const edge of await queryGraphEdges(prolog, [...seeds]))
    for (const [seed, other] of [
      [edge.from, edge.to],
      [edge.to, edge.from],
    ] as const)
      if (seeds.has(seed) && isRequirement(other))
        requirementsOf.set(
          seed,
          (requirementsOf.get(seed) ?? new Set()).add(other),
        );
  const items: SearchHintItem[] = [];
  const shown = new Set<string>();
  for (const hint of hints) {
    const linked = requirementsOf.get(hint.id);
    for (const target of linked ? [...linked].sort() : [hint.id]) {
      if (shown.has(target)) continue;
      shown.add(target);
      items.push({
        id: target,
        title: (byId.get(target) as SearchHintsEntity).title,
        score: hint.score,
        ...(target !== hint.id ? { via: hint.id } : {}),
      });
    }
  }
  return items;
}

/**
 * Ask the configured kibi.search-hints.v1 provider which current entities a
 * weakly answered question is probably about. Returns undefined when the
 * answer is strong or no provider is configured. Hints never change the
 * ranked results, the governing answer or abstention.
 */
// implements REQ-kibi-search-hints-host
export async function buildSearchHints(
  options: Readonly<{
    query: string;
    analysis: IntentSearchAnalysis;
    entities: readonly Record<string, unknown>[];
    bodies: MarkdownBodyCache;
    governingIds: readonly string[];
    resolution: CapabilityModeResolution<SearchHintsV1>;
    prolog: Pick<PrologPort, "query">;
    workspaceRoot: string;
  }>,
): Promise<SearchHintsAnalysis | undefined> {
  const trigger = searchHintsTrigger(options.analysis);
  if (trigger === null) return undefined;
  const { resolution } = options;
  if (resolution.replace === null && resolution.shadow.length === 0)
    return undefined;
  const entities = searchHintsEntities(
    options.entities,
    options.bodies,
    options.workspaceRoot,
  );
  if (entities.length === 0) return undefined;
  const composed = await composeSearchHints(
    resolution,
    {
      query: options.query,
      limit: PROVIDER_LIMIT,
      entities,
      cacheDirectory: cacheDirectory(options.workspaceRoot),
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
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const answered = new Set(options.governingIds.slice(0, 3));
  const items = (await liftToRequirements(options.prolog, composed.hints, byId))
    .filter((item) => !answered.has(item.id))
    .slice(0, SEARCH_HINT_LIMIT);
  const shadow = composed.shadowComparisons.map((comparison) => ({
    provider: comparison.stamp,
    items: comparison.hints,
  }));
  return {
    trigger,
    provider: composed.stamp,
    items,
    ...(shadow.length > 0 ? { shadow } : {}),
    ...(composed.diagnostics.length > 0
      ? { diagnostics: composed.diagnostics }
      : {}),
  };
}

/** The sentence a search answer's text adds when hints are shown. */
// implements REQ-kibi-search-hints-host
export function searchHintsNote(
  hints: SearchHintsAnalysis | undefined,
): string {
  if (hints === undefined || hints.items.length === 0) return "";
  const named = hints.items
    .slice(0, 5)
    .map((item) => `${item.title} (${item.id})`)
    .join("; ");
  return ` The lexical answer is weak; by meaning the KB may describe this as: ${named}. Re-ask in those words or pass them as semanticFacets.aliases, then read the governing requirement with kb_query. Hints are suggestions, not governing requirements.`;
}
