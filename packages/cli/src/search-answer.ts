import { type Firmness, effectiveFirmness } from "./decision-firmness.js";
import type { IntentSearchMatch } from "./intent-search.js";
import {
  escapeAtom,
  normalizeEntityId,
  parseAtomList,
  parseEntityFromList,
  parseListOfLists,
  parseTriples,
} from "./prolog/codec.js";
import { isProvenanceStub } from "./provenance-stub.js";
import { entityRowsGoal } from "./public/operations/discovery-entities.js";
import { runOperationJsonQuery } from "./public/operations/prolog-json.js";
import type {
  PrologPort,
  PrologQueryResult,
} from "./public/operations/runtime-types.js";
import { loadMarkdownBody } from "./search-ranking.js";

// implements REQ-kibi-search-answer-layer-v2
/**
 * The answer layer turns ranked matches into what an agent asking "what
 * governs this?" needs: the current requirements that apply, why (ADRs, with
 * an excerpt of their decision), what must stay true (linked facts), what
 * verifies it (scenarios and tests), what the existing checks say about it
 * (contradiction and scenario-feasibility witnesses, exceptions, and what is
 * still unknown), and the KB snapshot the answer was computed from.
 * Superseded or deprecated requirements are listed separately so they are
 * never read as current policy, and observation facts are labelled as notes,
 * not rules. Tests are collected through the canonical
 * REQ -specified_by-> SCEN -verified_by-> TEST path as well as direct
 * requirement links, and each says how it was reached. Graph links are
 * discovery, not proof, and a verdict of `none` means no check named the
 * requirement, not that it is proven.
 */
export type SearchAnswerEntity = Readonly<{
  id: string;
  title: string;
  status?: string;
  /**
   * Requirements and ADRs: how firmly the decision was made. `firm` (a human
   * stated it; ask before changing), `default` (supersede it with evidence),
   * `exploratory` (a guess to revisit).
   */
  firmness?: Firmness;
}>;

/**
 * A test verifying a governing requirement. `via` is `"direct"` for a test
 * linked to the requirement itself, or the id of the scenario it verifies.
 */
// implements REQ-kibi-search-answer-layer-v2
export type SearchAnswerTest = SearchAnswerEntity & Readonly<{ via: string }>;

/** An ADR with the opening of its decision (or rationale) section. */
// implements REQ-kibi-search-answer-layer-v2
export type SearchAnswerRationale = SearchAnswerEntity &
  Readonly<{ source?: string; excerpt?: string }>;

/** A blocking finding of an existing check that names the requirement. */
// implements REQ-kibi-search-answer-layer-v2
export type SearchAnswerWitness = Readonly<{
  check: "domain-contradictions" | "scenario-feasibility";
  status: "contradiction" | "infeasible";
  /** The other requirement in a contradiction, or the forbidding one. */
  with?: string;
  scenario?: string;
  facts: readonly string[];
  detail: string;
}>;

/**
 * What the checks could not decide for the requirement: rule overlaps they
 * could not classify, scenarios whose feasibility is unknown, propositions
 * still ambiguous or ontology gaps, a missing clause ledger, or a verdict
 * that could not be computed.
 */
// implements REQ-kibi-search-answer-layer-v2
export type SearchAnswerUnknown = Readonly<{
  kind:
    | "contradiction_unresolved"
    | "feasibility_unknown"
    | "unresolved_proposition"
    | "analysis_incomplete"
    | "verdict_unavailable";
  detail: string;
  entities: readonly string[];
}>;

// implements REQ-kibi-search-answer-layer-v2
export type SearchAnswerVerdict = Readonly<{
  /**
   * The worst finding: `contradiction` or `infeasible` when a blocking
   * witness exists, `unknown` when only unknowns remain, `none` when no
   * check named the requirement (absence of a witness is not proof).
   */
  status: "contradiction" | "infeasible" | "unknown" | "none";
  witnesses: readonly SearchAnswerWitness[];
}>;

/** A requirement that `exempts` the governing one. */
// implements REQ-kibi-search-answer-layer-v2
export type SearchAnswerException = SearchAnswerEntity &
  Readonly<{ approvedBy?: string }>;

/**
 * A linked fact says what it states in its typed form, so an agent can read
 * `has_role(alice, admin)` or `user.role_assignment max_roles lte 2` without
 * opening the entity, and `ask` is the kb_query that reproduces the fact's
 * own tuple as precisely as kb_query supports: a property or subject fact by
 * its keys; a predicate fact by name plus, when a project `predicate_schema`
 * or the built-in signature declares its arguments, `where` over the key
 * arguments (the declared `key_arguments`, else the argument named `subject`,
 * else the first), otherwise its full positional `args`. Pasted, it returns
 * the fact and only facts sharing those key arguments.
 */
// implements REQ-kibi-query-fact-filters
export type SearchAnswerFact = SearchAnswerEntity &
  Readonly<{ factKind?: string; claim?: string; ask?: string }>;

// implements REQ-kibi-search-answer-layer-v2
export type SearchAnswerRequirement = SearchAnswerEntity &
  Readonly<{
    score: number;
    via: string;
    facts: readonly SearchAnswerFact[];
    /**
     * Linked facts the answer left out (over the per-requirement limit or
     * cut to fit the byte budget) and the kb_query that lists them all.
     */
    moreFacts?: Readonly<{ count: number; ask: string }>;
    scenarios: readonly SearchAnswerEntity[];
    tests: readonly SearchAnswerTest[];
    adrs: readonly SearchAnswerEntity[];
    verdict: SearchAnswerVerdict;
    exceptions: readonly SearchAnswerException[];
    unknowns: readonly SearchAnswerUnknown[];
  }>;

/** The KB the answer was computed from. */
// implements REQ-kibi-search-answer-layer-v2
export type SearchAnswerScope = Readonly<{
  branch: string | null;
  snapshotId: string;
  syncedAt: string | null;
}>;

/**
 * A matched fact, scenario, test or symbol that no requirement owns, with
 * its 1-based `rank` in the search results. When the top-ranked match is
 * here, the governing list was reached through lower-ranked matches, and
 * the answer says so instead of presenting those requirements as the top
 * match's.
 */
// implements REQ-search-answer-hygiene
export type SearchAnswerUngoverned = SearchAnswerFact &
  Readonly<{
    type: string;
    rank: number;
    /**
     * The governing requirement's fact on the same predicate and key
     * arguments that this unlinked fact disagrees with; that fact holds.
     */
    overriddenBy?: Readonly<{
      fact: string;
      requirement: string;
      claim?: string;
    }>;
  }>;

