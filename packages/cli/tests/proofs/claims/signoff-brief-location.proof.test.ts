import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SIGNOFF_BRIEF_DIR } from "../../../src/signoff/model.js";
import { SIGNOFF_MARKDOWN_LIMIT } from "../../../src/signoff/markdown.js";

// implements REQ-kibi-signoff-brief-location

/**
 * Where kibi signoff writes its views and how many rows it shows in chat. Kibi
 * reads both constants itself at ingest, so each certificate is checked against
 * the code.
 */

/** The Kibi signoff brief directory shall be .kb/briefs/signoff. */
export function signoffBriefDirCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-brief-dir",
    symbolId: "SYM-cli-signoff-model-signoff-brief-dir",
    value: SIGNOFF_BRIEF_DIR,
  });
}

/** The Kibi signoff chat view shall show at most 15 rows. */
export function signoffMarkdownLimitCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-signoff-markdown-limit",
    variable: "markdown_row_limit",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SIGNOFF_MARKDOWN_LIMIT }],
    claim: { operator: "eq", value: 15 },
  });
}

describe("Kibi signoff writes its views under .kb/briefs/signoff", () => {
  test("signoff views live under .kb/briefs/signoff", () => {
    writeCodeCertificate(signoffBriefDirCertificate());
    expect(SIGNOFF_BRIEF_DIR).toBe(".kb/briefs/signoff");
  });

  test("the chat view shows at most 15 rows", () => {
    writeCodeCertificate(signoffMarkdownLimitCertificate());
    expect(SIGNOFF_MARKDOWN_LIMIT).toBe(15);
  });
});
