import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { mock } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  ExtractedEntity,
  ExtractionResult,
} from "../../src/extractors/markdown.js";
import { PrologProcess, type QueryResult } from "../../src/prolog.js";
import type { ExtractedSymbol } from "../../src/traceability/symbol-extract.js";
import {
  _setPrologFactory,
  cleanupTempKb,
  consultOverlay,
  createOverlayFacts,
  createTempKb,
  projectStagedEntities,
  resetModuleState,
  skipNonIntegerFactNumber,
} from "../../src/traceability/temp-kb.js";

const ENV_KEYS = ["TMPDIR", "KIBI_TRACE", "KIBI_DEBUG"] as const;
const savedEnv: Record<string, string | undefined> = {};
let sandbox = "";

// Every temporary KB lives in a sandbox, so even a wrong path stays in it.
beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  Reflect.deleteProperty(process.env, "KIBI_TRACE");
  Reflect.deleteProperty(process.env, "KIBI_DEBUG");
  sandbox = mkdtempSync(path.join(tmpdir(), "kibi-tempkb-"));
  process.env.TMPDIR = sandbox;
});

afterEach(() => {
  resetModuleState();
  mock.restore();
  _setPrologFactory();
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  rmSync(sandbox, { recursive: true, force: true });
});

type Reply = QueryResult | Error | string;

function fakeProlog(reply: (goal: string | string[]) => Reply = () => ok) {
  const queries: Array<string | string[]> = [];
  const events: string[] = [];
  const prolog = {
    start: async () => {
      events.push("start");
    },
    query: async (goal: string | string[]) => {
      queries.push(goal);
      const answer = reply(goal);
      if (answer instanceof Error || typeof answer === "string") throw answer;
      return answer;
    },
    terminate: async () => {
      events.push("terminate");
    },
  };
  return { prolog: prolog as unknown as PrologProcess, queries, events };
}

const ok: QueryResult = { success: true, bindings: {} };
const failed = (error?: string): QueryResult => ({
  success: false,
  bindings: {},
  ...(error === undefined ? {} : { error }),
});

function useFake(reply?: (goal: string | string[]) => Reply) {
  const fake = fakeProlog(reply);
  const options: unknown[] = [];
  _setPrologFactory((opts) => {
    options.push(opts);
    return fake.prolog;
  });
  return { ...fake, options };
}

function wrap(goal: string, context: string): string {
  const label = JSON.stringify(context);
  return `catch((${goal} -> true ; throw(staged_goal_failed)), ProjectionError, (message_to_string(ProjectionError, ProjectionDetail), format(atom(ProjectionMessage), '~s: ~s', [${label}, ProjectionDetail]), throw(error(validation_error(ProjectionMessage), context(projectStagedEntities, ${label})))))`;
}

function entity(overrides: Partial<ExtractedEntity> = {}): ExtractedEntity {
  return {
    id: "REQ-1",
    type: "req",
    title: "One",
    status: "open",
    created_at: "c",
    updated_at: "u",
    source: "s.md",
    ...overrides,
  };
}

const BASE = `id='REQ-1', title="One", status=open, created_at="c", updated_at="u", source="s.md"`;

async function assertionGoal(
  value: ExtractedEntity,
  sourceFile?: string,
): Promise<string> {
  const { prolog, queries } = fakeProlog();
  await projectStagedEntities(prolog, [
    { entity: value, relationships: [], ...(sourceFile ? { sourceFile } : {}) },
  ] as ExtractionResult[]);
  const goals = queries[0] as string[];
  const prefix = "catch((";
  const goal = goals[1] as string;
  return goal.slice(prefix.length, goal.indexOf(" -> true ;"));
}

