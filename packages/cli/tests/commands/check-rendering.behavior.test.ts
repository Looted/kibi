// Behavior-focused tests for packages/cli/src/commands/check.ts rendering
// branches: staged coverage rendering (text/json), staged impact-evidence
// classification, manifest duplicate handling, and full-KB violation output.
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  checkCommand,
  checkDeprecatedAdrs,
  checkDomainContradictions,
  checkMustPriorityCoverage,
  checkNoCycles,
  checkNoDanglingRefs,
  checkRequiredFields,
  checkStrictFactShape,
  getAllEntityIds,
} from "../../src/commands/check.js";
import { PrologProcess } from "../../src/prolog.js";
import type { PrologProcess as PrologProcessType } from "../../src/prolog.js";
import * as impact from "../../src/public/impact-diagnostics.js";
import * as checkExecutor from "../../src/public/operations/check-executor.js";
import type { StagedPath } from "../../src/traceability/git-staged.js";
import * as stagedDiagnostics from "../../src/traceability/staged-diagnostics.js";
import * as stagedCoverageModule from "../../src/traceability/staged-file-coverage.js";
import * as symbolExtract from "../../src/traceability/symbol-extract.js";
import * as tempKb from "../../src/traceability/temp-kb.js";
import * as stagedValidate from "../../src/traceability/validate.js";
import {
  captureIo,
  createGitWorkspace,
  git,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
  process.exitCode = 0;
});

function prepareWorkspace(): string {
  restores.push(isolateKibiEnv());
  const cwd = createGitWorkspace();
  roots.push(cwd);
  return cwd;
}

function stagedPath(input: {
  path: string;
  content: string;
  analysisDepth?: StagedPath["analysisDepth"];
  status?: StagedPath["status"];
  diffText?: string;
}): StagedPath {
  return {
    path: input.path,
    status: input.status ?? "M",
    hunkRanges: [{ start: 1, end: 2 }],
    analysisDepth: input.analysisDepth ?? "symbol",
    disposition:
      (input.analysisDepth ?? "symbol") === "file" ? "advisory" : "checked",
    content: input.content,
    ...(input.diffText !== undefined ? { diffText: input.diffText } : {}),
  };
}

function emptyCoverage(files: StagedPath[]): {
  version: "kibi.staged-file-coverage.v1";
  files: Array<{
    path: string;
    status: StagedPath["status"];
    analysisDepth: StagedPath["analysisDepth"];
    disposition: StagedPath["disposition"];
    requirementIds: string[];
    evidencePaths: string[];
    providerId: null;
  }>;
  diagnostics: [];
} {
  return {
    version: "kibi.staged-file-coverage.v1",
    files: files.map((entry) => ({
      path: entry.path,
      status: entry.status,
      analysisDepth: entry.analysisDepth,
      disposition: entry.disposition,
      requirementIds: [],
      evidencePaths: [],
      providerId: null,
    })),
    diagnostics: [],
  };
}

function stageInventory(cwd: string, entries: StagedPath[]): void {
  for (const entry of entries) {
    const file = path.join(cwd, entry.path);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, entry.content ?? "");
    execFileSync("git", ["add", "--", entry.path], { cwd, stdio: "pipe" });
  }
}

function mockImpactDiagnostics(): {
  granularity: ReturnType<typeof spyOn>;
} {
  const granularity = spyOn(
    impact,
    "createSymbolGranularityDiagnostics",
  ).mockReturnValue([]);
  const quality = spyOn(
    impact,
    "createSymbolQualityDiagnostics",
  ).mockReturnValue([]);
  const review = spyOn(
    impact,
    "createSemanticReviewDiagnostics",
  ).mockReturnValue([]);
  restores.push(() => {
    granularity.mockRestore();
    quality.mockRestore();
    review.mockRestore();
  });
  return { granularity };
}

