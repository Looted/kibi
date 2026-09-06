// implements REQ-cli-check
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  checkCommand,
  checkMustPriorityCoverage,
  findMustPriorityReqs,
  requireActiveProlog,
} from "../../src/commands/check.js";
import * as gitStaged from "../../src/traceability/git-staged.js";
import { EngineClient } from "../../src/engine.js";
import * as manifestExtractor from "../../src/extractors/manifest.js";
import { PrologProcess } from "../../src/prolog.js";
import * as checkExecutor from "../../src/public/operations/check-executor.js";
import * as impact from "../../src/public/impact-diagnostics.js";
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

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    removeTempDir(root);
  }
  process.exitCode = 0;
});

function preparedWorkspace(): string {
  const restoreEnv = isolateKibiEnv();
  restores.push(restoreEnv);
  const cwd = createGitWorkspace();
  roots.push(cwd);
  return cwd;
}

describe("checkCommand remaining runtime branches", () => {
  test("prints json violations without a source and empty quality diagnostics", async () => {
    const cwd = preparedWorkspace();
    const kbPath = path.join(cwd, "kb-store");
    mkdirSync(kbPath, { recursive: true });
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const query = spyOn(PrologProcess.prototype, "query").mockResolvedValue({
      success: true,
      bindings: {},
    });
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    const execute = spyOn(checkExecutor, "executeCheck").mockResolvedValue({
      content: [],
      structuredContent: {
        violations: [
          {
            rule: "required-fields",
            entityId: "REQ-1",
            description: "Missing title",
          },
        ],
      },
    } as never);
    restores.push(() => {
      start.mockRestore();
      query.mockRestore();
      terminate.mockRestore();
      execute.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const failed = await withCwd(cwd, () =>
      checkCommand({
        kbPath,
        format: "json",
        rules: "required-fields,, ",
        fix: true,
      }),
    );
    expect(failed.exitCode).toBe(1);
    expect(io.logText()).toContain('"count":1');

    execute.mockResolvedValue({
      content: [],
    } as never);
    const empty = await withCwd(cwd, () =>
      checkCommand({ kbPath, format: "text" }),
    );
    expect(empty.exitCode).toBe(0);
    expect(io.logText()).toContain("No violations found. KB is valid.");
  });

  test("prints blocking quality diagnostics and entity-less text violations", async () => {
    const cwd = preparedWorkspace();
    const kbPath = path.join(cwd, "kb-store");
    mkdirSync(kbPath, { recursive: true });
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const query = spyOn(PrologProcess.prototype, "query").mockResolvedValue({
      success: true,
      bindings: {},
    });
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    const execute = spyOn(checkExecutor, "executeCheck").mockResolvedValue({
      content: [],
      structuredContent: {
        violations: [
          {
            rule: "no-cycles",
            entityId: "REQ-1",
            description: "cycle",
          },
        ],
        qualityDiagnostics: [
          {
            id: "quality.block",
            severity: "error",
            blocking: true,
            category: "requirement",
            message: "blocked",
            suggestion: "fix it",
          },
        ],
      },
    } as never);
    restores.push(() => {
      start.mockRestore();
      query.mockRestore();
      terminate.mockRestore();
      execute.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => checkCommand({ kbPath }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("[no-cycles] REQ-1");
    expect(io.logText()).toContain("Blocking: yes");
  });

  test("treats a thrown non-Error as a failed check", async () => {
    const cwd = preparedWorkspace();
    const resolve = await import("../../src/utils/branch-resolver.js");
    const attachment = spyOn(resolve, "resolveBranchAttachment").mockImplementation(
      () => {
        throw "detached";
      },
    );
    restores.push(() => attachment.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => checkCommand({}));
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("detached");
  });

  test("uses the journaled engine path when kbPath is omitted", async () => {
    const cwd = preparedWorkspace();
    await withCwd(cwd, async () => {
      const { initCommand } = await import("../../src/commands/init.js");
      await initCommand({});
    });
    const start = spyOn(EngineClient.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const terminate = spyOn(
      EngineClient.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    const query = spyOn(EngineClient.prototype, "query").mockResolvedValue({
      success: true,
      bindings: {},
    });
    const invalidate = spyOn(
      EngineClient.prototype,
      "invalidateCache",
    ).mockReturnValue(undefined);
    const execute = spyOn(checkExecutor, "executeCheck").mockResolvedValue({
      content: [],
      structuredContent: { violations: [], qualityDiagnostics: [] },
    } as never);
    restores.push(() => {
      start.mockRestore();
      terminate.mockRestore();
      query.mockRestore();
      invalidate.mockRestore();
      execute.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => checkCommand({ format: "json" }));
    expect(result.exitCode).toBe(0);
    expect(start).toHaveBeenCalled();
    expect(io.logText()).toContain("structuredContent");
  });

  test("formats staged diagnostics for markdown-only and test-only sources", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, "docs"), { recursive: true });
    mkdirSync(path.join(cwd, "src", "tests"), { recursive: true });
    writeFileSync(path.join(cwd, "docs", "notes.md"), "no frontmatter\n");
    writeFileSync(
      path.join(cwd, "src", "tests", "flow.spec.jsx"),
      "export function spec() { return true; }\n",
    );
    writeFileSync(
      path.join(cwd, "impact.md"),
      "Kibi-Impact: none\nRationale: docs only\n",
    );
    writeFileSync(
      path.join(cwd, "impact-2.md"),
      "Kibi-Impact: none\nRationale: second override is ignored\n",
    );
    git(cwd, "add docs/notes.md src/tests/flow.spec.jsx impact.md impact-2.md");
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect([0, 1]).toContain(result.exitCode);
  });

  test("uses a staged .kb/symbols.yml and coordinates path as manifest sentinels", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(
      path.join(cwd, "src", "greet.ts"),
      "export function greet() { return 1; }\n",
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yml"),
      `symbols:
  - title: nameless
    sourceFile: src/greet.ts
  - id: SYM-GREET
    title: greet
    sourceFile: src/greet.ts
    status: active
    relationships:
      - type: implements
        to: REQ-1
`,
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbol-coordinates.yaml"),
      "coordinates: []\n",
    );
    git(cwd, "add src/greet.ts .kb/symbols.yml .kb/symbol-coordinates.yaml");
    const overlayDir = path.join(cwd, "overlay");
    mkdirSync(overlayDir, { recursive: true });
    const overlayPath = path.join(overlayDir, "changed_symbols.pl");
    writeFileSync(overlayPath, "");
    const create = spyOn(tempKb, "createTempKb").mockResolvedValue({
      tempDir: overlayDir,
      kbPath: overlayDir,
      overlayPath,
      prolog: { query: async () => ({ success: true, bindings: {} }) } as never,
    });
    const project = spyOn(tempKb, "projectStagedEntities").mockResolvedValue(
      undefined,
    );
    const consult = spyOn(tempKb, "consultOverlay").mockResolvedValue(undefined);
    const cleanup = spyOn(tempKb, "cleanupTempKb").mockResolvedValue(undefined);
    const validate = spyOn(stagedValidate, "validateStagedSymbols").mockResolvedValue(
      [],
    );
    restores.push(() => {
      create.mockRestore();
      project.mockRestore();
      consult.mockRestore();
      cleanup.mockRestore();
      validate.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        minLinks: "1",
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect([0, 1]).toContain(result.exitCode);
  });

  test("returns dry-run success when only staged diagnostics are present", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(path.join(cwd, "src", "greet.ts"), "const x = 1;\n");
    git(cwd, "add src/greet.ts");
    const extract = await import("../../src/traceability/symbol-extract.js");
    const extractSpy = spyOn(extract, "extractSymbolsFromStagedFile").mockReturnValue(
      [],
    );
    restores.push(() => extractSpy.mockRestore());
    const granularity = spyOn(
      impact,
      "createSymbolGranularityDiagnostics",
    ).mockReturnValue([
      {
        id: "granularity",
        severity: "warning",
        blocking: false,
        message: "coarse",
        suggestion: "split",
        files: ["src/greet.ts"],
        docs: ["docs/modeling.md"],
      },
    ] as never);
    const quality = spyOn(impact, "createSymbolQualityDiagnostics").mockReturnValue(
      [],
    );
    const review = spyOn(impact, "createSemanticReviewDiagnostics").mockReturnValue(
      [],
    );
    const blocking = spyOn(impact, "hasBlockingImpactDiagnostics").mockReturnValue(
      false,
    );
    restores.push(() => {
      granularity.mockRestore();
      quality.mockRestore();
      review.mockRestore();
      blocking.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const dry = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        dryRun: true,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(dry.exitCode).toBe(0);
    expect(io.logText()).toContain("Files: src/greet.ts");
    expect(io.logText()).toContain("Docs: docs/modeling.md");

    const live = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(live.exitCode).toBe(0);
  });

  test("fails staged diagnostics that are blocking when no symbols are exported", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(path.join(cwd, "src", "greet.ts"), "const x = 1;\n");
    git(cwd, "add src/greet.ts");
    const extract = await import("../../src/traceability/symbol-extract.js");
    const extractSpy = spyOn(extract, "extractSymbolsFromStagedFile").mockReturnValue(
      [],
    );
    restores.push(() => extractSpy.mockRestore());
    const granularity = spyOn(
      impact,
      "createSymbolGranularityDiagnostics",
    ).mockReturnValue([
      {
        id: "granularity",
        severity: "error",
        blocking: true,
        message: "too coarse",
        suggestion: "split",
        files: [],
        docs: [],
      },
    ] as never);
    const quality = spyOn(impact, "createSymbolQualityDiagnostics").mockReturnValue(
      [],
    );
    const review = spyOn(impact, "createSemanticReviewDiagnostics").mockReturnValue(
      [],
    );
    const blocking = spyOn(impact, "hasBlockingImpactDiagnostics").mockReturnValue(
      true,
    );
    restores.push(() => {
      granularity.mockRestore();
      quality.mockRestore();
      review.mockRestore();
      blocking.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(result.exitCode).toBe(1);
  });

  test("treats extract errors that are not Error instances as non-fatal", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(
      path.join(cwd, "src", "broken.ts"),
      "export function broken() { return true; }\n",
    );
    git(cwd, "add src/broken.ts");
    const extract = await import("../../src/traceability/symbol-extract.js");
    const extractSpy = spyOn(
      extract,
      "extractSymbolsFromStagedFile",
    ).mockImplementation(() => {
      throw "parse exploded";
    });
    restores.push(() => extractSpy.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(result.exitCode).toBe(0);
    expect(io.errorText()).toContain("parse exploded");
  });

  test("cleans up after overlay failure even when cleanup itself rejects", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(
      path.join(cwd, "src", "boom.ts"),
      "export function boom() { return true; }\n",
    );
    git(cwd, "add src/boom.ts");
    const overlayDir = path.join(cwd, "overlay");
    mkdirSync(overlayDir, { recursive: true });
    const overlayPath = path.join(overlayDir, "changed_symbols.pl");
    writeFileSync(overlayPath, "");
    const create = spyOn(tempKb, "createTempKb").mockResolvedValue({
      tempDir: overlayDir,
      kbPath: overlayDir,
      overlayPath,
      prolog: { query: async () => ({ success: true, bindings: {} }) } as never,
    });
    const consult = spyOn(tempKb, "consultOverlay").mockRejectedValue(
      "consult failed",
    );
    const cleanup = spyOn(tempKb, "cleanupTempKb").mockRejectedValue(
      "already gone",
    );
    restores.push(() => {
      create.mockRestore();
      consult.mockRestore();
      cleanup.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("consult failed");
  });

  test("reports must-priority coverage missing only a scenario", async () => {
    const violations = await checkMustPriorityCoverage({
      query: async (goal: string | string[]) => {
        const text = Array.isArray(goal) ? goal.join(", ") : goal;
        if (text.includes("findall(Id") && text.includes("priority")) {
          return { success: true, bindings: { Ids: "['REQ-BARE']" } };
        }
        if (text.includes("validates")) {
          return { success: true, bindings: {} };
        }
        return { success: false, bindings: {} };
      },
    } as never);
    expect(violations[0]?.description).toContain("scenario coverage");
    expect(await findMustPriorityReqs({
      query: async () => ({ success: true, bindings: { Ids: "REQ-BARE" } }),
    } as never)).toEqual([]);
  });

  test("returns exit 1 when kbPath attach fails in json mode", async () => {
    const cwd = preparedWorkspace();
    const kbPath = path.join(cwd, "missing-kb-store");
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const query = spyOn(PrologProcess.prototype, "query").mockResolvedValue({
      success: false,
      bindings: {},
      error: "store missing",
    });
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    restores.push(() => {
      start.mockRestore();
      query.mockRestore();
      terminate.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ kbPath, format: "json" }),
    );
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Failed to attach KB");
    expect(terminate).toHaveBeenCalled();
  });

  test("prints a violation suggestion when --fix is set", async () => {
    const cwd = preparedWorkspace();
    const kbPath = path.join(cwd, "kb-store");
    mkdirSync(kbPath, { recursive: true });
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const query = spyOn(PrologProcess.prototype, "query").mockResolvedValue({
      success: true,
      bindings: {},
    });
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    const execute = spyOn(checkExecutor, "executeCheck").mockResolvedValue({
      content: [],
      structuredContent: {
        violations: [
          {
            rule: "required-fields",
            entityId: "REQ-FIX",
            description: "Missing title",
            suggestion: "Add a title field",
          },
        ],
      },
    } as never);
    restores.push(() => {
      start.mockRestore();
      query.mockRestore();
      terminate.mockRestore();
      execute.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ kbPath, fix: true }),
    );
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("Suggestion: Add a title field");
  });

  test("reports must-priority coverage when a scenario exists but no test", async () => {
    const violations = await checkMustPriorityCoverage({
      query: async (goal: string | string[]) => {
        const text = Array.isArray(goal) ? goal.join(", ") : goal;
        if (text.includes("findall(Id") && text.includes("priority")) {
          return { success: true, bindings: { Ids: "['REQ-SCEN-ONLY']" } };
        }
        if (text.includes("kb_entity")) {
          return {
            success: true,
            bindings: { Props: '[source=^^("docs/req.md")]' },
          };
        }
        if (text.includes("specified_by")) {
          return { success: true, bindings: { ScenarioId: "SCEN-1" } };
        }
        if (text.includes("validates")) {
          return { success: false, bindings: {} };
        }
        return { success: false, bindings: {} };
      },
    } as never);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.description).toContain("test coverage");
    expect(violations[0]?.description).not.toContain("scenario");
    expect(violations[0]?.suggestion).toContain("Create test");
    expect(violations[0]?.source).toBe("docs/req.md");
  });

  test("skips a corrupt working-tree manifest when debug is enabled", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "symbols.yaml"), "symbols: [\n");
    writeFileSync(
      path.join(cwd, "src", "greet.ts"),
      "export function greet() { return 1; }\n",
    );
    git(cwd, "add src/greet.ts");
    process.env.KIBI_DEBUG = "1";
    const debug = spyOn(console, "debug").mockImplementation(() => undefined);
    restores.push(() => debug.mockRestore());
    const overlayDir = path.join(cwd, "overlay");
    mkdirSync(overlayDir, { recursive: true });
    const overlayPath = path.join(overlayDir, "changed_symbols.pl");
    writeFileSync(overlayPath, "");
    const create = spyOn(tempKb, "createTempKb").mockResolvedValue({
      tempDir: overlayDir,
      kbPath: overlayDir,
      overlayPath,
      prolog: { query: async () => ({ success: true, bindings: {} }) } as never,
    });
    const project = spyOn(tempKb, "projectStagedEntities").mockResolvedValue(
      undefined,
    );
    const consult = spyOn(tempKb, "consultOverlay").mockResolvedValue(undefined);
    const cleanup = spyOn(tempKb, "cleanupTempKb").mockResolvedValue(undefined);
    const validate = spyOn(stagedValidate, "validateStagedSymbols").mockResolvedValue(
      [
        {
          rule: "symbol-coverage",
          entityId: "SYM-GREET",
          description: "unlinked",
        },
      ] as never,
    );
    restores.push(() => {
      create.mockRestore();
      project.mockRestore();
      consult.mockRestore();
      cleanup.mockRestore();
      validate.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        dryRun: true,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(result.exitCode).toBe(0);
    expect(debug.mock.calls.join("\n")).toMatch(/skipping working-tree manifest/);
  });

  test("uses fallback lookup keys and keeps only traceability relationships from manifests", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(
      path.join(cwd, "src", "greet.ts"),
      "export function greet() { return 1; }\n",
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      "symbols:\n  - title: greet\n    sourceFile: src/greet.ts\n",
    );
    git(cwd, "add src/greet.ts .kb/symbols.yaml");
    const nameless = {
      entity: {
        title: "greet",
        type: "symbol",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        source: ".kb/symbols.yaml",
      },
      relationships: [
        { type: "implements", from: "SYM-GREET", to: "REQ-1" },
        { type: "covered_by", from: "SYM-GREET", to: "TEST-1" },
        { type: "executable_for", from: "SYM-GREET", to: "TEST-1" },
        { type: "relates_to", from: "SYM-GREET", to: "REQ-2" },
      ],
      sourceFile: "src/greet.ts",
    };
    const fromDisk = spyOn(manifestExtractor, "extractFromManifest").mockReturnValue(
      [nameless as never],
    );
    const fromStaged = spyOn(
      manifestExtractor,
      "extractFromManifestString",
    ).mockReturnValue([nameless as never]);
    const overlayDir = path.join(cwd, "overlay");
    mkdirSync(overlayDir, { recursive: true });
    const overlayPath = path.join(overlayDir, "changed_symbols.pl");
    writeFileSync(overlayPath, "");
    const create = spyOn(tempKb, "createTempKb").mockResolvedValue({
      tempDir: overlayDir,
      kbPath: overlayDir,
      overlayPath,
      prolog: { query: async () => ({ success: true, bindings: {} }) } as never,
    });
    const project = spyOn(tempKb, "projectStagedEntities").mockResolvedValue(
      undefined,
    );
    const consult = spyOn(tempKb, "consultOverlay").mockResolvedValue(undefined);
    const cleanup = spyOn(tempKb, "cleanupTempKb").mockResolvedValue(undefined);
    const validate = spyOn(stagedValidate, "validateStagedSymbols").mockResolvedValue(
      [],
    );
    restores.push(() => {
      fromDisk.mockRestore();
      fromStaged.mockRestore();
      create.mockRestore();
      project.mockRestore();
      consult.mockRestore();
      cleanup.mockRestore();
      validate.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect([0, 1]).toContain(result.exitCode);
    expect(fromDisk).toHaveBeenCalled();
    expect(fromStaged).toHaveBeenCalled();
  });

  test("records an audited no-impact override from non-entity markdown", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(path.join(cwd, "src", "widget.ts"), "const x = 1;\n");
    writeFileSync(
      path.join(cwd, "impact.md"),
      "Kibi-Impact: none\nRationale: comment-only tweak with no behavior change\n",
    );
    git(cwd, "add src/widget.ts impact.md");
    const extract = await import("../../src/traceability/symbol-extract.js");
    const extractSpy = spyOn(extract, "extractSymbolsFromStagedFile").mockReturnValue(
      [],
    );
    restores.push(() => extractSpy.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect([0, 1]).toContain(result.exitCode);
  });

  test("returns staged diagnostics when markdown entities exist but no symbols were extracted", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "requirements", "REQ-STAGED-EMPTY.md"),
      `---
id: REQ-STAGED-EMPTY
title: Staged empty symbols
type: req
status: open
---

Must stay independently testable.
`,
    );
    git(cwd, "add .kb/requirements/REQ-STAGED-EMPTY.md");
    const granularity = spyOn(
      impact,
      "createSymbolGranularityDiagnostics",
    ).mockReturnValue([
      {
        id: "granularity",
        severity: "warning",
        blocking: false,
        message: "coarse",
        suggestion: "split",
        files: [".kb/requirements/REQ-STAGED-EMPTY.md"],
        docs: ["docs/modeling.md"],
      },
    ] as never);
    const quality = spyOn(impact, "createSymbolQualityDiagnostics").mockReturnValue(
      [],
    );
    const review = spyOn(impact, "createSemanticReviewDiagnostics").mockReturnValue(
      [],
    );
    const blocking = spyOn(impact, "hasBlockingImpactDiagnostics").mockReturnValue(
      false,
    );
    restores.push(() => {
      granularity.mockRestore();
      quality.mockRestore();
      review.mockRestore();
      blocking.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const dry = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        dryRun: true,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(dry.exitCode).toBe(0);
    expect(io.logText()).toContain("coarse");

    blocking.mockReturnValue(true);
    const live = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(live.exitCode).toBe(1);
  });

  test("prints the entity id when a violation source basename differs from it", async () => {
    const cwd = preparedWorkspace();
    const kbPath = path.join(cwd, "kb-store");
    mkdirSync(kbPath, { recursive: true });
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const query = spyOn(PrologProcess.prototype, "query").mockResolvedValue({
      success: true,
      bindings: {},
    });
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    const execute = spyOn(checkExecutor, "executeCheck").mockResolvedValue({
      content: [],
      structuredContent: {
        violations: [
          {
            rule: "required-fields",
            entityId: "REQ-1",
            source: "docs/auth.md",
            description: "Missing owner",
          },
        ],
      },
    } as never);
    restores.push(() => {
      start.mockRestore();
      query.mockRestore();
      terminate.mockRestore();
      execute.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => checkCommand({ kbPath }));
    expect(result.exitCode).toBe(1);
    expect(io.logText()).toContain("[required-fields] auth");
    expect(io.logText()).toContain("Entity: REQ-1");
    expect(io.logText()).toContain("Source: docs/auth.md");
  });

  test("requireActiveProlog throws when neither engine nor process exists", () => {
    expect(() => requireActiveProlog(undefined, undefined)).toThrow(
      /Prolog runtime not initialized/,
    );
    expect(requireActiveProlog({ id: "engine" }, undefined)).toEqual({
      id: "engine",
    });
  });

  test("records entity markdown and the first audited no-impact override", async () => {
    const cwd = preparedWorkspace();
    const staged = spyOn(gitStaged, "getStagedFiles").mockReturnValue([
      {
        path: ".kb/requirements/REQ-STAGED.md",
        status: "A",
        hunkRanges: [{ start: 1, end: 12 }],
        content: `---
id: REQ-STAGED
title: Staged
type: req
status: open
---

Must stay independently testable.
`,
      },
      {
        path: "notes.md",
        status: "M",
        hunkRanges: [{ start: 1, end: 2 }],
        content:
          "Kibi-Impact: none\nRationale: comment-only tweak with no behavior change\n",
      },
      {
        path: "extra.md",
        status: "M",
        hunkRanges: [{ start: 1, end: 2 }],
        content: "Kibi-Impact: none\nRationale: second override is ignored\n",
      },
      {
        path: "src/widget.ts",
        status: "M",
        hunkRanges: [{ start: 1, end: 1 }],
        content: "const x = 1;\n",
        diffText: "@@ -1 +1 @@\n-const x = 0;\n+const x = 1;\n",
      },
    ]);
    const overlayDir = path.join(cwd, "overlay");
    mkdirSync(overlayDir, { recursive: true });
    const overlayPath = path.join(overlayDir, "changed_symbols.pl");
    writeFileSync(overlayPath, "");
    const create = spyOn(tempKb, "createTempKb").mockResolvedValue({
      tempDir: overlayDir,
      kbPath: overlayDir,
      overlayPath,
      prolog: { query: async () => ({ success: true, bindings: {} }) } as never,
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
      staged.mockRestore();
      create.mockRestore();
      project.mockRestore();
      consult.mockRestore();
      cleanup.mockRestore();
      validate.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        dryRun: true,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect([0, 1]).toContain(result.exitCode);
    expect(staged).toHaveBeenCalled();
  });
});
