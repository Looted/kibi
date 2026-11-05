import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as applicability from "../../../src/operations/modeling/predicate-applicability.js";
import * as applyplan from "../../../src/operations/modeling/predicate-applyplan.js";
import * as hints from "../../../src/operations/modeling/predicate-binding-hints.js";
import { BUILT_IN_PREDICATE_SCHEMAS } from "../../../src/operations/modeling/predicate-catalog.js";
import { inferSubject } from "../../../src/operations/modeling/predicate-inference.js";
import * as loader from "../../../src/operations/modeling/predicate-loader.js";
import * as ranker from "../../../src/operations/modeling/predicate-ranker.js";
import type {
  PredicateSchemaCandidate,
  PredicateSuggestion,
} from "../../../src/operations/modeling/predicate-types.js";
import {
  compareEligibleByApplicabilityScoreThenName,
  compareEligibleByApplicabilityThenName,
  executeSuggestPredicates,
  handleKbSuggestPredicates,
} from "../../../src/operations/modeling/suggest-predicates.js";
import * as compile from "../../../src/operations/planning/compile-intent.js";
import * as analyzeProse from "../../../src/operations/semantic-advisor/analyze-prose.js";
import { semanticClaimKey } from "../../../src/operations/semantic-advisor/clauses.js";
import * as orchestration from "../../../src/operations/semantic-advisor/plugin-orchestration.js";
import * as entities from "../../../src/public/operations/discovery-entities.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

type Row = Record<string, unknown>;
type Answer = Row | Error | undefined;
type Handler = (goal: string) => Answer;
type Data = Row & {
  warnings: string[];
  candidates: PredicateSuggestion[];
  existingGrounding: Row[];
  decisionConflicts: Row[];
  replacementPlan: Row | null;
};

const TEXT =
  "The editor must save changes automatically when the user navigates away.";
const CLAIM = semanticClaimKey(TEXT);
const CONTEXT = { workspaceRoot: "/w" } as unknown as OperationContext;
const ZERO = {
  exact_pattern: 0,
  keyword_hits: 0,
  descriptor_overlap: 0,
  usage_match: 0,
  negative_evidence: 0,
  broad_token_penalty: 0,
  specificity_bonus: 0,
  total: 0,
};
const FACT_STEP = { type: "fact", id: "FACT-P", properties: { p: 1 } };

const spies: { mockRestore: () => void }[] = [];
function spy<T extends object>(
  target: T,
  name: keyof T & string,
  impl: (...args: never[]) => unknown,
) {
  const created = spyOn(target as never, name as never).mockImplementation(
    impl as never,
  ) as unknown as {
    mock: { calls: unknown[][] };
    mockRestore: () => void;
  };
  spies.push(created);
  return created;
}

function schema(
  id: string,
  name: string,
  extra: Partial<PredicateSchemaCandidate> = {},
): PredicateSchemaCandidate {
  return {
    id,
    predicate_name: name,
    title: name,
    description: name,
    argument_names: ["subject"],
    argument_types: ["entity"],
    keywords: [name],
    examples: [],
    tags: [],
    ...extra,
  };
}

let propositions: Array<{ role: string }>;
let existing: PredicateSchemaCandidate[];
let catalog: unknown;
let ranks: Record<string, { score: number; spec?: number }>;
let apps: Record<
  string,
  { eligible: boolean; app: number; reasons?: string[] }
>;
let overrides: Record<string, Partial<PredicateSuggestion>>;
let participants: string[];
let stored: Row | Error | undefined;
let loads: Array<Row[] | undefined>;
let predicatePlan: (candidate: PredicateSuggestion) => Row[];
let compiled: (input: Row) => Row;
let calls: Record<string, { mock: { calls: unknown[][] } }>;

function suggestion(
  candidateSchema: PredicateSchemaCandidate,
  score: number,
  diagnostics: Row,
): PredicateSuggestion {
  return {
    id: `CAND-${candidateSchema.id}`,
    predicate_name: candidateSchema.predicate_name,
    predicate_args: ["a"],
    canonical_key: `${candidateSchema.predicate_name}(a)`,
    polarity: "assert",
    binding_status: "complete",
    unbound_arguments: [],
    binding_provenance: "explicit",
    binding_provenance_by_argument: {},
    subject_key: null,
    subject_pairing: "not_required",
    eligibility: diagnostics.eligibility as "eligible",
    rejection_reasons: [...(diagnostics.rejectionReasons as string[])],
    applicability_score: diagnostics.applicabilityScore as number,
    score_components: diagnostics.scoreComponents as typeof ZERO,
    score,
    rationale: "",
    schema: { ...candidateSchema, usage_hints: {} } as never,
    ...overrides[candidateSchema.id],
  };
}

beforeEach(() => {
  propositions = [{ role: "normative" }];
  existing = [schema("S-commit", "commit_action")];
  catalog = null;
  ranks = { "S-commit": { score: 0.9 } };
  apps = {};
  overrides = {};
  participants = [];
  stored = undefined;
  loads = [];
  predicatePlan = () => [FACT_STEP];
  compiled = (input) => ({
    status: "ready",
    steps: input.steps,
    diagnostics: [],
    contradictionAnalysis: { witnesses: [] },
  });
  calls = {
    analyze: spy(analyzeProse, "analyzeSemanticAdvisorInput", () => ({
      receipt: { propositions },
    })),
    loader: spy(loader, "loadExistingPredicateSchemas", async () => existing),
    compose: spy(
      orchestration,
      "composeOntologyCatalogForOperation",
      async () => catalog,
    ),
    rank: spy(ranker, "rankSchema", ((ranked: PredicateSchemaCandidate) => ({
      schema: ranked,
      score: ranks[ranked.id]?.score ?? -1,
      components: { ...ZERO, specificity_bonus: ranks[ranked.id]?.spec ?? 0 },
    })) as never),
    evaluate: spy(applicability, "evaluateSemanticApplicability", ((ranked: {
      schema: PredicateSchemaCandidate;
    }) => {
      const answer = apps[ranked.schema.id] ?? { eligible: true, app: 0.9 };
      return {
        eligible: answer.eligible,
        reasons: answer.reasons ?? [],
        applicabilityScore: answer.app,
      };
    }) as never),
    suggestion: spy(applyplan, "buildSuggestion", ((
      candidateSchema: PredicateSchemaCandidate,
      _text: string,
      _subject: string,
      score: number,
      _bindings: unknown,
      _polarity: unknown,
      diagnostics: Row,
    ) => suggestion(candidateSchema, score, diagnostics)) as never),
    predicatePlan: spy(applyplan, "buildPredicateApplyPlan", ((
      candidate: PredicateSuggestion,
    ) => predicatePlan(candidate)) as never),
    gapPlan: spy(applyplan, "buildGapApplyPlan", () => [
      { type: "fact", id: "FACT-GAP" },
    ]),
    relationshipPlan: spy(applyplan, "buildRelationshipPlan", ((
      factId: string,
      requirementId: string | undefined,
    ) => ({
      relationship: {
        type: "requires_predicate",
        from: requirementId,
        to: factId,
      },
    })) as never),
    draft: spy(applyplan, "buildPredicateSchemaDraft", ((
      text: string,
      subject: string,
    ) => ({ draft: text, subject })) as never),
    hints: spy(hints, "buildBindingHints", ((
      candidate: PredicateSuggestion,
    ) => [{ argument: "x", candidate: candidate.id }]) as never),
    describe: spy(hints, "describeBindingHints", () => "x from the claim"),
    participants: spy(hints, "unnamedParticipantArguments", () => participants),
    loadEntities: spy(entities, "loadEntities", async () => {
      if (loads.length > 0) return loads.shift() ?? [];
      if (stored instanceof Error) throw stored;
      return stored === undefined ? [] : [stored];
    }),
    compile: spy(compile, "compileGroundingPlan", (async (
      _context: unknown,
      _prolog: unknown,
      input: Row,
    ) => compiled(input)) as never),
  };
});

afterEach(() => {
  for (const created of spies.splice(0)) created.mockRestore();
});

