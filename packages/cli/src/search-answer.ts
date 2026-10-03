import type { IntentSearchMatch } from "./intent-search.js";
import { escapeAtom, normalizeEntityId, parseTriples } from "./prolog/codec.js";
import { loadEntities } from "./public/operations/discovery-entities.js";
import type { PrologPort } from "./public/operations/runtime-types.js";

// implements REQ-kibi-search-answer-layer
/**
 * The answer layer turns ranked matches into what an agent asking "what
 * governs this?" needs: the current requirements that apply, why (ADRs), what
 * must stay true (linked facts), and what verifies it (scenarios and tests).
 * Superseded or deprecated requirements are listed separately so they are
 * never read as current policy, and observation facts are labelled as notes,
 * not rules. Tests are collected through the canonical
 * REQ -specified_by-> SCEN -verified_by-> TEST path as well as direct
 * requirement links, and each says how it was reached. Everything here is
 * graph traversal over the KB: it is discovery, not proof.
 */
export type SearchAnswerEntity = Readonly<{
  id: string;
  title: string;
  status?: string;
}>;

/**
 * A test verifying a governing requirement. `via` is `"direct"` for a test
 * linked to the requirement itself, or the id of the scenario it verifies.
 */
export type SearchAnswerTest = SearchAnswerEntity & Readonly<{ via: string }>;

export type SearchAnswerRequirement = SearchAnswerEntity &
  Readonly<{
    score: number;
    via: string;
    facts: readonly (SearchAnswerEntity & { factKind?: string })[];
    scenarios: readonly SearchAnswerEntity[];
    tests: readonly SearchAnswerTest[];
    adrs: readonly SearchAnswerEntity[];
  }>;

export type SearchAnswer = Readonly<{
  version: "kibi.search-answer.v1";
  governing: readonly SearchAnswerRequirement[];
  rationale: readonly SearchAnswerEntity[];
  notGoverning: readonly (SearchAnswerEntity & { supersededBy?: string })[];
  observations: readonly SearchAnswerEntity[];
  truncated: boolean;
  note: string;
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
] as const;
const FACT_LINKS = new Set([
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
]);

export const SEARCH_ANSWER_LIMITS = {
  seeds: 10,
  governing: 5,
  perRequirement: 4,
  rationale: 3,
  notGoverning: 5,
  observations: 3,
  entityLoads: 60,
  maxBytes: 16_384,
  /** Title length (characters) kept when an answer must shrink to fit. */
  titleChars: 160,
} as const;

type Edge = Readonly<{ rel: string; from: string; to: string }>;

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function brief(entity: Record<string, unknown>): SearchAnswerEntity {
  const status = text(entity.status);
  return {
    id: text(entity.id),
    title: text(entity.title),
    ...(status ? { status } : {}),
  };
}

