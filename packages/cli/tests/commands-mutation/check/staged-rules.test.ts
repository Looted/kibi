import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as detached from "../../../src/runtime/detached-snapshot.js";
import * as autoCompile from "../../../src/utils/auto-compile.js";
import * as resolver from "../../../src/utils/branch-resolver.js";
import {
  type StagedHarness,
  entry,
  side,
  stagedHarness,
} from "./staged-harness.js";

let h: StagedHarness;
beforeEach(() => {
  h = stagedHarness();
  h.world.git = (args) => {
    if (args[0] === "show") return `blob ${args[1]}`;
    if (args[0] === "ls-tree") return "";
    throw new Error(`unexpected git ${args.join(" ")}`);
  };
});
afterEach(() => h.restore());

const REQ = ".kb/requirements/REQ-1.md";
const md = (filePath = REQ, extra: Record<string, unknown> = {}) =>
  entry(filePath, { analysisDepth: "metadata", ...extra });
const src = (filePath = "src/a.ts", extra: Record<string, unknown> = {}) =>
  entry(filePath, { analysisDepth: "symbol", ...extra });

describe("knowledge consistency", () => {
  test("the snapshot knowledge is read from the head tree", async () => {
    h.world.inventory = [md()];
    await h.run();
    const [readGit, tree, readBlobs] = h.calls.readSnapshotKnowledge?.[0] as [
      (args: string[]) => Buffer,
      string,
      unknown,
    ];
    expect(tree).toBe("HEAD");
    expect(readGit(["show", "x"]).toString()).toBe("blob x");
    expect(readBlobs).toBeFunction();
    expect(h.calls.stagesKnowledge?.[0]).toEqual([[REQ]]);
    expect(h.calls.collectIntroducedConsistencyViolations).toBeUndefined();
  });

  test("introduced contradictions block unless dry-run", async () => {
    h.world.inventory = [md()];
    h.world.entities = [{ entity: { id: "E" } }];
    h.set("stagesKnowledge", () => true);
    h.set("collectIntroducedConsistencyViolations", async () => [{ c: 1 }]);
    expect(await h.run()).toBe(1);
    const [snapshot, entities] = h.calls
      .collectIntroducedConsistencyViolations?.[0] as [
      { baseTree: string },
      unknown,
    ];
    expect(snapshot.baseTree).toBe("BASE");
    expect(entities).toBe(h.world.entities);
    expect(h.output()).toMatchObject({
      violations: [{ c: 1 }],
      messages: ["consistency blocking 1"],
    });
    expect(h.calls.assertUnchanged).toHaveLength(1);
    expect(await h.run({ dryRun: true })).toBe(0);
  });

  test("requirement-scoped rules ride the consistency check", async () => {
    h.world.inventory = [md(), entry("src/a.ts")];
    h.world.entities = [{ entity: { id: "E" } }];
    h.set("stagesKnowledge", () => true);
    const rules = { rules: ["claim-subject-missing"] };
    h.set("stagedRequirementRules", () => rules);
    expect(await h.run()).toBe(0);
    const [snapshot, input] = h.calls.stagedRequirementRules?.[0] as [
      { headTree: string },
      unknown,
    ];
    expect(snapshot.headTree).toBe("HEAD");
    expect(input).toStrictEqual({
      stagedPaths: [REQ],
      knowledge: h.world.entities,
    });
    expect(h.calls.collectIntroducedConsistencyViolations?.[0]?.[2]).toBe(
      rules,
    );
    h.set("stagedRequirementRules", () => null);
    await h.run();
    expect(h.calls.collectIntroducedConsistencyViolations?.[1]).toHaveLength(3);
    expect(
      h.calls.collectIntroducedConsistencyViolations?.[1]?.[2],
    ).toBeUndefined();
  });

  test("the evidence floor is judged only on a branch store", async () => {
    h.world.inventory = [md()];
    h.set("stagesKnowledge", () => true);
    h.set("collectStagedEvidenceFloorViolations", async () => [{ f: 1 }]);
    expect(await h.run()).toBe(0);
    expect(h.calls.collectStagedEvidenceFloorViolations).toBeUndefined();
  });

  test("a requirement below its floor blocks unless dry-run", async () => {
    const spies = [
      spyOn(resolver, "resolveReadBranchAttachment").mockImplementation(
        () =>
          ({
            kbBranch: "kb-main",
            gitBranch: "main",
            migrationRequired: false,
          }) as never,
      ),
      spyOn(detached, "refreshDetachedSnapshot").mockImplementation(
        async () => undefined as never,
      ),
      spyOn(autoCompile, "ensureBranchStoreCompiled").mockImplementation(
        async () => undefined as never,
      ),
    ];
    try {
      h.world.inventory = [md()];
      const staged = {
        entity: { id: "REQ-1", type: "req", source: REQ },
        relationships: [],
      };
      h.world.entities = [staged] as never;
      h.set("stagesKnowledge", () => true);
      h.set("floorChangedRequirementIds", () => ["REQ-1"]);
      h.set("readTreeManifest", () => ({ schemaVersion: 15 }));
      h.set("collectStagedEvidenceFloorViolations", async () => [{ f: 1 }]);
      expect(await h.run({ kbPath: undefined })).toBe(1);
      expect(h.calls.collectStagedEvidenceFloorViolations?.[0]).toStrictEqual([
        {
          workspaceRoot: process.cwd(),
          branch: "kb-main",
          requirementIds: ["REQ-1"],
          schemaVersion: 15,
          stagedEntities: [staged],
        },
      ]);
      const [files, readBase] = h.calls.floorChangedRequirementIds?.[0] as [
        Array<{ path: string }>,
        (file: string) => string | null,
      ];
      expect(files.map((file) => file.path)).toStrictEqual([REQ]);
      expect(readBase(REQ)).toBe(`blob BASE:${REQ}`);
      expect(h.output()).toMatchObject({
        violations: [{ f: 1 }],
        messages: ["consistency blocking 1"],
      });
      expect(await h.run({ kbPath: undefined, dryRun: true })).toBe(0);
      h.set("readTreeManifest", () => null);
      h.set("collectStagedEvidenceFloorViolations", async () => []);
      expect(await h.run({ kbPath: undefined })).toBe(0);
      expect(
        (
          h.calls.collectStagedEvidenceFloorViolations?.at(-1)?.[0] as {
            schemaVersion: unknown;
          }
        ).schemaVersion,
      ).toBeUndefined();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });

  test("a consistent staged knowledge change goes on", async () => {
    h.world.inventory = [md()];
    h.set("stagesKnowledge", () => true);
    expect(await h.run()).toBe(0);
    expect(h.calls.collectIntroducedEntityContextViolations).toHaveLength(1);
  });
});

describe("inventory and statement drift", () => {
  test("drift checks get the staged markdown and a base reader", async () => {
    h.world.inventory = [md(), md(".kb/requirements/REQ-2.md")];
    await h.run();
    const [snapshot, paths, entities] = h.calls
      .collectIntroducedEntityContextViolations?.[0] as [
      { baseTree: string },
      string[],
      unknown,
    ];
    expect(snapshot.baseTree).toBe("BASE");
    expect(paths).toEqual([REQ, ".kb/requirements/REQ-2.md"]);
    expect(entities).toBe(h.world.entities);
    const options = h.calls.stagedInventoryDriftViolations?.[0]?.[0] as {
      stagedPaths: Set<string>;
      snapshotEntities: unknown;
      judgeNewRequirements: boolean;
      readBase: (file: string) => string | null;
    };
    expect(options.stagedPaths).toEqual(
      new Set([REQ, ".kb/requirements/REQ-2.md"]),
    );
    expect(options.snapshotEntities).toBe(h.world.entities);
    expect(options.judgeNewRequirements).toBe(true);
    expect(options.readBase("a.md")).toBe("blob BASE:a.md");
    h.world.git = () => {
      throw new Error("missing");
    };
    expect(options.readBase("a.md")).toBeNull();
    expect(h.calls.amendsRootCommit?.[0]).toEqual([process.cwd(), "C1"]);
    const statement = h.calls.stagedStatementDriftViolations?.[0]?.[0] as {
      stagedFiles: Array<{ path: string }>;
      readBase: unknown;
    };
    expect(statement.stagedFiles.map((file) => file.path)).toEqual([
      REQ,
      ".kb/requirements/REQ-2.md",
    ]);
    expect(statement.readBase).toBe(options.readBase);
  });

  test("new requirements are not judged without history or on a root amend", async () => {
    h.world.inventory = [md()];
    h.world.snapshot.headCommit = null;
    await h.run();
    expect(h.calls.amendsRootCommit).toBeUndefined();
    h.world.snapshot.headCommit = "C1";
    h.set("amendsRootCommit", () => true);
    await h.run();
    const judged = h.calls.stagedInventoryDriftViolations?.map(
      (call) =>
        (call[0] as { judgeNewRequirements: boolean }).judgeNewRequirements,
    );
    expect(judged).toEqual([false, false]);
  });

  test("inventory drift blocks unless dry-run", async () => {
    h.world.inventory = [md()];
    h.set("stagedInventoryDriftViolations", () => [
      { message: "REQ-1 drifted" },
      { message: "REQ-2 drifted" },
    ]);
    expect(await h.run()).toBe(1);
    expect(h.output()).toMatchObject({
      violations: [{ message: "REQ-1 drifted" }, { message: "REQ-2 drifted" }],
      messages: [
        "2 staged requirement(s) have a semantic inventory that is missing or no longer matches their prose:",
        "  REQ-1 drifted",
        "  REQ-2 drifted",
      ],
    });
    expect(h.calls.assertUnchanged).toHaveLength(1);
    expect(h.calls.stagedStatementDriftViolations).toBeUndefined();
    expect(await h.run({ dryRun: true })).toBe(0);
  });

  test("statement drift blocks unless dry-run", async () => {
    h.world.inventory = [md()];
    h.set("stagedStatementDriftViolations", () => [{ message: "REQ-1 moved" }]);
    expect(await h.run()).toBe(1);
    expect(h.output()).toMatchObject({
      violations: [{ message: "REQ-1 moved" }],
      messages: [
        "1 staged requirement(s) changed their body statement without restating their pinned semantic_text:",
        "  REQ-1 moved",
      ],
    });
    expect(h.calls.assertUnchanged).toHaveLength(1);
    expect(h.calls.extractSymbolsFromStagedFileAsync).toBeUndefined();
    expect(await h.run({ dryRun: true })).toBe(0);
  });
});

describe("symbol extraction", () => {
  const symbol = (name: string, reqLinks: string[] = []) => ({
    name,
    reqLinks,
  });

  test("symbols are read through the captured analysis", async () => {
    h.world.inventory = [src(), src("src/b.ts", { content: undefined })];
    const after = side("ok");
    h.world.analysis = new Map([["src/a.ts", { after }]]);
    h.world.entities = [
      { entity: { id: "REQ-1", type: "req" }, relationships: [] },
    ];
    const answers: unknown[] = [];
    h.set("extractSymbolsFromStagedFileAsync", async (file, _lookup, deps) => {
      answers.push(await deps.analyzeText());
      return file.path === "src/a.ts" ? [symbol("a", ["REQ-1"])] : [];
    });
    expect(await h.run()).toBe(0);
    expect(answers).toEqual([after, null]);
    const [file, lookup] = h.calls.extractSymbolsFromStagedFileAsync?.[0] as [
      { path: string; content: string },
      Map<string, unknown>,
    ];
    expect(file).toMatchObject({
      path: "src/a.ts",
      content: "content of src/a.ts",
    });
    expect(lookup).toBeInstanceOf(Map);
    expect(h.output().messages).toEqual([
      "✓ No violations found in staged symbols.",
    ]);
  });

  test("a requirement missing from the snapshot is an error", async () => {
    h.world.inventory = [src()];
    h.world.entities = [
      { entity: { id: "REQ-1", type: "req" }, relationships: [] },
      { entity: { id: "REQ-2", type: "scenario" }, relationships: [] },
    ];
    h.set("extractSymbolsFromStagedFileAsync", async () => [
      symbol("ok", ["REQ-1"]),
      symbol("bad", ["REQ-2"]),
    ]);
    expect(await h.run()).toBe(1);
    expect(h.output().operationalError).toBe(
      "Error running staged validation: Error extracting symbols from staged file src/a.ts: Symbol bad references a requirement absent from the captured knowledge snapshot: REQ-2",
    );
  });

  test("a non-error extraction failure is reported as text", async () => {
    h.world.inventory = [src()];
    h.set("extractSymbolsFromStagedFileAsync", async () => {
      throw "plain";
    });
    expect(await h.run()).toBe(1);
    expect(h.output().operationalError).toBe(
      "Error running staged validation: Error extracting symbols from staged file src/a.ts: plain",
    );
  });

  test("unlinked symbols of an unowned generated file are not checked", async () => {
    h.world.inventory = [
      src("gen/a.ts"),
      src("gen/owned.ts"),
      src("gen/all.ts"),
      src("gen/b.ts"),
    ];
    h.world.entities = [
      { entity: { id: "REQ-1", type: "req" }, relationships: [] },
      {
        entity: {
          id: "SYM-1",
          type: "symbol",
          title: "x",
          source: "gen/owned.ts",
        },
        relationships: [],
      },
      {
        entity: { id: "SYM-2", type: "symbol", title: "y" },
        relationships: [],
        sourceFile: "gen/elsewhere.ts",
      },
    ];
    h.set(
      "stagedGeneratedPaths",
      () => new Set(["gen/a.ts", "gen/owned.ts", "gen/all.ts", "gen/b.ts"]),
    );
    h.set("extractSymbolsFromStagedFileAsync", async (file) =>
      file.path === "gen/all.ts"
        ? [symbol("linked", ["REQ-1"])]
        : [symbol("free"), symbol("linked", ["REQ-1"])],
    );
    let overlay: unknown[] = [];
    h.set("createOverlayFacts", (symbols) => {
      overlay = symbols;
      return "facts";
    });
    await h.run();
    expect(overlay).toEqual([
      symbol("linked", ["REQ-1"]),
      symbol("free"),
      symbol("linked", ["REQ-1"]),
      symbol("linked", ["REQ-1"]),
      symbol("linked", ["REQ-1"]),
    ]);
    expect(h.output().messages).toEqual([
      'Generated files: symbols without a requirement link in gen/a.ts, gen/b.ts are not checked for one, because kibi.generatedPaths, .gitattributes (linguist-generated) or the committed file\'s generator header marks the file generated and no .kb/symbols.yaml entry names it. Review the generator change itself; a "!" pattern in kibi.generatedPaths or linguist-generated=false checks the file again.',
      "✓ No violations found in staged symbols.",
    ]);
  });
});

describe("staged entity markdown", () => {
  test("only markdown with front matter is extracted", async () => {
    h.world.inventory = [
      md(REQ, { content: "---\nid: REQ-1\n---\n" }),
      md(".kb/requirements/REQ-2.md", { content: "no front matter" }),
      md(".kb/requirements/REQ-3.md", { content: undefined }),
    ];
    expect(await h.run()).toBe(0);
    expect(h.calls.extractFromMarkdownString).toEqual([
      ["---\nid: REQ-1\n---\n", REQ],
    ]);
    expect(h.output().messages).toEqual([
      "✓ No violations found in staged files.",
    ]);
  });

  test("without symbols or entities the analysis is described", async () => {
    h.world.inventory = [md(".kb/requirements/REQ-2.md", { content: "x" })];
    expect(await h.run()).toBe(0);
    expect(h.output().messages).toEqual([
      "No exported symbols or staged entities found in staged files.",
    ]);
  });

  test("staged manifest entries count only for staged sources", async () => {
    const manifest = `symbols:
  - id: SYM-1
    title: one
    sourceFile: src/a.ts
    status: active
  - id: SYM-2
    title: two
    sourceFile: src/other.ts
    status: active
`;
    h.world.inventory = [
      entry(".kb/symbols.yaml", {
        analysisDepth: "metadata",
        content: manifest,
      }),
      src("src/b.ts"),
    ];
    await h.run();
    expect(h.output().messages).toEqual([
      "No exported symbols or staged entities found in staged files.",
    ]);
    h.world.inventory = [
      entry(".kb/symbols.yaml", {
        analysisDepth: "metadata",
        content: manifest,
      }),
      src("src/a.ts"),
    ];
    await h.run();
    expect(h.output().messages).toEqual([
      "✓ No violations found in staged files.",
    ]);
  });
});

describe("impact evidence", () => {
  test("migration and tree readers reach the evidence", async () => {
    h.world.inventory = [src()];
    const after = side("ok");
    h.world.analysis = new Map([["src/a.ts", { after }]]);
    h.set("isBehaviorSourceEdit", () => true);
    h.set("stagedCommitCarriesMigration", (readBase, readHead) => {
      expect(readBase("x")).toBe("blob BASE:x");
      expect(readHead("x")).toBe("blob HEAD:x");
      return true;
    });
    const seen: unknown[] = [];
    h.set("assessStagedSymbolsManifest", (options) => {
      seen.push(options.analyzeSource("src/a.ts", "text"));
      expect(() => options.analyzeSource("src/none.ts", "")).toThrow(
        "Missing captured source analysis: src/none.ts",
      );
      seen.push(options.readBaseFile("y"));
      return { path: ".kb/symbols.yaml", state: "unchanged", sourcePaths: [] };
    });
    h.set("collectStagedAuthoredSymbolsManifestEvidence", (options) => {
      seen.push(options.ignoreMigrationOwnedEdits);
      return {
        path: ".kb/symbols.yaml",
        changedEntityIds: [],
        entries: [],
        migrationOnlyEntityIds: ["SYM-9"],
      };
    });
    await h.run();
    expect(seen).toEqual([after, "blob BASE:y", true]);
    expect(h.output().messages).toEqual([
      "Migration commit: 1 symbol record(s) changed only by kibi migrate (legacy-link marks, review:context-missing tags) are not judged as changed by this commit: SYM-9. Run kibi check for the full report.",
      "No exported symbols or staged entities found in staged files.",
    ]);
  });

  test("a missing base file reads as null", async () => {
    h.world.inventory = [src()];
    h.world.git = () => {
      throw new Error("absent");
    };
    h.set("isBehaviorSourceEdit", () => true);
    let base: unknown = "unset";
    let trees: unknown[] = [];
    h.set("stagedCommitCarriesMigration", (readBase, readHead) => {
      trees = [readBase("x"), readHead("x")];
      return false;
    });
    h.set("assessStagedSymbolsManifest", (options) => {
      base = options.readBaseFile("y");
      return { path: ".kb/symbols.yaml", state: "unchanged", sourcePaths: [] };
    });
    await h.run();
    expect(base).toBeNull();
    expect(trees).toEqual([null, null]);
  });

  test("diagnostics are collected from the evidence", async () => {
    h.world.inventory = [md()];
    await h.run();
    const [evidence, manifestPath] = h.calls
      .collectStagedKibiDiagnostics?.[0] as [{ mode: unknown }, string];
    expect(evidence.mode).toEqual({ kind: "missing" });
    expect(manifestPath).toBe(".kb/symbols.yaml");
  });
});