// implements REQ-kibi-search-answer-layer-v2, REQ-search-answer-hygiene
export type SearchAnswer = Readonly<{
  version: "kibi.search-answer.v1";
  governing: readonly SearchAnswerRequirement[];
  rationale: readonly SearchAnswerRationale[];
  notGoverning: readonly (SearchAnswerEntity & { supersededBy?: string })[];
  observations: readonly SearchAnswerEntity[];
  ungoverned: readonly SearchAnswerUngoverned[];
  scope: SearchAnswerScope;
  truncated: boolean;
  note: string;
}>;

// implements REQ-kibi-search-answer-layer-v2
export type SearchAnswerOptions = Readonly<{
  /** Root that ADR sources resolve against; without it no excerpts. */
  workspaceRoot?: string;
  /** The Git branch identity of the attached KB. */
  branch?: string | null;
}>;

const CURRENT_REQ_STATUSES = new Set([
  "open",
  "in_progress",
  "closed",
  "active",
  "approved",
]);
const SUPERSEDED_ADR_STATUSES = new Set([
  "superseded",
  "deprecated",
  "rejected",
]);
const ANSWER_RELATIONSHIPS = [
  "specified_by",
  "verified_by",
  "validates",
  "implements",
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
  "supersedes",
  "relates_to",
  "exempts",
] as const;
const FACT_LINKS = new Set([
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
]);
/** Properties the answer reads from a linked entity. */
const ROW_KEYS = [
  "id",
  "title",
  "status",
  "fact_kind",
  "approved_by",
  "firmness",
  "origin",
  "source",
  "sourceFile",
  "predicate_namespace",
  "predicate_name",
  "predicate_args",
  "polarity",
  "subject_key",
  "property_key",
  "operator",
  "value_type",
  "value_string",
  "value_int",
  "value_number",
  "value_bool",
  "value_set",
  "unit",
] as const;

// implements REQ-kibi-search-answer-layer-v2
export const SEARCH_ANSWER_LIMITS = {
  seeds: 10,
  governing: 5,
  perRequirement: 4,
  /**
   * Linked facts listed per governing requirement. Facts are what an answer
   * states, so a requirement with several clauses keeps more of them than
   * of its scenarios or tests.
   */
  factsPerRequirement: 8,
  rationale: 3,
  notGoverning: 5,
  observations: 3,
  ungoverned: 5,
  /** Entity rows loaded per answer, the matched seeds included. */
  entityLoads: 70,
  maxBytes: 16_384,
  /** Title length (characters) kept when an answer must shrink to fit. */
  titleChars: 160,
  /** Characters of an ADR decision kept as its excerpt. */
  excerptChars: 280,
  /** Characters of a witness or unknown detail kept. */
  detailChars: 240,
} as const;

type Edge = Readonly<{ rel: string; from: string; to: string }>;
type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id) => id.length > 0))];
}

function brief(entity: Row): SearchAnswerEntity {
  const status = text(entity.status);
  const firmness = effectiveFirmness(
    entity.type,
    entity.firmness,
    entity.origin,
  );
  return {
    id: text(entity.id),
    title: text(entity.title),
    ...(status ? { status } : {}),
    ...(firmness ? { firmness } : {}),
  };
}

function queryCall(args: Record<string, unknown>): string {
  return `kb_query(${JSON.stringify(args)})`;
}

/**
 * The declared arguments of a predicate fact's schema: a project
 * `predicate_schema` or the built-in signature kb_query resolves `where`
 * names against. `keyArguments` is empty when the schema declares none.
 */
// implements REQ-kibi-query-fact-filters
export type PredicateFactSchema = Readonly<{
  argumentNames: readonly string[];
  keyArguments: readonly string[];
}>;

/**
 * The `where` filter that selects the facts sharing a predicate fact's key
 * arguments: the schema's `key_arguments`, else the argument named `subject`,
 * else the first argument. Undefined when the schema does not fit the fact
 * (arity) or no key argument has a value, so the caller falls back to
 * positional args.
 */
// implements REQ-kibi-query-fact-filters
export function predicateKeyFilter(
  args: readonly string[],
  schema: PredicateFactSchema,
): Record<string, string> | undefined {
  const names = schema.argumentNames;
  if (names.length === 0 || names.length !== args.length) return undefined;
  const declared = schema.keyArguments.filter((key) => names.includes(key));
  const keys =
    declared.length > 0
      ? declared
      : [names.includes("subject") ? "subject" : (names[0] as string)];
  const where: Record<string, string> = {};
  for (const key of keys) {
    const value = args[names.indexOf(key)] ?? "";
    if (value !== "") where[key] = value;
  }
  return Object.keys(where).length > 0 ? where : undefined;
}

/**
 * Whether two predicate facts state the same predicate, namespace and key
 * arguments with other values or polarity. Without declared key arguments
 * two tuples may both hold (alice has two roles), so no pair is claimed.
 */
// implements REQ-search-answer-hygiene
function disagreeingPredicateFacts(
  left: Row,
  right: Row,
  schema: PredicateFactSchema | undefined,
): boolean {
  if (
    schema === undefined ||
    !schema.keyArguments.some((key) => schema.argumentNames.includes(key))
  )
    return false;
  if (text(left.fact_kind) !== "predicate") return false;
  if (text(right.fact_kind) !== "predicate") return false;
  if (text(left.predicate_name) !== text(right.predicate_name)) return false;
  const namespace = (row: Row) => text(row.predicate_namespace) || "default";
  if (namespace(left) !== namespace(right)) return false;
  const argsOf = (row: Row) =>
    Array.isArray(row.predicate_args) ? row.predicate_args.map(text) : [];
  const leftArgs = argsOf(left);
  const rightArgs = argsOf(right);
  const leftKey = predicateKeyFilter(leftArgs, schema);
  const rightKey = predicateKeyFilter(rightArgs, schema);
  if (leftKey === undefined || rightKey === undefined) return false;
  if (JSON.stringify(leftKey) !== JSON.stringify(rightKey)) return false;
  const deny = (row: Row) => text(row.polarity) === "deny";
  return (
    deny(left) !== deny(right) ||
    leftArgs.some((value, index) => value !== rightArgs[index])
  );
}

