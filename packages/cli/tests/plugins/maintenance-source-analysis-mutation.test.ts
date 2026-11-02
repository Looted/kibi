// executable_for TEST-kibi-tree-sitter-language-packs
import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  languagePackWaiver,
  readSnapshotSourceConfig,
} from "../../src/plugins/maintenance-source-analysis.js";
import type { GitChangeSnapshot } from "../../src/traceability/git-change-snapshot.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

describe("language pack waiver", () => {
  it("waives a file under a generated path of the project", () => {
    const root = fs.mkdtempSync(path.join(tmpdir(), "kibi-waiver-m-"));
    roots.push(root);
    const waiver = languagePackWaiver(root, { generatedPaths: ["gen/**"] });
    expect(waiver("gen/parser.rs", "fn x() {}\n", "kibi-lang-rust")).toBe(
      "gen/parser.rs is generated (linguist-generated or a generator header), so it does not need kibi-lang-rust",
    );
    expect(waiver("src/main.rs", "fn x() {}\n", "kibi-lang-rust")).toBeNull();
  });
});

const ANALYZER = {
  package: "kibi-plugin-treesitter",
  capabilities: { "kibi.symbol-extractor.v2": { mode: "augment" } },
};

/** A snapshot whose trees hold these package.json kibi sections (null: no package.json). */
function snapshot(
  trees: Record<string, Record<string, unknown> | null>,
  changed: string[],
): GitChangeSnapshot {
  return {
    headTree: "head",
    baseTree: "base",
    inventory: changed.map((file) => ({ path: file })),
    readGit: (args: string[]) => {
      if (args[0] === "ls-tree") {
        const kibi = trees[args[1] as string];
        return Buffer.from(
          kibi === null ? "" : "100644 blob 0123\tpackage.json\n",
        );
      }
      const tree = (args[1] as string).split(":")[0] as string;
      return Buffer.from(JSON.stringify({ name: "p", kibi: trees[tree] }));
    },
  } as unknown as GitChangeSnapshot;
}

describe("snapshot source configuration", () => {
  it("passes on the head's plugins, and lists only what is set", () => {
    expect(
      readSnapshotSourceConfig(
        snapshot({ head: {}, base: null }, ["package.json"]),
      ),
    ).toEqual({ plugins: [] });
    expect(
      readSnapshotSourceConfig(
        snapshot(
          {
            head: {
              plugins: [ANALYZER],
              declinedLanguagePacks: ["kibi-lang-go"],
              generatedPaths: ["gen/**"],
            },
            base: null,
          },
          ["package.json"],
        ),
      ),
    ).toEqual({
      plugins: [ANALYZER],
      declinedLanguagePacks: ["kibi-lang-go"],
      generatedPaths: ["gen/**"],
    });
  });

  it("judges a source change by the generated paths committed before it", () => {
    const head = {
      declinedLanguagePacks: ["kibi-lang-go"],
      generatedPaths: ["gen/**"],
    };
    expect(
      readSnapshotSourceConfig(
        snapshot({ head, base: {} }, ["package.json", "src/a.go"]),
      ),
    ).toEqual({ plugins: [] });
    expect(
      readSnapshotSourceConfig(
        snapshot({ head, base: { ...head } }, ["src/a.go"]),
      ),
    ).toEqual({ plugins: [], ...head });
  });
});
