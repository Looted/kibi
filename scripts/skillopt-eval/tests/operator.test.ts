import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type OperatorDependencies,
  buildOptimizeLayout,
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

describe("SkillOpt operator entrypoints", () => {
  test("builds paid optimize roots outside the source worktree", () => {
    const layout = buildOptimizeLayout(
      "/repo",
      "run-1",
      "/run/user/1000/kibi-skillopt/operator",
    );
    expect(layout).toEqual({
      runId: "run-1",
      artifactRoot: "/run/user/1000/kibi-skillopt/operator/optimize/run-1",
      fixtureRunRoot: "/run/user/1000/kibi-skillopt/operator/fixtures/run-1",
      canonicalSkillRoot: "/repo/packages/cli/src/public/skills",
    });
  });

  test("resolves a private operator base under a writable runtime root", async () => {
    const runtimeDir = await mkdtemp(join(tmpdir(), "skillopt-operator-base-"));
    roots.push(runtimeDir);

    const base = await resolveOperatorBase({
      runtimeDir,
      cacheRoot: "/missing-cache",
      tempRoot: "/missing-temp",
    });

    expect(base).toBe(join(runtimeDir, "kibi-skillopt", "operator"));
    expect(existsSync(base)).toBe(true);
  });

  test("smoke verifies pin and login then invokes paid canary", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-operator-smoke-"));
    roots.push(root);
    const cliCalls: string[][] = [];
    const processes: string[][] = [];
    const dependencies: OperatorDependencies = {
      cwd: root,
      randomId: () => "00000000-0000-4000-8000-000000000101",
      runCli: async (args) => {
        cliCalls.push([...args]);
        return 0;
      },
      materialize: () => {
        throw new Error("smoke must not materialize fixtures");
      },
      resolveOperatorBase: async () => {
        throw new Error("smoke must not resolve operator artifact base");
      },
      runProcess: async (argv) => {
        processes.push([...argv]);
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
    };

    const exitCode = await runOperatorCommand("smoke", dependencies);

    expect(exitCode).toBe(0);
    expect(processes[0]?.slice(1, 4)).toEqual([
      "sync",
      "--project",
      "tools/skillopt",
    ]);
    expect(
      processes.some((argv) =>
        argv.some((arg) => arg.endsWith("verify_pin.py")),
      ),
    ).toBe(true);
    expect(
      processes.some((argv) => argv.slice(1, 3).join(" ") === "login status"),
    ).toBe(true);
    expect(cliCalls).toEqual([
      [
        "smoke",
        "--allow-paid",
        "--run-id",
        "00000000-0000-4000-8000-000000000101",
      ],
    ]);
  });

  test("optimize materializes fixtures and invokes paid optimize with explicit roots", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-operator-opt-"));
    const operatorBase = await mkdtemp(join(tmpdir(), "skillopt-op-base-"));
    roots.push(root, operatorBase);
    const cliCalls: string[][] = [];
    let materializedRoot: string | undefined;
    const dependencies: OperatorDependencies = {
      cwd: root,
      randomId: () => "00000000-0000-4000-8000-000000000102",
      runCli: async (args) => {
        cliCalls.push([...args]);
        return 0;
      },
      materialize: (options) => {
        materializedRoot = options.runRoot;
        expect(existsSync(options.runRoot)).toBe(false);
        return {
          roots: {
            runRoot: options.runRoot,
            publicRoot: join(options.runRoot, "public"),
            heldOutRoot: join(options.runRoot, "held-out"),
            evaluatorRoot: join(options.runRoot, "evaluator"),
          },
          publicIndex: { tasks: [] },
          heldOutIndex: { tasks: [] },
        } as never;
      },
      resolveOperatorBase: async () => operatorBase,
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
    };

    const exitCode = await runOperatorCommand("optimize", dependencies);
    const layout = buildOptimizeLayout(
      root,
      "00000000-0000-4000-8000-000000000102",
      operatorBase,
    );

    expect(exitCode).toBe(0);
    expect(materializedRoot).toBe(layout.fixtureRunRoot);
    expect(layout.artifactRoot.startsWith(root)).toBe(false);
    expect(cliCalls).toEqual([
      [
        "optimize",
        "--skill",
        "kibi-usage",
        "--allow-paid",
        "--run-id",
        layout.runId,
        "--artifact-root",
        layout.artifactRoot,
        "--fixture-run-root",
        layout.fixtureRunRoot,
        "--max-steps",
        "1",
      ],
    ]);
  });

  test("optimize forwards --max-steps to the paid CLI", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-operator-steps-"));
    const operatorBase = await mkdtemp(join(tmpdir(), "skillopt-op-steps-"));
    roots.push(root, operatorBase);
    const cliCalls: string[][] = [];
    const dependencies: OperatorDependencies = {
      cwd: root,
      randomId: () => "00000000-0000-4000-8000-000000000103",
      runCli: async (args) => {
        cliCalls.push([...args]);
        return 0;
      },
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
      resolveOperatorBase: async () => operatorBase,
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
    };

    const exitCode = await runOperatorCommand("optimize", dependencies, {
      maxSteps: 4,
      seedCandidate: "candidate.md",
    });

    expect(exitCode).toBe(0);
    expect(cliCalls[0]).toContain("--max-steps");
    expect(cliCalls[0]).toContain("4");
    expect(cliCalls[0]?.slice(-2)).toEqual([
      "--seed-candidate",
      join(root, "candidate.md"),
    ]);
  });

  test("parseOperatorArgs accepts optimize --max-steps", () => {
    expect(
      parseOperatorArgs([
        "optimize",
        "--max-steps",
        "3",
        "--seed-candidate",
        ".git/skillopt-candidates/run/candidate_skill.md",
      ]),
    ).toEqual({
      command: "optimize",
      maxSteps: 3,
      skill: "kibi-usage",
      seedCandidate: ".git/skillopt-candidates/run/candidate_skill.md",
    });
    expect(parseOperatorArgs(["smoke"])).toEqual({
      command: "smoke",
      maxSteps: 1,
      skill: "kibi-usage",
    });
  });
});
