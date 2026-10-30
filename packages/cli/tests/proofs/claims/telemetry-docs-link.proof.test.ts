import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { TELEMETRY_DOCS_URL } from "../../../../agent-core/src/usage-telemetry.js";

// implements REQ-telemetry-docs-link

/**
 * The page the telemetry notice and kibi telemetry link to. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The Kibi telemetry documentation page shall be https://looted.github.io/kibi/guide/telemetry.html. */
export function telemetryDocsLinkCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-telemetry-docs-link",
    symbolId: "SYM-const-telemetry-docs-url",
    value: TELEMETRY_DOCS_URL,
  });
}

describe("Telemetry documentation link", () => {
  test("The Kibi telemetry documentation page shall be https://looted.github.io/kibi/guide/telemetry.html", () => {
    writeCodeCertificate(telemetryDocsLinkCertificate());
    expect(TELEMETRY_DOCS_URL).toBe(
      "https://looted.github.io/kibi/guide/telemetry.html",
    );
  });
});
