import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import type { KbRejection } from "../../../src/cli-errors.js";
import * as firmGuard from "../../../src/operations/mutation/firm-decision-guard.js";
import * as omitted from "../../../src/operations/mutation/omitted-properties.js";
import * as origin from "../../../src/operations/mutation/origin.js";
import * as vocabulary from "../../../src/operations/mutation/predicate-vocabulary-guard.js";
import * as relationshipsModule from "../../../src/operations/mutation/relationships.js";
import * as requirementSemantics from "../../../src/operations/mutation/requirement-semantics.js";
import * as storedEntity from "../../../src/operations/mutation/stored-entity.js";
import * as granularity from "../../../src/operations/mutation/symbol-granularity.js";
import * as uncompiled from "../../../src/operations/mutation/uncompiled-source.js";
import * as upsertModule from "../../../src/operations/mutation/upsert.js";
import * as validationModule from "../../../src/operations/mutation/validation.js";
import * as analyzeProse from "../../../src/operations/semantic-advisor/analyze-prose.js";
import * as boundary from "../../../src/operations/semantic-advisor/ingestion-boundary.js";
import * as entitiesModule from "../../../src/public/operations/discovery-entities.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import * as receiptModule from "../../../src/public/proof-receipt.js";

type Row = Record<string, unknown>;

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const prolog = { query: async () => ({ success: true, bindings: {} }) };
const NOW = new Date("2026-09-05T00:00:00Z");
const context = (fields: Row = {}) =>
  ({
    workspaceRoot: "/workspace",
    clock: () => NOW,
    prolog,
    ...fields,
  }) as unknown as OperationContext;

