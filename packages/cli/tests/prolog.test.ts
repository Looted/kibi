/// <reference types="bun-types" />
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrologProcess } from "../src/prolog";

const importMetaDir = path.dirname(fileURLToPath(import.meta.url));

describe("PrologProcess", () => {
  let prolog: PrologProcess | null = null;
  let sharedProlog: PrologProcess;

  beforeAll(async () => {
    sharedProlog = new PrologProcess({ oneShot: false });
    await sharedProlog.start();
  });

  afterAll(async () => {
    await sharedProlog.terminate();
  });

  afterEach(async () => {
    if (prolog) {
      await prolog.terminate();
      prolog = null;
    }
  });

  test("spawns swipl successfully", async () => {
    expect(sharedProlog.isRunning()).toBe(true);
  });

  test("loads kb module from packages/core/src/kb.pl", async () => {
    const result = await sharedProlog.query("current_module(kb)");
    expect(result.success).toBe(true);
  });

  test("handles simple arithmetic query", async () => {
    const result = await sharedProlog.query("X = 42");
    expect(result.success).toBe(true);
    expect(result.bindings).toHaveProperty("X");
    expect(result.bindings.X).toBe("42");
  });

  test("translates existence_error to friendly message", async () => {
    const result = await sharedProlog.query("nonexistent_predicate(foo)");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
    expect(result.error).not.toContain("ERROR:");
    expect(result.error).not.toContain("existence_error");
  });

  test("translates syntax_error to friendly message", async () => {
    const result = await sharedProlog.query("this is invalid syntax !");
    expect(result.success).toBe(false);
    expect(result.error).toContain("syntax");
    expect(result.error).not.toContain("ERROR:");
  });

  test("handles timeout for infinite loop", async () => {
    prolog = new PrologProcess({ timeout: 500, oneShot: true });
    await prolog.start();
    await expect(prolog.query("repeat, fail")).rejects.toThrow("timeout");
  }, 5000);

  test("reports the last commit stage when a one-shot query times out", async () => {
    prolog = new PrologProcess({ timeout: 500, oneShot: true });
    await prolog.start();
    await expect(
      prolog.query(
        "format(user_error, '__KIBI_STAGE__:audit_sync~n', []), repeat, fail",
      ),
    ).rejects.toThrow(/Query timeout after .*stage=audit_sync/);
  }, 5000);

  test("gracefully terminates process", async () => {
    const terminatingProlog = new PrologProcess({ oneShot: false });
    await terminatingProlog.start();
    const pid = terminatingProlog.getPid();
    expect(pid).toBeGreaterThan(0);

    await terminatingProlog.terminate();
    expect(terminatingProlog.isRunning()).toBe(false);

    try {
      process.kill(pid, 0);
      throw new Error("Process should be terminated");
    } catch (err: unknown) {
      expect((err as NodeJS.ErrnoException).code).toBe("ESRCH");
    }
  });

  test("handles multiple queries in sequence", async () => {
    const result1 = await sharedProlog.query("X = 1");
    expect(result1.success).toBe(true);

    const result2 = await sharedProlog.query("Y = 2");
    expect(result2.success).toBe(true);

    const result3 = await sharedProlog.query("Z = 3");
    expect(result3.success).toBe(true);
  });

  test("caches successful query results and supports invalidation", async () => {
    const first = await sharedProlog.query("X = 99");
    const cached = await sharedProlog.query("X = 99");
    expect(cached).toBe(first);

    sharedProlog.invalidateCache();

    const afterInvalidation = await sharedProlog.query("X = 99");
    expect(afterInvalidation.success).toBe(true);
    expect(afterInvalidation.bindings.X).toBe("99");
    expect(afterInvalidation).not.toBe(first);
  });

  test("does not cache compound goals to preserve read-after-write consistency", async () => {
    const first = await sharedProlog.query("(X = 7)");
    const second = await sharedProlog.query("(X = 7)");
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.bindings.X).toBe("7");
    expect(second).not.toBe(first);
  });

  test("executes batch goals and returns bindings", async () => {
    const result = await sharedProlog.query(["X = 10", "Y is X + 5"]);
    expect(result.success).toBe(true);
    expect(result.bindings.X).toBe("10");
    expect(result.bindings.Y).toBe("15");
  });

  test("runs batched KB writes in one transaction", async () => {
    const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-batch-kb-"));
    try {
      const attachResult = await sharedProlog.query(
        `kb_attach('${tempKbDir}')`,
      );
      expect(attachResult.success).toBe(true);

      const batchResult = await sharedProlog.query([
        'kb_assert_entity(req, [id=\'REQ-BATCH-001\', title="Batch Entity 1", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-1"])',
        'kb_assert_entity(req, [id=\'REQ-BATCH-002\', title="Batch Entity 2", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-2"])',
        "kb_save",
      ]);
      expect(batchResult.success).toBe(true);

      const entity1 = await sharedProlog.query(
        "kb_entity('REQ-BATCH-001', _, _)",
      );
      const entity2 = await sharedProlog.query(
        "kb_entity('REQ-BATCH-002', _, _)",
      );
      expect(entity1.success).toBe(true);
      expect(entity2.success).toBe(true);
    } finally {
      await sharedProlog.query("kb_detach");
      if (existsSync(tempKbDir)) {
        rmSync(tempKbDir, { recursive: true, force: true });
      }
    }
  });

  test("rolls back batched KB writes when one goal fails", async () => {
    const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-batch-kb-"));
    try {
      const attachResult = await sharedProlog.query(
        `kb_attach('${tempKbDir}')`,
      );
      expect(attachResult.success).toBe(true);

      const failedBatch = await sharedProlog.query([
        'kb_assert_entity(req, [id=\'REQ-BATCH-ROLLBACK\', title="Should Roll Back", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-rollback"])',
        'kb_assert_entity(invalid_type, [id=\'REQ-BATCH-INVALID\', title="Invalid Type", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-invalid"])',
        "kb_save",
      ]);
      expect(failedBatch.success).toBe(false);

      const rolledBackEntity = await sharedProlog.query(
        "kb_entity('REQ-BATCH-ROLLBACK', _, _)",
      );
      expect(rolledBackEntity.success).toBe(false);
    } finally {
      await sharedProlog.query("kb_detach");
      if (existsSync(tempKbDir)) {
        rmSync(tempKbDir, { recursive: true, force: true });
      }
    }
  });

  test("one-shot attached read queries do not create kb.rdf", async () => {
    const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-readonly-kb-"));
    prolog = new PrologProcess({ oneShot: true });
    await prolog.start();

    try {
      const attachResult = await prolog.query(`kb_attach('${tempKbDir}')`);
      expect(attachResult.success).toBe(true);

      const result = await prolog.query("X = 42");
      expect(result.success).toBe(true);
      expect(result.bindings.X).toBe("42");

      expect(existsSync(path.join(tempKbDir, "kb.rdf"))).toBe(false);
    } finally {
      await prolog.query("kb_detach");
      if (existsSync(tempKbDir)) {
        rmSync(tempKbDir, { recursive: true, force: true });
      }
    }
  });

  test("one-shot attached writes persist atomically", async () => {
    const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-write-kb-"));
    prolog = new PrologProcess({ oneShot: true });
    await prolog.start();

    try {
      const attachResult = await prolog.query(`kb_attach('${tempKbDir}')`);
      expect(attachResult.success).toBe(true);

      const writeResult = await prolog.query(
        `kb_assert_entity(req, [id='REQ-ONE-SHOT-001', title="One Shot Entity", status=open, created_at="2026-02-20T00:00:00Z", updated_at="2026-02-20T00:00:00Z", source="one-shot-test"])`,
      );
      expect(writeResult.success).toBe(true);

      const saveResult = await prolog.query("kb_save");
      expect(saveResult.success).toBe(true);

      const rdfPath = path.join(tempKbDir, "kb.rdf");
      expect(existsSync(rdfPath)).toBe(true);
      const rdf = readFileSync(rdfPath, "utf8");
      expect(rdf).toContain("REQ-ONE-SHOT-001");
      expect(rdf.trimEnd().endsWith("</rdf:RDF>")).toBe(true);
      expect(rdf.includes("\u0000")).toBe(false);
    } finally {
      await prolog.query("kb_detach");
      if (existsSync(tempKbDir)) {
        rmSync(tempKbDir, { recursive: true, force: true });
      }
    }
  });

  test("one-shot commit persists RDF, relationships, audits, and snapshot", async () => {
    const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-commit-kb-"));
    prolog = new PrologProcess({ timeout: 5000, oneShot: true });
    await prolog.start();

    try {
      const quote = String.fromCharCode(39);
      const attachResult = await prolog.query(
        `kb_attach(${quote}${tempKbDir}${quote})`,
      );
      expect(attachResult.success).toBe(true);
      const source = await prolog.query(
        'kb_assert_entity(req, [id=\'REQ-COMMIT-SOURCE\', title="Source", status=open, created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z", source="test"])',
      );
      const target = await prolog.query(
        'kb_assert_entity(test, [id=\'TEST-COMMIT-TARGET\', title="Target", status=passing, created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z", source="test"])',
      );
      expect(source.success).toBe(true);
      expect(target.success).toBe(true);

      const commit = await prolog.query(
        'kb_commit_upsert(req, [id=\'REQ-COMMIT-NEW\', title="Committed", status=open, created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z", source="test"], [rel(verified_by, \'REQ-COMMIT-NEW\', \'TEST-COMMIT-TARGET\', [])], false, ChangeKind)',
      );
      expect(commit).toMatchObject({
        success: true,
        bindings: { ChangeKind: "created" },
      });

      const rdfPath = path.join(tempKbDir, "kb.rdf");
      const auditPath = path.join(tempKbDir, "audit.log");
      expect(readFileSync(rdfPath, "utf8")).toContain("REQ-COMMIT-NEW");
      expect(readFileSync(rdfPath, "utf8")).toContain("TEST-COMMIT-TARGET");
      const audit = readFileSync(auditPath, "utf8");
      expect(audit).toContain("'REQ-COMMIT-NEW'");
      expect(audit).toContain("upsert_rel");
    } finally {
      await prolog.query("kb_detach");
      if (existsSync(tempKbDir)) {
        rmSync(tempKbDir, { recursive: true, force: true });
      }
    }
  });

  test("fails before RDF mutation when a stale writer holds audit.log", async () => {
    const tempKbDir = mkdtempSync(
      path.join(os.tmpdir(), "kibi-audit-lock-kb-"),
    );
    prolog = new PrologProcess({ timeout: 1000, oneShot: true });
    await prolog.start();
    let staleWriter: ReturnType<typeof spawn> | null = null;

    try {
      const quote = String.fromCharCode(39);
      expect(
        (await prolog.query(`kb_attach(${quote}${tempKbDir}${quote})`)).success,
      ).toBe(true);
      await prolog.query(
        'kb_assert_entity(req, [id=\'REQ-AUDIT-LOCK-TARGET\', title="Target", status=open, created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z", source="test"])',
      );

      staleWriter = spawn(
        "swipl",
        [
          "-q",
          "-g",
          `open(${quote}${path.join(tempKbDir, "audit.log")}${quote}, append, Stream, [lock(write)]), repeat, fail`,
          "-t",
          "halt",
        ],
        { stdio: "ignore" },
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      const started = Date.now();
      const result = await prolog.query(
        'kb_commit_upsert(req, [id=\'REQ-AUDIT-LOCK-NEW\', title="Blocked", status=open, created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z", source="test"], [], false, ChangeKind)',
      );
      expect(Date.now() - started).toBeLessThan(900);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Audit journal is locked");
      expect(
        readFileSync(path.join(tempKbDir, "kb.rdf"), "utf8"),
      ).not.toContain("REQ-AUDIT-LOCK-NEW");
    } finally {
      staleWriter?.kill("SIGKILL");
      await new Promise(
        (resolve) => staleWriter?.once("close", resolve) ?? resolve(undefined),
      );
      await prolog.query("kb_detach");
      if (existsSync(tempKbDir)) {
        rmSync(tempKbDir, { recursive: true, force: true });
      }
    }
  }, 10000);
});

describe("CLI", () => {
  test("shows version matching package.json", () => {
    const output = execFileSync(
      process.execPath,
      ["packages/cli/bin/kibi", "--version"],
      {
        encoding: "utf-8",
        cwd: path.join(importMetaDir, "../../.."),
      },
    );
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    // Read expected version from package.json
    const pkgJson = JSON.parse(
      require("node:fs").readFileSync(
        path.join(importMetaDir, "../package.json"),
        "utf-8",
      ),
    );
    expect(output.trim()).toBe(pkgJson.version);
  });

  test("shows help with all required commands", () => {
    const output = execFileSync(
      process.execPath,
      ["packages/cli/bin/kibi", "--help"],
      {
        encoding: "utf-8",
        cwd: path.join(importMetaDir, "../../.."),
      },
    );
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
