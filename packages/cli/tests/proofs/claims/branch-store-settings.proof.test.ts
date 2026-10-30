import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { DETACHED_HEAD_READ_ONLY_CODE } from "../../../src/runtime/detached-snapshot.js";
import { BRANCH_STORE_MANIFEST_VERSION } from "../../../src/utils/branch-store-locator.js";
import {
  BRANCH_STORE_NOT_COMPILED,
  BRANCH_STORE_NOT_COMPILED_RULE,
} from "../../../src/utils/branch-store.js";
import {
  STORE_LOCK_TAKEOVER_FILE,
  STORE_LOCK_TAKEOVER_VISIBLE_MS,
} from "../../../src/prolog/store-lock.js";

// implements REQ-branch-store-settings

/**
 * The codes, manifest version and lock takeover record of a branch store. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The detached HEAD read-only code shall be detached_head_read_only. */
export function detachedHeadCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-detached-head-code",
    symbolId: "SYM-const-detached-head-read-only-code",
    value: DETACHED_HEAD_READ_ONLY_CODE,
  });
}

/** The branch store manifest version shall be 1. */
export function branchStoreManifestVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-branch-store-manifest-version",
    variable: "manifest_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: BRANCH_STORE_MANIFEST_VERSION }],
    claim: { operator: "eq", value: 1 },
  });
}

/** The uncompiled branch store code shall be branch_store_not_compiled. */
export function branchStoreNotCompiledCodeCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-branch-store-not-compiled-code",
    symbolId: "SYM-const-branch-store-not-compiled",
    value: BRANCH_STORE_NOT_COMPILED,
  });
}

/** The uncompiled branch store rule shall be branch-store-not-compiled. */
export function branchStoreNotCompiledRuleCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-branch-store-not-compiled-rule",
    symbolId: "SYM-const-branch-store-not-compiled-rule",
    value: BRANCH_STORE_NOT_COMPILED_RULE,
  });
}

/** The store lock takeover record shall be .kibi-lock-takeover.json. */
export function lockTakeoverFileCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-lock-takeover-file",
    symbolId: "SYM-const-store-lock-takeover-file",
    value: STORE_LOCK_TAKEOVER_FILE,
  });
}

/** A store lock takeover shall stay visible for 86400000 milliseconds. */
export function lockTakeoverVisibleCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-lock-takeover-visible",
    variable: "takeover_visible_ms",
    valueType: "int",
    assumptions: [{ operator: "eq", value: STORE_LOCK_TAKEOVER_VISIBLE_MS }],
    claim: { operator: "eq", value: 86400000 },
  });
}

describe("Branch store and store lock settings", () => {
  test("The detached HEAD read-only code shall be detached_head_read_only", () => {
    writeCodeCertificate(detachedHeadCodeCertificate());
    expect(DETACHED_HEAD_READ_ONLY_CODE).toBe("detached_head_read_only");
  });

  test("The branch store manifest version shall be 1", () => {
    writeCodeCertificate(branchStoreManifestVersionCertificate());
    expect(BRANCH_STORE_MANIFEST_VERSION).toBe(1);
  });

  test("The uncompiled branch store code shall be branch_store_not_compiled", () => {
    writeCodeCertificate(branchStoreNotCompiledCodeCertificate());
    expect(BRANCH_STORE_NOT_COMPILED).toBe("branch_store_not_compiled");
  });

  test("The uncompiled branch store rule shall be branch-store-not-compiled", () => {
    writeCodeCertificate(branchStoreNotCompiledRuleCertificate());
    expect(BRANCH_STORE_NOT_COMPILED_RULE).toBe("branch-store-not-compiled");
  });

  test("The store lock takeover record shall be .kibi-lock-takeover.json", () => {
    writeCodeCertificate(lockTakeoverFileCertificate());
    expect(STORE_LOCK_TAKEOVER_FILE).toBe(".kibi-lock-takeover.json");
  });

  test("A store lock takeover shall stay visible for 86400000 milliseconds", () => {
    writeCodeCertificate(lockTakeoverVisibleCertificate());
    expect(STORE_LOCK_TAKEOVER_VISIBLE_MS).toBe(86400000);
  });
});
