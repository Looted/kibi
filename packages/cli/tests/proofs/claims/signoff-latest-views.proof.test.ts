import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  SIGNOFF_LATEST_HTML,
  SIGNOFF_LATEST_JSON,
  SIGNOFF_LATEST_MARKDOWN,
} from "../../../src/signoff/model.js";

// implements REQ-signoff-latest-views

/**
 * The files kibi signoff writes its latest JSON, Markdown and HTML views to. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The latest Kibi signoff JSON view file shall be .kb/briefs/signoff/latest.json. */
export function signoffLatestJsonCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-latest-json",
    symbolId: "SYM-cli-signoff-model-signoff-latest-json",
    value: SIGNOFF_LATEST_JSON,
  });
}

/** The latest Kibi signoff Markdown view file shall be .kb/briefs/signoff/latest.md. */
export function signoffLatestMarkdownCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-latest-markdown",
    symbolId: "SYM-cli-signoff-model-signoff-latest-markdown",
    value: SIGNOFF_LATEST_MARKDOWN,
  });
}

/** The latest Kibi signoff HTML view file shall be .kb/briefs/signoff/latest.html. */
export function signoffLatestHtmlCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-latest-html",
    symbolId: "SYM-cli-signoff-model-signoff-latest-html",
    value: SIGNOFF_LATEST_HTML,
  });
}

describe("Kibi signoff latest view files", () => {
  test("The latest Kibi signoff JSON view file shall be .kb/briefs/signoff/latest.json", () => {
    writeCodeCertificate(signoffLatestJsonCertificate());
    expect(SIGNOFF_LATEST_JSON).toBe(".kb/briefs/signoff/latest.json");
  });

  test("The latest Kibi signoff Markdown view file shall be .kb/briefs/signoff/latest.md", () => {
    writeCodeCertificate(signoffLatestMarkdownCertificate());
    expect(SIGNOFF_LATEST_MARKDOWN).toBe(".kb/briefs/signoff/latest.md");
  });

  test("The latest Kibi signoff HTML view file shall be .kb/briefs/signoff/latest.html", () => {
    writeCodeCertificate(signoffLatestHtmlCertificate());
    expect(SIGNOFF_LATEST_HTML).toBe(".kb/briefs/signoff/latest.html");
  });
});
