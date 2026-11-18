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
    extractBase: async () => [],
    changedPaths: new Set(["src/a.ts"]),
    knowledge: [result(requirement())],
    readBaseKnowledge: () => {
      throw new Error("not read without a manifest or shard change");
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

  test("a kept record whose declaration the change removes is judged as removed", async () => {
    const record = (title: string, file: string, to = "REQ-a") =>
      result(
        { id: `SYM-${title}`, type: "symbol", title },
        [
          { type: "implements", from: `SYM-${title}`, to },
          { type: "implements", from: `SYM-${title}`, to },
        ],
        file,
      );
    const sourceFiles = [
      { path: "src/a.ts", status: "M", hunkRanges: [], content: "x" },
      { path: "src/gone.ts", status: "D", hunkRanges: [] },
      {
        path: "src/new.ts",
        oldPath: "src/old.ts",
        status: "R",
        hunkRanges: [],
        content: "z",
      },
    ] as StagedFile[];
    const knowledge = [
      result(requirement()),
      // Still declared where its record points: not removed.
      record("kept", "src/a.ts"),
      // No longer declared, or no longer exported.
      record("hidden", "src/a.ts"),
      // Not declared before the change either: an undetected form.
      record("unseen", "src/a.ts"),
      // A record that implements no requirement is not firm code.
      result(
        { id: "SYM-plain", type: "symbol", title: "plain" },
        [{ type: "implements", from: "SYM-plain", to: "FACT-x" }],
        "src/a.ts",
      ),
      // Its file is deleted.
      record("dropped", "src/gone.ts"),
      // Its file is renamed away from the record.
      record("stray", "src/old.ts"),
    ];
    const asked: string[] = [];
    const gate = await options({
      sourceFiles,
      knowledge,
      extractAll: async (file) =>
        (file.path === "src/a.ts"
          ? [{ name: "kept" }, { name: "plain" }]
          : [{ name: "stray" }]) as unknown as ExtractedSymbol[],
      extractBase: async (file) => {
        asked.push(file.oldPath ?? file.path);
        return [
          { name: "kept" },
          { name: "hidden" },
          { name: "plain" },
          { name: "dropped" },
          { name: "stray" },
        ] as unknown as ExtractedSymbol[];
      },
    });
    expect(gate.removedSymbols).toEqual([
      { sourceFile: "src/a.ts", symbol: "hidden", requirementIds: ["REQ-a"] },
      {
        sourceFile: "src/gone.ts",
        symbol: "dropped",
        requirementIds: ["REQ-a"],
      },
      { sourceFile: "src/old.ts", symbol: "stray", requirementIds: ["REQ-a"] },
    ]);
    expect(asked).toEqual(["src/a.ts", "src/gone.ts", "src/old.ts"]);

    // A record the change moves to the renamed file, which declares it, is
    // not removed; the base is read once, from the changed manifest.
    let reads = 0;
    const moved = await options({
      sourceFiles: [sourceFiles[2] as StagedFile],
      knowledge: [result(requirement()), record("stray", "src/new.ts")],
      changedPaths: new Set([".kb/symbols.yaml"]),
      readBaseKnowledge: () => {
        reads += 1;
        return [record("stray", "src/old.ts")];
      },
      extractAll: async () =>
        [{ name: "stray" }] as unknown as ExtractedSymbol[],
      extractBase: async () =>
        [{ name: "stray" }] as unknown as ExtractedSymbol[],
    });
    expect(moved.removedSymbols).toEqual([]);
    expect(reads).toBe(1);

    // A shard change reads the base too; a file with no firm record there
    // is not extracted.
    asked.length = 0;
    reads = 0;
    const shard = await options({
      changedPaths: new Set([".kb/relationships/ab.yaml"]),
      readBaseKnowledge: () => {
        reads += 1;
        return [record("hidden", "src/a.ts")];
      },
      knowledge: [result(requirement())],
      extractBase: async (file) => {
        asked.push(file.path);
        return [];
      },
    });
    expect(shard.removedSymbols).toEqual([]);
    expect(reads).toBe(1);
    expect(asked).toEqual([]);
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
          readBaseKnowledge: () => [],
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

  test("a requirement a current requirement in the change supersedes is replaced", async () => {
    const successor = (status: string | undefined, to = "REQ-a") =>
      result({ id: "REQ-b", type: "req", ...(status ? { status } : {}) }, [
        { type: "supersedes", from: "REQ-b", to },
      ]);
    const supersededBy = async (knowledge: ExtractionResult[]) =>
      (await options({ knowledge })).supersededBy?.("REQ-a");
    expect(await supersededBy([result(requirement()), successor("open")])).toBe(
      "REQ-b",
    );
    expect(await supersededBy([result(requirement()), successor(undefined)])).toBe(
      "REQ-b",
    );
    // A retired successor replaces nothing, nor does a link to another id,
    // a link that is not a supersede, or a non-requirement.
    expect(
      await supersededBy([result(requirement()), successor("deprecated")]),
    ).toBeUndefined();
    expect(
      await supersededBy([result(requirement()), successor("open", "REQ-x")]),
    ).toBeUndefined();
    expect(
      await supersededBy([
        result({ id: "REQ-b", type: "req" }, [
          { type: "relates_to", from: "REQ-b", to: "REQ-a" },
        ]),
      ]),
    ).toBeUndefined();
    expect(
      await supersededBy([
        result({ id: "ADR-b", type: "adr" }, [
          { type: "supersedes", from: "ADR-b", to: "REQ-a" },
        ]),
      ]),
    ).toBeUndefined();
    expect(
      await supersededBy([
        result({ ...requirement() }, [
          { type: "supersedes", from: "REQ-a", to: "REQ-a" },
        ]),
      ]),
    ).toBeUndefined();
  });
});
