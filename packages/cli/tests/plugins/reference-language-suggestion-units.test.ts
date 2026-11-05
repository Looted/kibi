import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  type ReferenceLanguageSuggestion,
  describeReferenceLanguageSuggestion,
  manifestDeclares,
  modifiedPacks,
  pinnedPackVersions,
  referenceLanguageSuggestion,
  workspaceInstalledVersion,
  workspaceReferenceLanguageNote,
} from "../../src/plugins/reference-language-suggestion.js";

const TREESITTER = "kibi-plugin-treesitter";
const REFS = "kibi.reference-extractor.v1";
const SYMBOLS = "kibi.symbol-extractor.v2";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-rls-units-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, relative)), { recursive: true });
    writeFileSync(join(root, relative), content);
  }
  return root;
}

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

describe("manifestDeclares", () => {
  test("finds a package in the three install fields only", () => {
    for (const field of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
    ])
      expect(manifestDeclares({ [field]: { pkg: "1" } }, "pkg")).toBe(true);
    for (const manifest of [
      null,
      "pkg",
      {},
      { peerDependencies: { pkg: "1" } },
      { dependencies: null },
      { dependencies: { other: "1" } },
    ])
      expect(manifestDeclares(manifest, "pkg")).toBe(false);
    // A string field has indexed characters but lists no packages.
    expect(manifestDeclares({ dependencies: "ab" }, "0")).toBe(false);
  });
});

describe("workspaceInstalledVersion", () => {
  function resolver(
    resolved: Record<string, string>,
    paths: string[] | null,
  ): NodeJS.RequireResolve {
    const resolve = ((request: string) => {
      const found = resolved[request];
      if (found === undefined) throw new Error(`cannot resolve ${request}`);
      return found;
    }) as NodeJS.RequireResolve;
    resolve.paths = () => paths;
    return resolve;
  }

  test("reads the resolved manifest first", () => {
    const root = workspace({
      "a/package.json": JSON.stringify({ version: "1.0.0" }),
      "b/pkg/package.json": JSON.stringify({ version: "2.0.0" }),
    });
    const installed = workspaceInstalledVersion(
      root,
      resolver({ "pkg/package.json": join(root, "a/package.json") }, [
        join(root, "b"),
      ]),
    );
    expect(installed("pkg")).toBe("1.0.0");
  });

  test("falls back to each lookup directory in turn", () => {
    const root = workspace({
      "c/pkg/package.json": JSON.stringify({ version: "3.0.0" }),
      "d/pkg/package.json": JSON.stringify({ version: "4.0.0" }),
    });
    const installed = workspaceInstalledVersion(
      root,
      resolver({}, [join(root, "missing"), join(root, "c"), join(root, "d")]),
    );
    expect(installed("pkg")).toBe("3.0.0");
    expect(
      workspaceInstalledVersion(root, resolver({}, null))("pkg"),
    ).toBeNull();
  });

  test("reports no version for a manifest without a string version", () => {
    const root = workspace({
      "c/pkg/package.json": JSON.stringify({ version: 3 }),
      "d/pkg/package.json": JSON.stringify({ version: "4.0.0" }),
    });
    expect(
      workspaceInstalledVersion(
        root,
        resolver({}, [join(root, "c"), join(root, "d")]),
      )("pkg"),
    ).toBeNull();
  });

  test("resolves from the workspace by default", () => {
    const root = workspace({
      "package.json": "{}",
      "node_modules/pkg/package.json": JSON.stringify({ version: "5.0.0" }),
    });
    expect(workspaceInstalledVersion(root)("pkg")).toBe("5.0.0");
    expect(workspaceInstalledVersion(root)("absent")).toBeNull();
  });
});

function treesitter(catalog: unknown): Record<string, string> {
  return {
    "package.json": "{}",
    [`node_modules/${TREESITTER}/package.json`]: JSON.stringify({
      name: TREESITTER,
      version: "2.1.0",
    }),
    [`node_modules/${TREESITTER}/catalog.json`]: JSON.stringify(catalog),
  };
}

describe("pinnedPackVersions", () => {
  test("pins nothing without a language list", () => {
    expect(pinnedPackVersions(workspace(treesitter({})))).toStrictEqual(
      new Map(),
    );
    expect(pinnedPackVersions(undefined)).toStrictEqual(new Map());
  });
});

