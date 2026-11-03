import { describe, expect, test } from "bun:test";
import type { StagedUpsertState } from "../../../src/operations/mutation/types.js";
import {
  effectiveRelationships,
  executeUpsert,
  validateAppendOnlyProofReceipts,
  validateUpsertForCommit,
} from "../../../src/operations/mutation/upsert.js";
import { cleanUpAfterEach, ctx } from "../planning/fixtures.js";

cleanUpAfterEach();

const staged = (
  entities: Record<string, Record<string, unknown>>,
  relationships: StagedUpsertState["relationships"] = [],
): StagedUpsertState => ({
  entities: new Map(Object.entries(entities)),
  relationships,
});

describe("proof receipt history from earlier plan steps", () => {
  const receipt = {
    receipt_id: "R-1",
    recorded_at: "2026-09-01T00:00:00.000Z",
  };

  test("carries the receipts an earlier step wrote for the same test", async () => {
    expect(
      await validateAppendOnlyProofReceipts(
        { id: "TEST-1", type: "test" },
        ctx({ fs: null }),
        staged({
          "TEST-1": {
            id: "TEST-1",
            type: "test",
            proof_receipts: [receipt],
            verification_scope: "unit",
          },
        }),
      ),
    ).toStrictEqual({ proof_receipts: [receipt], verification_scope: "unit" });
  });

  test("ignores an earlier step that wrote another type under the id", async () => {
    expect(
      await validateAppendOnlyProofReceipts(
        { id: "TEST-1", type: "test" },
        ctx({ fs: null }),
        staged({ "TEST-1": { id: "TEST-1", type: "req" } }),
      ),
    ).toBeUndefined();
  });
});

describe("effectiveRelationships", () => {
  test("includes relationships an earlier step adds from the entity", async () => {
    const planned = { type: "relates_to", from: "REQ-1", to: "REQ-2" };
    const own = { type: "depends_on", from: "REQ-1", to: "REQ-3" };
    expect(
      await effectiveRelationships(
        { type: "req", id: "REQ-1", properties: {} } as never,
        { id: "REQ-1", type: "req" },
        [own],
        ctx({ fs: null }),
        staged({}, [
          planned,
          { type: "relates_to", from: "REQ-9", to: "REQ-1" },
        ]),
      ),
    ).toStrictEqual([planned, own]);
  });
});

describe("validateUpsertForCommit", () => {
  test("judges a symbol's granularity against the entity an earlier step wrote", async () => {
    const validation = await validateUpsertForCommit(
      {
        type: "symbol",
        id: "SYM-1",
        properties: { title: "run", status: "active" },
        relationships: [{ type: "implements", from: "SYM-1", to: "REQ-1" }],
      } as never,
      ctx({ fs: null }),
      {
        staged: staged({
          "SYM-1": { id: "SYM-1", type: "symbol", title: "run" },
          "REQ-1": { id: "REQ-1", type: "req", title: "R", status: "open" },
        }),
      },
    );
    expect(validation.validated.entity.id).toBe("SYM-1");
  });

  test("needs the human words behind a firm decision", async () => {
    await expect(
      validateUpsertForCommit(
        {
          type: "req",
          id: "REQ-firm",
          properties: { title: "Firm", status: "open", firmness: "firm" },
        } as never,
        ctx({ fs: null }),
      ),
    ).rejects.toThrow(
      "Entity validation failed: firmness: firm needs origin.ref (or approval_ref) pointing at the human words that state the rule; use firmness: default for a delegated or agent choice",
    );
  });

  test("accepts a firm decision that names its approval", async () => {
    const validation = await validateUpsertForCommit(
      {
        type: "req",
        id: "REQ-firm",
        properties: {
          title: "Firm",
          status: "open",
          firmness: "firm",
          approval_ref: "docs/decisions.md#firm",
        },
      } as never,
      ctx({ fs: null }),
    );
    expect(validation.validated.entity.firmness).toBe("firm");
  });

  test("keeps the stored firmness of an update that omits it", async () => {
    const validation = await validateUpsertForCommit(
      {
        type: "req",
        id: "REQ-firm",
        properties: { title: "Firm", status: "open" },
      } as never,
      ctx({ fs: null }),
      {
        staged: staged({
          "REQ-firm": {
            id: "REQ-firm",
            type: "req",
            title: "Firm",
            status: "open",
            firmness: "firm",
            approval_ref: "docs/decisions.md#firm",
          },
        }),
      },
    );
    expect(validation.validated.entity.firmness).toBe("firm");
  });
});

describe("executeUpsert", () => {
  test("refuses planned facts outside a dry run", async () => {
    await expect(
      executeUpsert(
        {
          type: "req",
          id: "REQ-1",
          properties: { title: "R", status: "open" },
          plannedFacts: [],
        } as never,
        ctx({ fs: null }),
      ),
    ).rejects.toThrow(
      "Upsert of REQ-1 rejected: plannedFacts is a dryRun-only input. Write the planned facts first (kb_upsert each, or kb_apply_plan with the kb_model plan), then upsert REQ-1 without plannedFacts.",
    );
  });

  const prepare = async () => {
    const result = await executeUpsert(
      {
        type: "req",
        id: "REQ-deferred",
        properties: { title: "Deferred", status: "open" },
      } as never,
      ctx({ fs: null }),
      { deferCompiledCommit: true },
    );
    const deferred = result.structuredContent?.deferredCommit;
    if (deferred === undefined) throw new Error("no deferred commit");
    return deferred;
  };

  test("finalizes a deferred commit once and never rolls it back after", async () => {
    const deferred = await prepare();
    deferred.finalize();
    expect(deferred.state).toBe("committed");
    expect(() => deferred.finalize()).toThrow(
      "Cannot finalize deferred upsert REQ-deferred from state committed",
    );
    await expect(deferred.rollback()).rejects.toThrow(
      "Cannot roll back deferred upsert REQ-deferred after its compiled commit",
    );
  });

  test("rolls a deferred commit back once", async () => {
    const deferred = await prepare();
    const first = deferred.rollback();
    expect(deferred.rollback()).toBe(first);
    expect(await first).toStrictEqual([]);
    expect(deferred.state).toBe("rolled_back");
    expect(await deferred.rollback()).toStrictEqual([]);
    expect(() => deferred.finalize()).toThrow(
      "Cannot finalize deferred upsert REQ-deferred from state rolled_back",
    );
  });
});
