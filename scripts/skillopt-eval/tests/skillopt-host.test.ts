import { afterEach, describe, expect, test } from "bun:test";
import { campaignMain } from "../campaign";
import type { CampaignDependencies } from "../campaign-workflow";
import { main as cliMain, extractHostOption } from "../cli";
import { CliUsageError } from "../cli-options";
import { OperatorUsageError, parseOperatorArgs } from "../operator";
import {
  DEFAULT_SKILLOPT_HOST,
  SKILLOPT_HOSTS,
  SKILLOPT_HOST_ENV,
  SkillOptHostSelectionError,
  envWithSkillOptHost,
  hostFromPreflightVersion,
  resolveSkillOptHost,
} from "../runtime/skillopt-host";
import {
  SKILLOPT_HOST_REGISTRY,
  skillOptHostImplementation,
} from "../runtime/skillopt-host-registry";

// TEST-e2e-skillopt-host-neutral-optimization (offline unit layer)

const savedHost = process.env[SKILLOPT_HOST_ENV];

afterEach(() => {
  if (savedHost === undefined)
    Reflect.deleteProperty(process.env, SKILLOPT_HOST_ENV);
  else process.env[SKILLOPT_HOST_ENV] = savedHost;
});

const stderr: string[] = [];

function silenced<T>(run: () => Promise<T>): Promise<T> {
  const writeErr = process.stderr.write.bind(process.stderr);
  const writeOut = process.stdout.write.bind(process.stdout);
  stderr.length = 0;
  process.stderr.write = ((chunk: unknown) => {
    stderr.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  process.stdout.write = (() => true) as typeof process.stdout.write;
  return run().finally(() => {
    process.stderr.write = writeErr;
    process.stdout.write = writeOut;
  });
}

describe("SkillOpt harness selection", () => {
  test("--host wins over the environment, which wins over the Codex default", () => {
    expect(DEFAULT_SKILLOPT_HOST).toBe("codex");
    expect(resolveSkillOptHost({ env: {} })).toBe("codex");
    expect(
      resolveSkillOptHost({ env: { [SKILLOPT_HOST_ENV]: "claude-code" } }),
    ).toBe("claude-code");
    expect(
      resolveSkillOptHost({
        requested: "codex",
        env: { [SKILLOPT_HOST_ENV]: "claude-code" },
      }),
    ).toBe("codex");
    expect(() => resolveSkillOptHost({ requested: "cursor", env: {} })).toThrow(
      SkillOptHostSelectionError,
    );
    expect(() => resolveSkillOptHost({ requested: "cursor", env: {} })).toThrow(
      "--host must be one of codex|claude-code",
    );
    expect(
      envWithSkillOptHost({ [SKILLOPT_HOST_ENV]: "claude-code" }, "codex")[
        SKILLOPT_HOST_ENV
      ],
    ).toBe("codex");
  });

  test("one registry entry per host carries everything the host runs", () => {
    expect(Object.keys(SKILLOPT_HOST_REGISTRY).sort()).toEqual(
      [...SKILLOPT_HOSTS].sort(),
    );
    for (const host of SKILLOPT_HOSTS) {
      const implementation = skillOptHostImplementation(host);
      expect(implementation.id).toBe(host);
      expect(
        implementation.targetHost({
          prepareLogin: async () => {
            throw new Error("unused");
          },
        }).id,
      ).toBe(host);
    }
    expect(
      skillOptHostImplementation("codex").campaignDependencies({}),
    ).toEqual({});
    expect(
      Object.keys(
        skillOptHostImplementation("claude-code").campaignDependencies({}),
      ).sort(),
    ).toEqual(
      [
        "createRuntimeLease",
        "optimizerModelSource",
        "runCanary",
        "runOptimizerStep",
        "runPreflight",
      ].sort(),
    );
    expect(hostFromPreflightVersion("claude-code 2.1.0 (Claude Code)")).toBe(
      "claude-code",
    );
    expect(hostFromPreflightVersion("codex-cli 0.130.0")).toBe("codex");
    expect(hostFromPreflightVersion(null)).toBeUndefined();
  });

  test("campaign.ts takes --host on every command and refuses unknown hosts first", async () => {
    const refused: Partial<CampaignDependencies> = {
      sourceClean: async () => {
        throw new Error("must not reach paid preparation");
      },
    };
    for (const command of [
      "revise",
      "compose",
      "evaluate",
      "confirm",
      "package",
    ]) {
      expect(
        await silenced(() =>
          campaignMain(
            [
              command,
              "--artifact-root",
              "/nonexistent/skillopt",
              "--host",
              "other",
            ],
            refused,
          ),
        ),
      ).toBe(2);
      expect(stderr.join("")).toContain("--host must be one of");
    }
    // The flag overrides an inherited environment value.
    process.env[SKILLOPT_HOST_ENV] = "other";
    expect(
      await silenced(() =>
        campaignMain(
          [
            "evaluate",
            "--artifact-root",
            "/nonexistent/skillopt",
            "--host",
            "codex",
          ],
          refused,
        ),
      ),
    ).toBe(2);
    expect(stderr.join("")).toBe(
      "at least one --candidate-manifest is required\n",
    );
  });

  test("the Codex-only workflow refuses another host before paid preparation", async () => {
    expect(
      extractHostOption(["optimize", "--host", "codex", "--fake"], {}),
    ).toEqual({ host: "codex", args: ["optimize", "--fake"] });
    expect(() => extractHostOption(["optimize", "--host"], {})).toThrow(
      CliUsageError,
    );
    let called = false;
    const dependencies = {
      runPreflight: async () => {
        called = true;
        throw new Error("must not run");
      },
      runCapabilityCanary: async () => {
        called = true;
        throw new Error("must not run");
      },
    } as unknown as Parameters<typeof cliMain>[1];
    for (const args of [
      ["preflight", "--run-id", "r", "--host", "claude-code"],
      ["smoke", "--allow-paid", "--run-id", "r", "--host", "claude-code"],
      ["optimize", "--run-id", "r", "--allow-paid", "--host", "claude-code"],
    ]) {
      expect(await silenced(() => cliMain(args, dependencies))).toBe(2);
    }
    process.env[SKILLOPT_HOST_ENV] = "claude-code";
    expect(
      await silenced(() =>
        cliMain(["preflight", "--run-id", "r"], dependencies),
      ),
    ).toBe(2);
    expect(called).toBe(false);

    expect(() =>
      parseOperatorArgs(["optimize", "--host", "claude-code"]),
    ).toThrow(OperatorUsageError);
    Reflect.deleteProperty(process.env, SKILLOPT_HOST_ENV);
    expect(parseOperatorArgs(["smoke", "--host", "codex"]).host).toBe("codex");
    expect(parseOperatorArgs(["smoke"]).host).toBeUndefined();
  });
});
