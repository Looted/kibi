// implements REQ-009
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  persistEntities,
  persistRelationships,
  retractEntitiesForSources,
} from "../../../src/commands/sync/persistence.js";
import type {
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult,
} from "../../../src/extractors/markdown.js";
import * as codec from "../../../src/prolog/codec.js";
import type { PrologProcess, QueryResult } from "../../../src/prolog.js";
import * as discoveryEntities from "../../../src/public/operations/discovery-entities.js";
import {
  captureIo,
  isolateKibiEnv,
} from "../../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

function makeEntity(overrides: Partial<ExtractedEntity> = {}): ExtractedEntity {
  return {
    id: "REQ-001",
    type: "req",
    title: "Test Requirement",
    status: "open",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    source: ".kb/requirements/REQ-001.md",
    ...overrides,
  };
}

function makeResult(
  entityOverrides: Partial<ExtractedEntity> = {},
  relationships: ExtractedRelationship[] = [],
  sourceFile?: string,
): ExtractionResult {
  return {
    entity: makeEntity(entityOverrides),
    relationships,
    ...(sourceFile === undefined ? {} : { sourceFile }),
  };
}

function makeProlog(
  queryImpl?: (goal: string) => Promise<QueryResult> | QueryResult,
): PrologProcess {
  return {
    query: async (goal: string | string[]) => {
      const text = Array.isArray(goal) ? goal.join(", ") : goal;
      if (queryImpl) return queryImpl(text);
      return { success: true, bindings: {} };
    },
    terminate: async () => {},
    start: async () => {},
  } as unknown as PrologProcess;
}

describe("persistEntities leftover receipt and batch wrap branches", () => {
  test("filters mixed existing proof receipts and accepts append-only history", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const previousReceipt = {
      version: "kibi.proof-receipt.v1",
      receipt_id: "PR-keep",
      test_id: "TEST-MIX",
      scope: "end_to_end",
      outcome: "passed",
      code_snapshot: "a".repeat(64),
      environment_hash: "b".repeat(64),
      started_at: "2026-08-13T00:00:00Z",
      finished_at: "2026-08-13T00:00:01Z",
      artifact_digest: "c".repeat(64),
      contract_hash: "d".repeat(64),
      fingerprint: "e".repeat(64),
      fingerprint_components: {
        contract: "1a".repeat(32),
        integration: "2a".repeat(32),
        command: "3a".repeat(32),
        bindings: "4a".repeat(32),
        producer: "5a".repeat(32),
      },
      integration_id: "self-proof",
      producer: { name: "kibi-command-producer" },
      command_argv: ["node", "scripts/proof.mjs"],
      run_outcome: "passed",
      proof_results: [
        {
          symbol_id: "SYM-1",
          target: "default",
          outcome: "passed",
          binding: "aggregate_run",
          attempts: { status: "unavailable" },
        },
      ],
    };
    const load = spyOn(discoveryEntities, "loadEntities").mockResolvedValue([
      {
        proof_receipts: [null, "skip", [], previousReceipt],
      } as never,
    ]);
    restores.push(() => load.mockRestore());
    const nextReceipt = {
      ...previousReceipt,
      receipt_id: "PR-next",
      started_at: "2026-08-13T00:00:02Z",
      finished_at: "2026-08-13T00:00:03Z",
    };
    const result = await persistEntities(
      makeProlog((goal) => {
        if (goal.includes("findall(Id, kb_entity")) {
          return {
            success: true,
            bindings: { ExistingIds: "['TEST-MIX']" },
          };
        }
        return { success: true, bindings: {} };
      }),
      [
        makeResult({
          id: "TEST-MIX",
          type: "test",
          title: "Mixed receipts",
          verification_scope: "end_to_end",
          proof_receipts: [previousReceipt, nextReceipt],
        }),
      ],
      new Set(),
    );
    expect(result.entityCount).toBe(1);
    expect(load).toHaveBeenCalled();
  });

  test("skips receipt history when the existing test has no receipt array", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const load = spyOn(discoveryEntities, "loadEntities").mockResolvedValue([
      { proof_receipts: "not-array" } as never,
    ]);
    restores.push(() => load.mockRestore());
    const result = await persistEntities(
      makeProlog((goal) => {
        if (goal.includes("findall(Id, kb_entity")) {
          return { success: true, bindings: { ExistingIds: "[TEST-NONE]" } };
        }
        return { success: true, bindings: {} };
      }),
      [
        makeResult({
          id: "TEST-NONE",
          type: "test",
          title: "No prior receipts",
        }),
      ],
      new Set(),
    );
    expect(result.entityCount).toBe(1);
  });

  test("rethrows an already-prefixed sequential upsert error", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    await expect(
      persistEntities(
        {
          query: async () => {
            throw new Error("Failed to upsert entity REQ-001: already wrapped");
          },
          queryBatch: async () => ({ success: false, bindings: {} }),
        } as unknown as PrologProcess,
        [makeResult()],
        new Set(),
        { loadExistingEntityIds: false },
      ),
    ).rejects.toThrow(/already wrapped/);
  });

  test("serializes req semantic extras and uses entity.source when sourceFile is omitted", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const goals: string[] = [];
    const result = await persistEntities(
      makeProlog((goal) => {
        goals.push(goal);
        return { success: true, bindings: {} };
      }),
      [
        {
          entity: makeEntity({
            tags: ["a"],
            owner: "team",
            priority: "high",
            severity: "must",
            text_ref: "docs/x.md",
            semantic_text: "must retain",
            logic_claims: ["CLAIM-1"],
            semantic_clauses: ["must retain"],
            semantic_inventory_version: "kibi.semantic-inventory.v1",
            semantic_source_field: "semantic_text",
            semantic_source_hash: "a".repeat(64),
            semantic_inventory: [{ claim_key: "CLAIM-1" }],
          }),
          relationships: [],
        },
      ],
      new Set(),
      { loadExistingEntityIds: false },
    );
    expect(result.kbModified).toBe(true);
    expect(goals.some((goal) => goal.includes("semantic_text"))).toBe(true);
    expect(goals.some((goal) => goal.includes("semantic_inventory"))).toBe(true);
  });

  test("parses empty existing-id lists without adding tokens", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const ids = new Set<string>();
    await persistEntities(
      makeProlog((goal) => {
        if (goal.includes("findall(Id, kb_entity")) {
          return { success: true, bindings: { ExistingIds: "[   ]" } };
        }
        return { success: true, bindings: {} };
      }),
      [makeResult()],
      ids,
    );
    expect(ids.has("REQ-001")).toBe(true);
  });
});

