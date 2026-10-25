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

import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { load as loadYaml } from "js-yaml";
import { readAuthoredEntity } from "../../public/operations/entity-context.js";
import type { BodyContextTarget } from "./entity-body-context.js";
import {
  listLaneMarkdownFiles,
  readText,
  sliceFrontmatter,
  writeFileAtomically,
} from "./kb-sources.js";

/** Schema 12: pin proves on a certificate contract with one provable claim. */
// implements REQ-kibi-claim-bound-proofs, REQ-cli-schema-migration
export const PROOF_CONTRACT_CLAIMS_PIN_CODE = "proof_contract_claims_pin";

/** Schema 12: certificate contracts a person must bind to their claims. */
// implements REQ-kibi-claim-bound-proofs, REQ-cli-schema-migration
export const PROOF_CONTRACT_CLAIMS_REVIEW_CODE = "proof_contract_claims_review";

/** A claim a certificate contract could prove: its fact derives an obligation. */
export type ClaimCandidate = Readonly<{
  claim_key: string;
  requirement_id: string;
  fact_id: string;
}>;

/**
 * A certificate-kind contract without proves, with the claims of the
 * requirements its test reaches that its kind can derive an obligation for.
 */
export type ClaimCandidateRow = Readonly<{
  test_id: string;
  kind: string;
  candidates: readonly ClaimCandidate[];
}>;

