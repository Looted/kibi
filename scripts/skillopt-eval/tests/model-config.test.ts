import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { campaignModelProfile } from "../campaign-workflow";
import { JsonValueSchema, contractHash } from "../contracts/common";
import { parseRunLockText } from "../contracts/run-lock";
import { LedgerEntrySchema } from "../contracts/workflow";
import { estimatePriceEquivalent } from "../orchestration";
import { ModelSchema } from "../runtime/fake-provider-contracts";
import {
  DEFAULT_SKILLOPT_MODEL_CONFIG,
  SkillOptModelConfigError,
  assertSkillOptModelsReadyForPaidWork,
  resolveSkillOptModelConfig,
  resolveSkillOptModelPricing,
} from "../runtime/models";
import { buildCodexConfig, buildCodexExecArgv } from "../runtime/permissions";
import { runCapabilityCanary } from "../runtime/workspace";

const ENV_KEYS = [
  "KIBI_SKILLOPT_TARGET_MODEL",
  "KIBI_SKILLOPT_TARGET_EFFORT",
  "KIBI_SKILLOPT_OPTIMIZER_MODEL",
  "KIBI_SKILLOPT_OPTIMIZER_EFFORT",
  "KIBI_SKILLOPT_MODEL_PRICING",
] as const;

const PRICING = {
  inputPerMillionTokens: 1,
  cachedInputPerMillionTokens: 0.1,
  outputPerMillionTokens: 4,
};

const OVERRIDE = {
  KIBI_SKILLOPT_TARGET_MODEL: "gpt-next-mini",
  KIBI_SKILLOPT_TARGET_EFFORT: "low",
  KIBI_SKILLOPT_OPTIMIZER_MODEL: "gpt-next-pro",
  KIBI_SKILLOPT_OPTIMIZER_EFFORT: "xhigh",
  KIBI_SKILLOPT_MODEL_PRICING: JSON.stringify({
    "gpt-next-mini": PRICING,
    "gpt-next-pro": PRICING,
  }),
} as const;

