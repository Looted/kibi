import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  KIBI_HOOK_BEGIN,
  MANAGED_HOOK_NAMES,
} from "../../../src/commands/init-helpers.js";

// implements REQ-git-hook-managed-names

/**
 * The git hooks kibi init manages and the marker that opens its block in each. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A Kibi-managed hook block shall open with # BEGIN kibi-managed. */
export function hookBlockBeginCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-hook-block-begin",
    symbolId: "SYM-init-helpers-kibi-hook-begin",
    value: KIBI_HOOK_BEGIN,
  });
}

/** A Kibi-managed git hook shall be post-checkout, post-merge, post-rewrite or pre-commit. */
export async function managedHookNamesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-managed-hook-names",
    domain: {
      symbolId: "SYM-init-helpers-managed-hook-names",
      members: [...MANAGED_HOOK_NAMES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Kibi-managed git hooks and block marker", () => {
  test("A Kibi-managed hook block shall open with # BEGIN kibi-managed", () => {
    writeCodeCertificate(hookBlockBeginCertificate());
    expect(KIBI_HOOK_BEGIN).toBe("# BEGIN kibi-managed");
  });

  test("A Kibi-managed git hook shall be post-checkout, post-merge, post-rewrite or pre-commit", async () => {
    writeCodeCertificate(await managedHookNamesCertificate());
    expect([...MANAGED_HOOK_NAMES].sort()).toEqual([
      "post-checkout",
      "post-merge",
      "post-rewrite",
      "pre-commit",
    ]);
  });
});
