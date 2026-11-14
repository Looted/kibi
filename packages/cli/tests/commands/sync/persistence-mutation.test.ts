import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as path from "node:path";
import {
  persistEntities,
  persistRelationships,
  queryStoreTotals,
  relationshipFailureMessage,
  retractEntitiesById,
  retractEntitiesForSources,
  retractEntityRelationshipsById,
  retractRelationships,
} from "../../../src/commands/sync/persistence.js";
import * as untrackedTargets from "../../../src/commands/sync/untracked-targets.js";
import type {
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult,
} from "../../../src/extractors/markdown.js";
import type { PrologProcess } from "../../../src/prolog.js";
import * as discoveryEntities from "../../../src/public/operations/discovery-entities.js";
import * as proofReceipt from "../../../src/public/proof-receipt.js";

// Engine persistence against a scripted engine: the goals each operation
// sends, how answers are read back, batching and the retry paths.

type Answer = {
  success: boolean;
  bindings?: Record<string, unknown>;
  error?: string;
};
type Responder = (goal: string, call: number) => Answer | Promise<Answer>;

interface Engine {
  prolog: PrologProcess;
  queries: string[];
  batches: string[][];
  lifecycle: string[];
}

function engine(
  options: {
    query?: Responder;
    batch?: (goals: readonly string[]) => Answer | Promise<Answer>;
    terminate?: () => Promise<void>;
    start?: () => Promise<void>;
  } = {},
): Engine {
  const queries: string[] = [];
  const batches: string[][] = [];
  const lifecycle: string[] = [];
  const counts = new Map<string, number>();
  const prolog: Record<string, unknown> = {
    query: async (goal: string) => {
      queries.push(goal);
      const call = counts.get(goal) ?? 0;
      counts.set(goal, call + 1);
      return (await options.query?.(goal, call)) ?? { success: true };
    },
  };
  const batch = options.batch;
  if (batch !== undefined) {
    prolog.queryBatch = async (goals: readonly string[]) => {
      batches.push([...goals]);
      return batch(goals);
    };
  }
  const { terminate, start } = options;
  if (terminate !== undefined)
    prolog.terminate = async () => {
      lifecycle.push("terminate");
      await terminate();
    };
  if (start !== undefined)
    prolog.start = async () => {
      lifecycle.push("start");
      await start();
    };
  return {
    prolog: prolog as unknown as PrologProcess,
    queries,
    batches,
    lifecycle,
  };
}

// The two codecs in use quote an apostrophe differently; compare goals with
// either spelling folded to a bare apostrophe.
const fold = (goal: string) =>
  goal.replaceAll("\\'", "'").replaceAll("''", "'");

function entity(overrides: Partial<ExtractedEntity> = {}): ExtractedEntity {
  return {
    id: "REQ-1",
    type: "req",
    title: "Title",
    status: "open",
    created_at: "c",
    updated_at: "u",
    source: "docs/REQ-1.md",
    ...overrides,
  };
}

function result(
  value: Partial<ExtractedEntity> = {},
  relationships: ExtractedRelationship[] = [],
  sourceFile?: string,
): ExtractionResult {
  return {
    entity: entity(value),
    relationships,
    ...(sourceFile === undefined ? {} : { sourceFile }),
  };
}

let restores: Array<() => void>;
let warns: string[];

beforeEach(() => {
  restores = [];
  warns = [];
  const warn = spyOn(console, "warn").mockImplementation((...args) => {
    warns.push(args.map(String).join(" "));
  });
  restores.push(() => warn.mockRestore());
});

afterEach(() => {
  for (const restore of restores.reverse()) restore();
});

describe("source lookups", () => {
  test("reads quoted, plain and malformed ids from one batch", async () => {
    const absolute = path.join(process.cwd(), "dir", "a.md");
    const fake = engine({
      query: (goal) =>
        goal.startsWith("findall(")
          ? {
              success: true,
              bindings: {
                Ids: "  [alpha,'It''s', 'q' ,bad id,,A-b_9.c:d/e@f+g,'open,closed']  ",
              },
            }
          : { success: true },
    });
    const count = await retractEntitiesForSources(fake.prolog, [
      absolute,
      "rel/b.md",
      absolute,
    ]);
    expect(count).toBe(4);
    expect(fake.queries[0]).toBe(
      `findall(Id, (member(Source, [${[
        absolute,
        path.join("dir", "a.md"),
        "a.md",
        "rel/b.md",
        "b.md",
      ]
        .map((value) => JSON.stringify(value))
        .join(
          ",",
        )}]), kb_entities_by_source(Source, SourceIds), member(Id, SourceIds)), Ids)`,
    );
    expect(fake.queries.slice(1).map(fold)).toEqual([
      "kb_retract_entity(alpha)",
      "kb_retract_entity('It's')",
      "kb_retract_entity(q)",
      "kb_retract_entity('A-b_9.c:d/e@f+g')",
    ]);
  });

  test.each([
    ["no list", "alpha"],
    ["an open list", "[alpha"],
    ["a closed tail only", "alpha]"],
    ["an empty list", "[]"],
    ["a blank list", "[ ]"],
    ["a non-string", 5],
  ])("reads %s as no ids", async (_label, ids) => {
    const fake = engine({
      query: () => ({ success: true, bindings: { Ids: ids } }),
    });
    expect(await retractEntitiesForSources(fake.prolog, ["a.md"])).toBe(0);
    expect(fake.queries).toHaveLength(1);
  });

  test("looks sources up in batches of 200", async () => {
    const files = Array.from({ length: 201 }, (_, index) => `f${index}.md`);
    const fake = engine({
      query: (goal) =>
        goal.startsWith("findall(") && goal.includes('"f200.md"')
          ? { success: true, bindings: { Ids: "[last]" } }
          : { success: true },
    });
    expect(await retractEntitiesForSources(fake.prolog, files)).toBe(1);
    expect(fake.queries).toHaveLength(3);
    expect(fake.queries[0]).toContain('"f0.md"');
    expect(fake.queries[0]).toContain('"f199.md"');
    expect(fake.queries[0]).not.toContain('"f200.md"');
    expect(fake.queries[1]).toBe(
      'findall(Id, (member(Source, ["f200.md"]), kb_entities_by_source(Source, SourceIds), member(Id, SourceIds)), Ids)',
    );
    expect(fake.queries[2]).toBe("kb_retract_entity(last)");
  });

  test("retries a failed batch one source at a time", async () => {
    const fake = engine({
      query: (goal) => {
        if (goal.startsWith("findall(")) return { success: false };
        if (goal === 'kb_entities_by_source("x.md", Ids)')
          return { success: true, bindings: { Ids: "[one]" } };
        if (goal === 'kb_entities_by_source("y.md", Ids)')
          return { success: false, bindings: { Ids: "[hidden]" } };
        return { success: true };
      },
    });
    expect(
      await retractEntitiesForSources(fake.prolog, ["x.md", "y.md", "z.md"]),
    ).toBe(1);
    expect(fake.queries.slice(1)).toEqual([
      'kb_entities_by_source("x.md", Ids)',
      'kb_entities_by_source("y.md", Ids)',
      'kb_entities_by_source("z.md", Ids)',
      "kb_retract_entity(one)",
    ]);
  });

  test("tolerates answers without bindings", async () => {
    const batched = engine({ query: () => ({ success: true }) });
    expect(await retractEntitiesForSources(batched.prolog, ["a.md"])).toBe(0);
    const single = engine({
      query: (goal) => ({ success: !goal.startsWith("findall(") }),
    });
    expect(await retractEntitiesForSources(single.prolog, ["a.md"])).toBe(0);
    expect(single.queries).toHaveLength(2);
  });
});

