import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  GROUNDING_LINK_TYPES,
  MAX_SNIPPET_CHARS,
} from "../../../../agent-core/src/snippets.js";
import { MAX_REQUIREMENT_CANDIDATES } from "../../../../agent-core/src/requirement-candidates.js";
import { CONFIRM_FIRM_EDITS_ENV } from "../../../../agent-core/src/decision-guard.js";

// implements REQ-agent-core-hook-limits

/**
 * How long an edit snippet may be, how many requirement candidates a hook offers, which links ground a requirement in a snippet, and the variable that turns on firm-edit confirmation. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** An edit snippet shall hold at most 1200 characters. */
export function snippetMaxCharsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-snippet-max-chars",
    variable: "max_snippet_chars",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_SNIPPET_CHARS }],
    claim: { operator: "eq", value: 1200 },
  });
}

/** A hook shall offer at most 3 requirement candidates. */
export function hookMaxRequirementCandidatesCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-hook-max-requirement-candidates",
    variable: "max_candidates",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_REQUIREMENT_CANDIDATES }],
    claim: { operator: "eq", value: 3 },
  });
}

/** Firm edit confirmation shall be switched by KIBI_CONFIRM_FIRM_EDITS. */
export function confirmFirmEditsEnvCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-confirm-firm-edits-env",
    symbolId: "SYM-agent-core-confirm-firm-edits-env",
    value: CONFIRM_FIRM_EDITS_ENV,
  });
}

/** A snippet grounding link shall be constrains, requires_property, requires_predicate or requires_rule. */
export async function snippetGroundingLinksCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-snippet-grounding-links",
    domain: {
      symbolId: "SYM-agent-core-snippets-grounding-link-types",
      members: [...GROUNDING_LINK_TYPES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Agent hook snippet and candidate limits", () => {
  test("An edit snippet shall hold at most 1200 characters", () => {
    writeCodeCertificate(snippetMaxCharsCertificate());
    expect(MAX_SNIPPET_CHARS).toBe(1200);
  });

  test("A hook shall offer at most 3 requirement candidates", () => {
    writeCodeCertificate(hookMaxRequirementCandidatesCertificate());
    expect(MAX_REQUIREMENT_CANDIDATES).toBe(3);
  });

  test("Firm edit confirmation shall be switched by KIBI_CONFIRM_FIRM_EDITS", () => {
    writeCodeCertificate(confirmFirmEditsEnvCertificate());
    expect(CONFIRM_FIRM_EDITS_ENV).toBe("KIBI_CONFIRM_FIRM_EDITS");
  });

  test("A snippet grounding link shall be constrains, requires_property, requires_predicate or requires_rule", async () => {
    writeCodeCertificate(await snippetGroundingLinksCertificate());
    expect([...GROUNDING_LINK_TYPES].sort()).toEqual([
      "constrains",
      "requires_predicate",
      "requires_property",
      "requires_rule",
    ]);
  });
});
