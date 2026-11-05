import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { IMPACT_REVIEW_PATH } from "../../../src/traceability/impact-review.js";
import {
  type StagedHarness,
  entry,
  side,
  stagedHarness,
} from "./staged-harness.js";

let h: StagedHarness;
beforeEach(() => {
  h = stagedHarness();
});
afterEach(() => h.restore());

const SOURCE = "src/a.ts";

describe("snapshot and analysis", () => {
  test("an empty snapshot passes and says so", async () => {
    expect(await h.run()).toBe(0);
    const cwd = process.cwd();
    const snapshot = h.calls.captureStagedSnapshot?.[0];
    expect(snapshot).toEqual([cwd]);
    const [captured, base] = h.calls.readSnapshotSourceConfig?.[0] as [
      Record<string, unknown>,
      string,
    ];
    expect(base).toBe("BASE");
    expect(captured.baseTree).toBe("BASE");
    expect(h.calls.createMaintenanceSourceAnalysisService?.[0]).toEqual([
      cwd,
      { generatedPaths: ["gen/**"] },
    ]);
    expect(h.calls.analyzeSourceChanges?.[0]).toEqual([[], h.service]);
    expect(h.calls.partialAnalysisReviews?.[0]).toEqual([[], h.world.analysis]);
    expect(h.calls.hasValidBaseImpactPolicy).toBeUndefined();
    expect(h.calls.assertSourceAnalysisGate?.[0]).toEqual([
      [],
      h.world.analysis,
    ]);
    expect(h.calls.stagedGeneratedPaths?.[0]).toEqual([
      cwd,
      [],
      ["gen/**"],
      "BASE",
    ]);
    expect(h.calls.assertUnchanged).toHaveLength(1);
    expect(h.output()).toEqual({
      violations: [],
      count: 0,
      diagnostics: [],
      qualityDiagnostics: [],
      staged: {
        version: 1,
        files: [],
        diagnostics: [],
        snapshot: { baseTree: "BASE", headTree: "HEAD", headCommit: "C1" },
      },
      messages: ["No staged files found."],
    });
  });

  test("only resolved renames say so", async () => {
    h.world.snapshot.renameResolved = [{ from: "a.md", to: ".kb/a.md" }];
    expect(await h.run()).toBe(0);
    expect(h.output().messages).toEqual([
      "Baseline: HEAD with 1 staged knowledge rename(s) into .kb/ resolved; renamed files are judged only on what this commit changed in them. Run kibi check for the full report.",
      "No staged changes beyond the resolved renames.",
    ]);
  });

  test("merge and partial review notes lead the messages", async () => {
    h.world.snapshot.mergeInherited = ["x", "y"];
    h.set("partialAnalysisReviews", () => [
      {
        path: "src/p.ts",
        lines: [
          { startLine: 3, endLine: 3 },
          { startLine: 5, endLine: 9 },
        ],
        detail: "gap",
      },
    ]);
    await h.run();
    expect(h.output().messages).toEqual([
      "Merge commit: 2 staged file(s) are taken unchanged from the merged branch and are not judged here; only what the merge itself changed is checked. Any debt in those files was inherited from that branch.",
      "Partial source analysis: staged line(s) 3, 5-9 of src/p.ts fall outside every declaration the analyzer placed (gap); review that change at file level.",
      "No staged files found.",
    ]);
  });

  test("a generated-path answer feeds the coverage predicate", async () => {
    h.set("stagedGeneratedPaths", () => new Set(["gen/a.ts"]));
    let predicate: ((file: string) => boolean) | undefined;
    h.set("analyzeStagedFileCoverage", (_inventory, readGit, isGenerated) => {
      predicate = isGenerated;
      expect(readGit(["show", "x"]).toString()).toBe("git show x");
      return { version: 1, files: [], diagnostics: [] };
    });
    h.world.git = (args) => `git ${args.join(" ")}`;
    await h.run();
    expect(predicate?.("gen/a.ts")).toBe(true);
    expect(predicate?.("src/a.ts")).toBe(false);
  });

  test("coverage records carry their source analysis", async () => {
    h.world.inventory = [
      entry(SOURCE),
      entry("src/b.ts"),
      entry("src/c.ts"),
      entry("src/d.ts"),
    ];
    h.world.analysis = new Map([
      [SOURCE, { before: side("ok", { providerId: "old" }), after: null }],
      ["src/b.ts", { before: null, after: side("ok") }],
      ["src/c.ts", { before: side("ok", { providerId: null }) }],
      ["src/d.ts", { before: null, after: side("ok", { providerId: null }) }],
    ]);
    h.set("analyzeStagedFileCoverage", () => ({
      version: 1,
      files: [
        { path: SOURCE },
        { path: "src/b.ts" },
        { path: "src/c.ts" },
        { path: "src/d.ts" },
        { path: "docs/none.md" },
      ],
      diagnostics: [],
    }));
    await h.run();
    const described = {
      status: "ok",
      language: "typescript",
      symbolCount: 2,
      providerId: "ts",
      inputFingerprint: "in",
      providerFingerprint: "pf",
    };
    expect((h.output().staged as { files: unknown[] }).files).toEqual([
      {
        path: SOURCE,
        sourceAnalysis: {
          before: { ...described, providerId: "old" },
          after: null,
        },
        providerId: "old",
      },
      {
        path: "src/b.ts",
        sourceAnalysis: { before: null, after: described },
        providerId: "ts",
      },
      {
        path: "src/c.ts",
        sourceAnalysis: {
          before: { ...described, providerId: null },
          after: null,
        },
        providerId: null,
      },
      {
        path: "src/d.ts",
        sourceAnalysis: {
          before: null,
          after: { ...described, providerId: null },
        },
        providerId: null,
      },
      { path: "docs/none.md" },
    ]);
  });
});