/** Typed statement and follow-up query of a linked fact, by fact kind. */
// implements REQ-kibi-query-fact-filters
function factDetail(
  fact: Row,
  schema?: PredicateFactSchema,
): Omit<SearchAnswerFact, keyof SearchAnswerEntity> {
  const factKind = text(fact.fact_kind);
  const base = factKind ? { factKind } : {};
  const predicate = text(fact.predicate_name);
  if (factKind === "predicate" && predicate) {
    const args = Array.isArray(fact.predicate_args)
      ? fact.predicate_args.map(text)
      : undefined;
    const polarity = text(fact.polarity) === "deny" ? " [deny]" : "";
    const namespace = text(fact.predicate_namespace);
    const call: Record<string, unknown> = {
      predicate,
      ...(namespace && namespace !== "default" ? { namespace } : {}),
    };
    if (args !== undefined && args.length > 0) {
      const where = schema ? predicateKeyFilter(args, schema) : undefined;
      if (where) call.where = where;
      else call.args = args.map((value) => (value === "" ? null : value));
    }
    return {
      ...base,
      claim: `${predicate}(${args?.join(", ") ?? text(fact.predicate_args)})${polarity}`,
      ask: queryCall(call),
    };
  }
  const subjectKey = text(fact.subject_key);
  const propertyKey = text(fact.property_key);
  if (factKind === "property_value" && subjectKey && propertyKey) {
    const unit = text(fact.unit);
    const valueType = text(fact.value_type) || "string";
    const value = text(fact[`value_${valueType}`]);
    const claim = `${subjectKey} ${propertyKey} ${text(fact.operator) || "eq"} ${value}${unit ? ` ${unit}` : ""}`;
    return { ...base, claim, ask: queryCall({ subjectKey, propertyKey }) };
  }
  if (factKind === "subject" && subjectKey) {
    return { ...base, claim: subjectKey, ask: queryCall({ subjectKey }) };
  }
  return base;
}

function edgesGoal(ids: readonly string[]): string {
  const idList = ids.map((id) => `'${escapeAtom(id)}'`).join(",");
  return `findall([Rel,From,To], (member(Rel, [${ANSWER_RELATIONSHIPS.join(",")}]), kb_relationship(Rel, From, To), (member(From, [${idList}]); member(To, [${idList}]))), Edges)`;
}

/**
 * For each predicate fact among `ids`, the argument names and key arguments
 * of the schema kb_query resolves its `where` names against: the project
 * `predicate_schema` of its namespace and name, else the built-in signature.
 * Facts of other kinds, and predicates without a schema, yield no row.
 */
// implements REQ-kibi-query-fact-filters
function factSchemasGoal(ids: readonly string[]): string {
  const idList = ids.map((id) => `'${escapeAtom(id)}'`).join(",");
  return `findall([FactId,Names,Keys], (member(FactId, [${idList}]), kb:predicate_fact(FactId, Ns, Name, _, _), ((kb:predicate_schema(SchemaId, Ns, Name, _, Names, _) -> ((kb_entity(SchemaId, fact, Props), memberchk(key_arguments=KeysRaw, Props), kb:normalize_term_atom_list(KeysRaw, Keys)) -> true ; Keys = [])) ; (kb:builtin_decision_predicate(Ns, Name, _, KeyPositions, _), kb:builtin_predicate_signature(Name, _, Names), findall(Key, (member(P, KeyPositions), nth1(P, Names, Key)), Keys)))), Schemas)`;
}

function parseFactSchemas(
  raw: string | undefined,
): Map<string, PredicateFactSchema> {
  const schemas = new Map<string, PredicateFactSchema>();
  for (const [id, names, keys] of parseTriples(raw ?? "[]")) {
    schemas.set(normalizeEntityId(id), {
      argumentNames: parseAtomList(names),
      keyArguments: parseAtomList(keys),
    });
  }
  return schemas;
}

/**
 * The part of the KB graph the answer reads, fetched in batches: each
 * `fetch` is one engine round trip for every id whose edges or row are not
 * known yet. Answering used to cost one round trip per edge hop and per
 * linked entity; on a journaled engine each costs a polling interval, which
 * made a warm search take seconds.
 */
class AnswerGraph {
  private readonly edgesById = new Map<string, Edge[]>();
  private readonly rows = new Map<string, Row | null>();
  private rowLoads = 0;
  truncated = false;

  constructor(
    private readonly prolog: Pick<PrologPort, "query">,
    private readonly rowBudget: number,
  ) {}

  seed(entity: Row): void {
    const id = text(entity.id);
    if (id) this.rows.set(id, { ...entity });
  }

  row(id: string): Row | null {
    return this.rows.get(id) ?? null;
  }

