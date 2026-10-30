import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { ENTITY_LANES } from "../../../src/utils/kb-paths.js";

// implements REQ-cli-canonical-kb-lanes

/**
 * The authored knowledge lanes under .kb. Kibi reads ENTITY_LANES itself at ingest
 * (domain_source), so the certificate is checked against the list in code.
 */

/** The canonical Kibi knowledge lanes shall be requirements, scenarios, tests, facts, adr, flags and events. */
export async function canonicalKbLanesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-canonical-kb-lanes",
    domain: {
      symbolId: "SYM-canonical-ENTITY_LANES",
      members: [...ENTITY_LANES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("The canonical .kb knowledge lanes", () => {
  test("the canonical lanes are the seven authored entity directories", async () => {
    writeCodeCertificate(await canonicalKbLanesCertificate());
    expect([...ENTITY_LANES].sort()).toEqual([
      "adr",
      "events",
      "facts",
      "flags",
      "requirements",
      "scenarios",
      "tests",
    ]);
  });
});
