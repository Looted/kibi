/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, test } from "bun:test";
import {
  compactProofReceipts,
  isOrderedReceiptSubsequence,
} from "../../src/operations/proof/receipt-compaction.js";

type Receipt = Readonly<Record<string, unknown>>;

function receipt(
  index: number,
  fields: {
    snapshot: string;
    binding?: string;
    contract?: string;
    scope?: string;
    outcome?: string;
  },
): Receipt {
  const stamp = new Date(Date.UTC(2026, 8, 1, 0, 0, index)).toISOString();
  return {
    version: "kibi.proof-receipt.v1",
    receipt_id: `PR-COMPACT-${String(index).padStart(6, "0")}`,
    test_id: "TEST-COMPACT",
    scope: fields.scope ?? "end_to_end",
    outcome: fields.outcome ?? "passed",
    code_snapshot: fields.snapshot,
    started_at: stamp,
    finished_at: stamp,
    contract_hash: fields.contract ?? "C0",
    ...(fields.binding === undefined ? {} : { binding_hash: fields.binding }),
  };
}

/**
 * The receipt selection requirement_proof.pl performs for one test, given a
 * structurally valid history: the binding group when per-contract binding
 * finds receipts, else the snapshot group; then the newest receipt for the
 * current scope and contract, or the contract hashes present when none
 * matches.
 */
function decide(
  receipts: readonly Receipt[],
  context: {
    snapshot: string;
    binding?: string;
    perContract: boolean;
    scope: string;
    contract: string;
  },
): unknown {
  const bound =
    context.perContract && context.binding !== undefined
      ? receipts.filter((row) => row.binding_hash === context.binding)
      : [];
  const group =
    bound.length > 0
      ? bound
      : receipts.filter((row) => row.code_snapshot === context.snapshot);
  if (group.length === 0) return { state: "stale" };
  const current = group.filter(
    (row) =>
      row.scope === context.scope && row.contract_hash === context.contract,
  );
  if (current.length === 0) {
    return {
      state: "contract_mismatch",
      hashes: [...new Set(group.map((row) => row.contract_hash))].sort(),
    };
  }
  const latest = current.reduce((best, row) =>
    Date.parse(String(row.finished_at)) >= Date.parse(String(best.finished_at))
      ? row
      : best,
  );
  return {
    state: latest.outcome === "passed" ? "passed" : "failed",
    receiptId: latest.receipt_id,
  };
}

function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)] as T;
}

const SNAPSHOTS = ["S0", "S1", "S2", "S3"];
const BINDINGS = ["B0", "B1", "B2", undefined];
const CONTRACTS = ["C0", "C1"];
const SCOPES = ["end_to_end", "integration"];

function randomHistory(random: () => number): Receipt[] {
  const length = 1 + Math.floor(random() * 30);
  return Array.from({ length }, (_, index) => {
    const binding = pick(random, BINDINGS);
    return receipt(index, {
      snapshot: pick(random, SNAPSHOTS),
      ...(binding === undefined ? {} : { binding }),
      contract: pick(random, CONTRACTS),
      scope: pick(random, SCOPES),
      outcome: random() < 0.3 ? "failed" : "passed",
    });
  });
}