function mockTempKb(): {
  project: ReturnType<typeof spyOn>;
} {
  const overlayDir = mkdtempSync(path.join(os.tmpdir(), "kibi-render-"));
  roots.push(overlayDir);
  const overlayPath = path.join(overlayDir, "changed_symbols.pl");
  mkdirSync(path.join(overlayDir, "kb"), { recursive: true });
  writeFileSync(overlayPath, "");
  const create = spyOn(tempKb, "createTempKb").mockResolvedValue({
    tempDir: overlayDir,
    kbPath: path.join(overlayDir, "kb"),
    overlayPath,
    prolog: {
      query: async () => ({ success: true, bindings: {} }),
    } as never,
  });
  const project = spyOn(tempKb, "projectStagedEntities").mockResolvedValue(
    undefined,
  );
  const consult = spyOn(tempKb, "consultOverlay").mockResolvedValue(undefined);
  const cleanup = spyOn(tempKb, "cleanupTempKb").mockResolvedValue(undefined);
  const validate = spyOn(
    stagedValidate,
    "validateStagedSymbols",
  ).mockResolvedValue([]);
  restores.push(() => {
    create.mockRestore();
    project.mockRestore();
    consult.mockRestore();
    cleanup.mockRestore();
    validate.mockRestore();
  });
  return { project };
}

type QueryResult = {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
};

function respondTo(
  matches: Array<{
    includes: string;
    success?: boolean;
    bindings?: Record<string, string>;
  }>,
): PrologProcessType {
  return {
    query: async (goal: string | string[]) => {
      const text = Array.isArray(goal) ? goal.join(", ") : goal;
      const hit = matches.find((entry) => text.includes(entry.includes));
      if (hit === undefined) return { success: false, bindings: {} };
      return {
        success: hit.success ?? true,
        bindings: hit.bindings ?? {},
      };
    },
  } as unknown as PrologProcessType;
}

