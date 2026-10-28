import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { EXTERNAL_VOCABULARY_ALIGNMENT_OPERATIONS } from "../../../src/plugins/external-allowlist.js";
import { BUILTIN_CLAIM_SIMILARITY_THRESHOLD } from "kibi-plugin-builtin";

// implements REQ-kibi-vocabulary-alignment-settings

/**
 * The claim similarity threshold and operation scope of vocabulary alignment.
 * Kibi reads each constant itself at ingest, so the certificate is checked against the code.
 */

/** The built-in claim similarity threshold shall be 0.75. */
export function builtinClaimSimilarityThresholdCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-builtin-claim-similarity-threshold",
    variable: "claim_similarity_threshold",
    valueType: "real",
    assumptions: [
      { operator: "eq", value: BUILTIN_CLAIM_SIMILARITY_THRESHOLD },
    ],
    claim: { operator: "eq", value: 0.75 },
  });
}

/** An external vocabulary alignment provider shall run only for kb_model_requirement. */
export async function externalVocabularyAlignmentOperationsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-external-vocabulary-alignment-operations",
    domain: {
      symbolId: "SYM-const-external-vocabulary-alignment-operations",
      members: [...EXTERNAL_VOCABULARY_ALIGNMENT_OPERATIONS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Vocabulary alignment threshold and scope", () => {
  test("The built-in claim similarity threshold shall be 0.75", () => {
    writeCodeCertificate(builtinClaimSimilarityThresholdCertificate());
    expect(BUILTIN_CLAIM_SIMILARITY_THRESHOLD).toBe(0.75);
  });

  test("An external vocabulary alignment provider shall run only for kb_model_requirement", async () => {
    writeCodeCertificate(
      await externalVocabularyAlignmentOperationsCertificate(),
    );
    expect([...EXTERNAL_VOCABULARY_ALIGNMENT_OPERATIONS].sort()).toEqual([
      "kb_model_requirement",
    ]);
  });
});