  /** Edges touching any of `ids` that were fetched, without duplicates. */
  edgesOf(ids: readonly string[]): Edge[] {
    const seen = new Set<string>();
    const edges: Edge[] = [];
    for (const id of ids) {
      for (const edge of this.edgesById.get(id) ?? []) {
        const key = `${edge.rel}|${edge.from}|${edge.to}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push(edge);
      }
    }
    return edges;
  }

  /**
   * Fetch missing edges and rows in one query. `alsoGoal` is conjoined so a
   * further lookup shares the round trip; its bindings are returned.
   */
  async fetch(
    request: Readonly<{
      edges?: readonly string[];
      rows?: readonly string[];
      alsoGoal?: string;
    }>,
  ): Promise<PrologQueryResult["bindings"]> {
    const edgeIds = unique(request.edges ?? []).filter(
      (id) => !this.edgesById.has(id),
    );
    const wanted = unique(request.rows ?? []).filter(
      (id) => !this.rows.has(id),
    );
    const room = Math.max(0, this.rowBudget - this.rowLoads);
    if (wanted.length > room) this.truncated = true;
    const rowIds = wanted.slice(0, room);
    const goals = [
      ...(edgeIds.length > 0 ? [edgesGoal(edgeIds)] : []),
      ...(rowIds.length > 0 ? [entityRowsGoal(rowIds, ROW_KEYS)] : []),
      ...(request.alsoGoal ? [request.alsoGoal] : []),
    ];
    if (goals.length === 0) return {};
    const result = await this.prolog.query(goals.join(", "));
    if (!result.success) {
      // A failed edge lookup reads as no links, as before batching; a
      // failed entity lookup must not silently drop requirements.
      if (rowIds.length > 0 || request.alsoGoal) {
        throw new Error(result.error || "Search answer graph query failed");
      }
      for (const id of edgeIds) this.edgesById.set(id, []);
      return {};
    }
    if (edgeIds.length > 0) {
      for (const id of edgeIds) this.edgesById.set(id, []);
      for (const [rel, from, to] of parseTriples(
        result.bindings.Edges ?? "[]",
      )) {
        const edge = {
          rel,
          from: normalizeEntityId(from),
          to: normalizeEntityId(to),
        };
        this.edgesById.get(edge.from)?.push(edge);
        if (edge.to !== edge.from) this.edgesById.get(edge.to)?.push(edge);
      }
    }
    if (rowIds.length > 0) {
      this.rowLoads += rowIds.length;
      for (const id of rowIds) this.rows.set(id, null);
      for (const row of parseListOfLists(result.bindings.Results ?? "[]").map(
        parseEntityFromList,
      ))
        this.rows.set(normalizeEntityId(text(row.id)), row);
    }
    return result.bindings;
  }
}

/** Tests that verify a scenario: `verified_by` from it or `validates` into it. */
function scenarioTests(scenarioId: string, edges: readonly Edge[]): string[] {
  const tests: string[] = [];
  for (const edge of edges) {
    if (edge.rel === "verified_by" && edge.from === scenarioId)
      tests.push(edge.to);
    if (edge.rel === "validates" && edge.to === scenarioId)
      tests.push(edge.from);
  }
  return tests;
}

/** Requirement ids a non-requirement entity points back to. */
function owningRequirements(id: string, type: string, edges: readonly Edge[]) {
  const owners: string[] = [];
  for (const edge of edges) {
    if (type === "scenario" && edge.rel === "specified_by" && edge.to === id)
      owners.push(edge.from);
    if (type === "test" && edge.rel === "verified_by" && edge.to === id)
      owners.push(edge.from);
    if (type === "test" && edge.rel === "validates" && edge.from === id)
      owners.push(edge.to);
    if (type === "symbol" && edge.rel === "implements" && edge.from === id)
      owners.push(edge.to);
    if (type === "fact" && FACT_LINKS.has(edge.rel) && edge.to === id)
      owners.push(edge.from);
  }
  return owners;
}

/** Shorten to at most `maxChars` code points, ending with an ellipsis. */
function clip(value: string, maxChars: number): string {
  const chars = Array.from(value);
  if (chars.length <= maxChars) return value;
  return `${chars.slice(0, Math.max(0, maxChars - 1)).join("")}…`;
}

/**
 * The opening sentences of an ADR's Decision section (falling back to
 * Rationale, then to the first prose paragraph), as plain text of at most
 * `maxChars` characters.
 */
// implements REQ-kibi-search-answer-layer-v2
export function adrExcerpt(
  body: string,
  maxChars: number = SEARCH_ANSWER_LIMITS.excerptChars,
): string | undefined {
  const sections = new Map<string, string[]>();
  const preamble: string[] = [];
  let current: string[] = preamble;
  let fenced = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const heading = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      const name = text(heading[1]).toLowerCase();
      current = [];
      if (!sections.has(name)) sections.set(name, current);
      continue;
    }
    current.push(line);
  }
  const named = (pattern: RegExp) =>
    [...sections.entries()].find(
      ([name, lines]) => pattern.test(name) && lines.join("").trim() !== "",
    )?.[1];
  const lines =
    named(/^decision\b/) ??
    named(/^rationale\b/) ??
    (preamble.join("").trim() !== ""
      ? preamble
      : [...sections.values()].find((section) => section.join("").trim()));
  if (!lines) return undefined;
  const prose = lines
    .map((line) =>
      line
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")
        .replace(/^\s*>\s?/, "")
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\*\*|__|`/g, "")
        .trim(),
    )
    .filter((line) => line !== "" && !/^\|/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!prose) return undefined;
  const sentences = prose.split(/(?<=[.!?])\s+/);
  let excerpt = "";
  for (const sentence of sentences) {
    const next = `${excerpt} ${sentence.trim()}`.trim();
    if (excerpt !== "" && Array.from(next).length > maxChars) break;
    excerpt = next;
  }
  return clip(excerpt, maxChars);
}

async function rationaleOf(
  row: Row,
  workspaceRoot: string | undefined,
  bodies: Map<string, Promise<string | null>>,
): Promise<SearchAnswerRationale> {
  const source = text(row.sourceFile) || text(row.source);
  if (!source) return brief(row);
  let excerpt: string | undefined;
  if (workspaceRoot !== undefined) {
    let body = bodies.get(source);
    if (body === undefined) {
      body = loadMarkdownBody(source, workspaceRoot);
      bodies.set(source, body);
    }
    const markdown = await body;
    excerpt = markdown ? adrExcerpt(markdown) : undefined;
  }
  return {
    ...brief(row),
    source: source.split("#", 1)[0] ?? source,
    ...(excerpt ? { excerpt } : {}),
  };
}

type RawVerdict = Readonly<{
  id?: unknown;
  error?: unknown;
  contradictions?: unknown;
  scenarios?: unknown;
  forbids?: unknown;
  inventory?: unknown;
}>;

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => normalizeEntityId(text(item))).filter(Boolean)
    : [];
}

const FEASIBILITY_UNKNOWN_TEXT: Readonly<Record<string, string>> = {
  no_assumptions:
    "expects success but assumes nothing, so its feasibility against current requirements is unknown",
  unmatched_assumption:
    "expects success but an assumption is not constrained by any current requirement, so its feasibility is unknown",
  incomparable_assumption:
    "expects success but an assumption cannot be compared with the requirement constraint (type or unit differs), so its feasibility is unknown",
  contradictory_assumptions:
    "expects success but its assumptions contradict each other, so the scenario can never happen",
  conflicting_requirements:
    "expects success but the requirements constraining it conflict with each other, so its feasibility is unknown",
  undecided_rule:
    "expects success but a rule governing it can be neither satisfied nor refuted from its assumptions, so its feasibility is unknown",
  undetermined_validity:
    "expects success but would conflict only with constraints whose validity window may not cover the scenario's time, so its feasibility is unknown",
};

