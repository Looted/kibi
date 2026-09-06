// implements REQ-skillopt-codex-optimization
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
    await chmod(root, 0o700).catch(() => undefined);
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

describe("operator leftover runtime branches", () => {
  test("default which, runProcess close codes, and spawn errors", async () => {
    expect(defaultOperatorDependencies.which("bash")).toBeTruthy();
    expect(defaultOperatorDependencies.cwd.length).toBeGreaterThan(0);
    expect(defaultOperatorDependencies.randomId()).toMatch(
      /^[0-9a-f-]{36}$/,
    );

    const ok = await defaultOperatorDependencies.runProcess(
      ["bash", "-c", "printf hi"],
      process.cwd(),
    );
    expect(ok.exitCode).toBe(0);
    expect(ok.stdout).toContain("hi");

    const failed = await defaultOperatorDependencies.runProcess(
      ["bash", "-c", "printf err >&2; exit 3"],
      process.cwd(),
    );
    expect(failed.exitCode).toBe(3);
    expect(failed.stderr).toContain("err");

    const signaled = await defaultOperatorDependencies.runProcess(
      ["bash", "-c", "kill -9 $$"],
      process.cwd(),
    );
    expect(signaled.exitCode).toBeGreaterThan(0);

    await expect(
      defaultOperatorDependencies.runProcess(
        ["/definitely-missing-skillopt-bin", "--help"],
        process.cwd(),
      ),
    ).rejects.toThrow();
  });

  test("resolveOperatorBase skips EACCES/ENOENT and rethrows other errors", async () => {
    const writable = await mkdtemp(join(tmpdir(), "skillopt-op-writable-"));
    roots.push(writable);

    const denied = await mkdtemp(join(tmpdir(), "skillopt-op-denied-"));
    roots.push(denied);
    await chmod(denied, 0o000);
    const skippedDenied = await resolveOperatorBase({
      runtimeDir: denied,
      cacheRoot: writable,
      tempRoot: "",
    });
    expect(skippedDenied).toContain("kibi-skillopt");

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

  test("parseOperatorArgs covers skill, seed, and invalid combinations", () => {
    expect(() => parseOperatorArgs(["bogus"])).toThrow(OperatorUsageError);
    expect(() => parseOperatorArgs(["smoke", "--max-steps", "2"])).toThrow(
      /only valid for optimize/,
    );
    expect(() => parseOperatorArgs(["optimize", "--max-steps"])).toThrow(
      /requires a value/,
    );
    expect(() =>
      parseOperatorArgs(["optimize", "--seed-candidate", "--next"]),
    ).toThrow(/requires a value/);
    expect(() => parseOperatorArgs(["optimize", "--skill", "nope"])).toThrow(
      /--skill must be one of/,
    );
    expect(() => parseOperatorArgs(["optimize", "--max-steps", "0"])).toThrow(
      /integer from 1 to 4/,
    );
    expect(() => parseOperatorArgs(["optimize", "--max-steps", "1.5"])).toThrow(
      /integer from 1 to 4/,
    );
    expect(() => parseOperatorArgs(["optimize", "--unknown"])).toThrow(
      /Unknown operator option/,
    );
    expect(parseOperatorArgs(["optimize", "--skill", "bundle"])).toMatchObject({
      command: "optimize",
      skill: "bundle",
    });
    expect(
      parseOperatorArgs(["optimize", "--skill", "kibi-freshness"]),
    ).toMatchObject({
      skill: "kibi-freshness",
    });
    expect(parseOperatorArgs(["suite"])).toMatchObject({
      command: "suite",
      skill: "bundle",
    });
    expect(
      parseOperatorArgs([
        "optimize",
        "--seed-candidate",
        "candidate.md",
        "--max-steps",
        "4",
      ]),
    ).toMatchObject({
      seedCandidate: "candidate.md",
      maxSteps: 4,
    });
  });

  test("runOperatorCommand covers pin/login failures and paid commands", async () => {
    await expect(
      runOperatorCommand("smoke", paidDeps({ which: () => null })),
    ).rejects.toThrow(/uv is required/);
    await expect(
      runOperatorCommand(
        "smoke",
        paidDeps({
          runProcess: async (argv) =>
            argv.includes("sync")
              ? { exitCode: 2, stdout: "sync stdout", stderr: "" }
              : { exitCode: 0, stdout: "ok\n", stderr: "" },
        }),
      ),
    ).rejects.toThrow(/uv sync failed[\s\S]*sync stdout/);
    await expect(
      runOperatorCommand(
        "smoke",
        paidDeps({
          runProcess: async (argv) =>
            argv.some((arg) => String(arg).endsWith("verify_pin.py"))
              ? { exitCode: 4, stdout: "pin stdout", stderr: "" }
              : { exitCode: 0, stdout: "ok\n", stderr: "" },
        }),
      ),
    ).rejects.toThrow(/pin verification failed[\s\S]*pin stdout/);
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
              ? { exitCode: 1, stdout: "", stderr: "not logged in" }
              : { exitCode: 0, stdout: "ok\n", stderr: "" },
        }),
      ),
    ).rejects.toThrow(/Logged in using ChatGPT/);
    await expect(
      runOperatorCommand(
        "smoke",
        paidDeps({
          runProcess: async (argv) =>
            argv.includes("login")
              ? { exitCode: 0, stdout: "Logged in using API key", stderr: "" }
              : { exitCode: 0, stdout: "ok\n", stderr: "" },
        }),
      ),
    ).rejects.toThrow(/Logged in using ChatGPT/);

    expect(await runOperatorCommand("smoke", paidDeps())).toBe(0);

    const operatorBase = await mkdtemp(join(tmpdir(), "skillopt-op-suite-"));
    roots.push(operatorBase);
    expect(
      await runOperatorCommand(
        "suite",
        paidDeps({
          resolveOperatorBase: async () => operatorBase,
          runCli: async (args) => {
            expect(args[0]).toBe("bundle");
            expect(args).toContain("all");
            return 0;
          },
        }),
      ),
    ).toBe(0);

    await expect(
      runOperatorCommand("optimize", paidDeps(), { maxSteps: 0 }),
    ).rejects.toThrow(OperatorUsageError);
    await expect(
      runOperatorCommand("optimize", paidDeps(), { skill: "bundle" }),
    ).rejects.toThrow(/optimize requires --skill/);

    expect(
      await runOperatorCommand(
        "optimize",
        paidDeps({
          resolveOperatorBase: async () => operatorBase,
        }),
        { skill: "kibi-traceability", maxSteps: 3, seedCandidate: "seed.md" },
      ),
    ).toBe(0);
  });

  test("main reports usage, operational failures, and seed forwarding", async () => {
    expect(await main(["bogus"], paidDeps())).toBe(2);
    expect(
      await main(
        ["optimize", "--skill", "kibi-usage"],
        paidDeps({ which: () => null }),
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
    expect(
      await main(
        [
          "optimize",
          "--skill",
          "kibi-bootstrap",
          "--seed-candidate",
          "candidate.md",
        ],
        paidDeps({
          resolveOperatorBase: async () => operatorBase,
          runCli: async (args) => {
            expect(args).toContain("--seed-candidate");
            return 0;
          },
        }),
      ),
    ).toBe(0);
    expect(
      await main(
        ["suite"],
        paidDeps({
          resolveOperatorBase: async () => operatorBase,
        }),
      ),
    ).toBe(0);
  });
});
