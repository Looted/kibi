import { readFile } from "node:fs/promises";
import path from "node:path";
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
  questionPaths,
  validateIntentSearchInput,
} from "../../intent-search.js";
import { classifyActivation } from "../../operations/bootstrap/activation.js";
import { SwiplResolutionError } from "../../prolog/swipl-resolver.js";
import { type SearchAnswer, buildSearchAnswer } from "../../search-answer.js";
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
  uncompiledBranchStoreReason,
} from "../../utils/branch-store.js";
import { confirmSourceNewerReasons } from "../../utils/content-freshness.js";
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
  mode: "predicate" | "property" | "schemas" | "fact_kind";
  predicate?: Record<string, unknown>;
  property?: Record<string, unknown>;
  factKind?: string;
  schema?: Record<string, unknown> | null;
  subjectFacts?: readonly string[];
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
  /** The Kibi branch whose store was searched, when the runtime attached one. */
  readonly branch?: string | null;
  /** Present when the searched store was never compiled for this branch. */
  readonly branchStore?: SearchBranchStoreNotice;
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
// implements REQ-cli-status-pre-first-sync, REQ-mcp-search-discovery
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
  if (value === null || typeof value !== "object") return false;
  const record = Object.fromEntries(Object.entries(value));
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
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${field} must be one of: ${allowed.join(", ")}.`);
  }
  return value as T;
}

/**
 * Builds the Prolog argument spec of a predicate question. Named `where`
 * entries are resolved against the predicate's declared argument names in
 * Prolog; positional `args` use `null` as a wildcard.
 */
// implements REQ-kibi-query-fact-filters
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
// implements REQ-kibi-query-fact-filters
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
      const filters = {
        predicate: input.predicate,
        ...(input.namespace !== undefined
          ? { namespace: input.namespace }
          : {}),
        ...(input.where !== undefined ? { where: input.where } : {}),
        ...(input.args !== undefined ? { args: input.args } : {}),
        ...(input.polarity !== undefined ? { polarity: input.polarity } : {}),
        ...(input.scope !== undefined ? { scope: input.scope } : {}),
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
      const bound = new Set(Object.keys(input.where ?? {}));
      const free = names.filter((name) => !bound.has(name));
      if (
        input.distinct === undefined &&
        response.count > 0 &&
        free.length > 0
      ) {
        const argument = free[free.length - 1] ?? free[0];
        next.push({
          call: callText({ ...filters, distinct: argument }),
          why: `count the distinct values of '${argument}' across these facts`,
        });
      }
      if (
        response.count === 0 &&
        response.suggestions &&
        typeof response.suggestions === "object" &&
        (response.warnings ?? []).length === 0
      ) {
        // Suggest a correction only for an argument whose requested value
        // does not exist; a key whose value exists is not the cause.
        for (const [key, values] of Object.entries(response.suggestions)) {
          if (!Array.isArray(values)) continue;
          const requested = input.where?.[key];
          if (requested !== undefined && values.includes(requested)) continue;
          const value = values[0];
          if (typeof value === "string") {
            next.push({
              call: callText({
                ...filters,
                where: { ...(input.where ?? {}), [key]: value },
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
// implements REQ-kibi-query-fact-filters
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
    next: factQueryNext(input, { ...response, rows, count }),
  };
  const subject =
    response.mode === "predicate"
      ? `${String(input.predicate)} facts`
      : response.mode === "property"
        ? `properties of ${String(input.subjectKey)}`
        : response.mode === "schemas"
          ? "predicate schemas"
          : `${String(factKind)} facts`;
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
  ];
  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: { entities: rows, count, factQuery },
  };
}

export async function executeQuery(
  input: QueryInput,
  context: OperationContext,
): Promise<OperationResult<QueryPayload>> {
  // implements REQ-kibi-operation-interface-parity
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
    // implements REQ-kb-decision-firmness, REQ-kb-decision-firmness-from-origin
    const paginated = indexedPage.entities.map((entity) => {
      const firmness = effectiveFirmness(
        entity.type,
        entity.firmness,
        entity.origin,
      );
      return firmness === undefined || entity.firmness === firmness
        ? entity
        : { ...entity, firmness };
    });
    // An empty page from a never-compiled store says nothing about the
    // authored entities, so the answer names the store state.
    const storeNotice =
      indexedPage.count === 0 ? uncompiledSearchNotice(context) : null;
    const text =
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
    const body =
      input.includeBody === true && id !== undefined
        ? await readQueryBody(
            id,
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
// implements REQ-kibi-operation-interface-parity
async function readQueryBody(
  id: string,
  entity: Readonly<Record<string, unknown>> | undefined,
  context: OperationContext,
): Promise<QueryBody> {
  const source = typeof entity?.source === "string" ? entity.source : "";
  const relative = source.split("#", 1)[0]?.trim() ?? "";
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
        : await readFile(resolved, "utf8"),
    );
  } catch {
    return { id, path: bodyPath, text: null };
  }
  const authored = readAuthoredEntity(raw, bodyPath)?.body;
  if (authored === undefined || authored === null) {
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

function summarizeMatch<TMatch extends { readonly entity: unknown }>(
  match: TMatch,
): TMatch {
  const entity = match.entity;
  if (entity === null || typeof entity !== "object" || Array.isArray(entity)) {
    return match;
  }
  const row = entity as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  for (const field of SUMMARY_ENTITY_FIELDS) {
    if (row[field] !== undefined) summary[field] = row[field];
  }
  return { ...match, entity: summary };
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
function questionPathHint(
  query: string,
  locations: readonly SourceLocation[] | undefined,
): string {
  const located = new Set(
    (locations ?? []).map((location) => location.path.replace(/^\.\//, "")),
  );
  const named = questionPaths(query).filter((file) => !located.has(file));
  if (named.length === 0) return "";
  const list = named.join(", ");
  return named.length === 1
    ? ` The question names ${list}; its words were left out of the topic. Pass it as sourceLocations to also see the requirements linked to that file.`
    : ` The question names ${list}; their words were left out of the topic. Pass them as sourceLocations to also see the requirements linked to those files.`;
}

/**
 * Hints from the workspace's kibi.search-hints.v1 provider. A host without a
 * plugin runtime, or a registry that fails to load, gives no hints rather than
 * failing the search.
 */
// implements REQ-kibi-search-hints-host
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

export async function executeSearch(
  input: SearchInput,
  context: OperationContext,
): Promise<OperationResult<SearchPayload>> {
  // implements REQ-kibi-operation-interface-parity, REQ-mcp-search-discovery
  const {
    query,
    type,
    limit = 10,
    offset = 0,
    rankingMode = "intent-v1",
    semanticFacets,
    sourceLocations,
    minScore,
    fields = "summary",
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
      // The answer layer summarizes the whole ranking, so it belongs to the
      // first page only.
      const answerLayer =
        (answer ?? true) && offset === 0 && intentResult.matches.length > 0
          ? await buildSearchAnswer(prolog, intentResult.matches, {
              workspaceRoot: context.workspaceRoot,
              branch: context.branchAttachment?.kbBranch ?? null,
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
      const text = `${
        intentResult.matches.length === 0
          ? `No intent search results for '${trimmedQuery}' (abstained). No entity shares enough of the question's words: ask again in the words and language the KB is written in, or pass sourceLocations.`
          : `Found ${intentResult.matches.length} intent search results for '${trimmedQuery}'${intentResult.analysis.ambiguous ? " (top matches are close; confirm before relying on one)" : ""}. Top: ${paginated
              .slice(0, 5)
              .map((match) => String(match.entity.id ?? ""))
              .join(
                ", ",
              )}${answerLayer ? `. Governing: ${answerLayer.governing.map((req) => req.id).join(", ") || "none found"}` : ""}${topUngoverned ? ` (the top match ${topUngoverned.id} is linked to no requirement)` : ""}.`
      }${searchHintsNote(hints)}${questionPathHint(trimmedQuery, sourceLocations)}${CONTRADICTION_QUESTION.test(trimmedQuery) ? CONTRADICTION_HINT : ""}${storeNote}`;
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          results: await projectMatches(prolog, paginated, fields),
          count: intentResult.matches.length,
          returned: paginated.length,
          truncated: offset + paginated.length < intentResult.matches.length,
          queryAnalysis:
            hints !== undefined
              ? { ...intentResult.analysis, hints }
              : intentResult.analysis,
          ...(answerLayer ? { answer: answerLayer } : {}),
          ...branchFields,
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
    const text = `${
      matches.length === 0
        ? `No search results for '${trimmedQuery}'.`
        : `Found ${matches.length} search results for '${trimmedQuery}'. Showing ${paginated.length} (offset ${offset}, limit ${limit}): ${paginated
            .map(
              (match) =>
                `${String(match.entity.id ?? "")} [${match.reasons.join(", ")}]`,
            )
            .join(", ")}`
    }${storeNote}`;
    return {
      content: [{ type: "text", text }],
      structuredContent: {
        results: await projectMatches(prolog, paginated, fields),
        count: matches.length,
        returned: paginated.length,
        truncated: offset + paginated.length < matches.length,
        ...branchFields,
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
  // implements REQ-kibi-operation-interface-parity, REQ-cli-status-pre-first-sync
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
        staleReasonsTruncated: false,
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
          staleReasonsTruncated: false,
        };
      } finally {
        await ownedEngine?.terminate();
      }
    const snapshotEvidence = await readWorkspaceSnapshot(context);
    // implements REQ-cli-status-pre-first-sync
    // Prolog compares file times only. A fresh clone or a checkout rewrites
    // every mtime without changing a byte, so confirm each "newer" source
    // against the content hashes the last compilation recorded.
    const prologReasons = payload.staleReasons ?? [];
    const confirmed = confirmSourceNewerReasons(
      context.workspaceRoot,
      store.path,
      prologReasons,
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
    // implements REQ-cli-status-pre-first-sync
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
    // implements REQ-core-journaled-engine-persistence
    // A stale-lock takeover heals itself; report it without making the KB stale.
    const takeoverNotice = storeLockTakeoverReason(store.path);
    const compilerReason = compilerFingerprintReason(store.path);
    // implements REQ-kibi-uncompiled-source-visibility
    // A source the last sync could not extract is missing from the store
    // even when every compiled file is current.
    const extractionReasons =
      store.state === "healthy"
        ? sourceExtractionFailureReasons(context.workspaceRoot, store.path)
        : [];
    const engineReason = engineStatus
      ? {
          code: engineStatus.errorCode ?? "engine_status_unavailable",
          path: store.path,
          entityIds: [],
          detail:
            engineStatus.detail ??
            "The branch store is structurally readable but the engine status response is unavailable.",
          // implements REQ-prolog-doctor-runtime-report
          // A missing or unusable SWI-Prolog is not fixed by restarting the
          // engine; point at the diagnostic that reports the resolution.
          remediation: {
            command_argv: engineStatus.errorCode?.startsWith("swipl_")
              ? ["kibi", "doctor"]
              : ["kibi", "engine", "stop"],
            applyRequired: false,
          },
        }
      : null;
    const staleReasons = [
      ...existingReasons,
      ...(storeReason ? [storeReason] : []),
      ...(lockReason ? [lockReason] : []),
      ...(compilerReason ? [compilerReason] : []),
      ...extractionReasons,
      ...(engineReason ? [engineReason] : []),
    ].sort((left, right) =>
      String(left.path ?? "").localeCompare(String(right.path ?? "")),
    );
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
      // A missing or empty store has no stale file to report, yet nothing in
      // it is current: the authored sources were never compiled. (A missing
      // store without authored sources, and an unreadable or incomplete one,
      // stay "unknown".)
      ...(storeUncompiled ? { syncState: "stale", dirty: true } : {}),
      branchAttachment: attachment,
      branchStore: store,
      ...(takeoverNotice ? { notices: [takeoverNotice] } : {}),
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
    // implements REQ-agent-guided-migration-orchestration
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
              appliedActions: (journal.results ?? []).filter(
                (row: { outcome?: string }) => row.outcome === "applied",
              ).length,
              failedActions: (journal.results ?? []).filter(
                (row: { outcome?: string }) => row.outcome === "failed",
              ),
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
        // implements REQ-legacy-kb-first-step-migrate
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
          text: `Branch ${payload.branch} is ${enrichedPayload.syncState} (snapshot ${payload.snapshotId}, dirty=${enrichedPayload.dirty}, proofSnapshot=${enrichedPayload.proofSnapshot})${storeUncompiled ? `. Blocking: ${String(storeReason?.detail)} Run kibi sync.` : ""}${takeoverNotice ? `. Note: ${String(takeoverNotice.detail)}` : ""}`,
        },
      ],
      structuredContent: statusWithPlan,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Status execution failed: ${message}`);
  }
}
