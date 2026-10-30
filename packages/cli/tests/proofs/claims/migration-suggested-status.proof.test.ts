import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SUGGESTED_REQUIREMENT_STATUS } from "../../../src/operations/migration/requirement-status.js";

// implements REQ-cli-migration-suggested-status

/**
 * The status a migration suggests for each legacy lifecycle word found on a requirement. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A legacy requirement status word shall be accepted, proposed, draft, deprecated, superseded or rejected. */
export async function legacyStatusWordsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-legacy-status-words",
    domain: {
      symbolId: "SYM-migration-suggested-requirement-status",
      members: [...Object.keys(SUGGESTED_REQUIREMENT_STATUS)],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A requirement marked accepted shall be migrated as open. */
export function legacyStatusAcceptedCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-legacy-status-accepted",
    symbolId: "SYM-migration-suggested-requirement-status",
    value: SUGGESTED_REQUIREMENT_STATUS.accepted,
  });
}

/** A requirement marked proposed shall be migrated as open. */
export function legacyStatusProposedCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-legacy-status-proposed",
    symbolId: "SYM-migration-suggested-requirement-status",
    value: SUGGESTED_REQUIREMENT_STATUS.proposed,
  });
}

/** A requirement marked draft shall be migrated as open. */
export function legacyStatusDraftCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-legacy-status-draft",
    symbolId: "SYM-migration-suggested-requirement-status",
    value: SUGGESTED_REQUIREMENT_STATUS.draft,
  });
}

/** A requirement marked deprecated shall be migrated as closed. */
export function legacyStatusDeprecatedCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-legacy-status-deprecated",
    symbolId: "SYM-migration-suggested-requirement-status",
    value: SUGGESTED_REQUIREMENT_STATUS.deprecated,
  });
}

/** A requirement marked superseded shall be migrated as closed. */
export function legacyStatusSupersededCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-legacy-status-superseded",
    symbolId: "SYM-migration-suggested-requirement-status",
    value: SUGGESTED_REQUIREMENT_STATUS.superseded,
  });
}

/** A requirement marked rejected shall be migrated as closed. */
export function legacyStatusRejectedCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-legacy-status-rejected",
    symbolId: "SYM-migration-suggested-requirement-status",
    value: SUGGESTED_REQUIREMENT_STATUS.rejected,
  });
}

describe("Suggested status for legacy requirement status words", () => {
  test("A legacy requirement status word shall be accepted, proposed, draft, deprecated, superseded or rejected", async () => {
    writeCodeCertificate(await legacyStatusWordsCertificate());
    expect([...Object.keys(SUGGESTED_REQUIREMENT_STATUS)].sort()).toEqual([
      "accepted",
      "deprecated",
      "draft",
      "proposed",
      "rejected",
      "superseded",
    ]);
  });

  test("A requirement marked accepted shall be migrated as open", () => {
    writeCodeCertificate(legacyStatusAcceptedCertificate());
    expect(SUGGESTED_REQUIREMENT_STATUS.accepted).toBe("open");
  });

  test("A requirement marked proposed shall be migrated as open", () => {
    writeCodeCertificate(legacyStatusProposedCertificate());
    expect(SUGGESTED_REQUIREMENT_STATUS.proposed).toBe("open");
  });

  test("A requirement marked draft shall be migrated as open", () => {
    writeCodeCertificate(legacyStatusDraftCertificate());
    expect(SUGGESTED_REQUIREMENT_STATUS.draft).toBe("open");
  });

  test("A requirement marked deprecated shall be migrated as closed", () => {
    writeCodeCertificate(legacyStatusDeprecatedCertificate());
    expect(SUGGESTED_REQUIREMENT_STATUS.deprecated).toBe("closed");
  });

  test("A requirement marked superseded shall be migrated as closed", () => {
    writeCodeCertificate(legacyStatusSupersededCertificate());
    expect(SUGGESTED_REQUIREMENT_STATUS.superseded).toBe("closed");
  });

  test("A requirement marked rejected shall be migrated as closed", () => {
    writeCodeCertificate(legacyStatusRejectedCertificate());
    expect(SUGGESTED_REQUIREMENT_STATUS.rejected).toBe("closed");
  });
});