describe("validateUpsertForCommit", () => {
  let log: unknown[][];
  let stored: Row | undefined;
  let exists: boolean;
  let uncompiledSource: Row | null;
  let semantics: (input: Row) => Row;
  let omittedProps: (input: Row) => Row;
  let kept: Row | undefined;
  let recorded: (input: Row) => Row;
  let entityLoads: number;
  const lookup = () => ({
    exists: async () => {
      log.push(["exists"]);
      return exists;
    },
    entity: async () => {
      entityLoads += 1;
      return stored;
    },
  });
  const authoredLookup = {
    exists: async () => true,
    entity: async () => ({ id: "authored" }),
  };

  beforeEach(() => {
    log = [];
    stored = undefined;
    exists = true;
    uncompiledSource = null;
    semantics = (input) => input;
    omittedProps = (input) => input;
    kept = undefined;
    recorded = (input) => input;
    entityLoads = 0;
    const record = (name: string) =>
      (async (...args: unknown[]) => {
        log.push([name, ...args]);
      }) as never;
    spies.push(
      spyOn(validationModule, "validateUpsertInput").mockImplementation(
        (input) => {
          log.push(["validate", input]);
          return {
            entity: { id: input.id, type: input.type, ...input.properties },
            relationships: (input.relationships ?? []) as never,
          } as never;
        },
      ),
      spyOn(
        relationshipsModule,
        "validateRelationshipSources",
      ).mockImplementation(record("sources")),
      spyOn(granularity, "validateSymbolGranularity").mockImplementation(
        async (entity, relationships, _context, storedFn) => {
          log.push([
            "granularity",
            entity,
            relationships,
            storedFn === undefined ? "payload" : await storedFn(),
          ]);
        },
      ),
      spyOn(storedEntity, "storedEntityLookup").mockImplementation(
        (...args) => {
          log.push(["lookup", args[1], args[2]]);
          return lookup() as never;
        },
      ),
      spyOn(uncompiled, "readUncompiledAuthoredSource").mockImplementation(
        async () => {
          log.push(["read-uncompiled"]);
          return uncompiledSource as never;
        },
      ),
      spyOn(uncompiled, "authoredEntityLookup").mockImplementation(
        () => authoredLookup as never,
      ),
      spyOn(uncompiled, "assertAuthoredWriteCompiles").mockImplementation(
        (...args) => {
          log.push(["compiles", args[1], args[2]]);
          return [{ type: "authored" }] as never;
        },
      ),
      spyOn(
        requirementSemantics,
        "withStoredRequirementSemantics",
      ).mockImplementation(async (input) => semantics(input as never) as never),
      spyOn(omitted, "withStoredOmittedProperties").mockImplementation(
        async (input, used) => {
          log.push([
            "omitted",
            used === authoredLookup ? "authored" : "stored",
          ]);
          return omittedProps(input as never) as never;
        },
      ),
      spyOn(upsertModule, "validateAppendOnlyProofReceipts").mockImplementation(
        async (entity) => {
          log.push(["receipts", entity]);
          return kept as never;
        },
      ),
      spyOn(upsertModule, "effectiveRelationships").mockImplementation(
        async (input, _entity, relationships, _context, _staged, used) => {
          log.push([
            "effective",
            input,
            relationships,
            (used as { relationships?: unknown }).relationships,
          ]);
          return [{ type: "merged" }] as never;
        },
      ),
      spyOn(
        relationshipsModule,
        "validateStrictLanePairing",
      ).mockImplementation(record("strict")),
      spyOn(
        relationshipsModule,
        "validateLiveRelationshipTargets",
      ).mockImplementation(record("live")),
      spyOn(
        relationshipsModule,
        "validateSupersedesSourceHistory",
      ).mockImplementation(record("supersedes")),
      spyOn(upsertModule, "analyzeUpsertSemantics").mockImplementation(
        (payload) => {
          log.push(["semantics", payload.relationships]);
          return { receipt: null, warnings: ["w"] };
        },
      ),
      spyOn(
        requirementSemantics,
        "assertStoredRequirementBoundary",
      ).mockImplementation(record("boundary")),
      spyOn(boundary, "assertLogicalGroundingClaimKeys").mockImplementation(
        record("grounding"),
      ),
      spyOn(vocabulary, "assertPredicateArgumentVocabulary").mockImplementation(
        record("vocabulary"),
      ),
      spyOn(firmGuard, "assertFirmDecisionUnchanged").mockImplementation(
        record("firm"),
      ),
      spyOn(origin, "resolveUpsertOrigin").mockImplementation(
        async (input) => recorded(input as never) as never,
      ),
    );
  });

  const names = () => log.map((entry) => entry[0]);
  const payload = (extra: Row = {}) =>
    ({
      type: "fact",
      id: "FACT-a",
      properties: { title: "A" },
      relationships: [{ type: "relates_to", from: "FACT-a", to: "FACT-b" }],
      ...extra,
    }) as never;

  test("runs every check of a stored entity once, in order", async () => {
    const input = payload();
    const result = await upsertModule.validateUpsertForCommit(input, context());
    expect(names()).toStrictEqual([
      "validate",
      "sources",
      "granularity",
      "lookup",
      "exists",
      "granularity",
      "omitted",
      "receipts",
      "effective",
      "strict",
      "live",
      "supersedes",
      "semantics",
      "boundary",
      "grounding",
      "vocabulary",
      "firm",
    ]);
    expect(log[1]).toStrictEqual([
      "sources",
      "FACT-a",
      [{ type: "relates_to", from: "FACT-a", to: "FACT-b" }],
    ]);
    expect(log[3]).toStrictEqual(["lookup", "FACT-a", "fact"]);
    expect(log[5]?.[3]).toBeUndefined();
    expect(log[12]).toStrictEqual(["semantics", [{ type: "merged" }]]);
    expect(result).toStrictEqual({
      validated: {
        entity: { id: "FACT-a", type: "fact", title: "A" },
        relationships: [{ type: "relates_to", from: "FACT-a", to: "FACT-b" }],
      } as never,
      relationships: [{ type: "merged" }] as never,
      semantic: { receipt: null, warnings: ["w"] },
    });
  });

  test("judges a linked symbol against its stored or staged state", async () => {
    stored = { id: "FACT-a", sourceFile: "src/a.ts" };
    await upsertModule.validateUpsertForCommit(payload(), context());
    expect(
      log.filter((entry) => entry[0] === "granularity").map((e) => e[3]),
    ).toStrictEqual(["payload", stored]);
    log = [];
    const staged = {
      entities: new Map([["FACT-a", { id: "FACT-a", staged: true }]]),
      relationships: [],
    };
    await upsertModule.validateUpsertForCommit(payload(), context(), {
      staged,
    });
    expect(
      log.filter((entry) => entry[0] === "granularity")[1]?.[3],
    ).toStrictEqual({ id: "FACT-a", staged: true });
    expect(names()).not.toContain("exists");
    log = [];
    await upsertModule.validateUpsertForCommit(
      payload({ properties: { title: "A", sourceFile: "src/a.ts" } }),
      context(),
    );
    expect(names().filter((name) => name === "granularity")).toHaveLength(1);
  });

  test("validates the merged input again only when it changed", async () => {
    omittedProps = (input) => ({
      ...input,
      properties: { ...(input.properties as Row), kept: "stored" },
    });
    const result = await upsertModule.validateUpsertForCommit(
      payload(),
      context(),
    );
    expect(names().filter((name) => name === "validate")).toHaveLength(2);
    expect(result.validated.entity).toStrictEqual({
      id: "FACT-a",
      type: "fact",
      title: "A",
      kept: "stored",
    });
  });

  test("carries stored receipts into the write unless pruning", async () => {
    kept = { proof_receipts: [{ id: "r1" }] };
    const result = await upsertModule.validateUpsertForCommit(
      payload(),
      context(),
    );
    expect(result.validated.entity).toStrictEqual({
      id: "FACT-a",
      type: "fact",
      title: "A",
      proof_receipts: [{ id: "r1" }],
    });
    expect(
      (log.find((entry) => entry[0] === "effective")?.[1] as Row).properties,
    ).toStrictEqual({
      title: "A",
      proof_receipts: [{ id: "r1" }],
    });
    log = [];
    await upsertModule.validateUpsertForCommit(payload(), context(), {
      allowReceiptsPrune: true,
    });
    expect(names()).not.toContain("receipts");
    expect(names().filter((name) => name === "validate")).toHaveLength(1);
  });

  test("merges into an uncompiled authored file instead of the store", async () => {
    exists = false;
    uncompiledSource = { path: "docs/a.md", extractionError: null };
    const result = await upsertModule.validateUpsertForCommit(
      payload(),
      context({ fs: nodeFilesystem }),
    );
    expect(names()).toContain("read-uncompiled");
    expect(names()).not.toContain("omitted");
    expect(log.find((entry) => entry[0] === "compiles")).toStrictEqual([
      "compiles",
      payload(),
      { id: "FACT-a", type: "fact", title: "A" },
    ]);
    expect(log.find((entry) => entry[0] === "effective")?.[3]).toStrictEqual([
      { type: "authored" },
    ]);
    expect(result.uncompiledSource).toStrictEqual(uncompiledSource as never);
    expect(
      log.find(
        (entry) => entry[0] === "granularity" && entry[3] !== "payload",
      )?.[3],
    ).toStrictEqual({ id: "authored" });
  });

  test("treats a missing entity without an authored file as a create", async () => {
    exists = false;
    const result = await upsertModule.validateUpsertForCommit(
      payload(),
      context(),
    );
    expect(names()).toContain("read-uncompiled");
    expect(log.find((entry) => entry[0] === "omitted")).toStrictEqual([
      "omitted",
      "stored",
    ]);
    expect(log.find((entry) => entry[0] === "effective")?.[3]).toBeUndefined();
    expect("uncompiledSource" in result).toBe(false);
  });

  test("records the resolved origin and firmness", async () => {
    recorded = (input) => ({
      ...input,
      properties: { ...(input.properties as Row), origin: { kind: "human" } },
    });
    const result = await upsertModule.validateUpsertForCommit(
      payload(),
      context(),
    );
    expect(result.validated.entity).toStrictEqual({
      id: "FACT-a",
      type: "fact",
      title: "A",
      origin: { kind: "human" },
    });
  });

  test("needs a store", async () => {
    await expect(
      upsertModule.validateUpsertForCommit(
        payload(),
        context({ prolog: undefined }),
      ),
    ).rejects.toThrow("Upsert operation requires a Prolog runtime");
  });

  describe("firmness", () => {
    // A named source file skips the stored-state granularity read, so only
    // the firmness read loads the stored entity.
    const decision = (properties: Row, type = "req") =>
      ({
        type,
        id: "REQ-a",
        properties: { sourceFile: "src/a.ts", ...properties },
      }) as never;
    const firmness = async (input: never, staged?: Row) =>
      (
        await upsertModule.validateUpsertForCommit(
          input,
          context(),
          staged === undefined
            ? {}
            : {
                staged: {
                  entities: new Map([["REQ-a", staged]]),
                  relationships: [],
                },
              },
        )
      ).validated.entity.firmness;

    test("keeps a stored firmness the write omits", async () => {
      stored = { firmness: "exploratory" };
      expect(await firmness(decision({}))).toBe("exploratory");
      stored = { firmness: "firm", approval_ref: "docs/decision.md" };
      expect(await firmness(decision({}))).toBe("firm");
      expect(await firmness(decision({}), { firmness: "exploratory" })).toBe(
        "exploratory",
      );
      stored = undefined;
      expect(await firmness(decision({}))).toBeUndefined();
      stored = { firmness: "default" };
      expect(await firmness(decision({}))).toBeUndefined();
      stored = { firmness: "bogus" };
      expect(await firmness(decision({}))).toBeUndefined();
      stored = { firmness: "exploratory" };
      expect(await firmness(decision({ approval_ref: "docs/a.md" }))).toBe(
        "exploratory",
      );
    });

    test("needs a firm decision to name the human words it rests on", async () => {
      stored = undefined;
      const refused = async (input: never) => {
        let error: unknown;
        try {
          await firmness(input);
        } catch (caught) {
          error = caught;
        }
        return [(error as KbRejection).code, (error as Error).message];
      };
      expect(await refused(decision({ firmness: "firm" }))).toStrictEqual([
        "ENTITY_VALIDATION_FAILED",
        "Entity validation failed: firmness: firm needs origin.ref (or approval_ref) pointing at the human words that state the rule; use firmness: default for a delegated or agent choice",
      ]);
      expect(
        await refused(decision({ firmness: "firm" }, "adr")),
      ).toStrictEqual([
        "ENTITY_VALIDATION_FAILED",
        "Entity validation failed: firmness: firm needs origin.ref pointing at the human words that state the rule; use firmness: default for a delegated or agent choice",
      ]);
      entityLoads = 0;
      log = [];
      expect(
        await firmness(
          decision({ firmness: "firm", approval_ref: "docs/x.md" }),
        ),
      ).toBe("firm");
      expect(entityLoads).toBe(0);
      expect(names().filter((name) => name === "validate")).toHaveLength(1);
      stored = { approval_ref: "docs/stored.md" };
      expect(await firmness(decision({ firmness: "firm" }))).toBe("firm");
      expect(entityLoads).toBe(1);
      stored = undefined;
      expect(
        await firmness(
          decision({ firmness: "firm", origin: { ref: "docs/o.md" } }),
        ),
      ).toBe("firm");
    });

    test("leaves a non-firm value and non-decisions alone", async () => {
      stored = { firmness: "firm" };
      expect(await firmness(decision({ firmness: "exploratory" }))).toBe(
        "exploratory",
      );
      expect(await firmness(decision({ firmness: "default" }))).toBe("default");
      expect(await firmness(decision({}, "fact"))).toBeUndefined();
      expect(entityLoads).toBe(0);
    });
  });
});