describe("retracting by source", () => {
  const found: Responder = (goal) =>
    goal.startsWith("findall(")
      ? { success: true, bindings: { Ids: "[a,b]" } }
      : { success: true };

  test("retracts nothing when no entity matches", async () => {
    const fake = engine({ batch: () => ({ success: true }) });
    expect(await retractEntitiesForSources(fake.prolog, [])).toBe(0);
    expect(fake.queries).toEqual([]);
    expect(fake.batches).toEqual([]);
  });

  test("uses one batch when the engine has one", async () => {
    const fake = engine({ query: found, batch: () => ({ success: true }) });
    expect(await retractEntitiesForSources(fake.prolog, ["s.md"])).toBe(2);
    expect(fake.batches).toEqual([
      ["kb_retract_entity(a)", "kb_retract_entity(b)"],
    ]);
    expect(fake.queries).toHaveLength(1);
  });

  test("reports a failed batch", async () => {
    await expect(
      retractEntitiesForSources(
        engine({ query: found, batch: () => ({ success: false, error: "E" }) })
          .prolog,
        ["s.md"],
      ),
    ).rejects.toThrow(/^E$/);
    await expect(
      retractEntitiesForSources(
        engine({ query: found, batch: () => ({ success: false }) }).prolog,
        ["s.md"],
      ),
    ).rejects.toThrow(/^Failed to retract changed source entities$/);
  });

  test("retracts one by one without a batch and stops at a failure", async () => {
    const fake = engine({
      query: (goal) =>
        goal === "kb_retract_entity(a)"
          ? { success: false, error: "first" }
          : found(goal, 0),
    });
    await expect(
      retractEntitiesForSources(fake.prolog, ["s.md"]),
    ).rejects.toThrow(/^first$/);
    expect(fake.queries.slice(1)).toEqual(["kb_retract_entity(a)"]);
    const quiet = engine({
      query: (goal) =>
        goal === "kb_retract_entity(b)" ? { success: false } : found(goal, 0),
    });
    await expect(
      retractEntitiesForSources(quiet.prolog, ["s.md"]),
    ).rejects.toThrow(/^Failed to retract changed source entity$/);
    const ok = engine({ query: found });
    expect(await retractEntitiesForSources(ok.prolog, ["s.md"])).toBe(2);
    expect(ok.queries.slice(1)).toEqual([
      "kb_retract_entity(a)",
      "kb_retract_entity(b)",
    ]);
  });
});

describe("exact deltas", () => {
  const cases = [
    {
      name: "entities",
      run: (prolog: PrologProcess) =>
        retractEntitiesById(prolog, ["a", "b", "a"]),
      empty: (prolog: PrologProcess) => retractEntitiesById(prolog, []),
      goals: ["kb_retract_entity(a)", "kb_retract_entity(b)"],
      returned: 2 as number | undefined,
      fallback: "Failed to retract entity delta",
    },
    {
      name: "entity relationships",
      run: (prolog: PrologProcess) =>
        retractEntityRelationshipsById(prolog, ["a", "b", "a"]),
      empty: (prolog: PrologProcess) =>
        retractEntityRelationshipsById(prolog, []),
      goals: [
        "kb_retract_entity_relationships(a)",
        "kb_retract_entity_relationships(b)",
      ],
      returned: undefined,
      fallback: "Failed to retract relationship delta",
    },
    {
      name: "relationships",
      run: (prolog: PrologProcess) =>
        retractRelationships(prolog, [
          { type: "depends_on", from: "a", to: "B-1" },
          { type: "verified_by", from: "c", to: "d" },
        ]),
      empty: (prolog: PrologProcess) => retractRelationships(prolog, []),
      goals: [
        "kb_retract_relationship(depends_on, a, 'B-1')",
        "kb_retract_relationship(verified_by, c, d)",
      ],
      returned: 2,
      fallback: "Failed to retract relationship shard delta",
    },
  ];

  test.each(cases)("$name: batch, transaction and failures", async (spec) => {
    const empty = engine({ batch: () => ({ success: true }) });
    expect(await spec.empty(empty.prolog)).toBe(
      spec.returned === undefined ? undefined : 0,
    );
    expect(empty.queries).toEqual([]);
    expect(empty.batches).toEqual([]);

    const batched = engine({ batch: () => ({ success: true }) });
    expect(await spec.run(batched.prolog)).toBe(spec.returned);
    expect(batched.batches).toEqual([spec.goals]);
    expect(batched.queries).toEqual([]);

    const plain = engine();
    expect(await spec.run(plain.prolog)).toBe(spec.returned);
    expect(plain.queries).toEqual([
      `rdf_transaction((${spec.goals.join(", ")}))`,
    ]);

    await expect(
      spec.run(
        engine({ batch: () => ({ success: false, error: "E" }) }).prolog,
      ),
    ).rejects.toThrow(/^E$/);
    await expect(
      spec.run(engine({ query: () => ({ success: false }) }).prolog),
    ).rejects.toThrow(new RegExp(`^${spec.fallback}$`));
  });
});