describe("entity assertion goals", () => {
  test("carry the common fields", async () => {
    expect(await assertionGoal(entity({ type: "adr" }))).toBe(
      `kb_assert_entity_no_audit(adr, [${BASE}])`,
    );
    expect(
      await assertionGoal(
        entity({
          type: "adr",
          tags: ["a", "B"],
          owner: "me",
          priority: "high",
          severity: "low",
          text_ref: "t",
          origin: { kind: "x" } as never,
        }),
        "src/a.md",
      ),
    ).toBe(
      `kb_assert_entity_no_audit(adr, [${BASE}, tags=[a,'B'], owner=me, priority=high, severity=low, text_ref="t", origin="{\\"kind\\":\\"x\\"}", sourceFile="src/a.md"])`,
    );
    expect(
      await assertionGoal(
        entity({
          type: "adr",
          tags: [],
          owner: "",
          priority: "",
          severity: "",
          text_ref: "",
        }),
        "",
      ),
    ).toBe(`kb_assert_entity_no_audit(adr, [${BASE}])`);
  });

  test("carry requirement fields only for requirements", async () => {
    const req = {
      semantic_text: "st",
      logic_claims: ["c1", "c2"],
      semantic_clauses: ["cl", "c2"],
      semantic_inventory_version: "kibi.semantic-inventory.v1",
      semantic_source_field: "title",
      semantic_source_hash: "h",
      semantic_inventory: { a: 1 },
      approved_by: "ab",
      approval_ref: "ar",
      failure_side_waiver: "fw",
      failure_side_waiver_approved_by: "fa",
      rationale: "r",
      exempts_claims: ["e1", "e2"],
    } as unknown as Partial<ExtractedEntity>;
    expect(await assertionGoal(entity(req))).toBe(
      `kb_assert_entity_no_audit(req, [${BASE}, semantic_text="st", logic_claims=[c1,c2], semantic_clauses=["cl","c2"], semantic_inventory_version="kibi.semantic-inventory.v1", semantic_source_field="title", semantic_source_hash="h", semantic_inventory="{\\"a\\":1}", approved_by="ab", approval_ref="ar", failure_side_waiver="fw", failure_side_waiver_approved_by="fa", rationale="r", exempts_claims=[e1,e2]])`,
    );
    expect(
      await assertionGoal(
        entity({ ...req, type: "scenario", expects: "error" }),
      ),
    ).toBe(`kb_assert_entity_no_audit(scenario, [${BASE}, expects=error])`);
    expect(await assertionGoal(entity({ type: "scenario" }))).toBe(
      `kb_assert_entity_no_audit(scenario, [${BASE}])`,
    );
    expect(
      await assertionGoal(entity({ ...req, expects: "error" })),
    ).not.toContain("expects=");
    expect(
      await assertionGoal(
        entity({
          semantic_text: "",
          semantic_inventory_version: "" as never,
          semantic_source_field: "" as never,
          semantic_source_hash: "",
          approved_by: "",
        }),
      ),
    ).toBe(`kb_assert_entity_no_audit(req, [${BASE}, approved_by=""])`);
  });

  test("carry symbol coordinates and roles", async () => {
    expect(
      await assertionGoal(
        entity({
          type: "symbol",
          symbol_role: "behavior",
          granularity_reason: "module-level-behavior",
          sourceLine: 1,
          sourceColumn: 0,
          sourceEndLine: 3,
          sourceEndColumn: 9,
        }),
      ),
    ).toBe(
      `kb_assert_entity_no_audit(symbol, [${BASE}, symbol_role=behavior, granularity_reason='module-level-behavior', sourceLine=1, sourceColumn=0, sourceEndLine=3, sourceEndColumn=9])`,
    );
    expect(
      await assertionGoal(
        entity({
          type: "symbol",
          symbol_role: "",
          granularity_reason: "",
          sourceLine: "1" as never,
        }),
      ),
    ).toBe(`kb_assert_entity_no_audit(symbol, [${BASE}])`);
    expect(
      await assertionGoal(
        entity({ type: "adr", symbol_role: "x", sourceLine: 1 }),
      ),
    ).toBe(`kb_assert_entity_no_audit(adr, [${BASE}])`);
  });

  test("carry test verification metadata", async () => {
    const proof = {
      verification_scope: "unit",
      verification_perspective: "consumer",
      proof_contract: { c: 1 },
      proof_bindings: [{ b: 1 }],
      proof_receipts: [{ r: 1 }],
    } as unknown as Partial<ExtractedEntity>;
    expect(await assertionGoal(entity({ type: "test", ...proof }))).toBe(
      `kb_assert_entity_no_audit(test, [${BASE}, verification_scope=unit, verification_perspective=consumer, proof_contract="{\\"c\\":1}", proof_bindings="[{\\"b\\":1}]", proof_receipts="[{\\"r\\":1}]"])`,
    );
    expect(await assertionGoal(entity({ type: "test" }))).toBe(
      `kb_assert_entity_no_audit(test, [${BASE}])`,
    );
    expect(await assertionGoal(entity({ type: "adr", ...proof }))).toBe(
      `kb_assert_entity_no_audit(adr, [${BASE}])`,
    );
  });

  test("carry typed fact fields", async () => {
    const fact = {
      type: "fact",
      subject_key: "s",
      property_key: "p",
      value_string: "v",
      unit: "u",
      scope: "sc",
      valid_from: "f",
      valid_to: "t",
      canonical_key: "ck",
      claim_key: "clk",
      claim_text: "ct",
      dimension_waiver: "dw",
      dimension_waiver_approved_by: "dwa",
      case_waiver: "cw",
      case_waiver_approved_by: "cwa",
      predicate_name: "pn",
      predicate_namespace: "pns",
      rule_hash: "rh",
      rule_schema_id: "rs",
      rule_name: "rn",
      semantic_key: "sk",
      rule_ir: { op: "and" },
      argument_constants: { a: ["x"] },
      argument_aliases: { a: { b: "c" } },
      fact_kind: "property_value",
      operator: "eq",
      value_type: "int",
      polarity: "require",
      value_int: 3,
      value_number: 1.5,
      predicate_arity: 2,
      claim_span_start: 0,
      claim_span_end: 4,
      value_bool: false,
      closed_world: true,
      argument_names: ["n"],
      argument_types: ["t"],
      argument_descriptions: ["d"],
      key_arguments: ["k"],
      aliases: ["al"],
      examples: ["ex"],
      predicate_args: ["pa"],
      value_set: ["a", 1],
      part_of: ["po"],
      kind_of: ["ko"],
      distinct_from: ["df"],
    } as unknown as Partial<ExtractedEntity>;
    expect(await assertionGoal(entity(fact))).toBe(
      `kb_assert_entity_no_audit(fact, [${BASE}, subject_key="s", property_key="p", value_string="v", unit="u", scope="sc", valid_from="f", valid_to="t", canonical_key="ck", claim_key="clk", claim_text="ct", dimension_waiver="dw", dimension_waiver_approved_by="dwa", case_waiver="cw", case_waiver_approved_by="cwa", predicate_name="pn", predicate_namespace="pns", rule_hash="rh", rule_schema_id="rs", rule_name="rn", semantic_key="sk", rule_ir="{\\"op\\":\\"and\\"}", argument_constants="{\\"a\\":[\\"x\\"]}", argument_aliases="{\\"a\\":{\\"b\\":\\"c\\"}}", fact_kind=property_value, operator=eq, value_type=int, polarity=require, value_int=3, value_number=1.5, predicate_arity=2, claim_span_start=0, claim_span_end=4, value_bool=false, closed_world=true, argument_names=["n"], argument_types=["t"], argument_descriptions=["d"], key_arguments=["k"], aliases=["al"], examples=["ex"], predicate_args=["pa"], value_set=["a","1"], part_of=["po"], kind_of=["ko"], distinct_from=["df"]])`,
    );
    expect(
      await assertionGoal(
        entity({
          type: "fact",
          subject_key: null,
          rule_ir: null,
          argument_constants: null,
          fact_kind: null,
          value_int: 2.5,
          value_number: "1",
          value_bool: "true",
          aliases: "x",
        } as unknown as Partial<ExtractedEntity>),
      ),
    ).toBe(`kb_assert_entity_no_audit(fact, [${BASE}])`);
    expect(
      await assertionGoal(
        entity({ type: "adr", subject_key: "s" } as Partial<ExtractedEntity>),
      ),
    ).toBe(`kb_assert_entity_no_audit(adr, [${BASE}])`);
    expect(await assertionGoal(entity({ type: "fact" }))).toBe(
      `kb_assert_entity_no_audit(fact, [${BASE}])`,
    );
  });

  test("skip a fractional integer value", () => {
    expect(skipNonIntegerFactNumber("value_int", 1.5)).toBe(true);
    expect(skipNonIntegerFactNumber("value_int", 2)).toBe(false);
    expect(skipNonIntegerFactNumber("value_number", 1.5)).toBe(false);
  });
});