describe("analyzeUpsertSemantics", () => {
  test("analyses only requirement prose", () => {
    const analyze = spyOn(
      analyzeProse,
      "analyzeSemanticAdvisorInput",
    ).mockReturnValue({ receipt: { lane: "x" }, warnings: ["prose"] } as never);
    const inventory = spyOn(
      boundary,
      "assertSemanticInventoryBoundary",
    ).mockImplementation(() => undefined);
    spies.push(analyze, inventory);
    const req = {
      type: "req",
      id: "REQ-a",
      properties: {},
      relationships: [{ type: "relates_to" }],
    } as never;
    expect(upsertModule.analyzeUpsertSemantics(req)).toStrictEqual({
      receipt: { lane: "x" },
      warnings: ["prose"],
    } as never);
    expect(analyze.mock.calls[0]).toStrictEqual([{ payload: req }]);
    expect(inventory.mock.calls[0]).toStrictEqual([
      req,
      [{ type: "relates_to" }],
      { lane: "x" } as never,
    ]);
    expect(
      upsertModule.analyzeUpsertSemantics({
        type: "fact",
        id: "F",
        properties: {},
        relationships: [],
      } as never),
    ).toStrictEqual({ receipt: null, warnings: [] });
    expect(analyze.mock.calls).toHaveLength(1);
  });
});

