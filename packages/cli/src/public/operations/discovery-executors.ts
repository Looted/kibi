import { readFile } from "node:fs/promises";
import path from "node:path";
import { SESSION_BRIEF } from "kibi-agent-core/session-brief";
import {
  compilerFingerprintReason,
  sourceExtractionFailureReasons,
} from "../../commands/sync/cache.js";
import { effectiveFirmness } from "../../decision-firmness.js";
import { EngineClient } from "../../engine.js";
import {
  type IntentSearchAnalysis,
  type IntentSearchFacets,
  type IntentSearchMatch,
  type MarkdownBodyCache,
  type SourceLocation,
  executeIntentSearch,
  isBroadRationaleQuery,
  questionPaths,
  validateIntentSearchInput,
} from "../../intent-search.js";
import type { NegativePathMarker } from "../../negative-path-facts.js";
import { classifyActivation } from "../../operations/bootstrap/activation.js";
import { SwiplResolutionError } from "../../prolog/swipl-resolver.js";
import {
  type SearchAnswer,
  answerQuotedIds,
  buildSearchAnswer,
  governingLabel,
} from "../../search-answer.js";
import {
  type SearchHintsAnalysis,
  buildSearchHints,
  searchHintsNote,
  searchHintsTrigger,
} from "../../search-hints.js";
import { rankEntities } from "../../search-ranking.js";
import type { SearchMatch } from "../../search-ranking.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import {
  BRANCH_STORE_NOT_COMPILED,
  type BranchStoreInspection,
  branchStoreReason,
  inspectBranchStore,
  storeLockJournalReason,
  storeLockTakeoverReason,
  storeRepairReason,
  uncompiledBranchStoreReason,
} from "../../utils/branch-store.js";
import {
  confirmSourceNewerReasons,
  missingCachedKbSourceReasons,
  readSyncCacheRecord,
  staleStoreWarningNote,
} from "../../utils/content-freshness.js";
import { KB_ROOT } from "../../utils/kb-paths.js";
import {
  loadEntities,
  loadSearchCandidates,
  paginateResults,
  queryEntitiesViaQuery,
  reloadFullEntities,
  validateEntityType,
} from "./discovery-entities.js";
import { readAuthoredEntity } from "./entity-context.js";
import {
  type MigrationConfigStatus,
  type MigrationPlan,
  buildActionsFromStatus,
  readMigrationConfigStatus,
} from "./migration-plan.js";
import {
  OperationJsonDecodeError,
  runOperationJsonQuery,
  toPrologAtom,
} from "./prolog-json.js";
import type {
  CapabilityRegistry,
  OperationContext,
  PrologPort,
} from "./runtime-types.js";
import {
  type SubjectDomain,
  definitionQuote,
  readSubjectDomain,
} from "./subject-domain.js";
import type { OperationResult } from "./types.js";
import { readWorkspaceSnapshot } from "./workspace-snapshot.js";

export type QueryInput = {
  readonly type?: string;
  readonly id?: string;
  readonly tags?: readonly string[];
  readonly sourceFile?: string;
  readonly limit?: number;
  readonly offset?: number;
  /** Typed fact filters (fact entities only); see `FACT_KINDS`. */
  readonly factKind?: string;
  readonly predicate?: string;
  readonly namespace?: string;
  readonly where?: Readonly<Record<string, string>>;
  readonly args?: readonly (string | null)[];
  readonly polarity?: "assert" | "deny";
  readonly scope?: "all" | "current_requirements";
  readonly distinct?: string;
  readonly subjectKey?: string;
  readonly propertyKey?: string;
  /** With `id`: also return the entity's authored Markdown body. */
  readonly includeBody?: boolean;
  /**
   * summary (default without `id`): each listed entity's identifying fields;
   * full: every field. A lookup by `id` always returns the full entity.
   */
  readonly fields?: "summary" | "full";
};

/** A ready-to-run follow-up call the query suggests. */
export type QueryNextCall = Readonly<{ call: string; why: string }>;

/**
 * Typed-fact view of a kb_query answer: which predicate, property or fact
 * kind was asked, the schema that names its arguments, distinct value counts,
 * the values that do exist when nothing matched, warnings about the question
 * itself and the follow-up calls that make sense next.
 */
export type FactQueryPayload = Readonly<{
  mode: "predicate" | "property" | "schemas" | "fact_kind" | "subject";
  predicate?: Record<string, unknown>;
  property?: Record<string, unknown>;
  factKind?: string;
  schema?: Record<string, unknown> | null;
  subjectFacts?: readonly string[];
  /** mode subject: the subject's definition and everything that governs it. */
  domain?: SubjectDomain;
  distinct?: Record<string, unknown> | null;
  suggestions?: Record<string, unknown> | null;
  warnings: readonly string[];
  next: readonly QueryNextCall[];
}>;

export type QueryPayload = {
  readonly entities: readonly Record<string, unknown>[];
  readonly count: number;
  readonly factQuery?: FactQueryPayload;
  /** Present when an empty answer came from a store never compiled for this branch. */
  readonly branchStore?: SearchBranchStoreNotice;
  /** Present when the queried compiled branch store is confirmed stale. */
  readonly meta?: Readonly<Record<string, unknown>>;
  /** Present when `includeBody` was requested for an `id`. */
  readonly body?: QueryBody;
};

/**
 * The authored Markdown body of the entity a kb_query `id` names: the text
 * after its front matter, which kb_upsert `document.body` replaces. `text` is
 * null when the entity has no readable authored document (a symbol, or a
 * source that is not a workspace Markdown file).
 */
export type QueryBody = Readonly<{
  id: string;
  path: string | null;
  text: string | null;
  truncated?: boolean;
}>;

/** Bodies longer than this are cut; the file itself stays the full record. */
export const QUERY_BODY_MAX_CHARS = 32_000;

export const FACT_KINDS = [
  "subject",
  "property_value",
  "predicate",
  "predicate_schema",
  "observation",
  "meta",
  "rule",
  "rule_schema",
] as const;

/** Which typed filters each question mode reads; any other is refused. */
const MODE_FILTERS: Record<FactQueryPayload["mode"], ReadonlySet<string>> = {
  schemas: new Set(["factKind", "predicate", "namespace"]),
  predicate: new Set([
    "predicate",
    "namespace",
    "where",
    "args",
    "polarity",
    "scope",
    "distinct",
  ]),
  property: new Set(["subjectKey", "propertyKey", "scope"]),
  fact_kind: new Set(["factKind"]),
  subject: new Set(["factKind", "subjectKey"]),
};

const TYPED_FACT_FILTERS = [
  "factKind",
  "predicate",
  "namespace",
  "where",
  "args",
  "polarity",
  "scope",
  "distinct",
  "subjectKey",
  "propertyKey",
] as const satisfies readonly (keyof QueryInput)[];

export type SearchInput = {
  readonly query: string;
  readonly type?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly rankingMode?: "legacy" | "intent-v1";
  readonly semanticFacets?: IntentSearchFacets;
  readonly sourceLocations?: readonly SourceLocation[];
  readonly minScore?: number;
  readonly fields?: "summary" | "full";
  readonly answer?: boolean;
  readonly hints?: boolean;
};

export type SearchPayload = {
  readonly results: readonly (SearchMatch | IntentSearchMatch)[];
  /** Matches in the whole ranking, before `limit` and `offset`. */
  readonly count: number;
  /** Rows in `results`: the page this call returned. */
  readonly returned: number;
  readonly truncated?: boolean;
  readonly queryAnalysis?: IntentSearchAnalysis & {
    readonly hints?: SearchHintsAnalysis;
  };
  readonly answer?: SearchAnswer;
  /**
   * What to do next, for harnesses that show only the structured result:
   * list the requirement titles after an abstained or weak search with no
   * hint shown, re-ask with sourceLocations for a file path the question
   * names, run the contradiction check for a question about conflicts.
   */
  readonly nextActions?: readonly SearchNextAction[];
  /** Sentences the text digest holds that the structured result must hold too. */
  readonly notes?: readonly string[];
  /** The Kibi branch whose store was searched, when the runtime attached one. */
  readonly branch?: string | null;
  /** Present when the searched store was never compiled for this branch. */
  readonly branchStore?: SearchBranchStoreNotice;
  /** Present when the searched compiled branch store is confirmed stale. */
  readonly meta?: Readonly<Record<string, unknown>>;
};

export type SearchNextAction = {
  readonly operation: "kb_query" | "kb_search" | "kb_check";
  readonly input: Record<string, unknown>;
  readonly reason: string;
  readonly required: false;
};

export type SearchBranchStoreNotice = {
  readonly state: "not_compiled";
  readonly code: typeof BRANCH_STORE_NOT_COMPILED;
  readonly path: string;
  readonly detail: string;
  readonly remediation: Readonly<Record<string, unknown>>;
};

/**
 * An empty result from a store that was never compiled says nothing about
 * the authored requirements, so search reports the store state itself (the
 * same reason kb_status and kb_check use) instead of a bare "no results".
 */
