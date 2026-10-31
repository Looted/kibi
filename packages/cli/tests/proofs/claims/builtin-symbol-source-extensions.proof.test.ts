import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { SUPPORTED_SOURCE_EXTENSIONS } from "../../../../plugin-builtin/src/symbols/ts-morph-shared.js";

// implements REQ-builtin-symbol-source-extensions

/**
 * The file extensions the builtin TypeScript symbol extractor reads. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A source file the builtin TypeScript symbol extractor reads shall end in .ts, .tsx, .js, .jsx, .mts, .cts, .mjs or .cjs. */
export async function builtinSymbolSourceExtensionsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-builtin-symbol-source-extensions",
    domain: {
      symbolId: "SYM-cap-plugin-supported-source-extensions-7688bba6",
      members: [...SUPPORTED_SOURCE_EXTENSIONS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Builtin TypeScript symbol extractor file extensions", () => {
  test("A source file the builtin TypeScript symbol extractor reads shall end in .ts, .tsx, .js, .jsx, .mts, .cts, .mjs or .cjs", async () => {
    writeCodeCertificate(await builtinSymbolSourceExtensionsCertificate());
    expect([...SUPPORTED_SOURCE_EXTENSIONS].sort()).toEqual([
      ".cjs",
      ".cts",
      ".js",
      ".jsx",
      ".mjs",
      ".mts",
      ".ts",
      ".tsx",
    ]);
  });
});
