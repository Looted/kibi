import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  CONTEXT_HEADING_WORDS,
  CONTEXT_REQUIRED_TYPES,
  MIN_CONTEXT_WORDS,
  RESTATEMENT_JACCARD,
} from "../../../src/entity-body-context.js";

// implements REQ-kb-entity-body-context-settings

/**
 * Which entities need body context, which headings hold it, how long it must be
 * and when it only restates the statement. Kibi reads each constant itself at
 * ingest, so every certificate is checked against the code.
 */

/** The entity types that must carry body context shall be req, scenario, test, adr and fact. */
export async function contextRequiredTypesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-context-required-types",
    domain: {
      symbolId: "SYM-entity-body-context-required-types",
      members: [...CONTEXT_REQUIRED_TYPES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The context section headings shall be context, rationale, why, background, source, notes and evidence. */
export async function contextHeadingWordsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-context-heading-words",
    domain: {
      symbolId: "SYM-entity-body-context-heading-words",
      members: [...CONTEXT_HEADING_WORDS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The minimum context section length shall be 12 words. */
export function minContextWordsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-min-context-words",
    variable: "min_context_words",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MIN_CONTEXT_WORDS }],
    claim: { operator: "eq", value: 12 },
  });
}

/** The context restatement threshold shall be a Jaccard similarity of 0.8. */
export function contextRestatementJaccardCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-context-restatement-jaccard",
    variable: "context_restatement_jaccard",
    valueType: "real",
    assumptions: [{ operator: "eq", value: RESTATEMENT_JACCARD }],
    claim: { operator: "eq", value: 0.8 },
  });
}

describe("Entity body context settings", () => {
  test("The entity types that must carry body context shall be req, scenario, test, adr and fact", async () => {
    writeCodeCertificate(await contextRequiredTypesCertificate());
    expect([...CONTEXT_REQUIRED_TYPES].sort()).toEqual([
      "adr",
      "fact",
      "req",
      "scenario",
      "test",
    ]);
  });

  test("The context section headings shall be context, rationale, why, background, source, notes and evidence", async () => {
    writeCodeCertificate(await contextHeadingWordsCertificate());
    expect([...CONTEXT_HEADING_WORDS].sort()).toEqual([
      "background",
      "context",
      "evidence",
      "notes",
      "rationale",
      "source",
      "why",
    ]);
  });

  test("The minimum context section length shall be 12 words", () => {
    writeCodeCertificate(minContextWordsCertificate());
    expect(MIN_CONTEXT_WORDS).toBe(12);
  });

  test("The context restatement threshold shall be a Jaccard similarity of 0.8", () => {
    writeCodeCertificate(contextRestatementJaccardCertificate());
    expect(RESTATEMENT_JACCARD).toBe(0.8);
  });
});
