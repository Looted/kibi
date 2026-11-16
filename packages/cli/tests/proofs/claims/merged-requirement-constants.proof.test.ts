import { describe, expect, test } from "bun:test";
import { CONTRACT_FIELDS } from "../../../src/operations/mutation/requirement-semantics.js";
import { STAGED_PASSING_REVIEW_STATES } from "../../../src/public/impact/firm-edit-gate.js";
import { ADVERTISED_DESCRIPTION_LIMIT } from "../../../src/public/operations/advertised-schema.js";
import { SCOPED_CHECK_BUDGET_CHARS } from "../../../src/public/operations/check-format-shared.js";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

/**
 * Constants and vocabularies behind the scoped check, the advertised MCP
 * schemas, kb_upsert ledger derivation, the symbol role exemption and the firm
 * edit gate. Kibi reads every constant and source itself at ingest, so each
 * certificate is checked against the code.
 */

/** The scoped kb_check output budget shall be 24,000 characters. */
export function scopedCheckBudgetCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-scoped-check-budget",
    variable: "scoped_check_budget_chars",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SCOPED_CHECK_BUDGET_CHARS }],
    claim: { operator: "eq", value: 24000 },
  });
}

/** The advertised field description limit shall be 120 characters. */
export function advertisedDescriptionLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-advertised-description-limit",
    variable: "advertised_description_limit",
    valueType: "int",
    assumptions: [{ operator: "eq", value: ADVERTISED_DESCRIPTION_LIMIT }],
    claim: { operator: "eq", value: 120 },
  });
}

/** The ledger fields whose presence makes a kb_upsert be checked as sent. */
export async function checkedAsSentFieldsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-checked-as-sent-ledger-fields",
    domain: {
      symbolId: "SYM-const-ledger-contract-fields",
      members: [...CONTRACT_FIELDS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The review states that let a staged change of firm code through. */
export async function stagedPassingReviewStatesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-staged-passing-review-states",
    domain: {
      symbolId: "SYM-const-staged-passing-review-states",
      members: [...STAGED_PASSING_REVIEW_STATES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The non-behavioral symbol roles, read from the classification registry. */
export function nonBehavioralRolesCertificate(): CodeCertificate {
  return sourceCertificate({
    testId: "TEST-proof-non-behavioral-symbol-roles",
  });
}

/** The extracted kinds that always need an implements link, read from Prolog. */
export function behavioralKindsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-behavioral-symbol-kinds" });
}

describe("Constants behind requirements merged since 2026.11.4", () => {
  test("The scoped kb_check output budget shall be 24,000 characters", () => {
    writeCodeCertificate(scopedCheckBudgetCertificate());
    expect(SCOPED_CHECK_BUDGET_CHARS).toBe(24000);
  });

  test("The advertised field description limit shall be 120 characters", () => {
    writeCodeCertificate(advertisedDescriptionLimitCertificate());
    expect(ADVERTISED_DESCRIPTION_LIMIT).toBe(120);
  });

  test("The ledger fields that make a kb_upsert be checked as sent", async () => {
    writeCodeCertificate(await checkedAsSentFieldsCertificate());
    expect([...CONTRACT_FIELDS].sort()).toEqual([
      "logic_claims",
      "semantic_inventory_version",
      "semantic_source_field",
      "semantic_source_hash",
    ]);
  });

  test("Only kept lets a staged change of firm code through", async () => {
    writeCodeCertificate(await stagedPassingReviewStatesCertificate());
    expect([...STAGED_PASSING_REVIEW_STATES]).toEqual(["kept"]);
  });

  test("The non-behavioral symbol roles", () => {
    writeCodeCertificate(nonBehavioralRolesCertificate());
  });

  test("The kinds that always need an implements link", () => {
    writeCodeCertificate(behavioralKindsCertificate());
  });
});
