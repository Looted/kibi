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
 * not rules. Everything here is graph traversal over the KB: it is discovery,
 * not proof.
 */
export type SearchAnswerEntity = Readonly<{
  id: string;
  title: string;
  status?: string;
}>;

export type SearchAnswerRequirement = SearchAnswerEntity &
  Readonly<{
    score: number;
    via: string;
    facts: readonly (SearchAnswerEntity & { factKind?: string })[];
    scenarios: readonly SearchAnswerEntity[];
    tests: readonly SearchAnswerEntity[];
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
  const observations: SearchAnswerEntity[] = [];
  const rationale = new Map<string, SearchAnswerEntity>();
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
    for (const owner of owningRequirements(id, type, seedEdges)) {
      const previous = candidates.get(owner);
      const score = match.score * 0.9;
      if (!previous || previous.score < score)
        candidates.set(owner, { score, via: `${type} ${id}` });
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
    const scenarios = await linked(
      reqEdges
        .filter((edge) => edge.rel === "specified_by" && edge.from === id)
        .map((edge) => edge.to),
    );
    const tests = await linked(
      reqEdges
        .filter(
          (edge) =>
            (edge.rel === "verified_by" && edge.from === id) ||
            (edge.rel === "validates" && edge.to === id),
        )
        .map((edge) => (edge.rel === "verified_by" ? edge.to : edge.from)),
    );
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
      tests: tests.map(brief),
      adrs: adrs.map(brief),
    });
  }

  const rationaleList = [...rationale.values()];
  if (rationaleList.length > limits.rationale) truncated = true;
  if (observations.length > limits.observations) truncated = true;
  let answer: SearchAnswer = {
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
  // Hold the answer under a byte ceiling by dropping the least relevant
  // governing requirements first.
  while (
    Buffer.byteLength(JSON.stringify(answer), "utf8") > limits.maxBytes &&
    answer.governing.length > 1
  ) {
    answer = {
      ...answer,
      governing: answer.governing.slice(0, -1),
      truncated: true,
    };
  }
  return answer;
}