describe("modifiedPacks", () => {
  test("reports nothing without a language list", () => {
    expect(modifiedPacks(workspace(treesitter({})))).toStrictEqual(new Set());
  });

  test("skips catalog rows that lack the pack, the asset or its hash", () => {
    // A package literally named "undefined" would match a row without a pack
    // if that row were not skipped.
    const root = workspace({
      ...treesitter({
        languages: [
          { packVersion: "1.0.0", asset: "g.wasm", assetSha256: sha("x") },
          { pack: "kibi-lang-go", packVersion: "1.0.0", assetSha256: sha("x") },
          { pack: "kibi-lang-rust", packVersion: "1.0.0", asset: "g.wasm" },
        ],
      }),
      "node_modules/undefined/package.json": JSON.stringify({
        version: "1.0.0",
      }),
      "node_modules/undefined/g.wasm": "changed",
      "node_modules/kibi-lang-go/package.json": JSON.stringify({
        version: "1.0.0",
      }),
      "node_modules/kibi-lang-rust/package.json": JSON.stringify({
        version: "1.0.0",
      }),
      "node_modules/kibi-lang-rust/g.wasm": "changed",
    });
    expect(modifiedPacks(root)).toStrictEqual(new Set());
  });
});

describe("referenceLanguageSuggestion", () => {
  test("counts only production sources", () => {
    const suggestion = referenceLanguageSuggestion(
      [
        "test/a.go",
        "fixture/b.go",
        "src/.kb/c.go",
        "pkg/x_test.go.go",
        "pkg/a.test.go",
        "src/FooTest.java",
        "src/BarTests.java",
        "cmd/main.go",
        "cmd/two.go",
        "cmd/three.go",
        "cmd/four.go",
      ],
      {},
    );
    expect(suggestion?.languages).toStrictEqual([
      { name: "Go", files: 6, proofs: true },
    ]);
    expect(suggestion?.evidence).toStrictEqual([
      "src/.kb/c.go",
      "pkg/x_test.go.go",
      "cmd/main.go",
      "cmd/two.go",
      "cmd/three.go",
    ]);
  });

  test("confirms Prolog only by a .plt file or a pack.pl at a path end", () => {
    expect(referenceLanguageSuggestion(["src/a.plt.d/b.pl"], {})).toBeNull();
    expect(
      referenceLanguageSuggestion(["src/a.plt"], {})?.languages,
    ).toStrictEqual([{ name: "SWI-Prolog", files: 1 }]);
  });

  test("suggests an unlisted plugin for symbols even when every pack is installed", () => {
    expect(
      referenceLanguageSuggestion(
        ["lib/a.rb"],
        {},
        () => "1.0.0",
        new Map([["kibi-lang-ruby", "1.0.0"]]),
      ),
    ).toStrictEqual({
      package: TREESITTER,
      capabilities: [SYMBOLS],
      languages: [{ name: "Ruby", files: 1 }],
      evidence: ["lib/a.rb"],
      activeForSymbolsOnly: false,
      pluginInstalled: true,
      packs: [],
      modified: [],
    });
  });

  test("ignores other listed plugins", () => {
    const suggestion = referenceLanguageSuggestion(["cmd/main.go"], {
      plugins: [{ package: "other-plugin", capabilities: {} }],
      declinedPlugins: ["other-plugin"],
    });
    expect(suggestion?.capabilities).toStrictEqual([REFS, SYMBOLS]);
    expect(suggestion?.activeForSymbolsOnly).toBe(false);
    expect(
      referenceLanguageSuggestion(["cmd/main.go"], {
        declinedPlugins: [TREESITTER],
      }),
    ).toBeNull();
  });
});

describe("describeReferenceLanguageSuggestion", () => {
  test("lists every capability to add to an existing entry", () => {
    const suggestion: ReferenceLanguageSuggestion = {
      package: TREESITTER,
      capabilities: [REFS, SYMBOLS],
      languages: [{ name: "Go", files: 1, proofs: true }],
      evidence: ["cmd/main.go"],
      activeForSymbolsOnly: true,
      pluginInstalled: true,
      packs: [],
      modified: [],
    };
    expect(describeReferenceLanguageSuggestion(suggestion)).toBe(
      `1 Go source file(s); ${TREESITTER} is active for symbols but not for source proofs: add "${REFS}": { "mode": "augment" }, "${SYMBOLS}": { "mode": "augment" } to its package.json kibi.plugins entry`,
    );
  });
});