async function run(
  args: Row = {},
  options: { handle?: Handler; prolog?: null; context?: null } = {},
) {
  const goals: string[] = [];
  const port =
    options.prolog === null
      ? null
      : {
          query: async (goal: string) => {
            goals.push(goal);
            const answer = options.handle?.(goal);
            if (answer instanceof Error) throw answer;
            return answer ?? { success: false, bindings: {} };
          },
        };
  const result = await handleKbSuggestPredicates(
    port as never,
    { text: TEXT, ...args } as never,
    options.context === null ? undefined : CONTEXT,
  );
  return { result, data: result.structuredContent as unknown as Data, goals };
}

const constrainsGoal = (id: string) =>
  `findall(Key, (kb_relationship(constrains, '${id}', _SubjectFact), kb:fact_subject_key(_SubjectFact, Key)), Keys)`;
const groundingGoal = (type: string, id: string) =>
  `findall(To, kb_relationship(${type}, '${id}', To), Targets)`;
const factGoal = (id: string) =>
  `once((kb_entity('${id}', fact, _GroundProps), memberchk(claim_key=_GroundClaimRaw, _GroundProps), normalize_term_atom(_GroundClaimRaw, ClaimKey), (memberchk(fact_kind=_GroundKindRaw, _GroundProps) -> normalize_term_atom(_GroundKindRaw, FactKind) ; FactKind = ''), (memberchk(canonical_key=_GroundCanonicalRaw, _GroundProps) -> normalize_term_atom(_GroundCanonicalRaw, CanonicalKey) ; CanonicalKey = '')))`;
const groundingGoals = (id: string) =>
  ["requires_property", "requires_predicate", "requires_rule"].map((type) =>
    groundingGoal(type, id),
  );
const keys =
  (Keys: string): Handler =>
  (goal) =>
    goal.includes("kb_relationship(constrains")
      ? { success: true, bindings: { Keys } }
      : undefined;

function candidate(
  id: string,
  name: string,
  score: number,
  extra: Partial<PredicateSuggestion> = {},
): PredicateSuggestion {
  return suggestion(schema(id, name), score, {
    eligibility: "eligible",
    rejectionReasons: [],
    applicabilityScore: 0.9,
    scoreComponents: ZERO,
    ...Object.fromEntries(
      Object.entries({
        eligibility: extra.eligibility,
        applicabilityScore: extra.applicability_score,
      }).filter(([, value]) => value !== undefined),
    ),
  });
}

describe("input routing", () => {
  test("asks the advisor about the trimmed text as a requirement", async () => {
    await run({ text: `  ${TEXT}  ` });
    expect(calls.analyze?.mock.calls).toStrictEqual([
      [
        {
          payload: {
            type: "req",
            id: "REQ-KIBI-PREDICATE-SUGGESTION-INPUT",
            properties: { semantic_text: TEXT },
          },
        },
      ],
    ]);
  });

  test("abstains from nonlogical prose", async () => {
    const subject = inferSubject(TEXT, undefined, {
      requirementId: "REQ-1",
      subjectKey: undefined,
    });
    const expected = (logicClaims: string[], source: unknown, id: unknown) => {
      const applyPlan: Row[] = [];
      return {
        content: [
          {
            type: "text",
            text: "Predicate suggestion abstained because the semantic advisor classifies this prose as nonlogical (rationale, example, or subjective context). Keep it outside logic_claims; no candidate, ontology-gap observation, or schema draft was generated.",
          },
        ],
        structuredContent: {
          text: TEXT,
          claimKey: CLAIM,
          logicClaims,
          source,
          requirementId: id,
          subject,
          candidates: [],
          recommendedAction: "review_nonlogical",
          recommendedPredicateSchema: null,
          applyPlan,
          relationshipPlan: null,
          plan: null,
          warnings: [
            "The semantic advisor classifies this prose as nonlogical (rationale, example, or subjective context); it does not assert a verifiable domain proposition. Advisor routing wins: no predicate candidates, schema draft, or write plan were generated, and the claim was not added to logic_claims.",
          ],
        },
        applyPlan,
      };
    };
    for (const role of ["rationale", "example", "subjective"]) {
      propositions = [{ role }, { role: "rationale" }];
      const { result } = await run({
        requirementId: "REQ-1",
        source: "docs/a.md",
        existingLogicClaims: ["CLAIM-B", "CLAIM-A", "CLAIM-B"],
      });
      expect(result as unknown).toStrictEqual(
        expected(["CLAIM-B", "CLAIM-A"], "docs/a.md", "REQ-1"),
      );
    }
    const { result } = await run({}, { prolog: null });
    expect((result.structuredContent as Row).logicClaims).toStrictEqual([]);
    expect((result.structuredContent as Row).source).toBeNull();
    expect((result.structuredContent as Row).requirementId).toBeNull();
    expect(calls.loader?.mock.calls).toHaveLength(0);
  });

  test("abstains from prose with several assertive propositions", async () => {
    propositions = [
      { role: "normative" },
      { role: "rationale" },
      { role: "normative" },
    ];
    const subject = inferSubject(TEXT, "editor", {
      requirementId: undefined,
      subjectKey: undefined,
    });
    const applyPlan: Row[] = [];
    const { result } = await run({
      subjectHint: "editor",
      source: "docs/a.md",
      requirementId: "REQ-1",
      existingLogicClaims: ["CLAIM-A", "CLAIM-A"],
    });
    expect(result as unknown).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Predicate suggestion abstained because the input contains multiple assertive propositions. Split the prose into atomic propositions and retry each one.",
        },
      ],
      structuredContent: {
        text: TEXT,
        claimKey: CLAIM,
        logicClaims: ["CLAIM-A"],
        source: "docs/a.md",
        requirementId: "REQ-1",
        subject,
        candidates: [],
        recommendedAction: "record_ontology_gap",
        recommendedPredicateSchema: null,
        applyPlan,
        relationshipPlan: null,
        plan: null,
        warnings: [
          "kb_suggest_predicates requires one atomic assertive proposition; semantic advisor detected 2. Split the input into atomic propositions and retry each one. No candidate, ontology-gap draft, or write plan was generated.",
        ],
      },
      applyPlan,
    });
    const bare = (await run({}, { prolog: null })).data;
    expect(bare.logicClaims).toStrictEqual([]);
    expect(bare.source).toBeNull();
    expect(bare.requirementId).toBeNull();
  });

  test("suggests for no proposition or for one assertive proposition", async () => {
    for (const roles of [[], ["normative"], ["rationale", "normative"]]) {
      propositions = roles.map((role) => ({ role }));
      expect((await run()).data.recommendedAction).toBe(
        "apply_requires_predicate",
      );
    }
  });
});

describe("the requirement's subjects", () => {
  test("are read once for a trimmed requirement id", async () => {
    const { goals } = await run(
      { requirementId: " REQ-'1 " },
      { handle: keys("['c.d','a.b','c.d','']") },
    );
    expect(goals[0]).toBe(constrainsGoal("REQ-''1"));
    const diagnostics = calls.suggestion?.mock.calls[0]?.[6] as Row;
    expect(diagnostics.constrainedSubjects).toStrictEqual(["a.b", "c.d"]);
    expect("requirementSubject" in diagnostics).toBe(false);
  });

  test("are not read without a store or a requirement", async () => {
    for (const args of [{}, { requirementId: "  " }]) {
      const { goals } = await run(args);
      expect(goals.some((goal) => goal.includes("constrains"))).toBe(false);
    }
    const { data } = await run({ requirementId: "REQ-1" }, { prolog: null });
    expect(data.warnings).toStrictEqual([]);
    expect(
      (calls.suggestion?.mock.calls[0]?.[6] as Row).constrainedSubjects,
    ).toStrictEqual([]);
  });

  test("bind a single subject unless a subject hint is given", async () => {
    const subjectFor = async (args: Row, Keys = "['order.retention']") => {
      calls.suggestion?.mock.calls.splice(0);
      await run({ requirementId: "REQ-1", ...args }, { handle: keys(Keys) });
      const [, , subject, , , , diagnostics] = calls.suggestion?.mock
        .calls[0] as [unknown, unknown, string, unknown, unknown, unknown, Row];
      return { subject, diagnostics };
    };
    const single = await subjectFor({});
    expect(single.subject).toBe("order.retention");
    expect(single.diagnostics.requirementSubject).toBe("order.retention");
    expect(single.diagnostics.explicitSubject).toBe(false);
    const blank = await subjectFor({ subjectHint: "  " });
    expect(blank.diagnostics.requirementSubject).toBe("order.retention");
    expect(blank.diagnostics.explicitSubject).toBe(false);
    const hinted = await subjectFor({ subjectHint: "cart" });
    expect("requirementSubject" in hinted.diagnostics).toBe(false);
    expect(hinted.diagnostics.explicitSubject).toBe(true);
    const several = await subjectFor({}, "['a.b','c.d']");
    expect("requirementSubject" in several.diagnostics).toBe(false);
    expect(several.subject).toBe(
      inferSubject(TEXT, undefined, {
        requirementId: "REQ-1",
        subjectKey: undefined,
      }),
    );
    const none = await subjectFor({}, "[]");
    expect("requirementSubject" in none.diagnostics).toBe(false);
  });

  test("tolerate a failed or empty answer and warn when unreadable", async () => {
    for (const handle of [
      () => ({ success: false, bindings: { Keys: "['a.b']" } }),
      () => ({ success: true, bindings: {} }),
    ]) {
      await run({ requirementId: "REQ-1" }, { handle });
      expect(
        (calls.suggestion?.mock.calls.at(-1)?.[6] as Row).constrainedSubjects,
      ).toStrictEqual([]);
    }
    const { data } = await run(
      { requirementId: "REQ-1" },
      {
        handle: (goal) =>
          goal.includes("constrains") ? new Error("offline") : undefined,
        context: null,
      },
    );
    expect(data.warnings).toStrictEqual([
      "The subject facts REQ-1 constrains could not be read (offline); pass subjectHint with the requirement's subject_key.",
    ]);
    expect(
      (calls.suggestion?.mock.calls.at(-1)?.[6] as Row).constrainedSubjects,
    ).toStrictEqual([]);
  });
});

