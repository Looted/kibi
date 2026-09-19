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

import { loadEntities } from "../../public/operations/discovery-entities.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import {
  type ProofReceipt,
  proofReceiptHistoryErrors,
} from "../../public/proof-receipt.js";
import { projectEntityProperties } from "../mutation/entity-projection.js";
import { executeUpsert } from "../mutation/upsert.js";

// implements REQ-kibi-verification-evidence-contract
export type PruneReceiptsArgs = Readonly<{
  /** Keep the newest N receipts per test (default 1). */
  // implements REQ-kibi-verification-evidence-contract
  keep?: number;
  /** Prune a single test entity only. */
  testId?: string;
}>;

// implements REQ-kibi-verification-evidence-contract
export type PruneReceiptsTestResult = Readonly<{
  // implements REQ-kibi-verification-evidence-contract
  testId: string;
  before: number;
  after: number;
  pruned: number;
}>;

export type PruneReceiptsResult = Readonly<{
  // implements REQ-kibi-verification-evidence-contract
  pruned: number;
  tests: readonly PruneReceiptsTestResult[];
}>;

function parseKeep(value: number | undefined): number {
  if (value === undefined) return 1;
  if (!Number.isSafeInteger(value) || value < 1 || value > 50) {
    throw new Error(
      "Proof prune failed: keep must be an integer between 1 and 50",
    );
  }
  return value;
}

/**
 * Shrink each test's proof_receipts history to its newest entries.
 *
 * Re-proving the same snapshot appends duplicate passed receipts (one block
 * per run), and consumers previously deduped them by hand. This is the one
 * sanctioned history-shrinking mutation: pruned histories are still ordered,
 * structurally valid evidence, and every shrink goes through the typed upsert
 * with the prune carve-out (append-only validation is skipped for exactly
 * this maintenance action).
 */
// implements REQ-kibi-verification-evidence-contract
export async function executePruneReceipts(
  args: PruneReceiptsArgs,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: PruneReceiptsResult;
}> {
  if (!context.prolog) throw new Error("Proof prune requires a Prolog runtime");
  if (context.fs === undefined)
    throw new Error(
      "Proof prune failed: this maintenance action rewrites authored test documents and requires a filesystem-capable runtime",
    );
  const keep = parseKeep(args.keep);
  const tests = await loadEntities(context.prolog, {
    type: "test",
    ...(args.testId === undefined ? {} : { id: args.testId }),
  });
  if (args.testId !== undefined && tests.length === 0) {
    throw new Error(`Proof prune failed: test ${args.testId} was not found`);
  }

  const results: PruneReceiptsTestResult[] = [];
  for (const test of tests) {
    const testId = String(test.id);
    const receipts = Array.isArray(test.proof_receipts)
      ? (test.proof_receipts.filter(
          (value): value is Record<string, unknown> =>
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value),
        ) as unknown as ProofReceipt[])
      : [];
    if (receipts.length <= keep) continue;

    const nextReceipts = receipts.slice(-keep);
    const historyErrors = proofReceiptHistoryErrors(
      testId,
      test.verification_scope,
      nextReceipts,
    );
    if (historyErrors.length > 0) {
      throw new Error(
        `Proof prune failed for ${testId}: pruned history is invalid: ${historyErrors.join("; ")}`,
      );
    }

    const properties = projectEntityProperties(test);
    properties.proof_receipts = undefined;
    await executeUpsert(
      {
        type: "test",
        id: testId,
        properties: { ...properties, proof_receipts: nextReceipts },
      },
      context,
      { allowReceiptsPrune: true },
    );
    results.push({
      testId,
      before: receipts.length,
      after: nextReceipts.length,
      pruned: receipts.length - nextReceipts.length,
    });
  }

  const pruned = results.reduce((sum, row) => sum + row.pruned, 0);
  const summary =
    results.length === 0
      ? "No test had receipts beyond the keep window."
      : `Pruned ${pruned} receipt(s) across ${results.length} test(s).`;
  return {
    content: [{ type: "text", text: `Proof receipts pruned. ${summary}` }],
    structuredContent: { pruned, tests: results },
  };
}
