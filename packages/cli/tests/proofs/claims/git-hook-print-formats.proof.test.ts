import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { HOOK_SNIPPET_FORMATS } from "../../../src/commands/hook-managers.js";

// implements REQ-git-hook-print-formats

/**
 * The formats kibi init --print-hook prints Kibi's hook commands in. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A Kibi hook command print format shall be shell, lefthook, husky or pre-commit. */
export async function gitHookPrintFormatsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-git-hook-print-formats",
    domain: {
      symbolId: "SYM-hook-managers-hook-snippet-formats",
      members: [...HOOK_SNIPPET_FORMATS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Kibi hook command print formats", () => {
  test("A Kibi hook command print format shall be shell, lefthook, husky or pre-commit", async () => {
    writeCodeCertificate(await gitHookPrintFormatsCertificate());
    expect([...HOOK_SNIPPET_FORMATS].sort()).toEqual([
      "husky",
      "lefthook",
      "pre-commit",
      "shell",
    ]);
  });
});