describe("store totals", () => {
  test("asks for the counts by type and the relationship total", async () => {
    const fake = engine({
      query: () => ({
        success: true,
        bindings: { Counts: "[req-12,scenario-3]", Relationships: "7" },
      }),
    });
    expect(await queryStoreTotals(fake.prolog)).toEqual({
      entities: { req: 12, scenario: 3 },
      relationships: 7,
    });
    expect(fake.queries).toEqual([
      "findall(Type-Count, (member(Type, [req,scenario,test,adr,flag,event,symbol,fact]), aggregate_all(count, kb_entity(_, Type, _), Count), Count > 0), Counts), aggregate_all(count, (kibi_relationships:relationship_type(Rel), kb_relationship(Rel, _, _)), Relationships)",
    ]);
  });

  test.each([
    [
      "a failed query",
      { success: false, bindings: { Counts: "[]", Relationships: "1" } },
    ],
    ["no bindings", { success: true }],
    [
      "non-string counts",
      { success: true, bindings: { Counts: 1, Relationships: "1" } },
    ],
    [
      "a non-integer total",
      { success: true, bindings: { Counts: "[]", Relationships: "1.5" } },
    ],
    ["a missing total", { success: true, bindings: { Counts: "[]" } }],
  ])("is unknown for %s", async (_label, answer) => {
    expect(
      await queryStoreTotals(engine({ query: () => answer as Answer }).prolog),
    ).toBeUndefined();
  });

  test("is unknown when the engine rejects", async () => {
    expect(
      await queryStoreTotals({
        query: () => Promise.reject(new Error("down")),
      }),
    ).toBeUndefined();
  });

  test("an empty count list is an empty store", async () => {
    expect(
      await queryStoreTotals(
        engine({
          query: () => ({
            success: true,
            bindings: { Counts: "[]", Relationships: "0" },
          }),
        }).prolog,
      ),
    ).toEqual({ entities: {}, relationships: 0 });
  });
});

describe("entity goals", () => {
  async function goalsFor(...results: ExtractionResult[]): Promise<string[]> {
    const fake = engine({ batch: () => ({ success: true }) });
    await persistEntities(fake.prolog, results, new Set(), {
      loadExistingEntityIds: false,
    });
    return fake.batches.flat();
  }

  test("a requirement carries every requirement field", async () => {
    const goals = await goalsFor(
      result(
        {
          tags: ["alpha", "Beta"],
          owner: "ann",
          priority: "high",
          severity: "low",
          text_ref: "docs/x.md#y",
          semantic_text: "st",
          logic_claims: ["c1", "C2"],
          semantic_clauses: ["one", "two"],
          semantic_inventory_version: "kibi.semantic-inventory.v1",
          semantic_source_field: "title",
          semantic_source_hash: "h",
          semantic_inventory: [{ k: 1 }],
          pair_reviews: [{ p: 1 }] as never,
          proof_exempt: false,
          firmness: "firm" as never,
          required_evidence: "tested",
          proof_exempt_reason: "why",
          approved_by: "bob",
          approval_ref: "PR-1",
          failure_side_waiver: "fw",
          failure_side_waiver_approved_by: "carl",
          rationale: "because",
          exempts_claims: ["e1", "E2"],
          origin: { kind: "human" } as never,
          expects: "error",
          symbol_role: "role",
          verification_scope: "unit",
          fact_kind: "subject",
        },
        [],
        "abs/REQ-1.md",
      ),
    );
    expect(goals).toEqual([
      [
        "kb_assert_entity(req, [id='REQ-1'",
        'title="Title"',
        "status=open",
        'created_at="c"',
        'updated_at="u"',
        'source="docs/REQ-1.md"',
        "tags=[alpha,'Beta']",
        "owner=ann",
        "priority=high",
        "severity=low",
        'text_ref="docs/x.md#y"',
        'semantic_text="st"',
        "logic_claims=[c1,'C2']",
        'semantic_clauses=["one","two"]',
        'semantic_inventory_version="kibi.semantic-inventory.v1"',
        'semantic_source_field="title"',
        'semantic_source_hash="h"',
        'semantic_inventory="[{\\"k\\":1}]"',
        'pair_reviews="[{\\"p\\":1}]"',
        "proof_exempt=false",
        "firmness=firm",
        "required_evidence=tested",
        'proof_exempt_reason="why"',
        'approved_by="bob"',
        'approval_ref="PR-1"',
        'failure_side_waiver="fw"',
        'failure_side_waiver_approved_by="carl"',
        'rationale="because"',
        "exempts_claims=[e1,'E2']",
        'origin="{\\"kind\\":\\"human\\"}"',
        'sourceFile="abs/REQ-1.md"])',
      ].join(", "),
    ]);
  });

  test("requirement-only fields stay off other types", async () => {
    const reqOnly = {
      semantic_text: "st",
      logic_claims: ["c1"],
      semantic_clauses: ["one"],
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "title",
      semantic_source_hash: "h",
      semantic_inventory: [{ k: 1 }],
      pair_reviews: [{ p: 1 }] as never,
      proof_exempt: true,
      required_evidence: "tested",
      proof_exempt_reason: "why",
      approved_by: "bob",
      approval_ref: "PR-1",
      failure_side_waiver: "fw",
      failure_side_waiver_approved_by: "carl",
      rationale: "because",
      exempts_claims: ["e1"],
      firmness: "firm",
      expects: "rejection",
    } as Partial<ExtractedEntity>;
    const goals = await goalsFor(
      result({ ...reqOnly, id: "S-1", type: "scenario" }, [], ""),
      result({ ...reqOnly, id: "A-1", type: "adr", tags: [], owner: "" }),
      result({ id: "S-2", type: "scenario" }),
    );
    expect(goals).toEqual([
      'kb_assert_entity(scenario, [id=\'S-1\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md", expects=rejection])',
      'kb_assert_entity(adr, [id=\'A-1\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md", firmness=firm])',
      'kb_assert_entity(scenario, [id=\'S-2\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md"])',
    ]);
  });

  test("a requirement without optional fields carries the base only", async () => {
    expect(
      await goalsFor(result({ semantic_text: "", proof_exempt: undefined })),
    ).toEqual([
      'kb_assert_entity(req, [id=\'REQ-1\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md"])',
    ]);
  });

  test("a symbol carries its role, reason and numeric coordinates", async () => {
    const goals = await goalsFor(
      result({
        id: "SYM-1",
        type: "symbol",
        symbol_role: "entry",
        granularity_reason: "Coarse",
        sourceLine: 1,
        sourceColumn: "2" as never,
        sourceEndLine: 3,
        sourceEndColumn: 0,
      }),
      result({ id: "SYM-2", type: "symbol", symbol_role: "" }),
      result({
        id: "REQ-2",
        sourceLine: 4,
        symbol_role: "entry",
        granularity_reason: "x",
      }),
    );
    expect(goals).toEqual([
      'kb_assert_entity(symbol, [id=\'SYM-1\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md", symbol_role=entry, granularity_reason=\'Coarse\', sourceLine=1, sourceEndLine=3, sourceEndColumn=0])',
      'kb_assert_entity(symbol, [id=\'SYM-2\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md"])',
      'kb_assert_entity(req, [id=\'REQ-2\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md"])',
    ]);
  });

  test("a test carries its verification and proof fields", async () => {
    const testFields = {
      verification_scope: "integration",
      verification_perspective: "consumer",
      proof_contract: { c: 1 },
      proof_bindings: [{ b: 2 }],
      proof_receipts: [{ r: 3 }],
    } as unknown as Partial<ExtractedEntity>;
    const goals = await goalsFor(
      result({ ...testFields, id: "T-1", type: "test" }),
      result({ id: "T-2", type: "test" }),
      result({ ...testFields, id: "REQ-3" }),
    );
    expect(goals).toEqual([
      'kb_assert_entity(test, [id=\'T-1\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md", verification_scope=integration, verification_perspective=consumer, proof_contract="{\\"c\\":1}", proof_bindings="[{\\"b\\":2}]", proof_receipts="[{\\"r\\":3}]"])',
      'kb_assert_entity(test, [id=\'T-2\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md"])',
      'kb_assert_entity(req, [id=\'REQ-3\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md"])',
    ]);
  });

  test("a fact carries every typed field", async () => {
    const strings = [
      "subject_key",
      "property_key",
      "value_string",
      "unit",
      "scope",
      "valid_from",
      "valid_to",
      "canonical_key",
      "claim_key",
      "claim_text",
      "dimension_waiver",
      "dimension_waiver_approved_by",
      "case_waiver",
      "case_waiver_approved_by",
      "predicate_name",
      "predicate_namespace",
      "rule_hash",
      "rule_schema_id",
      "rule_name",
      "semantic_key",
    ];
    const arrays = [
      "argument_names",
      "argument_types",
      "argument_descriptions",
      "key_arguments",
      "aliases",
      "examples",
      "predicate_args",
      "value_set",
    ];
    const fields: Record<string, unknown> = {
      id: "F-1",
      type: "fact",
      rule_ir: { op: "and" },
      argument_constants: { a: ["x"] },
      argument_aliases: { a: { b: "c" } },
      fact_kind: "property_value",
      operator: "eq",
      value_type: "Int",
      polarity: "require",
      value_int: 4,
      value_number: 1.5,
      predicate_arity: 2,
      claim_span_start: 0,
      claim_span_end: 9,
      value_bool: false,
      closed_world: true,
    };
    for (const name of strings) fields[name] = `${name}-v`;
    for (const name of arrays) fields[name] = [`${name}-a`, 7];
    const [goal] = await goalsFor(result(fields as Partial<ExtractedEntity>));
    const base =
      'kb_assert_entity(fact, [id=\'F-1\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md"';
    expect(goal).toBe(
      `${[
        base,
        ...strings.map((name) => `${name}="${name}-v"`),
        'rule_ir="{\\"op\\":\\"and\\"}"',
        'argument_constants="{\\"a\\":[\\"x\\"]}"',
        'argument_aliases="{\\"a\\":{\\"b\\":\\"c\\"}}"',
        "fact_kind=property_value",
        "operator=eq",
        "value_type='Int'",
        "polarity=require",
        "value_int=4",
        "value_number=1.5",
        "predicate_arity=2",
        "claim_span_start=0",
        "claim_span_end=9",
        "value_bool=false",
        "closed_world=true",
        ...arrays.map((name) => `${name}=["${name}-a","7"]`),
      ].join(", ")}])`,
    );
  });

  test("a fact drops empty, mistyped and fractional values", async () => {
    const [goal] = await goalsFor(
      result({
        id: "F-2",
        type: "fact",
        subject_key: null as never,
        rule_ir: null as never,
        argument_constants: null as never,
        argument_aliases: undefined,
        fact_kind: null as never,
        operator: undefined,
        value_int: 1.5,
        value_number: "2" as never,
        value_bool: "true" as never,
        aliases: "a" as never,
        valid_from: 0 as never,
      }),
    );
    expect(goal).toBe(
      'kb_assert_entity(fact, [id=\'F-2\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md", valid_from="0"])',
    );
  });

  test("typed fact fields stay off other types", async () => {
    expect(
      await goalsFor(
        result({ subject_key: "s", value_int: 1, rule_ir: { a: 1 } }),
      ),
    ).toEqual([
      'kb_assert_entity(req, [id=\'REQ-1\', title="Title", status=open, created_at="c", updated_at="u", source="docs/REQ-1.md"])',
    ]);
  });
});