describe("the schema pool", () => {
  const ranked = () =>
    (calls.rank?.mock.calls ?? []).map(
      ([candidateSchema]) => candidateSchema as PredicateSchemaCandidate,
    );

  test("reads stored schemas unless told not to and asks the ontology packs", async () => {
    await run();
    await run({ includeExistingSchemas: false });
    expect(calls.loader?.mock.calls.map((call) => call[1])).toStrictEqual([
      true,
      false,
    ]);
    expect(calls.compose?.mock.calls).toStrictEqual([
      [CONTEXT, "kb_suggest_predicates"],
      [CONTEXT, "kb_suggest_predicates"],
    ]);
  });

  test("keeps each schema once, then the built-in catalog, then pack schemas", async () => {
    const a = schema("S-x", "p");
    const b = schema("S-x", "q");
    const c = schema("S-y", "p");
    existing = [a, { ...a, title: "again" }, b, c];
    ranks = { "S-x": { score: 0.9 } };
    catalog = {
      schemas: [
        {
          schemaId: "PACK-1",
          predicateName: "pack_rule",
          argumentNames: ["subject"],
          argumentTypes: ["entity"],
          aliases: ["pack rule"],
        },
        {
          schemaId: "PACK-2",
          predicateName: "pack_other",
          title: "Pack other",
          description: "Another",
          argumentNames: [],
          argumentTypes: [],
        },
      ],
      diagnostics: ["partial catalog"],
      replaced: false,
    };
    const { data } = await run();
    expect(ranked()).toStrictEqual([
      a,
      b,
      c,
      ...BUILT_IN_PREDICATE_SCHEMAS,
      {
        id: "PACK-1",
        predicate_name: "pack_rule",
        title: "pack_rule",
        description: "pack_rule",
        argument_names: ["subject"],
        argument_types: ["entity"],
        keywords: ["pack_rule", "pack rule"],
        aliases: ["pack rule"],
        examples: [],
        tags: ["ontology-pack"],
      },
      {
        id: "PACK-2",
        predicate_name: "pack_other",
        title: "Pack other",
        description: "Another",
        argument_names: [],
        argument_types: [],
        keywords: ["pack_other"],
        examples: [],
        tags: ["ontology-pack"],
      },
    ]);
    expect(data.warnings).toStrictEqual(["partial catalog"]);
  });

  test("drops the built-in catalog when a pack replaces it", async () => {
    existing = [];
    catalog = { schemas: [], replaced: true };
    const { data } = await run();
    expect(ranked()).toStrictEqual([]);
    expect(data.recommendedAction).toBe("record_ontology_gap");
    expect(data.warnings).toStrictEqual([
      "No predicate candidate met minScore. If this is recurring domain language, create a fact_kind=predicate_schema fact; otherwise keep the generated review:ontology-gap observation. Do not invent unsupported predicate names without a predicate_schema.",
    ]);
  });

  test("selects a requested schema, or names it when it is missing", async () => {
    existing = [schema("S-a", "pa"), schema("S-b", "pb")];
    ranks = { "S-a": { score: 0 }, "S-b": { score: 0 } };
    const found = await run({ schemaId: "S-b" });
    expect(ranked()).toStrictEqual([existing[1]]);
    expect(found.data.warnings).toStrictEqual([]);
    expect(found.data.candidates.map((entry) => entry.id)).toStrictEqual([
      "CAND-S-b",
    ]);
    const missing = await run({ schemaId: "S-missing" });
    expect(missing.data.recommendedAction).toBe("resolve_schema_reference");
    expect(missing.data.applyPlan).toStrictEqual([]);
    expect(missing.data.recommendedPredicateSchema).toBeNull();
    expect(missing.data.warnings).toStrictEqual([
      "Requested predicate schema S-missing is not available. Refresh the KB or correct schemaId before retrying; no ontology-gap or predicate write plan was generated.",
    ]);
    expect(missing.result.content).toStrictEqual([
      {
        type: "text",
        text: "Requested predicate schema S-missing is unavailable or semantically inapplicable. No apply plan was generated.",
      },
    ]);
  });
});

describe("ranking", () => {
  const order = () =>
    (calls.evaluate?.mock.calls ?? []).map(
      ([entry]) => (entry as { schema: PredicateSchemaCandidate }).schema.id,
    );

  test("keeps schemas at the minimum score, by score, specificity and name", async () => {
    existing = ["S-a", "S-e", "S-d", "S-c", "S-b", "S-low"].map((id) =>
      schema(id, `p_${id.slice(2)}`),
    );
    ranks = {
      "S-b": { score: 0.9 },
      "S-e": { score: 0.5, spec: 0.2 },
      "S-c": { score: 0.5, spec: 0.2 },
      "S-a": { score: 0.5, spec: 0.1 },
      "S-d": { score: 0.35 },
      "S-low": { score: 0.34 },
    };
    await run({ maxCandidates: 5 });
    expect(order()).toStrictEqual(["S-b", "S-c", "S-e", "S-a", "S-d"]);
    calls.evaluate?.mock.calls.splice(0);
    await run({ maxCandidates: 5, minScore: 0.4 });
    expect(order()).toStrictEqual(["S-b", "S-c", "S-e", "S-a"]);
    calls.evaluate?.mock.calls.splice(0);
    await run({ maxCandidates: 5, minScore: 0 });
    expect(order()).toStrictEqual(["S-b", "S-c", "S-e", "S-a", "S-d", "S-low"]);
  });

  test("reviews three times the requested candidates", async () => {
    existing = ["S-1", "S-2", "S-3", "S-4", "S-5"].map((id) => schema(id, id));
    ranks = Object.fromEntries(
      existing.map((entry) => [entry.id, { score: 0.9 }]),
    );
    await run({ maxCandidates: 1 });
    expect(calls.evaluate?.mock.calls).toHaveLength(3);
  });

  test("tells the applicability gate whether the schema was requested", async () => {
    await run();
    await run({ schemaId: "S-commit" });
    expect(calls.evaluate?.mock.calls.map((call) => call[2])).toStrictEqual([
      { explicitSchema: false },
      { explicitSchema: true },
    ]);
  });

  test("hands the ranking and the gate's verdict to the suggestion", async () => {
    apps = { "S-commit": { eligible: true, app: 0.85, reasons: ["r"] } };
    ranks = { "S-commit": { score: 0.9, spec: 0.1 } };
    await run(
      {
        argumentBindings: { subject: "editor" },
        polarityHint: "deny",
        requirementId: "REQ-1",
      },
      { handle: keys("['editor.autosave']") },
    );
    expect(calls.suggestion?.mock.calls[0]).toStrictEqual([
      existing[0],
      TEXT,
      "editor.autosave",
      0.9,
      { subject: "editor" },
      "deny",
      {
        eligibility: "eligible",
        rejectionReasons: ["r"],
        applicabilityScore: 0.85,
        scoreComponents: { ...ZERO, specificity_bonus: 0.1 },
        explicitSubject: false,
        requirementSubject: "editor.autosave",
        constrainedSubjects: ["editor.autosave"],
      },
    ]);
    apps = { "S-commit": { eligible: false, app: 0.1 } };
    await run({ schemaId: "S-commit" });
    expect((calls.suggestion?.mock.calls[1]?.[6] as Row).eligibility).toBe(
      "rejected",
    );
  });
});

