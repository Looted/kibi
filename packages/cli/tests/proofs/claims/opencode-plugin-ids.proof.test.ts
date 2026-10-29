import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { KIBI_OPENCODE_PLUGIN_ID } from "../../../../opencode/src/opencode-v2.js";
import { KIBI_BOOTSTRAP_COMMAND_NAME } from "../../../../opencode/src/kibi-bootstrap-capability.js";

// implements REQ-opencode-plugin-ids

/**
 * The id the OpenCode plugin registers under and the name of its bootstrap command. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The OpenCode plugin id shall be kibi-opencode. */
export function opencodePluginIdCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-opencode-plugin-id",
    symbolId: "SYM-const-kibi-opencode-plugin-id",
    value: KIBI_OPENCODE_PLUGIN_ID,
  });
}

/** The OpenCode bootstrap command shall be kibi-bootstrap. */
export function opencodeBootstrapCommandCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-opencode-bootstrap-command",
    symbolId:
      "SYM-kibi-bootstrap-opencode-src-kibi-bootstrap-capability-kibi-bootstrap-command-name",
    value: KIBI_BOOTSTRAP_COMMAND_NAME,
  });
}

describe("OpenCode plugin id and bootstrap command", () => {
  test("The OpenCode plugin id shall be kibi-opencode", () => {
    writeCodeCertificate(opencodePluginIdCertificate());
    expect(KIBI_OPENCODE_PLUGIN_ID).toBe("kibi-opencode");
  });

  test("The OpenCode bootstrap command shall be kibi-bootstrap", () => {
    writeCodeCertificate(opencodeBootstrapCommandCertificate());
    expect(KIBI_BOOTSTRAP_COMMAND_NAME).toBe("kibi-bootstrap");
  });
});