describe("validateAppendOnlyProofReceipts", () => {
  let loads: unknown[];
  let rows: Row[];
  beforeEach(() => {
    loads = [];
    rows = [];
    spies.push(
      spyOn(entitiesModule, "loadEntities").mockImplementation(
        async (_prolog, input) => {
          loads.push(input);
          return rows as never;
        },
      ),
    );
  });
  const test1 = (extra: Row = {}) => ({ id: "TEST-1", type: "test", ...extra });

  test("ignores non-tests and tests without stored receipts", async () => {
    expect(
      await upsertModule.validateAppendOnlyProofReceipts(
        { id: "F", type: "fact" },
        context(),
      ),
    ).toBeUndefined();
    expect(loads).toStrictEqual([]);
    for (const stored of [
      [],
      [{ proof_receipts: [] }],
      [{ proof_receipts: "x" }],
    ]) {
      rows = stored;
      expect(
        await upsertModule.validateAppendOnlyProofReceipts(test1(), context()),
      ).toBeUndefined();
    }
    expect(loads[0]).toStrictEqual({ id: "TEST-1", type: "test" });
  });

  test("carries the stored history and the fields it binds when omitted", async () => {
    rows = [
      {
        proof_receipts: [{ id: "r1" }, null, [1], "x"],
        verification_scope: "unit",
        verification_perspective: "black-box",
      },
    ];
    expect(
      await upsertModule.validateAppendOnlyProofReceipts(test1(), context()),
    ).toStrictEqual({
      proof_receipts: [{ id: "r1" }],
      verification_scope: "unit",
      verification_perspective: "black-box",
    });
    expect(
      await upsertModule.validateAppendOnlyProofReceipts(
        test1({ verification_scope: "e2e" }),
        context(),
      ),
    ).toStrictEqual({
      proof_receipts: [{ id: "r1" }],
      verification_perspective: "black-box",
    });
    rows = [{ proof_receipts: [{ id: "r1" }] }];
    expect(
      await upsertModule.validateAppendOnlyProofReceipts(test1(), context()),
    ).toStrictEqual({ proof_receipts: [{ id: "r1" }] });
  });

  test("reads an earlier plan step's test instead of the store", async () => {
    const staged = (entity: Row) => ({
      entities: new Map([["TEST-1", entity]]),
      relationships: [],
    });
    expect(
      await upsertModule.validateAppendOnlyProofReceipts(
        test1(),
        context(),
        staged({ type: "test", proof_receipts: [{ id: "s1" }] }) as never,
      ),
    ).toStrictEqual({ proof_receipts: [{ id: "s1" }] });
    expect(
      await upsertModule.validateAppendOnlyProofReceipts(
        test1(),
        context(),
        staged({ type: "fact", proof_receipts: [{ id: "s1" }] }) as never,
      ),
    ).toBeUndefined();
    expect(loads).toStrictEqual([]);
  });

  test("refuses a history that is not an append", async () => {
    rows = [{ proof_receipts: [{ id: "r1" }] }];
    const history = spyOn(receiptModule, "appendOnlyProofReceiptHistoryErrors")
      .mockReturnValueOnce(["dropped r1", "reordered"])
      .mockReturnValueOnce([]);
    spies.push(history);
    let error: unknown;
    try {
      await upsertModule.validateAppendOnlyProofReceipts(
        test1({ proof_receipts: [{ id: "r2" }, "x"] }),
        context(),
      );
    } catch (caught) {
      error = caught;
    }
    expect([
      (error as KbRejection).code,
      (error as KbRejection).message,
    ]).toStrictEqual([
      "ENTITY_VALIDATION_FAILED",
      "Entity validation failed: dropped r1; reordered",
    ]);
    expect(history.mock.calls[0]).toStrictEqual([
      [{ id: "r1" }],
      [{ id: "r2" }],
    ]);
    expect(
      await upsertModule.validateAppendOnlyProofReceipts(
        test1({ proof_receipts: [{ id: "r1" }, { id: "r2" }] }),
        context(),
      ),
    ).toBeUndefined();
  });
});

