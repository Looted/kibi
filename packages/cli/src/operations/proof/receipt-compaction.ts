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

import { canonicalJson } from "../../public/proof-fingerprint.js";

// implements REQ-kibi-fresh-verification-receipts
export const PROOF_RECEIPT_COMPACTION_POLICY =
  "kibi.proof-receipt-compaction.v1" as const;

/**
 * What "current" means when a history is compacted: the live workspace
 * snapshot and the test's current per-contract binding hash. Coverage selects
 * a test's deciding receipts with exactly these two keys.
 */
// implements REQ-kibi-fresh-verification-receipts
export type ReceiptCompactionAnchor = Readonly<{
  codeSnapshot?: string;
  bindingHash?: string;
}>;

// implements REQ-kibi-fresh-verification-receipts
export type ReceiptCompaction = Readonly<{
  kept: readonly Readonly<Record<string, unknown>>[];
  removed: number;
}>;

type Receipt = Readonly<Record<string, unknown>>;

function finishedStamp(receipt: Receipt): number {
  const value = receipt.finished_at;
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

/** Newest by finished_at; equal stamps resolve to the later history entry. */
function newest(receipts: readonly Receipt[], indices: readonly number[]) {
  let best: number | undefined;
  for (const index of indices) {
    const receipt = receipts[index] as Receipt;
    if (
      best === undefined ||
      finishedStamp(receipt) >= finishedStamp(receipts[best] as Receipt)
    ) {
      best = index;
    }
  }
  return best;
}

/**
 * Deterministic, decision-preserving compaction of one test's proof-receipt
 * history (policy kibi.proof-receipt-compaction.v1).
 *
 * Coverage decides a test from one selector group: receipts whose
 * `binding_hash` equals the test's current binding, or, when there are none,
 * receipts whose `code_snapshot` equals the live snapshot. Within that group
 * it reads the newest receipt per (scope, contract_hash) and the set of
 * contract hashes present. Compaction keeps exactly what those reads can
 * observe, plus two history anchors:
 *
 * - per selector group, the newest receipt for each (scope, contract_hash);
 * - the newest receipt overall (what the last run reported);
 * - the newest passing receipt (last known good, so reverting a change
 *   finds its proof again without a re-run).
 *
 * Everything else is superseded evidence: it can never be the deciding
 * receipt again for the current snapshot or binding. The result is an
 * ordered subsequence of the input, so it stays a valid history, and the
 * function is idempotent for a fixed anchor. Inputs that are not structurally
 * valid histories must not be compacted (callers validate first): an invalid
 * history decides `invalid`, and dropping the offending entry would change
 * that decision.
 */
// implements REQ-kibi-fresh-verification-receipts
export function compactProofReceipts(
  receipts: readonly Receipt[],
  anchor: ReceiptCompactionAnchor,
): ReceiptCompaction {
  if (receipts.length === 0) return { kept: [], removed: 0 };
  const all = receipts.map((_, index) => index);
  const keep = new Set<number>();
  const add = (index: number | undefined): void => {
    if (index !== undefined) keep.add(index);
  };

  add(newest(receipts, all));
  add(
    newest(
      receipts,
      all.filter((index) => receipts[index]?.outcome === "passed"),
    ),
  );

  const selectors: Array<(receipt: Receipt) => boolean> = [];
  if (anchor.bindingHash !== undefined && anchor.bindingHash !== "") {
    const bindingHash = anchor.bindingHash;
    selectors.push((receipt) => receipt.binding_hash === bindingHash);
  }
  if (anchor.codeSnapshot !== undefined && anchor.codeSnapshot !== "") {
    const codeSnapshot = anchor.codeSnapshot;
    selectors.push((receipt) => receipt.code_snapshot === codeSnapshot);
  }
  for (const selector of selectors) {
    const groups = new Map<string, number[]>();
    for (const index of all) {
      const receipt = receipts[index] as Receipt;
      if (!selector(receipt)) continue;
      const key = `${String(receipt.scope)}\0${String(receipt.contract_hash)}`;
      const group = groups.get(key) ?? [];
      group.push(index);
      groups.set(key, group);
    }
    for (const group of groups.values()) add(newest(receipts, group));
  }

  const kept = all
    .filter((index) => keep.has(index))
    .map((index) => receipts[index] as Receipt);
  return { kept, removed: receipts.length - kept.length };
}

/**
 * True when `subset` is `superset` with entries removed and nothing changed or
 * reordered. Compaction may only drop receipts; this guard keeps every other
 * rewrite of a receipt history fail-closed.
 */
// implements REQ-kibi-fresh-verification-receipts
export function isOrderedReceiptSubsequence(
  subset: readonly Receipt[],
  superset: readonly Receipt[],
): boolean {
  let cursor = 0;
  for (const receipt of subset) {
    const wanted = canonicalJson(receipt);
    while (
      cursor < superset.length &&
      canonicalJson(superset[cursor]) !== wanted
    ) {
      cursor += 1;
    }
    if (cursor === superset.length) return false;
    cursor += 1;
  }
  return true;
}
