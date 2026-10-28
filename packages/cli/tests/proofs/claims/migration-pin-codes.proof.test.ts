import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  CONTEXT_MISSING_TAG_CODE,
  SEMANTIC_TEXT_PIN_CODE,
} from "../../../src/operations/migration/entity-body-context.js";
import { EVIDENCE_FLOOR_PIN_CODE } from "../../../src/operations/migration/evidence-floor.js";
import { FIRM_SUPERSEDE_ACKNOWLEDGE_CODE } from "../../../src/operations/migration/firm-supersede.js";
import {
  PROOF_CONTRACT_CLAIMS_PIN_CODE,
  PROOF_CONTRACT_CLAIMS_REVIEW_CODE,
} from "../../../src/operations/migration/proof-contract-claims.js";
import { SEMANTIC_INVENTORY_REDERIVE_DROP_GROUNDING_CODE } from "../../../src/operations/migration/schema6.js";
import { SUPERSEDES_REASON_ACKNOWLEDGE_CODE } from "../../../src/operations/migration/supersedes-reason.js";
import {
  SYMBOL_LEGACY_LINK_MARK_ACTION_ID,
  SYMBOL_LEGACY_LINK_MARK_CODE,
} from "../../../src/operations/migration/symbol-legacy-links.js";
import { CLOSED_REQUIREMENT_STATUS } from "../../../src/operations/migration/superseded-closure.js";
import { DERIVED_COORDINATES_SCHEMA_VERSION } from "../../../src/operations/migration/untrack-symbol-coordinates.js";

// implements REQ-cli-migration-pin-codes

/**
 * The codes kibi migrate reports for the steps that pin, acknowledge or mark existing entities. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The missing context tag code shall be context_missing_tag. */
export function contextMissingTagCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-context-missing-tag-code",
    symbolId: "SYM-const-context-missing-tag-code",
    value: CONTEXT_MISSING_TAG_CODE,
  });
}

/** The semantic text pin code shall be semantic_text_pin. */
export function semanticTextPinCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-semantic-text-pin-code",
    symbolId: "SYM-const-semantic-text-pin-code",
    value: SEMANTIC_TEXT_PIN_CODE,
  });
}

/** The evidence floor pin code shall be evidence_floor_pin. */
export function evidenceFloorPinCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-evidence-floor-pin-code",
    symbolId: "SYM-const-evidence-floor-pin-code",
    value: EVIDENCE_FLOOR_PIN_CODE,
  });
}

/** The firm supersede acknowledgement code shall be firm_supersede_acknowledge. */
export function firmSupersedeCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-firm-supersede-code",
    symbolId: "SYM-const-firm-supersede-acknowledge-code",
    value: FIRM_SUPERSEDE_ACKNOWLEDGE_CODE,
  });
}

/** The proof contract claims pin code shall be proof_contract_claims_pin. */
export function contractClaimsPinCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-contract-claims-pin-code",
    symbolId: "SYM-const-proof-contract-claims-pin-code",
    value: PROOF_CONTRACT_CLAIMS_PIN_CODE,
  });
}

/** The proof contract claims review code shall be proof_contract_claims_review. */
export function contractClaimsReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-contract-claims-review-code",
    symbolId: "SYM-const-proof-contract-claims-review-code",
    value: PROOF_CONTRACT_CLAIMS_REVIEW_CODE,
  });
}

/** The rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding. */
export function rederiveDropGroundingCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-rederive-drop-grounding-code",
    symbolId: "SYM-schema6-SEMANTIC_INVENTORY_REDERIVE_DROP_GROUNDING_CODE",
    value: SEMANTIC_INVENTORY_REDERIVE_DROP_GROUNDING_CODE,
  });
}

/** The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge. */
export function supersedesAcknowledgeCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-supersedes-acknowledge-code",
    symbolId: "SYM-const-supersedes-reason-acknowledge-code",
    value: SUPERSEDES_REASON_ACKNOWLEDGE_CODE,
  });
}

/** The legacy symbol link mark action id shall be symbol-legacy-link-mark. */
export function legacyLinkMarkActionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-legacy-link-mark-action",
    symbolId: "SYM-const-symbol-legacy-link-mark-action-id",
    value: SYMBOL_LEGACY_LINK_MARK_ACTION_ID,
  });
}