describe("candidate order", () => {
  test("puts eligible candidates first, by applicability, score and name", async () => {
    existing = ["S-e1", "S-e2", "S-e3", "S-pe", "S-pa"].map((id) =>
      schema(id, id === "S-pe" ? "p_e" : id === "S-pa" ? "p_a" : id),
    );
    ranks = {
      "S-e1": { score: 0.95 },
      "S-e2": { score: 0.9 },
      "S-e3": { score: 0.8 },
      "S-pe": { score: 0.7, spec: 0.1 },
      "S-pa": { score: 0.7 },
    };
    apps = {
      "S-e1": { eligible: false, app: 0.99 },
      "S-e2": { eligible: true, app: 0.81 },
      "S-e3": { eligible: true, app: 0.85 },
      "S-pe": { eligible: true, app: 0.85 },
      "S-pa": { eligible: true, app: 0.85 },
    };
    const { data } = await run({ maxCandidates: 5 });
    expect(data.candidates.map((entry) => entry.id)).toStrictEqual([
      "CAND-S-e3",
      "CAND-S-pa",
      "CAND-S-pe",
      "CAND-S-e2",
      "CAND-S-e1",
    ]);
    expect(data.recommendedAction).toBe("apply_requires_predicate");
    expect(calls.predicatePlan?.mock.calls[0]?.[0]).toMatchObject({
      id: "CAND-S-e3",
    });
    const two = await run({ maxCandidates: 2 });
    expect(two.data.candidates.map((entry) => entry.id)).toStrictEqual([
      "CAND-S-e3",
      "CAND-S-pa",
    ]);
  });

  test("abstains between two weak candidates within the margin", async () => {
    existing = ["S-1", "S-2", "S-3", "S-4"].map((id) =>
      schema(id, `p${id.slice(2)}`),
    );
    ranks = {
      "S-1": { score: 0.95 },
      "S-2": { score: 0.9 },
      "S-3": { score: 0.85 },
      "S-4": { score: 0.8 },
    };
    apps = {
      "S-1": { eligible: true, app: 0.5 },
      "S-2": { eligible: true, app: 0.7, reasons: ["r0"] },
      "S-3": { eligible: true, app: 0.66 },
      "S-4": { eligible: false, app: 0.75 },
    };
    const { data } = await run({ maxCandidates: 5 });
    const reason =
      "weak-candidate margin abstention: p2 and p3 are within 0.06 applicability points";
    expect(
      data.candidates.map((entry) => [
        entry.id,
        entry.eligibility,
        entry.rejection_reasons,
      ]),
    ).toStrictEqual([
      ["CAND-S-1", "eligible", []],
      ["CAND-S-4", "rejected", []],
      ["CAND-S-2", "rejected", ["r0", reason]],
      ["CAND-S-3", "rejected", [reason]],
    ]);
    expect(calls.predicatePlan?.mock.calls[0]?.[0]).toMatchObject({
      id: "CAND-S-1",
    });
  });

  test("orders equally applicable candidates by their own score", async () => {
    existing = [schema("S-x", "p_x"), schema("S-y", "p_y")];
    ranks = { "S-x": { score: 0.9 }, "S-y": { score: 0.8 } };
    apps = {
      "S-x": { eligible: true, app: 0.85 },
      "S-y": { eligible: true, app: 0.85 },
    };
    overrides = { "S-x": { score: 0.1 }, "S-y": { score: 0.5 } };
    const { data } = await run({ maxCandidates: 5 });
    expect(data.candidates.map((entry) => entry.id)).toStrictEqual([
      "CAND-S-y",
      "CAND-S-x",
    ]);
  });

  test("keeps a lone weak candidate", async () => {
    apps = { "S-commit": { eligible: true, app: 0.5 } };
    const { data } = await run();
    expect(data.candidates.map((entry) => entry.eligibility)).toStrictEqual([
      "eligible",
    ]);
    expect(data.recommendedAction).toBe("apply_requires_predicate");
  });

  test("keeps a strong top candidate or one clear of the margin", async () => {
    existing = [schema("S-1", "p1"), schema("S-2", "p2"), schema("S-3", "p3")];
    ranks = {
      "S-1": { score: 0.9 },
      "S-2": { score: 0.8 },
      "S-3": { score: 0.7 },
    };
    for (const [top, second] of [
      [0.8, 0.79],
      [0.31, 0.25],
    ] as const) {
      apps = {
        "S-1": { eligible: true, app: top },
        "S-2": { eligible: true, app: second },
        "S-3": { eligible: false, app: 0.99 },
      };
      const { data } = await run({ maxCandidates: 5 });
      expect(data.candidates.map((entry) => entry.eligibility)).toStrictEqual([
        "eligible",
        "eligible",
        "rejected",
      ]);
    }
  });

  test("hides rejected candidates unless the schema was requested", async () => {
    apps = { "S-commit": { eligible: false, app: 0.2 } };
    const general = await run();
    expect(general.data.candidates).toStrictEqual([]);
    const requested = await run({ schemaId: "S-commit" });
    expect(requested.data.candidates.map((entry) => entry.id)).toStrictEqual([
      "CAND-S-commit",
    ]);
    expect(requested.data.recommendedAction).toBe("record_ontology_gap");
    expect(requested.data.applyPlan).toStrictEqual([
      { type: "fact", id: "FACT-GAP" },
    ]);
    expect(requested.data.recommendedPredicateSchema).toStrictEqual({
      draft: TEXT,
      subject: requested.data.subject,
    });
    expect(requested.data.warnings).toStrictEqual([]);
  });
});

describe("comparing eligible candidates", () => {
  const row = (name: string, applicability_score: number, score = 0) => ({
    predicate_name: name,
    applicability_score,
    score,
  });

  test("by applicability, then name", () => {
    expect(
      compareEligibleByApplicabilityThenName(row("a", 0.2), row("b", 0.5)),
    ).toBeCloseTo(0.3);
    expect(
      compareEligibleByApplicabilityThenName(row("b", 0.5), row("a", 0.5)),
    ).toBe(1);
  });

  test("by applicability, score, then name", () => {
    expect(
      compareEligibleByApplicabilityScoreThenName(
        row("a", 0.2, 1),
        row("b", 0.5, 0),
      ),
    ).toBeCloseTo(0.3);
    expect(
      compareEligibleByApplicabilityScoreThenName(
        row("a", 0.5, 0.25),
        row("b", 0.5, 0.75),
      ),
    ).toBe(0.5);
    expect(
      compareEligibleByApplicabilityScoreThenName(
        row("b", 0.5, 0.5),
        row("a", 0.5, 0.5),
      ),
    ).toBe(1);
  });
});

const STORED = {
  id: "REQ-1",
  title: "T",
  status: "open",
  priority: null,
  tags: ["x"],
  text_ref: null,
  semantic_text: "S",
  semantic_clauses: ["c"],
  semantic_inventory: [
    { claim_key: CLAIM, status: "ontology_gap" },
    null,
    "row",
    { claim_key: "CLAIM-OTHER" },
  ],
  logic_claims: ["CLAIM-A", 7, "CLAIM-S"],
};
const CONTRACT = {
  title: "T",
  status: "open",
  tags: ["x"],
  semantic_text: "S",
  semantic_clauses: ["c"],
  semantic_inventory: STORED.semantic_inventory,
  logic_claims: STORED.logic_claims,
};