describe("persistRelationships leftover reset and construction branches", () => {
  test("resets a poisoned session when terminate/start succeed", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);
    let attempts = 0;
    let started = 0;
    const result = await persistRelationships(
      {
        query: async () => {
          attempts += 1;
          if (attempts < 3) {
            return {
              success: false,
              bindings: {},
              error: "predicate or file not found",
            };
          }
          return { success: true, bindings: {} };
        },
        terminate: async () => {},
        start: async () => {
          started += 1;
        },
      } as unknown as PrologProcess,
      [makeResult({}, [{ type: "specified_by", from: "REQ-001", to: "SCEN-1" }])],
      [],
    );
    expect(started).toBe(1);
    expect(result.relationshipCount).toBe(1);
  });

  test("skips reset when terminate/start are missing and still logs a generic tip", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);
    await persistRelationships(
      {
        query: async () => ({
          success: false,
          bindings: {},
          error: "query failed",
        }),
      } as unknown as PrologProcess,
      [makeResult({}, [{ type: "specified_by", from: "REQ-001", to: "SCEN-1" }])],
      [],
    );
    expect(io.warns.join("\n")).toMatch(/Tip: Ensure target entities exist/);
  });

  test("treats a failed start as a skipped reset", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);
    await persistRelationships(
      {
        query: async () => ({
          success: false,
          bindings: {},
          error: "Query returned false",
        }),
        terminate: async () => {},
        start: async () => {
          throw new Error("cannot start");
        },
      } as unknown as PrologProcess,
      [makeResult({}, [{ type: "specified_by", from: "REQ-001", to: "SCEN-1" }])],
      [],
    );
    expect(io.warns.join("\n")).toMatch(/failed to sync/);
  });

  test("captures goal-construction throws from both result and shard relationships", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);
    const original = codec.toPrologAtom;
    const atom = spyOn(codec, "toPrologAtom").mockImplementation((value) => {
      if (value === "boom-type" || value === "shard-boom") {
        throw "atom explode";
      }
      return original(value);
    });
    restores.push(() => atom.mockRestore());
    await persistRelationships(
      makeProlog(),
      [makeResult({}, [{ type: "boom-type", from: "REQ-001", to: "SCEN-1" }])],
      [{ type: "shard-boom", from: "REQ-001", to: "TEST-1" }],
    );
    expect(io.warns.join("\n")).toContain("atom explode");
  });

  test("logs a missing-entity tip even when the id cannot be parsed", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);
    await persistRelationships(
      makeProlog((goal) => {
        if (goal.includes("kb_assert_relationship")) {
          return {
            success: false,
            bindings: {},
            error: "entity does not exist somewhere",
          };
        }
        return { success: true, bindings: {} };
      }),
      [makeResult({}, [{ type: "specified_by", from: "REQ-001", to: "SCEN-1" }])],
      [],
    );
    expect(io.warns.join("\n")).toMatch(/missing entity/);
  });

  test("wraps non-Error sequential retry throws", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);
    let calls = 0;
    await persistRelationships(
      {
        query: async () => {
          calls += 1;
          if (calls === 1) {
            return { success: false, bindings: {}, error: "first fail" };
          }
          throw "retry boom";
        },
        queryBatch: async () => ({ success: false, bindings: {} }),
      } as unknown as PrologProcess,
      [makeResult({}, [{ type: "specified_by", from: "REQ-001", to: "SCEN-1" }])],
      [],
    );
    expect(io.warns.join("\n")).toContain("retry boom");
  });
});

describe("retract leftover list shapes", () => {
  test("ignores unsuccessful source lookups and malformed list bodies", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    let calls = 0;
    const count = await retractEntitiesForSources(
      makeProlog((goal) => {
        if (!goal.includes("kb_entities_by_source")) {
          return { success: true, bindings: {} };
        }
        calls += 1;
        if (calls === 1) return { success: false, bindings: {} };
        if (calls === 2) return { success: true, bindings: { Ids: "REQ-1" } };
        return { success: true, bindings: { Ids: "[]" } };
      }),
      ["docs/REQ.md"],
    );
    expect(count).toBe(0);
  });
});
