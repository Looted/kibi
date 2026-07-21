import { describe, expect, test } from "bun:test";
import { runPreflight } from "../preflight";

const passingDependencies = {
  commandExists: () => true,
  commandVersion: (command: string) => `${command} 1.0.0`,
};

describe("SkillOpt host preflight", () => {
  test("passes when Codex, models, and isolation dependencies are available", () => {
    const receipt = runPreflight(
      {
        runId: "preflight-test",
        targetModel: "gpt-5.4-mini",
        optimizerModel: "gpt-5.5",
        modelAccess: true,
      },
      passingDependencies,
    );

    expect(receipt.verdict).toBe("pass");
    expect(receipt.hosts).toHaveLength(1);
    expect(receipt.skilloptCommit).toBe(
      "b860a5cf88ce75e2bd02ca981ac21fb28cffba83",
    );
  });

  test("fails closed when a required host is absent", () => {
    const dependencies = {
      commandExists: (command: string) => command !== "codex",
      commandVersion: (command: string) => `${command} 1.0.0`,
    };
    const receipt = runPreflight(
      {
        runId: "preflight-missing-host",
        targetModel: "gpt-5.4-mini",
        optimizerModel: "gpt-5.5",
        modelAccess: true,
      },
      dependencies,
    );

    expect(receipt.verdict).toBe("no-go");
    if (receipt.verdict === "no-go") {
      expect(receipt.reason).toBe("missing_host:codex");
    }
  });

  test("passes with Codex as the only supported host", () => {
    const checkedCommands: string[] = [];
    const dependencies = {
      commandExists: (command: string) => {
        checkedCommands.push(command);
        return command === "codex" || command === "bwrap";
      },
      commandVersion: (command: string) => `${command} 1.0.0`,
    };
    const receipt = runPreflight(
      {
        runId: "preflight-codex-only",
        targetModel: "gpt-5.4-mini",
        optimizerModel: "gpt-5.5",
        modelAccess: true,
      },
      dependencies,
    );

    expect(receipt.verdict).toBe("pass");
    expect(receipt.hosts).toEqual([
      { host: "codex", command: "codex", version: "codex 1.0.0" },
    ]);
    expect(checkedCommands).toEqual(["codex", "bwrap"]);
  });

  test("live CLI reports a no-go without launching a model", () => {
    const process = Bun.spawnSync([
      "bun",
      "run",
      "scripts/skillopt-eval/cli.ts",
      "preflight",
      "--run-id",
      "preflight-cli",
    ]);

    expect(process.exitCode).toBe(1);
    expect(process.stdout.toString()).toContain('"verdict":"no-go"');
    expect(process.stdout.toString()).toContain('"paidModelCalls":0');
  });
});