async function withEnv<T>(
  values: Partial<Record<(typeof ENV_KEYS)[number], string>>,
  run: () => T | Promise<T>,
): Promise<T> {
  const saved = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
  try {
    return await run();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const paths = {
  workspace: "/run/work",
  runPrivateHome: "/run/home",
  realCodexHome: "/home/user/.codex",
  sourceWorktree: "/source",
  fixtureKb: "/run/work/.kb",
  privateScorer: "/run/scorer",
  privateEvidence: "/run/evidence",
  siblingRuns: "/run/sibling",
} as const;

function config(role: "target" | "optimizer"): string {
  return buildCodexConfig({
    role,
    authMode: "file",
    paths,
    bwrapExecutable: "/run/work/.runtime/codex-resources/bwrap",
    codexExecutable: "/run/work/.runtime/codex",
    mcpServer: {
      command: "/run/work/.runtime/mcp/broker/bun",
      args: ["/run/work/.runtime/mcp/broker/broker.js"],
      cwd: paths.workspace,
    },
  });
}

const RUN_LOCK_TEXT = readFileSync(
  join(import.meta.dir, "fixtures/valid-run-lock.json"),
  "utf8",
);

function overriddenRunLockText(): string {
  const lock = JSON.parse(RUN_LOCK_TEXT) as Record<string, unknown>;
  const pricing = {
    ...(lock.pricing as Record<string, unknown>),
    models: { "gpt-next-mini": PRICING, "gpt-next-pro": PRICING },
  };
  return JSON.stringify({
    ...lock,
    targetModel: "gpt-next-mini",
    targetReasoningEffort: "low",
    optimizerModel: "gpt-next-pro",
    optimizerReasoningEffort: "xhigh",
    pricing,
    pricingHash: contractHash(JsonValueSchema.parse(pricing)),
  });
}

function ledgerEntry(model: string) {
  return {
    schemaVersion: "1.0.0",
    artifactType: "ledger-entry",
    runId: "00000000-0000-4000-8000-000000000001",
    sequence: 0,
    previousEntryHash: null,
    entryHash: "1".repeat(64),
    occurredAt: "2026-07-21T12:00:00Z",
    category: "development",
    model,
    usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 },
    priceEquivalentEstimate: {
      currency: "USD",
      amount: 0,
      pricingHash: "2".repeat(64),
      kind: "price-equivalent-estimate-not-invoice",
    },
  };
}

describe("SkillOpt model configuration", () => {
  test("offline preload isolates fixture pins without changing the operator environment", async () => {
    const originalPins = ENV_KEYS.map((key) => process.env[key]);
    const child = Bun.spawn(
      [
        process.execPath,
        "--preload",
        join(import.meta.dir, "../offline-test-preload.ts"),
        "-e",
        `import { resolveSkillOptModelConfig, resolveSkillOptModelPricing } from ${JSON.stringify(join(import.meta.dir, "../runtime/models.ts"))}; console.log(JSON.stringify({config: resolveSkillOptModelConfig(), pricing: resolveSkillOptModelPricing()}));`,
      ],
      { env: { ...process.env, ...OVERRIDE }, stdout: "pipe", stderr: "pipe" },
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      config: DEFAULT_SKILLOPT_MODEL_CONFIG,
      pricing: resolveSkillOptModelPricing(DEFAULT_SKILLOPT_MODEL_CONFIG, {}),
    });
    expect(ENV_KEYS.map((key) => process.env[key])).toEqual(originalPins);
  });

  test("defaults keep the historical model and effort pins", async () => {
    await withEnv({}, () => {
      expect(resolveSkillOptModelConfig()).toEqual(
        DEFAULT_SKILLOPT_MODEL_CONFIG,
      );
      expect(DEFAULT_SKILLOPT_MODEL_CONFIG).toEqual({
        targetModel: "gpt-5.6-luna",
        targetReasoningEffort: "medium",
        optimizerModel: "gpt-5.6-sol",
        optimizerReasoningEffort: "xhigh",
      });
      expect(config("target")).toContain('model = "gpt-5.6-luna"');
      expect(config("optimizer")).toContain('model_reasoning_effort = "xhigh"');
    });
  });

  test("environment overrides reach the Codex config and exec argv", async () => {
    await withEnv(OVERRIDE, () => {
      const target = config("target");
      expect(target).toContain('model = "gpt-next-mini"');
      expect(target).toContain('model_reasoning_effort = "low"');
      const optimizer = config("optimizer");
      expect(optimizer).toContain('model = "gpt-next-pro"');
      expect(optimizer).toContain('model_reasoning_effort = "xhigh"');
      const argv = buildCodexExecArgv({
        codexCommand: "/bin/codex",
        workspace: "/run/work",
        outputSchema: "/run/schema.json",
        role: "target",
      });
      expect(argv[argv.indexOf("--model") + 1]).toBe("gpt-next-mini");
      expect(campaignModelProfile()).toEqual({
        targetModel: "gpt-next-mini",
        targetReasoningEffort: "low",
        optimizerModel: "gpt-next-pro",
        optimizerReasoningEffort: "xhigh",
      });
    });
  });

  test("rejects invalid model ids and efforts", () => {
    for (const env of [
      { KIBI_SKILLOPT_TARGET_MODEL: "GPT 5" },
      { KIBI_SKILLOPT_OPTIMIZER_MODEL: "../model" },
      { KIBI_SKILLOPT_TARGET_MODEL: "a".repeat(65) },
      { KIBI_SKILLOPT_TARGET_EFFORT: "extreme" },
      { KIBI_SKILLOPT_OPTIMIZER_EFFORT: "XHIGH" },
    ]) {
      expect(() => resolveSkillOptModelConfig(env)).toThrow(
        SkillOptModelConfigError,
      );
    }
  });

  test("refuses unpriced non-default models before any paid work", async () => {
    await withEnv(
      {
        KIBI_SKILLOPT_TARGET_MODEL: "gpt-next-mini",
        KIBI_SKILLOPT_TARGET_EFFORT: "low",
      },
      async () => {
        expect(() => assertSkillOptModelsReadyForPaidWork()).toThrow(
          "missing pricing for model gpt-next-mini",
        );
        expect(() => config("target")).toThrow(
          "missing pricing for model gpt-next-mini",
        );
        let launched = 0;
        await expect(
          runCapabilityCanary(
            { runId: "canary", sourceWorktree: "/nonexistent" },
            {
              run: async () => {
                launched += 1;
                throw new Error("must not launch");
              },
            },
          ),
        ).rejects.toThrow("missing pricing for model gpt-next-mini");
        expect(launched).toBe(0);
      },
    );
  });

  test("validates operator pricing without inventing or overriding prices", () => {
    const base = {
      KIBI_SKILLOPT_OPTIMIZER_MODEL: "gpt-next-pro",
    };
    expect(() =>
      resolveSkillOptModelPricing(resolveSkillOptModelConfig(base), base),
    ).toThrow("missing pricing for model gpt-next-pro");
    const nullOptimizer = {
      ...base,
      KIBI_SKILLOPT_MODEL_PRICING: JSON.stringify({ "gpt-next-pro": null }),
    };
    expect(() =>
      resolveSkillOptModelPricing(
        resolveSkillOptModelConfig(nullOptimizer),
        nullOptimizer,
      ),
    ).toThrow("needs numeric pricing");
    const overrideBuiltIn = {
      ...base,
      KIBI_SKILLOPT_MODEL_PRICING: JSON.stringify({
        "gpt-next-pro": PRICING,
        "gpt-5.6-luna": PRICING,
      }),
    };
    expect(() =>
      resolveSkillOptModelPricing(
        resolveSkillOptModelConfig(overrideBuiltIn),
        overrideBuiltIn,
      ),
    ).toThrow("cannot override built-in pricing");
    const malformed = {
      ...base,
      KIBI_SKILLOPT_MODEL_PRICING: JSON.stringify({
        "gpt-next-pro": { inputPerMillionTokens: -1 },
      }),
    };
    expect(() =>
      resolveSkillOptModelPricing(
        resolveSkillOptModelConfig(malformed),
        malformed,
      ),
    ).toThrow(SkillOptModelConfigError);
    const priced = {
      ...base,
      KIBI_SKILLOPT_MODEL_PRICING: JSON.stringify({ "gpt-next-pro": PRICING }),
    };
    expect(
      resolveSkillOptModelPricing(resolveSkillOptModelConfig(priced), priced),
    ).toEqual({ "gpt-5.6-luna": null, "gpt-next-pro": PRICING });
  });

  test("run locks must agree with the active model configuration", async () => {
    await withEnv({}, () => {
      expect(parseRunLockText(RUN_LOCK_TEXT).targetReasoningEffort).toBe(
        "medium",
      );
      expect(() => parseRunLockText(overriddenRunLockText())).toThrow(
        "run lock model pin does not match the active model configuration",
      );
      const effortDrift = JSON.stringify({
        ...JSON.parse(RUN_LOCK_TEXT),
        targetReasoningEffort: "low",
      });
      expect(() => parseRunLockText(effortDrift)).toThrow(
        "run lock model pin does not match the active model configuration",
      );
    });
    await withEnv(OVERRIDE, () => {
      expect(parseRunLockText(overriddenRunLockText()).targetModel).toBe(
        "gpt-next-mini",
      );
      expect(() => parseRunLockText(RUN_LOCK_TEXT)).toThrow(
        "run lock model pin does not match the active model configuration",
      );
    });
  });

  test("run lock pricing must cover exactly the pinned models", async () => {
    await withEnv({}, () => {
      const lock = JSON.parse(RUN_LOCK_TEXT) as Record<string, unknown>;
      const pricing = {
        ...(lock.pricing as Record<string, unknown>),
        models: { "gpt-5.6-sol": PRICING },
      };
      expect(() =>
        parseRunLockText(
          JSON.stringify({
            ...lock,
            pricing,
            pricingHash: contractHash(JsonValueSchema.parse(pricing)),
          }),
        ),
      ).toThrow("pricing models must price exactly the pinned models");
    });
  });

  test("ledger entries and provider requests only accept pinned models", async () => {
    await withEnv({}, () => {
      expect(LedgerEntrySchema.safeParse(ledgerEntry("none")).success).toBe(
        true,
      );
      expect(
        LedgerEntrySchema.safeParse(ledgerEntry("gpt-5.6-sol")).success,
      ).toBe(true);
      expect(
        LedgerEntrySchema.safeParse(ledgerEntry("gpt-next-mini")).success,
      ).toBe(false);
      expect(ModelSchema.safeParse("gpt-next-pro").success).toBe(false);
    });
    await withEnv(OVERRIDE, () => {
      expect(
        LedgerEntrySchema.safeParse(ledgerEntry("gpt-next-mini")).success,
      ).toBe(true);
      expect(
        LedgerEntrySchema.safeParse(ledgerEntry("gpt-5.6-luna")).success,
      ).toBe(false);
      expect(ModelSchema.safeParse("gpt-next-pro").success).toBe(true);
      expect(ModelSchema.safeParse("gpt-5.6-sol").success).toBe(false);
      expect(
        estimatePriceEquivalent("gpt-next-pro", {
          inputTokens: 1_000_000,
          cachedInputTokens: 0,
          outputTokens: 0,
        }),
      ).toBe(1);
      expect(() =>
        estimatePriceEquivalent("gpt-5.6-sol", {
          inputTokens: 1,
          cachedInputTokens: 0,
          outputTokens: 0,
        }),
      ).toThrow("model_pricing_missing:gpt-5.6-sol");
    });
  });
});