describe("checkCommand staged rendering", () => {
  test("renders coverage counts, per-file details, and advisory diagnostics in text mode", async () => {
    const cwd = prepareWorkspace();
    stageInventory(cwd, []);
    const analyze = spyOn(
      stagedCoverageModule,
      "analyzeStagedFileCoverage",
    ).mockReturnValue({
      version: "kibi.staged-file-coverage.v1",
      files: [
        {
          path: "src/greet.ts",
          status: "M",
          analysisDepth: "symbol",
          disposition: "checked",
          requirementIds: ["REQ-1", "REQ-2"],
          evidencePaths: [".kb/symbols.yaml"],
          providerId: null,
        },
        {
          path: "asset.bin",
          status: "A",
          analysisDepth: "none",
          disposition: "skipped",
          reason: "binary",
          requirementIds: [],
          evidencePaths: [],
          providerId: null,
        },
      ],
      diagnostics: [
        {
          id: "staged_file_ownership_missing",
          severity: "warning",
          blocking: false,
          path: "asset.bin",
          message: "Staged file has no requirement ownership.",
          suggestion: "Link the file to a requirement.",
          requirementIds: [],
          evidencePaths: [],
        },
      ],
    } as never);
    restores.push(() => analyze.mockRestore());
    const io = captureIo();
    restores.push(io.restore);

    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );

    expect(result.exitCode).toBe(0);
    const text = io.logText();
    expect(text).toContain(
      "Staged files: 2 total; 1 symbol-level; 0 metadata; 0 file-level; 1 skipped.",
    );
    expect(text).toContain(
      "M src/greet.ts [symbol; checked; requirements: REQ-1, REQ-2; evidence: .kb/symbols.yaml]",
    );
    expect(text).toContain("A asset.bin [none; skipped; binary]");
    expect(text).toContain("Advisory staged-file diagnostics (1):");
    expect(text).toContain(
      "[staged_file_ownership_missing] Staged file has no requirement ownership.",
    );
    expect(text).toContain("Suggestion: Link the file to a requirement.");
    expect(text).toContain("No staged files found.");
  });

  test("emits the crafted staged coverage as one structured JSON document", async () => {
    const cwd = prepareWorkspace();
    stageInventory(cwd, []);
    const analyze = spyOn(
      stagedCoverageModule,
      "analyzeStagedFileCoverage",
    ).mockReturnValue({
      version: "kibi.staged-file-coverage.v1",
      files: [
        {
          path: "src/greet.ts",
          status: "M",
          analysisDepth: "symbol",
          disposition: "checked",
          requirementIds: ["REQ-1"],
          evidencePaths: [".kb/symbols.yaml"],
          providerId: null,
        },
      ],
      diagnostics: [
        {
          id: "staged_file_impact_review_needed",
          severity: "warning",
          blocking: false,
          path: "src/greet.ts",
          message: "review",
          suggestion: "check",
          requirementIds: [],
          evidencePaths: [],
        },
      ],
    } as never);
    restores.push(() => analyze.mockRestore());
    const io = captureIo();
    restores.push(io.restore);

    const result = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        format: "json",
        kbPath: path.join(cwd, "kb-store"),
      }),
    );

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(io.logText()) as {
      structuredContent: {
        violations: unknown[];
        count: number;
        diagnostics: Array<{ id: string }>;
        qualityDiagnostics: unknown[];
        staged: { files: Array<{ path: string }> };
        messages: string[];
        operationalError?: string;
      };
    };
    expect(output.structuredContent.count).toBe(0);
    expect(output.structuredContent.violations).toEqual([]);
    expect(output.structuredContent.qualityDiagnostics).toEqual([]);
    expect(output.structuredContent.staged.files).toHaveLength(1);
    expect(output.structuredContent.diagnostics[0]?.id).toBe(
      "staged_file_impact_review_needed",
    );
    expect(output.structuredContent.messages).toContain(
      "No staged files found.",
    );
    expect(output.structuredContent.operationalError).toBeUndefined();
  });

  test("reports staged markdown entity violations as structured JSON", async () => {
    const cwd = prepareWorkspace();
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "requirements", "REQ-1.md"),
      `---
id: REQ-1
title: Auth
status: open
type: req
scenario: login
---

Body.
`,
    );
    git(cwd, "add .kb/requirements/REQ-1.md");
    const io = captureIo();
    restores.push(io.restore);

    const failed = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        format: "json",
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(failed.exitCode).toBe(1);
    const output = JSON.parse(io.logText()) as {
      structuredContent: {
        violations: Array<{ rule: string; message: string }>;
        count: number;
        qualityDiagnostics: unknown[];
        messages: string[];
      };
    };
    expect(output.structuredContent.count).toBe(1);
    expect(output.structuredContent.violations[0]?.rule).toBe(
      "staged-markdown",
    );
    expect(output.structuredContent.violations[0]?.message).toContain(
      "embedded entity",
    );
    expect(output.structuredContent.messages[0]).toBe(
      "Found embedded entity violations in staged markdown files:",
    );
    expect(output.structuredContent.messages.length).toBeGreaterThan(1);
    expect(output.structuredContent.qualityDiagnostics).toEqual([]);

    const dry = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        format: "json",
        dryRun: true,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(dry.exitCode).toBe(0);
  });

  test("reports staged extraction failure as one JSON operational error", async () => {
    const cwd = prepareWorkspace();
    const entry = stagedPath({
      path: "src/broken.ts",
      content: "export function broken() { return true; }\n",
    });
    stageInventory(cwd, [entry]);
    const analyze = spyOn(
      stagedCoverageModule,
      "analyzeStagedFileCoverage",
    ).mockReturnValue(emptyCoverage([entry]) as never);
    restores.push(() => analyze.mockRestore());
    const extract = spyOn(
      symbolExtract,
      "extractSymbolsFromStagedFileAsync",
    ).mockImplementation(async () => {
      throw new Error("parse exploded");
    });
    const collect = spyOn(
      stagedDiagnostics,
      "collectStagedKibiDiagnostics",
    ).mockReturnValue([]);
    restores.push(() => {
      extract.mockRestore();
      collect.mockRestore();
    });
    mockImpactDiagnostics();
    const io = captureIo();
    restores.push(io.restore);

    const result = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        format: "json",
        kbPath: path.join(cwd, "kb-store"),
      }),
    );

    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toBe("");
    const output = JSON.parse(io.logText());
    expect(output.structuredContent.operationalError).toContain(
      "parse exploded",
    );
  });

  test("records the first audited no-impact override declared in entity-lane markdown", async () => {
    const cwd = prepareWorkspace();
    const entries = [
      stagedPath({
        path: ".kb/facts/impact-note.md",
        analysisDepth: "metadata",
        content: "Kibi-Impact: none\nRationale: config-only tweak\n",
      }),
      stagedPath({
        path: ".kb/facts/impact-z-note.md",
        analysisDepth: "metadata",
        content:
          "Kibi-Impact: none\nRationale: second declaration is ignored\n",
      }),
      stagedPath({
        path: "src/widget.ts",
        content: "const x = 1;\n",
        diffText: "@@ -1 +1 @@\n-const x = 0;\n+const x = 1;\n",
      }),
    ];
    stageInventory(cwd, entries);
    const analyze = spyOn(
      stagedCoverageModule,
      "analyzeStagedFileCoverage",
    ).mockReturnValue(emptyCoverage(entries) as never);
    restores.push(() => analyze.mockRestore());
    const collect = spyOn(
      stagedDiagnostics,
      "collectStagedKibiDiagnostics",
    ).mockReturnValue([]);
    restores.push(() => collect.mockRestore());
    mockImpactDiagnostics();
    const io = captureIo();
    restores.push(io.restore);

    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );

    expect(result.exitCode).toBe(0);
    const evidence = collect.mock.calls[0]?.[0];
    const mode = evidence?.mode;
    expect(mode?.kind).toBe("no_impact_override");
    if (mode?.kind === "no_impact_override") {
      expect(mode.override).toMatchObject({
        path: ".kb/facts/impact-note.md",
        rationale: "config-only tweak",
        reason: "non_behavioral_source_edit",
        sourcePaths: ["src/widget.ts"],
      });
    }
    expect(io.logText()).toContain(
      "No exported symbols or staged entities found in staged files.",
    );
  });

  test("does not count entity markdown of unknown types as KB impact evidence", async () => {
    const cwd = prepareWorkspace();
    const entries = [
      stagedPath({
        path: ".kb/requirements/NOTE-1.md",
        analysisDepth: "metadata",
        content: `---
id: NOTE-1
title: Product note
type: epic
status: open
---

Body.
`,
      }),
      stagedPath({
        path: "src/greet.ts",
        content: "export function greet() { return 1; }\n",
      }),
    ];
    stageInventory(cwd, entries);
    const analyze = spyOn(
      stagedCoverageModule,
      "analyzeStagedFileCoverage",
    ).mockReturnValue(emptyCoverage(entries) as never);
    restores.push(() => analyze.mockRestore());
    const collect = spyOn(
      stagedDiagnostics,
      "collectStagedKibiDiagnostics",
    ).mockReturnValue([]);
    restores.push(() => collect.mockRestore());
    mockImpactDiagnostics();
    const { project } = mockTempKb();
    const io = captureIo();
    restores.push(io.restore);

    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );

    // Unknown-type entity markdown is not KB impact evidence, so the staged
    // production source fails the ownership gate.
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("src/greet.ts");
    expect(io.logText()).not.toContain("No violations found");
  });

  test("rejects duplicate authored symbol IDs instead of transferring ownership", async () => {
    const cwd = prepareWorkspace();
    stageInventory(cwd, [
      stagedPath({
        path: ".kb/symbols.yaml",
        analysisDepth: "metadata",
        content:
          "symbols:\n  - id: SYM-DUP\n    title: first\n    sourceFile: src/one.ts\n  - id: SYM-DUP\n    title: second\n    sourceFile: src/two.ts\n",
      }),
    ]);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        format: "json",
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(result.exitCode).toBe(1);
    const operationalError = JSON.parse(io.logText()).structuredContent
      .operationalError as string;
    expect(operationalError).toContain("Duplicate snapshot entities:");
    expect(operationalError).toContain("SYM-DUP");
    expect(operationalError).toContain("src/one.ts");
    expect(operationalError).toContain("src/two.ts");
  });
});

