/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

import { join } from "node:path";
import { resolveBoundSymbolScope } from "../../extractors/manifest.js";
import { normalizeEntityId, parseTriples } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import { receiptBindingHash } from "../../public/proof-fingerprint.js";
import type { ProofContract } from "../../public/proof-protocol.js";
import { normalizeRepoRelativePath } from "../../utils/repo-relative-path.js";
import { resolveContainedSourcePath } from "../mutation/source-authoring.js";
import { removeFrontmatterBlock } from "./receipt-document.js";

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

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * The proof-contract projection a receipt binding hashes. Ingest validates a
 * contract and then hashes exactly this projection; coverage must hash the
 * same projection, never the raw stored value, or a cosmetic extra key would
 * make every receipt of that test silently fall back to snapshot matching.
 */
// implements REQ-kibi-fresh-verification-receipts-v2
export function receiptBindingContract(raw: unknown): ProofContract | null {
  const contract = record(raw);
  if (!contract) return null;
  const requiredProofs = Array.isArray(contract.required_proofs)
    ? contract.required_proofs
    : [];
  return {
    version: contract.version as ProofContract["version"],
    integration: String(contract.integration ?? ""),
    required_proofs: requiredProofs.map((entry) => {
      const row = record(entry);
      return {
        symbol_id: String(row?.symbol_id ?? ""),
        target: String(row?.target ?? ""),
      };
    }) as unknown as ProofContract["required_proofs"],
    success_policy: contract.success_policy as ProofContract["success_policy"],
  };
}

// implements REQ-kibi-fresh-verification-receipts-v2
export type ReceiptBindingInput = Readonly<{
  workspaceRoot: string;
  readFile: (absolutePath: string) => Promise<string>;
  /** The test entity: source, proof_contract and proof_bindings are read. */
  test: Readonly<Record<string, unknown>>;
  coveredBySymbols: readonly string[];
}>;

/**
 * The current per-contract binding hash of one proof-bearing test, or
 * undefined when the test has no markdown source the binding can hash.
 *
 * Ingest writes this value into `binding_hash` and coverage compares against
 * it, so both call this one function. Every input is repository-relative and
 * content-addressed: the test document is located by its normalized
 * repo-relative `source`, the code scope by normalized manifest paths, and
 * only file contents (never absolute locations) enter the hash. Receipts
 * written on a CI runner and on a developer checkout of the same commit
 * therefore carry the same binding.
 */
// implements REQ-kibi-fresh-verification-receipts-v2
export async function currentReceiptBindingHash(
  input: ReceiptBindingInput,
): Promise<string | undefined> {
  const contract = receiptBindingContract(input.test.proof_contract);
  if (!contract) return undefined;
  const source = typeof input.test.source === "string" ? input.test.source : "";
  if (!/\.(md|mdx)$/i.test(source.trim())) return undefined;
  const relative = normalizeRepoRelativePath(input.workspaceRoot, source);
  if (relative === null) return undefined;
  try {
    const absolute = resolveContainedSourcePath(input.workspaceRoot, relative);
    const authored = await input.readFile(absolute);
    const stripped = removeFrontmatterBlock(authored, "proof_receipts");
    const codeScope = resolveBoundSymbolScope(
      join(input.workspaceRoot, ".kb", "symbols.yaml"),
      receiptCodeScopeSymbolIds(
        contract,
        input.test.proof_bindings,
        input.coveredBySymbols,
      ),
    );
    return receiptBindingHash(contract, stripped ?? authored, codeScope);
  } catch {
    return undefined;
  }
}
