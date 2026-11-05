import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectFullKbQualityDiagnostics,
  loadKbExtractionResults,
  passingE2eStage,
} from "../../../src/public/impact/full-kb-quality.js";
import type {
  PrologEntityQueryResult,
  PrologPort,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import relationshipSchema from "../../../src/public/schemas/relationship.js";
import { expectGolden } from "../helpers/golden.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const CAPACITY = "Query exceeded bounded Prolog output capacity (ENOBUFS)";
const IDS_GOAL = "findall(Id, kb_entity(Id, _, _), Ids)";
const RELATIONSHIP_TYPES: readonly string[] =
  relationshipSchema.properties.type.enum;

type Entity = Record<string, unknown>;
type Responder = (goal: string) => PrologQueryResult | undefined;

const ok = (bindings: Record<string, string>): PrologQueryResult => ({
  success: true,
  bindings,
});
const failed = (error?: string): PrologQueryResult =>
  ({
    success: false,
    bindings: {},
    ...(error === undefined ? {} : { error }),
  }) as PrologQueryResult;

/** A port answering relationship queries from `rels` and others from `respond`. */
function port(
  respond: Responder,
  options: {
    rels?: Record<string, string>;
    queryEntities?: PrologPort["queryEntities"];
  } = {},
) {
  const goals: string[] = [];
  const prolog = {
    oneShotMode: true,
    goals,
    async query(goal: string | readonly string[]) {
      const text = typeof goal === "string" ? goal : goal.join(",");
      goals.push(text);
      const answer = respond(text);
      if (answer !== undefined) return answer;
      const rel = /^findall\(\[From,To,'(\w+)'\]/.exec(text);
      if (rel !== null) {
        const rows = options.rels?.[rel[1] as string];
        return ok(rows === undefined ? {} : { Rels: rows });
      }
      throw new Error(`unexpected goal ${text}`);
    },
    ...(options.queryEntities === undefined
      ? {}
      : { queryEntities: options.queryEntities }),
  };
  return prolog as unknown as Pick<PrologPort, "query" | "queryEntities"> & {
    goals: string[];
  };
}

/** queryEntities over a fixed list, honoring limit and offset. */
function pages(entities: readonly Entity[], count = entities.length) {
  const calls: { limit?: number; offset?: number }[] = [];
  const queryEntities = async (input: {
    limit?: number;
    offset?: number;
  }): Promise<PrologEntityQueryResult> => {
    calls.push({ ...input });
    const offset = input.offset ?? 0;
    return {
      count,
      entities: entities.slice(offset, offset + (input.limit ?? 0)),
    } as PrologEntityQueryResult;
  };
  return { calls, queryEntities };
}

const base = (id: string, type: string, extra: Entity = {}): Entity => ({
  id,
  type,
  title: `${id} title`,
  status: "open",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  source: `.kb/${id}.md`,
  ...extra,
});

const load = (entities: readonly Entity[], rels?: Record<string, string>) =>
  loadKbExtractionResults(
    port(() => undefined, {
      ...(rels === undefined ? {} : { rels }),
      queryEntities: pages(entities).queryEntities,
    }),
  );

describe("entity projection", () => {
  test("copies each field only with a usable value", async () => {
    const strings = [
      "owner",
      "priority",
      "severity",
      "text_ref",
      "semantic_text",
      "semantic_source_hash",
      "granularity_reason",
      "symbol_kind",
      "symbol_role",
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
      "predicate_name",
      "predicate_namespace",
      "rule_hash",
      "rule_schema_id",
      "rule_name",
      "semantic_key",
    ];
    const lists = [
      "tags",
      "logic_claims",
      "semantic_clauses",
      "argument_names",
      "argument_types",
      "argument_descriptions",
      "key_arguments",
      "aliases",
      "examples",
      "predicate_args",
      "value_set",
    ];
    const numbers = [
      "sourceLine",
      "sourceColumn",
      "sourceEndLine",
      "sourceEndColumn",
      "value_int",
      "value_number",
      "predicate_arity",
      "claim_span_start",
      "claim_span_end",
    ];
    const full = base("E-full", "fact", {
      ...Object.fromEntries(strings.map((field) => [field, `${field}-v`])),
      ...Object.fromEntries(lists.map((field) => [field, ["a", 2]])),
      ...Object.fromEntries(numbers.map((field, index) => [field, index])),
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "text_ref",
      verification_scope: "unit",
      verification_perspective: "internal",
      fact_kind: "subject",
      operator: "eq",
      value_type: "string",
      polarity: "require",
      semantic_inventory: [{ a: 1 }],
      proof_bindings: [{ b: 1 }],
      proof_receipts: [{ c: 1 }],
      proof_contract: { kind: "x" },
      rule_ir: { op: "and" },
      value_bool: false,
      closed_world: true,
      sourceFile: "src/full.ts",
    });
    const unusable = base("E-unusable", "fact", {
      ...Object.fromEntries(strings.map((field) => [field, ""])),
      ...Object.fromEntries(lists.map((field) => [field, "a"])),
      ...Object.fromEntries(numbers.map((field) => [field, "1"])),
      semantic_inventory_version: "kibi.semantic-inventory.v2",
      semantic_source_field: "body",
      verification_scope: "system",
      verification_perspective: "external",
      fact_kind: "other",
      operator: "ne",
      value_type: "set",
      polarity: "allow",
      semantic_inventory: { a: 1 },
      proof_bindings: "x",
      proof_receipts: {},
      proof_contract: ["x"],
      rule_ir: null,
      value_bool: "true",
      closed_world: 1,
      sourceFile: "",
      source_file: "src/fallback.ts",
    });
    const scalars = base("E-scalars", "fact", {
      title: null,
      proof_contract: "x",
      sourceFile: 3,
    });
    const results = await load([full, unusable, scalars]);
    expectGolden("full-kb-quality-projection", results);
    expect(Object.keys(results[1]?.entity ?? {})).toEqual([
      "id",
      "type",
      "title",
      "status",
      "created_at",
      "updated_at",
      "source",
    ]);
    expect(Object.keys(results[2] ?? {})).toEqual(["entity", "relationships"]);
  });

  test("keeps every allowed value of each closed field", async () => {
    const allowed: Record<string, string[]> = {
      semantic_source_field: ["semantic_text", "text_ref", "title"],
      verification_scope: ["unit", "integration", "end_to_end"],
      verification_perspective: ["internal", "consumer"],
      fact_kind: [
        "subject",
        "property_value",
        "observation",
        "meta",
        "predicate_schema",
        "predicate",
        "rule_schema",
        "rule",
      ],
      operator: ["eq", "neq", "lt", "lte", "gt", "gte"],
      value_type: ["string", "int", "number", "bool"],
      polarity: ["require", "forbid", "assert", "deny"],
    };
    const entities = Object.entries(allowed).flatMap(([field, values]) =>
      values.map((value) =>
        base(`E-${field}-${value}`, "fact", { [field]: value }),
      ),
    );
    const results = await load(entities);
    expect(
      results.map((result) => {
        const field = Object.keys(allowed).find((key) =>
          result.entity.id.startsWith(`E-${key}-`),
        ) as string;
        return [result.entity.id, (result.entity as unknown as Entity)[field]];
      }),
    ).toEqual(
      Object.entries(allowed).flatMap(([field, values]) =>
        values.map((value) => [`E-${field}-${value}`, value]),
      ),
    );
  });

  test("attaches every relationship type to its source entity", async () => {
    const rels = Object.fromEntries(
      RELATIONSHIP_TYPES.map((type, index) => [
        type,
        `[['kb:entity/E-a','file:///tmp/x/E-${index}',${type}],['E-b','E-a',${type}]]`,
      ]),
    );
    const results = await load(
      [base("E-a", "req"), base("E-b", "req"), base("E-c", "req")],
      rels,
    );
    expect(results.map((result) => result.relationships.length)).toEqual([
      RELATIONSHIP_TYPES.length,
      RELATIONSHIP_TYPES.length,
      0,
    ]);
    expect(results[0]?.relationships.slice(0, 2)).toEqual([
      { from: "E-a", to: "E-0", type: RELATIONSHIP_TYPES[0] as string },
      { from: "E-a", to: "E-1", type: RELATIONSHIP_TYPES[1] as string },
    ]);
  });

  test("names a failed relationship query", async () => {
    const prolog = (error?: string) =>
      port(
        (goal) =>
          goal.includes(`kb_relationship(${RELATIONSHIP_TYPES[1]},`)
            ? failed(error)
            : undefined,
        { queryEntities: pages([]).queryEntities },
      );
    await expect(loadKbExtractionResults(prolog("boom"))).rejects.toThrow(
      `Full KB relationship projection query failed for ${RELATIONSHIP_TYPES[1]}: boom`,
    );
    await expect(loadKbExtractionResults(prolog())).rejects.toThrow(
      `Full KB relationship projection query failed for ${RELATIONSHIP_TYPES[1]}: Unknown error`,
    );
  });
});

describe("paginated projection", () => {
  const many = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      base(`E-${String(index).padStart(3, "0")}`, "req"),
    );

  test("reads pages of 32 until the count", async () => {
    const source = pages(many(70));
    const results = await loadKbExtractionResults(
      port(() => undefined, { queryEntities: source.queryEntities }),
    );
    expect(results.map((result) => result.entity.id as unknown)).toEqual(
      many(70).map((entity) => entity.id),
    );
    expect(source.calls).toEqual([
      { limit: 32, offset: 0 },
      { limit: 32, offset: 32 },
      { limit: 32, offset: 64 },
    ]);
    const empty = pages([]);
    expect(
      await loadKbExtractionResults(
        port(() => undefined, { queryEntities: empty.queryEntities }),
      ),
    ).toEqual([]);
    expect(empty.calls).toEqual([{ limit: 32, offset: 0 }]);
  });

  test("halves the page on an output overflow", async () => {
    const calls: number[] = [];
    const entities = many(3);
    const queryEntities = async (input: {
      limit?: number;
      offset?: number;
    }) => {
      const limit = input.limit as number;
      calls.push(limit);
      if (limit > 4) throw new Error(`engine: ${CAPACITY}`);
      const offset = input.offset as number;
      return { count: 3, entities: entities.slice(offset, offset + limit) };
    };
    const results = await loadKbExtractionResults(
      port(() => undefined, {
        queryEntities: queryEntities as PrologPort["queryEntities"],
      }),
    );
    expect(results).toHaveLength(3);
    expect(calls).toEqual([32, 16, 8, 4]);
    const always = async () => {
      calls.push(0);
      throw CAPACITY;
    };
    calls.length = 0;
    await expect(
      loadKbExtractionResults(
        port(() => undefined, {
          queryEntities: always as unknown as PrologPort["queryEntities"],
        }),
      ),
    ).rejects.toBe(CAPACITY);
    expect(calls).toHaveLength(6);
    const other = async () => {
      throw new Error("no engine");
    };
    await expect(
      loadKbExtractionResults(
        port(() => undefined, {
          queryEntities: other as PrologPort["queryEntities"],
        }),
      ),
    ).rejects.toThrow("no engine");
  });

  test("rejects inconsistent pages", async () => {
    const scripted = (answers: readonly unknown[]) => {
      let call = 0;
      return (async () =>
        answers[call++] ?? {
          count: 0,
          entities: [],
        }) as unknown as PrologPort["queryEntities"];
    };
    const reject = (answers: readonly unknown[]) =>
      loadKbExtractionResults(
        port(() => undefined, { queryEntities: scripted(answers) }),
      ).then(
        () => "resolved",
        (error: Error) => error.message,
      );
    const row = (id: unknown, type: unknown = "req") => ({ id, type });
    const rows = (count: number, from = 0) =>
      Array.from({ length: count }, (_, index) => row(`E-${from + index}`));
    expect([
      await reject([{ count: 1.5, entities: [] }]),
      await reject([{ count: -1, entities: [] }]),
      await reject([
        { count: 40, entities: rows(32) },
        { count: 41, entities: rows(8, 32) },
      ]),
      await reject([{ count: 40, entities: rows(33) }]),
      await reject([{ count: 2, entities: [row("")] }]),
      await reject([{ count: 2, entities: [row("E-1", "")] }]),
      await reject([
        { count: 2, entities: [row("E-1"), row("kb:entity/E-1")] },
      ]),
      await reject([
        { count: 40, entities: rows(32) },
        { count: 40, entities: [row("E-0"), ...rows(7, 33)] },
      ]),
      await reject([{ count: 1, entities: rows(2) }]),
      await reject([{ count: 3, entities: rows(2) }]),
      await reject([
        { count: 40, entities: rows(32) },
        { count: 40, entities: rows(8, 32) },
      ]),
    ]).toEqual([
      "Full KB paginated entity projection returned an inconsistent count",
      "Full KB paginated entity projection returned an inconsistent count",
      "Full KB paginated entity projection returned an inconsistent count",
      "Full KB paginated entity projection returned an oversized page",
      "Full KB paginated entity projection returned a malformed entity row",
      "Full KB paginated entity projection returned a malformed entity row",
      "Full KB paginated entity projection returned duplicate entity ID: E-1",
      "Full KB paginated entity projection returned duplicate entity ID: E-0",
      "Full KB paginated entity projection returned more rows than its count",
      "Full KB paginated entity projection returned an incomplete page",
      "resolved",
    ]);
  });
});

describe("bounded projection", () => {
  const props = (id: string) =>
    `[title='${id} title',status=open,created_at='2026-01-01T00:00:00.000Z',updated_at='2026-01-01T00:00:00.000Z',source='.kb/${id}.md']`;
  const rowsFor = (goal: string, skip: ReadonlySet<string> = new Set()) => {
    const ids = [...goal.matchAll(/'(E-[^']+)'/g)].map(
      (match) => match[1] as string,
    );
    return `[${ids
      .filter((id) => !skip.has(id))
      .map((id) => `['${id}',req,${props(id)}]`)
      .join(",")}]`;
  };
  const idList = (ids: readonly string[]) =>
    `[${ids.map((id) => `'${id}'`).join(",")}]`;
  const numbered = (count: number) =>
    Array.from({ length: count }, (_, index) => `E-${index}`);

  test("reads ids, then entities in batches of 32", async () => {
    const ids = numbered(40);
    const prolog = port((goal) => {
      if (goal === IDS_GOAL) return ok({ Ids: ` ${idList(ids)} ` });
      if (goal.startsWith("findall([Id,Type,Props]"))
        return ok({ Results: rowsFor(goal) });
      return undefined;
    });
    const results = await loadKbExtractionResults(prolog);
    expect(results.map((result) => result.entity.id)).toEqual(ids);
    const batches = prolog.goals.filter((goal) =>
      goal.startsWith("findall([Id,Type,Props]"),
    );
    expect(batches).toHaveLength(2);
    expect(batches[1]).toBe(
      `findall([Id,Type,Props], (member(Id, [${ids
        .slice(32)
        .map((id) => `'${id}'`)
        .join(",")}]), kb_entity(Id, Type, Props)), Results)`,
    );
    const empty = port((goal) =>
      goal === IDS_GOAL ? ok({ Ids: "[]" }) : undefined,
    );
    expect(await loadKbExtractionResults(empty)).toEqual([]);
  });

  test("splits a batch that overflows the output", async () => {
    const ids = numbered(5);
    const sizes: number[] = [];
    const prolog = port((goal) => {
      if (goal === IDS_GOAL) return ok({ Ids: idList(ids) });
      if (goal.startsWith("findall([Id,Type,Props]")) {
        const size = [...goal.matchAll(/'E-/g)].length;
        sizes.push(size);
        return size > 2
          ? failed(`engine: ${CAPACITY}`)
          : ok({ Results: rowsFor(goal) });
      }
      return undefined;
    });
    const results = await loadKbExtractionResults(prolog);
    expect(results.map((result) => result.entity.id)).toEqual(ids);
    expect(sizes).toEqual([5, 3, 2, 1, 2]);
    const single = port((goal) => {
      if (goal === IDS_GOAL) return ok({ Ids: idList(["E-0", "E-1"]) });
      if (goal.startsWith("findall([Id,Type,Props]")) return failed(CAPACITY);
      return undefined;
    });
    await expect(loadKbExtractionResults(single)).rejects.toThrow(
      `Full KB entity projection failed for E-0: ${CAPACITY}`,
    );
  });

  test("rejects failed and inconsistent answers", async () => {
    const run = (ids: string, entities: (goal: string) => PrologQueryResult) =>
      loadKbExtractionResults(
        port((goal) => {
          if (goal === IDS_GOAL) return ok({ Ids: ids });
          if (goal.startsWith("findall([Id,Type,Props]")) return entities(goal);
          return undefined;
        }),
      ).then(
        () => "resolved",
        (error: Error) => error.message,
      );
    const fine = (goal: string) => ok({ Results: rowsFor(goal) });
    const idsFailure = (answer: PrologQueryResult) =>
      loadKbExtractionResults(
        port((goal) => (goal === IDS_GOAL ? answer : undefined)),
      ).then(
        () => "resolved",
        (error: Error) => error.message,
      );
    expect([
      await idsFailure(failed("down")),
      await idsFailure(failed()),
      await idsFailure(ok({})),
      await run("'E-0'", fine),
      await run("[E-0", fine),
      await run("E-0]", fine),
      await run("['E-0','E-0']", fine),
      await run("['E-0','kb:entity/E-0']", fine),
      await run("['kb:entity/']", fine),
      await run("['E-0']", () => failed("bad goal")),
      await run("['E-0']", () => failed()),
      await run("['E-0']", () => ok({})),
      await run("['E-0']", () => ok({ Results: `[['',req,${props("x")}]]` })),
      await run("['E-0']", () => ok({ Results: `[['E-0', ,${props("x")}]]` })),
      await run("['E-0']", () =>
        ok({ Results: `[['E-9',req,${props("E-9")}]]` }),
      ),
      await run("['E-0','E-1']", () =>
        ok({
          Results: `[['E-0',req,${props("E-0")}],['E-0',req,${props("E-0")}]]`,
        }),
      ),
      await run("['E-0','E-1','E-2']", (goal) =>
        ok({ Results: rowsFor(goal, new Set(["E-1", "E-2"])) }),
      ),
      await run("['E-0']", fine),
    ]).toEqual([
      "Full KB entity ID enumeration query failed: down",
      "Full KB entity ID enumeration query failed: Unknown error",
      "Full KB entity ID enumeration query returned no Ids binding",
      "Full KB entity ID enumeration returned malformed data",
      "Full KB entity ID enumeration returned malformed data",
      "Full KB entity ID enumeration returned malformed data",
      "Full KB bounded entity projection returned duplicate or empty requested IDs",
      "Full KB bounded entity projection returned duplicate or empty requested IDs",
      "Full KB bounded entity projection returned duplicate or empty requested IDs",
      "Full KB bounded entity projection query failed: bad goal",
      "Full KB bounded entity projection query failed: Unknown error",
      "Full KB bounded entity projection query returned no Results binding",
      "Full KB bounded entity projection returned a malformed entity row",
      "Full KB bounded entity projection returned a malformed entity row",
      "Full KB bounded entity projection returned an unexpected entity ID: E-9",
      "Full KB bounded entity projection returned an unexpected entity ID: E-0",
      "Full KB bounded entity projection returned an incomplete page; missing E-1, E-2",
      "resolved",
    ]);
  });
});

describe("passingE2eStage", () => {
  test("accepts only a plain object", () => {
    const stage = { status: "passed" };
    expect(passingE2eStage(stage)).toBe(stage);
    for (const value of [null, undefined, [], "passed", 1, false])
      expect(passingE2eStage(value)).toBeUndefined();
  });
});

describe("collectFullKbQualityDiagnostics", () => {
  const world = [
    base("REQ-a", "req", { logic_claims: ["CLAIM-a"] }),
    base("REQ-b", "req", { logic_claims: ["CLAIM-b"] }),
    base("REQ-c", "req"),
    base("REQ-d", "req", { logic_claims: ["CLAIM-d"] }),
    base("TEST-unit", "test", {
      status: "passing",
      verification_scope: "unit",
    }),
    base("SYM-many", "symbol", {
      status: "active",
      symbol_role: "behavioral",
      sourceFile: "src/many.ts",
    }),
    base("SYM-file", "symbol", {
      status: "active",
      granularity_reason: "module-level-behavior",
      sourceFile: "src/file.ts",
    }),
  ];
  const rels = {
    verified_by: "[['REQ-a','TEST-unit',verified_by]]",
    implements:
      "[['SYM-file','REQ-d',implements],['SYM-many','REQ-a',implements],['SYM-many','REQ-b',implements],['SYM-many','REQ-c',implements]]",
  };
  type Options = Parameters<typeof collectFullKbQualityDiagnostics>[0];
  const run = async (
    options: Partial<Options> = {},
    coverage: (goal: string) => PrologQueryResult | undefined = () => undefined,
    entities: readonly Entity[] = world,
  ) => {
    const prolog = port(
      (goal) =>
        goal.includes("coverage_evidence_json") ? coverage(goal) : undefined,
      { rels, queryEntities: pages(entities).queryEntities },
    );
    const diagnostics = await collectFullKbQualityDiagnostics({
      prolog,
      now: new Date("2026-02-01T00:00:00.000Z"),
      ...options,
    });
    return { diagnostics, goals: prolog.goals };
  };
  const summary = (diagnostics: readonly { id: string; entityId?: string }[]) =>
    diagnostics.map((row) => `${row.id} ${row.entityId ?? "-"}`);

  test("combines the quality families in order", async () => {
    const { diagnostics, goals } = await run({
      hardViolationEntityIds: new Set(["REQ-c"]),
    });
    expectGolden("full-kb-quality-diagnostics", diagnostics);
    expect(goals.some((goal) => goal.includes("coverage_evidence_json"))).toBe(
      false,
    );
    const soft = await run();
    expect(summary(soft.diagnostics)).toContain(
      "logical_coverage_review REQ-c",
    );
    expect(summary(diagnostics)).not.toContain("logical_coverage_review REQ-c");
  });

  test("caps the diagnostics", async () => {
    const all = (await run()).diagnostics;
    expect(all.length).toBeGreaterThan(2);
    expect((await run({ maxDiagnostics: -1 })).diagnostics).toEqual(all);
    expect((await run({ maxDiagnostics: 0 })).diagnostics).toEqual([]);
    expect((await run({ maxDiagnostics: 2 })).diagnostics).toEqual(
      all.slice(0, 2),
    );
  });

  test("reads proof evidence only with a snapshot, a time and requirements", async () => {
    const answer = (rows: unknown) => () =>
      ok({ JsonString: JSON.stringify(rows) });
    const evidence = answer({
      rows: [
        {
          id: "REQ-a",
          proofStatus: "unresolved",
          passingE2eStatus: "missing",
          passingE2eTests: ["T-1", 2],
          receiptGapCodes: ["stale", 3],
        },
        { id: 5, proofStatus: "proved" },
        {
          id: "REQ-c",
          proofStatus: 1,
          passingE2eStatus: 2,
          receiptGapCodes: "x",
        },
      ],
    });
    const proof = {
      proofSnapshot: "snap-1",
      checkedAt: "2026-02-01T00:00:00Z",
    };
    const withProof = await run(proof, evidence);
    const depth = (
      diagnostics: readonly {
        id: string;
        entityId?: string;
        evidence?: unknown;
      }[],
    ) =>
      diagnostics
        .filter((row) => row.id === "coverage_depth_review")
        .map((row) => [row.entityId, row.evidence]);
    expectGolden(
      "full-kb-quality-proof-evidence",
      depth(withProof.diagnostics),
    );
    const coverageGoal = withProof.goals.find((goal) =>
      goal.includes("coverage_evidence_json"),
    ) as string;
    expect(coverageGoal).toMatch(/^\(use_module\('[^']*\/discovery\.pl'\), /);
    expect(coverageGoal).toContain(
      "discovery:coverage_evidence_json([], strict_snapshot, _{}, 'snap-1', '2026-02-01T00:00:00Z', ",
    );
    const bound = await run(
      { ...proof, proofTestBindings: async () => "_{t:1}" },
      evidence,
    );
    expect(
      bound.goals.find((goal) => goal.includes("coverage_evidence_json")),
    ).toContain("coverage_evidence_json([], per_contract, _{t:1}, ");
    const strict = await run(
      { ...proof, proofTestBindings: async () => null },
      evidence,
    );
    expect(
      strict.goals.find((goal) => goal.includes("coverage_evidence_json")),
    ).toContain("strict_snapshot, _{}");
    const passed = await run(
      proof,
      answer({ rows: [{ id: "REQ-a", passingE2eStatus: "passed" }] }),
    );
    expect(depth(passed.diagnostics).map(([id]) => id)).toEqual([
      "REQ-b",
      "REQ-c",
      "REQ-d",
    ]);
    const plain = depth((await run()).diagnostics);
    for (const missing of [
      { proofSnapshot: "snap-1" },
      { checkedAt: "2026-02-01T00:00:00Z" },
    ]) {
      const result = await run(missing, evidence);
      expect(depth(result.diagnostics)).toEqual(plain);
      expect(
        result.goals.some((goal) => goal.includes("coverage_evidence_json")),
      ).toBe(false);
    }
    const noRequirements = await run(
      proof,
      evidence,
      world.filter((entity) => entity.type !== "req"),
    );
    expect(
      noRequirements.goals.some((goal) =>
        goal.includes("coverage_evidence_json"),
      ),
    ).toBe(false);
    for (const broken of [
      () => failed("down"),
      () => {
        throw new Error("lost");
      },
      answer({}),
      answer({ rows: "x" }),
    ])
      expect(depth((await run(proof, broken)).diagnostics)).toEqual(plain);
  });

  test("reads telemetry evidence beside the knowledge base", async () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-full-kb-"));
    roots.push(root);
    const telemetry = async (workspaceRoot?: string) =>
      (
        await run(workspaceRoot === undefined ? {} : { workspaceRoot })
      ).diagnostics
        .filter((row) => row.category === "telemetry")
        .map((row) => [row.id, row.message]);
    expect(await telemetry()).toEqual([]);
    expect(await telemetry(root)).toEqual([]);
    expect((await run({ workspaceRoot: root })).diagnostics).toEqual(
      (await run()).diagnostics,
    );
    mkdirSync(join(root, ".kb", "usage.log"), { recursive: true });
    const unreadable = await telemetry(root);
    expect(unreadable).toEqual([
      [
        "telemetry_evidence_unreadable",
        expect.stringMatching(
          /^Telemetry acceptance evidence is unreadable: EISDIR/,
        ),
      ],
    ]);
    rmSync(join(root, ".kb", "usage.log"), { recursive: true });
    writeFileSync(join(root, ".kb", "usage.log"), "{not json\n");
    const malformed = await telemetry(root);
    expect(malformed).toEqual([
      [
        "telemetry_evidence_unreadable",
        expect.stringMatching(/^Telemetry acceptance evidence is malformed: ./),
      ],
    ]);
    const { diagnostics } = await run({ workspaceRoot: root });
    expect(diagnostics[0]).toMatchObject({
      id: "telemetry_evidence_unreadable",
      severity: "review",
      blocking: false,
      category: "telemetry",
      source: ".kb/usage.log",
      suggestion:
        "Repair or regenerate .kb/usage.log through Kibi diagnostic mode, then rerun kibi usage-metrics --require-acceptance and an unfiltered kb_check.",
    });
    writeFileSync(join(root, ".kb", "usage.log"), "");
    const fresh = await run({ workspaceRoot: root });
    expectGolden(
      "full-kb-quality-telemetry",
      fresh.diagnostics.filter((row) => row.category === "telemetry"),
    );
  });
});
