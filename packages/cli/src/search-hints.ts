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
  isClosedRequirement,
} from "./intent-search.js";
import {
  type NegativePathFacts,
  type NegativePathMarker,
  negativePathMarker,
  negativePathTitle,
  queryNegativePathFacts,
} from "./negative-path-facts.js";
import {
  type SearchHintsDiagnostic,
  composeSearchHints,
} from "./plugins/compose-search-hints.js";
import type { CapabilityModeResolution } from "./plugins/registry.js";
import { isProvenanceStub } from "./provenance-stub.js";
import type { PrologPort } from "./public/operations/runtime-types.js";
import {
  LIFT_RELATIONSHIPS,
  assumedScenarioIds,
  liftAssumedFact,
  liftTestTargets,
  owningRequirements,
  queryTypedEdges,
  resolveSupersedesTarget,
} from "./requirement-lifting.js";
import { loadMarkdownBodySync } from "./search-ranking.js";
import { tokenSourceHash } from "./search-token-cache.js";

/**
 * Below this top score a lexical answer is weak enough to show hints. On
 * Kibi's own KB, 17 of 18 reworded questions the ranker got wrong scored
 * below it, against 6 of 30 gold questions it got right. Host-owned, so no
 * provider can move it.
 */
export const SEARCH_HINT_WEAK_SCORE = 0.44;
/** Requirements shown as hints. */
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

export type SearchHintsTrigger = "abstained" | "weak";

export type SearchHintItem = Readonly<{
  id: string;
  title: string;
  score: number;
  /** The entity the provider matched, when the hint is its requirement. */
  via?: string;
  /**
   * Set when the hint is a negative-path fact no current requirement could
   * be shown for; its title carries the "Forbidden: " prefix.
   */
  negativePath?: NegativePathMarker;
}>;

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
export function searchHintsTrigger(
  analysis: IntentSearchAnalysis,
): SearchHintsTrigger | null {
  if (analysis.abstained || analysis.topScore === null) return "abstained";
  return analysis.topScore < SEARCH_HINT_WEAK_SCORE ? "weak" : null;
}