function uncompiledSearchNotice(
  context: OperationContext,
): SearchBranchStoreNotice | null {
  const attachment = context.branchAttachment;
  if (attachment === undefined) return null;
  const store = inspectBranchStore(context.workspaceRoot, attachment.kbBranch);
  const reason = uncompiledBranchStoreReason(
    context.workspaceRoot,
    store,
    attachment.kbBranch,
  );
  if (reason === null) return null;
  return {
    state: "not_compiled",
    code: BRANCH_STORE_NOT_COMPILED,
    path: store.path,
    detail: String(reason.detail),
    remediation: reason.remediation as Readonly<Record<string, unknown>>,
  };
}

const COMPACT_STALE_REASON_LIMIT = 10;
const COMPACT_STALE_ENTITY_LIMIT = 10;

type QueryFreshnessResult =
  | { readonly state: "fresh" }
  | {
      readonly state: "stale";
      readonly meta: Readonly<Record<string, unknown>>;
      readonly note: string;
      readonly staleReasonCount: number;
    }
  | { readonly state: "unknown" };

function compactStaleReason(
  reason: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const code = typeof reason.code === "string" ? reason.code : "stale_source";
  const reasonPath = typeof reason.path === "string" ? reason.path : undefined;
  const entityIds = Array.isArray(reason.entityIds)
    ? reason.entityIds
        .filter((id): id is string => typeof id === "string")
        .slice(0, COMPACT_STALE_ENTITY_LIMIT)
    : [];
  return {
    code,
    ...(reasonPath !== undefined ? { path: reasonPath } : {}),
    entityIds,
  };
}

function buildCompactStaleMeta(
  reasons: readonly Readonly<Record<string, unknown>>[],
): Readonly<Record<string, unknown>> {
  const compact = reasons
    .slice(0, COMPACT_STALE_REASON_LIMIT)
    .map(compactStaleReason);
  return {
    syncState: "stale",
    dirty: true,
    staleReasonCount: reasons.length,
    staleReasons: compact,
    ...(reasons.length > COMPACT_STALE_REASON_LIMIT
      ? { staleReasonsTruncated: true }
      : {}),
  };
}