describe("projectStagedEntities", () => {
  const results = (count: number, edges = 1): ExtractionResult[] =>
    Array.from({ length: count }, (_, index) => ({
      entity: entity({ id: `E${index}`, type: "adr" }),
      relationships: Array.from({ length: edges }, () => ({
        type: "relates_to",
        from: `E${index}`,
        to: "E0",
      })),
    })) as ExtractionResult[];

  test("projects entities in batches before any relationship", async () => {
    const { prolog, queries } = fakeProlog();
    await projectStagedEntities(prolog, results(129));
    expect(queries.map((goals) => goals.length)).toStrictEqual([
      256, 2, 128, 1,
    ]);
    const first = queries[0] as string[];
    expect(first[0]).toBe(
      wrap(
        "kb_retract_entity_relationships('E0')",
        "retract staged relationships for entity E0",
      ),
    );
    expect(first[1]).toBe(
      wrap(
        `kb_assert_entity_no_audit(adr, [${BASE.replace("'REQ-1'", "'E0'")}])`,
        "assert staged entity E0",
      ),
    );
    expect((queries[3] as string[])[0]).toBe(
      wrap(
        "kb_assert_relationship_no_audit(relates_to, 'E128', 'E0', [])",
        "assert staged relationship relates_to E128 -> E0",
      ),
    );
  });

  test("flushes exactly full relationship batches", async () => {
    const { prolog, queries } = fakeProlog();
    await projectStagedEntities(prolog, results(1, 128));
    expect(queries.map((goals) => goals.length)).toStrictEqual([2, 128]);
    const none = fakeProlog();
    await projectStagedEntities(none.prolog, []);
    expect(none.queries).toStrictEqual([]);
    const noEdges = fakeProlog();
    await projectStagedEntities(noEdges.prolog, results(2, 0));
    expect(noEdges.queries.map((goals) => goals.length)).toStrictEqual([4]);
  });

  test("names the failed batch", async () => {
    const entityFailure = fakeProlog(() => failed("bad entity"));
    expect(
      await projectStagedEntities(entityFailure.prolog, results(2)).catch(
        (error: Error) => error.message,
      ),
    ).toBe("Failed to assert staged entity E0, E1: bad entity");
    expect(entityFailure.queries).toHaveLength(1);
    const unknown = fakeProlog(() => failed());
    expect(
      await projectStagedEntities(unknown.prolog, results(1)).catch(
        (error: Error) => error.message,
      ),
    ).toBe("Failed to assert staged entity E0: unknown error");
    const edgeFailure = (error?: string) =>
      fakeProlog((goals) =>
        (goals as string[])[0]?.includes("kb_assert_relationship_no_audit")
          ? failed(error)
          : ok,
      );
    const edges = edgeFailure("missing endpoint");
    expect(
      await projectStagedEntities(edges.prolog, results(2)).catch(
        (error: Error) => error.message,
      ),
    ).toBe(
      "Failed to assert staged relationship relates_to E0 -> E0, relates_to E1 -> E0: missing endpoint",
    );
    expect(
      await projectStagedEntities(edgeFailure().prolog, results(1)).catch(
        (error: Error) => error.message,
      ),
    ).toBe(
      "Failed to assert staged relationship relates_to E0 -> E0: unknown error",
    );
  });

  test("starts each relationship batch empty", async () => {
    const { prolog, queries } = fakeProlog();
    await projectStagedEntities(prolog, results(1, 129));
    expect(queries.map((goals) => goals.length)).toStrictEqual([2, 128, 1]);
    const second = fakeProlog((goals) =>
      goals.length === 1 ? failed("late edge") : ok,
    );
    expect(
      await projectStagedEntities(second.prolog, results(1, 129)).catch(
        (error: Error) => error.message,
      ),
    ).toBe(
      "Failed to assert staged relationship relates_to E0 -> E0: late edge",
    );
  });
});