function isCurrent(
  entity: Record<string, unknown>,
  supersededIds: ReadonlySet<string> = new Set(),
): boolean {
  const id = String(entity.id ?? "");
  const status = String(entity.status).trim().toLowerCase();
  return (
    !NON_GOVERNING_STATUSES.has(status) &&
    !supersededIds.has(id) &&
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
export function searchHintsEntities(
  entities: readonly Record<string, unknown>[],
  bodies: MarkdownBodyCache,
  workspaceRoot: string,
  supersededIds: ReadonlySet<string> = new Set(),
): SearchHintsEntity[] {
  const seen = new Set<string>();
  const rows: SearchHintsEntity[] = [];
  for (const entity of entities) {
    const id = String(entity.id ?? "");
    if (id === "" || seen.has(id) || !isCurrent(entity, supersededIds))
      continue;
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
 * A hint on a scenario, test, symbol or fact is shown as the governing
 * requirement it belongs to (including 2-hop test -> scenario -> requirement,
 * 2-hop fact <- assumes <- scenario <- specified_by <- requirement, and up to
 * 3-hop supersedes chains, excluding relates_to), so the agent re-asks about
 * what governs; a current ADR or an entity no current requirement links to is
 * shown as itself. A negative-path fact with no current governing requirement
 * is shown as itself marked as a situation that must not happen.
 *
 * The shown entities are ordered by the summed score of every provider hit
 * that led to them, so a requirement several hits agree on comes before one
 * that a single hit shares with others, and one hit linked to many
 * requirements cannot fill the list alone. Each carries the score and `via`
 * of its best hit.
 */
async function liftToRequirements(
  prolog: Pick<PrologPort, "query">,
  hints: readonly { readonly id: string; readonly score: number }[],
  byId: ReadonlyMap<string, SearchHintsEntity>,
  initialSupersededBy: ReadonlyMap<string, string> = new Map(),
  supersededCandidateIds: ReadonlySet<string> = new Set(),
): Promise<SearchHintItem[]> {
  const isRequirement = (id: string) => byId.get(id)?.type === "req";
  const isLiftSeed = (id: string) => {
    const type = byId.get(id)?.type ?? "";
    return type !== "req" && type !== "adr";
  };
  const seeds = new Set(hints.map((hint) => hint.id).filter(isLiftSeed));
  const negativePath: NegativePathFacts = await queryNegativePathFacts(
    prolog,
    [...seeds].filter(
      (id) => (byId.get(id) as SearchHintsEntity).type === "fact",
    ),
  );
  const requirementsOf = new Map<string, Set<string>>();
  if (seeds.size > 0) {
    const hop1Edges = await queryTypedEdges(prolog, LIFT_RELATIONSHIPS, [
      ...seeds,
    ]);
    const rawOwnersOf = new Map<string, Set<string>>();
    const addRawOwner = (seed: string, owner: string) => {
      if (owner.length === 0) return;
      rawOwnersOf.set(seed, (rawOwnersOf.get(seed) ?? new Set()).add(owner));
    };
    const testTargets: { id: string; targets: string[] }[] = [];
    const assumedFacts: { id: string; scenarios: string[] }[] = [];
    for (const seed of seeds) {
      const type = byId.get(seed)?.type ?? "";
      const direct = owningRequirements(seed, type, hop1Edges);
      if (type === "test") {
        testTargets.push({ id: seed, targets: direct });
        continue;
      }
      for (const owner of direct) addRawOwner(seed, owner);
      if (type === "fact" && direct.length === 0) {
        const scenarios = assumedScenarioIds(seed, hop1Edges);
        if (scenarios.length > 0) {
          assumedFacts.push({ id: seed, scenarios });
          continue;
        }
        for (const guard of negativePath.get(seed) ?? [])
          addRawOwner(seed, guard);
      }
    }

    const targetIds = [
      ...new Set([
        ...testTargets.flatMap((test) => test.targets),
        ...assumedFacts.flatMap((fact) => fact.scenarios),
      ]),
    ];
    const unfetchedTargets = targetIds.filter((id) => !seeds.has(id));
    const hop2Edges =
      unfetchedTargets.length > 0
        ? await queryTypedEdges(
            prolog,
            ["specified_by", "supersedes"],
            unfetchedTargets,
          )
        : [];
    const allEdges = [...hop1Edges, ...hop2Edges];

    for (const test of testTargets) {
      for (const lifted of liftTestTargets(test.id, test.targets, allEdges)) {
        addRawOwner(test.id, lifted.owner);
      }
    }
    for (const fact of assumedFacts) {
      const lifted = liftAssumedFact(fact.id, fact.scenarios, allEdges);
      if (lifted.length > 0) {
        for (const { owner } of lifted) addRawOwner(fact.id, owner);
      } else {
        for (const guard of negativePath.get(fact.id) ?? [])
          addRawOwner(fact.id, guard);
      }
    }

    const supersededBy = new Map<string, string>(initialSupersededBy);
    for (const edge of allEdges) {
      if (edge.rel === "supersedes") supersededBy.set(edge.to, edge.from);
    }

    const queriedSupersedes = new Set<string>([
      ...seeds,
      ...unfetchedTargets,
      ...initialSupersededBy.keys(),
    ]);
    let frontier = [
      ...new Set([...rawOwnersOf.values()].flatMap((owners) => [...owners])),
    ]
      .map((id) => resolveSupersedesTarget(id, supersededBy, 3) ?? id)
      .filter(
        (id) =>
          !isRequirement(id) &&
          supersededCandidateIds.has(id) &&
          !queriedSupersedes.has(id),
      );
    for (let hop = 0; hop < 3 && frontier.length > 0; hop += 1) {
      for (const id of frontier) queriedSupersedes.add(id);
      const edges = await queryTypedEdges(prolog, ["supersedes"], frontier);
      for (const edge of edges) {
        if (edge.rel === "supersedes") supersededBy.set(edge.to, edge.from);
      }
      const next: string[] = [];
      for (const id of frontier) {
        const replacement = supersededBy.get(id);
        if (
          replacement !== undefined &&
          !isRequirement(replacement) &&
          supersededCandidateIds.has(replacement) &&
          !queriedSupersedes.has(replacement)
        ) {
          next.push(replacement);
        }
      }
      frontier = [...new Set(next)];
    }

    for (const [seed, rawOwners] of rawOwnersOf) {
      const resolvedOwners = new Set<string>();
      for (const rawOwner of rawOwners) {
        const resolved = resolveSupersedesTarget(rawOwner, supersededBy, 3);
        if (resolved !== null && isRequirement(resolved)) {
          resolvedOwners.add(resolved);
        }
      }
      if (resolvedOwners.size > 0) requirementsOf.set(seed, resolvedOwners);
    }
  }
  // Hits arrive best first, so a requirement's first hit is its best one.
  const support = new Map<
    string,
    { hint: (typeof hints)[number]; total: number }
  >();
  for (const hint of hints) {
    const linked = requirementsOf.get(hint.id);
    for (const target of linked ? [...linked].sort() : [hint.id]) {
      const entry = support.get(target);
      if (entry === undefined) support.set(target, { hint, total: hint.score });
      else entry.total += hint.score;
    }
  }
  // The sort is stable: equal totals keep the order of their best hits.
  return [...support]
    .sort(([, left], [, right]) => right.total - left.total)
    .map(([target, { hint }]) => {
      const title = (byId.get(target) as SearchHintsEntity).title;
      // Only seeds are asked about, and a lifted target is a requirement.
      const guards = negativePath.get(target);
      return {
        id: target,
        title: guards !== undefined ? negativePathTitle(title) : title,
        score: hint.score,
        ...(target !== hint.id ? { via: hint.id } : {}),
        ...(guards !== undefined
          ? { negativePath: negativePathMarker(guards) }
          : {}),
      };
    });
}

/**
 * Ask the configured kibi.search-hints.v1 provider which current entities a
 * weakly answered question is probably about. Returns undefined when the
 * answer is strong or no provider is configured. Hints never change the
 * ranked results, the governing answer or abstention.
 */
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
  const closedReqIds = options.entities
    .filter((entity) => isClosedRequirement(entity))
    .map((entity) => String(entity.id ?? ""))
    .filter((id) => id.length > 0);
  const supersededIds = new Set<string>();
  const initialSupersededBy = new Map<string, string>();
  if (closedReqIds.length > 0) {
    for (const edge of await queryTypedEdges(
      options.prolog,
      ["supersedes"],
      closedReqIds,
    )) {
      if (edge.rel === "supersedes") {
        supersededIds.add(edge.to);
        initialSupersededBy.set(edge.to, edge.from);
      }
    }
  }
  const entities = searchHintsEntities(
    options.entities,
    options.bodies,
    options.workspaceRoot,
    supersededIds,
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
  const supersededCandidateIds = new Set(
    options.entities
      .filter((entity) => entity.type === "req")
      .map((entity) => String(entity.id ?? ""))
      .filter((id) => id.length > 0 && !byId.has(id)),
  );
  const answered = new Set(options.governingIds.slice(0, 3));
  const items = (
    await liftToRequirements(
      options.prolog,
      composed.hints,
      byId,
      initialSupersededBy,
      supersededCandidateIds,
    )
  )
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
