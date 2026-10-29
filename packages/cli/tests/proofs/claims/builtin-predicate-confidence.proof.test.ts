import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { BUILTIN_PREDICATE_CONFIDENCE } from "../../../../plugin-builtin/src/ontology/predicate-rule.js";

// implements REQ-capability-builtin-predicate-confidence

/**
 * The confidence the built-in ontology pack gives a predicate rule match. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A built-in predicate rule match shall have confidence 0.84. */
export function builtinPredicateConfidenceCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-builtin-predicate-confidence",
    variable: "rule_confidence",
    valueType: "real",
    assumptions: [{ operator: "eq", value: BUILTIN_PREDICATE_CONFIDENCE }],
    claim: { operator: "eq", value: 0.84 },
  });
}

describe("Built-in predicate rule confidence", () => {
  test("A built-in predicate rule match shall have confidence 0.84", () => {
    writeCodeCertificate(builtinPredicateConfidenceCertificate());
    expect(BUILTIN_PREDICATE_CONFIDENCE).toBe(0.84);
  });
});