describe("createTempKb", () => {
  test("rejects a missing base KB", async () => {
    const missing = path.join(sandbox, "missing");
    expect(await createTempKb(missing).catch((e: Error) => e.message)).toBe(
      `Base KB path does not exist: ${missing}`,
    );
    expect(readdirSync(sandbox)).toStrictEqual([]);
  });

  test("copies the base KB, starts Prolog and attaches it", async () => {
    const base = path.join(sandbox, "base");
    mkdirSync(path.join(base, "nested"), { recursive: true });
    writeFileSync(path.join(base, "nested", "kb.rdf"), "data");
    const fake = useFake();
    const once = spyOn(process, "once");
    const ctx = await createTempKb(base);
    expect(path.dirname(ctx.tempDir)).toBe(sandbox);
    expect(path.basename(ctx.tempDir)).toMatch(
      new RegExp(`^kibi-precommit-${process.pid}-\\d+-[0-9a-f]{8}$`),
    );
    expect(ctx).toStrictEqual({
      tempDir: ctx.tempDir,
      kbPath: path.join(ctx.tempDir, "kb"),
      overlayPath: path.join(ctx.tempDir, "changed_symbols.pl"),
      prolog: fake.prolog,
    });
    expect(
      readFileSync(path.join(ctx.kbPath, "nested", "kb.rdf"), "utf8"),
    ).toBe("data");
    expect(readFileSync(ctx.overlayPath, "utf8")).toBe("");
    expect(fake.options).toStrictEqual([{ timeout: 120000, oneShot: false }]);
    expect(fake.events).toStrictEqual(["start"]);
    expect(fake.queries).toStrictEqual([`kb_attach('${ctx.kbPath}')`]);
    expect(once.mock.calls.map((call): unknown => call[0])).toStrictEqual([
      "exit",
      "SIGINT",
      "SIGTERM",
    ]);
    const other = await createTempKb();
    expect(other.tempDir).not.toBe(ctx.tempDir);
    expect(readdirSync(other.kbPath)).toStrictEqual([]);
    await cleanupTempKb(ctx.tempDir);
    await cleanupTempKb(other.tempDir);
  });

  test("creates a missing temporary root", async () => {
    const root = path.join(sandbox, "deep", "er");
    process.env.TMPDIR = root;
    useFake();
    const ctx = await createTempKb();
    expect(path.dirname(ctx.tempDir)).toBe(root);
    expect(readdirSync(ctx.kbPath)).toStrictEqual([]);
    await cleanupTempKb(ctx.tempDir);
  });

  test("cleans up when the attach fails", async () => {
    for (const [answer, message] of [
      [failed("no kb"), "no kb"],
      [failed(), "unknown error"],
    ] as const) {
      const fake = useFake((goal) =>
        String(goal).startsWith("kb_attach") ? answer : ok,
      );
      const error = await createTempKb().catch((e: Error) => e.message);
      expect(error).toMatch(
        new RegExp(
          `^Failed to attach temporary KB at ${sandbox}/kibi-precommit-[^ ]+/kb: ${message}$`,
        ),
      );
      expect(fake.events).toStrictEqual(["start", "terminate"]);
      expect(readdirSync(sandbox)).toStrictEqual([]);
    }
  });

  test("builds a real Prolog process by default", async () => {
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue();
    spyOn(PrologProcess.prototype, "query").mockResolvedValue(ok);
    spyOn(PrologProcess.prototype, "terminate").mockResolvedValue();
    const ctx = await createTempKb();
    expect(ctx.prolog).toBeInstanceOf(PrologProcess);
    const fields = ctx.prolog as unknown as {
      timeout: number;
      useOneShotMode: boolean;
    };
    expect([fields.timeout, fields.useOneShotMode]).toStrictEqual([
      120000,
      false,
    ]);
    expect(start).toHaveBeenCalledTimes(1);
    await cleanupTempKb(ctx.tempDir);
  });
});

