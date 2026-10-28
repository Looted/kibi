import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { AGENT_REQUIREMENT_REVIEW_LIMIT } from "../../../src/public/operations/origin-review.js";

// implements REQ-kibi-agent-requirement-review-limit

/**
 * How many agent-authored requirements kb_check lists before summarising the rest.
 * Kibi reads AGENT_REQUIREMENT_REVIEW_LIMIT itself at ingest, so the certificate is
 * checked against the code.
 */

/** The agent requirement review queue shall list at most 25 requirements. */
export function agentRequirementReviewLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-agent-requirement-review-limit",
    variable: "agent_requirement_review_limit",
    valueType: "int",
    assumptions: [{ operator: "eq", value: AGENT_REQUIREMENT_REVIEW_LIMIT }],
    claim: { operator: "eq", value: 25 },
  });
}

describe("The agent requirement review queue lists at most 25 requirements", () => {
  test("The agent requirement review queue shall list at most 25 requirements", () => {
    writeCodeCertificate(agentRequirementReviewLimitCertificate());
    expect(AGENT_REQUIREMENT_REVIEW_LIMIT).toBe(25);
  });
});
