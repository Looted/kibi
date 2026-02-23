/// <reference types="bun-types" />
import { afterEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrologProcess } from "../src/prolog";

const importMetaDir = path.dirname(fileURLToPath(import.meta.url));

describe("PrologProcess", () => {
  let prolog: PrologProcess | null = null;

  afterEach(async () => {
    if (prolog) {
      await prolog.terminate();
      prolog = null;
    }
  });

  test("spawns swipl successfully", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    expect(prolog.isRunning()).toBe(true);
  });

  test("loads kb module from packages/core/src/kb.pl", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    const result = await prolog.query("current_module(kb)");
    expect(result.success).toBe(true);
  });

  test("handles simple arithmetic query", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    const result = await prolog.query("X = 42");
    expect(result.success).toBe(true);
    expect(result.bindings).toHaveProperty("X");
    expect(result.bindings.X).toBe("42");
  });

  test("translates existence_error to friendly message", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    const result = await prolog.query("nonexistent_predicate(foo)");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
    expect(result.error).not.toContain("ERROR:");
    expect(result.error).not.toContain("existence_error");
  });

  test("translates syntax_error to friendly message", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    const result = await prolog.query("this is invalid syntax !");
    expect(result.success).toBe(false);
    expect(result.error).toContain("syntax");
    expect(result.error).not.toContain("ERROR:");
  });

  test("handles timeout for infinite loop", async () => {
    prolog = new PrologProcess({ timeout: 100 });
    await prolog.start();
    await expect(prolog.query("repeat, fail")).rejects.toThrow("timeout");
  }, 5000);

  test("gracefully terminates process", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    const pid = prolog.getPid();
    expect(pid).toBeGreaterThan(0);

    await prolog.terminate();
    expect(prolog.isRunning()).toBe(false);

    try {
      process.kill(pid, 0);
      throw new Error("Process should be terminated");
    } catch (err: unknown) {
      expect((err as NodeJS.ErrnoException).code).toBe("ESRCH");
    }
  });

  test("handles multiple queries in sequence", async () => {
    prolog = new PrologProcess();
    await prolog.start();

    const result1 = await prolog.query("X = 1");
    expect(result1.success).toBe(true);

    const result2 = await prolog.query("Y = 2");
    expect(result2.success).toBe(true);

    const result3 = await prolog.query("Z = 3");
    expect(result3.success).toBe(true);
  });

  test("caches successful query results and supports invalidation", async () => {
    prolog = new PrologProcess();
    await prolog.start();

    const first = await prolog.query("X = 99");
    const cached = await prolog.query("X = 99");
    expect(cached).toBe(first);

    prolog.invalidateCache();

    const afterInvalidation = await prolog.query("X = 99");
    expect(afterInvalidation.success).toBe(true);
    expect(afterInvalidation.bindings.X).toBe("99");
    expect(afterInvalidation).not.toBe(first);
  });

  test("executes batch goals and returns bindings", async () => {
    prolog = new PrologProcess();
    await prolog.start();

    const result = await prolog.query(["X = 10", "Y is X + 5"]);
    expect(result.success).toBe(true);
    expect(result.bindings.X).toBe("10");
    expect(result.bindings.Y).toBe("15");
  });

  test("runs batched KB writes in one transaction", async () => {
    const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-batch-kb-"));
    prolog = new PrologProcess();
    await prolog.start();

    try {
      const attachResult = await prolog.query(`kb_attach('${tempKbDir}')`);
      expect(attachResult.success).toBe(true);

      const batchResult = await prolog.query([
        'kb_assert_entity(req, [id=\'REQ-BATCH-001\', title="Batch Entity 1", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-1"])',
        'kb_assert_entity(req, [id=\'REQ-BATCH-002\', title="Batch Entity 2", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-2"])',
        "kb_save",
      ]);
      expect(batchResult.success).toBe(true);

      const entity1 = await prolog.query("kb_entity('REQ-BATCH-001', _, _)");
      const entity2 = await prolog.query("kb_entity('REQ-BATCH-002', _, _)");
      expect(entity1.success).toBe(true);
      expect(entity2.success).toBe(true);
    } finally {
      await prolog.query("kb_detach");
      if (existsSync(tempKbDir)) {
        rmSync(tempKbDir, { recursive: true, force: true });
      }
    }
  });

  test("rolls back batched KB writes when one goal fails", async () => {
    const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-batch-kb-"));
    prolog = new PrologProcess();
    await prolog.start();

    try {
      const attachResult = await prolog.query(`kb_attach('${tempKbDir}')`);
      expect(attachResult.success).toBe(true);

      const failedBatch = await prolog.query([
        'kb_assert_entity(req, [id=\'REQ-BATCH-ROLLBACK\', title="Should Roll Back", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-rollback"])',
        'kb_assert_entity(invalid_type, [id=\'REQ-BATCH-INVALID\', title="Invalid Type", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-invalid"])',
        "kb_save",
      ]);
      expect(failedBatch.success).toBe(false);

      const rolledBackEntity = await prolog.query(
        "kb_entity('REQ-BATCH-ROLLBACK', _, _)",
      );
      expect(rolledBackEntity.success).toBe(false);
    } finally {
      await prolog.query("kb_detach");
      if (existsSync(tempKbDir)) {
        rmSync(tempKbDir, { recursive: true, force: true });
      }
    }
  });
});

describe("CLI", () => {
  test("shows version matching package.json", () => {
    const output = execSync("bun run packages/cli/bin/kibi --version", {
      encoding: "utf-8",
      cwd: path.join(importMetaDir, "../../.."),
    });
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(output.trim()).toBe("0.1.0");
  });

  test("shows help with all required commands", () => {
    const output = execSync("bun run packages/cli/bin/kibi --help", {
      encoding: "utf-8",
      cwd: path.join(importMetaDir, "../../.."),
    });
    expect(output).toContain("init");
    expect(output).toContain("sync");
    expect(output).toContain("query");
    expect(output).toContain("check");
    expect(output).toContain("gc");
    expect(output).toContain("doctor");
  });

  test("shows helpful error if swipl not found", () => {
    const prolog = new PrologProcess({ swiplPath: "/nonexistent/swipl" });
    expect(async () => {
      await prolog.start();
    }).toThrow();
  });
});
