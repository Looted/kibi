import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { LEGACY_MIGRATION_PLAN_VERSION } from "../../../src/public/operations/legacy-migration-plan.js";
import { MIGRATION_PLAN_DIGEST_VERSION } from "../../../src/public/operations/migration-plan.js";
import { MIGRATION_PLAN_REFUSED } from "../../../src/operations/planning/migration-refusal.js";

// implements REQ-agent-migration-plan-versions

/**
 * The versions of the legacy migration plan and the plan digest, and the code of a refused plan. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The legacy migration plan version shall be kibi.legacy-migration-plan.v1. */
export function legacyMigrationPlanVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-legacy-migration-plan-version",
    symbolId: "SYM-legacy-migration-plan-version",
    value: LEGACY_MIGRATION_PLAN_VERSION,
  });
}

/** The migration plan digest version shall be kibi.migration-plan-digest.v2. */
export function migrationPlanDigestVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-migration-plan-digest-version",
    symbolId: "SYM-const-migration-plan-digest-version",
    value: MIGRATION_PLAN_DIGEST_VERSION,
  });
}

/** A refused migration plan shall return the code MIGRATION_PLAN_REFUSED. */
export function migrationPlanRefusedCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-migration-plan-refused",
    symbolId: "SYM-const-migration-plan-refused",
    value: MIGRATION_PLAN_REFUSED,
  });
}

describe("Legacy and digest migration plan versions", () => {
  test("The legacy migration plan version shall be kibi.legacy-migration-plan.v1", () => {
    writeCodeCertificate(legacyMigrationPlanVersionCertificate());
    expect(LEGACY_MIGRATION_PLAN_VERSION).toBe("kibi.legacy-migration-plan.v1");
  });

  test("The migration plan digest version shall be kibi.migration-plan-digest.v2", () => {
    writeCodeCertificate(migrationPlanDigestVersionCertificate());
    expect(MIGRATION_PLAN_DIGEST_VERSION).toBe("kibi.migration-plan-digest.v2");
  });

  test("A refused migration plan shall return the code MIGRATION_PLAN_REFUSED", () => {
    writeCodeCertificate(migrationPlanRefusedCertificate());
    expect(MIGRATION_PLAN_REFUSED).toBe("MIGRATION_PLAN_REFUSED");
  });
});
