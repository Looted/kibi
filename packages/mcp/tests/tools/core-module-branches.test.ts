import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrologProcess } from "kibi-cli/prolog";
import { runJsonModuleQuery } from "../../src/tools/core-module.js";

const tempDirs: string[] = [];
type PrologQueryResult = Awaited<ReturnType<PrologProcess["query"]>>;

function ok(bindings: Record<string, string> = {}): PrologQueryResult {
  return { success: true, bindings };
}

function fail(error: string): PrologQueryResult {
  return { success: false, bindings: {}, error };
}

function createCoreFixture(fileName = "discovery.pl") {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "kibi-core-module-branches-"),
  );
  tempDirs.push(root);

  const srcDir = path.join(root, "src");
  mkdirSync(srcDir, { recursive: true });

  const kbPath = path.join(srcDir, "kb.pl");
  const modulePath = path.join(srcDir, fileName);

  writeFileSync(kbPath, "% kb\n");
  writeFileSync(modulePath, `% ${fileName}\n`);

  process.env.KIBI_KB_PL_PATH = kbPath;

  return { modulePath };
}

afterEach(() => {
  Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
  Reflect.deleteProperty(process.env, "KIBI_DISCOVERY_PL_PATH");
  Reflect.deleteProperty(process.env, "KIBI_CHECKS_PL_PATH");
  Reflect.deleteProperty(process.env, "KIBI_STATUS_PL_PATH");

  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }

  mock.restore();
});

describe("runJsonModuleQuery branch coverage", () => {
  test("throws when a non-Prolog query reports failure", async () => {
    createCoreFixture();

    await expect(
      runJsonModuleQuery(
        {
          query: async () => fail("mock boom"),
        },
        "discovery.pl",
        "demo(JsonString)",
        "Mock execution",
      ),
    ).rejects.toThrow("Mock execution query failed: mock boom");
  });

  test("throws when a non-Prolog query omits JsonString", async () => {
    createCoreFixture();

    await expect(
      runJsonModuleQuery(
        {
          query: async () => ok(),
        },
        "discovery.pl",
        "demo(JsonString)",
        "Mock execution",
      ),
    ).rejects.toThrow("Mock execution query returned no JsonString binding");
  });

  test("double-parses nested JSON strings for non-Prolog queries", async () => {
    createCoreFixture();

    const result = await runJsonModuleQuery<{ rows: string[] }>(
      {
        query: async () =>
          ok({
            JsonString: JSON.stringify(JSON.stringify({ rows: ["REQ-001"] })),
          }),
      },
      "discovery.pl",
      "demo(JsonString)",
      "Mock execution",
    );

    expect(result).toEqual({ rows: ["REQ-001"] });
  });

  test("loads modules interactively for PrologProcess instances when one-shot mode is disabled", async () => {
    const { modulePath } = createCoreFixture();
    const prolog = Object.create(PrologProcess.prototype);
    prolog.invalidateCache = mock(() => {});
    const query = mock(async (goal: string | string[]) => {
      const text = Array.isArray(goal) ? goal.join(",") : goal;
      if (text.startsWith("use_module(")) {
        return ok();
      }

      return ok({ JsonString: JSON.stringify({ loaded: true }) });
    });

    Object.defineProperty(prolog, "useOneShotMode", { value: false, writable: true, configurable: true });
    prolog.query = query;

    const result = await runJsonModuleQuery<{ loaded: boolean }>(
      prolog,
      "discovery.pl",
      "demo(JsonString)",
      "Interactive execution",
    );

    expect(result).toEqual({ loaded: true });
    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[0]?.[0] ?? "")).toContain(
      `use_module('${modulePath.replace(/\\/g, "/")}')`,
    );
    expect(query.mock.calls[1]?.[0]).toBe("demo(JsonString)");
  });

  test("throws when interactive module loading fails", async () => {
    createCoreFixture();
    const prolog = Object.create(PrologProcess.prototype);
    prolog.invalidateCache = mock(() => {});

    Object.defineProperty(prolog, "useOneShotMode", { value: false, writable: true, configurable: true });
    prolog.query = mock(async (goal: string | string[]) => {
      if (!Array.isArray(goal) && goal.startsWith("use_module(")) {
        return fail("load boom");
      }

      return ok({ JsonString: JSON.stringify({ unreachable: true }) });
    });

    await expect(
      runJsonModuleQuery(
        prolog,
        "discovery.pl",
        "demo(JsonString)",
        "Interactive execution",
      ),
    ).rejects.toThrow("Interactive execution module load failed: load boom");
  });

  test("throws when a PrologProcess query fails after module resolution", async () => {
    createCoreFixture();
    const prolog = Object.create(PrologProcess.prototype);
    prolog.invalidateCache = mock(() => {});

    Object.defineProperty(prolog, "useOneShotMode", { value: true, writable: true, configurable: true });
    prolog.query = mock(async () => fail("goal boom"));

    await expect(
      runJsonModuleQuery(
        prolog,
        "discovery.pl",
        "demo(JsonString)",
        "One-shot execution",
      ),
    ).rejects.toThrow("One-shot execution query failed: goal boom");
  });

  test("throws when a PrologProcess query omits JsonString", async () => {
    createCoreFixture();
    const prolog = Object.create(PrologProcess.prototype);
    prolog.invalidateCache = mock(() => {});

    Object.defineProperty(prolog, "useOneShotMode", { value: true, writable: true, configurable: true });
    prolog.query = mock(async () => ok());

    await expect(
      runJsonModuleQuery(
        prolog,
        "discovery.pl",
        "demo(JsonString)",
        "One-shot execution",
      ),
    ).rejects.toThrow(
      "One-shot execution query returned no JsonString binding",
    );
  });
});