describe("grounding a complete candidate", () => {
  test("plans the fact, the link and a hash-bound plan", async () => {
    stored = STORED;
    const { result, data, goals } = await run({
      requirementId: "REQ-1",
      source: "docs/a.md",
      existingLogicClaims: ["CLAIM-B", "CLAIM-A"],
    });
    const logicClaims = ["CLAIM-A", "CLAIM-S", "CLAIM-B", CLAIM];
    const relationship = {
      type: "requires_predicate",
      from: "REQ-1",
      to: "FACT-P",
    };
    const steps = [
      FACT_STEP,
      {
        type: "req",
        id: "REQ-1",
        properties: {
          ...CONTRACT,
          semantic_inventory: [
            {
              claim_key: CLAIM,
              status: "modeled",
              reason: "Grounded by the FACT-P predicate fact this plan writes.",
            },
            null,
            "row",
            { claim_key: "CLAIM-OTHER" },
          ],
          logic_claims: logicClaims,
        },
        relationships: [relationship],
      },
    ];
    expect(goals).toStrictEqual([
      constrainsGoal("REQ-1"),
      ...groundingGoals("REQ-1"),
    ]);
    expect(calls.compile?.mock.calls).toStrictEqual([
      [
        CONTEXT,
        expect.anything(),
        { requirementId: "REQ-1", claimKey: CLAIM, text: TEXT, steps },
      ],
    ]);
    expect(calls.relationshipPlan?.mock.calls).toStrictEqual([
      ["FACT-P", "REQ-1", TEXT, ["CLAIM-A", "CLAIM-S", "CLAIM-B"]],
    ]);
    expect(calls.loadEntities?.mock.calls).toHaveLength(2);
    expect(STORED.semantic_inventory[0]).toStrictEqual({
      claim_key: CLAIM,
      status: "ontology_gap",
    });
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Suggested 1 predicate candidate(s). Top applicable match: commit_action. Apply the predicate fact FACT-P, then link requires_predicate to that fact id (not a candidate id).",
      },
    ]);
    expect(result.applyPlan).toStrictEqual([FACT_STEP]);
    expect(data as unknown).toStrictEqual({
      text: TEXT,
      claimKey: CLAIM,
      logicClaims,
      source: "docs/a.md",
      requirementId: "REQ-1",
      subject: data.subject,
      candidates: [candidate("S-commit", "commit_action", 0.9)],
      recommendedAction: "apply_requires_predicate",
      recommendedPredicateSchema: null,
      applyPlan: [FACT_STEP],
      relationshipPlan: { relationship },
      plan: {
        status: "ready",
        steps,
        diagnostics: [],
        contradictionAnalysis: { witnesses: [] },
      },
      relationshipTarget: "FACT-P",
      existingGrounding: [],
      decisionConflicts: [],
      replacementPlan: null,
      bindingHints: [],
      warnings: [],
    });
  });

  test("restates a stored requirement without a ledger as it is", async () => {
    stored = {
      id: "REQ-1",
      title: "T",
      status: "open",
      semantic_inventory: "none",
    };
    const { data } = await run({ requirementId: "REQ-1" });
    expect(data.recommendedAction).toBe("apply_requires_predicate");
    expect(
      (calls.compile?.mock.calls[0]?.[2] as { steps: Row[] }).steps[1]
        ?.properties,
    ).toStrictEqual({
      title: "T",
      status: "open",
      semantic_inventory: "none",
      logic_claims: [CLAIM],
    });
  });

  test("reads the ledger fields of the second read only", async () => {
    stored = STORED;
    loads = [[STORED], []];
    await run({ requirementId: "REQ-1" });
    expect(
      (calls.compile?.mock.calls[0]?.[2] as { steps: Row[] }).steps[1]
        ?.properties,
    ).toStrictEqual({
      title: "T",
      status: "open",
      tags: ["x"],
      logic_claims: [CLAIM],
    });
  });

  test("builds no hash-bound plan without a store, a context or a stored requirement", async () => {
    const bare = await run({ requirementId: "REQ-1" }, { prolog: null });
    expect(bare.data.plan).toBeNull();
    expect(bare.data.warnings).toStrictEqual([]);
    expect(calls.loadEntities?.mock.calls).toHaveLength(0);
    stored = STORED;
    const loose = await run({ requirementId: "REQ-1" }, { context: null });
    expect(loose.data.plan).toBeNull();
    expect(loose.data.warnings).toStrictEqual([]);
    expect(loose.data.logicClaims).toStrictEqual([CLAIM]);
    expect(calls.loadEntities?.mock.calls).toHaveLength(0);
    stored = undefined;
    const missing = await run({ requirementId: "REQ-1" });
    expect(missing.data.plan).toBeNull();
    expect(missing.data.warnings).toStrictEqual([
      "No hash-bound plan: requirement REQ-1 is not stored, so its upsert step cannot restate the stored title and status. Apply applyPlan and relationshipPlan with kb_upsert.",
    ]);
    const unnamed = await run();
    expect(unnamed.data.plan).toBeNull();
    expect(unnamed.data.relationshipPlan).toStrictEqual({
      relationship: {
        type: "requires_predicate",
        from: undefined,
        to: "FACT-P",
      },
    });
    expect(calls.loadEntities?.mock.calls).toHaveLength(1);
  });

  test("links an unnamed fact without planning it", async () => {
    stored = STORED;
    predicatePlan = () => [{ type: "fact" }];
    const { data } = await run({ requirementId: "REQ-1" });
    expect(calls.relationshipPlan?.mock.calls[0]?.[0]).toBe("");
    expect(data.relationshipTarget).toBeNull();
    expect(data.plan).toBeNull();
    expect(calls.compile?.mock.calls).toHaveLength(0);
  });

  test("names what keeps the hash-bound plan from running", async () => {
    stored = STORED;
    compiled = () => ({
      status: "blocked",
      diagnostics: [],
      contradictionAnalysis: {
        witnesses: [{ reason: "r1" }, { reason: "" }, { reason: "r2" }],
      },
    });
    expect((await run({ requirementId: "REQ-1" })).data.warnings).toStrictEqual(
      [
        "Applying this grounding would contradict the current KB, so plan.status is blocked: r1; r2. Supersede or close the conflicting requirement before grounding this claim.",
      ],
    );
    compiled = () => ({
      status: "needs_resolution",
      diagnostics: ["d1", "d2"],
      contradictionAnalysis: { witnesses: [] },
    });
    expect((await run({ requirementId: "REQ-1" })).data.warnings).toStrictEqual(
      [
        "The hash-bound plan needs resolution before kb_apply_plan can run it: d1; d2",
      ],
    );
    compiled = () => {
      throw new Error("bad clock");
    };
    const failed = await run({ requirementId: "REQ-1" });
    expect(failed.data.plan).toBeNull();
    expect(failed.data.warnings).toStrictEqual([
      "No hash-bound plan could be compiled (bad clock); apply applyPlan and relationshipPlan with kb_upsert.",
    ]);
  });

  test("asks to extend a requirement whose ledger lacks the claim", async () => {
    stored = {
      ...STORED,
      semantic_inventory: [null, "row", { claim_key: "CLAIM-OTHER" }],
    };
    const { result, data, goals } = await run({ requirementId: "REQ-1" });
    expect(data.recommendedAction).toBe("extend_requirement");
    expect(data.applyPlan).toStrictEqual([]);
    expect(data.relationshipPlan).toBeNull();
    expect(data.relationshipTarget).toBeNull();
    expect(data.plan).toBeNull();
    expect(goals.at(-1)).toContain("decision_signatures");
    expect(data.warnings).toStrictEqual([
      `The proposition ledger of REQ-1 has no claim ${CLAIM} for this text, so the requirement cannot ground it: a requirement grounds only the propositions its prose states. No fact was planned, because it would be written without a link. Extend the requirement's prose with this clause (kb_model mode requirement, or kb_upsert with the extended semantic_text and the ledger kb_model mode analyze returns), then call mode predicates again.`,
    ]);
    expect(result.content[0]?.text).toBe(
      `Matched commit_action as commit_action(a), but REQ-1 does not state this claim (its ledger has no ${CLAIM}). Extend the requirement's prose with this clause first; no fact or link was planned.`,
    );
  });
});