describe("consultOverlay", () => {
  test("consults the overlay and saves the KB", async () => {
    const fake = useFake();
    const ctx = await createTempKb();
    await consultOverlay(ctx);
    expect(fake.queries.at(-1)).toStrictEqual([
      `consult('${ctx.overlayPath}')`,
      "kb_save",
    ]);
    await cleanupTempKb(ctx.tempDir);
  });

  test("escapes quotes in the overlay path", async () => {
    const fake = useFake();
    const ctx = await createTempKb();
    await consultOverlay({ ...ctx, overlayPath: "/a'b.pl" });
    expect(fake.queries.at(-1)).toStrictEqual([
      "consult('/a''b.pl')",
      "kb_save",
    ]);
    await cleanupTempKb(ctx.tempDir);
  });

  test("needs a live session and a successful consult", async () => {
    const { prolog } = fakeProlog();
    const unknown = {
      tempDir: "/nowhere",
      kbPath: "/nowhere/kb",
      overlayPath: "/nowhere/o.pl",
      prolog,
    };
    expect(await consultOverlay(unknown).catch((e: Error) => e.message)).toBe(
      "No Prolog session found for temp dir: /nowhere",
    );
    for (const [answer, message] of [
      [failed("syntax"), "syntax"],
      [failed(), "unknown error"],
    ] as const) {
      useFake((goal) => (Array.isArray(goal) ? answer : ok));
      const ctx = await createTempKb();
      expect(await consultOverlay(ctx).catch((e: Error) => e.message)).toBe(
        `Failed to consult overlay facts ${ctx.overlayPath}: ${message}`,
      );
      await cleanupTempKb(ctx.tempDir);
    }
  });
});