export type ProofContractClaimsPlan = Readonly<{
  targets: readonly BodyContextTarget[];
  /** Contracts left without proves: none or several candidates. */
  review: readonly Readonly<{
    id: string;
    path: string;
    kind: string;
    candidates: readonly string[];
  }>[];
  skipped: readonly Readonly<{ id: string; path: string; reason: string }>[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Add proves to a test's proof_contract block, leaving every other byte of
 * the document unchanged: the list goes after the block's last line, at the
 * indentation of its other keys. Returns null when the contract is not a
 * block mapping, already names proves, or the edit would not read back as
 * exactly that change.
 */
// implements REQ-kibi-claim-bound-proofs, REQ-cli-schema-migration
export function withProofContractProves(
  content: string,
  keys: readonly string[],
): string | null {
  const slice = sliceFrontmatter(content);
  if (slice === null || keys.length === 0) return null;
  const lines = slice.text.split(/(?<=\n)/);
  const start = lines.findIndex((line) =>
    /^proof_contract:[ \t]*\r?\n$/.test(line),
  );
  if (start < 0) return null;
  let end = start + 1;
  let indent: string | null = null;
  while (end < lines.length) {
    const line = lines[end] ?? "";
    const leading = /^([ \t]+)\S/.exec(line);
    if (leading === null) break;
    if (indent === null) indent = leading[1] ?? "";
    end += 1;
  }
  if (indent === null) return null;
  const inserted = [
    `${indent}proves:${slice.eol}`,
    ...keys.map((key) => `${indent}${indent}- ${key}${slice.eol}`),
  ];
  const text = [...lines.slice(0, end), ...inserted, ...lines.slice(end)].join(
    "",
  );
  try {
    const before = loadYaml(slice.text);
    const next = loadYaml(text);
    if (!isRecord(before) || !isRecord(next)) return null;
    const contract = before.proof_contract;
    if (!isRecord(contract) || contract.proves !== undefined) return null;
    const expected = {
      ...before,
      proof_contract: { ...contract, proves: [...keys] },
    };
    if (!isDeepStrictEqual(next, expected)) return null;
  } catch {
    return null;
  }
  return `${slice.prefix}${text}${slice.suffix}`;
}

/**
 * Certificate-kind contracts without proves, judged on the synced store: a
 * contract whose test reaches exactly one claim its kind can derive an
 * obligation for gets that claim pinned in proves; any other is left for a
 * person to bind (review). Read-only.
 */
// implements REQ-kibi-claim-bound-proofs, REQ-cli-schema-migration
export function planProofContractClaimPins(
  workspaceRoot: string,
  rows: readonly ClaimCandidateRow[] | null,
): ProofContractClaimsPlan {
  const byTest = new Map((rows ?? []).map((row) => [row.test_id, row]));
  const targets: BodyContextTarget[] = [];
  const review: {
    id: string;
    path: string;
    kind: string;
    candidates: string[];
  }[] = [];
  const skipped: { id: string; path: string; reason: string }[] = [];
  if (byTest.size === 0) return { targets, review, skipped };
  for (const file of listLaneMarkdownFiles(workspaceRoot, ["tests"])) {
    const content = readText(file.absolutePath);
    if (content === null) continue;
    const entity = readAuthoredEntity(content, file.relativePath);
    const row = entity === null ? undefined : byTest.get(entity.id);
    if (entity === null || row === undefined) continue;
    const keys = [...new Set(row.candidates.map((c) => c.claim_key))].sort();
    if (keys.length !== 1) {
      review.push({
        id: entity.id,
        path: file.relativePath,
        kind: row.kind,
        candidates: keys,
      });
      continue;
    }
    const after = withProofContractProves(content, keys);
    if (after === null) {
      skipped.push({
        id: entity.id,
        path: file.relativePath,
        reason:
          "its proof_contract is not a block mapping Kibi can extend in place",
      });
      continue;
    }
    targets.push({
      id: entity.id,
      type: "test",
      path: file.relativePath,
      before: content,
      after,
    });
  }
  return { targets, review, skipped };
}

// implements REQ-kibi-claim-bound-proofs, REQ-cli-schema-migration
export function applyProofContractClaimPins(
  workspaceRoot: string,
  rows: readonly ClaimCandidateRow[] | null,
): ProofContractClaimsPlan {
  const plan = planProofContractClaimPins(workspaceRoot, rows);
  for (const target of plan.targets)
    writeFileAtomically(path.join(workspaceRoot, target.path), target.after);
  return plan;
}

/**
 * The claim candidates of every certificate contract without proves, read
 * from the branch's compiled store. Returns null when no healthy, synced
 * store is attached or the evaluation fails; the migration then pins
 * nothing, and proof-contract-claims lists the contracts.
 */
// implements REQ-kibi-claim-bound-proofs, REQ-cli-schema-migration
export async function readProofContractClaimCandidates(
  workspaceRoot: string,
): Promise<readonly ClaimCandidateRow[] | null> {
  try {
    const [
      { createCliRuntime },
      { executeOperation },
      { statusSpec },
      { runOperationJsonQuery },
    ] = await Promise.all([
      import("../../runtime/cli-runtime.js"),
      import("../../public/operations/runtime-types.js"),
      import("../../public/operations/specs/discovery.js"),
      import("../../public/operations/prolog-json.js"),
    ]);
    const runtime = createCliRuntime({ workspaceRoot });
    const status = (await executeOperation(runtime, statusSpec, {}))
      .structuredContent;
    if (
      status?.branchStore?.state !== "healthy" ||
      status?.snapshotId === "missing" ||
      status?.branchAttachment?.kind !== "exact"
    )
      return null;
    const rows: unknown = await executeOperation(
      runtime,
      {
        name: "kb_migrate_proof_contract_claims_preview",
        effects: ["kb-read"],
        requiresProlog: true,
        execute: async (_input: unknown, context) => {
          const prolog = context.prolog ?? (await context.ensureProlog?.());
          if (prolog === undefined) return [];
          return runOperationJsonQuery<ClaimCandidateRow[]>(
            prolog,
            "claim_obligations.pl",
            "claim_obligations:proof_contract_claim_candidates_json(JsonString)",
            "Proof contract claim candidates",
          );
        },
      },
      {},
    );
    return Array.isArray(rows) ? (rows as ClaimCandidateRow[]) : null;
  } catch {
    return null;
  }
}
