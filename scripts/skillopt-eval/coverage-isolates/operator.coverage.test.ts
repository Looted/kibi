// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type OperatorDependencies,
  OperatorUsageError,
  defaultOperatorDependencies,
  main,
  parseOperatorArgs,
  resolveOperatorBase,
  runOperatorCommand,
} from "../operator";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function paidDeps(
  overrides: Partial<OperatorDependencies> = {},
): OperatorDependencies {
  return {
    cwd: process.cwd(),
    randomId: () => "00000000-0000-4000-8000-000000000201",
    runCli: async () => 0,
    materialize: (options) =>
      ({
        roots: {
          runRoot: options.runRoot,
          publicRoot: join(options.runRoot, "public"),
          heldOutRoot: join(options.runRoot, "held-out"),
          evaluatorRoot: join(options.runRoot, "evaluator"),
        },
        publicIndex: { tasks: [] },
        heldOutIndex: { tasks: [] },
      }) as never,
    resolveOperatorBase: async () => {
      throw new Error("unused");
    },
    runProcess: async (argv) => {
      if (argv.includes("login")) {
        return {
          exitCode: 0,
          stdout: "Logged in using ChatGPT\n",
          stderr: "",
        };
      }
      return { exitCode: 0, stdout: "ok\n", stderr: "" };
    },
    which: (command) => `/bin/${command}`,
    ...overrides,
  };
}

