import { describe, expect, test } from "bun:test";
import type {
  ExtractedEntity,
  ExtractionResult,
} from "../../../src/extractors/markdown.js";
import { stagedFirmEditGateOptions } from "../../../src/public/impact/firm-edit-staged.js";
import type { StagedFile } from "../../../src/traceability/git-staged.js";
import type { ExtractedSymbol } from "../../../src/traceability/symbol-extract.js";

const REQ = ".kb/requirements/REQ-a.md";
const doc = (statement: string, status = "open") =>
  `---\nid: REQ-a\ntitle: A\nstatus: ${status}\nsemantic_text: ${statement}\n---\n\n${statement}\n`;

function requirement(): ExtractedEntity {
  return {
    id: "REQ-a",
    type: "req",
    title: "A",
    status: "open",
    source: REQ,
  } as ExtractedEntity;
}

function result(
  entity: Partial<ExtractedEntity>,
  relationships: ExtractionResult["relationships"] = [],
  sourceFile?: string,
): ExtractionResult {
  return {
    entity: entity as ExtractedEntity,
    relationships,
    ...(sourceFile ? { sourceFile } : {}),
  };
}

function options(
  extra: Partial<Parameters<typeof stagedFirmEditGateOptions>[0]> = {},
) {
  const files: Record<string, string> = { [REQ]: doc("Keys expire.") };
  return stagedFirmEditGateOptions({
    sourceFiles: [
      {
        path: "src/a.ts",
        status: "M",
        hunkRanges: [],
        content: "x",
        diffText: "@@ -3,2 +2,0 @@\n@@ -9 +8,2 @@\n",
      },
      { path: "src/b.ts", status: "M", hunkRanges: [], content: "y" },
      { path: "src/gone.ts", status: "D", hunkRanges: [] },
    ] as StagedFile[],
    extractAll: async (file) =>
      [{ name: `all-${file.path}` }] as unknown as ExtractedSymbol[],
    changedPaths: new Set(["src/a.ts"]),
    knowledge: [result(requirement())],
    readBaseKnowledge: () => {
      throw new Error("not read without a manifest change");
    },
    readChanged: (file) => files[file],
    readBase: (file) => files[file],
    readContent: () => "content",
    readReceipt: () => undefined,
    hasUnstagedChanges: () => false,
    ...extra,
  });
}

describe("stagedFirmEditGateOptions", () => {
  test("every symbol of each staged file with text, and where lines were only removed", async () => {
    const gate = await options();
    expect([...gate.symbolsByFile]).toEqual([
      ["src/a.ts", [{ name: "all-src/a.ts" }]],
      ["src/b.ts", [{ name: "all-src/b.ts" }]],
    ] as never);
    expect([...(gate.deletedAfterByFile ?? [])]).toEqual([
      ["src/a.ts", [2]],
      ["src/b.ts", []],
    ]);
    expect(gate.removedSymbols).toEqual([]);
    expect(gate.readContent("src/a.ts")).toBe("content");
    expect(gate.readReceipt("r")).toBeUndefined();
    expect(gate.hasUnstagedChanges?.("src/a.ts")).toBe(false);
    expect(gate.readRequirement("REQ-a")?.id).toBe("REQ-a");
    expect(gate.readRequirement("REQ-b")).toBeUndefined();
    expect(gate.readRequirementText?.(requirement())).toBe(doc("Keys expire."));
  });

  test("removed symbol records are read from the base when a manifest changed", async () => {
    for (const manifest of [".kb/symbols.yaml", ".kb/symbols.yml"]) {
      const gate = await options({
        changedPaths: new Set([manifest]),
        readBaseKnowledge: () => [
          result(
            { id: "SYM-gone", type: "symbol", title: "gone" },
            [{ type: "implements", from: "SYM-gone", to: "REQ-a" }],
            "src/a.ts",
          ),
        ],
      });
      expect(gate.removedSymbols).toEqual([
        { sourceFile: "src/a.ts", symbol: "gone", requirementIds: ["REQ-a"] },
      ]);
    }
  });

  test("a requirement counts as restated only when its statement, status or supersede changed", async () => {
    const changed = async (
      base: string | undefined,
      extra: Partial<Parameters<typeof stagedFirmEditGateOptions>[0]> = {},
      now = doc("Keys expire."),
    ) =>
      (
        await options({
          readChanged: (file) => (file === REQ ? now : undefined),
          readBase: (file) => (file === REQ ? base : undefined),
          ...extra,
        })
      ).requirementChanged(requirement());
    expect(await changed(doc("Keys expire."))).toBe(false);
    expect(
      await changed(
        doc("Keys expire."),
        {},
        `${doc("Keys expire.")}\n## Notes\n\nA note.\n`,
      ),
    ).toBe(false);
    expect(await changed(doc("Keys never expire."))).toBe(true);
    expect(await changed(doc("Keys expire.", "draft"))).toBe(true);
    expect(await changed(undefined)).toBe(true);
    // A base document that no longer parses has no status to compare.
    expect(await changed("---\ntitle: [\n---\n")).toBe(true);
    const superseding = result(
      { id: "REQ-b", type: "req", source: ".kb/requirements/REQ-b.md" },
      [{ type: "supersedes", from: "REQ-b", to: "REQ-a" }],
    );
    const other = result(
      { id: "REQ-c", type: "req", source: ".kb/requirements/REQ-c.md" },
      [
        { type: "supersedes", from: "REQ-c", to: "REQ-x" },
        { type: "relates_to", from: "REQ-c", to: "REQ-a" },
      ],
    );
    const knowledge = [result(requirement()), superseding, other];
    // An old supersede the change does not touch does not count.
    expect(await changed(doc("Keys expire."), { knowledge })).toBe(false);
    expect(
      await changed(doc("Keys expire."), {
        knowledge,
        changedPaths: new Set([".kb/requirements/REQ-b.md"]),
      }),
    ).toBe(true);
    expect(
      await changed(doc("Keys expire."), {
        knowledge,
        changedPaths: new Set([".kb/relationships/ab.yaml"]),
      }),
    ).toBe(true);
    expect(
      await changed(doc("Keys expire."), {
        knowledge,
        changedPaths: new Set([".kb/requirements/REQ-c.md"]),
      }),
    ).toBe(false);
  });
});
