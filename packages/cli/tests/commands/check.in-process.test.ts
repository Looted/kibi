import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkCommand } from "../../src/commands/check.js";
import { engineStopCommand } from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import { PrologProcess } from "../../src/prolog.js";
import * as checkExecutor from "../../src/public/operations/check-executor.js";
import * as tempKb from "../../src/traceability/temp-kb.js";
import * as stagedValidate from "../../src/traceability/validate.js";
import {
  captureIo,
  createGitWorkspace,
  createTempDir,
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
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Staged-only cases never start an engine.
    }
    removeTempDir(root);
  }
});

describe("checkCommand", () => {
  test("returns an error when the workspace is not a git repository", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createTempDir("kibi-check-nongit-");
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => checkCommand({}));
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Error:");
  });

  test("treats empty staged sets as success", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, ".kb", "missing") }),
    );
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("No staged files found.");
  });

  test("fails staged markdown that embeds another entity type", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
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
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(failed.exitCode).toBe(1);
    expect(io.logText()).toContain("embedded entity");

    const dry = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        dryRun: true,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(dry.exitCode).toBe(0);
  });

  test("accepts staged files that have no exported symbols or entities", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    writeFileSync(path.join(cwd, "notes.txt"), "hello\n");
    git(cwd, "add notes.txt");
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toMatch(/No exported symbols|No staged files|No violations/);
  });

  test("runs journaled check as json after init", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, async () => {
      await initCommand({});
      return checkCommand({ format: "json", rules: "required-fields" });
    });
    expect([0, 1]).toContain(result.exitCode);
    expect(io.logText()).toContain("structuredContent");
  });

  test("warns when reading a legacy branch attachment", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "branches", "main"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "branches", "main", "kb.rdf"), "legacy\n");
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () => checkCommand({ staged: true }));
    expect(io.warns.join("\n")).toContain("legacy KB attachment");
    expect(result.exitCode).toBe(0);
  });

  test("fails when an explicit kb-path cannot be attached", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    const kbPath = path.join(cwd, "empty-kb");
    mkdirSync(kbPath, { recursive: true });
    const io = captureIo();
    restores.push(io.restore);
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined as never,
    );
    const query = spyOn(PrologProcess.prototype, "query").mockResolvedValue({
      success: false,
      bindings: {},
      error: "attach failed",
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
    const result = await withCwd(cwd, () => checkCommand({ kbPath }));
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("Failed to attach KB");
  });

  test("prints text violations, suggestions, and quality diagnostics", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
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
            source: ".kb/requirements/REQ-1.md",
            suggestion: "Add title",
          },
          {
            rule: "no-cycles",
            entityId: "REQ-1",
            description: "cycle",
          },
        ],
        qualityDiagnostics: [
          {
            id: "quality.review",
            severity: "warning",
            blocking: false,
            category: "requirement",
            entityId: "REQ-1",
            files: ["src/a.ts"],
            docs: ["docs/modeling.md"],
            message: "needs review",
            suggestion: "tighten the claim",
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
      checkCommand({ kbPath, fix: true }),
    );
    expect(failed.exitCode).toBe(1);
    expect(io.logText()).toContain("Found 2 violation");
    expect(io.logText()).toContain("Suggestion: Add title");
    expect(io.logText()).toContain("Quality diagnostics");
    expect(io.logText()).toContain("Entity: REQ-1");

    execute.mockResolvedValue({
      content: [],
      structuredContent: {
        violations: [],
        qualityDiagnostics: [
          {
            id: "quality.info",
            severity: "info",
            blocking: false,
            category: "status",
            message: "ok",
            suggestion: "none",
          },
        ],
      },
    } as never);
    const clean = await withCwd(cwd, () => checkCommand({ kbPath }));
    expect(clean.exitCode).toBe(0);
    expect(io.logText()).toContain("No violations found. KB is valid.");
  });

  test("accepts staged entity markdown without exported symbols", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "requirements", "REQ-1.md"),
      `---
id: REQ-1
title: Auth
status: open
type: req
---

Login works.
`,
    );
    git(cwd, "add .kb/requirements/REQ-1.md");
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toMatch(/No violations found in staged files/);
  });

  test("reports impact diagnostics for staged TypeScript without a symbols manifest", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(path.join(cwd, "src", "greet.ts"), "export function greet() { return 1; }\n");
    git(cwd, "add src/greet.ts");
    const overlayDir = mkdtempSync(path.join(os.tmpdir(), "kibi-overlay-"));
    roots.push(overlayDir);
    const overlayPath = path.join(overlayDir, "changed_symbols.pl");
    writeFileSync(overlayPath, "");
    const create = spyOn(tempKb, "createTempKb").mockResolvedValue({
      tempDir: overlayDir,
      kbPath: overlayDir,
      overlayPath,
      prolog: { query: async () => ({ success: true, bindings: {} }) } as never,
    });
    const consult = spyOn(tempKb, "consultOverlay").mockResolvedValue(undefined);
    const cleanup = spyOn(tempKb, "cleanupTempKb").mockResolvedValue(undefined);
    const validate = spyOn(stagedValidate, "validateStagedSymbols").mockResolvedValue(
      [],
    );
    restores.push(() => {
      create.mockRestore();
      consult.mockRestore();
      cleanup.mockRestore();
      validate.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const failed = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(failed.exitCode).toBe(1);
    expect(io.logText()).toMatch(/\[(ERROR|WARNING|REVIEW)/);

    const dry = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        dryRun: true,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(dry.exitCode).toBe(0);
  });

  test("validates staged TypeScript against a symbols manifest via the temp KB overlay", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, "src", "greet.ts"),
      "export function greet() { return 1; }\n",
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      `symbols:
  - id: SYM-GREET
    title: greet
    sourceFile: src/greet.ts
    status: active
    relationships:
      - type: implements
        to: REQ-1
`,
    );
    git(cwd, "add src/greet.ts .kb/symbols.yaml");
    const overlayDir = mkdtempSync(path.join(os.tmpdir(), "kibi-overlay-"));
    roots.push(overlayDir);
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
    const validate = spyOn(stagedValidate, "validateStagedSymbols")
      .mockResolvedValueOnce([
        {
          symbolId: "SYM-GREET",
          name: "greet",
          file: "src/greet.ts",
          line: 1,
          column: 0,
          currentLinks: 0,
          requiredLinks: 1,
        },
      ])
      .mockResolvedValue([]);
    restores.push(() => {
      create.mockRestore();
      project.mockRestore();
      consult.mockRestore();
      cleanup.mockRestore();
      validate.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const failed = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        minLinks: 2,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(failed.exitCode).toBe(1);
    expect(io.logText()).toContain("Traceability failed");

    const dry = await withCwd(cwd, () =>
      checkCommand({
        staged: true,
        dryRun: true,
        kbPath: path.join(cwd, "kb-store"),
      }),
    );
    expect(dry.exitCode).toBe(0);

    const impact = await import("../../src/public/impact-diagnostics.js");
    const stagedDiagnostics = await import(
      "../../src/traceability/staged-diagnostics.js"
    );
    const granularity = spyOn(
      impact,
      "createSymbolGranularityDiagnostics",
    ).mockReturnValue([]);
    const quality = spyOn(impact, "createSymbolQualityDiagnostics").mockReturnValue(
      [],
    );
    const review = spyOn(impact, "createSemanticReviewDiagnostics").mockReturnValue(
      [],
    );
    const collected = spyOn(
      stagedDiagnostics,
      "collectStagedKibiDiagnostics",
    ).mockReturnValue([]);
    restores.push(() => {
      granularity.mockRestore();
      quality.mockRestore();
      review.mockRestore();
      collected.mockRestore();
    });
    const passed = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(passed.exitCode).toBe(0);
    expect(io.logText()).toContain("No violations found in staged symbols");
  });

  test("applies a no-impact override and flags a missing rationale", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    writeFileSync(path.join(cwd, "notes.txt"), "hello\n");
    writeFileSync(path.join(cwd, "impact.md"), "Kibi-Impact: none\n");
    git(cwd, "add notes.txt impact.md");
    const io = captureIo();
    restores.push(io.restore);
    const missing = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(missing.exitCode).toBe(0);

    writeFileSync(
      path.join(cwd, "impact.md"),
      "Kibi-Impact: none\nRationale: comment-only notes\n",
    );
    git(cwd, "add impact.md");
    const ok = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(ok.exitCode).toBe(0);
  });

  test("ignores malformed staged manifests and test-only sources", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    mkdirSync(path.join(cwd, "tests"), { recursive: true });
    writeFileSync(path.join(cwd, ".kb", "symbols.yaml"), "not: [valid\n");
    writeFileSync(
      path.join(cwd, "tests", "greet.test.ts"),
      "export function testGreet() { return true; }\n",
    );
    git(cwd, "add .kb/symbols.yaml tests/greet.test.ts");
    const overlayDir = mkdtempSync(path.join(os.tmpdir(), "kibi-overlay-"));
    roots.push(overlayDir);
    const overlayPath = path.join(overlayDir, "changed_symbols.pl");
    writeFileSync(overlayPath, "");
    const create = spyOn(tempKb, "createTempKb").mockResolvedValue({
      tempDir: overlayDir,
      kbPath: overlayDir,
      overlayPath,
      prolog: { query: async () => ({ success: true, bindings: {} }) } as never,
    });
    const consult = spyOn(tempKb, "consultOverlay").mockResolvedValue(undefined);
    const cleanup = spyOn(tempKb, "cleanupTempKb").mockResolvedValue(undefined);
    const validate = spyOn(stagedValidate, "validateStagedSymbols").mockResolvedValue(
      [],
    );
    restores.push(() => {
      create.mockRestore();
      consult.mockRestore();
      cleanup.mockRestore();
      validate.mockRestore();
    });
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(result.exitCode).toBe(0);
  });

  test("treats staged validation overlay failures as errors", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(
      path.join(cwd, "src", "boom.ts"),
      "export function boom() { return true; }\n",
    );
    git(cwd, "add src/boom.ts");
    const create = spyOn(tempKb, "createTempKb").mockRejectedValue(
      new Error("overlay exploded"),
    );
    restores.push(() => create.mockRestore());
    const io = captureIo();
    restores.push(io.restore);
    const result = await withCwd(cwd, () =>
      checkCommand({ staged: true, kbPath: path.join(cwd, "kb-store") }),
    );
    expect(result.exitCode).toBe(1);
    expect(io.errorText()).toContain("overlay exploded");
  });
});