/** Project the Prolog verdict of one requirement onto the answer fields. */
// implements REQ-kibi-search-answer-layer-v2
export function projectVerdict(
  raw: RawVerdict | undefined,
  perRequirement: number = SEARCH_ANSWER_LIMITS.perRequirement,
): {
  verdict: SearchAnswerVerdict;
  unknowns: SearchAnswerUnknown[];
  truncated: boolean;
} {
  const detail = (value: unknown) =>
    clip(text(value), SEARCH_ANSWER_LIMITS.detailChars);
  const witnesses: SearchAnswerWitness[] = [];
  const unknowns: SearchAnswerUnknown[] = [];
  if (raw === undefined || raw.error !== undefined) {
    unknowns.push({
      kind: "verdict_unavailable",
      detail: detail(
        raw?.error !== undefined
          ? `The checks could not be evaluated for this requirement: ${text(raw.error)}`
          : "The checks could not be evaluated for this requirement.",
      ),
      entities: [],
    });
  } else {
    for (const row of records(raw.contradictions)) {
      const other = normalizeEntityId(text(row.with));
      if (text(row.status) === "contradiction") {
        witnesses.push({
          check: "domain-contradictions",
          status: "contradiction",
          ...(other ? { with: other } : {}),
          facts: strings(row.facts),
          detail: detail(row.reason),
        });
      } else {
        unknowns.push({
          kind: "contradiction_unresolved",
          detail: detail(row.reason),
          entities: [other, ...strings(row.facts)].filter(Boolean),
        });
      }
    }
    for (const row of records(raw.scenarios)) {
      const scenario = normalizeEntityId(text(row.scenario));
      const outcome = text(row.outcome);
      if (outcome === "infeasible") {
        const forbidding = normalizeEntityId(text(row.requirement));
        witnesses.push({
          check: "scenario-feasibility",
          status: "infeasible",
          ...(forbidding ? { with: forbidding } : {}),
          scenario,
          facts: [...strings(row.assumed), ...strings(row.fact)],
          detail: detail(row.reason),
        });
      } else if (outcome === "unknown") {
        const reason = text(row.reason);
        unknowns.push({
          kind: "feasibility_unknown",
          detail: detail(
            `${scenario} ${FEASIBILITY_UNKNOWN_TEXT[reason] ?? `has unknown feasibility (${reason})`}`,
          ),
          entities: [scenario, ...strings(row.facts)],
        });
      }
    }
    for (const row of records(raw.forbids)) {
      witnesses.push({
        check: "scenario-feasibility",
        status: "infeasible",
        scenario: normalizeEntityId(text(row.scenario)),
        facts: [...strings(row.assumed), ...strings(row.fact)],
        detail: detail(row.reason),
      });
    }
    const inventory = records([raw.inventory])[0];
    if (inventory !== undefined) {
      for (const claim of records(inventory.unresolved)) {
        unknowns.push({
          kind: "unresolved_proposition",
          detail: detail(`${text(claim.status)}: ${text(claim.claim)}`),
          entities: [],
        });
      }
      if (text(inventory.status) === "missing") {
        unknowns.push({
          kind: "analysis_incomplete",
          detail:
            "The requirement's clause ledger (semantic inventory) is missing or incomplete, so contradiction analysis cannot cover all of its clauses.",
          entities: [],
        });
      }
    }
  }
  const status: SearchAnswerVerdict["status"] = witnesses.some(
    (witness) => witness.status === "contradiction",
  )
    ? "contradiction"
    : witnesses.length > 0
      ? "infeasible"
      : unknowns.length > 0
        ? "unknown"
        : "none";
  // Contradictions first: they block regardless of scenarios.
  witnesses.sort((left, right) =>
    left.status === right.status ? 0 : left.status === "contradiction" ? -1 : 1,
  );
  return {
    verdict: { status, witnesses: witnesses.slice(0, perRequirement) },
    unknowns: unknowns.slice(0, perRequirement),
    truncated:
      witnesses.length > perRequirement || unknowns.length > perRequirement,
  };
}

const UNKNOWN_PROCEDURE = /existence_error|[Uu]nknown procedure|does not exist/;

function decodeJsonBinding(raw: string | undefined): unknown {
  if (raw === undefined) return undefined;
  let parsed: unknown = JSON.parse(raw);
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return parsed;
}

type VerdictPayload = Readonly<{
  requirements?: unknown;
  scope?: { snapshotId?: unknown; syncedAt?: unknown };
}>;

/**
 * Rows the answer still needs plus the verdicts of the governing
 * requirements, sharing one round trip while the discovery module is loaded;
 * otherwise the module is loaded first. A verdict that cannot be computed
 * leaves the answer standing with `verdict_unavailable` unknowns.
 */
async function fetchVerdicts(
  prolog: Pick<PrologPort, "query">,
  graph: AnswerGraph,
  rowIds: readonly string[],
  reqIds: readonly string[],
): Promise<VerdictPayload | undefined> {
  const goal = `discovery:search_answer_verdicts_json([${reqIds.map((id) => `'${escapeAtom(id)}'`).join(",")}], JsonString)`;
  try {
    const bindings = await graph.fetch({ rows: rowIds, alsoGoal: goal });
    return decodeJsonBinding(bindings.JsonString) as VerdictPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await graph.fetch({ rows: rowIds });
    if (!UNKNOWN_PROCEDURE.test(message)) return undefined;
  }
  try {
    return await runOperationJsonQuery<VerdictPayload>(
      prolog as PrologPort,
      "discovery.pl",
      goal,
      "Search answer verdicts",
    );
  } catch {
    return undefined;
  }
}

/**
 * The rows the answer still needs plus the schemas of the predicate facts
 * among `factIds`, in one round trip. A schema lookup the engine cannot run
 * leaves the rows loaded and every ask positional.
 */
// implements REQ-kibi-query-fact-filters
async function fetchFactSchemas(
  graph: AnswerGraph,
  factIds: readonly string[],
  request: Readonly<{ edges: readonly string[]; rows: readonly string[] }>,
): Promise<Map<string, PredicateFactSchema>> {
  if (factIds.length === 0) {
    await graph.fetch(request);
    return new Map();
  }
  try {
    const bindings = await graph.fetch({
      ...request,
      alsoGoal: factSchemasGoal(factIds),
    });
    return parseFactSchemas(bindings.Schemas);
  } catch {
    await graph.fetch(request);
    return new Map();
  }
}