describe("a requirement that already grounds the claim", () => {
  const grounded =
    (
      rows: Record<string, Row | undefined>,
      targets: Record<string, string | undefined>,
    ): Handler =>
    (goal) => {
      for (const [type, list] of Object.entries(targets))
        if (goal === groundingGoal(type, "REQ-1"))
          return list === undefined
            ? { success: true, bindings: {} }
            : { success: true, bindings: { Targets: list } };
      for (const [id, bindings] of Object.entries(rows))
        if (goal === factGoal(id))
          return bindings === undefined
            ? undefined
            : { success: true, bindings };
      return undefined;
    };
  const replaceable = grounded(
    {
      "FACT-old": {
        ClaimKey: `'${CLAIM}'`,
        FactKind: "'property_value'",
        CanonicalKey: "''",
      },
      "FACT-r": { ClaimKey: `"${CLAIM}"`, CanonicalKey: "'o'k(b)'" },
      "FACT-none": { CanonicalKey: "'x(a)'" },
    },
    {
      requires_property: "['FACT-old','FACT-x']",
      requires_predicate: undefined,
      requires_rule: "['FACT-r','FACT-none']",
    },
  );
  const old = { type: "requires_property", from: "REQ-1", to: "FACT-old" };
  const rule = { type: "requires_rule", from: "REQ-1", to: "FACT-r" };
  const replacement = (properties: Row | null, restate: string) => {
    const upsert = (relationships: Row[]) => ({
      type: "req",
      id: "REQ-1",
      ...(properties === null ? {} : { properties }),
      relationships,
    });
    return {
      relationshipTarget: "FACT-P",
      expected: {
        kbCheckAfterStep: [
          [],
          ["logic-coverage", "strict-req-fact-pairing"],
          [],
        ],
        kbCheckAfterLastStep: [],
        rollbackWhen: "kb_check after the last step is not clean",
      },
      steps: [
        {
          operation: "kb_upsert",
          input: FACT_STEP,
          reason: "Write the predicate fact that will ground the claim.",
        },
        {
          operation: "kb_delete",
          input: { relationships: [old, rule] },
          reason:
            "Retract the existing grounding link so the claim keeps exactly one logical grounding relationship.",
        },
        {
          operation: "kb_upsert",
          input: upsert([
            { type: "requires_predicate", from: "REQ-1", to: "FACT-P" },
          ]),
          reason: `Link requires_predicate to FACT-P; ${restate}.`,
        },
      ],
      rollback: {
        operation: "kb_upsert",
        input: upsert([old, rule]),
        reason:
          "Only if kb_check after the last step is not clean (it still reports logic-coverage or strict-req-fact-pairing for REQ-1, or the step failed): restore the retracted grounding link so the claim is grounded again.",
      },
      instructions:
        "Only replace the grounding when the predicate states the claim at least as precisely as FACT-old, FACT-r. Apply the steps unchanged, in order and back to back: linking requires_predicate before the retraction is rejected because the claim would have two groundings, and between the retraction and the link the claim is ungrounded and its subject unpaired, so kb_check reports both logic-coverage and strict-req-fact-pairing for REQ-1 until the last step lands (see expected.kbCheckAfterStep). Run kb_check after the last step; if it is not clean, apply rollback.",
    };
  };

  test("plans a replacement of the grounding", async () => {
    stored = STORED;
    const { result, data, goals } = await run(
      { requirementId: "REQ-1" },
      { handle: replaceable },
    );
    expect(goals.slice(0, 7)).toStrictEqual([
      constrainsGoal("REQ-1"),
      groundingGoal("requires_property", "REQ-1"),
      factGoal("FACT-old"),
      factGoal("FACT-x"),
      groundingGoal("requires_predicate", "REQ-1"),
      groundingGoal("requires_rule", "REQ-1"),
      factGoal("FACT-r"),
    ]);
    expect(data.existingGrounding).toStrictEqual([
      {
        relationship: old,
        factId: "FACT-old",
        factKind: "property_value",
        claimKey: CLAIM,
        canonicalKey: null,
        matchedBy: "claim_key",
      },
      {
        relationship: rule,
        factId: "FACT-r",
        factKind: null,
        claimKey: CLAIM,
        canonicalKey: "o'k(b)",
        matchedBy: "claim_key",
      },
    ]);
    expect(data.recommendedAction).toBe("replace_grounding");
    expect(data.applyPlan).toStrictEqual([]);
    expect(data.relationshipPlan).toBeNull();
    expect(data.plan).toBeNull();
    expect(data.relationshipTarget).toBe("FACT-P");
    expect(data.replacementPlan as unknown).toStrictEqual(
      replacement(
        { title: "T", status: "open", tags: ["x"] },
        "the properties restate the stored title, status and metadata; kb_upsert keeps the stored proposition ledger",
      ),
    );
    expect(calls.loadEntities?.mock.calls).toHaveLength(2);
    expect(data.warnings).toStrictEqual([
      `REQ-1 already grounds this claim (${CLAIM}) through requires_property -> FACT-old, requires_rule -> FACT-r. A modeled claim takes exactly one logical grounding relationship, so adding requires_predicate beside it fails the proposition-complete rule. Keep the existing grounding, or follow replacementPlan to swap it for the predicate.`,
    ]);
    expect(result.content[0]?.text).toBe(
      "REQ-1 already grounds this claim through requires_property -> FACT-old, requires_rule -> FACT-r. To use commit_action instead, follow replacementPlan and link requires_predicate to FACT-P; otherwise keep the existing grounding.",
    );
  });

  test("reads the requirement for the replacement when no context read it", async () => {
    stored = { ...STORED, owner: undefined };
    const { data } = await run(
      { requirementId: "REQ-1" },
      { handle: replaceable, context: null },
    );
    expect(calls.loadEntities?.mock.calls).toHaveLength(1);
    expect(data.replacementPlan as unknown).toStrictEqual(
      replacement(
        { title: "T", status: "open", tags: ["x"] },
        "the properties restate the stored title, status and metadata; kb_upsert keeps the stored proposition ledger",
      ),
    );
    stored = { id: "REQ-1", status: "open" };
    const unread = await run(
      { requirementId: "REQ-1" },
      { handle: replaceable, context: null },
    );
    expect(unread.data.replacementPlan as unknown).toStrictEqual(
      replacement(
        null,
        "add the requirement's stored title and status as properties (they could not be read), keep this relationship only",
      ),
    );
    stored = { id: "REQ-1", title: "T" };
    const untitled = await run(
      { requirementId: "REQ-1" },
      { handle: replaceable, context: null },
    );
    expect(
      (untitled.data.replacementPlan as { steps: Row[] }).steps[2],
    ).not.toHaveProperty("input.properties");
    stored = new Error("store offline");
    const failed = await run(
      { requirementId: "REQ-1" },
      { handle: replaceable, context: null },
    );
    expect(failed.data.warnings[0]).toBe(
      "Requirement REQ-1 could not be read (store offline); add its stored title and status to the last replacementPlan step before applying it.",
    );
  });

  test("keeps the grounding of the same predicate tuple", async () => {
    stored = STORED;
    const { result, data, goals } = await run(
      { requirementId: "REQ-1" },
      {
        handle: grounded(
          {
            "FACT-old": {
              ClaimKey: `'${CLAIM}'`,
              CanonicalKey: "'commit_action(a)'",
            },
            "FACT-c": {
              ClaimKey: "'CLAIM-OTHER'",
              CanonicalKey: "'commit_action(a)'",
            },
            "FACT-z": { ClaimKey: "'CLAIM-OTHER'", CanonicalKey: "''" },
          },
          { requires_property: "['FACT-old','FACT-c','FACT-z']" },
        ),
      },
    );
    const sameTuple = `requires_property -> FACT-old, requires_property -> FACT-c (matched by canonical_key; its claim_key CLAIM-OTHER differs from this text's ${CLAIM})`;
    expect(data.recommendedAction).toBe("keep_existing_grounding");
    expect(data.existingGrounding.map((row) => row.matchedBy)).toStrictEqual([
      "claim_key",
      "canonical_key",
    ]);
    expect(data.applyPlan).toStrictEqual([]);
    expect(data.replacementPlan).toBeNull();
    expect(data.relationshipTarget).toBeNull();
    expect(goals.some((goal) => goal.includes("decision_signatures"))).toBe(
      false,
    );
    expect(data.warnings).toStrictEqual([
      `REQ-1 already grounds the predicate commit_action(a) through ${sameTuple}. Keep that grounding: no fact or link is needed. If this text is a further proposition of the requirement, extend its prose and run kb_model mode analyze before grounding it separately.`,
    ]);
    expect(result.content[0]?.text).toBe(
      `REQ-1 already grounds commit_action(a) through ${sameTuple}. Nothing to apply; keep that grounding.`,
    );
  });

  test("never matches an empty canonical key", async () => {
    stored = STORED;
    overrides = { "S-commit": { canonical_key: "" } };
    const { data } = await run(
      { requirementId: "REQ-1" },
      {
        handle: grounded(
          { "FACT-z": { ClaimKey: "'CLAIM-OTHER'", CanonicalKey: "''" } },
          { requires_property: "['FACT-z']" },
        ),
      },
    );
    expect(data.existingGrounding).toStrictEqual([]);
    expect(data.recommendedAction).toBe("apply_requires_predicate");
  });

  test("reads nothing from failed answers that still carry bindings", async () => {
    const { data, goals } = await run(
      { requirementId: "REQ-1" },
      {
        handle: (goal) => {
          if (goal === groundingGoal("requires_property", "REQ-1"))
            return { success: false, bindings: { Targets: "['FACT-old']" } };
          if (goal === groundingGoal("requires_rule", "REQ-1"))
            return { success: true, bindings: { Targets: "['FACT-r']" } };
          if (goal === factGoal("FACT-r"))
            return { success: false, bindings: { ClaimKey: `'${CLAIM}'` } };
          return undefined;
        },
      },
    );
    expect(goals).not.toContain(factGoal("FACT-old"));
    expect(goals).toContain(factGoal("FACT-r"));
    expect(data.existingGrounding).toStrictEqual([]);
  });

  test("keeps what it found when a later read fails", async () => {
    const { data } = await run(
      { requirementId: "REQ-1" },
      {
        handle: (goal) =>
          goal === groundingGoal("requires_predicate", "REQ-1")
            ? new Error("offline")
            : replaceable(goal),
      },
    );
    expect(data.existingGrounding.map((row) => row.factId)).toStrictEqual([
      "FACT-old",
    ]);
    expect(data.warnings[0]).toBe(
      "Existing grounding of REQ-1 could not be read (offline); check its requires_property, requires_predicate and requires_rule links before linking a predicate.",
    );
  });

  test("reads no grounding without a store or a requirement", async () => {
    const { data } = await run({ requirementId: "REQ-1" }, { prolog: null });
    expect(data.existingGrounding).toStrictEqual([]);
    const { goals } = await run({}, { handle: replaceable });
    expect(goals.some((goal) => goal.includes("requires_"))).toBe(false);
  });

  test("offers no replacement for a candidate that is not complete", async () => {
    stored = STORED;
    overrides = {
      "S-commit": {
        binding_status: "incomplete",
        unbound_arguments: ["value"],
      },
    };
    const { result, data } = await run(
      { requirementId: "REQ-1" },
      { handle: replaceable },
    );
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.replacementPlan).toBeNull();
    expect(data.relationshipTarget).toBeNull();
    expect(data.warnings).toStrictEqual([
      `REQ-1 already grounds this claim (${CLAIM}) through requires_property -> FACT-old, requires_rule -> FACT-r. A modeled claim takes exactly one logical grounding relationship, so adding requires_predicate beside it fails the proposition-complete rule. Keep the existing grounding; no predicate replacement is available yet.`,
    ]);
    expect(result.content[0]?.text).toStartWith(
      "REQ-1 already grounds this claim through requires_property -> FACT-old, requires_rule -> FACT-r. Matched commit_action, but exact",
    );
  });

  test("records an ontology gap beside a grounding when nothing applies", async () => {
    stored = STORED;
    apps = { "S-commit": { eligible: false, app: 0.1 } };
    const { result, data } = await run(
      { requirementId: "REQ-1" },
      { handle: replaceable },
    );
    expect(data.recommendedAction).toBe("record_ontology_gap");
    expect(data.applyPlan).toStrictEqual([{ type: "fact", id: "FACT-GAP" }]);
    expect(result.content[0]?.text).toBe(
      "REQ-1 already grounds this claim through requires_property -> FACT-old, requires_rule -> FACT-r. No predicate candidate passed the semantic applicability gate; keep the existing grounding and record the ontology-gap observation in applyPlan so the missing schema stays visible.",
    );
  });

  test("names a missing ledger claim without blocking a grounded claim", async () => {
    stored = { ...STORED, semantic_inventory: [] };
    const grounded = await run(
      { requirementId: "REQ-1" },
      { handle: replaceable },
    );
    expect(grounded.data.recommendedAction).toBe("replace_grounding");
    expect(grounded.data.warnings).toHaveLength(1);
    overrides = {
      "S-commit": {
        binding_status: "incomplete",
        unbound_arguments: ["value"],
      },
    };
    const incomplete = await run({ requirementId: "REQ-1" });
    expect(incomplete.data.warnings).toStrictEqual([
      `The proposition ledger of REQ-1 has no claim ${CLAIM} for this text, so the requirement cannot ground it: a requirement grounds only the propositions its prose states. Extend the requirement's prose with this clause (kb_model mode requirement, or kb_upsert with the extended semantic_text and the ledger kb_model mode analyze returns), then call mode predicates again.`,
    ]);
  });
});

