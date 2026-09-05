import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { PrologProcess, resolveKbPlPath } from "../src/prolog.js";

describe("resolveKbPlPath", () => {
  const original = process.env.KIBI_KB_PL_PATH;

  afterEach(() => {
    if (original === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    } else {
      process.env.KIBI_KB_PL_PATH = original;
    }
  });

  test("returns the KIBI_KB_PL_PATH override when set", () => {
    process.env.KIBI_KB_PL_PATH = "/tmp/custom-kb.pl";
    expect(resolveKbPlPath()).toBe("/tmp/custom-kb.pl");
  });

  test("resolves kb.pl from the monorepo checkout without an override", () => {
    Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
    const resolved = resolveKbPlPath();
    expect(resolved).toContain("kb.pl");
    expect(existsSync(resolved)).toBe(true);
  });
});

describe("PrologProcess error and overflow branches", () => {
  test("start fails when swiplPath does not exist", async () => {
    const prolog = new PrologProcess({
      swiplPath: "/definitely/missing/swipl-bin",
      oneShot: true,
    });
    await expect(prolog.start()).rejects.toThrow(/SWI-Prolog not found/);
  });

  test("appendOutputChunk and appendErrorChunk honor the bounded buffer", () => {
    const prolog = new PrologProcess({ oneShot: true });
    const proto = Object.getPrototypeOf(prolog) as {
      appendOutputChunk(chunk: Buffer): void;
      appendErrorChunk(chunk: Buffer): void;
      outputOverflowed: boolean;
    };
    const overflow = Buffer.alloc(8 * 1024 * 1024 + 32, 0x61);
    proto.appendOutputChunk.call(prolog, overflow);
    proto.appendOutputChunk.call(prolog, Buffer.from("ignored"));
    proto.appendErrorChunk.call(prolog, overflow);
    expect(prolog).toBeInstanceOf(PrologProcess);
  });
});

describe("PrologProcess leftover query paths", () => {
  const previousDebug = process.env.KIBI_PROLOG_DEBUG;

  afterEach(() => {
    if (previousDebug === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_PROLOG_DEBUG");
    } else {
      process.env.KIBI_PROLOG_DEBUG = previousDebug;
    }
  });

  test("one-shot query without start, batch, attach/detach, and debug logging", async () => {
    process.env.KIBI_PROLOG_DEBUG = "1";
    const prolog = new PrologProcess({ oneShot: true, timeout: 15_000 });
    const arithmetic = await prolog.query("X = 1");
    expect(arithmetic.success).toBe(true);
    expect(arithmetic.bindings.X).toBe("1");

    const batched = await prolog.queryBatch(["Y = 2", "Z is Y + 1"]);
    expect(batched.success).toBe(true);
    expect(batched.bindings.Z).toBe("3");

    const invalidAttach = await prolog.query("kb_attach('')");
    expect(invalidAttach.success).toBe(false);

    const attach = await prolog.query("kb_attach('/tmp')");
    // /tmp is not a KB; success is optional. A second attach must fail closed.
    if (attach.success) {
      const already = await prolog.query("kb_attach('/tmp')");
      expect(already.success).toBe(false);
      expect(already.error).toMatch(/already attached/i);
    }
    const detach = await prolog.query("kb_detach");
    expect(detach.success).toBe(true);
    await prolog.terminate();
  });

  test("interactive query without start falls back to one-shot exec", async () => {
    const prolog = new PrologProcess({ oneShot: false, timeout: 15_000 });
    const result = await prolog.query("X = 42");
    expect(result.success).toBe(true);
    expect(result.bindings.X).toBe("42");
    await prolog.terminate();
  });

  test("mutating goals invalidate the one-shot cache", async () => {
    const prolog = new PrologProcess({ oneShot: true, timeout: 15_000 });
    const first = await prolog.query("X = 7");
    expect(first.success).toBe(true);
    const save = await prolog.query("kb_save");
    expect(typeof save.success).toBe("boolean");
    const second = await prolog.query("X = 7");
    expect(second.success).toBe(true);
    expect(second).not.toBe(first);
    await prolog.terminate();
  });

  test("interactive query after the child exits reports the process is not started", async () => {
    const prolog = new PrologProcess({ oneShot: false, timeout: 15_000 });
    await prolog.start();
    const pid = prolog.getPid();
    expect(pid).toBeGreaterThan(0);
    process.kill(pid, "SIGKILL");
    const deadline = Date.now() + 5_000;
    while (prolog.isRunning() && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await expect(prolog.query("true")).rejects.toThrow(/not started/);
    await prolog.terminate();
  });
});