function normalizeFilterPath(
  workspaceRoot: string,
  rawFilter: string,
): string | null {
  const withoutFragment = (rawFilter.split("#", 1)[0] ?? "").trim();
  if (withoutFragment === "") return null;
  const rel = path
    .relative(workspaceRoot, path.resolve(workspaceRoot, withoutFragment))
    .replaceAll(path.sep, "/")
    .replace(/^\.\//, "");
  if (rel === ".." || rel.startsWith("../")) return null;
  return rel;
}

function sourcePathsOverlap(
  workspaceRoot: string,
  rawFilter: string,
  reasonPosix: string,
): boolean {
  const rel = normalizeFilterPath(workspaceRoot, rawFilter);
  if (rel === null) return false;
  if (rel === "" || rel === ".") return true;
  return (
    rel === reasonPosix ||
    reasonPosix.startsWith(`${rel}/`) ||
    rel.startsWith(`${reasonPosix}/`)
  );
}

function isRelevantQueryStaleReason(
  reason: Readonly<Record<string, unknown>>,
  workspaceRoot: string,
  sourceFilterPaths: readonly string[],
): boolean {
  if (reason.code !== "indexed_source_newer") return true;
  if (typeof reason.path !== "string") return true;
  const posix = reason.path.replaceAll("\\", "/").replace(/^\.\//, "");
  if (posix === KB_ROOT || posix.startsWith(`${KB_ROOT}/`)) return true;
  if (sourceFilterPaths.length === 0) return false;
  return sourceFilterPaths.some((candidate) =>
    sourcePathsOverlap(workspaceRoot, candidate, posix),
  );
}

function sortReasons(
  reasons: readonly Readonly<Record<string, unknown>>[],
): Record<string, unknown>[] {
  return [...reasons].sort((left, right) =>
    String(left.path ?? "").localeCompare(String(right.path ?? "")),
  );
}

type HealthyStoreEvidence = Readonly<{
  confirmed: ReturnType<typeof confirmSourceNewerReasons>;
  compilerReason: ReturnType<typeof compilerFingerprintReason>;
  extractionReasons: ReturnType<typeof sourceExtractionFailureReasons>;
  missingShardReasons: ReturnType<typeof missingCachedKbSourceReasons>;
}>;

function collectHealthyStoreEvidence(
  workspaceRoot: string,
  storePath: string,
  prologReasons: readonly Readonly<Record<string, unknown>>[],
  includeHealthyOnlyReasons: boolean,
): HealthyStoreEvidence {
  const syncCache = readSyncCacheRecord(storePath);
  const cachedArgs =
    syncCache !== null ? ([syncCache] as const) : ([] as const);
  const depCacheArgs =
    syncCache !== null ? ([undefined, syncCache] as const) : ([] as const);
  return {
    confirmed: confirmSourceNewerReasons(
      workspaceRoot,
      storePath,
      prologReasons,
      ...cachedArgs,
    ),
    compilerReason: compilerFingerprintReason(storePath, ...depCacheArgs),
    extractionReasons: includeHealthyOnlyReasons
      ? sourceExtractionFailureReasons(
          workspaceRoot,
          storePath,
          ...depCacheArgs,
        )
      : [],
    missingShardReasons: includeHealthyOnlyReasons
      ? missingCachedKbSourceReasons(
          workspaceRoot,
          storePath,
          undefined,
          ...cachedArgs,
        )
      : [],
  };
}

async function inspectQueryFreshness(
  context: OperationContext,
  prolog: PrologPort,
  options: { readonly sourceFilterPaths: readonly string[] },
): Promise<QueryFreshnessResult> {
  const attachment = context.branchAttachment;
  if (attachment === undefined) return { state: "unknown" };
  const store = inspectBranchStore(context.workspaceRoot, attachment.kbBranch);
  if (store.state === "missing") return { state: "unknown" };
  if (store.state !== "healthy") {
    const storeReason = branchStoreReason(store);
    if (storeReason === null) return { state: "unknown" };
    return {
      state: "stale",
      meta: buildCompactStaleMeta([storeReason]),
      note: staleStoreWarningNote(1, [store.path]),
      staleReasonCount: 1,
    };
  }

  let prologReasons: Record<string, unknown>[] = [];
  let prologSyncState: string | undefined;
  let prologUnavailable = false;
  const normalizedScopePaths = [
    ...new Set(
      options.sourceFilterPaths
        .map((raw) => normalizeFilterPath(context.workspaceRoot, raw))
        .filter((rel): rel is string => rel !== null),
    ),
  ];
  const scopeAtoms = normalizedScopePaths.map(toPrologAtom).join(",");
  let statusPayload: Record<string, unknown> | undefined;
  try {
    statusPayload = await runOperationJsonQuery<Record<string, unknown>>(
      prolog,
      "status.pl",
      `status:kb_query_freshness_json([${scopeAtoms}], JsonString)`,
      "Query freshness",
      context.signal,
    );
  } catch {
    if (context.signal?.aborted) {
      prologUnavailable = true;
    } else {
      try {
        statusPayload = await runOperationJsonQuery<Record<string, unknown>>(
          prolog,
          "status.pl",
          "status:kb_status_json(JsonString)",
          "Status execution",
          context.signal,
        );
      } catch {
        prologUnavailable = true;
      }
    }
  }
  if (
    statusPayload !== undefined &&
    statusPayload !== null &&
    typeof statusPayload === "object" &&
    typeof statusPayload.syncState === "string"
  ) {
    prologSyncState = statusPayload.syncState;
    prologReasons = Array.isArray(statusPayload.staleReasons)
      ? (statusPayload.staleReasons as Record<string, unknown>[])
      : [];
  } else if (!prologUnavailable) {
    prologUnavailable = true;
  }

  // Filter to query-relevant paths before content hashing so unrequested
  // production code edits do not trigger disk reads even on the fallback path.
  const relevantPrologReasons = prologReasons.filter((reason) =>
    isRelevantQueryStaleReason(
      reason,
      context.workspaceRoot,
      options.sourceFilterPaths,
    ),
  );
  const evidence = collectHealthyStoreEvidence(
    context.workspaceRoot,
    store.path,
    relevantPrologReasons,
    true,
  );
  const allReasons = sortReasons([
    ...evidence.confirmed.kept,
    ...(evidence.compilerReason ? [evidence.compilerReason] : []),
    ...evidence.extractionReasons,
    ...evidence.missingShardReasons,
  ]);
  const relevantReasons = allReasons.filter((reason) =>
    isRelevantQueryStaleReason(
      reason,
      context.workspaceRoot,
      options.sourceFilterPaths,
    ),
  );
  if (relevantReasons.length > 0) {
    const paths = relevantReasons.flatMap((reason) =>
      typeof reason.path === "string" ? [reason.path] : [],
    );
    return {
      state: "stale",
      meta: buildCompactStaleMeta(relevantReasons),
      note: staleStoreWarningNote(relevantReasons.length, paths),
      staleReasonCount: relevantReasons.length,
    };
  }
  if (prologUnavailable || prologSyncState === "unknown") {
    return { state: "unknown" };
  }
  return { state: "fresh" };
}

export type StatusInput = Readonly<Record<string, never>>;

export type StatusPayload = {
  readonly branch: string;
  readonly snapshotId: string;
  readonly syncedAt: string | null;
  readonly dirty: boolean;
  readonly syncState: string;
  readonly kbPath?: string;
  readonly lastSyncSource?: string;
  readonly proofSnapshot?: string;
  readonly proofSnapshotAvailable?: boolean;
  readonly proofSnapshotDirty?: boolean;
  readonly proofSnapshotFileCount?: number;
  readonly proofSnapshotVersion?: string;
  readonly proofSnapshotError?: string;
  readonly staleReasons?: readonly Record<string, unknown>[];
  readonly staleReasonCount?: number;
  readonly staleReasonsTruncated?: boolean;
  /** Informational, non-blocking observations (never make the KB stale). */
  readonly notices?: readonly Record<string, unknown>[];
  readonly branchAttachment?: {
    readonly gitBranch: string;
    readonly kbBranch: string;
    readonly kind:
      | "exact"
      | "explicit_override"
      | "legacy_compat"
      | "detached_snapshot";
    readonly migrationRequired: boolean;
  };
  readonly proofSnapshotChanges?: readonly Record<string, unknown>[];
  readonly proofSnapshotChangeCount?: number;
  readonly proofSnapshotChangesTruncated?: boolean;
  readonly branchStore?: BranchStoreInspection;
  readonly engineStatus?: {
    readonly state: "healthy" | "unavailable";
    readonly errorCode?: string;
    readonly detail?: string;
    readonly recoveryRequired: boolean;
  };
  readonly schemaStatus?: MigrationConfigStatus;
  readonly migrationPlan?: MigrationPlan;
  /** The Kibi session brief (kibi-agent-core), the same on every surface. */
  readonly sessionBrief?: string;
  readonly bootstrap?: {
    readonly incompleteApplications?: readonly Readonly<
      Record<string, unknown>
    >[];
    readonly activationState: string;
    readonly activationMode: string;
    readonly planEligible: boolean;
    readonly reason: string;
    readonly nextAction?: Readonly<Record<string, unknown>>;
  };
};

function requireProlog(context: OperationContext): PrologPort {
  if (!context.prolog) {
    throw new Error("Discovery operation requires a Prolog context");
  }
  return context.prolog;
}

function isStatusPayload(value: unknown): value is StatusPayload {
  // Object() boxes a primitive and makes null and undefined an empty record.
  const record = Object.fromEntries(Object.entries(Object(value)));
  return (
    typeof record.branch === "string" &&
    typeof record.snapshotId === "string" &&
    (typeof record.syncedAt === "string" || record.syncedAt === null) &&
    typeof record.dirty === "boolean" &&
    typeof record.syncState === "string"
  );
}

function hasTypedFactFilters(input: QueryInput): boolean {
  return TYPED_FACT_FILTERS.some((key) => input[key] !== undefined);
}

function requireAtomString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function requireEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (!allowed.includes(value as T)) {
    throw new Error(`${field} must be one of: ${allowed.join(", ")}.`);
  }
  return value as T;
}

/**
 * Builds the Prolog argument spec of a predicate question. Named `where`
 * entries are resolved against the predicate's declared argument names in
 * Prolog; positional `args` use `null` as a wildcard.
 */
function predicateArgSpec(input: QueryInput): string {
  if (input.where !== undefined && input.args !== undefined) {
    throw new Error(
      "Use either where (named arguments) or args (positional), not both.",
    );
  }
  if (input.where !== undefined) {
    if (
      input.where === null ||
      typeof input.where !== "object" ||
      Array.isArray(input.where)
    ) {
      throw new Error("where must be an object of argument name to value.");
    }
    const pairs = Object.entries(input.where).map(([key, value]) => {
      const name = requireAtomString(key, "where argument name");
      const atom = requireAtomString(value, `where.${key}`);
      return `${toPrologAtom(name)}=${toPrologAtom(atom)}`;
    });
    return `where([${pairs.join(",")}])`;
  }
  if (input.args !== undefined) {
    if (!Array.isArray(input.args)) {
      throw new Error("args must be an array of constants (null = any).");
    }
    const entries = input.args.map((value, index) =>
      value === null || value === "*"
        ? "'$any'"
        : toPrologAtom(requireAtomString(value, `args[${index}]`)),
    );
    return `[${entries.join(",")}]`;
  }
  return "[]";
}

type FactQueryResponse = Readonly<{
  mode: FactQueryPayload["mode"];
  rows: readonly Record<string, unknown>[];
  count: number;
  warnings?: readonly string[];
  predicate?: Record<string, unknown>;
  property?: Record<string, unknown>;
  factKind?: string;
  schema?: Record<string, unknown> | null;
  subjectFacts?: readonly string[];
  distinct?: Record<string, unknown> | null;
  suggestions?: Record<string, unknown> | null;
}>;

function callText(args: Record<string, unknown>): string {
  return `kb_query(${JSON.stringify(args)})`;
}

/**
 * Every typed answer names the exact call that makes sense next, so an
 * agent never has to guess the follow-up from the shape of the data.
 */
function factQueryNext(
  input: QueryInput,
  response: FactQueryResponse,
): QueryNextCall[] {
  const next: QueryNextCall[] = [];
  const first = response.rows[0];
  const firstId = typeof first?.id === "string" ? first.id : undefined;
  switch (response.mode) {
    case "predicate": {
      if (firstId !== undefined) {
        next.push({
          call: callText({ id: firstId }),
          why: "full fact text and relationships of one row",
        });
      }
      // The call text is JSON, which leaves out the filters not given.
      const filters = {
        predicate: input.predicate,
        namespace: input.namespace,
        where: input.where,
        args: input.args,
        polarity: input.polarity,
        scope: input.scope,
      };
      const names = Array.isArray(
        (response.schema as { argumentNames?: unknown } | null)?.argumentNames,
      )
        ? (
            response.schema as { argumentNames: unknown[] }
          ).argumentNames.filter(
            (name): name is string => typeof name === "string",
          )
        : [];
      // Positional args name the same arguments as where, by schema position.
      const requested: Record<string, string> = {
        ...Object.fromEntries(
          names.flatMap((name, index) => {
            const value = input.args?.[index];
            return typeof value === "string" && value !== "*"
              ? [[name, value]]
              : [];
          }),
        ),
        ...input.where,
      };
      const bound = new Set(Object.keys(requested));
      const free = names.filter((name) => !bound.has(name));
      if (
        input.distinct === undefined &&
        response.count > 0 &&
        free.length > 0
      ) {
        const argument = free[free.length - 1] as string;
        next.push({
          call: callText({ ...filters, distinct: argument }),
          why: `count the distinct values of '${argument}' across these facts`,
        });
      }
      if (
        response.count === 0 &&
        response.suggestions &&
        // The executor passes the warnings as a list.
        (response.warnings as readonly string[]).length === 0
      ) {
        // Suggest a correction only for an argument whose requested value
        // does not exist; a key whose value exists is not the cause.
        for (const [key, values] of Object.entries(response.suggestions)) {
          if (!Array.isArray(values)) continue;
          if (values.includes(requested[key])) continue;
          const value = values[0];
          if (typeof value === "string") {
            next.push({
              // kb_query takes where or args, never both.
              call: callText({
                ...filters,
                args: undefined,
                where: { ...requested, [key]: value },
              }),
              why: `'${key}' has no fact with that value; '${value}' is one that exists`,
            });
            break;
          }
        }
      }
      if (next.length === 0) {
        next.push({
          call: callText({ factKind: "predicate_schema" }),
          why: "list the predicates this KB can answer about and their argument names",
        });
      }
      break;
    }
    case "property": {
      if (firstId !== undefined) {
        next.push({
          call: callText({ id: firstId }),
          why: "full fact text and relationships of one row",
        });
      }
      if (input.propertyKey !== undefined) {
        next.push({
          call: callText({ subjectKey: input.subjectKey }),
          why: "every property stated about this subject",
        });
      } else if (response.count === 0) {
        next.push({
          call: callText({ factKind: "subject" }),
          why: "list the subject keys that exist",
        });
      }
      break;
    }
    case "schemas": {
      const name = typeof first?.name === "string" ? first.name : undefined;
      if (name !== undefined) {
        next.push({
          call: callText({ predicate: name }),
          why: "every stored fact of the first listed predicate",
        });
      }
      break;
    }
    case "fact_kind": {
      if (input.factKind === "predicate") {
        next.push({
          call: callText({ factKind: "predicate_schema" }),
          why: "argument names and constants for asking by name",
        });
      } else if (input.factKind === "property_value" && first) {
        const subjectKey =
          typeof first.subject_key === "string" ? first.subject_key : undefined;
        if (subjectKey !== undefined) {
          next.push({
            call: callText({ subjectKey }),
            why: "the properties of the first listed subject",
          });
        }
      } else if (firstId !== undefined) {
        next.push({
          call: callText({ id: firstId }),
          why: "full fact text of one row",
        });
      }
      break;
    }
  }
  return next;
}

function factRowSummary(row: Record<string, unknown>): string {
  const id = String(row.id ?? "");
  if (typeof row.name === "string" && Array.isArray(row.args)) {
    const effect = typeof row.effect === "string" ? ` -> ${row.effect}` : "";
    const polarity = row.polarity === "deny" ? " [deny]" : "";
    return `${id}: ${row.name}(${row.args.map(String).join(", ")})${effect}${polarity}`;
  }
  if (
    typeof row.subjectKey === "string" &&
    typeof row.propertyKey === "string"
  ) {
    const unit = typeof row.unit === "string" && row.unit ? ` ${row.unit}` : "";
    return `${id}: ${row.subjectKey} ${row.propertyKey} ${String(row.operator ?? "")} ${String(row.value ?? "")}${unit}`;
  }
  if (typeof row.name === "string" && typeof row.arity === "number") {
    const names = Array.isArray(row.argumentNames)
      ? row.argumentNames.map(String).join(", ")
      : "";
    // A built-in schema is no stored entity: its id is for kb_model's
    // schemaId, not for a kb_query by id.
    const builtin =
      row.builtin === true
        ? ` [builtin${id ? ` ${id}` : ""}, not a stored entity]`
        : "";
    return `${row.name}(${names})${builtin}`;
  }
  return `${id} (${String(row.title ?? "")})`;
}

/**
 * Typed fact questions run as validated Prolog goals in the discovery module;
 * the executor never forwards caller-written Prolog.
 */
async function executeFactQuery(
  input: QueryInput,
  context: OperationContext,
  limit: number,
  offset: number,
): Promise<OperationResult<QueryPayload>> {
  if (input.type !== undefined && input.type !== "fact") {
    throw new Error(
      "Typed fact filters (factKind, predicate, subjectKey, ...) apply to type 'fact' only.",
    );
  }
  for (const key of ["id", "tags", "sourceFile"] as const) {
    if (input[key] !== undefined) {
      throw new Error(
        `${key} cannot be combined with typed fact filters; run a separate kb_query.`,
      );
    }
  }
  const prolog = requireProlog(context);
  if (
    !Number.isFinite(limit) ||
    !Number.isFinite(offset) ||
    limit < 0 ||
    offset < 0
  ) {
    throw new Error("limit and offset must be non-negative numbers.");
  }
  if (input.factKind === "subject" && input.subjectKey !== undefined) {
    return executeSubjectDomainQuery(input, context, prolog);
  }
  const page = `${Math.trunc(limit)}, ${Math.trunc(offset)}`;
  const namespace =
    input.namespace === undefined
      ? "none"
      : toPrologAtom(requireAtomString(input.namespace, "namespace"));
  const mode =
    input.factKind === "predicate_schema"
      ? "schemas"
      : input.predicate !== undefined
        ? "predicate"
        : input.subjectKey !== undefined
          ? "property"
          : input.factKind !== undefined
            ? "fact_kind"
            : undefined;
  if (mode === undefined) {
    throw new Error(
      "Typed fact filters need a predicate, a subjectKey or a factKind; where/args/polarity/distinct/propertyKey refine one of those.",
    );
  }
  const unused = TYPED_FACT_FILTERS.filter(
    (key) => input[key] !== undefined && !MODE_FILTERS[mode].has(key),
  );
  if (unused.length > 0) {
    throw new Error(
      `${unused.join(", ")} do${unused.length === 1 ? "es" : ""} not apply to a ${mode} question; allowed with it: ${[...MODE_FILTERS[mode]].join(", ")}.`,
    );
  }
  const scope =
    input.scope === undefined
      ? "all"
      : requireEnum(input.scope, "scope", ["all", "current_requirements"]);
  const factKind =
    input.factKind === undefined
      ? undefined
      : requireEnum(input.factKind, "factKind", FACT_KINDS);
  let goal: string;
  if (mode === "schemas") {
    goal = `discovery:ask_schemas_json(${namespace}, ${input.predicate === undefined ? "none" : toPrologAtom(requireAtomString(input.predicate, "predicate"))}, ${page}, JsonString)`;
  } else if (mode === "predicate") {
    const name = requireAtomString(input.predicate, "predicate");
    const polarity =
      input.polarity === undefined
        ? "none"
        : toPrologAtom(
            requireEnum(input.polarity, "polarity", ["assert", "deny"]),
          );
    const distinct =
      input.distinct === undefined
        ? "none"
        : toPrologAtom(requireAtomString(input.distinct, "distinct"));
    goal = `discovery:ask_predicate_json(${namespace}, ${toPrologAtom(name)}, ${predicateArgSpec(input)}, ${polarity}, ${scope}, ${distinct}, ${page}, JsonString)`;
  } else if (mode === "property") {
    const subject = requireAtomString(input.subjectKey, "subjectKey");
    const property =
      input.propertyKey === undefined
        ? "none"
        : toPrologAtom(requireAtomString(input.propertyKey, "propertyKey"));
    goal = `discovery:ask_property_json(${toPrologAtom(subject)}, ${property}, ${scope}, ${page}, JsonString)`;
  } else {
    goal = `discovery:ask_fact_kind_json(${toPrologAtom(factKind)}, ${page}, JsonString)`;
  }
  const response = await runOperationJsonQuery<FactQueryResponse>(
    prolog,
    "discovery.pl",
    goal,
    "Query execution",
    context.signal,
  );
  const rows = Array.isArray(response.rows) ? response.rows : [];
  const count =
    typeof response.count === "number" ? response.count : rows.length;
  const warnings = Array.isArray(response.warnings) ? response.warnings : [];
  const factQuery: FactQueryPayload = {
    mode: response.mode,
    ...(response.predicate ? { predicate: response.predicate } : {}),
    ...(response.property ? { property: response.property } : {}),
    ...(response.factKind ? { factKind: response.factKind } : {}),
    ...(response.schema !== undefined ? { schema: response.schema } : {}),
    ...(response.subjectFacts ? { subjectFacts: response.subjectFacts } : {}),
    ...(response.distinct !== undefined ? { distinct: response.distinct } : {}),
    ...(response.suggestions !== undefined
      ? { suggestions: response.suggestions }
      : {}),
    warnings,
    next: factQueryNext(input, { ...response, rows, count, warnings }),
  };
  const subject =
    response.mode === "predicate"
      ? `${String(input.predicate)} facts`
      : response.mode === "property"
        ? `properties of ${String(input.subjectKey)}`
        : response.mode === "schemas"
          ? "predicate schemas"
          : `${String(factKind)} facts`;
  const storeNotice = count === 0 ? uncompiledSearchNotice(context) : null;
  const freshness =
    storeNotice === null
      ? await inspectQueryFreshness(context, prolog, { sourceFilterPaths: [] })
      : null;
  const staleSuffix = storeNotice
    ? [
        `Note: ${storeNotice.detail} Run kibi sync before relying on query results.`,
      ]
    : freshness?.state === "stale"
      ? [freshness.note]
      : [];
  const lines = [
    count === 0
      ? `No ${subject} matched.`
      : `${count} ${subject}. Showing ${rows.length} (offset ${offset}, limit ${limit}): ${rows.map(factRowSummary).join("; ")}`,
    ...(factQuery.distinct && typeof factQuery.distinct === "object"
      ? [
          `Distinct ${String((factQuery.distinct as { argument?: unknown }).argument)}: ${JSON.stringify((factQuery.distinct as { values?: unknown }).values ?? [])}`,
        ]
      : []),
    ...(factQuery.suggestions && typeof factQuery.suggestions === "object"
      ? [`Values that exist: ${JSON.stringify(factQuery.suggestions)}`]
      : []),
    ...warnings.map((warning) => `Warning: ${warning}`),
    ...factQuery.next.map((entry) => `Next: ${entry.call} (${entry.why})`),
    ...staleSuffix,
  ];
  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: {
      entities: rows,
      count,
      factQuery,
      ...(storeNotice ? { branchStore: storeNotice } : {}),
      ...(freshness?.state === "stale" ? { meta: freshness.meta } : {}),
    },
  };
}