describe("analysis depth", () => {
  function depths() {
    const inventory = h.calls.analyzeStagedFileCoverage?.[0]?.[0] as Array<
      Record<string, unknown>
    >;
    return inventory.map((file) => [
      file.path,
      file.analysisDepth,
      file.disposition,
    ]);
  }

  test("analyzed files are checked at symbol level", async () => {
    h.world.inventory = [
      entry("src/ok.ts", { disposition: "advisory" }),
      entry("src/partial.ts", { disposition: "advisory" }),
      entry("src/deleted.ts", { status: "D", disposition: "advisory" }),
      entry("src/skipped.ts", {
        skipReason: "binary",
        disposition: "advisory",
      }),
      entry("src/unusable.ts", { disposition: "advisory" }),
      entry("src/none.ts", { disposition: "advisory" }),
    ];
    h.world.analysis = new Map([
      ["src/ok.ts", { after: side("ok") }],
      ["src/partial.ts", { after: side("partial", { usable: true }) }],
      ["src/deleted.ts", { after: side("partial", { usable: true }) }],
      ["src/skipped.ts", { after: side("partial", { usable: true }) }],
      ["src/unusable.ts", { after: side("partial") }],
    ]);
    h.set("partialAnalysisSymbolsUsable", (after) => after.usable === true);
    await h.run();
    expect(depths()).toEqual([
      ["src/ok.ts", "symbol", "checked"],
      ["src/partial.ts", "symbol", "checked"],
      ["src/deleted.ts", "file", "advisory"],
      ["src/skipped.ts", "file", "advisory"],
      ["src/unusable.ts", "file", "advisory"],
      ["src/none.ts", "file", "advisory"],
    ]);
    expect(
      h.calls.partialAnalysisSymbolsUsable?.map((call) => call[0]),
    ).toEqual([
      h.world.analysis.get("src/partial.ts")?.after,
      h.world.analysis.get("src/unusable.ts")?.after,
    ]);
    expect(
      h.calls.extractSymbolsFromStagedFileAsync?.map(
        (call) => (call[0] as { path: string }).path,
      ),
    ).toEqual(["src/ok.ts", "src/partial.ts"]);
  });

  test("a reviewed partial file keeps its depth but is still extracted", async () => {
    h.world.inventory = [entry("src/partial.ts")];
    h.world.analysis = new Map([
      ["src/partial.ts", { after: side("partial") }],
    ]);
    h.set("partialAnalysisSymbolsUsable", () => true);
    h.set("partialAnalysisReviews", () => [
      { path: "src/partial.ts", lines: [], detail: "d" },
    ]);
    await h.run();
    expect(depths()).toEqual([["src/partial.ts", "file", "checked"]]);
    expect(h.calls.extractSymbolsFromStagedFileAsync).toHaveLength(1);
  });

  test("with an impact policy a partial file keeps its depth", async () => {
    h.world.inventory = [entry("src/partial.ts")];
    h.world.analysis = new Map([
      ["src/partial.ts", { after: side("partial") }],
    ]);
    h.set("partialAnalysisSymbolsUsable", () => true);
    h.set("hasValidBaseImpactPolicy", () => true);
    await h.run();
    expect(depths()).toEqual([["src/partial.ts", "file", "checked"]]);
    expect(h.calls.assertSourceAnalysisGate).toBeUndefined();
  });
});

