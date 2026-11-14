import { describe, expect, test } from "bun:test";
import type {
  BrokerCallEvidence,
  CaseSignalContext,
} from "../runtime/case-signals";
import {
  MOVED_SYMBOL,
  RECEIPT_IDS,
  REPLACED_SYMBOL,
  SHARD_IDS,
  SHARD_KEPT_EDGE,
  SHARD_PATH,
  SHARD_TARGET_EDGE,
} from "../runtime/traceability-seeds";
import {
  traceabilityForbiddenObserved,
  traceabilitySignalObserved,
} from "../runtime/traceability-signals";

type Entity = Record<string, unknown>;

function context(
  overrides: Readonly<{
    entities?: readonly Entity[];
    status?: Entity;
    calls?: readonly BrokerCallEvidence[];
    text?: string;
  }> = {},
): CaseSignalContext {
  return {
    results: [
      { tool: "kb_query", result: { entities: overrides.entities ?? [] } },
      {
        tool: "kb_status",
        result: overrides.status ?? { syncState: "fresh", staleReasons: [] },
      },
    ],
    brokerTools: (overrides.calls ?? []).map(({ tool }) => tool),
    answer: {
      text: overrides.text ?? "",
      answer: {
        source: "none",
        verdict: null,
        governing: [],
        conflict: null,
        unknowns: [],
        nextStep: null,
        proof: null,
      },
    },
    ordering: {
      firstKbSearchIndex: null,
      firstEditIndex: null,
      kibiCallsBeforeFirstEdit: 0,
      editedPaths: [],
    },
    workspaceFiles: {},
    workspaceAssertions: [],
    calls: overrides.calls ?? [],
  };
}

const base = (links: Entity = {}): Entity => ({
  id: SHARD_IDS.base,
  type: "req",
  verified_by: `kb:entity/${SHARD_IDS.test}`,
  ...links,
});
const related: Entity = { id: SHARD_IDS.related, type: "req" };

function deleteCall(
  edge = SHARD_TARGET_EDGE,
  sourcePath = SHARD_PATH,
): BrokerCallEvidence {
  return {
    tool: "kb_delete",
    args: { relationships: [edge] },
    resultOk: true,
    result: {
      structuredContent: {
        kibiProtocol: 1,
        data: {
          relationships_deleted: 1,
          relationship_results: [
            { ...edge, deleted: true, compiled_edge_retracted: true },
          ],
          sourceWrites: [{ path: sourcePath, mode: "write" }],
        },
      },
    },
  };
}

const signal = (name: string, ctx: CaseSignalContext) =>
  traceabilitySignalObserved(name, ctx);

describe("relationship shard signals", () => {
  test("the exact shard delete counts once the edge is gone", () => {
    const done = context({
      entities: [base(), related],
      calls: [deleteCall()],
    });
    expect(signal("canonical relationship shard", done)).toBe(true);
    expect(signal("unrelated records", done)).toBe(true);
    expect(signal("endpoints preserved", done)).toBe(true);
    expect(signal("exact edge absent after sync", done)).toBe(true);
  });

  test("a delete of another edge, or one outside the shard, does not", () => {
    const other = context({
      entities: [base(), related],
      calls: [deleteCall(SHARD_KEPT_EDGE)],
    });
    expect(signal("canonical relationship shard", other)).toBe(false);
    const elsewhere = context({
      entities: [base(), related],
      calls: [deleteCall(SHARD_TARGET_EDGE, ".kb/symbols.yaml")],
    });
    expect(signal("canonical relationship shard", elsewhere)).toBe(false);
  });

  test("an edge still compiled, or a lost neighbor, fails", () => {
    const kept = context({
      entities: [
        base({ depends_on: `kb:entity/${SHARD_IDS.related}` }),
        related,
      ],
      calls: [deleteCall()],
    });
    expect(signal("canonical relationship shard", kept)).toBe(false);
    expect(signal("exact edge absent after sync", kept)).toBe(false);
    const lost = context({
      entities: [{ id: SHARD_IDS.base, type: "req" }],
      calls: [deleteCall()],
    });
    expect(signal("unrelated records", lost)).toBe(false);
    expect(signal("endpoints preserved", lost)).toBe(false);
  });

  test("edge absence needs a delete and a fresh final status", () => {
    expect(
      signal(
        "exact edge absent after sync",
        context({ entities: [base(), related] }),
      ),
    ).toBe(false);
    expect(
      signal(
        "exact edge absent after sync",
        context({
          entities: [base(), related],
          calls: [deleteCall()],
          status: { syncState: "stale", staleReasons: [{ code: "x" }] },
        }),
      ),
    ).toBe(false);
  });
});

