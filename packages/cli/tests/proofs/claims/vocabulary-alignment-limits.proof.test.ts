import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { BUILTIN_SUBJECT_REUSE_THRESHOLD } from "../../../../plugin-builtin/src/vocabulary/builtin-vocabulary-alignment.js";
import { JEV_SUBJECT_TOP_K } from "../../../../plugin-jev/src/vocabulary-alignment.js";
import { NEW_SUBJECT_CHOICE } from "../../../../plugin-sdk/src/capabilities/vocabulary-alignment.js";

// implements REQ-kibi-vocabulary-alignment-limits

/**
 * When the built-in aligner reuses an existing key, how many candidates the Jev aligner ranks, and the choice that asks for a new key. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The built-in aligner reuse threshold shall be 0.4. */
export function builtinAlignmentReuseThresholdCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-builtin-alignment-reuse-threshold",
    variable: "reuse_threshold",
    valueType: "real",
    assumptions: [{ operator: "eq", value: BUILTIN_SUBJECT_REUSE_THRESHOLD }],
    claim: { operator: "eq", value: 0.4 },
  });
}

/** The Jev aligner shall rank at most 5 candidates. */
export function jevAlignmentTopKCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-jev-alignment-top-k",
    variable: "jev_top_k",
    valueType: "int",
    assumptions: [{ operator: "eq", value: JEV_SUBJECT_TOP_K }],
    claim: { operator: "eq", value: 5 },
  });
}

/** An aligner asking for a new key shall answer new_subject. */
export function alignmentNewChoiceCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-alignment-new-choice",
    symbolId: "SYM-const-new-subject-choice",
    value: NEW_SUBJECT_CHOICE,
  });
}

describe("Vocabulary alignment thresholds", () => {
  test("The built-in aligner reuse threshold shall be 0.4", () => {
    writeCodeCertificate(builtinAlignmentReuseThresholdCertificate());
    expect(BUILTIN_SUBJECT_REUSE_THRESHOLD).toBe(0.4);
  });

  test("The Jev aligner shall rank at most 5 candidates", () => {
    writeCodeCertificate(jevAlignmentTopKCertificate());
    expect(JEV_SUBJECT_TOP_K).toBe(5);
  });

  test("An aligner asking for a new key shall answer new_subject", () => {
    writeCodeCertificate(alignmentNewChoiceCertificate());
    expect(NEW_SUBJECT_CHOICE).toBe("new_subject");
  });
});
