import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pluginOffers } from "../../src/operations/bootstrap/plugin-offers.js";
import {
  PLUGIN_LANGUAGE_PACKS,
  PLUGIN_REFERENCE_LANGUAGES,
  pluginReferenceLanguage,
} from "../../src/operations/proof/code-languages.js";
import {
  describeReferenceLanguageSuggestion,
  pinnedPackVersions,
  referenceLanguageSuggestion,
  workspaceInstalledVersion,
  workspaceReferenceLanguageNote,
} from "../../src/plugins/reference-language-suggestion.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(tmpdir(), "kibi-reference-lang-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), content);
  }
  return root;
}

function gitTrack(root: string): void {
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "ignore" });
  git("init", "-q");
  git("add", "-A");
}

const manifest = (kibi?: unknown) =>
  JSON.stringify({ name: "sample", version: "1.0.0", private: true, kibi });

const TREESITTER = "kibi-plugin-treesitter";
const REFS = "kibi.reference-extractor.v1";
const SYMBOLS = "kibi.symbol-extractor.v2";

const symbolsOnly = {
  plugins: [
    {
      package: TREESITTER,
      capabilities: { [SYMBOLS]: { mode: "augment" as const } },
    },
  ],
};
const fullyActive = {
  plugins: [
    {
      package: TREESITTER,
      capabilities: {
        [SYMBOLS]: { mode: "augment" as const },
        [REFS]: { mode: "augment" as const },
      },
    },
  ],
};

/** A fake installed kibi-plugin-treesitter whose catalog pins pack versions. */
function fakeTreesitter(catalog: unknown): Record<string, string> {
  return {
    [`node_modules/${TREESITTER}/package.json`]: JSON.stringify({
      name: TREESITTER,
      version: "2.1.0",
    }),
    [`node_modules/${TREESITTER}/catalog.json`]:
      typeof catalog === "string" ? catalog : JSON.stringify(catalog),
  };
}

const fakePack = (name: string, manifestBody: unknown) => ({
  [`node_modules/${name}/package.json`]: JSON.stringify(manifestBody),
});

// executable_for TEST-kibi-tree-sitter-references
describe("plugin reference languages", () => {
  it("names the language of Go, Java, C# and Rust files and nothing else", () => {
    expect(PLUGIN_REFERENCE_LANGUAGES.map((language) => language.name)).toEqual(
      ["Go", "Java", "C#", "Rust"],
    );
    expect(
      ["a.go", "B.JAVA", "c.cs", "d.rs", "e.ts", "f.py", "g.rb"].map(
        pluginReferenceLanguage,
      ),
    ).toEqual(["Go", "Java", "C#", "Rust", null, null, null]);
  });

  it("maps every pack-hosted extension to exactly one pack", () => {
    const packFor = (file: string) =>
      PLUGIN_LANGUAGE_PACKS.filter((entry) => entry.pattern.test(file)).map(
        (entry) => entry.pack,
      );
    expect(packFor("x.hpp")).toEqual(["kibi-lang-cpp"]);
    expect(packFor("x.c")).toEqual(["kibi-lang-c"]);
    expect(packFor("main.tf")).toEqual(["kibi-lang-hcl"]);
    expect(packFor("stubs.pyi")).toEqual(["kibi-lang-python"]);
    expect(packFor("rules.pl")).toEqual(["kibi-lang-prolog"]);
    expect(packFor("run.sh")).toEqual(["kibi-lang-bash"]);
    expect(packFor("notes.md")).toEqual([]);
  });
});

