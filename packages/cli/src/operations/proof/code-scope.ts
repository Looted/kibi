/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

import { normalizeEntityId, parseTriples } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";

/**
 * Which symbols a proof receipt's per-contract binding covers. Receipt ingest
 * (which writes `binding_hash`) and coverage (which checks it) must derive
 * the same set, so both go through this module:
 *
 * - the contract's required proof symbols (the test's own executable code),
 * - any symbols the test declares in `proof_bindings`,
 * - every production symbol linked `covered_by` this test.
 *
 * Editing any of those symbols' source files changes the binding hash, so the
 * receipt goes stale until the test is proven again on the new code.
 */
// implements REQ-kibi-verification-evidence-contract
export function receiptCodeScopeSymbolIds(
  contract: unknown,
  bindings: unknown,
  coveredBySymbols: readonly string[],
): string[] {
  const ids = new Set<string>();
  const requiredProofs =
    contract !== null &&
    typeof contract === "object" &&
    Array.isArray((contract as { required_proofs?: unknown }).required_proofs)
      ? (contract as { required_proofs: unknown[] }).required_proofs
      : [];
  for (const entry of [
    ...requiredProofs,
    ...(Array.isArray(bindings) ? bindings : []),
  ]) {
    const symbolId =
      entry !== null && typeof entry === "object"
        ? (entry as { symbol_id?: unknown }).symbol_id
        : undefined;
    if (typeof symbolId === "string" && symbolId !== "") ids.add(symbolId);
  }
  for (const symbolId of coveredBySymbols) ids.add(symbolId);
  return [...ids].sort();
}

/** Map each test id to the symbols linked `covered_by` it, in one query. */
// implements REQ-kibi-verification-evidence-contract
export async function loadCoveredBySymbolsByTest(
  prolog: Pick<PrologPort, "query">,
): Promise<ReadonlyMap<string, readonly string[]>> {
  const result = await prolog.query(
    "findall([From,To,'covered_by'], kb_relationship(covered_by, From, To), Rels)",
  );
  if (!result.success) {
    throw new Error(
      `covered_by relationship query failed: ${result.error ?? "Unknown error"}`,
    );
  }
  const byTest = new Map<string, string[]>();
  for (const [rawFrom, rawTo] of parseTriples(result.bindings.Rels ?? "[]")) {
    const testId = normalizeEntityId(rawTo);
    const symbols = byTest.get(testId) ?? [];
    symbols.push(normalizeEntityId(rawFrom));
    byTest.set(testId, symbols);
  }
  return byTest;
}