describe("effectiveRelationships", () => {
  const rel = (to: string, from = "FACT-a", extra: Row = {}) => ({
    type: "relates_to",
    from,
    to,
    ...extra,
  });
  const lookup = (exists: boolean, relationships?: Row[]) => ({
    exists: async () => exists,
    entity: async () => undefined,
    ...(relationships === undefined ? {} : { relationships }),
  });
  const input = { type: "fact", id: "FACT-a", properties: {} } as never;

  test("keeps the payload's relationships for a new entity", async () => {
    const own = [rel("FACT-b")];
    expect(
      await upsertModule.effectiveRelationships(
        input,
        {},
        own as never,
        context(),
        undefined,
        lookup(false) as never,
      ),
    ).toBe(own as never);
  });

  test("merges stored, staged and payload relationships, the payload winning", async () => {
    const merged = await upsertModule.effectiveRelationships(
      input,
      { id: "FACT-a" },
      [rel("FACT-b", "FACT-a", { note: "payload" })] as never,
      context(),
      {
        entities: new Map(),
        relationships: [rel("FACT-c"), rel("FACT-z", "OTHER")],
      } as never,
      lookup(true, [
        rel("FACT-b", "FACT-a", { note: "stored" }),
        rel("FACT-d"),
        rel("FACT-a", "INCOMING"),
      ]) as never,
    );
    expect(merged).toStrictEqual([
      rel("FACT-b", "FACT-a", { note: "payload" }),
      rel("FACT-d"),
      rel("FACT-c"),
    ] as never);
  });

  test("uses staged relationships of an entity the store lacks", async () => {
    const merged = await upsertModule.effectiveRelationships(
      input,
      {},
      [] as never,
      context(),
      { entities: new Map(), relationships: [rel("FACT-c")] } as never,
      lookup(false) as never,
    );
    expect(merged).toStrictEqual([rel("FACT-c")] as never);
  });

  test("reads stored relationships when the lookup has none", async () => {
    const existing = spyOn(
      relationshipsModule,
      "existingRelationships",
    ).mockResolvedValue([rel("FACT-s")] as never);
    spies.push(existing);
    expect(
      await upsertModule.effectiveRelationships(
        input,
        { id: "FACT-a" },
        [] as never,
        context(),
        undefined,
        lookup(true) as never,
      ),
    ).toStrictEqual([rel("FACT-s")] as never);
    expect(existing.mock.calls[0]).toStrictEqual([prolog as never, "FACT-a"]);
    existing.mockRejectedValueOnce(new Error("store down"));
    const own = [rel("FACT-b")];
    expect(
      await upsertModule.effectiveRelationships(
        input,
        { id: "FACT-a" },
        own as never,
        context(),
        undefined,
        lookup(true) as never,
      ),
    ).toBe(own as never);
    existing.mockRejectedValueOnce("raw");
    await expect(
      upsertModule.effectiveRelationships(
        input,
        { id: "FACT-a" },
        own as never,
        context(),
        undefined,
        lookup(true) as never,
      ),
    ).rejects.toBe("raw");
  });

  test("builds its own lookup when none is given", async () => {
    const built = spyOn(storedEntity, "storedEntityLookup").mockReturnValue(
      lookup(false) as never,
    );
    spies.push(built);
    await upsertModule.effectiveRelationships(
      input,
      {},
      [] as never,
      context(),
    );
    expect(built.mock.calls[0]).toStrictEqual([prolog, "FACT-a", "fact"]);
  });
});

