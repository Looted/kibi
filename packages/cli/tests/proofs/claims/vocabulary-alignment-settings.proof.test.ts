import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { EXTERNAL_VOCABULARY_ALIGNMENT_OPERATIONS } from "../../../src/plugins/external-allowlist.js";
import {
  BUILTIN_CLAIM_SIMILARITY_THRESHOLD,
  BUILTIN_SUBJECT_REUSE_THRESHOLD,
} from "kibi-plugin-builtin";
import { JEV_SUBJECT_TOP_K } from "kibi-plugin-jev";
import { NEW_SUBJECT_CHOICE } from "kibi-plugin-sdk";

// implements REQ-kibi-vocabulary-alignment-settings

/**
 * The thresholds, candidate count, choice name and operation scope of vocabulary
 * alignment. Kibi reads each constant itself at ingest, so the certificate is checked against the code.
 */

/** The built-in subject reuse threshold shall be 0.4. */
export function builtinSubjectReuseThresholdCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-builtin-subject-reuse-threshold",
    variable: "subject_reuse_threshold",
    valueType: "real",
    assumptions: [{ operator: "eq", value: BUILTIN_SUBJECT_REUSE_THRESHOLD }],
    claim: { operator: "eq", value: 0.4 },
  });
}

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

/** The Jev vocabulary alignment shall rank at most 5 subject candidates. */
export function jevSubjectTopKCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-jev-subject-top-k",
    variable: "jev_subject_top_k",
    valueType: "int",
    assumptions: [{ operator: "eq", value: JEV_SUBJECT_TOP_K }],
    claim: { operator: "eq", value: 5 },
  });
}

/** The vocabulary alignment choice that keeps a new subject shall be new_subject. */
export function newSubjectChoiceCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-new-subject-choice",
    symbolId: "SYM-const-new-subject-choice",
    value: NEW_SUBJECT_CHOICE,
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

describe("Vocabulary alignment thresholds and scope", () => {
  test("The built-in subject reuse threshold shall be 0.4", () => {
    writeCodeCertificate(builtinSubjectReuseThresholdCertificate());
    expect(BUILTIN_SUBJECT_REUSE_THRESHOLD).toBe(0.4);
  });

  test("The built-in claim similarity threshold shall be 0.75", () => {
    writeCodeCertificate(builtinClaimSimilarityThresholdCertificate());
    expect(BUILTIN_CLAIM_SIMILARITY_THRESHOLD).toBe(0.75);
  });

  test("The Jev vocabulary alignment shall rank at most 5 subject candidates", () => {
    writeCodeCertificate(jevSubjectTopKCertificate());
    expect(JEV_SUBJECT_TOP_K).toBe(5);
  });

  test("The vocabulary alignment choice that keeps a new subject shall be new_subject", () => {
    writeCodeCertificate(newSubjectChoiceCertificate());
    expect(NEW_SUBJECT_CHOICE).toBe("new_subject");
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
