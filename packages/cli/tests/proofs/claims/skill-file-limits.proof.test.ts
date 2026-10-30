import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SKILL_FILE_NAME } from "../../../src/public/skill-system/paths.js";
import { RESOURCE_MAX_BYTES } from "../../../src/public/skill-system/validation.js";

// implements REQ-skill-file-limits

/**
 * The file a skill folder must hold and the size bound of a skill resource. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** A skill file shall be named SKILL.md. */
export function skillFileNameCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-skill-file-name",
    symbolId: "SYM-SKILL_FILE_NAME",
    value: SKILL_FILE_NAME,
  });
}

/** A skill resource shall be at most 131072 bytes. */
export function skillResourceMaxBytesCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-skill-resource-max-bytes",
    variable: "resource_max_bytes",
    valueType: "int",
    assumptions: [{ operator: "eq", value: RESOURCE_MAX_BYTES }],
    claim: { operator: "eq", value: 131072 },
  });
}

describe("Skill file name and resource limit", () => {
  test("A skill file shall be named SKILL.md", () => {
    writeCodeCertificate(skillFileNameCertificate());
    expect(SKILL_FILE_NAME).toBe("SKILL.md");
  });

  test("A skill resource shall be at most 131072 bytes", () => {
    writeCodeCertificate(skillResourceMaxBytesCertificate());
    expect(RESOURCE_MAX_BYTES).toBe(131072);
  });
});
