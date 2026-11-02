import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ReferenceExtractorV1 } from "kibi-plugin-sdk";
import { evaluateSourceCode } from "../../src/operations/proof/source-code-readers.js";
import {
  loadProofReferenceExtractors,
  proofReferenceExtractorLoader,
} from "../../src/plugins/proof-reference-extractors.js";
import { type SourceSpec, readSource } from "../../src/public/proof-sources.js";

const roots: string[] = [];
const originalLoad = proofReferenceExtractorLoader.load;
afterEach(() => {
  proofReferenceExtractorLoader.load = originalLoad;
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-plugin-references-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content);
  }
  return root;
}

const read = (root: string, spec: Record<string, unknown>) =>
  readSource(root, spec as SourceSpec, evaluateSourceCode);

/** A provider that lists `uses(name)` and refuses `dynamic(...)`, like a real reader would. */
const fakeExtractor: ReferenceExtractorV1 = {
  id: "test.references",
  supports: ({ path: file }) => /\.(?:go|rs)$/.test(file),
  extract: ({ content }) => ({
    contractVersion: "kibi.reference-extractor.v1",
    status: "ok",
    language: "go",
    members: [...content.matchAll(/uses\((\w+)\)/g)].map(
      (match) => match[1] as string,
    ),
    unresolved: content
      .split("\n")
      .flatMap((line, index) =>
        line.includes("dynamic(")
          ? [{ line: index + 1, text: line.trim() }]
          : [],
      ),
  }),
};

describe("the references reader on Go, Java, C# and Rust", () => {
  test("reads through a qualified reference extractor and keeps each file's unresolved lines", async () => {
    proofReferenceExtractorLoader.load = async () => ({
      extractors: [fakeExtractor],
      problems: [],
    });
    const root = workspace({
      "cmd/a.go": "uses(os)\nuses(fmt)\n",
      "src/b.rs": "uses(env)\n",
      "web/c.ts": 'import "zod";\n',
    });
    expect(
      await read(root, {
        reader: "references",
        files: ["cmd/*.go", "src/*.rs", "web/*.ts"],
        extract: "imports",
      }),
    ).toEqual({ ok: true, model: { members: ["env", "fmt", "os", "zod"] } });
    writeFileSync(path.join(root, "cmd/a.go"), "uses(os)\ndynamic(x)\n");
    const refused = await read(root, {
      reader: "references",
      files: "cmd/*.go",
      extract: "imports",
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.reason).toContain("cmd/a.go:2 dynamic(x)");
  });

  // executable_for TEST-kibi-tree-sitter-references
  test("adds the project's global usings to the imports of C# files", async () => {
    proofReferenceExtractorLoader.load = async () => ({
      extractors: [{ ...fakeExtractor, supports: () => true }],
      problems: [],
    });
    const root = workspace({
      "src/App.cs": "uses(System)\n",
      "src/GlobalUsings.cs": "global using System.Net.Http;\n",
    });
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["add", "-A"], { cwd: root });
    expect(
      await read(root, {
        reader: "references",
        files: "src/App.cs",
        extract: "imports",
      }),
    ).toEqual({ ok: true, model: { members: ["System", "System.Net.Http"] } });
  });

  test("refuses with what to install when no provider is active", async () => {
    const root = workspace({ "main.go": "package main\n" });
    const refused = await read(root, {
      reader: "references",
      files: "*.go",
      extract: "calls",
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.reason).toContain(
        "reads Go files through kibi-plugin-treesitter",
      );
      expect(refused.reason).toContain("kibi.reference-extractor.v1");
      expect(refused.reason).toContain("main.go");
    }
  });

  test("refuses a provider's failure instead of reading it as empty", async () => {
    proofReferenceExtractorLoader.load = async () => ({
      extractors: [
        {
          id: "test.failing",
          supports: () => true,
          extract: () => ({
            contractVersion: "kibi.reference-extractor.v1",
            status: "failed",
            code: "SYNTAX",
            message: "line 2 is not valid Go",
          }),
        },
      ],
      problems: [],
    });
    const root = workspace({ "main.go": "package main\nfunc (\n" });
    expect(
      await read(root, {
        reader: "references",
        files: "*.go",
        extract: "calls",
      }),
    ).toEqual({
      ok: false,
      reason: "Kibi could not read main.go: line 2 is not valid Go",
    });
  });

  test("still refuses languages no reader covers", async () => {
    const root = workspace({ "app.rb": "puts 1\n" });
    const refused = await read(root, {
      reader: "references",
      files: "*.rb",
      extract: "calls",
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok)
      expect(refused.reason).toContain(
        "Go, Java, C# and Rust through kibi-plugin-treesitter",
      );
  });

  test("never imports an activated provider that is not release-qualified", async () => {
    const root = workspace({
      "package.json": JSON.stringify({
        name: "sample",
        version: "1.0.0",
        devDependencies: { "kibi-plugin-unqualified": "1.0.0" },
        kibi: {
          plugins: [
            {
              package: "kibi-plugin-unqualified",
              capabilities: {
                "kibi.reference-extractor.v1": { mode: "augment" },
              },
            },
          ],
        },
      }),
      "node_modules/kibi-plugin-unqualified/package.json": JSON.stringify({
        name: "kibi-plugin-unqualified",
        version: "1.0.0",
        type: "module",
        main: "index.js",
      }),
      "node_modules/kibi-plugin-unqualified/index.js":
        'throw new Error("imported");\n',
    });
    const loaded = await loadProofReferenceExtractors(root);
    expect(loaded.extractors).toEqual([]);
    expect(loaded.problems).toEqual([
      "kibi-plugin-unqualified is not a release-qualified reference reader",
    ]);
  });
});
