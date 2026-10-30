import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  FIRMNESS_TYPES,
  MIN_WHY_CHANGED_WORDS,
  WHY_THIS_CHANGED_HEADING,
} from "../../../src/decision-firmness.js";

// implements REQ-kb-decision-firmness-settings

/**
 * Which entities carry firmness and how a supersede explains itself. Kibi reads
 * each constant itself at ingest, so every certificate is checked against the code.
 */

/** The entity types that carry firmness shall be req and adr. */
export async function firmnessTypesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-firmness-types",
    domain: {
      symbolId: "SYM-decision-firmness-types",
      members: [...FIRMNESS_TYPES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The supersede explanation heading shall be Why this changed. */
export function whyThisChangedHeadingCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-why-this-changed-heading",
    symbolId: "SYM-decision-firmness-why-heading",
    value: WHY_THIS_CHANGED_HEADING,
  });
}

/** The minimum supersede explanation length shall be 12 words. */
export function minWhyChangedWordsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-min-why-changed-words",
    variable: "min_why_changed_words",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MIN_WHY_CHANGED_WORDS }],
    claim: { operator: "eq", value: 12 },
  });
}

describe("Decision firmness settings", () => {
  test("The entity types that carry firmness shall be req and adr", async () => {
    writeCodeCertificate(await firmnessTypesCertificate());
    expect([...FIRMNESS_TYPES].sort()).toEqual(["adr", "req"]);
  });

  test("The supersede explanation heading shall be Why this changed", () => {
    writeCodeCertificate(whyThisChangedHeadingCertificate());
    expect(WHY_THIS_CHANGED_HEADING).toBe("Why this changed");
  });

  test("The minimum supersede explanation length shall be 12 words", () => {
    writeCodeCertificate(minWhyChangedWordsCertificate());
    expect(MIN_WHY_CHANGED_WORDS).toBe(12);
  });
});