// executable_for TEST-kibi-tree-sitter-language-packs
describe("installed and pinned pack versions", () => {
  it("reads the installed version of a package from the workspace", () => {
    const root = workspace({
      "package.json": manifest(),
      ...fakePack("kibi-lang-go", { name: "kibi-lang-go", version: "1.2.3" }),
      ...fakePack("kibi-lang-rust", { name: "kibi-lang-rust", version: 7 }),
      "node_modules/kibi-lang-java/package.json": "{ not json",
    });
    const installed = workspaceInstalledVersion(root);
    expect(installed("kibi-lang-go")).toBe("1.2.3");
    // A version that is not a string, an unreadable manifest, or no package at all.
    expect(installed("kibi-lang-rust")).toBeNull();
    expect(installed("kibi-lang-java")).toBeNull();
    expect(installed("kibi-lang-php")).toBeNull();
  });

  it("reads the pack versions the installed plugin's catalog pins", () => {
    expect(pinnedPackVersions(undefined)).toEqual(new Map());
    // No plugin installed.
    expect(
      pinnedPackVersions(workspace({ "package.json": manifest() })),
    ).toEqual(new Map());
    const root = workspace({
      "package.json": manifest(),
      ...fakeTreesitter({
        languages: [
          { id: "go", pack: "kibi-lang-go", packVersion: "1.0.0" },
          { id: "rust", pack: "kibi-lang-rust", packVersion: "1.1.0" },
          { id: "typescript" },
          { id: "java", pack: "kibi-lang-java" },
          { id: "php", pack: 3, packVersion: "1.0.0" },
        ],
      }),
    });
    expect(pinnedPackVersions(root)).toEqual(
      new Map([
        ["kibi-lang-go", "1.0.0"],
        ["kibi-lang-rust", "1.1.0"],
      ]),
    );
    expect(
      pinnedPackVersions(
        workspace({ "package.json": manifest(), ...fakeTreesitter({}) }),
      ),
    ).toEqual(new Map());
    expect(
      pinnedPackVersions(
        workspace({
          "package.json": manifest(),
          ...fakeTreesitter("{ broken"),
        }),
      ),
    ).toEqual(new Map());
  });
});

// executable_for TEST-kibi-tree-sitter-references
describe("reference language suggestion text", () => {
  it("asks for the plugin, both capabilities and the packs when the plugin is not listed", () => {
    const suggestion = referenceLanguageSuggestion(
      ["svc/Main.java", "svc/App.cs", "svc/AppTests.cs", "vendor/x.go"],
      {},
    );
    expect(suggestion).toEqual({
      package: TREESITTER,
      capabilities: [REFS, SYMBOLS],
      languages: [
        { name: "Java", files: 1 },
        { name: "C#", files: 1 },
      ],
      evidence: ["svc/Main.java", "svc/App.cs"],
      activeForSymbolsOnly: false,
      packs: ["kibi-lang-java", "kibi-lang-csharp"],
    });
  });

  it("asks for the plugin alone when every pack is installed", () => {
    const suggestion = referenceLanguageSuggestion(
      ["cmd/main.go"],
      {},
      () => "1.0.0",
    );
    if (suggestion === null) throw new Error("expected a suggestion");
    expect(suggestion.packs).toEqual([]);
    expect(describeReferenceLanguageSuggestion(suggestion)).toBe(
      `1 Go source file(s); source proofs and symbols for them need ${TREESITTER}: add it to devDependencies and ${TREESITTER} to package.json kibi.plugins with "${REFS}": { "mode": "augment" }, "${SYMBOLS}": { "mode": "augment" }`,
    );
  });

  it("asks only for the proof capability when the plugin reads symbols already", () => {
    const withPacks = referenceLanguageSuggestion(
      ["src/lib.rs", "src/main.rs"],
      symbolsOnly,
      () => null,
      new Map([["kibi-lang-rust", "1.1.0"]]),
    );
    if (withPacks === null) throw new Error("expected a suggestion");
    expect(withPacks.capabilities).toEqual([REFS]);
    expect(withPacks.activeForSymbolsOnly).toBe(true);
    expect(describeReferenceLanguageSuggestion(withPacks)).toBe(
      `2 Rust source file(s); ${TREESITTER} is active for symbols but not for source proofs: add "${REFS}": { "mode": "augment" } to its package.json kibi.plugins entry, and install the grammar pack(s) kibi-lang-rust@1.1.0`,
    );

    const packsInstalled = referenceLanguageSuggestion(
      ["src/lib.rs"],
      symbolsOnly,
      () => "1.1.0",
    );
    if (packsInstalled === null) throw new Error("expected a suggestion");
    expect(describeReferenceLanguageSuggestion(packsInstalled)).toBe(
      `1 Rust source file(s); ${TREESITTER} is active for symbols but not for source proofs: add "${REFS}": { "mode": "augment" } to its package.json kibi.plugins entry`,
    );
  });

  it("says nothing when the plugin is active and every pack is installed", () => {
    expect(
      referenceLanguageSuggestion(["src/lib.rs"], fullyActive, () => "1.0.0"),
    ).toBeNull();
  });
});

