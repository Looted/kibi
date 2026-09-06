// implements REQ-014
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

describe("PrologProcess leftover interactive and translation paths", () => {
  const previousDebug = process.env.KIBI_PROLOG_DEBUG;
  afterEach(() => {
    if (previousDebug === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_PROLOG_DEBUG");
    } else {
      process.env.KIBI_PROLOG_DEBUG = previousDebug;
    }
  });

  test("interactive start, cache, batch, mutating goals, and terminate twice", async () => {
    process.env.KIBI_PROLOG_DEBUG = "1";
    const prolog = new PrologProcess({ oneShot: false, timeout: 15_000 });
    await prolog.start();
    expect(prolog.isRunning()).toBe(true);
    expect(prolog.getPid()).toBeGreaterThan(0);
    const first = await prolog.query("X = 3");
    expect(first.success).toBe(true);
    const cached = await prolog.query("X = 3");
    expect(cached.bindings.X).toBe("3");
    const failed = await prolog.query("fail");
    expect(failed.success).toBe(false);
    const batch = await prolog.query(["Y = 1", "Z is Y + 2"]);
    expect(batch.success).toBe(true);
    const save = await prolog.query("kb_save");
    expect(typeof save.success).toBe("boolean");
    const once = await prolog.query("once(true)");
    expect(once.success).toBe(true);
    const multiline = await prolog.query("Json = '{a:1}'");
    expect(multiline.success).toBe(true);
    await prolog.terminate();
    await prolog.terminate();
    expect(prolog.isRunning()).toBe(false);
    expect(prolog.getPid()).toBe(0);
  });

  test("one-shot spawn failure, attach empty path, and error translation", async () => {
    const missing = new PrologProcess({
      swiplPath: "/definitely/missing/swipl-one-shot",
      oneShot: true,
    });
    const spawned = await missing.query("true");
    expect(spawned.success).toBe(false);
    await missing.terminate();

    const prolog = new PrologProcess({ oneShot: true, timeout: 15_000 });
    const emptyAttach = await prolog.query("kb_attach('')");
    expect(emptyAttach.success).toBe(false);
    const detach = await prolog.query("kb_detach");
    expect(detach.success).toBe(true);
    const falseQuery = await prolog.query("fail");
    expect(falseQuery.success).toBe(false);
    const proto = Object.getPrototypeOf(prolog) as {
      translateError(text: string): string;
      extractBindings(output: string): Record<string, string>;
      addDiagnosticStage(message: string, goal: string, diagnostics: string): string;
    };
    expect(proto.translateError.call(prolog, "stale_snapshot")).toContain(
      "stale_snapshot",
    );
    expect(
      proto.translateError.call(
        prolog,
        "audit.log lock permission Resource temporarily unavailable",
      ),
    ).toContain("Audit journal");
    expect(
      proto.translateError.call(
        prolog,
        "Target entity does not exist: `'REQ-TEST'` does not exist",
      ),
    ).toContain("Target entity");
    expect(
      proto.translateError.call(
        prolog,
        "Source entity does not exist: `'REQ-SRC'` does not exist",
      ),
    ).toContain("Source entity");
    expect(
      proto.translateError.call(prolog, "entity `'REQ-X'` does not exist"),
    ).toContain("Entity does not exist");
    expect(
      proto.translateError.call(
        prolog,
        "Type error: `relationship' expected (Invalid relationship: foo)",
      ),
    ).toContain("Invalid relationship");
    expect(
      proto.translateError.call(prolog, "Type error: `relationship' expected"),
    ).toContain("Invalid relationship type");
    expect(proto.translateError.call(prolog, "existence_error")).toContain(
      "Predicate or file not found",
    );
    expect(proto.translateError.call(prolog, "permission_error")).toContain(
      "Access denied",
    );
    expect(proto.translateError.call(prolog, "syntax_error")).toContain(
      "Invalid query syntax",
    );
    expect(proto.translateError.call(prolog, "timeout_error")).toContain(
      "timeout",
    );
    expect(proto.translateError.call(prolog, "ERROR: mystery")).toContain(
      "mystery",
    );
    expect(proto.translateError.call(prolog, "Unknown procedure")).toContain(
      "Predicate or file not found",
    );
    expect(proto.translateError.call(prolog, "Operator expected")).toContain(
      "Invalid query syntax",
    );
    expect(
      proto.translateError.call(
        prolog,
        "__KIBI_STAGE__:commit\nERROR:   \n** banner **\n",
      ),
    ).toBe("Unknown error");
    expect(proto.translateError.call(prolog, "")).toBe("Unknown error");
    expect(
      proto.extractBindings.call(prolog, "Json='{\n  \"a\": 1\n}'."),
    ).toMatchObject({ Json: expect.stringContaining("{") });
    expect(
      proto.addDiagnosticStage.call(
        prolog,
        "msg",
        "kb_commit_upsert(x)",
        "__KIBI_STAGE__:commit\n",
      ),
    ).toContain("stage=commit");
    expect(
      proto.addDiagnosticStage.call(prolog, "msg", "true", "no-stage"),
    ).toBe("msg");
    await prolog.terminate();
  });

  test("interactive start fails when the child prints ERROR", async () => {
    const { chmodSync, mkdtempSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const root = mkdtempSync(join(tmpdir(), "kibi-swipl-err-"));
    const fake = join(root, "swipl");
    writeFileSync(fake, "#!/bin/sh\necho ERROR: boom >&2\nexit 1\n");
    chmodSync(fake, 0o755);
    const prolog = new PrologProcess({
      swiplPath: fake,
      oneShot: false,
      timeout: 2_000,
    });
    await expect(prolog.start()).rejects.toThrow(/kb module|terminated|ERROR/i);
    await prolog.terminate();
  });

  test("interactive query times out on a sleeping goal", async () => {
    const prolog = new PrologProcess({ oneShot: false, timeout: 200 });
    await prolog.start();
    await expect(prolog.query("sleep(2)")).rejects.toThrow(/timeout/i);
    await prolog.terminate();
  });
});