/**
 * kb_query factKind subject + subjectKey: the domain view of one subject. Its
 * definition, broader and narrower subjects, every current requirement about
 * it (through constrains links, grounding facts or claim anchors), the claims
 * on it and the scenarios that assume them.
 */
async function executeSubjectDomainQuery(
  input: QueryInput,
  context: OperationContext,
  prolog: ReturnType<typeof requireProlog>,
): Promise<OperationResult<QueryPayload>> {
  const unused = TYPED_FACT_FILTERS.filter(
    (key) => input[key] !== undefined && !MODE_FILTERS.subject.has(key),
  );
  if (unused.length > 0) {
    throw new Error(
      `${unused.join(", ")} do${unused.length === 1 ? "es" : ""} not apply to a subject question; allowed with it: factKind, subjectKey.`,
    );
  }
  const subjectKey = requireAtomString(input.subjectKey, "subjectKey");
  const domain = await readSubjectDomain(
    prolog,
    context.workspaceRoot,
    subjectKey,
  );
  const warnings = domain.defined
    ? domain.subjectFacts.some((fact) => fact.definition === "")
      ? [
          `Subject ${subjectKey} has no definition in its fact body; requirements that name it can mean different things by it.`,
        ]
      : []
    : [
        `No active subject fact defines ${subjectKey}. Define it (fact_kind subject) before claims or requirements name it.`,
      ];
  const next: QueryNextCall[] = [
    ...domain.broader.map((key) => ({
      call: callText({ factKind: "subject", subjectKey: key }),
      why: "the broader subject's rules also apply here",
    })),
    ...(domain.claims.length > 0
      ? [
          {
            call: callText({ subjectKey }),
            why: "typed values of the property claims on this subject",
          },
        ]
      : []),
  ];
  const factQuery: FactQueryPayload = {
    mode: "subject",
    subjectFacts: domain.subjectFacts.map((fact) => fact.id),
    domain,
    warnings,
    next,
  };
  const definition = definitionQuote(domain);
  const lines = [
    domain.defined
      ? `Subject ${subjectKey}${definition === "" ? "" : `: ${definition}`}`
      : `Subject ${subjectKey} is not defined.`,
    ...(domain.broader.length > 0
      ? [`Broader: ${domain.broader.join(", ")}`]
      : []),
    ...(domain.narrower.length > 0
      ? [`Narrower: ${domain.narrower.join(", ")}`]
      : []),
    ...(domain.distinctFrom.length > 0
      ? [`Distinct from: ${domain.distinctFrom.join(", ")}`]
      : []),
    `${domain.requirements.length} current requirement(s) govern it${domain.requirements.length === 0 ? "." : `: ${domain.requirements.map((req) => `${req.id} (${req.title}; ${[...new Set(req.via.map((via) => `${via.link} ${via.subjectKey}`))].join(", ")})`).join("; ")}`}`,
    `${domain.claims.length} claim(s), ${domain.scenarios.length} scenario(s) assuming them.`,
    ...warnings.map((warning) => `Warning: ${warning}`),
    ...next.map((entry) => `Next: ${entry.call} (${entry.why})`),
  ];
  const rows = domain.subjectFacts.map((fact) => ({
    id: fact.id,
    type: "fact",
    title: fact.title,
    subjectKey,
    definition: fact.definition,
  }));
  const storeNotice =
    rows.length === 0 ? uncompiledSearchNotice(context) : null;
  const freshness =
    storeNotice === null
      ? await inspectQueryFreshness(context, prolog, { sourceFilterPaths: [] })
      : null;
  const allLines = [
    ...lines,
    ...(storeNotice
      ? [
          `Note: ${storeNotice.detail} Run kibi sync before relying on query results.`,
        ]
      : freshness?.state === "stale"
        ? [freshness.note]
        : []),
  ];
  return {
    content: [{ type: "text", text: allLines.join("\n") }],
    structuredContent: {
      entities: rows,
      count: rows.length,
      factQuery,
      ...(storeNotice ? { branchStore: storeNotice } : {}),
      ...(freshness?.state === "stale" ? { meta: freshness.meta } : {}),
    },
  };
}