// executable_for TEST-kibi-tree-sitter-references, TEST-kibi-tree-sitter-language-packs
describe("the workspace note for kibi init and kibi doctor", () => {
  it("is silent outside a git work tree or with an unreadable kibi block", () => {
    expect(
      workspaceReferenceLanguageNote(
        workspace({ "cmd/main.go": "package main\n" }),
      ),
    ).toBeNull();
    const broken = workspace({
      "package.json": manifest("not an object"),
      "cmd/main.go": "package main\n",
    });
    gitTrack(broken);
    expect(workspaceReferenceLanguageNote(broken)).toBeNull();
  });

  it("is silent when nothing is missing", () => {
    const root = workspace({
      "package.json": manifest(),
      "src/index.ts": "export {};\n",
    });
    gitTrack(root);
    expect(workspaceReferenceLanguageNote(root)).toBeNull();
  });

  it("tells a project without package.json to create one for the plugin list", () => {
    const root = workspace({
      "cmd/main.go": "package main\n",
      "cmd/main_test.go": "package main\n",
    });
    gitTrack(root);
    expect(workspaceReferenceLanguageNote(root)).toBe(
      `1 Go source file(s); source proofs and symbols for them need ${TREESITTER} and the grammar pack(s) kibi-lang-go: add them to devDependencies and ${TREESITTER} to package.json kibi.plugins with "${REFS}": { "mode": "augment" }, "${SYMBOLS}": { "mode": "augment" }. This project has no package.json; create one that only holds Kibi's plugin list (npm init -y, then npm install -D ${TREESITTER} kibi-lang-go). Without it, references proofs on those files are refused.`,
    );
  });

  it("names the pinned packs a project with the plugin active still lacks", () => {
    const root = workspace({
      "package.json": manifest(fullyActive),
      ...fakeTreesitter({
        languages: [
          { id: "go", pack: "kibi-lang-go", packVersion: "1.0.0" },
          { id: "php", pack: "kibi-lang-php", packVersion: "1.0.0" },
        ],
      }),
      ...fakePack("kibi-lang-go", { name: "kibi-lang-go", version: "1.0.0" }),
      ...fakePack("kibi-lang-php", { name: "kibi-lang-php", version: "0.9.0" }),
      "cmd/main.go": "package main\n",
      "web/index.php": "<?php\n",
    });
    gitTrack(root);
    expect(workspaceReferenceLanguageNote(root)).toBe(
      `1 PHP source file(s); ${TREESITTER} reads them only with the grammar pack(s) kibi-lang-php@1.0.0 installed: npm install --save-dev kibi-lang-php@1.0.0. Without them, those files are refused for symbols and proofs.`,
    );
  });

  it("installs only the packs when the plugin is listed for symbols", () => {
    const root = workspace({ "src/lib.rs": "pub fn run() {}\n" });
    gitTrack(root);
    // A package.json the git index does not track, so the note still sees one.
    fs.writeFileSync(path.join(root, "package.json"), manifest(symbolsOnly));
    expect(workspaceReferenceLanguageNote(root)).toBe(
      `1 Rust source file(s); ${TREESITTER} is active for symbols but not for source proofs: add "${REFS}": { "mode": "augment" } to its package.json kibi.plugins entry, and install the grammar pack(s) kibi-lang-rust. Without it, references proofs on those files are refused.`,
    );
  });
});

function context(root: string): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-10-09T00:00:00Z"),
    fs: {
      ...nodeFilesystem,
      readFile: async (filePath) => fs.readFileSync(filePath, "utf8"),
    },
  } as OperationContext;
}

