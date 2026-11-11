import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { buildStagedKibiImpactEvidence } from "../../../src/commands/check.js";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import type { StagedFile } from "../../../src/traceability/git-staged.js";
import * as contract from "../../../src/traceability/staged-impact-contract.js";
import * as manifest from "../../../src/traceability/staged-symbols-manifest.js";

type Spy = { mockRestore(): void };
const spies: Spy[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

let behaviorCalls: Array<Record<string, unknown>> = [];
let assessCalls: Array<Record<string, unknown>> = [];
let collectCalls: Array<Record<string, unknown>> = [];
let authored: Record<string, unknown> = {};
let assessment: Record<string, unknown> = {};

beforeEach(() => {
  behaviorCalls = [];
  assessCalls = [];
  collectCalls = [];
  authored = { path: ".kb/symbols.yaml", changedEntityIds: [], entries: [] };
  assessment = {
    path: ".kb/symbols.yaml",
    state: "unchanged",
    sourcePaths: [],
  };
  spies.push(
    spyOn(contract, "isBehaviorSourceEdit").mockImplementation((input) => {
      behaviorCalls.push({ ...input });
      return input.path.includes("behavior");
    }),
    spyOn(manifest, "assessStagedSymbolsManifest").mockImplementation(
      (options) => {
        assessCalls.push(options as unknown as Record<string, unknown>);
        return assessment as never;
      },
    ),
    spyOn(
      manifest,
      "collectStagedAuthoredSymbolsManifestEvidence",
    ).mockImplementation((options) => {
      collectCalls.push(options as unknown as Record<string, unknown>);
      return authored as never;
    }),
  );
});

function file(path: string, extra: Partial<StagedFile> = {}): StagedFile {
  return { path, status: "M", hunkRanges: [], ...extra };
}

function entity(type: string, id: string): ExtractionResult {
  return {
    entity: { id, type, title: id },
    relationships: [],
  } as unknown as ExtractionResult;
}

function build(
  overrides: Partial<Parameters<typeof buildStagedKibiImpactEvidence>[0]>,
) {
  return buildStagedKibiImpactEvidence({
    stagedFiles: [],
    sourceFiles: [],
    markdownFiles: [],
    markdownResultsByPath: new Map(),
    symbolsByFile: new Map(),
    symbolsManifestPath: ".kb/symbols.yaml",
    ...overrides,
  });
}

describe("source changes", () => {
  test("each source is classified from its diff and symbols", () => {
    const behavior = file("src/behavior.ts", { diffText: "+x" });
    const plain = file("src/plain.ts");
    const testFile = file("tests/behavior.ts");
    const evidence = build({
      sourceFiles: [behavior, plain, testFile],
      symbolsByFile: new Map([
        ["src/behavior.ts", [{}]],
        ["tests/behavior.ts", [{}]],
      ]) as never,
    });
    expect(evidence.sourceChanges).toEqual([
      { path: "src/behavior.ts", kind: "behavior_source_edit" },
      { path: "src/plain.ts", kind: "non_behavior_source_edit" },
      { path: "tests/behavior.ts", kind: "non_behavior_source_edit" },
    ]);
    expect(behaviorCalls).toEqual([
      {
        path: "src/behavior.ts",
        diffText: "+x",
        intersectsBehaviorBearingSymbol: true,
        knownUserFacingSurface: false,
      },
      {
        path: "src/plain.ts",
        diffText: "",
        intersectsBehaviorBearingSymbol: false,
        knownUserFacingSurface: false,
      },
    ]);
    expect(assessCalls[0]?.sourceFiles).toEqual([behavior]);
    expect(collectCalls[0]?.sourceFiles).toEqual([behavior]);
    expect(evidence.mode).toEqual({ kind: "missing" });
  });

  test("the manifest checks get the staged files and optional readers", () => {
    const stagedFiles = [file("a.ts")];
    const readBaseFile = () => null;
    const analyzeSource = () => ({}) as never;
    build({ stagedFiles, readBaseFile, analyzeSource });
    build({ stagedFiles, ignoreMigrationOwnedEdits: true });
    expect(assessCalls).toEqual([
      {
        analyzeSource,
        readBaseFile,
        symbolsManifestPath: ".kb/symbols.yaml",
        stagedFiles,
        sourceFiles: [],
      },
      { symbolsManifestPath: ".kb/symbols.yaml", stagedFiles, sourceFiles: [] },
    ]);
    expect(collectCalls).toEqual([
      {
        readBaseFile,
        stagedFiles,
        sourceFiles: [],
        ignoreMigrationOwnedEdits: false,
      },
      { stagedFiles, sourceFiles: [], ignoreMigrationOwnedEdits: true },
    ]);
  });
});

describe("symbols manifest evidence", () => {
  test("the assessment is reported with its file details", () => {
    assessment = {
      path: "m.yaml",
      state: "changed",
      sourcePaths: ["src/a.ts"],
      fileDetails: [{ path: "src/a.ts" }],
      extra: true,
    };
    expect(build({}).symbolsManifest).toEqual({
      path: "m.yaml",
      state: "changed",
      sourcePaths: ["src/a.ts"],
      fileDetails: [{ path: "src/a.ts" }],
    } as never);
    assessment = { path: "m.yaml", state: "missing", sourcePaths: [] };
    expect(build({}).symbolsManifest).toEqual({
      path: "m.yaml",
      state: "missing",
      sourcePaths: [],
    } as never);
  });

  test("migration-only records are passed on when present", () => {
    const seen: Array<readonly string[]> = [];
    build({ onMigrationOnlySymbols: (ids) => seen.push(ids) });
    authored = { ...authored, migrationOnlyEntityIds: [] };
    build({ onMigrationOnlySymbols: (ids) => seen.push(ids) });
    authored = { ...authored, migrationOnlyEntityIds: ["SYM-1"] };
    build({ onMigrationOnlySymbols: (ids) => seen.push(ids) });
    expect(() => build({})).not.toThrow();
    expect(seen).toEqual([[], ["SYM-1"]]);
  });

  test("changed authored records are a manifest artifact", () => {
    authored = {
      path: ".kb/symbols.yaml",
      changedEntityIds: ["SYM-1", "SYM-2"],
      entries: [
        { sourcePath: "src/b.ts" },
        { sourcePath: "src/a.ts" },
        { sourcePath: "src/b.ts" },
      ],
    };
    expect(build({}).mode).toEqual({
      kind: "kb_changes",
      kbArtifacts: [
        {
          kind: "symbols_manifest",
          path: ".kb/symbols.yaml",
          entityTypes: ["symbol"],
          entityIds: ["SYM-1", "SYM-2"],
          sourcePaths: ["src/a.ts", "src/b.ts"],
        },
      ],
    });
  });
});

describe("markdown evidence", () => {
  const REQ = ".kb/requirements/REQ-1.md";

  test("entity markdown with a known type is an artifact", () => {
    const evidence = build({
      sourceFiles: [file("src/behavior.ts"), file("src/plain.ts")],
      symbolsByFile: new Map([["src/behavior.ts", [{}]]]) as never,
      markdownFiles: [
        file(REQ, { content: "---\nid: REQ-1\n---\n" }),
        file(".kb/requirements/REQ-2.md", { content: "x" }),
        file(".kb/requirements/REQ-3.md", { content: "x" }),
      ],
      markdownResultsByPath: new Map([
        [REQ, entity("req", "REQ-1")],
        [".kb/requirements/REQ-3.md", entity("note", "N-1")],
      ]),
    });
    expect(evidence.mode).toEqual({
      kind: "kb_changes",
      kbArtifacts: [
        {
          kind: "entity_markdown",
          path: REQ,
          entityTypes: ["req"],
          entityIds: ["REQ-1"],
          sourcePaths: ["src/behavior.ts"],
        },
      ],
    });
  });

  test("a no-impact line in a note outside the entity lanes is not evidence", () => {
    const evidence = build({
      sourceFiles: [file("src/behavior.ts")],
      markdownFiles: [
        file("notes/a.md", {
          content: "Kibi-Impact: none\nRationale: rename only\n",
        }),
      ],
    });
    expect(evidence.mode).toEqual({ kind: "missing" });
  });

  test("an entity document quoting a no-impact line stays evidence", () => {
    const evidence = build({
      sourceFiles: [file("src/behavior.ts")],
      symbolsByFile: new Map([["src/behavior.ts", [{}]]]) as never,
      markdownFiles: [
        file(REQ, {
          content:
            "---\nid: REQ-1\n---\nKibi-Impact: none\nRationale: quoted\n",
        }),
      ],
      markdownResultsByPath: new Map([[REQ, entity("req", "REQ-1")]]),
    });
    expect(evidence.mode).toEqual({
      kind: "kb_changes",
      kbArtifacts: [
        {
          kind: "entity_markdown",
          path: REQ,
          entityTypes: ["req"],
          entityIds: ["REQ-1"],
          sourcePaths: ["src/behavior.ts"],
        },
      ],
    });
  });

  test("a no-impact line does not displace authored symbol evidence", () => {
    authored = {
      path: ".kb/symbols.yaml",
      changedEntityIds: ["SYM-1"],
      entries: [],
    };
    const evidence = build({
      markdownFiles: [file("notes/a.md", { content: "Kibi-Impact: none\n" })],
    });
    expect(evidence.mode.kind).toBe("kb_changes");
  });
});