describe("cleanupTempKb", () => {
  test("detaches, terminates and removes once", async () => {
    const fake = useFake();
    const off = spyOn(process, "off");
    const ctx = await createTempKb();
    await cleanupTempKb(ctx.tempDir);
    expect(fake.queries.at(-1)).toBe("kb_detach");
    expect(fake.events).toStrictEqual(["start", "terminate"]);
    expect(existsSync(ctx.tempDir)).toBe(false);
    expect(off.mock.calls.map((call): unknown => call[0])).toStrictEqual([
      "exit",
      "SIGINT",
      "SIGTERM",
    ]);
    await cleanupTempKb(ctx.tempDir);
    expect(fake.events).toStrictEqual(["start", "terminate"]);
    expect(off).toHaveBeenCalledTimes(3);
  });

  test("removes an unknown directory without a session", async () => {
    const dir = path.join(sandbox, "loose");
    mkdirSync(dir);
    await cleanupTempKb(dir);
    expect(existsSync(dir)).toBe(false);
    expect(await cleanupTempKb(path.join(sandbox, "never"))).toBeUndefined();
  });

  test("leaves a recreated directory alone", async () => {
    const dir = path.join(sandbox, "twice");
    mkdirSync(dir);
    await cleanupTempKb(dir);
    mkdirSync(dir);
    await cleanupTempKb(dir);
    expect(existsSync(dir)).toBe(true);
  });

  test("forgets the session of a cleaned directory", async () => {
    const fake = useFake();
    const ctx = await createTempKb();
    await cleanupTempKb(ctx.tempDir);
    expect(await consultOverlay(ctx).catch((e: Error) => e.message)).toBe(
      `No Prolog session found for temp dir: ${ctx.tempDir}`,
    );
    expect(fake.queries).toStrictEqual([
      `kb_attach('${ctx.kbPath}')`,
      "kb_detach",
    ]);
  });

  test("terminates even when the detach throws", async () => {
    process.env.KIBI_TRACE = "1";
    const log = spyOn(console, "log").mockImplementation(() => {});
    for (const thrown of [new Error("gone"), "plain"]) {
      const fake = useFake((goal) => (goal === "kb_detach" ? thrown : ok));
      const ctx = await createTempKb();
      await cleanupTempKb(ctx.tempDir);
      expect(fake.events).toStrictEqual(["start", "terminate"]);
      expect(log.mock.calls.map((call) => call[0])).toContain(
        `[kibi-trace] kb_detach failed during cleanup for ${ctx.tempDir}: ${String(thrown instanceof Error ? thrown.message : thrown)}`,
      );
    }
  });

  test("traces each step only when tracing is on", async () => {
    const log = spyOn(console, "log").mockImplementation(() => {});
    useFake();
    const quiet = await createTempKb();
    await cleanupTempKb(quiet.tempDir);
    expect(log).not.toHaveBeenCalled();
    process.env.KIBI_DEBUG = "1";
    const ctx = await createTempKb();
    await cleanupTempKb(ctx.tempDir);
    expect(log.mock.calls.map((call) => call[0])).toStrictEqual([
      `[kibi-trace] creating temp KB directory ${ctx.tempDir}`,
      `[kibi-trace] copying base KB undefined -> ${ctx.kbPath}`,
      `[kibi-trace] temporary KB ready at ${ctx.kbPath}`,
      `[kibi-trace] removed temporary KB directory ${ctx.tempDir}`,
    ]);
  });
});

