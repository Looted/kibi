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

import { readKbManifest } from "../../utils/kb-manifest.js";
import type { Violation } from "../../utils/rule-registry.js";
import { runOperationJsonQuery } from "./prolog-json.js";
import type { OperationContext } from "./runtime-types.js";

/**
 * The schema version from which every certificate-kind proof contract must
 * name the claims it proves; older KBs get the rule with their schema
 * upgrade, whose migration pins proves where the claim is unambiguous.
 */
// implements REQ-kibi-claim-bound-proofs
export const CLAIM_BINDING_SCHEMA_VERSION = 12;

/** A certificate-kind proof contract must name provable claims in proves. */
// implements REQ-kibi-claim-bound-proofs
export const PROOF_CONTRACT_CLAIMS_RULE = "proof-contract-claims";

// implements REQ-kibi-claim-bound-proofs
export type ProofContractClaimIssue = Readonly<{
  test_id: string;
  claim_key?: string;
  reason: string;
}>;

/**
 * Every certificate-kind proof contract that names no claims, and every
 * named claim no certificate of its kind could prove. Ignores the schema
 * version, so a migration can read what the rule will report.
 */
// implements REQ-kibi-claim-bound-proofs
export async function readProofContractClaimIssues(
  context: OperationContext,
): Promise<readonly ProofContractClaimIssue[]> {
  const prolog = context.prolog ?? (await context.ensureProlog?.());
  if (prolog === undefined) return [];
  return runOperationJsonQuery<ProofContractClaimIssue[]>(
    prolog,
    "claim_obligations.pl",
    "claim_obligations:proof_contract_claim_issues_json(JsonString)",
    "Proof contract claims",
  );
}

/** One finding per contract without proves and per unprovable claim key. */
// implements REQ-kibi-claim-bound-proofs
export function proofContractClaimViolations(
  issues: readonly ProofContractClaimIssue[],
): Violation[] {
  return issues.map((issue) => ({
    rule: PROOF_CONTRACT_CLAIMS_RULE,
    entityId: issue.test_id,
    description:
      issue.claim_key === undefined
        ? `${issue.test_id}: ${issue.reason}`
        : `${issue.test_id} proves ${issue.claim_key}: ${issue.reason}`,
    suggestion:
      issue.claim_key === undefined
        ? `Add proof_contract.proves to ${issue.test_id} with the claim keys (CLAIM-...) of the requirement its certificate establishes; kibi proof explain on the requirement lists its claims.`
        : `Name a modeled claim of a requirement ${issue.test_id} reaches through its scenarios, grounded by a fact this proof kind can express (a set fact for exhaustive or typecheck, a numeric fact for arithmetic or smt), or remove ${issue.claim_key} from proves.`,
    evidence: {
      testId: issue.test_id,
      ...(issue.claim_key === undefined ? {} : { claimKey: issue.claim_key }),
      reason: issue.reason,
    },
  }));
}

/** Evaluate the proof-contract-claims rule from schema 12. */
// implements REQ-kibi-claim-bound-proofs
export async function collectProofContractClaimViolations(
  context: OperationContext,
  rules: ReadonlySet<string>,
): Promise<Violation[]> {
  if (!rules.has(PROOF_CONTRACT_CLAIMS_RULE) || context.prolog === undefined)
    return [];
  const schemaVersion = readKbManifest(context.workspaceRoot)?.schemaVersion;
  if (
    schemaVersion === undefined ||
    schemaVersion < CLAIM_BINDING_SCHEMA_VERSION
  )
    return [];
  return proofContractClaimViolations(
    await readProofContractClaimIssues(context),
  );
}