export async function executeQuery(
  input: QueryInput,
  context: OperationContext,
): Promise<OperationResult<QueryPayload>> {
  const { type, id, tags, sourceFile, limit = 100, offset = 0 } = input;
  try {
    validateEntityType(type);
    if (input.includeBody === true && (id === undefined || id === "")) {
      throw new Error(
        "includeBody needs id: it returns the authored body of one entity. Pass the entity's id.",
      );
    }
    if (hasTypedFactFilters(input)) {
      return await executeFactQuery(input, context, limit, offset);
    }
    const prolog = requireProlog(context);
    const signal = context.signal;
    const pageInput = {
      ...(type !== undefined ? { type } : {}),
      ...(id !== undefined ? { id } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(sourceFile !== undefined ? { sourceFile } : {}),
      limit,
      offset,
    };
    // Both paths return one bounded page plus the total count. Ports without
    // the engine method page kb_query_entities through `query` instead of
    // materializing every matching entity (receipt histories make an
    // all-tests answer exceed the bounded engine output).
    const indexedPage = prolog.queryEntities
      ? await prolog.queryEntities(pageInput, signal)
      : await queryEntitiesViaQuery(prolog, pageInput, signal);
    // A requirement or ADR without authored firmness reads as its origin
    // implies (`default` when an agent wrote it, else `firm`); the row says
    // so, so a reader never has to know the rule.
    const summaryRows =
      (id === undefined || id === "") && input.fields !== "full";
    const paginated = indexedPage.entities.map((entity) => {
      const firmness = effectiveFirmness(
        entity.type,
        entity.firmness,
        entity.origin,
      );
      const row =
        entity.firmness === firmness ? entity : { ...entity, firmness };
      return summaryRows ? summaryEntity(row) : row;
    });
    // An empty page from a never-compiled store says nothing about the
    // authored entities, so the answer names the store state.
    const storeNotice =
      indexedPage.count === 0 ? uncompiledSearchNotice(context) : null;
    const freshness =
      storeNotice === null
        ? await inspectQueryFreshness(context, prolog, {
            sourceFilterPaths: sourceFile !== undefined ? [sourceFile] : [],
          })
        : null;
    const baseText =
      indexedPage.count === 0
        ? `No entities found${type ? ` of type '${type}'` : ""}.${storeNotice ? ` Note: ${storeNotice.detail} Run kibi sync before relying on query results.` : ""}`
        : `Found ${indexedPage.count} entities${type ? ` of type '${type}'` : ""}. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${paginated
            .map((entity) => {
              const entityId = String(entity.id ?? "").replace(
                /^file:\/\/.*\//,
                "",
              );
              return `${entityId} (${String(entity.title ?? "")}, status=${String(entity.status ?? "")})`;
            })
            .join(", ")}`;
    const staleText =
      freshness?.state === "stale" ? `${baseText} ${freshness.note}` : baseText;
    // An id lookup returns metadata only; say that the authored body is one
    // flag away so the reader does not have to know the parameter exists.
    const text =
      id !== undefined &&
      id !== "" &&
      indexedPage.count > 0 &&
      input.includeBody !== true
        ? `${staleText} Pass includeBody: true to read its authored body.`
        : staleText;
    const body =
      input.includeBody === true
        ? await readQueryBody(
            // includeBody without an id was refused above.
            id as string,
            paginated.find((entity) => entity.id === id),
            context,
          )
        : undefined;
    return {
      content: [
        { type: "text", text: body ? `${text}\n${queryBodyText(body)}` : text },
      ],
      structuredContent: {
        entities: paginated,
        count: indexedPage.count,
        ...(storeNotice ? { branchStore: storeNotice } : {}),
        ...(freshness?.state === "stale" ? { meta: freshness.meta } : {}),
        ...(body ? { body } : {}),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Query execution failed: ${message}`);
  }
}

// The body is read from the entity's authored document inside the
// workspace, the same file kb_upsert rewrites; nothing outside it is read.
async function readQueryBody(
  id: string,
  entity: Readonly<Record<string, unknown>> | undefined,
  context: OperationContext,
): Promise<QueryBody> {
  if (typeof entity?.source !== "string") return { id, path: null, text: null };
  const relative = (entity.source.split("#", 1)[0] as string).trim();
  const root = path.resolve(context.workspaceRoot);
  const resolved = path.resolve(root, relative);
  if (!relative.endsWith(".md") || !resolved.startsWith(root + path.sep)) {
    return { id, path: null, text: null };
  }
  const bodyPath = path.relative(root, resolved).split(path.sep).join("/");
  let raw: string;
  try {
    raw = String(
      context.fs
        ? await context.fs.readFile(resolved)
        : await readFile(resolved),
    );
  } catch {
    return { id, path: bodyPath, text: null };
  }
  const authored = readAuthoredEntity(raw, bodyPath)?.body;
  if (authored === undefined) {
    return { id, path: bodyPath, text: null };
  }
  return authored.length > QUERY_BODY_MAX_CHARS
    ? {
        id,
        path: bodyPath,
        text: authored.slice(0, QUERY_BODY_MAX_CHARS),
        truncated: true,
      }
    : { id, path: bodyPath, text: authored };
}

function queryBodyText(body: QueryBody): string {
  if (body.text === null) {
    return body.path === null
      ? `No authored document for ${body.id}, so there is no body to return.`
      : `The authored document ${body.path} of ${body.id} could not be read.`;
  }
  return `Body of ${body.id} (${body.path}${body.truncated ? `, first ${QUERY_BODY_MAX_CHARS} characters` : ""}; replace it with kb_upsert document.body):\n${body.text}`;
}

/**
 * Identifying metadata a caller needs to decide which hits to open.
 *
 * Search is a discovery step, so returning complete entity bodies for every
 * hit spends a large share of an agent's context before it has chosen
 * anything. Full bodies stay available through `fields: "full"` or a follow-up
 * kb_query for the exact ids.
 */
const SUMMARY_ENTITY_FIELDS = [
  "id",
  "type",
  "title",
  "status",
  "priority",
  "tags",
  "source",
  "sourceFile",
  "updated_at",
] as const;

/**
 * A listed entity as a list needs it: identifying metadata, and its
 * firmness when it has one. `fields: "full"` or a lookup by id returns the
 * rest.
 */
export function summaryEntity(
  entity: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const field of [...SUMMARY_ENTITY_FIELDS, "firmness"]) {
    if (entity[field] !== undefined) summary[field] = entity[field];
  }
  return summary;
}

/**
 * A match as discovery needs it: identifying metadata, and evidence without
 * its traceability graph paths. The paths name every symbol and link that
 * reached the entity; `reasons` already says a graph match counted, and
 * `fields: "full"` or kb_graph returns them.
 */
export function summarizeMatch<
  TMatch extends { readonly entity: Record<string, unknown> },
>(match: TMatch): TMatch {
  const row = match.entity;
  const summary: Record<string, unknown> = {};
  for (const field of SUMMARY_ENTITY_FIELDS) {
    if (row[field] !== undefined) summary[field] = row[field];
  }
  if (!("evidence" in match)) return { ...match, entity: summary };
  const { graphPaths: _graphPaths, ...evidence } = (
    match as unknown as IntentSearchMatch
  ).evidence;
  return { ...match, entity: summary, evidence };
}

/**
 * Each entity once: a match whose entity the answer already quotes (a
 * requirement with its whole statement, a fact with its claim) keeps only
 * its id, type, title, score and match reasons. Every other match is
 * returned as it is.
 */
export function slimAnsweredMatches<
  TMatch extends {
    readonly entity: Record<string, unknown>;
    readonly score: number;
    readonly reasons: readonly string[];
  },
>(matches: readonly TMatch[], quoted: ReadonlySet<string>): readonly TMatch[] {
  if (quoted.size === 0) return matches;
  return matches.map((match) => {
    const id = match.entity.id;
    if (typeof id !== "string" || !quoted.has(id)) return match;
    const entity: Record<string, unknown> = { id };
    if (match.entity.type !== undefined) entity.type = match.entity.type;
    if (match.entity.title !== undefined) entity.title = match.entity.title;
    return {
      entity,
      score: match.score,
      reasons: match.reasons,
    } as unknown as TMatch;
  });
}

// Candidates are projected rows, so `fields: "full"` reloads the final page's
// complete entities by id (one bounded query each).
async function projectMatches<
  TMatch extends { readonly entity: Record<string, unknown> },
>(
  prolog: Pick<PrologPort, "query">,
  matches: readonly TMatch[],
  fields: SearchInput["fields"],
): Promise<readonly TMatch[]> {
  return fields === "full"
    ? reloadFullEntities(prolog, matches)
    : matches.map(summarizeMatch);
}

// A question about contradictions is answered by the check, not by the
// entities that happen to mention the word.
const CONTRADICTION_QUESTION =
  /\b(contradict\w*|conflict\w*|inconsisten\w*)\b/i;
const CONTRADICTION_HINT =
  ' Search only finds entities that mention a conflict. Whether current requirements contradict each other is decided by kb_check with rules ["domain-contradictions"]; what a proposed rule would conflict with, by kb_model mode predicates (decisionConflicts) on its text or a kb_upsert dryRun.';

// A file path written in the question is left out of its topic. Passed as
// sourceLocations it also brings the requirements linked to that file.
function questionPathsNotLocated(
  query: string,
  locations: readonly SourceLocation[] | undefined,
): string[] {
  const located = new Set(
    (locations ?? []).map((location) => location.path.replace(/^\.\//, "")),
  );
  return questionPaths(query).filter((file) => !located.has(file));
}

function questionPathHint(named: readonly string[]): string {
  if (named.length === 0) return "";
  const list = named.join(", ");
  return named.length === 1
    ? ` The question names ${list}; its words were left out of the topic. Pass it as sourceLocations to also see the requirements linked to that file.`
    : ` The question names ${list}; their words were left out of the topic. Pass them as sourceLocations to also see the requirements linked to those files.`;
}

/**
 * The sentence an abstained search carries in its structured result, so the
 * advice never depends on the text digest.
 */
const ABSTENTION_NOTE =
  "The search abstained: no entity shares enough of the question's words. That is not evidence that nothing is recorded: ask again in the words and language the KB is written in, or pass sourceLocations.";

/**
 * The next calls the structured result names. They mirror the advice in the
 * text digest and never change when it is given.
 */
export function searchNextActions(options: {
  readonly query: string;
  readonly type: string | undefined;
  readonly abstained: boolean;
  /** An abstained or weak first page whose hints (if any) showed nothing. */
  readonly listTitles: boolean;
  readonly unlocatedPaths: readonly string[];
  readonly sourceLocations: readonly SourceLocation[] | undefined;
}): SearchNextAction[] {
  const actions: SearchNextAction[] = [];
  if (options.listTitles)
    actions.push({
      operation: "kb_query",
      input: { type: options.type ?? "req" },
      reason: `The search ${options.abstained ? "abstained" : "matched weakly"}: no entity shares enough of the question's words. That is not evidence that nothing is recorded. List the ${options.type ?? "requirement"} titles to find the words the knowledge base uses, then search again in those words.`,
      required: false,
    });
  if (options.unlocatedPaths.length > 0)
    actions.push({
      operation: "kb_search",
      input: {
        query: options.query,
        sourceLocations: [
          ...(options.sourceLocations ?? []),
          ...options.unlocatedPaths.map((path) => ({ path })),
        ],
      },
      reason: questionPathHint(options.unlocatedPaths).trimStart(),
      required: false,
    });
  if (CONTRADICTION_QUESTION.test(options.query))
    actions.push({
      operation: "kb_check",
      input: { rules: ["domain-contradictions"] },
      reason: CONTRADICTION_HINT.trim(),
      required: false,
    });
  return actions;
}

/**
 * Hints from the workspace's kibi.search-hints.v1 provider. A host without a
 * plugin runtime, or a registry that fails to load, gives no hints rather than
 * failing the search.
 */
async function searchHintsFor(
  context: OperationContext,
  options: Omit<
    Parameters<typeof buildSearchHints>[0],
    "resolution" | "workspaceRoot"
  >,
): Promise<SearchHintsAnalysis | undefined> {
  if (!context.ensurePlugins) return undefined;
  let resolution: Awaited<ReturnType<CapabilityRegistry["resolveSearchHints"]>>;
  try {
    resolution = await (await context.ensurePlugins()).resolveSearchHints();
  } catch (error) {
    // A configured provider that cannot load is reported, not thrown: the
    // lexical answer stands on its own.
    const trigger = searchHintsTrigger(options.analysis);
    return trigger === null
      ? undefined
      : {
          trigger,
          provider: null,
          items: [],
          diagnostics: [
            {
              pluginId: "unresolved",
              packageName: null,
              mode: "replace",
              code: "provider_unavailable",
              message: error instanceof Error ? error.message : String(error),
            },
          ],
        };
  }
  return buildSearchHints({
    ...options,
    resolution,
    workspaceRoot: context.workspaceRoot,
  });
}

/**
 * A top match as the text digest names it. A negative-path fact describes a
 * situation that must not happen, so the digest says so beside its id.
 */
function topMatchLabel(match: {
  readonly entity: Record<string, unknown>;
  readonly negativePath?: NegativePathMarker;
}): string {
  const id = String(match.entity.id ?? "");
  return match.negativePath === undefined ? id : `${id} (forbidden situation)`;
}

export async function executeSearch(
  input: SearchInput,
  context: OperationContext,
): Promise<OperationResult<SearchPayload>> {
  const {
    query,
    type,
    limit = 10,
    offset = 0,
    rankingMode = "intent-v1",
    semanticFacets,
    sourceLocations,
    minScore,
    fields,
    answer,
    hints: hintsWanted = true,
  } = input;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error(
      "Search execution failed: query must be a non-empty string",
    );
  }
  validateEntityType(type);
  try {
    const prolog = requireProlog(context);
    const branch = context.branchAttachment?.kbBranch ?? null;
    const storeNotice = uncompiledSearchNotice(context);
    const branchFields = {
      branch,
      ...(storeNotice ? { branchStore: storeNotice } : {}),
    };
    const storeNote = storeNotice
      ? ` Note: ${storeNotice.detail} Run kibi sync before relying on search results.`
      : "";
    const intentMode =
      rankingMode === "intent-v1" ||
      semanticFacets !== undefined ||
      sourceLocations !== undefined;
    if (intentMode) {
      const intentInput = {
        query: trimmedQuery,
        ...(type !== undefined ? { type } : {}),
        ...(semanticFacets !== undefined ? { semanticFacets } : {}),
        ...(sourceLocations !== undefined ? { sourceLocations } : {}),
        ...(minScore !== undefined ? { minScore } : {}),
      } as const;
      validateIntentSearchInput(intentInput);
      let corpus:
        | {
            entities: readonly Record<string, unknown>[];
            bodies: MarkdownBodyCache;
          }
        | undefined;
      const intentResult = await executeIntentSearch(
        intentInput,
        prolog,
        context.workspaceRoot,
        (entities, bodies) => {
          corpus = { entities, bodies };
        },
      );
      const paginated = paginateResults(intentResult.matches, limit, offset);
      const freshness =
        storeNotice === null
          ? await inspectQueryFreshness(context, prolog, {
              sourceFilterPaths: (sourceLocations ?? []).map((loc) => loc.path),
            })
          : undefined;
      const answerSyncState: "fresh" | "stale" | "unknown" =
        storeNotice !== null ? "stale" : (freshness?.state ?? "unknown");
      // The answer layer summarizes the whole ranking, so it belongs to the
      // first page only.
      const answerLayer =
        (answer ?? true) && offset === 0 && intentResult.matches.length > 0
          ? await buildSearchAnswer(prolog, intentResult.matches, {
              workspaceRoot: context.workspaceRoot,
              branch: context.branchAttachment?.kbBranch ?? null,
              detail: fields === "full" ? "full" : "summary",
              syncState: answerSyncState,
              ...(intentResult.analysis.ambiguous ? { ambiguous: true } : {}),
              ...(storeNotice !== null
                ? { staleReasonCount: 1 }
                : freshness?.state === "stale"
                  ? {
                      staleReasonCount: freshness.staleReasonCount,
                      staleWarningNote: freshness.note,
                    }
                  : {}),
            })
          : undefined;
      // The structured payload carries every row; the text is a short
      // human-readable digest instead of a second copy of the results.
      // A top match no requirement owns is said in the digest too, so the
      // governing list is never read as the top match's requirement.
      const topUngoverned = answerLayer?.ungoverned.find(
        (entry) => entry.rank === 1,
      );
      // Hints come after the lexical answer and never change it; a strong
      // answer never reaches a provider.
      const hints =
        hintsWanted &&
        offset === 0 &&
        corpus !== undefined &&
        searchHintsTrigger(intentResult.analysis) !== null
          ? await searchHintsFor(context, {
              query: trimmedQuery,
              analysis: intentResult.analysis,
              entities: corpus.entities,
              bodies: corpus.bodies,
              governingIds: (answerLayer?.governing ?? []).map((req) => req.id),
              prolog,
            })
          : undefined;
      const unlocatedPaths = questionPathsNotLocated(
        trimmedQuery,
        sourceLocations,
      );
      const abstained = intentResult.matches.length === 0;
      const nextActions = searchNextActions({
        query: trimmedQuery,
        type,
        abstained,
        listTitles:
          offset === 0 &&
          searchHintsTrigger(intentResult.analysis) !== null &&
          (hints?.items.length ?? 0) === 0,
        unlocatedPaths,
        sourceLocations,
      });
      const weakAdrNote =
        isBroadRationaleQuery({
          query: trimmedQuery,
          ...(type !== undefined ? { type } : {}),
          ...(sourceLocations !== undefined ? { sourceLocations } : {}),
        }) &&
        searchHintsTrigger(intentResult.analysis) !== null &&
        (answerLayer?.rationale.length ?? 0) === 0 &&
        !paginated.some((match) => match.entity.type === "adr")
          ? ' No ADRs matched; for design rationale or architecture decisions, try kb_query({"type":"adr"}).'
          : "";
      const staleOrStoreNote =
        storeNote || (freshness?.state === "stale" ? ` ${freshness.note}` : "");
      const text = `${
        intentResult.matches.length === 0
          ? `No intent search results for '${trimmedQuery}' (abstained). No entity shares enough of the question's words: ask again in the words and language the KB is written in, or pass sourceLocations.`
          : `Found ${intentResult.matches.length} intent search results for '${trimmedQuery}'${intentResult.analysis.ambiguous ? " (top matches are close; confirm before relying on one)" : ""}. Top: ${paginated
              .slice(0, 5)
              .map((match) => topMatchLabel(match))
              .join(
                ", ",
              )}${answerLayer ? `. ${governingLabel(intentResult.analysis.ambiguous, answerLayer.governing.length)}: ${answerLayer.governing.map((req) => req.id).join(", ") || "none found"}` : ""}${topUngoverned ? ` (the top match ${topUngoverned.id} is linked to no requirement)` : ""}.`
      }${searchHintsNote(hints)}${questionPathHint(unlocatedPaths)}${CONTRADICTION_QUESTION.test(trimmedQuery) ? CONTRADICTION_HINT : ""}${weakAdrNote}${staleOrStoreNote}`;
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          results: slimAnsweredMatches(
            await projectMatches(prolog, paginated, fields),
            answerLayer !== undefined && fields !== "full"
              ? answerQuotedIds(answerLayer)
              : new Set<string>(),
          ),
          count: intentResult.matches.length,
          returned: paginated.length,
          truncated: offset + paginated.length < intentResult.matches.length,
          queryAnalysis:
            hints !== undefined
              ? { ...intentResult.analysis, hints }
              : intentResult.analysis,
          ...(answerLayer ? { answer: answerLayer } : {}),
          ...(abstained ? { notes: [ABSTENTION_NOTE] } : {}),
          ...(nextActions.length > 0 ? { nextActions } : {}),
          ...branchFields,
          ...(freshness?.state === "stale" ? { meta: freshness.meta } : {}),
        },
      };
    }
    // Candidates are projected rows (no receipt histories or other large
    // structured properties); ports without the engine method run the same
    // bounded Prolog search through `query`.
    const entities = await loadSearchCandidates(
      prolog,
      {
        query: trimmedQuery,
        ...(type !== undefined ? { type } : {}),
      },
      context.signal,
    );
    const matches = await rankEntities(
      entities,
      trimmedQuery,
      context.workspaceRoot,
    );
    const paginated = paginateResults(matches, limit, offset);
    const freshness =
      storeNotice === null
        ? await inspectQueryFreshness(context, prolog, {
            sourceFilterPaths: [],
          })
        : undefined;
    const staleOrStoreNote =
      storeNote || (freshness?.state === "stale" ? ` ${freshness.note}` : "");
    const text = `${
      matches.length === 0
        ? `No search results for '${trimmedQuery}'.`
        : `Found ${matches.length} search results for '${trimmedQuery}'. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${paginated
            .map(
              (match) =>
                `${String(match.entity.id ?? "")} [${match.reasons.join(", ")}]`,
            )
            .join(", ")}`
    }${staleOrStoreNote}`;
    return {
      content: [{ type: "text", text }],
      structuredContent: {
        results: await projectMatches(prolog, paginated, fields),
        count: matches.length,
        returned: paginated.length,
        truncated: offset + paginated.length < matches.length,
        ...branchFields,
        ...(freshness?.state === "stale" ? { meta: freshness.meta } : {}),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("Search execution failed:")) throw error;
    throw new Error(`Search execution failed: ${message}`);
  }
}

export async function executeStatus(
  _input: StatusInput,
  context: OperationContext,
): Promise<OperationResult<StatusPayload>> {
  try {
    const attachment =
      context.branchAttachment ??
      resolveBranchAttachment(context.workspaceRoot);
    if ("error" in attachment) {
      throw new Error(`Failed to resolve active branch: ${attachment.error}`);
    }
    let payload: StatusPayload;
    const store = inspectBranchStore(
      context.workspaceRoot,
      attachment.kbBranch,
    );
    let engineStatus: StatusPayload["engineStatus"];
    let ownedEngine: EngineClient | undefined;
    if (store.state !== "healthy") {
      // Status is deliberately safe before first sync and during recovery. Starting
      // EngineClient would initialise (or attempt to repair) the store, which turns
      // a diagnostic read into an accidental mutation.
      payload = {
        branch: attachment.kbBranch,
        snapshotId: store.state === "missing" ? "missing" : "unavailable",
        syncedAt: null,
        dirty: true,
        syncState: "unknown",
        kbPath: store.path,
        lastSyncSource: "unavailable",
        staleReasons: [],
        staleReasonCount: 0,
      };
    } else
      try {
        // Prefer an injected or session-backed engine so MCP status shares the
        // same client as discovery tools. Only spawn an owned fallback when no
        // host session is available (CLI status without a live runtime port).
        let prolog = context.prolog;
        if (!prolog && context.ensureProlog) {
          prolog = await context.ensureProlog();
        }
        if (!prolog) {
          ownedEngine = new EngineClient({
            workspaceRoot: context.workspaceRoot,
            branch: attachment.kbBranch,
            timeout: 15_000,
          });
          prolog = ownedEngine;
        }
        payload = await runOperationJsonQuery<StatusPayload>(
          prolog,
          "status.pl",
          "status:kb_status_json(JsonString)",
          "Status execution",
          context.signal,
        );
        if (!isStatusPayload(payload)) {
          throw new Error("Status execution query returned an invalid payload");
        }
        // The Prolog status module sees the compiled directory key. The public
        // contract exposes the exact Git branch identity instead.
        payload = { ...payload, branch: attachment.kbBranch };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        engineStatus = {
          state: "unavailable",
          errorCode:
            error instanceof OperationJsonDecodeError
              ? error.code
              : error instanceof SwiplResolutionError
                ? error.code
                : "engine_status_unavailable",
          detail: message,
          recoveryRequired: false,
        };
        payload = {
          branch: attachment.kbBranch,
          snapshotId: "unavailable",
          syncedAt: null,
          dirty: true,
          syncState: "unknown",
          kbPath: store.path,
          lastSyncSource: "unavailable",
          staleReasons: [],
          staleReasonCount: 0,
        };
      } finally {
        await ownedEngine?.terminate();
      }
    const snapshotEvidence = await readWorkspaceSnapshot(context);
    // Prolog compares file times only. A fresh clone or a checkout rewrites
    // every mtime without changing a byte, so confirm each "newer" source
    // against the content hashes the last compilation recorded.
    const prologReasons = payload.staleReasons ?? [];
    const {
      confirmed,
      compilerReason,
      extractionReasons,
      missingShardReasons,
    } = collectHealthyStoreEvidence(
      context.workspaceRoot,
      store.path,
      prologReasons,
      store.state === "healthy",
    );
    const existingReasons = confirmed.kept;
    if (
      confirmed.dropped.length > 0 &&
      confirmed.kept.length === 0 &&
      payload.staleReasonsTruncated !== true &&
      payload.syncState === "stale"
    ) {
      payload = { ...payload, syncState: "fresh", dirty: false };
    }
    // A missing or empty store beside authored sources gets the one reason
    // whose remediation works (kibi sync); `kibi branch ensure` alone would
    // leave the store empty.
    const storeReason =
      uncompiledBranchStoreReason(
        context.workspaceRoot,
        store,
        attachment.kbBranch,
      ) ?? branchStoreReason(store);
    const storeUncompiled = storeReason?.code === BRANCH_STORE_NOT_COMPILED;
    const lockReason = storeLockJournalReason(store.path);
    // A stale-lock takeover heals itself; report it without making the KB stale.
    const takeoverNotice = storeLockTakeoverReason(store.path);
    // A duplicate-triple repair on attach has already fixed the store.
    const repairNotice = storeRepairReason(store.path);
    const notices = [
      ...(takeoverNotice ? [takeoverNotice] : []),
      ...(repairNotice ? [repairNotice] : []),
    ];
    // A status the engine could not give always carries its code and detail.
    const engineReason = engineStatus
      ? {
          code: engineStatus.errorCode as string,
          path: store.path,
          entityIds: [],
          detail: engineStatus.detail as string,
          // A missing or unusable SWI-Prolog is not fixed by restarting the
          // engine; point at the diagnostic that reports the resolution.
          remediation: {
            command_argv: (engineStatus.errorCode as string).startsWith(
              "swipl_",
            )
              ? ["kibi", "doctor"]
              : ["kibi", "engine", "stop"],
            applyRequired: false,
          },
        }
      : null;
    const staleReasons = sortReasons([
      ...existingReasons,
      ...(storeReason ? [storeReason] : []),
      ...(lockReason ? [lockReason] : []),
      ...(compilerReason ? [compilerReason] : []),
      ...extractionReasons,
      ...missingShardReasons,
      ...(engineReason ? [engineReason] : []),
    ]);
    const enrichedPayload: StatusPayload = {
      ...payload,
      // Source hashes can all match while the compilation itself is lossy, so
      // a compiler contract change alone makes the store stale.
      ...(compilerReason ? { syncState: "stale", dirty: true } : {}),
      // An authored source sync cannot extract leaves its entities out of
      // the store, so the KB is not current until the file is fixed.
      ...(extractionReasons.length > 0
        ? { syncState: "stale", dirty: true }
        : {}),
      // A deleted relationship shard leaves stale edges in RDF until sync runs.
      ...(missingShardReasons.length > 0
        ? { syncState: "stale", dirty: true }
        : {}),
      // A missing or empty store has no stale file to report, yet nothing in
      // it is current: the authored sources were never compiled. (A missing
      // store without authored sources, and an unreadable or incomplete one,
      // stay "unknown".)
      ...(storeUncompiled ? { syncState: "stale", dirty: true } : {}),
      branchAttachment: attachment,
      branchStore: store,
      // The session brief every host opens with, for an agent whose host
      // has no Kibi plugin and only calls kb_status.
      sessionBrief: SESSION_BRIEF,
      ...(notices.length > 0 ? { notices } : {}),
      ...(engineStatus ? { engineStatus } : {}),
      staleReasons,
      staleReasonCount: staleReasons.length,
      staleReasonsTruncated: false,
      proofSnapshot: snapshotEvidence.available
        ? snapshotEvidence.snapshot.hash
        : "unknown",
      proofSnapshotAvailable: snapshotEvidence.available,
      ...(snapshotEvidence.available
        ? {
            proofSnapshotDirty: snapshotEvidence.snapshot.dirty,
            proofSnapshotFileCount: snapshotEvidence.snapshot.fileCount,
            proofSnapshotVersion: snapshotEvidence.snapshot.version,
            proofSnapshotChanges: snapshotEvidence.snapshot.changes ?? [],
            proofSnapshotChangeCount:
              snapshotEvidence.snapshot.changeCount ?? 0,
            proofSnapshotChangesTruncated:
              snapshotEvidence.snapshot.changesTruncated ?? false,
          }
        : { proofSnapshotError: snapshotEvidence.error }),
    };
    const schemaStatus = readMigrationConfigStatus(context.workspaceRoot);
    // A schema upgrade plans the source rewrites kibi migrate performs with
    // it; the planner loads only when an upgrade is due.
    const sourcePlanner = schemaStatus.needsMigration
      ? (await import("../../operations/migration/schema6.js"))
          .buildSchema6MigrationFragment
      : undefined;
    const migrationPlan = buildActionsFromStatus({
      workspaceRoot: context.workspaceRoot,
      branchAttachment: attachment,
      branchStore: store,
      staleReasons,
      proofSnapshotAvailable: snapshotEvidence.available,
      ...(snapshotEvidence.available
        ? { proofSnapshotDirty: snapshotEvidence.snapshot.dirty }
        : {}),
      kbSnapshotId: payload.snapshotId,
      workspaceSnapshot: snapshotEvidence.available
        ? snapshotEvidence.snapshot.hash
        : null,
      configStatus: schemaStatus,
      ...(sourcePlanner !== undefined
        ? {
            planSchemaUpgradeSources: (currentSchemaVersion: number | null) =>
              sourcePlanner({
                workspaceRoot: context.workspaceRoot,
                currentSchemaVersion,
              }),
          }
        : {}),
    });
    const listed = context.fs?.glob
      ? await context.fs.glob(
          [
            ".kb/requirements/**/*.md",
            ".kb/scenarios/**/*.md",
            ".kb/tests/**/*.md",
            ".kb/adrs/**/*.md",
            ".kb/adr/**/*.md",
            ".kb/flags/**/*.md",
            ".kb/events/**/*.md",
            ".kb/facts/**/*.md",
          ],
          { cwd: context.workspaceRoot },
        )
      : [];
    const bootstrapSourceFiles = Array.isArray(listed) ? listed : [];
    const bootstrapActivation = await classifyActivation(
      context,
      bootstrapSourceFiles,
    );
    const incompleteApplications: Readonly<Record<string, unknown>>[] = [];
    if (context.fs?.glob) {
      // Scope the scan to recovery itself: workspace globs intentionally exclude
      // compiled and recovery internals from source discovery.
      const recoveryRoot = path.join(context.workspaceRoot, ".kb", "recovery");
      const journals = await context.fs.glob(["bootstrap-*.json"], {
        cwd: recoveryRoot,
      });
      for (const journalPath of journals) {
        try {
          const journal = JSON.parse(
            await context.fs.readFile(path.resolve(recoveryRoot, journalPath)),
          );
          if (
            journal.kind === "bootstrap" &&
            ["rejected", "repair_required", "applying"].includes(journal.state)
          )
            incompleteApplications.push({
              journalId: path.basename(journalPath, ".json"),
              state: journal.state,
              appliedActions:
                journal.results?.filter(
                  (row: { outcome?: string }) => row.outcome === "applied",
                ).length ?? 0,
              failedActions:
                journal.results?.filter(
                  (row: { outcome?: string }) => row.outcome === "failed",
                ) ?? [],
              nextOperation:
                journal.state === "rejected"
                  ? "kb_plan_bootstrap"
                  : "kb_apply_plan",
            });
        } catch (error) {
          incompleteApplications.push({
            journalId: path.basename(journalPath, ".json"),
            state: "unreadable",
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    const statusWithPlan: StatusPayload = {
      ...enrichedPayload,
      schemaStatus,
      migrationPlan,
      bootstrap: {
        ...(incompleteApplications.length > 0
          ? { incompleteApplications }
          : {}),
        activationState: bootstrapActivation.activationState,
        activationMode: bootstrapActivation.activationMode,
        planEligible:
          bootstrapActivation.activationState === "root_active_thin" &&
          !bootstrapActivation.applyBlocked,
        reason: bootstrapActivation.reason,
        nextAction:
          bootstrapActivation.nextOperation !== undefined
            ? {
                operation: bootstrapActivation.nextOperation,
                reason: bootstrapActivation.reason,
                required: true,
              }
            : bootstrapActivation.activationState === "root_uninitialized"
              ? {
                  operation: "kibi init",
                  reason: bootstrapActivation.reason,
                  required: true,
                }
              : bootstrapActivation.activationState === "root_partial"
                ? {
                    operation: "kibi doctor",
                    reason: bootstrapActivation.reason,
                    required: true,
                  }
                : bootstrapActivation.activationState === "vendored_only"
                  ? {
                      operation: "move-to-project-root",
                      reason: bootstrapActivation.reason,
                      required: true,
                    }
                  : bootstrapActivation.activationState === "root_active_thin"
                    ? {
                        operation: "kb_plan_bootstrap",
                        reason: bootstrapActivation.reason,
                        required: true,
                      }
                    : {
                        operation: "continue-kibi-workflow",
                        reason: bootstrapActivation.reason,
                        required: false,
                      },
      },
    };
    return {
      content: [
        {
          type: "text",
          text: `Branch ${payload.branch} is ${enrichedPayload.syncState} (snapshot ${payload.snapshotId}, dirty=${enrichedPayload.dirty}, proofSnapshot=${enrichedPayload.proofSnapshot})${storeUncompiled ? `. Blocking: ${String((storeReason as NonNullable<typeof storeReason>).detail)} Run kibi sync.` : ""}${notices.map((notice) => `. Note: ${String(notice.detail)}`).join("")}`,
        },
      ],
      structuredContent: statusWithPlan,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Status execution failed: ${message}`);
  }
}