describe("workspaceReferenceLanguageNote", () => {
  test("names every installed pack whose grammar changed", () => {
    const root = workspace({
      ...treesitter({
        languages: [
          {
            pack: "kibi-lang-go",
            packVersion: "1.0.0",
            asset: "g.wasm",
            assetSha256: sha("go"),
          },
          {
            pack: "kibi-lang-rust",
            packVersion: "1.0.0",
            asset: "r.wasm",
            assetSha256: sha("rust"),
          },
        ],
      }),
      "node_modules/kibi-lang-go/package.json": JSON.stringify({
        version: "1.0.0",
      }),
      "node_modules/kibi-lang-go/g.wasm": "go, changed",
      "node_modules/kibi-lang-rust/package.json": JSON.stringify({
        version: "1.0.0",
      }),
      "node_modules/kibi-lang-rust/r.wasm": "rust, changed",
      "cmd/main.go": "package main\n",
      "src/lib.rs": "pub fn run() {}\n",
    });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        devDependencies: { [TREESITTER]: "2.1.0" },
        kibi: {
          plugins: [
            {
              package: TREESITTER,
              capabilities: {
                [SYMBOLS]: { mode: "augment" },
                [REFS]: { mode: "augment" },
              },
            },
          ],
        },
      }),
    );
    execFileSync("git", ["init", "-q"], { cwd: root, stdio: "ignore" });
    execFileSync("git", ["add", "cmd", "src", "package.json"], {
      cwd: root,
      stdio: "ignore",
    });
    expect(workspaceReferenceLanguageNote(root)).toBe(
      `1 Go, 1 Rust source file(s); ${TREESITTER} reads them only with the grammar pack(s) kibi-lang-go@1.0.0, kibi-lang-rust@1.0.0 installed: npm install --save-dev kibi-lang-go@1.0.0 kibi-lang-rust@1.0.0. The installed grammar of kibi-lang-go, kibi-lang-rust does not match the SHA-256 ${TREESITTER} pins; reinstall it. Until then, symbols in those files are placed by text match and are approximate. To skip a pack the project does not need, list it in package.json kibi.declinedLanguagePacks (for example "declinedLanguagePacks": ["kibi-lang-go"]); staged changes to files in that language then get a whole-file review instead of blocking.`,
    );
  });

  test("treats a plugin without a package.json listing as not installed", () => {
    const root = workspace({
      [`node_modules/${TREESITTER}/package.json`]: JSON.stringify({
        version: "2.1.0",
      }),
      [`node_modules/${TREESITTER}/catalog.json`]: JSON.stringify({
        languages: [],
      }),
      "node_modules/kibi-lang-go/package.json": JSON.stringify({
        version: "1.0.0",
      }),
      "cmd/main.go": "package main\n",
    });
    execFileSync("git", ["init", "-q"], { cwd: root, stdio: "ignore" });
    execFileSync("git", ["add", "cmd"], { cwd: root, stdio: "ignore" });
    expect(workspaceReferenceLanguageNote(root)).toBe(
      `1 Go source file(s); source proofs and symbols for them need ${TREESITTER}: npm install --save-dev ${TREESITTER}, then add this entry to package.json "kibi": { "plugins": [ {"package":"${TREESITTER}","capabilities":{"${REFS}":{"mode":"augment"},"${SYMBOLS}":{"mode":"augment"}}} ] }. This project has no package.json: run npm init -y first to create a minimal one (Kibi reads only its devDependencies and kibi.plugins), then run the install and add the kibi.plugins entry above, and add node_modules/ to .gitignore. Without it, references proofs on those files are refused.`,
    );
  });

  test("tells an installed, declared plugin it needs only its entry", () => {
    const root = workspace({
      "package.json": JSON.stringify({
        devDependencies: { [TREESITTER]: "2.1.0" },
      }),
      [`node_modules/${TREESITTER}/package.json`]: JSON.stringify({
        version: "2.1.0",
      }),
      [`node_modules/${TREESITTER}/catalog.json`]: JSON.stringify({
        languages: [],
      }),
      "node_modules/kibi-lang-go/package.json": JSON.stringify({
        version: "1.0.0",
      }),
      "cmd/main.go": "package main\n",
    });
    execFileSync("git", ["init", "-q"], { cwd: root, stdio: "ignore" });
    execFileSync("git", ["add", "cmd", "package.json"], {
      cwd: root,
      stdio: "ignore",
    });
    expect(workspaceReferenceLanguageNote(root)).toBe(
      `1 Go source file(s); source proofs and symbols for them need ${TREESITTER}, which is installed but not activated: add this entry to package.json "kibi": { "plugins": [ {"package":"${TREESITTER}","capabilities":{"${REFS}":{"mode":"augment"},"${SYMBOLS}":{"mode":"augment"}}} ] }. Without it, references proofs on those files are refused.`,
    );
  });
});