describe("checkCommand full-KB text rendering", () => {
  function mockAttachedProlog(cwd: string): string {
    const kbPath = path.join(cwd, "kb-store");
    mkdirSync(kbPath, { recursive: true });
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const query = spyOn(PrologProcess.prototype, "query").mockResolvedValue({
      success: true,
      bindings: {},
    } as never);
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    restores.push(() => {
      start.mockRestore();
      query.mockRestore();
      terminate.mockRestore();
    });
    return kbPath;
  }

  test("omits the entity and suggestion lines when the source basename matches the entity id", async () => {
    const cwd = prepareWorkspace();
    const kbPath = mockAttachedProlog(cwd);
    const execute = spyOn(checkExecutor, "executeCheck").mockResolvedValue({
      content: [],
      structuredContent: {
        violations: [
          {
            rule: "required-fields",
            entityId: "REQ-1",
            source: ".kb/requirements/REQ-1.md",
            description: "Missing owner",
            suggestion: "Add owner",
          },
          {
            rule: "no-cycles",
            entityId: "REQ-2",
            description: "cycle",
          },
        ],
        qualityDiagnostics: [],
      },
    } as never);
    restores.push(() => execute.mockRestore());
    const io = captureIo();
    restores.push(io.restore);

    const result = await withCwd(cwd, () => checkCommand({ kbPath }));

    expect(result.exitCode).toBe(1);
    const text = io.logText();
    expect(text).toContain("Found 2 violation(s):");
    expect(text).toContain("[required-fields] REQ-1");
    expect(text).toContain("Source: .kb/requirements/REQ-1.md");
    expect(text).toContain("Missing owner");
    expect(text).toContain("[no-cycles] REQ-2");
    expect(text).not.toContain("Entity:");
    expect(text).not.toContain("Suggestion:");
  });

  test("prints quality diagnostics without optional entity, files, or docs lines", async () => {
    const cwd = prepareWorkspace();
    const kbPath = mockAttachedProlog(cwd);
    const execute = spyOn(checkExecutor, "executeCheck").mockResolvedValue({
      content: [],
      structuredContent: {
        violations: [],
        qualityDiagnostics: [
          {
            id: "status.info",
            severity: "info",
            blocking: false,
            category: "status",
            message: "all good",
            suggestion: "no action needed",
          },
        ],
      },
    } as never);
    restores.push(() => execute.mockRestore());
    const io = captureIo();
    restores.push(io.restore);

    const result = await withCwd(cwd, () => checkCommand({ kbPath }));

    expect(result.exitCode).toBe(0);
    const text = io.logText();
    expect(text).toContain("No violations found. KB is valid.");
    expect(text).toContain("Quality diagnostics (1):");
    expect(text).toContain("[INFO status.info] all good");
    expect(text).toContain("Blocking: no");
    expect(text).toContain("Suggestion: no action needed");
    expect(text).not.toContain("Entity:");
    expect(text).not.toContain("Files:");
    expect(text).not.toContain("Docs:");
  });
});