describe("symbol repair signals", () => {
  test("repair candidates name the moved symbol and its new file", () => {
    expect(
      signal(
        "evidence-backed repair candidates",
        context({
          text: `${MOVED_SYMBOL.id} can be remapped to ${MOVED_SYMBOL.currentFile}.`,
        }),
      ),
    ).toBe(true);
    expect(
      signal(
        "evidence-backed repair candidates",
        context({ text: "repair candidates exist" }),
      ),
    ).toBe(false);
  });

  test("only the obsolete symbol is deleted and coverage moves", () => {
    const deleted: BrokerCallEvidence = {
      tool: "kb_delete",
      args: { ids: [REPLACED_SYMBOL.obsolete], approvedPlanHash: "h" },
      resultOk: true,
    };
    const replacement = {
      id: REPLACED_SYMBOL.replacement,
      type: "symbol",
      covered_by: `kb:entity/${REPLACED_SYMBOL.test}`,
    };
    const done = context({ entities: [replacement], calls: [deleted] });
    expect(signal("replacement evidence", done)).toBe(true);
    expect(signal("coverage transfer evidence", done)).toBe(true);
    const tooMuch = context({
      entities: [replacement],
      calls: [
        deleted,
        { ...deleted, args: { ids: [REPLACED_SYMBOL.replacement] } },
      ],
    });
    expect(signal("replacement evidence", tooMuch)).toBe(false);
    const uncovered = context({
      entities: [{ id: REPLACED_SYMBOL.replacement, type: "symbol" }],
      calls: [deleted],
    });
    expect(signal("coverage transfer evidence", uncovered)).toBe(false);
  });

  test("names it does not own stay undefined", () => {
    expect(signal("final check executed", context())).toBeUndefined();
  });
});

describe("proof receipt signals", () => {
  const receipt = (id: string, contract: string): Entity => ({
    receipt_id: id,
    outcome: "passed",
    contract_hash: contract,
  });
  const e2eTest = (receipts: readonly Entity[]): Entity => ({
    id: RECEIPT_IDS.test,
    type: "test",
    proof_receipts: receipts,
  });
  function ingestCall(result: Entity, snapshot = "snap"): BrokerCallEvidence {
    return {
      tool: "kb_ingest_proof",
      args: { snapshot, artifact: {}, testIds: [RECEIPT_IDS.test] },
      resultOk: true,
      result: {
        structuredContent: {
          results: [
            {
              testId: RECEIPT_IDS.test,
              outcome: "passed",
              applied: true,
              ...result,
            },
          ],
        },
      },
    };
  }
  const coverageCall = (gap: string): BrokerCallEvidence => ({
    tool: "kb_coverage",
    args: { by: "req" },
    resultOk: true,
    result: { structuredContent: { rows: [{ proofGaps: [gap] }] } },
  });

  test("an ingested passing receipt that ends the history counts", () => {
    const done = context({
      entities: [e2eTest([receipt("PR-new", "c2")])],
      calls: [ingestCall({ receiptId: "PR-new", receiptCount: 1 })],
      status: { syncState: "fresh", staleReasons: [], proofSnapshot: "snap" },
    });
    expect(signal("current contract receipt appended", done)).toBe(true);
    expect(signal("passing v2 receipt", done)).toBe(true);
    expect(signal("final snapshot before verification", done)).toBe(true);
    expect(signal("historical contract receipt preserved", done)).toBe(true);
    const seeded = context({ entities: [e2eTest([receipt("PR-old", "c1")])] });
    expect(signal("current contract receipt appended", seeded)).toBe(false);
    const otherSnapshot = context({
      entities: [e2eTest([receipt("PR-new", "c2")])],
      calls: [ingestCall({ receiptId: "PR-new" }, "older")],
      status: { syncState: "fresh", staleReasons: [], proofSnapshot: "snap" },
    });
    expect(signal("final snapshot before verification", otherSnapshot)).toBe(
      false,
    );
  });

  test("a hand-edited history is neither preserved nor allowed", () => {
    const edited = context({
      entities: [e2eTest([receipt("PR-new", "c2")])],
      calls: [
        ingestCall({ receiptId: "PR-new", receiptCount: 1 }),
        { tool: "kb_upsert", args: { id: RECEIPT_IDS.test }, resultOk: true },
      ],
    });
    expect(signal("historical contract receipt preserved", edited)).toBe(false);
    expect(
      traceabilityForbiddenObserved("rewrite receipt history", edited),
    ).toBe(true);
  });

  test("the mismatch counts only when seen before a contract-drift ingest", () => {
    const drift = ingestCall({
      receiptId: "PR-new",
      fingerprintDrift: ["contract"],
    });
    expect(
      signal(
        "contract mismatch remains non-proof",
        context({ calls: [coverageCall("stale_proof_receipt"), drift] }),
      ),
    ).toBe(true);
    expect(
      signal(
        "contract mismatch remains non-proof",
        context({ calls: [drift, coverageCall("stale_proof_receipt")] }),
      ),
    ).toBe(false);
  });

  test("reusing a receipt means no ingest and no new receipt", () => {
    const reused = context({ entities: [e2eTest([receipt("PR-old", "c1")])] });
    expect(traceabilityForbiddenObserved("rerun unchanged E2E", reused)).toBe(
      false,
    );
    expect(
      traceabilityForbiddenObserved(
        "rerun unchanged E2E",
        context({ calls: [ingestCall({ receiptId: "PR-new" })] }),
      ),
    ).toBe(true);
    expect(traceabilityForbiddenObserved("other", reused)).toBeUndefined();
  });
});