describe("impact policy", () => {
  beforeEach(() => {
    h.world.inventory = [entry("docs/readme.txt")];
    h.set("hasValidBaseImpactPolicy", () => true);
  });

  test("a passing review clears resolved advisories", async () => {
    h.set("analyzeStagedFileCoverage", () => ({
      version: 1,
      files: [{ path: "src/a.ts" }],
      diagnostics: [
        { id: "staged_file_impact_review_needed", path: "src/a.ts" },
        { id: "staged_file_impact_review_needed", path: IMPACT_REVIEW_PATH },
      ],
    }));
    expect(await h.run()).toBe(0);
    const [snapshot, options] = h.calls.evaluateImpactReview?.[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(snapshot.baseTree).toBe("BASE");
    expect(options).toEqual({
      providerSetFingerprint: "PSET",
      evaluatorFingerprint: "EVAL",
      analyses: h.world.analysis,
    });
    expect(h.calls.fingerprintMaintenanceSourceSet?.[0]).toEqual([
      process.cwd(),
      { generatedPaths: ["gen/**"] },
    ]);
    expect(
      (h.calls.hasValidBaseImpactPolicy?.[0]?.[0] as { baseTree: string })
        .baseTree,
    ).toBe("BASE");
    expect(h.output().diagnostics).toEqual([
      { id: "staged_file_impact_review_needed", path: IMPACT_REVIEW_PATH },
    ]);
  });

  test("without a policy review advisories stay", async () => {
    h.set("hasValidBaseImpactPolicy", () => false);
    const advisory = {
      id: "staged_file_impact_review_needed",
      path: "src/a.ts",
    };
    h.set("analyzeStagedFileCoverage", () => ({
      version: 1,
      files: [{ path: "src/a.ts" }],
      diagnostics: [advisory],
    }));
    await h.run();
    expect(h.output().diagnostics).toEqual([advisory]);
    expect(h.calls.evaluateImpactReview).toBeUndefined();
  });

  test("a failed review is an operational error", async () => {
    h.set("evaluateImpactReview", () => ({
      passed: false,
      diagnostics: [
        { code: "c1", message: "m1" },
        { code: "c2", message: "m2" },
      ],
    }));
    expect(await h.run()).toBe(1);
    expect(h.output().operationalError).toBe(
      "Error running staged validation: Staged impact review failed:\nc1: m1\nc2: m2",
    );
  });
});

describe("staged file selection", () => {
  test("only entity markdown is validated, and only symbol sources extracted", async () => {
    h.world.inventory = [
      entry(".kb/requirements/REQ-1.md", { analysisDepth: "metadata" }),
      entry("docs/guide.md", { analysisDepth: "metadata" }),
      entry(".kb/requirements/notes.txt", { analysisDepth: "metadata" }),
      entry(SOURCE, { analysisDepth: "symbol" }),
      entry("src/meta.ts", { analysisDepth: "metadata" }),
    ];
    await h.run();
    expect(h.calls.validateStagedMarkdown).toEqual([
      [".kb/requirements/REQ-1.md", "content of .kb/requirements/REQ-1.md"],
    ]);
    expect(
      h.calls.extractSymbolsFromStagedFileAsync?.map(
        (call) => (call[0] as { path: string }).path,
      ),
    ).toEqual([SOURCE]);
  });

  test("markdown errors block unless dry-run", async () => {
    h.world.inventory = [
      entry(".kb/requirements/REQ-1.md", {
        analysisDepth: "metadata",
        content: "",
      }),
    ];
    h.set("validateStagedMarkdown", () => ({
      errors: [{ toString: () => "bad one" }, { toString: () => "bad two" }],
    }));
    expect(await h.run()).toBe(1);
    expect(h.calls.validateStagedMarkdown?.[0]).toEqual([
      ".kb/requirements/REQ-1.md",
      "",
    ]);
    expect(h.output()).toMatchObject({
      violations: [
        { rule: "staged-markdown", message: "bad one" },
        { rule: "staged-markdown", message: "bad two" },
      ],
      messages: [
        "Found embedded entity violations in staged markdown files:",
        "bad one",
        "bad two",
      ],
    });
    expect(h.calls.assertUnchanged).toHaveLength(1);
    expect(h.calls.readSnapshotKnowledge).toBeUndefined();
    expect(await h.run({ dryRun: true })).toBe(0);
  });

  test("markdown without content is validated as empty", async () => {
    h.world.inventory = [
      entry(".kb/requirements/REQ-1.md", {
        analysisDepth: "metadata",
        content: undefined,
      }),
    ];
    await h.run();
    expect(h.calls.validateStagedMarkdown?.[0]?.[1]).toBe("");
  });
});
