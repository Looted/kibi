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

import {
  loadEntities,
  loadEntitiesPaged,
} from "../../public/operations/discovery-entities.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readWorkspaceSnapshot } from "../../public/operations/workspace-snapshot.js";
import { proofReceiptHistoryErrors } from "../../public/proof-receipt.js";
import { projectEntityProperties } from "../mutation/entity-projection.js";
import { resolveContainedSourcePath } from "../mutation/source-authoring.js";
import { executeUpsert } from "../mutation/upsert.js";
import {
  currentReceiptBindingHash,
  loadCoveredBySymbolsByTest,
} from "./code-scope.js";
import {
  PROOF_RECEIPT_COMPACTION_POLICY,
  compactProofReceipts,
  isOrderedReceiptSubsequence,
} from "./receipt-compaction.js";
import { patchReceiptsIntoDocument } from "./receipt-document.js";

// implements REQ-kibi-fresh-verification-receipts-v2
export type CompactReceiptsArgs = Readonly<{
  /** Compact a single test entity only. */
  testId?: string;
  /** Report what would be removed without writing anything. */
  dryRun?: boolean;
}>;

// implements REQ-kibi-fresh-verification-receipts-v2
export type CompactReceiptsTestResult = Readonly<{
  testId: string;
  before: number;
  after: number;
  removed: number;
}>;

// implements REQ-kibi-fresh-verification-receipts-v2
export type CompactReceiptsResult = Readonly<{
  policy: typeof PROOF_RECEIPT_COMPACTION_POLICY;
  snapshot: string;
  dryRun: boolean;
  removed: number;
  tests: readonly CompactReceiptsTestResult[];
  skipped: readonly Readonly<{ testId: string; reason: string }>[];
}>;

function receiptRecords(value: unknown): Readonly<Record<string, unknown>>[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Readonly<Record<string, unknown>> =>
          typeof entry === "object" && entry !== null && !Array.isArray(entry),
      )
    : [];
}

/**
 * Replace one test's receipt history with a shorter, already-validated
 * history. Only the `proof_receipts` frontmatter block of the authored
 * document is rewritten: the rest of the document keeps its exact bytes, so
 * the receipt-stripped document (an input of the per-contract binding) and
 * therefore every receipt's freshness are unchanged by the rewrite.
 */
// implements REQ-kibi-fresh-verification-receipts-v2
export async function rewriteReceiptHistory(
  test: Readonly<Record<string, unknown>>,
  nextReceipts: readonly Readonly<Record<string, unknown>>[],
  context: OperationContext,
): Promise<void> {
  const testId = String(test.id);
  let sourceDocumentOverride: string | undefined;
  const source = typeof test.source === "string" ? test.source : "";
  if (context.fs && /\.(md|mdx)$/i.test(source)) {
    try {
      const absolute = resolveContainedSourcePath(
        context.workspaceRoot,
        source,
      );
      const before = await context.fs.readFile(absolute);
      sourceDocumentOverride =
        patchReceiptsIntoDocument(before, nextReceipts) ?? undefined;
    } catch {
      sourceDocumentOverride = undefined;
    }
  }
  const properties = projectEntityProperties(test);
  properties.proof_receipts = undefined;
  await executeUpsert(
    {
      type: "test",
      id: testId,
      properties: { ...properties, proof_receipts: [...nextReceipts] },
    },
    context,
    {
      allowReceiptsPrune: true,
      ...(sourceDocumentOverride === undefined
        ? {}
        : { sourceDocumentOverride }),
    },
  );
}

/**
 * One-off migration for existing stores: apply the ingest-time compaction
 * policy (kibi.proof-receipt-compaction.v1) to every test's receipt history
 * against the live workspace snapshot and each test's current per-contract
 * binding. Coverage decisions are unchanged by construction; histories that
 * are not structurally valid are reported and left untouched, because an
 * invalid history decides `invalid` and must stay visible.
 */
// implements REQ-kibi-fresh-verification-receipts-v2
export async function executeCompactReceipts(
  args: CompactReceiptsArgs,
  context: OperationContext,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent: CompactReceiptsResult;
}> {
  if (!context.prolog)
    throw new Error("Proof compact requires a Prolog runtime");
  const fs = context.fs;
  if (fs === undefined)
    throw new Error(
      "Proof compact failed: this maintenance action rewrites authored test documents and requires a filesystem-capable runtime",
    );
  const workspace = await readWorkspaceSnapshot(context);
  if (!workspace.available)
    throw new Error(`Proof compact failed: ${workspace.error}`);
  const snapshot = workspace.snapshot.hash;
  const dryRun = args.dryRun === true;
  // Receipt histories are exactly what this action reads; page them so a
  // long-lived store never exceeds the bounded Prolog output capacity.
  const tests =
    args.testId === undefined
      ? await loadEntitiesPaged(context.prolog, "test")
      : await loadEntities(context.prolog, { type: "test", id: args.testId });
  if (args.testId !== undefined && tests.length === 0) {
    throw new Error(`Proof compact failed: test ${args.testId} was not found`);
  }
  const coveredBy = await loadCoveredBySymbolsByTest(context.prolog);

  const results: CompactReceiptsTestResult[] = [];
  const skipped: Array<{ testId: string; reason: string }> = [];
  for (const test of [...tests].sort((left, right) =>
    String(left.id).localeCompare(String(right.id)),
  )) {
    const testId = String(test.id);
    const receipts = receiptRecords(test.proof_receipts);
    if (receipts.length <= 1) continue;
    const historyErrors = proofReceiptHistoryErrors(
      testId,
      test.verification_scope,
      receipts,
    );
    if (historyErrors.length > 0) {
      skipped.push({
        testId,
        reason: `invalid receipt history left untouched: ${historyErrors[0]}`,
      });
      continue;
    }
    const bindingHash = await currentReceiptBindingHash({
      workspaceRoot: context.workspaceRoot,
      readFile: (absolute) => fs.readFile(absolute),
      test,
      coveredBySymbols: coveredBy.get(testId) ?? [],
    });
    const { kept, removed } = compactProofReceipts(receipts, {
      codeSnapshot: snapshot,
      ...(bindingHash === undefined ? {} : { bindingHash }),
    });
    if (removed === 0) continue;
    if (!isOrderedReceiptSubsequence(kept, receipts)) {
      throw new Error(
        `Proof compact failed for ${testId}: compaction must only drop superseded receipts`,
      );
    }
    if (!dryRun) await rewriteReceiptHistory(test, kept, context);
    results.push({
      testId,
      before: receipts.length,
      after: kept.length,
      removed,
    });
  }

  const removed = results.reduce((sum, row) => sum + row.removed, 0);
  const verb = dryRun ? "Would remove" : "Removed";
  const summary =
    results.length === 0
      ? "No test had superseded receipts."
      : `${verb} ${removed} superseded receipt(s) across ${results.length} test(s).`;
  const skippedText =
    skipped.length > 0
      ? ` Skipped ${skipped.length} test(s) with invalid receipt history.`
      : "";
  return {
    content: [
      {
        type: "text",
        text: `Proof receipts compacted (${PROOF_RECEIPT_COMPACTION_POLICY}). ${summary}${skippedText}`,
      },
    ],
    structuredContent: {
      policy: PROOF_RECEIPT_COMPACTION_POLICY,
      snapshot,
      dryRun,
      removed,
      tests: results,
      skipped,
    },
  };
}
