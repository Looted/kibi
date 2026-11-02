import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { MAX_BULLETS } from "../../../../opencode/src/prompt.js";

// implements REQ-opencode-guidance-bullet-limit

/**
 * How many bullets one OpenCode Kibi guidance block holds. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** An OpenCode Kibi guidance block shall hold at most 5 bullets. */
export function opencodeGuidanceBulletLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-opencode-guidance-bullet-limit",
    variable: "bullet_limit",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_BULLETS }],
    claim: { operator: "eq", value: 5 },
  });
}

describe("OpenCode guidance bullet limit", () => {
  test("An OpenCode Kibi guidance block shall hold at most 5 bullets", () => {
    writeCodeCertificate(opencodeGuidanceBulletLimitCertificate());
    expect(MAX_BULLETS).toBe(5);
  });
});