describe("persisting entities", () => {
  test("loads existing ids by default and records every id", async () => {
    const fake = engine({
      query: () => ({
        success: true,
        bindings: { ExistingIds: "  ['A', B ,  ,'it's', a[b, c]d]  " },
      }),
      batch: () => ({ success: true }),
    });
    const ids = new Set<string>();
    expect(
      await persistEntities(fake.prolog, [result({ id: "NEW" })], ids),
    ).toEqual({ entityCount: 1, kbModified: true });
    expect(fake.queries).toEqual([
      "findall(Id, kb_entity(Id, _, _), ExistingIds)",
    ]);
    expect([...ids]).toEqual(["A", "B", "it's", "a[b", "c]d", "NEW"]);
  });

  test("reads an unbracketed answer as written", async () => {
    const ids = new Set<string>();
    await persistEntities(
      engine({
        query: () => ({
          success: true,
          bindings: { ExistingIds: "x[y, z]w]" },
        }),
      }).prolog,
      [],
      ids,
    );
    expect([...ids]).toEqual(["x[y", "z]w"]);
  });

  test.each([
    ["a failed query", { success: false, bindings: { ExistingIds: "[A]" } }],
    ["no bindings", { success: true }],
    ["no id binding", { success: true, bindings: {} }],
    ["an empty answer", { success: true, bindings: { ExistingIds: "" } }],
    ["an empty list", { success: true, bindings: { ExistingIds: "[]" } }],
  ])("adds no existing ids for %s", async (_label, answer) => {
    const ids = new Set<string>();
    expect(
      await persistEntities(
        engine({ query: () => answer as Answer }).prolog,
        [],
        ids,
      ),
    ).toEqual({ entityCount: 0, kbModified: false });
    expect([...ids]).toEqual([]);
  });

  test("an empty run asserts nothing", async () => {
    const fake = engine({ batch: () => ({ success: true }) });
    expect(
      await persistEntities(fake.prolog, [], new Set(), {
        loadExistingEntityIds: false,
      }),
    ).toEqual({ entityCount: 0, kbModified: false });
    expect(fake.batches).toEqual([]);
  });

  test("skips the inventory for journal deltas", async () => {
    const fake = engine({ batch: () => ({ success: true }) });
    const ids = new Set<string>();
    await persistEntities(fake.prolog, [result()], ids, {
      loadExistingEntityIds: false,
    });
    expect(fake.queries).toEqual([]);
    expect([...ids]).toEqual(["REQ-1"]);
  });

  test("asserts in batches of 250", async () => {
    const fake = engine({ batch: () => ({ success: true }) });
    const results = Array.from({ length: 251 }, (_, index) =>
      result({ id: `r${index}` }),
    );
    expect(
      await persistEntities(fake.prolog, results, new Set(), {
        loadExistingEntityIds: false,
      }),
    ).toEqual({ entityCount: 251, kbModified: true });
    expect(fake.batches.map((batch) => batch.length)).toEqual([250, 1]);
    expect(fake.batches[1]?.[0]).toContain("id=r250,");
  });

  test("asserts one by one without a batch", async () => {
    const fake = engine();
    expect(
      await persistEntities(
        fake.prolog,
        [result({ id: "a" }), result({ id: "b" })],
        new Set(),
        {
          loadExistingEntityIds: false,
        },
      ),
    ).toEqual({ entityCount: 2, kbModified: true });
    expect(fake.queries).toHaveLength(2);
  });

  test("retries a failed batch one by one and keeps the precise error", async () => {
    const fake = engine({
      batch: () => ({ success: false, error: "batch-error" }),
      query: (goal) =>
        goal.includes("id=bad,")
          ? { success: false, error: "precise" }
          : { success: true },
    });
    await expect(
      persistEntities(
        fake.prolog,
        [result({ id: "ok" }), result({ id: "bad" }), result({ id: "after" })],
        new Set(),
        { loadExistingEntityIds: false },
      ),
    ).rejects.toThrow(
      /^Failed to upsert entity bad: precise \(source=docs\/REQ-1\.md\)$/,
    );
    expect(fake.queries).toHaveLength(2);
  });

  test("falls back to the batch error, then to a generic one", async () => {
    const upsert = (prolog: PrologProcess) =>
      persistEntities(prolog, [result({ id: "x" })], new Set(), {
        loadExistingEntityIds: false,
      });
    await expect(
      upsert(
        engine({
          batch: () => ({ success: false, error: "batch-error" }),
          query: () => ({ success: false, error: "" }),
        }).prolog,
      ),
    ).rejects.toThrow(/^Failed to upsert entity x: batch-error \(/);
    await expect(
      upsert(
        engine({
          batch: () => ({ success: false }),
          query: () => ({ success: false }),
        }).prolog,
      ),
    ).rejects.toThrow(
      /^Failed to upsert entity x: kb_assert_entity failed for x \(/,
    );
    await expect(
      upsert(engine({ query: () => ({ success: false }) }).prolog),
    ).rejects.toThrow(
      /^Failed to upsert entity x: kb_assert_entity failed for x \(/,
    );
  });

  test("wraps a thrown query error once", async () => {
    const upsert = (query: Responder) =>
      persistEntities(
        engine({ query }).prolog,
        [result({ id: "x" })],
        new Set(),
        {
          loadExistingEntityIds: false,
        },
      );
    await expect(
      upsert(() => {
        throw new Error("boom");
      }),
    ).rejects.toThrow(
      /^Failed to upsert entity x: boom \(source=docs\/REQ-1\.md\)$/,
    );
    await expect(
      upsert(() => {
        throw "plain";
      }),
    ).rejects.toThrow(/^Failed to upsert entity x: plain \(/);
    const own = new Error("Failed to upsert entity elsewhere");
    let caught: unknown;
    try {
      await upsert(() => {
        throw own;
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(own);
    const near = new Error("xFailed to upsert entity y");
    await expect(
      upsert(() => {
        throw near;
      }),
    ).rejects.toThrow(
      /^Failed to upsert entity x: xFailed to upsert entity y \(/,
    );
  });

  test("names the source file, relative to the working directory", async () => {
    const absolute = path.join(process.cwd(), "lane", "f.md");
    const fail = engine({ query: () => ({ success: false, error: "E" }) });
    await expect(
      persistEntities(
        fail.prolog,
        [result({ id: "x" }, [], absolute)],
        new Set(),
        {
          loadExistingEntityIds: false,
        },
      ),
    ).rejects.toThrow(
      `Failed to upsert entity x: E (source=${path.join("lane", "f.md")})`,
    );
    await expect(
      persistEntities(fail.prolog, [result({ id: "x" }, [], "")], new Set(), {
        loadExistingEntityIds: false,
      }),
    ).rejects.toThrow(/^Failed to upsert entity x: E \(source=\)$/);
  });

  test.each([
    [{ fact_kind: "subject" }, "; fact_kind=subject"],
    [
      { fact_kind: "property_value" },
      "; fact_kind=property_value; missing value field",
    ],
    [
      { fact_kind: "property_value", value_string: "s" },
      "; fact_kind=property_value",
    ],
    [
      { fact_kind: "property_value", value_int: 1 },
      "; fact_kind=property_value",
    ],
    [
      { fact_kind: "property_value", value_number: 1.5 },
      "; fact_kind=property_value",
    ],
    [
      { fact_kind: "property_value", value_bool: false },
      "; fact_kind=property_value",
    ],
    [{ fact_kind: null }, ""],
    [{}, ""],
  ])("describes fact %p", async (fields, detail) => {
    await expect(
      persistEntities(
        engine({ query: () => ({ success: false, error: "E" }) }).prolog,
        [result({ id: "x", type: "fact", ...(fields as object) })],
        new Set(),
        { loadExistingEntityIds: false },
      ),
    ).rejects.toThrow(
      `Failed to upsert entity x: E (source=docs/REQ-1.md${detail})`,
    );
  });

  test("other types carry no fact details", async () => {
    await expect(
      persistEntities(
        engine({ query: () => ({ success: false, error: "E" }) }).prolog,
        [result({ id: "x", fact_kind: "property_value" })],
        new Set(),
        { loadExistingEntityIds: false },
      ),
    ).rejects.toThrow(
      /^Failed to upsert entity x: E \(source=docs\/REQ-1\.md\)$/,
    );
  });
});

describe("proof receipt history", () => {
  function existing(ids: string): Engine {
    return engine({
      query: () => ({ success: true, bindings: { ExistingIds: ids } }),
      batch: () => ({ success: true }),
    });
  }

  function spies(loaded: unknown, errors: readonly string[] = []) {
    const load = spyOn(discoveryEntities, "loadEntities").mockImplementation(
      (async () => loaded) as never,
    );
    const check = spyOn(
      proofReceipt,
      "appendOnlyProofReceiptHistoryErrors",
    ).mockImplementation(() => errors);
    restores.push(
      () => load.mockRestore(),
      () => check.mockRestore(),
    );
    return { load, check };
  }

  test("checks an existing test against its stored receipts", async () => {
    const { load, check } = spies([
      { proof_receipts: [null, "x", [1], { a: 1 }] },
    ]);
    const fake = existing("[T-1, REQ-1]");
    const receipts = [{ r: 1 }] as never;
    await persistEntities(
      fake.prolog,
      [
        result({ id: "T-1", type: "test", proof_receipts: receipts }),
        result({ id: "REQ-1" }),
        result({ id: "T-2", type: "test" }),
      ],
      new Set(),
    );
    expect(load.mock.calls).toEqual([
      [fake.prolog, { id: "T-1", type: "test" }],
    ]);
    expect(check.mock.calls).toEqual([[[{ a: 1 }], receipts]]);
  });

  test.each([
    ["no stored entity", []],
    ["no stored receipts", [{ proof_receipts: "x" }]],
  ])("treats %s as an empty history", async (_label, loaded) => {
    const { check } = spies(loaded);
    await persistEntities(
      existing("[T-1]").prolog,
      [result({ id: "T-1", type: "test", proof_receipts: "x" as never })],
      new Set(),
    );
    expect(check.mock.calls).toEqual([[[], undefined]]);
  });

  test("refuses a rewritten history", async () => {
    spies([{ proof_receipts: [] }], ["first", "second"]);
    await expect(
      persistEntities(
        existing("[T-1]").prolog,
        [result({ id: "T-1", type: "test" })],
        new Set(),
      ),
    ).rejects.toThrow(
      /^Failed to upsert entity T-1: first; second \(source=docs\/REQ-1\.md\)$/,
    );
  });

  test("wraps a failed lookup", async () => {
    const load = spyOn(discoveryEntities, "loadEntities").mockImplementation(
      (async () => {
        throw "lookup down";
      }) as never,
    );
    restores.push(() => load.mockRestore());
    await expect(
      persistEntities(
        existing("[T-1]").prolog,
        [result({ id: "T-1", type: "test" })],
        new Set(),
      ),
    ).rejects.toThrow(/^Failed to upsert entity T-1: lookup down \(/);
  });
});

describe("relationship failure message", () => {
  test("prefers the single error, then the batch error", () => {
    expect(relationshipFailureMessage("single", "batch")).toBe("single");
    expect(relationshipFailureMessage("", "batch")).toBe("batch");
    expect(relationshipFailureMessage(undefined, undefined)).toBe(
      "Unknown error",
    );
  });
});

describe("persisting relationships", () => {
  const rel = (type: string, from: string, to: string) => ({ type, from, to });

  test("resolves file names to ids and counts distinct edges", async () => {
    const fake = engine({ batch: () => ({ success: true }) });
    const outcome = await persistRelationships(
      fake.prolog,
      [
        result({ id: "REQ-1", source: "docs/req-file.md" }, [
          rel("depends_on", "req-file", "other"),
          rel("depends_on", "REQ-1", "other"),
        ]),
      ],
      [rel("depends_on", "REQ-1", "other"), rel("relates_to", "req-file", "x")],
    );
    expect(outcome).toEqual({
      relationshipCount: 2,
      kbModified: true,
      retrySources: [],
    });
    expect(fake.batches).toEqual([
      [
        "kb_assert_relationship(depends_on, 'REQ-1', other, [])",
        "kb_assert_relationship(depends_on, 'REQ-1', other, [])",
        "kb_assert_relationship(depends_on, 'REQ-1', other, [])",
        "kb_assert_relationship(relates_to, 'req-file', x, [])",
      ],
    ]);
    expect(fake.queries).toEqual([]);
    expect(warns).toEqual([]);
  });

  test("an id wins over another entity's file name", async () => {
    const fake = engine({ batch: () => ({ success: true }) });
    await persistRelationships(
      fake.prolog,
      [
        result({ id: "A", source: "docs/B.md" }),
        result({ id: "B", source: "docs/x.md" }, [rel("relates_to", "B", "x")]),
      ],
      [],
    );
    expect(fake.batches).toEqual([
      ["kb_assert_relationship(relates_to, 'B', 'B', [])"],
    ]);
  });

  test("an edge batch that lands needs no retry pass", async () => {
    const fake = engine({
      batch: () => ({ success: true }),
      terminate: async () => {},
      start: async () => {},
    });
    await persistRelationships(fake.prolog, [], [rel("relates_to", "a", "b")]);
    expect(fake.lifecycle).toEqual([]);
    expect(fake.queries).toEqual([]);
  });

  test("does nothing without relationships", async () => {
    const fake = engine({ batch: () => ({ success: true }) });
    expect(await persistRelationships(fake.prolog, [], [])).toEqual({
      relationshipCount: 0,
      kbModified: false,
      retrySources: [],
    });
    expect(fake.batches).toEqual([]);
  });

  test("asserts in batches of 250", async () => {
    const fake = engine({ batch: () => ({ success: true }) });
    const shards = Array.from({ length: 251 }, (_, index) =>
      rel("relates_to", "a", `b${index}`),
    );
    expect(
      (await persistRelationships(fake.prolog, [], shards)).relationshipCount,
    ).toBe(251);
    expect(fake.batches.map((batch) => batch.length)).toEqual([250, 1]);
    expect(fake.batches[1]).toEqual([
      "kb_assert_relationship(relates_to, a, b250, [])",
    ]);
  });

  test("keeps the edges a reporting assert accepted", async () => {
    const fake = engine({
      batch: () => ({ success: false, error: "batch" }),
      query: (goal) =>
        goal.startsWith("kb_assert_relationships_reporting(")
          ? { success: true, bindings: { Failed: "[2]" } }
          : { success: true },
    });
    const outcome = await persistRelationships(
      fake.prolog,
      [],
      [rel("relates_to", "a", "b"), rel("relates_to", "c", "D")],
    );
    expect(outcome).toEqual({
      relationshipCount: 2,
      kbModified: true,
      retrySources: [],
    });
    expect(fake.queries).toEqual([
      "kb_assert_relationships_reporting([rel(relates_to, a, b), rel(relates_to, c, 'D')], Failed)",
      "kb_assert_relationship(relates_to, c, 'D', [])",
    ]);
  });

  test("marks the store modified when only the reporting assert succeeds", async () => {
    const fake = engine({
      batch: () => ({ success: false }),
      query: (goal) =>
        goal.startsWith("kb_assert_relationships_reporting(")
          ? { success: true, bindings: { Failed: "[2]" } }
          : { success: false, error: "dangling" },
    });
    const outcome = await persistRelationships(
      fake.prolog,
      [],
      [rel("relates_to", "a", "b"), rel("relates_to", "c", "d")],
    );
    expect(outcome.kbModified).toBe(true);
    expect(outcome.relationshipCount).toBe(1);
  });

  test.each([
    ["a failed report", { success: false, bindings: { Failed: "[]" } }],
    ["a non-string report", { success: true, bindings: { Failed: 2 } }],
    ["a non-numeric position", { success: true, bindings: { Failed: "[a]" } }],
    [
      "a partly numeric report",
      { success: true, bindings: { Failed: "[1,x]" } },
    ],
    ["a fractional position", { success: true, bindings: { Failed: "[1.5]" } }],
  ])("retries every edge after %s", async (_label, report) => {
    const fake = engine({
      batch: () => ({ success: false }),
      query: (goal) =>
        goal.startsWith("kb_assert_relationships_reporting(")
          ? (report as Answer)
          : { success: true },
    });
    expect(
      (
        await persistRelationships(
          fake.prolog,
          [],
          [rel("relates_to", "a", "b"), rel("relates_to", "c", "d")],
        )
      ).relationshipCount,
    ).toBe(2);
    expect(fake.queries.slice(1)).toEqual([
      "kb_assert_relationship(relates_to, a, b, [])",
      "kb_assert_relationship(relates_to, c, d, [])",
    ]);
  });

  test("retries every edge when the reporting assert throws", async () => {
    const fake = engine({
      batch: () => ({ success: false }),
      query: (goal) => {
        if (goal.startsWith("kb_assert_relationships_reporting("))
          throw new Error("down");
        return { success: true };
      },
    });
    expect(
      (
        await persistRelationships(
          fake.prolog,
          [],
          [rel("relates_to", "a", "b")],
        )
      ).relationshipCount,
    ).toBe(1);
  });

  test("asserts one by one without a batch and names failures", async () => {
    const fake = engine({
      query: (goal) =>
        goal.includes(", b, [])")
          ? { success: true }
          : { success: false, error: "" },
    });
    const outcome = await persistRelationships(
      fake.prolog,
      [result({ source: "docs/z.md" }, [rel("relates_to", "a", "c")])],
      [rel("relates_to", "a", "b")],
    );
    expect(outcome).toEqual({
      relationshipCount: 1,
      kbModified: true,
      retrySources: ["docs/z.md"],
    });
    expect(
      fake.queries.filter((goal) => goal.includes(", c, [])")),
    ).toHaveLength(4);
    expect(warns).toEqual([
      "\nWarning: 1 relationship(s) failed to sync:",
      "  - relates_to: a -> c",
      "    Error: Unknown error",
      "\nTip: Ensure target entities exist before creating relationships.",
    ]);
  });

  test("keeps the batch error when no attempt explains the failure", async () => {
    const fake = engine({
      batch: () => ({ success: false, error: "batch-error" }),
      query: (goal) =>
        goal.startsWith("kb_assert_relationships_reporting(")
          ? { success: false }
          : { success: false, error: "" },
    });
    const outcome = await persistRelationships(
      fake.prolog,
      [],
      [rel("relates_to", "a", "b")],
    );
    expect(outcome.relationshipCount).toBe(0);
    expect(warns.slice(0, 3)).toEqual([
      "\nWarning: 1 relationship(s) failed to sync:",
      "  - relates_to: a -> b",
      "    Error: batch-error",
    ]);
  });

  test("a later explanation replaces an earlier one", async () => {
    const fake = engine({
      query: (_goal, call) => ({
        success: false,
        error: call === 0 ? "first" : call === 1 ? "second" : "",
      }),
    });
    await persistRelationships(fake.prolog, [], [rel("relates_to", "a", "b")]);
    expect(warns[2]).toBe("    Error: second");
  });

  test("records a thrown single assert", async () => {
    const fake = engine({
      query: (goal, call) => {
        if (call === 0) throw new Error(`thrown ${goal.length}`);
        if (call === 1) throw "plain";
        return { success: false, error: "Invalid relationship type" };
      },
    });
    await persistRelationships(fake.prolog, [], [rel("relates_to", "a", "b")]);
    expect(warns).toEqual([
      "\nWarning: 1 relationship(s) failed to sync:",
      "  - relates_to: a -> b",
      "    Error: Invalid relationship type",
      "\nTip: Check that relationship types and directions match the allowed schema (e.g., implements symbol→req, verified_by req→test).",
    ]);
  });

  test("keeps the thrown error text across retry passes", async () => {
    const fake = engine({
      query: (_goal, call) => {
        if (call < 3) return { success: false, error: "x" };
        throw call === 3 ? "plain" : new Error("last");
      },
    });
    await persistRelationships(fake.prolog, [], [rel("relates_to", "a", "b")]);
    expect(warns[2]).toBe("    Error: plain");
    const second = engine({
      query: (_goal, call) => {
        if (call < 3) return { success: false, error: "x" };
        throw new Error("last");
      },
    });
    warns.length = 0;
    await persistRelationships(
      second.prolog,
      [],
      [rel("relates_to", "a", "b")],
    );
    expect(warns[2]).toBe("    Error: last");
  });

  test("retries three passes and stops once an edge lands", async () => {
    const fake = engine({
      query: (_goal, call) =>
        call < 2 ? { success: false, error: "x" } : { success: true },
      terminate: async () => {},
      start: async () => {},
    });
    expect(
      await persistRelationships(
        fake.prolog,
        [],
        [rel("relates_to", "a", "b")],
      ),
    ).toEqual({ relationshipCount: 1, kbModified: true, retrySources: [] });
    expect(fake.queries).toHaveLength(3);
    expect(fake.lifecycle).toEqual([]);
    const never = engine({ query: () => ({ success: false, error: "x" }) });
    await persistRelationships(never.prolog, [], [rel("relates_to", "a", "b")]);
    expect(never.queries).toHaveLength(4);
  });

  test("a malformed relationship type is reported, not thrown", async () => {
    const fake = engine({ batch: () => ({ success: true }) });
    const outcome = await persistRelationships(
      fake.prolog,
      [result({ source: "docs/m.md" }, [rel(5 as never, "a", "b")])],
      [rel(6 as never, "c", "d")],
    );
    expect(outcome).toEqual({
      relationshipCount: 0,
      kbModified: false,
      retrySources: ["docs/m.md"],
    });
    expect(fake.batches).toEqual([]);
    expect(warns[0]).toBe("\nWarning: 2 relationship(s) failed to sync:");
    expect(warns[1]).toBe("  - 5: a -> b");
    expect(warns[2]).toMatch(/^ {4}Error: \S/);
    expect(warns[3]).toBe("  - 6: c -> d");
  });

  test.each([
    "Query failed",
    "QUERY RETURNED FALSE",
    "Predicate or file not found",
  ])("restarts the engine once after %p session failures", async (error) => {
    const fake = engine({
      query: () => ({ success: false, error }),
      terminate: async () => {},
      start: async () => {},
    });
    await persistRelationships(fake.prolog, [], [rel("relates_to", "a", "b")]);
    expect(fake.lifecycle).toEqual(["terminate", "start"]);
  });

  test("does not restart for a data error or a mixed failure", async () => {
    const data = engine({
      query: () => ({ success: false, error: "Entity does not exist: X" }),
      terminate: async () => {},
      start: async () => {},
    });
    await persistRelationships(data.prolog, [], [rel("relates_to", "a", "b")]);
    expect(data.lifecycle).toEqual([]);
    const mixed = engine({
      query: (goal) => ({
        success: false,
        error: goal.includes(", b, [])") ? "Query failed" : "other",
      }),
      terminate: async () => {},
      start: async () => {},
    });
    await persistRelationships(
      mixed.prolog,
      [],
      [rel("relates_to", "a", "b"), rel("relates_to", "a", "c")],
    );
    expect(mixed.lifecycle).toEqual([]);
  });

  test("does not restart before a pass that will not run", async () => {
    const fake = engine({
      query: (_goal, call) => ({
        success: false,
        error: call < 3 ? "other" : "Query failed",
      }),
      terminate: async () => {},
      start: async () => {},
    });
    await persistRelationships(fake.prolog, [], [rel("relates_to", "a", "b")]);
    expect(fake.lifecycle).toEqual([]);
  });

  test("restarts before the last pass", async () => {
    const fake = engine({
      query: (_goal, call) => ({
        success: false,
        error: call < 2 ? "other" : "Query failed",
      }),
      terminate: async () => {},
      start: async () => {},
    });
    await persistRelationships(fake.prolog, [], [rel("relates_to", "a", "b")]);
    expect(fake.lifecycle).toEqual(["terminate", "start"]);
  });

  test("a restart needs both lifecycle hooks and tolerates a failed start", async () => {
    const failing = () => ({ success: false, error: "Query failed" });
    const startOnly = engine({ query: failing, start: async () => {} });
    await persistRelationships(
      startOnly.prolog,
      [],
      [rel("relates_to", "a", "b")],
    );
    expect(startOnly.lifecycle).toEqual([]);
    const stopOnly = engine({ query: failing, terminate: async () => {} });
    await persistRelationships(
      stopOnly.prolog,
      [],
      [rel("relates_to", "a", "b")],
    );
    expect(stopOnly.lifecycle).toEqual([]);
    const broken = engine({
      query: failing,
      terminate: async () => {
        throw new Error("stuck");
      },
      start: async () => {},
    });
    await persistRelationships(
      broken.prolog,
      [],
      [rel("relates_to", "a", "b")],
    );
    expect(broken.lifecycle).toEqual(["terminate"]);
  });

  test("lists missing entities and untracked documents", async () => {
    const lookup = spyOn(
      untrackedTargets,
      "findUntrackedDocumentMatches",
    ).mockImplementation(() => new Map([["REQ-9", "docs/REQ-9.md"]]) as never);
    restores.push(() => lookup.mockRestore());
    const fake = engine({
      query: (goal) => ({
        success: false,
        error: goal.includes("'REQ-9'")
          ? "Entity does not exist: REQ-9 "
          : goal.includes("'REQ-8'")
            ? "entity DOES NOT EXIST: REQ-8"
            : "Entity does not exist",
      }),
    });
    const outcome = await persistRelationships(
      fake.prolog,
      [
        result({ source: "docs/b.md" }, [
          rel("relates_to", "a", "REQ-9"),
          rel("relates_to", "a", "REQ-9"),
        ]),
        result({ source: "docs/a.md" }, [rel("relates_to", "a", "REQ-8")]),
      ],
      [rel("relates_to", "a", "q")],
      { workspaceRoot: "/repo" },
    );
    expect(outcome.retrySources).toEqual(["docs/a.md", "docs/b.md"]);
    expect(lookup.mock.calls).toEqual([["/repo", ["REQ-9"]]]);
    expect(warns).toEqual([
      "\nWarning: 4 relationship(s) failed to sync:",
      "  - relates_to: REQ-1 -> REQ-9",
      "    Error: Entity does not exist: REQ-9 ",
      "  - relates_to: REQ-1 -> REQ-8",
      "    Error: entity DOES NOT EXIST: REQ-8",
      "  - relates_to: a -> q",
      "    Error: Entity does not exist",
      "\nTip: 4 relationship(s) reference 1 missing entity/ies: REQ-9.",
      "  Create the missing docs (e.g., docs/requirements/REQ-*.md) or remove stale relationships.",
      "  Note: document for REQ-9 exists at docs/REQ-9.md but is untracked, so sync ignores it. Stage it with `git add docs/REQ-9.md` (staging is enough; no commit required) and sync again.",
    ]);
  });

  test("sorts missing ids and skips the untracked lookup without a root", async () => {
    const lookup = spyOn(untrackedTargets, "findUntrackedDocumentMatches");
    restores.push(() => lookup.mockRestore());
    const fake = engine({
      query: (goal) => ({
        success: false,
        error: `Entity does not exist: ${goal.includes(", b, [])") ? "B" : "A"}`,
      }),
    });
    await persistRelationships(
      fake.prolog,
      [],
      [rel("relates_to", "x", "b"), rel("relates_to", "x", "a")],
    );
    expect(lookup).not.toHaveBeenCalled();
    expect(warns).toContain(
      "\nTip: 2 relationship(s) reference 2 missing entity/ies: A, B.",
    );
  });
});