describe("check Prolog rule helpers with crafted query results", () => {
  test("reports a self-dependency cycle with resolved source names", async () => {
    const violations = await checkNoCycles(
      respondTo([
        {
          includes: "kb_relationship(depends_on",
          bindings: { Deps: "[['SELF-A','SELF-A']]" },
        },
        {
          includes: "kb_entity('SELF-A'",
          bindings: { Props: 'source=^^("docs/self A.md")' },
        },
      ]),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: "no-cycles",
      entityId: "SELF-A",
    });
    expect(violations[0]?.description).toBe(
      "Circular dependency detected: self A → self A",
    );
  });

  test("checkRequiredFields accepts complete entities and skips unqueryable ids", async () => {
    const violations = await checkRequiredFields(
      respondTo([
        {
          includes: "kb_entity('REQ-FULL'",
          bindings: {
            Props:
              "id=REQ-FULL,title=Done,status=open,created_at=t,updated_at=t,source=s.md",
          },
        },
      ]),
      ["REQ-FULL", "REQ-GONE"],
    );
    expect(violations).toEqual([]);
  });

  test("checkDeprecatedAdrs reports every deprecated ADR and missing sources", async () => {
    const violations = await checkDeprecatedAdrs(
      respondTo([
        {
          includes: "deprecated_no_successor",
          bindings: { Ids: "['ADR-1',ADR-2]" },
        },
        {
          includes: "kb_entity('ADR-1'",
          bindings: { Props: 'source=^^("docs/adr-1.md")' },
        },
        {
          includes: "kb_entity('ADR-2'",
          bindings: { Props: "title=No Source" },
        },
      ]),
    );
    expect(violations.map((violation) => violation.entityId)).toEqual([
      "ADR-1",
      "ADR-2",
    ]);
    expect(violations[0]?.source).toBe("docs/adr-1.md");
    expect(violations[1]?.source).toBe("");
    expect(violations[1]?.suggestion).toContain("target: ADR-2");
  });

  test("checkMustPriorityCoverage reads single-caret source props", async () => {
    const violations = await checkMustPriorityCoverage(
      respondTo([
        {
          includes: "findall(Id",
          bindings: { Ids: "['REQ-SINGLE']" },
        },
        {
          includes: "kb_entity('REQ-SINGLE'",
          bindings: { Props: 'source=^("docs/single.md")' },
        },
      ]),
    );
    expect(violations[0]?.source).toBe("docs/single.md");
    expect(violations[0]?.description).toContain("scenario and test coverage");
  });

  test("checkNoDanglingRefs checks every relationship lane", async () => {
    const violations = await checkNoDanglingRefs(
      respondTo([
        { includes: "findall(Id", bindings: { Ids: "[REQ-1]" } },
        {
          includes: "kb_relationship(relates_to",
          bindings: { Rels: "[['REQ-1','GONE-2']]" },
        },
        {
          includes: "kb_relationship(verified_by",
          bindings: { Rels: "[['MISSING-3','REQ-1']]" },
        },
      ]),
    );
    expect(violations.map((violation) => violation.entityId).sort()).toEqual([
      "GONE-2",
      "MISSING-3",
    ]);
    expect(new Set(violations.map((violation) => violation.rule))).toEqual(
      new Set(["no-dangling-refs"]),
    );
  });

  test("getAllEntityIds parses quoted and bare ids without a type filter", async () => {
    const ids = await getAllEntityIds(
      respondTo([
        { includes: "findall(Id", bindings: { Ids: "['REQ-A',FACT-B]" } },
      ]),
    );
    expect(ids).toEqual(["REQ-A", "FACT-B"]);
  });

  test("checkDomainContradictions normalizes namespaced entity ids", async () => {
    const violations = await checkDomainContradictions(
      respondTo([
        {
          includes: "contradicting_reqs",
          bindings: {
            Rows: "[[kb:entity/REQ-X,kb:entity/REQ-Y,max_roles 2 vs 3]]",
          },
        },
      ]),
    );
    expect(violations[0]).toMatchObject({
      rule: "domain-contradictions",
      entityId: "REQ-X/REQ-Y",
      description: "max_roles 2 vs 3 [strict-readiness: contradiction-ready]",
    });
  });

  test("checkStrictFactShape parses multiple violation terms and omits absent sources", async () => {
    const rows = await checkStrictFactShape(
      respondTo([
        {
          includes: "strict_fact_shape_violation",
          bindings: {
            Violations:
              '[violation(strict_fact_shape,FACT-1,"bad shape","fix it"),violation(strict_fact_shape,FACT-2,"worse","run")]',
          },
        },
      ]),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      rule: "strict_fact_shape",
      entityId: "FACT-1",
      description: "bad shape",
      suggestion: "fix it",
    });
    expect(rows[0]?.source).toBeUndefined();
    expect(rows[1]?.entityId).toBe("FACT-2");
  });
});
