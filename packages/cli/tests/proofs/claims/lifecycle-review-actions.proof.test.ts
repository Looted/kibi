import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  AGENT_REQUIREMENTS_REVIEW_ACTION_ID,
  AGENT_REQUIREMENTS_REVIEW_CODE,
  CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID,
  CLOSE_SUPERSEDED_REQUIREMENTS_CODE,
  EXCEPTION_SELF_ATTESTED_REVIEW_CODE,
  PREDICATE_KEY_ARGUMENTS_REVIEW_CODE,
  RATIONALE_REVIEW_ACTION_ID,
  SCENARIO_FEASIBILITY_REVIEW_CODE,
} from "../../../src/public/operations/schema6-check-actions.js";

// implements REQ-kibi-lifecycle-review-actions

/**
 * The action ids and codes of the review and repair steps kb_check proposes. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The unapproved agent requirements review action id shall be review-agent-requirements-unapproved. */
export function agentReviewActionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-agent-review-action",
    symbolId: "SYM-schema6-check-actions-AGENT_REQUIREMENTS_REVIEW_ACTION_ID",
    value: AGENT_REQUIREMENTS_REVIEW_ACTION_ID,
  });
}

/** The unapproved agent requirements review code shall be review_agent_requirements_unapproved. */
export function agentReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-agent-review-code",
    symbolId: "SYM-schema6-check-actions-AGENT_REQUIREMENTS_REVIEW_CODE",
    value: AGENT_REQUIREMENTS_REVIEW_CODE,
  });
}

/** The close superseded requirements action id shall be close-superseded-requirements. */
export function closeSupersededActionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-close-superseded-action",
    symbolId:
      "SYM-schema6-check-actions-CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID",
    value: CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID,
  });
}

/** The close superseded requirements code shall be close_superseded_requirements. */
export function closeSupersededCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-close-superseded-code",
    symbolId: "SYM-schema6-check-actions-CLOSE_SUPERSEDED_REQUIREMENTS_CODE",
    value: CLOSE_SUPERSEDED_REQUIREMENTS_CODE,
  });
}

/** The self-attested exception review code shall be review_exception_approval_self_attested. */
export function selfAttestedReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-self-attested-review-code",
    symbolId: "SYM-schema6-check-actions-EXCEPTION_SELF_ATTESTED_REVIEW_CODE",
    value: EXCEPTION_SELF_ATTESTED_REVIEW_CODE,
  });
}

/** The predicate key arguments review code shall be review_predicate_key_arguments. */
export function predicateKeyReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-predicate-key-review-code",
    symbolId: "SYM-schema6-check-actions-PREDICATE_KEY_ARGUMENTS_REVIEW_CODE",
    value: PREDICATE_KEY_ARGUMENTS_REVIEW_CODE,
  });
}

/** The missing rationale review action id shall be review-requirement-rationale-missing. */
export function rationaleReviewActionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-rationale-review-action",
    symbolId: "SYM-schema6-check-actions-RATIONALE_REVIEW_ACTION_ID",
    value: RATIONALE_REVIEW_ACTION_ID,
  });
}

/** The unknown scenario feasibility review code shall be review_scenario_feasibility_unknown. */
export function feasibilityReviewCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-feasibility-review-code",
    symbolId: "SYM-schema6-check-actions-SCENARIO_FEASIBILITY_REVIEW_CODE",
    value: SCENARIO_FEASIBILITY_REVIEW_CODE,
  });
}

describe("kb_check review action ids and codes", () => {
  test("The unapproved agent requirements review action id shall be review-agent-requirements-unapproved", () => {
    writeCodeCertificate(agentReviewActionCertificate());
    expect(AGENT_REQUIREMENTS_REVIEW_ACTION_ID).toBe(
      "review-agent-requirements-unapproved",
    );
  });

  test("The unapproved agent requirements review code shall be review_agent_requirements_unapproved", () => {
    writeCodeCertificate(agentReviewCodeCertificate());
    expect(AGENT_REQUIREMENTS_REVIEW_CODE).toBe(
      "review_agent_requirements_unapproved",
    );
  });

  test("The close superseded requirements action id shall be close-superseded-requirements", () => {
    writeCodeCertificate(closeSupersededActionCertificate());
    expect(CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID).toBe(
      "close-superseded-requirements",
    );
  });

  test("The close superseded requirements code shall be close_superseded_requirements", () => {
    writeCodeCertificate(closeSupersededCodeCertificate());
    expect(CLOSE_SUPERSEDED_REQUIREMENTS_CODE).toBe(
      "close_superseded_requirements",
    );
  });

  test("The self-attested exception review code shall be review_exception_approval_self_attested", () => {
    writeCodeCertificate(selfAttestedReviewCodeCertificate());
    expect(EXCEPTION_SELF_ATTESTED_REVIEW_CODE).toBe(
      "review_exception_approval_self_attested",
    );
  });

  test("The predicate key arguments review code shall be review_predicate_key_arguments", () => {
    writeCodeCertificate(predicateKeyReviewCodeCertificate());
    expect(PREDICATE_KEY_ARGUMENTS_REVIEW_CODE).toBe(
      "review_predicate_key_arguments",
    );
  });

  test("The missing rationale review action id shall be review-requirement-rationale-missing", () => {
    writeCodeCertificate(rationaleReviewActionCertificate());
    expect(RATIONALE_REVIEW_ACTION_ID).toBe(
      "review-requirement-rationale-missing",
    );
  });

  test("The unknown scenario feasibility review code shall be review_scenario_feasibility_unknown", () => {
    writeCodeCertificate(feasibilityReviewCodeCertificate());
    expect(SCENARIO_FEASIBILITY_REVIEW_CODE).toBe(
      "review_scenario_feasibility_unknown",
    );
  });
});