describe("a candidate that is not complete", () => {
  test("asks for the bindings it still needs", async () => {
    overrides = {
      "S-commit": {
        binding_status: "incomplete",
        unbound_arguments: ["actor", "value"],
      },
    };
    participants = ["actor"];
    const { result, data } = await run(
      { requirementId: "REQ-1" },
      { handle: keys("['a.b']") },
    );
    const recommended = data.candidates[0];
    expect(calls.participants?.mock.calls).toStrictEqual([
      [recommended, TEXT, ["a.b"]],
    ]);
    expect(calls.hints?.mock.calls).toStrictEqual([
      [recommended, TEXT, ["a.b"]],
    ]);
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.applyPlan).toStrictEqual([]);
    expect(data.bindingHints).toStrictEqual([
      { argument: "x", candidate: "CAND-S-commit" },
    ]);
    expect(data.recommendedPredicateSchema).toBeNull();
    expect(result.content[0]?.text).toBe(
      "Matched commit_action, but exact reviewed values are still required for: actor, value. Bind them from the claim text: x from the claim. A value that repeats an argument name or a stop word stays unbound. No apply plan was generated.",
    );
  });

  test("records an ontology gap when only unnamed participants are unbound", async () => {
    overrides = {
      "S-commit": {
        binding_status: "incomplete",
        unbound_arguments: ["actor", "role"],
      },
    };
    participants = ["actor", "role"];
    const { result, data } = await run();
    expect(data.recommendedAction).toBe("record_ontology_gap");
    expect(data.applyPlan).toStrictEqual([{ type: "fact", id: "FACT-GAP" }]);
    expect(data.bindingHints).toStrictEqual([
      { argument: "x", candidate: "CAND-S-commit" },
    ]);
    expect(data.recommendedPredicateSchema).toBeNull();
    expect(result.content[0]?.text).toBe(
      "Matched commit_action, but the claim names no actor or role (x from the claim), so this schema does not fit the claim. Record the ontology-gap observation in applyPlan instead of inventing a participant; a predicate_schema whose arguments the claim names would fit.",
    );
  });

  test("asks for bindings when no participant is unnamed", async () => {
    overrides = {
      "S-commit": { binding_status: "incomplete", unbound_arguments: [] },
    };
    expect((await run()).data.recommendedAction).toBe(
      "provide_argument_bindings",
    );
  });

  test("checks participants only for an incomplete recommendation", async () => {
    await run();
    apps = { "S-commit": { eligible: false, app: 0.1 } };
    await run();
    expect(calls.participants?.mock.calls).toHaveLength(0);
    overrides = { "S-commit": { unbound_arguments: ["actor"] } };
    apps = {};
    participants = ["actor"];
    const { data } = await run();
    expect(data.bindingHints).toStrictEqual([]);
  });
});