async function edgesTouching(
  prolog: Pick<PrologPort, "query">,
  ids: readonly string[],
): Promise<Edge[]> {
  if (ids.length === 0) return [];
  const idList = ids.map((id) => `'${escapeAtom(id)}'`).join(",");
  const result = await prolog.query(
    `findall([Rel,From,To], (member(Rel, [${ANSWER_RELATIONSHIPS.join(",")}]), kb_relationship(Rel, From, To), (member(From, [${idList}]); member(To, [${idList}]))), Edges)`,
  );
  if (!result.success) return [];
  return parseTriples(result.bindings.Edges ?? "[]").map(([rel, from, to]) => ({
    rel,
    from: normalizeEntityId(from),
    to: normalizeEntityId(to),
  }));
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

export async function buildSearchAnswer(
  prolog: Pick<PrologPort, "query">,
  matches: readonly IntentSearchMatch[],
): Promise<SearchAnswer> {
  const limits = SEARCH_ANSWER_LIMITS;
  const cache = new Map<string, Record<string, unknown> | null>();
  let loads = 0;
  let truncated = false;
  const load = async (id: string) => {
    if (cache.has(id)) return cache.get(id) ?? null;
    if (loads >= limits.entityLoads) {
      truncated = true;
      return null;
    }
    loads += 1;
    const [entity] = await loadEntities(prolog, { id });
    cache.set(id, entity ?? null);
    return entity ?? null;
  };
  for (const match of matches)
    cache.set(text(match.entity.id), { ...match.entity });

  const seeds = matches.slice(0, limits.seeds);
  if (matches.length > limits.seeds) truncated = true;
  const seedEdges = await edgesTouching(
    prolog,
    seeds.map((match) => text(match.entity.id)),
  );

  // Candidate requirements: matched requirements first, then requirements
  // that own a matched scenario, test, symbol or fact.
  const candidates = new Map<string, { score: number; via: string }>();
  const propose = (owner: string, score: number, via: string) => {
    const previous = candidates.get(owner);
    if (!previous || previous.score < score)
      candidates.set(owner, { score, via });
  };
  const observations: SearchAnswerEntity[] = [];
  const rationale = new Map<string, SearchAnswerEntity>();
  // A matched test may verify a scenario rather than a requirement; its
  // targets are resolved to their governing requirements after the loop.
  const testTargets: { id: string; score: number; targets: string[] }[] = [];
  for (const match of seeds) {
    const id = text(match.entity.id);
    const type = text(match.entity.type);
    if (type === "req") {
      if (!candidates.has(id))
        candidates.set(id, { score: match.score, via: "matched" });
      continue;
    }
    if (type === "adr") {
      if (!SUPERSEDED_ADR_STATUSES.has(text(match.entity.status)))
        rationale.set(id, brief(match.entity));
      continue;
    }
    if (type === "fact") {
      const kind = text(match.entity.fact_kind);
      if (kind === "observation" || kind === "meta") {
        observations.push(brief(match.entity));
        continue;
      }
    }
    const owners = owningRequirements(id, type, seedEdges);
    if (type === "test") {
      testTargets.push({ id, score: match.score, targets: owners });
      continue;
    }
    for (const owner of owners)
      propose(owner, match.score * 0.9, `${type} ${id}`);
  }
  const targetIds = [...new Set(testTargets.flatMap((test) => test.targets))];
  const targetEdges = await edgesTouching(prolog, targetIds);
  for (const test of testTargets) {
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
  let frontier = [...candidates.keys()];
  const reqEdges: Edge[] = [];
  for (let hop = 0; hop < 3 && frontier.length > 0; hop += 1) {
    const hopEdges = await edgesTouching(prolog, frontier);
    reqEdges.push(...hopEdges);
    for (const edge of hopEdges)
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

  // Scenario verification edges, fetched once per scenario across requirements.
  const scenarioEdges = new Map<string, Edge[]>();
  const edgesOfScenarios = async (ids: readonly string[]) => {
    const missing = ids.filter((id) => !scenarioEdges.has(id));
    const fetched = await edgesTouching(prolog, missing);
    for (const id of missing)
      scenarioEdges.set(
        id,
        fetched.filter((edge) => edge.from === id || edge.to === id),
      );
    return ids.flatMap((id) => scenarioEdges.get(id) ?? []);
  };

  const governing: SearchAnswerRequirement[] = [];
  const notGoverning: (SearchAnswerEntity & { supersededBy?: string })[] = [];
  const ordered = [...candidates.entries()].sort(
    ([leftId, left], [rightId, right]) =>
      right.score - left.score || leftId.localeCompare(rightId),
  );
  for (const [id, candidate] of ordered) {
    const entity = await load(id);
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
    if (governing.length >= limits.governing) {
      truncated = true;
      continue;
    }
    const linked = async (
      ids: readonly string[],
    ): Promise<Record<string, unknown>[]> => {
      const unique = [...new Set(ids)];
      if (unique.length > limits.perRequirement) truncated = true;
      const rows: Record<string, unknown>[] = [];
      for (const linkedId of unique.slice(0, limits.perRequirement)) {
        const row = await load(linkedId);
        if (row) rows.push(row);
      }
      return rows;
    };
    const facts = await linked(
      reqEdges
        .filter((edge) => FACT_LINKS.has(edge.rel) && edge.from === id)
        .map((edge) => edge.to),
    );
    const scenarioIds = [
      ...new Set(
        reqEdges
          .filter((edge) => edge.rel === "specified_by" && edge.from === id)
          .map((edge) => edge.to),
      ),
    ];
    const scenarios = await linked(scenarioIds);
    // Tests linked to the requirement itself come first, then tests that
    // verify one of its scenarios; a test reached both ways counts as direct.
    const testVia = new Map<string, string>();
    const reach = (testId: string, via: string) => {
      if (!testVia.has(testId)) testVia.set(testId, via);
    };
    for (const edge of reqEdges) {
      if (edge.rel === "verified_by" && edge.from === id)
        reach(edge.to, "direct");
      if (edge.rel === "validates" && edge.to === id)
        reach(edge.from, "direct");
    }
    const traversed = scenarioIds.slice(0, limits.perRequirement);
    if (scenarioIds.length > traversed.length) truncated = true;
    const verification = await edgesOfScenarios(traversed);
    for (const scenarioId of traversed)
      for (const testId of scenarioTests(scenarioId, verification))
        reach(testId, scenarioId);
    const testRows = await linked([...testVia.keys()]);
    const related = await linked(
      reqEdges
        .filter(
          (edge) =>
            edge.rel === "relates_to" && (edge.from === id || edge.to === id),
        )
        .map((edge) => (edge.from === id ? edge.to : edge.from)),
    );
    const adrs = related.filter(
      (row) =>
        text(row.type) === "adr" &&
        !SUPERSEDED_ADR_STATUSES.has(text(row.status)),
    );
    for (const adr of adrs) rationale.set(text(adr.id), brief(adr));
    governing.push({
      ...brief(entity),
      score: candidate.score,
      via: candidate.via,
      facts: facts.map((fact) => {
        const factKind = text(fact.fact_kind);
        return { ...brief(fact), ...(factKind ? { factKind } : {}) };
      }),
      scenarios: scenarios.map(brief),
      tests: testRows.map((row) => ({
        ...brief(row),
        via: testVia.get(text(row.id)) ?? "direct",
      })),
      adrs: adrs.map(brief),
    });
  }

  const rationaleList = [...rationale.values()];
  if (rationaleList.length > limits.rationale) truncated = true;
  if (observations.length > limits.observations) truncated = true;
  const answer: SearchAnswer = {
    version: "kibi.search-answer.v1",
    governing,
    rationale: rationaleList.slice(0, limits.rationale),
    notGoverning,
    observations: observations.slice(0, limits.observations),
    truncated,
    note:
      governing.length === 0
        ? "No current requirement matched or owns a matched entity. Absence here is not evidence that nothing governs the change; refine the query or pass sourceLocations."
        : "Governing requirements are current requirements matched by the query or linked to a matched entity. Links are discovery, not proof: use kb_check and kb_coverage for consistency and proof status.",
  };
  return fitSearchAnswer(answer, limits.maxBytes);
}

function byteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

/** Shorten to at most `maxChars` code points, ending with an ellipsis. */
function clip(value: string, maxChars: number): string {
  const chars = Array.from(value);
  if (chars.length <= maxChars) return value;
  return `${chars.slice(0, Math.max(0, maxChars - 1)).join("")}\u2026`;
}

function clipTitle<T extends SearchAnswerEntity>(entity: T, chars: number): T {
  return { ...entity, title: clip(entity.title, chars) };
}

const ANSWER_TRIM_ORDER = [
  "observations",
  "notGoverning",
  "rationale",
] as const;
const REQUIREMENT_TRIM_ORDER = ["adrs", "tests", "scenarios", "facts"] as const;

/**
 * Hold the whole answer under `maxBytes`, marking it truncated when anything
 * is cut. In order: long titles are clipped, the least relevant governing
 * requirements are dropped, list items are dropped (notes and side lists
 * before the remaining requirement's own links), then the remaining
 * requirement's title and `via` are clipped. If even that cannot fit, the
 * requirement itself is dropped.
 */
export function fitSearchAnswer(
  answer: SearchAnswer,
  maxBytes: number = SEARCH_ANSWER_LIMITS.maxBytes,
): SearchAnswer {
  let current = answer;
  const over = () => byteSize(current) > maxBytes;
  if (!over()) return current;
  const titleChars = SEARCH_ANSWER_LIMITS.titleChars;
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
    })),
    rationale: clipAll(current.rationale),
    notGoverning: clipAll(current.notGoverning),
    observations: clipAll(current.observations),
  };
  while (over() && current.governing.length > 1)
    current = { ...current, governing: current.governing.slice(0, -1) };

  while (over()) {
    const side = ANSWER_TRIM_ORDER.find((key) => current[key].length > 0);
    if (side) {
      current = { ...current, [side]: current[side].slice(0, -1) };
      continue;
    }
    const [req] = current.governing;
    const own = req
      ? REQUIREMENT_TRIM_ORDER.find((key) => req[key].length > 0)
      : undefined;
    if (!req || !own) break;
    current = {
      ...current,
      governing: [{ ...req, [own]: req[own].slice(0, -1) }],
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