// implements REQ-bootstrap-provenance-stubs
export async function buildSearchAnswer(
  prolog: Pick<PrologPort, "query">,
  matches: readonly IntentSearchMatch[],
  options: SearchAnswerOptions = {},
): Promise<SearchAnswer> {
  const limits = SEARCH_ANSWER_LIMITS;
  const graph = new AnswerGraph(prolog, limits.entityLoads);
  const seeds = matches.slice(0, limits.seeds);
  let truncated = matches.length > limits.seeds;
  const seedIds = seeds.map((match) => text(match.entity.id));
  // Search rows are projected without fact_kind or approved_by, so the
  // matched entities' own rows are loaded with their edges: notes are told
  // apart from rules, and a matched exception keeps its approver. A match
  // the store no longer holds keeps its search row.
  await graph.fetch({ edges: seedIds, rows: seedIds });
  for (const match of seeds)
    if (graph.row(text(match.entity.id)) === null) graph.seed(match.entity);
  const seedEdges = graph.edgesOf(seedIds);

  // Candidate requirements: matched requirements first, then requirements
  // that own a matched scenario, test, symbol or fact.
  const candidates = new Map<string, { score: number; via: string }>();
  const propose = (owner: string, score: number, via: string) => {
    const previous = candidates.get(owner);
    if (!previous || previous.score < score)
      candidates.set(owner, { score, via });
  };
  const observations: SearchAnswerEntity[] = [];
  const ungoverned: SearchAnswerUngoverned[] = [];
  const rationaleRows = new Map<string, Row>();
  // A matched test may verify a scenario rather than a requirement; its
  // targets are resolved to their governing requirements after the loop.
  const testTargets: { id: string; score: number; targets: string[] }[] = [];
  for (const [index, match] of seeds.entries()) {
    const id = text(match.entity.id);
    const entity = graph.row(id) ?? match.entity;
    const type = text(entity.type || match.entity.type);
    if (type === "req") {
      if (!candidates.has(id))
        candidates.set(id, { score: match.score, via: "matched" });
      continue;
    }
    if (type === "adr") {
      if (!SUPERSEDED_ADR_STATUSES.has(text(entity.status)))
        rationaleRows.set(id, entity);
      continue;
    }
    if (type === "fact") {
      // A bootstrap provenance stub records only where an entry came from;
      // it is not a note about the topic. The tag sits on the search row
      // (the projected row carries no tags).
      if (isProvenanceStub(match.entity)) continue;
      const kind = text(entity.fact_kind);
      if (kind === "observation" || kind === "meta") {
        observations.push(brief(entity));
        continue;
      }
    }
    const owners = owningRequirements(id, type, seedEdges);
    if (type === "test") {
      testTargets.push({ id, score: match.score, targets: owners });
      continue;
    }
    if (owners.length === 0 && ["fact", "scenario", "symbol"].includes(type)) {
      // A fact's claim and ask are filled in once its schema is known.
      if (ungoverned.length < limits.ungoverned)
        ungoverned.push({ ...brief(entity), type, rank: index + 1 });
      else truncated = true;
      continue;
    }
    for (const owner of owners)
      propose(owner, match.score * 0.9, `${type} ${id}`);
  }
  const byScore = () =>
    [...candidates.entries()]
      .sort(([, left], [, right]) => right.score - left.score)
      .map(([id]) => id);
  const targetIds = unique(testTargets.flatMap((test) => test.targets));
  // Test targets and the candidates found so far share one round trip.
  await graph.fetch({
    edges: [...targetIds, ...byScore()],
    rows: byScore(),
  });
  const targetEdges = graph.edgesOf(targetIds);
  for (const test of testTargets) {
    if (test.targets.length === 0) {
      const row = graph.row(test.id);
      const rank = seedIds.indexOf(test.id) + 1;
      if (row !== null && ungoverned.length < limits.ungoverned)
        ungoverned.push({ ...brief(row), type: "test", rank });
      else if (row !== null) truncated = true;
      continue;
    }
    for (const target of test.targets) {
      // A target that some requirement specifies is a scenario: lift the
      // test to that requirement. Anything else is a directly verified
      // requirement (non-requirements are filtered when loaded).
      const scenarioOwners = targetEdges
        .filter((edge) => edge.rel === "specified_by" && edge.to === target)
        .map((edge) => edge.from);
      if (scenarioOwners.length === 0) {
        propose(target, test.score * 0.9, `test ${test.id}`);
        continue;
      }
      for (const owner of scenarioOwners)
        propose(owner, test.score * 0.85, `test ${test.id} via ${target}`);
    }
  }

  const supersededBy = new Map<string, string>();
  for (const edge of seedEdges)
    if (edge.rel === "supersedes") supersededBy.set(edge.to, edge.from);
  // A matched requirement that was superseded points at what governs now:
  // follow the chain so the replacement is a candidate too.
  let frontier = byScore();
  for (let hop = 0; hop < 3 && frontier.length > 0; hop += 1) {
    await graph.fetch({ edges: frontier, rows: frontier });
    for (const edge of graph.edgesOf(frontier))
      if (edge.rel === "supersedes") supersededBy.set(edge.to, edge.from);
    const next: string[] = [];
    for (const id of frontier) {
      const replacement = supersededBy.get(id);
      const source = candidates.get(id);
      if (replacement === undefined || source === undefined) continue;
      if (!candidates.has(replacement)) {
        candidates.set(replacement, {
          score: source.score * 0.95,
          via: `supersedes ${id}`,
        });
        next.push(replacement);
      }
    }
    frontier = next;
  }
  // A replacement found on the last hop still needs its row and links, and
  // a replacement that was itself superseded must not read as current.
  if (frontier.length > 0) {
    await graph.fetch({ edges: frontier, rows: frontier });
    for (const edge of graph.edgesOf(frontier))
      if (edge.rel === "supersedes") supersededBy.set(edge.to, edge.from);
  }

  type Chosen = { id: string; entity: Row; score: number; via: string };
  const chosen: Chosen[] = [];
  const notGoverning: (SearchAnswerEntity & { supersededBy?: string })[] = [];
  const ordered = [...candidates.entries()].sort(
    ([leftId, left], [rightId, right]) =>
      right.score - left.score || leftId.localeCompare(rightId),
  );
  for (const [id, candidate] of ordered) {
    const entity = graph.row(id);
    if (!entity || text(entity.type || "req") !== "req") continue;
    const replacement = supersededBy.get(id);
    if (
      replacement !== undefined ||
      !CURRENT_REQ_STATUSES.has(text(entity.status))
    ) {
      if (notGoverning.length < limits.notGoverning)
        notGoverning.push({
          ...brief(entity),
          ...(replacement !== undefined ? { supersededBy: replacement } : {}),
        });
      else truncated = true;
      continue;
    }
    if (chosen.length >= limits.governing) {
      truncated = true;
      continue;
    }
    chosen.push({ id, entity, ...candidate });
  }

  // What each governing requirement links to, from the edges fetched above.
  const firstOf = (ids: readonly string[]) => {
    const distinct = unique(ids);
    if (distinct.length > limits.perRequirement) truncated = true;
    return distinct.slice(0, limits.perRequirement);
  };
  const plans = chosen.map((req) => {
    const edges = graph.edgesOf([req.id]);
    const from = (rel: string) =>
      edges
        .filter((edge) => edge.rel === rel && edge.from === req.id)
        .map((edge) => edge.to);
    const into = (rel: string) =>
      edges
        .filter((edge) => edge.rel === rel && edge.to === req.id)
        .map((edge) => edge.from);
    const scenarioIds = unique(from("specified_by"));
    const traversed = firstOf(scenarioIds);
    // A fact the question matched comes first, then the facts that ground a
    // clause (requires_*) before the subject a requirement constrains: the
    // subject's key is already part of each grounding fact's claim.
    const linked = unique(
      edges
        .filter((edge) => FACT_LINKS.has(edge.rel) && edge.from === req.id)
        .sort(
          (left, right) => factRank(left, seedIds) - factRank(right, seedIds),
        )
        .map((edge) => edge.to),
    );
    if (linked.length > limits.factsPerRequirement) truncated = true;
    return {
      req,
      facts: linked.slice(0, limits.factsPerRequirement),
      factsOmitted: Math.max(0, linked.length - limits.factsPerRequirement),
      scenarios: traversed,
      directTests: unique([...from("verified_by"), ...into("validates")]),
      related: firstOf([...from("relates_to"), ...into("relates_to")]),
      exceptions: firstOf(into("exempts")),
    };
  });
  // The schemas of the linked and ungoverned predicate facts share this
  // round trip, so each fact's ask can name its key arguments.
  const factIds = unique([
    ...ungoverned.filter((entry) => entry.type === "fact").map((e) => e.id),
    ...plans.flatMap((plan) => plan.facts),
  ]);
  const schemas = await fetchFactSchemas(graph, factIds, {
    edges: plans.flatMap((plan) => plan.scenarios),
    rows: plans.flatMap((plan) => [
      ...plan.facts,
      ...plan.scenarios,
      ...plan.related,
      ...plan.exceptions,
      ...plan.directTests.slice(0, limits.perRequirement),
    ]),
  });
  const detailedUngoverned = ungoverned.map((entry) => {
    const row = entry.type === "fact" ? graph.row(entry.id) : null;
    if (row === null) return entry;
    const { type, rank } = entry;
    return {
      ...brief(row),
      ...factDetail(row, schemas.get(entry.id)),
      type,
      rank,
    };
  });
  // Tests linked to the requirement itself come first, then tests that
  // verify one of its scenarios; a test reached both ways counts as direct.
  const testVias = plans.map((plan) => {
    const testVia = new Map<string, string>();
    for (const testId of plan.directTests)
      if (!testVia.has(testId)) testVia.set(testId, "direct");
    const verification = graph.edgesOf(plan.scenarios);
    for (const scenarioId of plan.scenarios)
      for (const testId of scenarioTests(scenarioId, verification))
        if (!testVia.has(testId)) testVia.set(testId, scenarioId);
    return testVia;
  });
  const testIds = testVias.map((testVia) => firstOf([...testVia.keys()]));
  const verdicts = await fetchVerdicts(
    prolog,
    graph,
    testIds.flat(),
    chosen.map((req) => req.id),
  );
  const verdictById = new Map<string, RawVerdict>(
    records(verdicts?.requirements).map((row) => [
      normalizeEntityId(text(row.id)),
      row,
    ]),
  );

  const bodies = new Map<string, Promise<string | null>>();
  const rowsOf = (ids: readonly string[]) =>
    ids.map((id) => graph.row(id)).filter((row): row is Row => row !== null);
  const governing: SearchAnswerRequirement[] = [];
  for (const [index, plan] of plans.entries()) {
    const { req } = plan;
    const adrRows = rowsOf(plan.related).filter(
      (row) =>
        text(row.type) === "adr" &&
        !SUPERSEDED_ADR_STATUSES.has(text(row.status)),
    );
    for (const adr of adrRows) rationaleRows.set(text(adr.id), adr);
    const projected = projectVerdict(
      verdicts === undefined ? undefined : verdictById.get(req.id),
    );
    if (projected.truncated) truncated = true;
    const testVia = testVias[index] ?? new Map<string, string>();
    governing.push({
      ...brief(req.entity),
      score: req.score,
      via: req.via,
      facts: rowsOf(plan.facts).map((fact) => ({
        ...brief(fact),
        ...factDetail(fact, schemas.get(text(fact.id))),
      })),
      ...(plan.factsOmitted > 0
        ? { moreFacts: moreFactsOf(req.id, plan.factsOmitted) }
        : {}),
      scenarios: rowsOf(plan.scenarios).map(brief),
      tests: rowsOf(testIds[index] ?? []).map((row) => ({
        ...brief(row),
        via: testVia.get(text(row.id)) ?? "direct",
      })),
      adrs: adrRows.map(brief),
      verdict: projected.verdict,
      exceptions: rowsOf(plan.exceptions).map((row) => {
        const approvedBy = text(row.approved_by).trim();
        return { ...brief(row), ...(approvedBy ? { approvedBy } : {}) };
      }),
      unknowns: projected.unknowns,
    });
  }

  const rationaleList = [...rationaleRows.values()];
  if (rationaleList.length > limits.rationale) truncated = true;
  if (observations.length > limits.observations) truncated = true;
  const rationale = await Promise.all(
    rationaleList
      .slice(0, limits.rationale)
      .map((row) => rationaleOf(row, options.workspaceRoot, bodies)),
  );
  const scope: SearchAnswerScope = {
    branch: options.branch ?? null,
    snapshotId: text(verdicts?.scope?.snapshotId) || "unknown",
    syncedAt:
      typeof verdicts?.scope?.syncedAt === "string"
        ? verdicts.scope.syncedAt
        : null,
  };
  // An unlinked predicate fact that disagrees with a governing requirement's
  // fact on the same key arguments names that fact, so the answer says which
  // one decides instead of leaving the agent to find the pair.
  const governingFacts = plans.flatMap((plan) =>
    rowsOf(plan.facts).map((fact) => ({ fact, requirement: plan.req.id })),
  );
  const ungovernedAnswer: SearchAnswerUngoverned[] = detailedUngoverned
    .map((entry) => {
      const row = entry.type === "fact" ? graph.row(entry.id) : null;
      if (row === null) return entry;
      const holder = governingFacts.find(({ fact }) =>
        disagreeingPredicateFacts(row, fact, schemas.get(entry.id)),
      );
      if (holder === undefined) return entry;
      const factId = text(holder.fact.id);
      const { claim } = factDetail(holder.fact, schemas.get(factId));
      return {
        ...entry,
        overriddenBy: {
          fact: factId,
          requirement: holder.requirement,
          ...(claim ? { claim } : {}),
        },
      };
    })
    .sort((left, right) => left.rank - right.rank);
  const answer: SearchAnswer = {
    version: "kibi.search-answer.v1",
    governing,
    rationale,
    notGoverning,
    observations: observations.slice(0, limits.observations),
    ungoverned: ungovernedAnswer,
    scope,
    truncated: truncated || graph.truncated,
    note: answerNote(governing.length, ungovernedAnswer),
  };
  return fitSearchAnswer(answer, limits.maxBytes);
}

