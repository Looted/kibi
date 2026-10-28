import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { TREE_SITTER_LANGUAGES } from "../../../../plugin-treesitter/src/catalog.js";

// implements REQ-tree-sitter-language-set

/**
 * The languages the tree-sitter plugin extracts symbols from and the file extensions it claims for some of them. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A tree-sitter plugin language shall be python, go, rust, java, csharp, php, c, cpp, bash, ruby, terraform or hcl. */
export async function treeSitterLanguageIdsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-tree-sitter-language-ids",
    domain: {
      symbolId: "SYM-source-analysis-v2-tree-sitter-languages-dae6879e",
      members: [...Object.keys(TREE_SITTER_LANGUAGES)],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A Python source file shall end in .py or .pyi. */
export async function treeSitterPythonExtensionsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-tree-sitter-python-extensions",
    domain: {
      symbolId: "SYM-source-analysis-v2-tree-sitter-languages-dae6879e",
      members: [...TREE_SITTER_LANGUAGES.python.extensions],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A Go source file shall end in .go. */
export async function treeSitterGoExtensionsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-tree-sitter-go-extensions",
    domain: {
      symbolId: "SYM-source-analysis-v2-tree-sitter-languages-dae6879e",
      members: [...TREE_SITTER_LANGUAGES.go.extensions],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A Rust source file shall end in .rs. */
export async function treeSitterRustExtensionsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-tree-sitter-rust-extensions",
    domain: {
      symbolId: "SYM-source-analysis-v2-tree-sitter-languages-dae6879e",
      members: [...TREE_SITTER_LANGUAGES.rust.extensions],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Tree-sitter plugin languages and extensions", () => {
  test("A tree-sitter plugin language shall be python, go, rust, java, csharp, php, c, cpp, bash, ruby, terraform or hcl", async () => {
    writeCodeCertificate(await treeSitterLanguageIdsCertificate());
    expect([...Object.keys(TREE_SITTER_LANGUAGES)].sort()).toEqual([
      "bash",
      "c",
      "cpp",
      "csharp",
      "go",
      "hcl",
      "java",
      "php",
      "python",
      "ruby",
      "rust",
      "terraform",
    ]);
  });

  test("A Python source file shall end in .py or .pyi", async () => {
    writeCodeCertificate(await treeSitterPythonExtensionsCertificate());
    expect([...TREE_SITTER_LANGUAGES.python.extensions].sort()).toEqual([
      ".py",
      ".pyi",
    ]);
  });

  test("A Go source file shall end in .go", async () => {
    writeCodeCertificate(await treeSitterGoExtensionsCertificate());
    expect([...TREE_SITTER_LANGUAGES.go.extensions].sort()).toEqual([".go"]);
  });

  test("A Rust source file shall end in .rs", async () => {
    writeCodeCertificate(await treeSitterRustExtensionsCertificate());
    expect([...TREE_SITTER_LANGUAGES.rust.extensions].sort()).toEqual([".rs"]);
  });
});
