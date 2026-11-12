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
import type { StatusPayload } from "../../public/operations/discovery-executors.js";
import { readAuthoredEntity } from "../../public/operations/entity-context.js";
import type { BodyContextTarget } from "./entity-body-context.js";
import {
  listLaneMarkdownSources,
  sliceFrontmatter,
  writeFileAtomically,
} from "./kb-sources.js";

/** Schema 12: pin proves on a certificate contract with one provable claim. */
export const PROOF_CONTRACT_CLAIMS_PIN_CODE = "proof_contract_claims_pin";

/** Schema 12: certificate contracts a person must bind to their claims. */
export const PROOF_CONTRACT_CLAIMS_REVIEW_CODE = "proof_contract_claims_review";

/**
 * A modeled claim a certificate contract's test reaches, with the binding a
 * certificate of its kind would get: derived when the claim's fact derives
 * an obligation for the kind, attested when the fact has no derivation,
 * incompatible (with the reason) when the kind cannot express it.
 */
export type ClaimCandidate = Readonly<{
  claim_key: string;
  requirement_id: string;
  fact_id: string;
  binding: "derived" | "attested" | "incompatible";
  reason?: string;
}>;

/**
 * A certificate-kind contract without proves, with every modeled claim of
 * the requirements its test reaches through its scenarios.
 */
export type ClaimCandidateRow = Readonly<{
  test_id: string;
  kind: string;
  candidates: readonly ClaimCandidate[];
}>;

export type ProofContractClaimsReview = Readonly<{
  id: string;
  path: string;
  kind: string;
  candidates: readonly ClaimCandidate[];
}>;

export type ProofContractClaimsPlan = Readonly<{
  targets: readonly BodyContextTarget[];
  /** Contracts left without proves: no derived claim, or several. */
  review: readonly ProofContractClaimsReview[];
  skipped: readonly Readonly<{ id: string; path: string; reason: string }>[];
}>;

function describeCandidate(candidate: ClaimCandidate): string {
  const where = `${candidate.claim_key} (${candidate.requirement_id}, ${candidate.fact_id})`;
  if (candidate.binding === "derived") return `${where}: provable`;
  if (candidate.binding === "attested")
    return `${where}: attested only, the fact has no derivation`;
  return `${where}: ${candidate.reason ?? "its kind cannot express the fact"}`;
}

/**
 * What a person reviewing a contract without proves has to do, naming every
 * claim its test reaches and how a certificate of its kind would bind it.
 */
export function claimReviewInstruction(row: ProofContractClaimsReview): string {
  const factKind =
    row.kind === "exhaustive" || row.kind === "typecheck"
      ? "set"
      : row.kind === "regex"
        ? "string"
        : row.kind === "rule" || row.kind === "state_machine"
          ? "rule, predicate or set"
          : "numeric";
  if (row.candidates.length === 0)
    return `${row.id} (${row.path}) has a ${row.kind} proof contract, but its test reaches no modeled claim through a scenario. Link the test to the scenario of the requirement it proves, then add proof_contract.proves with the claim keys its certificate establishes and run kibi prove --test ${row.id}.`;
  const derived = row.candidates.filter((c) => c.binding === "derived");
  const advice =
    derived.length > 1
      ? "Add proof_contract.proves with the claim keys its certificate establishes"
      : `None is provable by a ${row.kind} certificate as modeled: add proof_contract.proves with the claim it establishes (it then counts as attested, not proved), or model that claim's grounding fact as a ${factKind} fact first`;
  return `${row.id} (${row.path}) has a ${row.kind} proof contract without proves. Claims its test reaches: ${row.candidates.map(describeCandidate).join("; ")}. ${advice}, then run kibi prove --test ${row.id}.`;
}

/**
 * Add proves to a test's proof_contract block, leaving every other byte of
 * the document unchanged: the list goes after the block's last line, at the
 * indentation of its other keys. Returns null when the contract is not a
 * block mapping, already names proves, or the edit would not read back as
 * exactly that change.
 */
export function withProofContractProves(
  content: string,
  keys: readonly string[],
): string | null {
  const slice = sliceFrontmatter(content);
  if (slice === null) return null;
  // Every line ends with its line break.
  const lines = slice.text.split(/(?<=\n)/);
  const start = lines.findIndex((line) =>
    /^proof_contract:[ \t]*\r?\n/.test(line),
  );
  // No early refusals below: without a contract line (start -1), with an
  // empty block (indent null) or with no keys (`proves:` reads back as null),
  // the edited text never reads back as the expected change.
  let end = start + 1;
  let indent: string | null = null;
  for (const line of lines.slice(start + 1)) {
    const leading = /^([ \t]+)\S/.exec(line);
    if (leading === null) break;
    indent ??= leading[1] as string;
    end += 1;
  }
  const inserted = [
    `${indent}proves:${slice.eol}`,
    ...keys.map((key) => `${indent}${indent}- ${key}${slice.eol}`),
  ];
  const text = [...lines.slice(0, end), ...inserted, ...lines.slice(end)].join(
    "",
  );
  try {
    // A top-level `proof_contract:` line makes the block a mapping; text that
    // is not one fails to parse.
    const before = loadYaml(slice.text) as Record<string, unknown>;
    const next = loadYaml(text);
    // A contract without keys reads as null and throws here.
    const contract = before.proof_contract as Record<string, unknown>;
    if (contract.proves !== undefined) return null;
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
export function planProofContractClaimPins(
  workspaceRoot: string,
  rows: readonly ClaimCandidateRow[] | null,
): ProofContractClaimsPlan {
  const byTest = new Map((rows ?? []).map((row) => [row.test_id, row]));
  const targets: BodyContextTarget[] = [];
  const review: ProofContractClaimsReview[] = [];
  const skipped: { id: string; path: string; reason: string }[] = [];
  for (const { content, relativePath } of listLaneMarkdownSources(
    workspaceRoot,
    ["tests"],
  )) {
    const entity = readAuthoredEntity(content, relativePath);
    const row = byTest.get(entity?.id as string);
    if (row === undefined) continue;
    const id = row.test_id;
    const keys = [
      ...new Set(
        row.candidates
          .filter((c) => c.binding === "derived")
          .map((c) => c.claim_key),
      ),
    ];
    if (keys.length !== 1) {
      review.push({
        id,
        path: relativePath,
        kind: row.kind,
        candidates: row.candidates,
      });
      continue;
    }
    const after = withProofContractProves(content, keys);
    if (after === null) {
      skipped.push({
        id,
        path: relativePath,
        reason:
          "its proof_contract is not a block mapping Kibi can extend in place",
      });
      continue;
    }
    targets.push({
      id,
      type: "test",
      path: relativePath,
      before: content,
      after,
    });
  }
  return { targets, review, skipped };
}

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
    // A missing payload or field throws, and the catch returns null for it.
    const { branchStore, snapshotId, branchAttachment } = (
      await executeOperation(runtime, statusSpec, {})
    ).structuredContent as Required<StatusPayload>;
    if (
      branchStore.state !== "healthy" ||
      snapshotId === "missing" ||
      branchAttachment.kind !== "exact"
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