// implements REQ-search-answer-hygiene
/**
 * How to read the layer. When the top-ranked match is owned by no
 * requirement, the note says so first: the governing list, if any, came from
 * lower-ranked matches and is not the top match's requirement.
 */
function answerNote(
  governingCount: number,
  ungoverned: readonly SearchAnswerUngoverned[],
): string {
  const top = ungoverned.find((entry) => entry.rank === 1);
  const lead =
    top === undefined
      ? ""
      : `The top-ranked match ${top.id} (${top.type}) is linked to no requirement${governingCount === 0 ? "" : "; the governing requirements below were reached through lower-ranked matches"}. `;
  // A fact no requirement links records something seen, not a decision. An
  // agent comparing it with a governing requirement's fact on the same
  // tuple must not weigh the two as equals.
  const ungovernedFact = ungoverned.some((entry) => entry.type === "fact")
    ? "A fact in ungoverned is linked to no requirement, so it decides nothing: where it disagrees with a governing requirement's fact, the governing fact holds. "
    : "";
  const overridden = ungoverned
    .flatMap((entry) =>
      entry.overriddenBy === undefined
        ? []
        : [
            `${entry.overriddenBy.fact} of ${entry.overriddenBy.requirement}${entry.overriddenBy.claim ? ` (${entry.overriddenBy.claim})` : ""} holds over ${entry.id}${entry.claim ? ` (${entry.claim})` : ""}. `,
          ],
    )
    .join("");
  return (
    lead +
    ungovernedFact +
    overridden +
    (governingCount === 0
      ? "No current requirement matched or owns a matched entity. Absence here is not evidence that nothing governs the change; refine the query or pass sourceLocations."
      : "Governing requirements are current requirements matched by the query or linked to a matched entity. Links are discovery, not proof. A verdict lists the contradiction and scenario-feasibility witnesses that name the requirement; none means no check named it, not that it is proven. Use kb_check and kb_coverage for consistency and proof status.")
  );
}

function byteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function clipTitle<T extends SearchAnswerEntity>(entity: T, chars: number): T {
  return { ...entity, title: clip(entity.title, chars) };
}

function clipRationale<T extends SearchAnswerRationale>(
  entity: T,
  chars: number,
): T {
  const clipped = clipTitle(entity, chars);
  return entity.excerpt === undefined
    ? clipped
    : {
        ...clipped,
        excerpt: clip(entity.excerpt, SEARCH_ANSWER_LIMITS.excerptChars),
      };
}

function withoutExcerpt<T extends SearchAnswerRationale>(entity: T): T {
  if (entity.excerpt === undefined) return entity;
  const { excerpt: _excerpt, ...rest } = entity;
  return rest as T;
}

const ANSWER_TRIM_ORDER = [
  "observations",
  "notGoverning",
  "ungoverned",
  "rationale",
] as const;
/** Where a linked fact of a governing requirement sorts in its list. */
function factRank(edge: Edge, seedIds: readonly string[]): number {
  const matched = seedIds.indexOf(edge.to);
  if (matched >= 0) return matched;
  return seedIds.length + (edge.rel === "constrains" ? 1 : 0);
}

/** The facts an answer left out of a governing requirement, and the ask. */
function moreFactsOf(
  requirementId: string,
  count: number,
): { count: number; ask: string } {
  return { count, ask: `kb_query(${JSON.stringify({ id: requirementId })})` };
}

const REQUIREMENT_TRIM_ORDER = [
  "unknowns",
  "exceptions",
  "adrs",
  "tests",
  "scenarios",
  "facts",
] as const;

/**
 * Hold the whole answer under `maxBytes`, marking it truncated when anything
 * is cut. In order: long titles, excerpts and details are clipped; ADR
 * excerpts are dropped, last rationale entry first; the least relevant
 * governing requirements are dropped;
 * list items are dropped (notes and side lists before the remaining
 * requirement's own lists, its verdict witnesses last); then the remaining
 * requirement's title and `via` are clipped. A verdict keeps its status when
 * its witnesses are dropped. If even that cannot fit, the requirement itself
 * is dropped.
 */
export function fitSearchAnswer(
  answer: SearchAnswer,
  maxBytes: number = SEARCH_ANSWER_LIMITS.maxBytes,
): SearchAnswer {
  let current = answer;
  const over = () => byteSize(current) > maxBytes;
  if (!over()) return current;
  const titleChars = SEARCH_ANSWER_LIMITS.titleChars;
  const detailChars = SEARCH_ANSWER_LIMITS.detailChars;
  const clipAll = <T extends SearchAnswerEntity>(rows: readonly T[]) =>
    rows.map((row) => clipTitle(row, titleChars));
  current = {
    ...current,
    truncated: true,
    governing: current.governing.map((req) => ({
      ...clipTitle(req, titleChars),
      facts: clipAll(req.facts),
      scenarios: clipAll(req.scenarios),
      tests: clipAll(req.tests),
      adrs: clipAll(req.adrs),
      verdict: {
        ...req.verdict,
        witnesses: req.verdict.witnesses.map((witness) => ({
          ...witness,
          detail: clip(witness.detail, detailChars),
        })),
      },
      exceptions: clipAll(req.exceptions),
      unknowns: req.unknowns.map((unknown) => ({
        ...unknown,
        detail: clip(unknown.detail, detailChars),
      })),
    })),
    rationale: current.rationale.map((adr) => clipRationale(adr, titleChars)),
    notGoverning: clipAll(current.notGoverning),
    observations: clipAll(current.observations),
    ungoverned: clipAll(current.ungoverned),
  };

  // Excerpts are the most expendable text: drop them before any entry.
  for (
    let index = current.rationale.length - 1;
    index >= 0 && over();
    index -= 1
  ) {
    const rationale = [...current.rationale];
    rationale[index] = withoutExcerpt(
      rationale[index] as SearchAnswerRationale,
    );
    current = { ...current, rationale };
  }

  while (over() && current.governing.length > 1)
    current = { ...current, governing: current.governing.slice(0, -1) };

  while (over()) {
    const side = ANSWER_TRIM_ORDER.find((key) => current[key].length > 0);
    if (side) {
      current = { ...current, [side]: current[side].slice(0, -1) };
      continue;
    }
    const [req] = current.governing;
    if (!req) break;
    const own = REQUIREMENT_TRIM_ORDER.find((key) => req[key].length > 0);
    if (own) {
      current = {
        ...current,
        governing: [
          {
            ...req,
            [own]: req[own].slice(0, -1),
            ...(own === "facts"
              ? {
                  moreFacts: moreFactsOf(
                    req.id,
                    (req.moreFacts?.count ?? 0) + 1,
                  ),
                }
              : {}),
          },
        ],
      };
      continue;
    }
    if (req.verdict.witnesses.length === 0) break;
    current = {
      ...current,
      governing: [
        {
          ...req,
          verdict: {
            ...req.verdict,
            witnesses: req.verdict.witnesses.slice(0, -1),
          },
        },
      ],
    };
  }

  for (const field of ["title", "via"] as const) {
    while (over()) {
      const [req] = current.governing;
      const chars = req ? Array.from(req[field]).length : 0;
      if (!req || chars <= 1) break;
      // Each removed code point frees at least one byte; one more makes room
      // for the ellipsis.
      const keep = Math.max(1, chars - (byteSize(current) - maxBytes) - 2);
      current = {
        ...current,
        governing: [{ ...req, [field]: clip(req[field], keep) }],
      };
    }
  }
  if (over()) current = { ...current, governing: [] };
  return current;
}