describe("a candidate about another subject", () => {
  const unpaired = async (
    extra: Partial<PredicateSuggestion>,
    argumentNames: string[],
  ) => {
    existing = [
      schema("S-commit", "commit_action", { argument_names: argumentNames }),
    ];
    overrides = { "S-commit": { subject_pairing: "unpaired", ...extra } };
    const { data } = await run(
      { requirementId: "REQ-1" },
      { handle: keys("['c.d','a.b']") },
    );
    return data.warnings.find((line) =>
      line.startsWith("commit_action is not offered"),
    );
  };

  test("explains why it is not offered", async () => {
    const tail =
      ", so kb_check would report strict-req-fact-pairing after the link. Pass subjectHint with one of a.b, c.d and retry.";
    expect(await unpaired({ subject_key: null }, ["subject", "x"])).toBe(
      `commit_action is not offered for grounding because its subject argument is unbound, not a subject REQ-1 constrains (a.b, c.d)${tail}`,
    );
    expect(await unpaired({ subject_key: "z.z" }, ["subject", "x"])).toBe(
      `commit_action is not offered for grounding because its subject argument is z.z, not a subject REQ-1 constrains (a.b, c.d)${tail}`,
    );
    expect(await unpaired({ subject_key: null }, ["owner", "x"])).toBe(
      `commit_action is not offered for grounding because the commit_action schema does not name the requirement's subject (its arguments are owner, x) and its subject_key cannot be chosen one of the subjects REQ-1 constrains (a.b, c.d)${tail}`,
    );
    expect(await unpaired({ subject_key: "z.z" }, ["owner", "x"])).toBe(
      `commit_action is not offered for grounding because the commit_action schema does not name the requirement's subject (its arguments are owner, x) and its subject_key z.z is not one of the subjects REQ-1 constrains (a.b, c.d)${tail}`,
    );
  });
});

describe("no applicable candidate", () => {
  test("records an ontology gap with a schema draft", async () => {
    apps = { "S-commit": { eligible: false, app: 0.1 } };
    const { result, data } = await run();
    expect(data.candidates).toStrictEqual([]);
    expect(data.recommendedAction).toBe("record_ontology_gap");
    expect(data.applyPlan).toStrictEqual([{ type: "fact", id: "FACT-GAP" }]);
    expect(data.recommendedPredicateSchema).toStrictEqual({
      draft: TEXT,
      subject: data.subject,
    });
    expect(data.relationshipTarget).toBeNull();
    expect(data.warnings).toStrictEqual([
      "No predicate candidate met minScore. If this is recurring domain language, create a fact_kind=predicate_schema fact; otherwise keep the generated review:ontology-gap observation. Do not invent unsupported predicate names without a predicate_schema.",
    ]);
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "No predicate candidate passed the semantic applicability gate; record an ontology gap and review the generated schema draft instead of silently writing prose.",
      },
    ]);
  });
});

describe("decision conflicts", () => {
  const decisionGoal = (args: string, namespace: string) =>
    `findall(Row, (kb:decision_signatures(_Signatures), memberchk(decision_signature(${namespace}, 'commit_action', 2, _KeyPositions, _DecisionPosition), _Signatures), nth1(_DecisionPosition, ${args}, _ProposedDecision), kb:effective_decision(_ProposedDecision, deny, _ProposedEffect), kb:decision_req_fact(_Signatures, _Req, _Fact, ${namespace}, 'commit_action', _Args, _Polarity, _KeyPositions, _DecisionPosition), kb:bind_key_arguments(_KeyPositions, ${args}, _Args), nth1(_DecisionPosition, _Args, _Decision), kb:effective_decision(_Decision, _Polarity, _Effect), _Effect \\== _ProposedEffect, atomic_list_concat([_Req, _Fact, _Effect, _ProposedEffect], '|', Row)), Rows)`;
  const rows =
    (Rows: string | undefined): Handler =>
    (goal) =>
      goal.includes("decision_signatures")
        ? { success: true, bindings: Rows === undefined ? {} : { Rows } }
        : undefined;

  test("names each stored decision the candidate contradicts, in order", async () => {
    overrides = {
      "S-commit": {
        predicate_args: ["a", "b'c"],
        polarity: "deny",
        canonical_key: "commit_action(a,b'c)",
      },
    };
    const { result, data, goals } = await run(
      {},
      {
        handle: rows(
          "['REQ-b|FACT-b|deny|allow','REQ-a|FACT-z|deny|allow','REQ-a|FACT-a|deny|allow','|F|e|p','R||e|p','R|F||p','R|F|e|']",
        ),
      },
    );
    expect(goals).toStrictEqual([decisionGoal("['a','b''c']", "_Namespace")]);
    const conflict = (requirementId: string, factId: string) => ({
      requirementId,
      factId,
      effect: "deny",
      proposedEffect: "allow",
      canonicalKey: "commit_action(a,b'c)",
    });
    expect(data.decisionConflicts).toStrictEqual([
      conflict("REQ-a", "FACT-a"),
      conflict("REQ-a", "FACT-z"),
      conflict("REQ-b", "FACT-b"),
    ]);
    const warning = (requirementId: string, factId: string, own = "") =>
      `The proposed commit_action(a,b'c) (allow) contradicts ${factId} (deny) under ${requirementId}${own}: both decide commit_action on the same key arguments. kb_upsert refuses a grounding link that introduces this conflict; supersede or close the conflicting requirement, or correct the decision, before applying.`;
    expect(data.warnings).toStrictEqual([
      warning("REQ-a", "FACT-a"),
      warning("REQ-a", "FACT-z"),
      warning("REQ-b", "FACT-b"),
    ]);
    expect(result.content[0]?.text).toBe(
      "Suggested 1 predicate candidate(s). Top applicable match: commit_action. Apply the predicate fact FACT-P, then link requires_predicate to that fact id (not a candidate id). It would contradict FACT-a (deny) under REQ-a, FACT-z (deny) under REQ-a, FACT-b (deny) under REQ-b: see decisionConflicts before applying anything.",
    );
    const own = await run(
      { requirementId: "REQ-a" },
      { handle: rows("['REQ-a|FACT-a|deny|allow','REQ-b|FACT-b|deny|allow']") },
    );
    expect(own.data.warnings.slice(1)).toStrictEqual([
      warning("REQ-a", "FACT-a", ", the requirement this claim would ground"),
      warning("REQ-b", "FACT-b"),
    ]);
  });

  test("names the schema's namespace", async () => {
    existing = [
      schema("S-commit", "commit_action", { predicate_namespace: "ns'x" }),
    ];
    overrides = {
      "S-commit": { predicate_args: ["a", "b"], polarity: "deny" },
    };
    const { goals } = await run({}, { handle: rows("[]") });
    expect(goals).toStrictEqual([decisionGoal("['a','b']", "'ns''x'")]);
  });

  test("are not looked up for missing arguments, without a store or after a plan", async () => {
    for (const predicate_args of [[], ["a", ""], ["", ""]]) {
      overrides = { "S-commit": { predicate_args } };
      const { goals, data } = await run({}, { handle: rows("['R|F|e|p']") });
      expect(goals).toStrictEqual([]);
      expect(data.decisionConflicts).toStrictEqual([]);
    }
    overrides = {};
    const bare = await run({}, { prolog: null });
    expect(bare.data.decisionConflicts).toStrictEqual([]);
    expect(bare.data.warnings).toStrictEqual([]);
    expect(bare.result.content[0]?.text).not.toContain("contradict");
  });

  test("read nothing from a failed or empty answer and warn when unreadable", async () => {
    for (const handle of [
      () => ({ success: false, bindings: { Rows: "['R|F|e|p']" } }),
      rows(undefined),
    ]) {
      const { data } = await run({}, { handle });
      expect(data.decisionConflicts).toStrictEqual([]);
      expect(data.warnings).toStrictEqual([]);
    }
    const { data } = await run(
      {},
      { handle: () => new Error("no signatures") },
    );
    expect(data.decisionConflicts).toStrictEqual([]);
    expect(data.warnings).toStrictEqual([
      "Decision conflicts for commit_action(a) could not be read (no signatures); preview the grounding with kb_upsert dryRun and plannedFacts before applying.",
    ]);
  });
});

describe("the operation", () => {
  test("suggests with the context's store", async () => {
    const goals: string[] = [];
    const context = {
      ...CONTEXT,
      prolog: {
        query: async (goal: string) => {
          goals.push(goal);
          return { success: false, bindings: {} };
        },
      },
    } as unknown as OperationContext;
    const result = await executeSuggestPredicates(
      { text: TEXT, requirementId: "REQ-1" },
      context,
    );
    expect(goals[0]).toBe(constrainsGoal("REQ-1"));
    expect((result.structuredContent as Row).recommendedAction).toBe(
      "apply_requires_predicate",
    );
    const bare = await executeSuggestPredicates(
      { text: TEXT, requirementId: "REQ-1" },
      CONTEXT,
    );
    expect((bare.structuredContent as Row).warnings).toStrictEqual([]);
  });
});