describe("exit and signal cleanup", () => {
  function captureHandlers() {
    const handlers = new Map<string, () => void>();
    spyOn(process, "once").mockImplementation(((
      event: string,
      handler: () => void,
    ) => {
      handlers.set(event, handler);
      return process;
    }) as never);
    return handlers;
  }

  test("cleans up once however many signals arrive", async () => {
    const handlers = captureHandlers();
    const fake = useFake();
    const ctx = await createTempKb();
    handlers.get("SIGINT")?.();
    handlers.get("SIGINT")?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fake.events).toStrictEqual(["start", "terminate"]);
    expect(existsSync(ctx.tempDir)).toBe(false);
    handlers.get("exit")?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fake.events).toStrictEqual(["start", "terminate"]);
  });

  test("skips a directory that was already cleaned", async () => {
    const handlers = captureHandlers();
    const fake = useFake();
    const ctx = await createTempKb();
    await cleanupTempKb(ctx.tempDir);
    const query = spyOn(fake.prolog, "query");
    handlers.get("SIGTERM")?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(query).not.toHaveBeenCalled();
    expect(fake.events).toStrictEqual(["start", "terminate"]);
  });

  test("traces a failed cleanup", async () => {
    process.env.KIBI_TRACE = "1";
    const log = spyOn(console, "log").mockImplementation(() => {});
    for (const thrown of [new Error("stuck"), "plain"]) {
      const handlers = captureHandlers();
      const fake = useFake();
      const ctx = await createTempKb();
      spyOn(fake.prolog, "terminate").mockImplementation(() =>
        Promise.reject(thrown),
      );
      handlers.get("exit")?.();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(log.mock.calls.map((call) => call[0])).toContain(
        `[kibi-trace] cleanup on signal/exit failed for ${ctx.tempDir}: ${thrown instanceof Error ? thrown.message : thrown}`,
      );
    }
  });
});

describe("resetModuleState", () => {
  test("terminates tracked sessions and forgets cleaned directories", async () => {
    const fake = useFake();
    const ctx = await createTempKb();
    spyOn(fake.prolog, "terminate").mockImplementation(() =>
      Promise.reject(new Error("already gone")),
    );
    const off = spyOn(process, "off");
    resetModuleState();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await cleanupTempKb(ctx.tempDir);
    expect(off).not.toHaveBeenCalled();
    expect(fake.prolog.terminate).toHaveBeenCalledTimes(1);
    expect(await consultOverlay(ctx).catch((e: Error) => e.message)).toBe(
      `No Prolog session found for temp dir: ${ctx.tempDir}`,
    );
    const dir = path.join(sandbox, "again");
    mkdirSync(dir);
    await cleanupTempKb(dir);
    resetModuleState();
    mkdirSync(dir);
    await cleanupTempKb(dir);
    expect(existsSync(dir)).toBe(false);
  });
});

describe("createOverlayFacts", () => {
  test("writes one fact per symbol, location and requirement link", () => {
    const symbols = [
      {
        id: "s'1",
        name: "fn'a",
        location: { file: "src/a'.ts", startLine: 3 },
        reqLinks: ["REQ-1", "REQ-2"],
      },
      {
        id: "s2",
        name: "b",
        location: { file: "b.ts", startLine: 9 },
        reqLinks: [],
      },
    ] as unknown as ExtractedSymbol[];
    expect(createOverlayFacts(symbols)).toBe(
      [
        "kb:changed_symbol('s''1').",
        "kb:changed_symbol_loc('s''1', 'src/a''.ts', 3, 0, 'fn''a').",
        "kb:changed_symbol_req('s''1', 'REQ-1').",
        "kb:changed_symbol_req('s''1', 'REQ-2').",
        "kb:changed_symbol('s2').",
        "kb:changed_symbol_loc('s2', 'b.ts', 9, 0, 'b').",
      ].join("\n"),
    );
    expect(createOverlayFacts([])).toBe("");
  });
});