describe("compactProofReceipts", () => {
  test("never changes a proof decision for the anchor it compacts against", () => {
    const random = prng(330);
    for (let iteration = 0; iteration < 400; iteration++) {
      const history = randomHistory(random);
      for (const snapshot of [...SNAPSHOTS, "S-new"]) {
        for (const binding of [...BINDINGS, "B-new"]) {
          const { kept, removed } = compactProofReceipts(history, {
            codeSnapshot: snapshot,
            ...(binding === undefined ? {} : { bindingHash: binding }),
          });
          expect(removed).toBe(history.length - kept.length);
          expect(isOrderedReceiptSubsequence(kept, history)).toBe(true);
          for (const perContract of [true, false]) {
            for (const scope of SCOPES) {
              for (const contract of CONTRACTS) {
                const context = {
                  snapshot,
                  ...(binding === undefined ? {} : { binding }),
                  perContract,
                  scope,
                  contract,
                };
                expect(decide(kept, context)).toEqual(decide(history, context));
              }
            }
          }
        }
      }
    }
  });

  test("is deterministic and idempotent for a fixed anchor", () => {
    const random = prng(7);
    for (let iteration = 0; iteration < 200; iteration++) {
      const history = randomHistory(random);
      const anchor = { codeSnapshot: "S1", bindingHash: "B0" };
      const first = compactProofReceipts(history, anchor);
      const second = compactProofReceipts(
        history.map((row) => ({ ...row })),
        anchor,
      );
      expect(second.kept).toEqual(first.kept);
      const again = compactProofReceipts(first.kept, anchor);
      expect(again.kept).toEqual(first.kept);
      expect(again.removed).toBe(0);
    }
  });

  test("collapses one receipt per proof run to the current decision and the last known good", () => {
    // Every run proves a new snapshot, so per-snapshot retention would keep
    // all of these; only the newest run and the newest pass can matter now.
    const history = Array.from({ length: 50 }, (_, index) =>
      receipt(index, {
        snapshot: `S${index}`,
        binding: `B${Math.floor(index / 10)}`,
        outcome: index === 49 ? "failed" : "passed",
      }),
    );
    const { kept, removed } = compactProofReceipts(history, {
      codeSnapshot: "S-live",
      bindingHash: "B4",
    });
    expect(kept.map((row) => row.receipt_id)).toEqual([
      "PR-COMPACT-000048",
      "PR-COMPACT-000049",
    ]);
    expect(removed).toBe(48);
  });

  test("keeps the newest receipt per scope and contract inside the current group", () => {
    const history = [
      receipt(0, { snapshot: "S", contract: "C-old" }),
      receipt(1, { snapshot: "S", contract: "C-old" }),
      receipt(2, { snapshot: "S", contract: "C-new", outcome: "failed" }),
      receipt(3, { snapshot: "S", contract: "C-new" }),
      receipt(4, { snapshot: "S", contract: "C-new", scope: "integration" }),
      receipt(5, { snapshot: "other" }),
    ];
    const { kept } = compactProofReceipts(history, { codeSnapshot: "S" });
    expect(kept.map((row) => row.receipt_id)).toEqual([
      "PR-COMPACT-000001",
      "PR-COMPACT-000003",
      "PR-COMPACT-000004",
      "PR-COMPACT-000005",
    ]);
  });

  test("keeps only the history anchors when nothing is current", () => {
    const history = [
      receipt(0, { snapshot: "S0" }),
      receipt(1, { snapshot: "S1" }),
      receipt(2, { snapshot: "S2", outcome: "failed" }),
    ];
    expect(
      compactProofReceipts(history, {}).kept.map((row) => row.receipt_id),
    ).toEqual(["PR-COMPACT-000001", "PR-COMPACT-000002"]);
    expect(compactProofReceipts([], { codeSnapshot: "S0" })).toEqual({
      kept: [],
      removed: 0,
    });
  });
});

describe("isOrderedReceiptSubsequence", () => {
  const history = [
    receipt(0, { snapshot: "S0" }),
    receipt(1, { snapshot: "S1" }),
    receipt(2, { snapshot: "S2" }),
  ];

  test("accepts removals and rejects reordering or rewritten entries", () => {
    expect(
      isOrderedReceiptSubsequence(
        [history[0], history[2]] as Receipt[],
        history,
      ),
    ).toBe(true);
    expect(
      isOrderedReceiptSubsequence(
        [history[2], history[0]] as Receipt[],
        history,
      ),
    ).toBe(false);
    expect(
      isOrderedReceiptSubsequence(
        [{ ...history[1], outcome: "failed" }],
        history,
      ),
    ).toBe(false);
  });
});
