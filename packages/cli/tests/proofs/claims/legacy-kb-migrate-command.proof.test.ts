import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { LEGACY_KB_MIGRATION_COMMAND } from "../../../src/utils/config.js";

// implements REQ-legacy-kb-migrate-command

/**
 * The command Kibi names as the first step for a legacy KB. Kibi reads the
 * constant itself at ingest, so the certificate is checked against the code.
 */

/** The legacy KB migration command shall be kibi migrate --yes. */
export function legacyKbMigrationCommandCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-legacy-kb-migration-command",
    symbolId: "SYM-canonical-LEGACY_KB_MIGRATION_COMMAND",
    value: LEGACY_KB_MIGRATION_COMMAND,
  });
}

describe("The legacy KB first step is kibi migrate --yes", () => {
  test("The legacy KB migration command shall be kibi migrate --yes", () => {
    writeCodeCertificate(legacyKbMigrationCommandCertificate());
    expect(LEGACY_KB_MIGRATION_COMMAND).toBe("kibi migrate --yes");
  });
});