describe("operator coverage leftovers", () => {
  test("default which and runProcess execute in-process", async () => {
    expect(defaultOperatorDependencies.which("bash")).toBeTruthy();
    const result = await defaultOperatorDependencies.runProcess(
      ["bash", "-c", "printf hi"],
      process.cwd(),
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hi");

    const missing = await defaultOperatorDependencies.runProcess(
      ["bash", "-c", "printf err >&2; exit 3"],
      process.cwd(),
    );
    expect(missing.exitCode).toBe(3);
    expect(missing.stderr).toContain("err");
  });

  test("resolveOperatorBase skips unavailable roots and fails closed", async () => {
    const writable = await mkdtemp(join(tmpdir(), "skillopt-op-writable-"));
    roots.push(writable);
    const fileRoot = join(writable, "not-a-dir");
    await writeFile(fileRoot, "x");
    await expect(
      resolveOperatorBase({
        runtimeDir: fileRoot,
        cacheRoot: writable,
        tempRoot: "",
      }),
    ).rejects.toThrow();

    const missing = join(writable, "gone");
    const base = await resolveOperatorBase({
      runtimeDir: missing,
      cacheRoot: writable,
      tempRoot: writable,
    });
    expect(base).toContain("kibi-skillopt");

    await expect(
      resolveOperatorBase({
        runtimeDir: "/definitely-missing-runtime-root",
        cacheRoot: "/definitely-missing-cache-root",
        tempRoot: "/definitely-missing-temp-root",
      }),
    ).rejects.toThrow(/no writable SkillOpt operator artifact base/);
  });

  test("parseOperatorArgs rejects invalid combinations", () => {
    expect(() => parseOperatorArgs(["bogus"])).toThrow(OperatorUsageError);
    expect(() => parseOperatorArgs(["smoke", "--max-steps", "2"])).toThrow(
      /only valid for optimize/,
    );
    expect(() => parseOperatorArgs(["optimize", "--max-steps"])).toThrow(
      /requires a value/,
    );
    expect(() => parseOperatorArgs(["optimize", "--skill", "nope"])).toThrow(
      /--skill must be one of/,
    );
    expect(() => parseOperatorArgs(["optimize", "--max-steps", "0"])).toThrow(
      /integer from 1 to 4/,
    );
    expect(() => parseOperatorArgs(["optimize", "--unknown"])).toThrow(
      /Unknown operator option/,
    );
    expect(parseOperatorArgs(["optimize", "--skill", "bundle"])).toMatchObject({
      command: "optimize",
      skill: "bundle",
    });
    expect(parseOperatorArgs(["optimize", "--skill", "kibi-freshness"])).toMatchObject({
      skill: "kibi-freshness",
    });
    expect(parseOperatorArgs(["suite"])).toMatchObject({
      command: "suite",
      skill: "bundle",
    });
  });

  test("runOperatorCommand covers pin/login failures and suite/optimize guards", async () => {
    await expect(
      runOperatorCommand("smoke", paidDeps({ which: () => null })),
    ).rejects.toThrow(/uv is required/);
    await expect(
      runOperatorCommand(
        "smoke",
        paidDeps({
          runProcess: async (argv) =>
            argv.includes("sync")
              ? { exitCode: 2, stdout: "", stderr: "sync failed" }
              : { exitCode: 0, stdout: "ok\n", stderr: "" },
        }),
      ),
    ).rejects.toThrow(/uv sync failed/);
    await expect(
      runOperatorCommand(
        "smoke",
        paidDeps({
          runProcess: async (argv) =>
            argv.some((arg) => String(arg).endsWith("verify_pin.py"))
              ? { exitCode: 4, stdout: "pin", stderr: "bad pin" }
              : { exitCode: 0, stdout: "ok\n", stderr: "" },
        }),
      ),
    ).rejects.toThrow(/pin verification failed/);
    await expect(
      runOperatorCommand(
        "smoke",
        paidDeps({
          which: (command) => (command === "uv" ? "/bin/uv" : null),
        }),
      ),
    ).rejects.toThrow(/codex CLI is required/);
    await expect(
      runOperatorCommand(
        "smoke",
        paidDeps({
          runProcess: async (argv) =>
            argv.includes("login")
              ? { exitCode: 1, stdout: "not logged in", stderr: "" }
              : { exitCode: 0, stdout: "ok\n", stderr: "" },
        }),
      ),
    ).rejects.toThrow(/Logged in using ChatGPT/);

    const operatorBase = await mkdtemp(join(tmpdir(), "skillopt-op-suite-"));
    roots.push(operatorBase);
    const suite = await runOperatorCommand(
      "suite",
      paidDeps({
        resolveOperatorBase: async () => operatorBase,
        runCli: async (args) => {
          expect(args[0]).toBe("bundle");
          expect(args).toContain("--skill");
          return 0;
        },
      }),
    );
    expect(suite).toBe(0);

    await expect(
      runOperatorCommand("optimize", paidDeps(), { maxSteps: 0 }),
    ).rejects.toThrow(OperatorUsageError);
    await expect(
      runOperatorCommand("optimize", paidDeps(), { skill: "bundle" }),
    ).rejects.toThrow(/optimize requires --skill/);
  });

  test("main reports usage and operational failures", async () => {
    expect(await main(["bogus"], paidDeps())).toBe(2);
    expect(
      await main(
        ["optimize", "--skill", "kibi-usage"],
        paidDeps({
          which: () => null,
        }),
      ),
    ).toBe(1);
    const operatorBase = await mkdtemp(join(tmpdir(), "skillopt-op-main-"));
    roots.push(operatorBase);
    expect(
      await main(["optimize", "--max-steps", "2", "--skill", "kibi-usage"], {
        ...paidDeps({
          resolveOperatorBase: async () => operatorBase,
        }),
      }),
    ).toBe(0);
  });

  test("ensurePrivateDirectory chmod path is exercised via resolveOperatorBase", async () => {
    const runtimeDir = await mkdtemp(join(tmpdir(), "skillopt-op-chmod-"));
    roots.push(runtimeDir);
    await chmod(runtimeDir, 0o700);
    const base = await resolveOperatorBase({
      runtimeDir,
      cacheRoot: runtimeDir,
      tempRoot: runtimeDir,
    });
    expect(base.endsWith("operator")).toBe(true);
  });
});