// executable_for TEST-kibi-tree-sitter-references
describe("the bootstrap offer for reference languages", () => {
  it("offers the plugin with both capabilities and the packs to install", async () => {
    const root = workspace({ "package.json": manifest() });
    expect(
      await pluginOffers(context(root), ["svc/Main.java", "svc/Main.cs"]),
    ).toEqual([
      {
        package: TREESITTER,
        capability: REFS,
        mode: "augment",
        alsoActivate: { [SYMBOLS]: "augment" },
        alsoInstall: ["kibi-lang-java", "kibi-lang-csharp"],
        reason: `1 Java, 1 C# source file(s); source proofs and symbols for them need ${TREESITTER} and the grammar pack(s) kibi-lang-java, kibi-lang-csharp: add them to devDependencies and ${TREESITTER} to package.json kibi.plugins with "${REFS}": { "mode": "augment" }, "${SYMBOLS}": { "mode": "augment" }`,
        fileCount: 2,
        evidence: ["svc/Main.java", "svc/Main.cs"],
      },
    ]);
  });

  it("offers only the proof capability, at the pinned pack versions, once symbols are active", async () => {
    const root = workspace({
      "package.json": manifest(symbolsOnly),
      ...fakeTreesitter({
        languages: [{ id: "go", pack: "kibi-lang-go", packVersion: "1.0.0" }],
      }),
      ...fakePack("kibi-lang-go", { name: "kibi-lang-go", version: "0.9.0" }),
    });
    const offers = await pluginOffers(context(root), ["cmd/a.go", "cmd/b.go"]);
    expect(offers).toHaveLength(1);
    const [offer] = offers;
    expect(offer?.capability).toBe(REFS);
    expect(offer?.alsoActivate).toBeUndefined();
    expect(offer?.alsoInstall).toEqual(["kibi-lang-go@1.0.0"]);
    expect(offer?.fileCount).toBe(2);
  });

  it("offers the proof capability without packs once they are installed, and nothing once active or declined", async () => {
    const root = workspace({
      "package.json": manifest(symbolsOnly),
      ...fakePack("kibi-lang-go", { name: "kibi-lang-go", version: "1.0.0" }),
    });
    const offers = await pluginOffers(context(root), ["cmd/a.go"]);
    expect(
      offers.map((offer) => [offer.capability, offer.alsoInstall]),
    ).toEqual([[REFS, undefined]]);
    // Only packs are missing: that is a doctor note, never an activation offer.
    const active = workspace({ "package.json": manifest(fullyActive) });
    expect(await pluginOffers(context(active), ["cmd/a.go"])).toEqual([]);
    const declined = workspace({
      "package.json": manifest({ declinedPlugins: [TREESITTER] }),
    });
    expect(await pluginOffers(context(declined), ["cmd/a.go"])).toEqual([]);
  });

  it("reads the kibi block leniently and offers nothing for sources it does not read", async () => {
    // Entries that are not plugin objects are skipped; one without
    // capabilities is listed but active for nothing yet.
    const lenient = workspace({
      "package.json": manifest({
        plugins: ["junk", { package: 3 }, { package: TREESITTER }],
        declinedPlugins: [5],
      }),
    });
    const [listed] = await pluginOffers(context(lenient), ["cmd/a.go"]);
    expect(listed?.capability).toBe(REFS);
    expect(listed?.alsoActivate).toBeUndefined();
    expect(listed?.reason).toContain("is active for symbols but not for");

    // An unreadable package.json declines nothing, so the full offer stands.
    const unreadable = workspace({ "package.json": "{ not json" });
    const [full] = await pluginOffers(context(unreadable), ["cmd/a.go"]);
    expect(full?.alsoActivate).toEqual({ [SYMBOLS]: "augment" });

    // A malformed kibi block is reported elsewhere; no offer is made into it.
    const malformed = workspace({
      "package.json": manifest(["not", "a", "block"]),
    });
    expect(await pluginOffers(context(malformed), ["cmd/a.go"])).toEqual([]);

    const ui = await pluginOffers(context(lenient), ["src/App.tsx"]);
    expect(ui.map((offer) => offer.package)).toEqual(["kibi-plugin-ui"]);
  });
});
