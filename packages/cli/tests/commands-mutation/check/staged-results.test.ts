import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  type StagedHarness,
  entry,
  side,
  stagedHarness,
} from "./staged-harness.js";

let h: StagedHarness;
const gitCalls: string[][] = [];
beforeEach(() => {
  h = stagedHarness();
  gitCalls.length = 0;
  h.world.git = (args) => {
    gitCalls.push([...args]);
    if (args[0] === "show") return `blob ${args[1]}`;
    if (args[0] === "ls-tree") return "";
    throw new Error(`unexpected git ${args.join(" ")}`);
  };
});
afterEach(() => h.restore());

const REQ = ".kb/requirements/REQ-1.md";
const src = (filePath = "src/a.ts", extra: Record<string, unknown> = {}) =>
  entry(filePath, { analysisDepth: "symbol", ...extra });
const symbolEntity = (id: string, sourceFile?: string) => ({
  entity: { id, type: "symbol", title: id },
  relationships: [],
  ...(sourceFile ? { sourceFile } : {}),
});
const changedManifest = (ids: string[]) => () => ({
  path: ".kb/symbols.yaml",
  changedEntityIds: ids,
  entries: [],
});

describe("snapshot symbols for granularity", () => {
  test("active and staged-source symbols are read from the head tree", async () => {
    h.world.inventory = [
      src("src/a.ts"),
      entry(REQ, { analysisDepth: "metadata", content: "---\nid: R\n---\n" }),
    ];
    h.world.entities = [
      symbolEntity("SYM-A", "src/a.ts"),
      symbolEntity("SYM-A2", "src/a.ts"),
      symbolEntity("SYM-ACTIVE", "src/active.ts"),
      symbolEntity("SYM-NOFILE"),
      symbolEntity("SYM-OTHER", "src/other.ts"),
      symbolEntity("SYM-REG", "src/reg.ts"),
    ];
    h.set(
      "collectStagedAuthoredSymbolsManifestEvidence",
      changedManifest(["SYM-ACTIVE", "SYM-NOFILE", "SYM-REG"]),
    );
    h.world.git = (args) => {
      gitCalls.push([...args]);
      if (args[0] === "ls-tree")
        return args[3] === ":(literal)src/reg.ts"
          ? "100755 blob abc\tsrc/reg.ts\n"
          : "";
      if (args[0] === "show") return `blob ${args[1]}`;
      throw new Error(`unexpected git ${args.join(" ")}`);
    };
    const extracted: Array<[string, string, unknown]> = [];
    h.set("extractSymbolsFromStagedFileAsync", async (file, _lookup, deps) => {
      const answer =
        file.path === "src/reg.ts"
          ? await deps.analyzeText("src/reg.ts", "text")
          : await deps.analyzeText();
      extracted.push([file.path, file.content, answer]);
      expect(file.status).toBe("M");
      return [
        {
          name: `sym-${file.path}`,
          reqLinks: [],
          location: { file: file.path, startLine: 1, endLine: 1 },
        },
      ];
    });
    h.world.analysis = new Map([["src/a.ts", { after: side("ok") }]]);
    let granularity: Record<string, unknown> = {};
    h.set("createSymbolGranularityDiagnostics", (options) => {
      granularity = options;
      return [];
    });
    let quality: Record<string, unknown> = {};
    h.set("createSymbolQualityDiagnostics", (options) => {
      quality = options;
      return [];
    });
    await h.run();
    expect(extracted).toEqual([
      [
        "src/a.ts",
        "content of src/a.ts",
        h.world.analysis.get("src/a.ts")?.after,
      ],
      ["src/a.ts", "", h.world.analysis.get("src/a.ts")?.after],
      [
        "src/reg.ts",
        "blob HEAD:src/reg.ts",
        { analyzed: "src/reg.ts", text: "text" },
      ],
    ]);
    const hunks = h.calls.extractSymbolsFromStagedFileAsync
      ?.slice(1)
      .map((call) => (call[0] as { hunkRanges: unknown }).hunkRanges);
    expect(hunks).toEqual([
      [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
      [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
    ]);
    expect(gitCalls.filter((args) => args[0] === "ls-tree")).toEqual([
      ["ls-tree", "HEAD", "--", ":(literal)src/active.ts"],
      ["ls-tree", "HEAD", "--", ":(literal)src/reg.ts"],
    ]);
    const bySource = granularity.sourceSymbolsByFile as Map<string, unknown>;
    expect([...bySource.entries()]).toEqual([
      [
        "src/a.ts",
        [
          {
            name: "sym-src/a.ts",
            reqLinks: [],
            location: { file: "src/a.ts", startLine: 1, endLine: 1 },
          },
        ],
      ],
      ["src/active.ts", []],
      [
        "src/reg.ts",
        [
          {
            name: "sym-src/reg.ts",
            reqLinks: [],
            location: { file: "src/reg.ts", startLine: 1, endLine: 1 },
          },
        ],
      ],
    ]);
    expect(
      (granularity.manifestResults as Array<{ entity: { id: string } }>).map(
        (result) => result.entity.id,
      ),
    ).toEqual(["SYM-A", "SYM-A2", "SYM-ACTIVE", "SYM-NOFILE", "SYM-REG"]);
    expect(granularity.activeEntityIds).toEqual(
      new Set(["SYM-ACTIVE", "SYM-NOFILE", "SYM-REG"]),
    );
    expect(quality.activeEntityIds).toEqual(granularity.activeEntityIds);
    expect(quality.manifestResults).toBe(granularity.manifestResults);
    expect(quality.symbolsByFile).toBe(granularity.symbolsByFile);
    expect([
      ...(granularity.sourceContentByFile as Map<string, string>),
    ]).toEqual([
      ["src/a.ts", "content of src/a.ts"],
      ["src/reg.ts", "blob HEAD:src/reg.ts"],
    ]);
    expect(h.calls.createSemanticReviewDiagnostics?.[0]).toEqual([
      { symbolsByFile: granularity.symbolsByFile },
    ]);
    expect(
      (
        h.calls.createStagedEntityIdStyleDiagnostics?.[0]?.[0] as Array<{
          path: string;
        }>
      ).map((file) => file.path),
    ).toEqual([REQ]);
  });

  test("without active records no active set is passed", async () => {
    h.world.inventory = [src(), src("src/b.ts", { content: undefined })];
    const found = { name: "a", reqLinks: [] };
    h.set("extractSymbolsFromStagedFileAsync", async (file) =>
      file.path === "src/a.ts" ? [found] : [],
    );
    let granularity: Record<string, unknown> = {};
    let quality: Record<string, unknown> = {};
    h.set("createSymbolGranularityDiagnostics", (options) => {
      granularity = options;
      return [];
    });
    h.set("createSymbolQualityDiagnostics", (options) => {
      quality = options;
      return [];
    });
    await h.run();
    expect("activeEntityIds" in granularity).toBe(false);
    expect([...(granularity.symbolsByFile as Map<string, unknown>)]).toEqual([
      ["src/a.ts", [found]],
      ["src/b.ts", []],
    ]);
    expect([
      ...(granularity.sourceContentByFile as Map<string, unknown>),
    ]).toEqual([["src/a.ts", "content of src/a.ts"]]);
    expect("activeEntityIds" in quality).toBe(false);
  });

  test("the firm-edit gate reads the staged change: every symbol, both trees and unstaged edits", async () => {
    h.world.inventory = [
      src(),
      entry(REQ),
      entry("src/new.ts", { oldPath: "src/old.ts", status: "R" }),
      entry("src/gone.ts", { status: "D", content: undefined }),
      entry("src/vendored.ts", {
        status: "D",
        disposition: "skipped",
        content: undefined,
      }),
    ];
    h.world.analysis = new Map([
      ["src/a.ts", { after: side("ok"), before: side("was") }],
    ]);
    const requirement = { id: "REQ-1", type: "req", source: REQ };
    h.world.entities = [{ entity: requirement, relationships: [] }];
    let input: Record<string, (...args: never[]) => unknown> = {};
    h.set("stagedFirmEditGateOptions", async (options) => {
      input = options;
      return { marker: true };
    });
    let gate: unknown;
    h.set("createFirmEditGateDiagnostics", (options) => {
      gate = options;
      return [];
    });
    const extracted: Array<[string, string, unknown]> = [];
    h.set("extractSymbolsFromStagedFileAsync", async (file, _lookup, deps) => {
      extracted.push([
        file.path,
        file.status,
        await deps.analyzeText(file.path, file.content),
      ]);
      return [];
    });
    await h.run();
    expect(gate).toEqual({ marker: true });
    expect(input.knowledge).toBe(h.world.entities as never);
    expect([...(input.changedPaths as unknown as Set<string>)]).toEqual([
      "src/a.ts",
      REQ,
      "src/new.ts",
      "src/old.ts",
      "src/gone.ts",
      "src/vendored.ts",
    ]);
    extracted.length = 0;
    await (input.extractAll as (file: unknown) => Promise<unknown>)({
      path: "src/a.ts",
      status: "M",
    });
    await (input.extractAll as (file: unknown) => Promise<unknown>)({
      path: "src/none.ts",
      status: "M",
    });
    // Every declaration is kept, each with the hunks it owns.
    expect(extracted).toEqual([
      ["src/a.ts", "A", h.world.analysis.get("src/a.ts")?.after],
      ["src/none.ts", "A", null],
    ]);
    expect((input.readContent as (file: string) => unknown)("src/a.ts")).toBe(
      "content of src/a.ts",
    );
    // Every staged entry goes to the gate with no text, so a deleted,
    // skipped or renamed-away file is judged by its base declarations.
    expect(input.unreadFiles as unknown).toEqual([
      { path: "src/a.ts", status: "M", hunkRanges: [] },
      { path: REQ, status: "M", hunkRanges: [] },
      {
        path: "src/new.ts",
        oldPath: "src/old.ts",
        status: "R",
        hunkRanges: [],
      },
      { path: "src/gone.ts", status: "D", hunkRanges: [] },
      { path: "src/vendored.ts", status: "D", hunkRanges: [] },
    ]);
    const gitCalls: string[][] = [];
    h.world.git = (args) => {
      gitCalls.push([...args]);
      if (args[0] === "show") return `blob ${args[1]}`;
      if (args[0] === "diff") return args[3]?.endsWith("dirty.ts") ? "x\n" : "";
      throw new Error("unexpected");
    };
    const call = (name: string, value: string) =>
      (input[name] as (value: string) => unknown)(value);
    expect(call("readChanged", REQ)).toBe(`blob HEAD:${REQ}`);
    expect(call("readBase", REQ)).toBe(`blob BASE:${REQ}`);
    expect(call("readReceipt", "r.json")).toBe("blob HEAD:r.json");
    // The base declarations come from the base tree, at the old path of a
    // rename, analyzed as before the change; a file the change did not
    // analyze (skipped, or renamed to a path that is not source) has its
    // base text analyzed here.
    extracted.length = 0;
    const fromBase = input.extractBase as (file: unknown) => Promise<unknown>;
    await fromBase({ path: "src/a.ts", status: "M" });
    await fromBase({ path: "src/new.ts", oldPath: "src/old.ts", status: "R" });
    expect(extracted).toEqual([
      ["src/a.ts", "A", h.world.analysis.get("src/a.ts")?.before],
      [
        "src/old.ts",
        "A",
        { analyzed: "src/old.ts", text: "blob BASE:src/old.ts" },
      ],
    ]);
    expect(gitCalls.slice(-2)).toEqual([
      ["show", "BASE:src/a.ts"],
      ["show", "BASE:src/old.ts"],
    ]);
    expect(call("hasUnstagedChanges", "src/dirty.ts")).toBe(true);
    expect(call("hasUnstagedChanges", "src/a.ts")).toBe(false);
    expect(gitCalls.at(-1)).toEqual([
      "diff",
      "--name-only",
      "--",
      ":(literal)src/a.ts",
    ]);
    let base: unknown[] = [];
    h.set("readSnapshotKnowledge", (_git, tree) => {
      base = [tree];
      return [{ tree }];
    });
    expect((input.readBaseKnowledge as () => unknown)()).toEqual([
      { tree: "BASE" },
    ]);
    expect(base).toEqual(["BASE"]);
    h.set("readSnapshotKnowledge", () => {
      throw new Error("base does not compile");
    });
    expect((input.readBaseKnowledge as () => unknown)()).toEqual([]);
    h.world.git = () => {
      throw new Error("not in the tree");
    };
    expect(call("readChanged", REQ)).toBeUndefined();
    expect(call("readBase", REQ)).toBeUndefined();
    expect(call("readReceipt", "r.json")).toBeUndefined();
    expect(await fromBase({ path: "src/a.ts", status: "M" })).toEqual([]);
    expect(call("hasUnstagedChanges", "src/a.ts")).toBe(false);
  });

  test("a snapshot source that is not a regular file is an error", async () => {
    h.world.inventory = [src()];
    h.world.entities = [symbolEntity("SYM-L", "src/link.ts")];
    h.set(
      "collectStagedAuthoredSymbolsManifestEvidence",
      changedManifest(["SYM-L"]),
    );
    h.world.git = (args) =>
      args[0] === "ls-tree" ? "120000 blob abc\tsrc/link.ts\n" : "x";
    expect(await h.run()).toBe(1);
    expect(h.output().operationalError).toBe(
      "Error running staged validation: Snapshot symbol source is not a regular file: src/link.ts",
    );
  });

  test.each(["100644 blob abc\tsrc/r.ts\n", " 100644 blob x", "100600 blob x"])(
    "ls-tree entry %p",
    async (lsTree) => {
      h.world.inventory = [src()];
      h.world.entities = [symbolEntity("SYM-R", "src/r.ts")];
      h.set(
        "collectStagedAuthoredSymbolsManifestEvidence",
        changedManifest(["SYM-R"]),
      );
      h.world.git = (args) => (args[0] === "ls-tree" ? lsTree : "body");
      const exit = await h.run();
      expect(exit).toBe(lsTree.startsWith("100644") ? 0 : 1);
    },
  );
});

describe("staged rule run", () => {
  test("changed symbols run the rules in a temporary store", async () => {
    h.world.inventory = [src()];
    h.world.entities = [symbolEntity("SYM-ACTIVE", "src/x.ts")];
    h.set(
      "collectStagedAuthoredSymbolsManifestEvidence",
      changedManifest(["SYM-ACTIVE"]),
    );
    const symbols = [{ name: "a", reqLinks: [] }];
    h.set("extractSymbolsFromStagedFileAsync", async (file) =>
      file.path === "src/a.ts" ? symbols : [],
    );
    let copied = "";
    h.set("consultOverlay", async (context) => {
      copied = readFileSync(
        path.join(context.kbPath, "changed_symbols.pl"),
        "utf8",
      );
      expect(readFileSync(context.overlayPath, "utf8")).toBe(
        "overlay_facts.\n",
      );
    });
    expect(await h.run({ minLinks: "3" })).toBe(0);
    expect(copied).toBe("overlay_facts.\n");
    expect(h.calls.createTempKb).toEqual([[]]);
    const context = (await h.calls.consultOverlay?.[0]?.[0]) as {
      prolog: unknown;
      tempDir: string;
    };
    expect(h.calls.projectStagedEntities?.[0]).toEqual([
      context.prolog,
      h.world.entities,
    ]);
    expect(h.calls.createOverlayFacts?.[0]).toEqual([symbols]);
    expect(h.calls.validateStagedSymbols?.[0]).toEqual([
      { minLinks: 3, prolog: context.prolog },
    ]);
    expect(h.calls.validateStagedSymbolCoverage?.[0]).toEqual([
      { prolog: context.prolog, extraSymbolIds: ["SYM-ACTIVE"] },
    ]);
    expect(h.calls.cleanupTempKb).toEqual([[context.tempDir]]);
    expect(h.calls.assertUnchanged).toHaveLength(1);
  });

  test("at level remember the staged rules skip symbol coverage", async () => {
    h.world.inventory = [src()];
    h.set("extractSymbolsFromStagedFileAsync", async (file) =>
      file.path === "src/a.ts" ? [{ name: "a", reqLinks: [] }] : [],
    );
    h.set("readKibiLevel", () => ({ level: "remember", source: "default" }));
    expect(await h.run()).toBe(0);
    expect(h.calls.validateStagedSymbols).toHaveLength(1);
    expect(h.calls.validateStagedSymbolCoverage).toBeUndefined();
  });

  test("active manifest records alone run the rules", async () => {
    h.world.inventory = [src()];
    h.world.entities = [symbolEntity("SYM-ACTIVE", "src/x.ts")];
    h.set(
      "collectStagedAuthoredSymbolsManifestEvidence",
      changedManifest(["SYM-ACTIVE"]),
    );
    expect(await h.run()).toBe(0);
    expect(h.calls.createTempKb).toHaveLength(1);
    expect(h.calls.createOverlayFacts?.[0]).toEqual([[]]);
  });

  test("the link minimum defaults to one", async () => {
    h.world.inventory = [src()];
    h.set("extractSymbolsFromStagedFileAsync", async () => [
      { name: "a", reqLinks: [] },
    ]);
    await h.run();
    await h.run({ minLinks: 2 });
    expect(
      h.calls.validateStagedSymbols?.map(
        (call) => (call[0] as { minLinks: number }).minLinks,
      ),
    ).toEqual([1, 2]);
  });

  test("without changed symbols no store is made", async () => {
    h.world.inventory = [src()];
    expect(await h.run()).toBe(0);
    expect(h.calls.createTempKb).toBeUndefined();
    expect(h.calls.assertUnchanged).toHaveLength(1);
  });

  test("a failure in the rule run cleans the store, even if cleanup fails", async () => {
    h.world.inventory = [src()];
    h.world.snapshot.mergeInherited = ["m"];
    h.set("extractSymbolsFromStagedFileAsync", async () => [
      { name: "a", reqLinks: [] },
    ]);
    h.set("validateStagedSymbols", async () => {
      throw new Error("rules down");
    });
    h.set("cleanupTempKb", async () => {
      throw new Error("already gone");
    });
    expect(await h.run()).toBe(1);
    expect(h.calls.cleanupTempKb).toHaveLength(1);
    expect(h.output()).toMatchObject({
      messages: [],
      operationalError: "Error running staged validation: rules down",
    });
  });

  test("a failure before the store needs no cleanup", async () => {
    h.world.inventory = [src()];
    h.set("collectStagedKibiDiagnostics", () => {
      throw new Error("early");
    });
    expect(await h.run()).toBe(1);
    expect(h.calls.cleanupTempKb).toBeUndefined();
    expect(h.output().operationalError).toBe(
      "Error running staged validation: early",
    );
  });
});

describe("staged verdicts", () => {
  const withSymbols = () => {
    h.world.inventory = [src()];
    h.set("extractSymbolsFromStagedFileAsync", async () => [
      { name: "a", reqLinks: [] },
    ]);
  };
  const diagnostic = (blocking: boolean) => ({
    severity: "error",
    id: blocking ? "block" : "advise",
    message: "M",
    files: [],
    docs: [],
    suggestion: "S",
    blocking,
  });

  test("every violation kind is reported with its section", async () => {
    withSymbols();
    h.set("validateStagedSymbols", async () => [{ v: "raw" }]);
    h.set("validateStagedSymbolCoverage", async () => [{ v: "cov" }]);
    h.set("collectIntroducedEntityContextViolations", () => [{ v: "ctx" }]);
    h.set("collectStagedKibiDiagnostics", () => [diagnostic(false)]);
    expect(await h.run()).toBe(1);
    expect(h.output()).toMatchObject({
      violations: [{ v: "raw" }, { v: "cov" }, { v: "ctx" }],
      qualityDiagnostics: [diagnostic(false)],
      messages: [
        "[ERROR advise] M\n  Suggestion: S",
        "consistency entity context 1",
        "coverage 1",
        "violations 1",
      ],
    });
    expect(h.calls.assertUnchanged).toHaveLength(1);
    expect(await h.run({ dryRun: true })).toBe(0);
  });

  test.each([
    ["raw", "validateStagedSymbols", ["violations 1"]],
    ["coverage", "validateStagedSymbolCoverage", ["coverage 1"]],
  ])("%s violations alone are reported", async (_kind, name, messages) => {
    withSymbols();
    h.set(name, async () => [{ v: 1 }]);
    expect(await h.run()).toBe(1);
    expect(h.output().messages).toEqual(messages);
  });

  test("owner findings come first and stand for the findings they merge", async () => {
    withSymbols();
    const owner = { blocks: "commit", symbol: "a" };
    const raw = [{ v: "raw" }];
    const kept = diagnostic(true);
    h.set("validateStagedSymbols", async () => raw);
    h.set("collectStagedKibiDiagnostics", () => [diagnostic(false), kept]);
    h.world.entities = [
      {
        entity: { id: "REQ-a", title: "A", status: "open" },
        relationships: [],
      },
    ];
    h.set("analyzeStagedFileCoverage", () => ({
      version: 1,
      files: [{ path: "src/a.ts", requirementIds: ["REQ-a"] }],
      diagnostics: [],
    }));
    h.set("collectOwnerFindings", () => [owner]);
    h.set("withoutOwnedCauses", () => ({
      diagnostics: [kept],
      traceability: [],
    }));
    expect(await h.run()).toBe(1);
    expect(h.output()).toMatchObject({
      violations: raw,
      qualityDiagnostics: [diagnostic(false), kept],
      ownerFindings: [owner],
      messages: ["owners 1", "[ERROR block] M\n  Suggestion: S"],
    });
    const [input] = h.calls.collectOwnerFindings?.[0] as [
      {
        traceability: unknown;
        candidatesByFile: Map<string, string[]>;
        readRequirement: (id: string) => unknown;
        testsFor: (file: string, req: string) => unknown;
        takenIds: unknown;
        writtenRecords: unknown;
      },
    ];
    expect(input.traceability).toBe(raw);
    expect(input.writtenRecords).toEqual([]);
    expect(input.takenIds).toEqual(
      (h.world.entities as Array<{ entity: { id: string } }>).map(
        (result) => result.entity.id,
      ),
    );
    expect([...input.candidatesByFile]).toEqual([["src/a.ts", ["REQ-a"]]]);
    expect(input.readRequirement("REQ-a")).toEqual({
      id: "REQ-a",
      title: "A",
      status: "open",
    });
    expect(input.readRequirement("REQ-none")).toBeUndefined();
    input.testsFor("src/a.ts", "REQ-a");
    expect(h.calls.coveringTests?.[0]).toEqual([
      h.world.entities,
      "src/a.ts",
      "REQ-a",
    ]);
  });

  test("owner findings alone fail through the diagnostics branch", async () => {
    withSymbols();
    const owner = { blocks: "commit", symbol: "a" };
    h.set("collectStagedKibiDiagnostics", () => [diagnostic(true)]);
    h.set("collectOwnerFindings", () => [owner]);
    h.set("withoutOwnedCauses", () => ({ diagnostics: [], traceability: [] }));
    expect(await h.run()).toBe(1);
    expect(h.output()).toMatchObject({
      ownerFindings: [owner],
      messages: ["owners 1"],
    });
  });

  test("context violations without symbols skip the snapshot check", async () => {
    h.world.inventory = [entry(REQ, { analysisDepth: "metadata" })];
    h.set("collectIntroducedEntityContextViolations", () => [{ v: "ctx" }]);
    expect(await h.run()).toBe(1);
    expect(h.output().messages).toEqual(["consistency entity context 1"]);
    expect(h.calls.assertUnchanged).toBeUndefined();
  });

  test("blocking diagnostics fail without a pass line", async () => {
    withSymbols();
    h.set("collectStagedKibiDiagnostics", () => [diagnostic(true)]);
    expect(await h.run()).toBe(1);
    expect(h.output()).toMatchObject({
      qualityDiagnostics: [diagnostic(true)],
      messages: ["[ERROR block] M\n  Suggestion: S"],
    });
    expect(h.output().ownerFindings).toBeUndefined();
    expect(h.calls.assertUnchanged).toHaveLength(1);
    expect(await h.run({ dryRun: true })).toBe(0);
  });

  test("advisory diagnostics pass and say so", async () => {
    h.world.inventory = [entry(REQ, { analysisDepth: "metadata" })];
    h.set("collectStagedKibiDiagnostics", () => [diagnostic(false)]);
    expect(await h.run()).toBe(0);
    expect(h.output().messages).toEqual([
      "[ERROR advise] M\n  Suggestion: S",
      "✓ No violations found in staged files.",
    ]);
    expect(h.calls.assertUnchanged).toBeUndefined();
  });

  test("diagnostics from every source are combined", async () => {
    withSymbols();
    h.set("createSymbolGranularityDiagnostics", () => [diagnostic(false)]);
    h.set("createSymbolQualityDiagnostics", () => [diagnostic(false)]);
    h.set("createSemanticReviewDiagnostics", () => [diagnostic(false)]);
    h.set("createStagedEntityIdStyleDiagnostics", () => [diagnostic(false)]);
    h.set("createFirmEditGateDiagnostics", () => [diagnostic(false)]);
    expect(await h.run()).toBe(0);
    expect(h.output().qualityDiagnostics).toHaveLength(5);
    expect(h.output().messages).toContain(
      "✓ No violations found in staged symbols.",
    );
  });

  test("the overlay is copied next to the store", async () => {
    withSymbols();
    let kbPath = "";
    h.set("validateStagedSymbolCoverage", async ({ prolog }) => {
      expect(prolog).toEqual({ name: "temp-prolog" });
      return [];
    });
    h.set("consultOverlay", async (context) => {
      kbPath = context.kbPath;
    });
    await h.run();
    expect(existsSync(path.join(kbPath, "changed_symbols.pl"))).toBe(true);
  });
});
