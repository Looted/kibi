import { describe, expect, test } from "bun:test";
import { qualifiedSourceAnalyzers } from "../../src/plugins/approved-source-analyzers.generated.js";
import { APPROVED_SOURCE_ANALYZERS } from "../../src/plugins/approved-source-analyzers.js";

const SHA256 = /^[0-9a-f]{64}$/;

function expectDigests(files: Readonly<Record<string, string>>): void {
  for (const [file, digest] of Object.entries(files)) {
    expect({ file, ok: SHA256.test(digest) }).toStrictEqual({ file, ok: true });
  }
}

describe("approved source analyzers", () => {
  test("re-exports the generated qualification list", () => {
    expect(APPROVED_SOURCE_ANALYZERS).toBe(qualifiedSourceAnalyzers);
  });

  test("pins the tree-sitter analyzer and its runtime closure", () => {
    expect(APPROVED_SOURCE_ANALYZERS.map((a) => a.packageName)).toStrictEqual([
      "kibi-plugin-treesitter",
    ]);
    const [analyzer] = APPROVED_SOURCE_ANALYZERS;
    expect(analyzer.version).toBe("3.1.0");
    expect(Object.keys(analyzer.files)).toStrictEqual([
      "SBOM.spdx.json",
      "THIRD_PARTY_NOTICES.md",
      "assets/queries/bash.scm",
      "assets/queries/c.scm",
      "assets/queries/cpp-extra.scm",
      "assets/queries/cpp.scm",
      "assets/queries/csharp-extra.scm",
      "assets/queries/csharp.scm",
      "assets/queries/go.scm",
      "assets/queries/hcl.scm",
      "assets/queries/java-extra.scm",
      "assets/queries/java.scm",
      "assets/queries/php.scm",
      "assets/queries/prolog.scm",
      "assets/queries/python.scm",
      "assets/queries/ruby.scm",
      "assets/queries/rust-extra.scm",
      "assets/queries/rust.scm",
      "assets/queries/terraform.scm",
      "catalog.json",
      "dist/analysis-worker.js",
      "dist/catalog.js",
      "dist/extractor.js",
      "dist/index.js",
      "dist/language-packs.js",
      "dist/performance-timing.js",
      "dist/preprocessor-idioms.js",
      "dist/reference-nodes.js",
      "dist/references-bash.js",
      "dist/references-c.js",
      "dist/references-hcl.js",
      "dist/references-php.js",
      "dist/references.js",
      "integrity.json",
      "licenses/web-tree-sitter-MIT.txt",
      "package.json",
    ]);
    expectDigests(analyzer.files);
    expect(
      analyzer.dependencies.map((d) => [d.packageName, d.version]),
    ).toStrictEqual([["web-tree-sitter", "0.27.0"]]);
    const [dependency] = analyzer.dependencies;
    expect(Object.keys(dependency.files)).toStrictEqual([
      "LICENSE",
      "debug/web-tree-sitter.cjs",
      "debug/web-tree-sitter.js",
      "debug/web-tree-sitter.wasm",
      "package.json",
      "web-tree-sitter.cjs",
      "web-tree-sitter.js",
      "web-tree-sitter.wasm",
    ]);
    expectDigests(dependency.files);
  });

  test("the MIT licence text is pinned once for both copies", () => {
    const [analyzer] = APPROVED_SOURCE_ANALYZERS;
    expect(analyzer.files["licenses/web-tree-sitter-MIT.txt"]).toBe(
      analyzer.dependencies[0].files.LICENSE,
    );
  });
});