describe("sourceWriteScope", () => {
  let rows: Row[];
  let loads: unknown[];
  beforeEach(() => {
    rows = [];
    loads = [];
    spies.push(
      spyOn(entitiesModule, "loadEntities").mockImplementation(
        async (_prolog, input) => {
          loads.push(input);
          return rows as never;
        },
      ),
    );
  });
  const input = (extra: Row = {}) =>
    ({ type: "fact", id: "FACT-a", properties: {}, ...extra }) as never;
  const fsContext = (fields: Row = {}) =>
    context({ fs: nodeFilesystem, ...fields });

  test("touches no document without a source-first filesystem store", async () => {
    expect(await upsertModule.sourceWriteScope(input(), context())).toBeNull();
    expect(
      await upsertModule.sourceWriteScope(
        input(),
        fsContext({ sourceFirst: false }),
      ),
    ).toBeNull();
    expect(
      await upsertModule.sourceWriteScope(
        input(),
        fsContext({ prolog: undefined }),
      ),
    ).toBeNull();
    expect(loads).toStrictEqual([]);
  });

  test("writes a new entity, a named document or an authored source", async () => {
    expect(
      await upsertModule.sourceWriteScope(input(), fsContext()),
    ).toStrictEqual({
      existing: undefined,
    });
    expect(loads).toStrictEqual([{ id: "FACT-a", type: "fact" }]);
    for (const source of ["docs/a.md", "a.MDX", "a.yml", "a.yaml", "a.json"]) {
      rows = [{ id: "FACT-a", source }];
      expect(
        await upsertModule.sourceWriteScope(input(), fsContext()),
      ).toStrictEqual({
        existing: rows[0],
      });
    }
    rows = [{ id: "FACT-a", source: "mcp://x" }];
    expect(
      await upsertModule.sourceWriteScope(
        input({ document: { path: "docs/a.md" } }),
        fsContext(),
      ),
    ).toStrictEqual({ existing: rows[0] });
  });

  test("leaves a stored runtime entity without a document alone", async () => {
    for (const source of ["mcp://x", "docs/a.md.bak", 7, undefined]) {
      rows = [{ id: "FACT-a", source }];
      expect(
        await upsertModule.sourceWriteScope(input(), fsContext()),
      ).toBeNull();
    }
  });
});