/** The legacy symbol link mark code shall be symbol_legacy_link_mark. */
export function legacyLinkMarkCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-legacy-link-mark-code",
    symbolId: "SYM-const-symbol-legacy-link-mark-code",
    value: SYMBOL_LEGACY_LINK_MARK_CODE,
  });
}

/** A superseded requirement shall close with status closed. */
export function closedRequirementStatusCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-closed-requirement-status",
    symbolId: "SYM-const-closed-requirement-status",
    value: CLOSED_REQUIREMENT_STATUS,
  });
}

/** Derived symbol coordinates shall start at KB schema version 13. */
export function derivedCoordinatesSchemaCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-derived-coordinates-schema",
    variable: "derived_coordinates_schema",
    valueType: "int",
    assumptions: [
      { operator: "eq", value: DERIVED_COORDINATES_SCHEMA_VERSION },
    ],
    claim: { operator: "eq", value: 13 },
  });
}

describe("Migration pin and acknowledgement codes", () => {
  test("The missing context tag code shall be context_missing_tag", () => {
    writeCodeCertificate(contextMissingTagCodeCertificate());
    expect(CONTEXT_MISSING_TAG_CODE).toBe("context_missing_tag");
  });

  test("The semantic text pin code shall be semantic_text_pin", () => {
    writeCodeCertificate(semanticTextPinCodeCertificate());
    expect(SEMANTIC_TEXT_PIN_CODE).toBe("semantic_text_pin");
  });

  test("The evidence floor pin code shall be evidence_floor_pin", () => {
    writeCodeCertificate(evidenceFloorPinCodeCertificate());
    expect(EVIDENCE_FLOOR_PIN_CODE).toBe("evidence_floor_pin");
  });

  test("The firm supersede acknowledgement code shall be firm_supersede_acknowledge", () => {
    writeCodeCertificate(firmSupersedeCodeCertificate());
    expect(FIRM_SUPERSEDE_ACKNOWLEDGE_CODE).toBe("firm_supersede_acknowledge");
  });

  test("The proof contract claims pin code shall be proof_contract_claims_pin", () => {
    writeCodeCertificate(contractClaimsPinCodeCertificate());
    expect(PROOF_CONTRACT_CLAIMS_PIN_CODE).toBe("proof_contract_claims_pin");
  });

  test("The proof contract claims review code shall be proof_contract_claims_review", () => {
    writeCodeCertificate(contractClaimsReviewCodeCertificate());
    expect(PROOF_CONTRACT_CLAIMS_REVIEW_CODE).toBe(
      "proof_contract_claims_review",
    );
  });

  test("The rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding", () => {
    writeCodeCertificate(rederiveDropGroundingCodeCertificate());
    expect(SEMANTIC_INVENTORY_REDERIVE_DROP_GROUNDING_CODE).toBe(
      "semantic_inventory_rederive_drop_grounding",
    );
  });

  test("The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge", () => {
    writeCodeCertificate(supersedesAcknowledgeCodeCertificate());
    expect(SUPERSEDES_REASON_ACKNOWLEDGE_CODE).toBe(
      "supersedes_reason_acknowledge",
    );
  });

  test("The legacy symbol link mark action id shall be symbol-legacy-link-mark", () => {
    writeCodeCertificate(legacyLinkMarkActionCertificate());
    expect(SYMBOL_LEGACY_LINK_MARK_ACTION_ID).toBe("symbol-legacy-link-mark");
  });

  test("The legacy symbol link mark code shall be symbol_legacy_link_mark", () => {
    writeCodeCertificate(legacyLinkMarkCodeCertificate());
    expect(SYMBOL_LEGACY_LINK_MARK_CODE).toBe("symbol_legacy_link_mark");
  });

  test("A superseded requirement shall close with status closed", () => {
    writeCodeCertificate(closedRequirementStatusCertificate());
    expect(CLOSED_REQUIREMENT_STATUS).toBe("closed");
  });

  test("Derived symbol coordinates shall start at KB schema version 13", () => {
    writeCodeCertificate(derivedCoordinatesSchemaCertificate());
    expect(DERIVED_COORDINATES_SCHEMA_VERSION).toBe(13);
  });
});
