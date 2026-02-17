import { afterEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import path from "node:path";
import { PrologProcess } from "../src/prolog";

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
});

describe("CLI", () => {
  test("shows version matching package.json", () => {
    const output = execSync("bun run packages/cli/bin/kibi --version", {
      encoding: "utf-8",
      cwd: path.join(import.meta.dir, "../../.."),
    });
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(output.trim()).toBe("0.1.0");
  });

  test("shows help with all required commands", () => {
    const output = execSync("bun run packages/cli/bin/kibi --help", {
      encoding: "utf-8",
      cwd: path.join(import.meta.dir, "../../.."),
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
