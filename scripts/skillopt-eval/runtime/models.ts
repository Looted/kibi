import { z } from "zod";

/**
 * Operator-configurable model pins for the SkillOpt harness.
 *
 * The harness reads the four model/effort variables from its own process
 * environment. Defaults reproduce the historical pins exactly. Every artifact
 * that records a model (run lock, ledger, receipts, trust plane, campaign,
 * screen lock) is validated against the active configuration, so changing the
 * environment between commands of one run is rejected instead of mixing
 * models inside one cohort.
 */

// implements REQ-skillopt-codex-optimization
export const DEFAULT_TARGET_MODEL = "gpt-5.6-luna" as const;
// implements REQ-skillopt-codex-optimization
export const DEFAULT_OPTIMIZER_MODEL = "gpt-5.6-sol" as const;
// implements REQ-skillopt-codex-optimization
export const DEFAULT_TARGET_EFFORT = "medium" as const;
// implements REQ-skillopt-codex-optimization
export const DEFAULT_OPTIMIZER_EFFORT = "xhigh" as const;

// implements REQ-skillopt-codex-optimization
export const SKILLOPT_MODEL_ENV = {
  targetModel: "KIBI_SKILLOPT_TARGET_MODEL",
  targetReasoningEffort: "KIBI_SKILLOPT_TARGET_EFFORT",
  optimizerModel: "KIBI_SKILLOPT_OPTIMIZER_MODEL",
  optimizerReasoningEffort: "KIBI_SKILLOPT_OPTIMIZER_EFFORT",
  pricing: "KIBI_SKILLOPT_MODEL_PRICING",
} as const;

const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

// implements REQ-skillopt-codex-optimization
export const ModelIdSchema = z.string().regex(MODEL_ID_PATTERN);
// implements REQ-skillopt-codex-optimization
export const ReasoningEffortSchema = z.enum([
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
]);

// implements REQ-skillopt-codex-optimization
export type SkillOptModelId = z.infer<typeof ModelIdSchema>;
// implements REQ-skillopt-codex-optimization
export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

// implements REQ-skillopt-codex-optimization
export const ModelPricingSchema = z
  .object({
    inputPerMillionTokens: z.number().finite().nonnegative(),
    cachedInputPerMillionTokens: z.number().finite().nonnegative(),
    outputPerMillionTokens: z.number().finite().nonnegative(),
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export type ModelPricing = Readonly<z.infer<typeof ModelPricingSchema>>;

// implements REQ-skillopt-codex-optimization
export type SkillOptModelConfig = Readonly<{
  targetModel: SkillOptModelId;
  targetReasoningEffort: ReasoningEffort;
  optimizerModel: SkillOptModelId;
  optimizerReasoningEffort: ReasoningEffort;
}>;

// implements REQ-skillopt-codex-optimization
export const DEFAULT_SKILLOPT_MODEL_CONFIG: SkillOptModelConfig = Object.freeze(
  {
    targetModel: DEFAULT_TARGET_MODEL,
    targetReasoningEffort: DEFAULT_TARGET_EFFORT,
    optimizerModel: DEFAULT_OPTIMIZER_MODEL,
    optimizerReasoningEffort: DEFAULT_OPTIMIZER_EFFORT,
  },
);

/**
 * Built-in price-equivalent estimates. Only the default models have pinned
 * prices; `null` means no public estimate is pinned for that model.
 */
// implements REQ-skillopt-codex-optimization
export const BUILT_IN_MODEL_PRICING: Readonly<
  Record<string, ModelPricing | null>
> = Object.freeze({
  [DEFAULT_TARGET_MODEL]: null,
  [DEFAULT_OPTIMIZER_MODEL]: Object.freeze({
    inputPerMillionTokens: 5,
    cachedInputPerMillionTokens: 0.5,
    outputPerMillionTokens: 30,
  }),
});

// implements REQ-skillopt-codex-optimization
export class SkillOptModelConfigError extends Error {
  readonly name = "SkillOptModelConfigError";
}

function envValue(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: string,
): string {
  const value = env[name];
  if (value === undefined || value === "") return fallback;
  return value;
}

function parseModel(env: NodeJS.ProcessEnv, name: string, fallback: string) {
  const value = envValue(env, name, fallback);
  const parsed = ModelIdSchema.safeParse(value);
  if (!parsed.success)
    throw new SkillOptModelConfigError(
      `${name} must match ${MODEL_ID_PATTERN.source}`,
    );
  return parsed.data;
}

function parseEffort(env: NodeJS.ProcessEnv, name: string, fallback: string) {
  const value = envValue(env, name, fallback);
  const parsed = ReasoningEffortSchema.safeParse(value);
  if (!parsed.success)
    throw new SkillOptModelConfigError(
      `${name} must be one of ${ReasoningEffortSchema.options.join("|")}`,
    );
  return parsed.data;
}

// implements REQ-skillopt-codex-optimization
export function resolveSkillOptModelConfig(
  env: NodeJS.ProcessEnv = process.env,
): SkillOptModelConfig {
  return Object.freeze({
    targetModel: parseModel(
      env,
      SKILLOPT_MODEL_ENV.targetModel,
      DEFAULT_TARGET_MODEL,
    ),
    targetReasoningEffort: parseEffort(
      env,
      SKILLOPT_MODEL_ENV.targetReasoningEffort,
      DEFAULT_TARGET_EFFORT,
    ),
    optimizerModel: parseModel(
      env,
      SKILLOPT_MODEL_ENV.optimizerModel,
      DEFAULT_OPTIMIZER_MODEL,
    ),
    optimizerReasoningEffort: parseEffort(
      env,
      SKILLOPT_MODEL_ENV.optimizerReasoningEffort,
      DEFAULT_OPTIMIZER_EFFORT,
    ),
  });
}

/** The configuration pinned by this harness process' environment. */
// implements REQ-skillopt-codex-optimization
export function activeSkillOptModelConfig(): SkillOptModelConfig {
  return resolveSkillOptModelConfig(process.env);
}

// implements REQ-skillopt-codex-optimization
export function modelForRole(
  role: "target" | "optimizer",
  config: SkillOptModelConfig = activeSkillOptModelConfig(),
): SkillOptModelId {
  return role === "target" ? config.targetModel : config.optimizerModel;
}

// implements REQ-skillopt-codex-optimization
export function effortForRole(
  role: "target" | "optimizer",
  config: SkillOptModelConfig = activeSkillOptModelConfig(),
): ReasoningEffort {
  return role === "target"
    ? config.targetReasoningEffort
    : config.optimizerReasoningEffort;
}

// implements REQ-skillopt-codex-optimization
export function pinnedModelIds(
  config: SkillOptModelConfig = activeSkillOptModelConfig(),
): readonly SkillOptModelId[] {
  return [...new Set([config.targetModel, config.optimizerModel])];
}

/**
 * Model id schema that only accepts the models pinned by the active
 * configuration. With defaults this is exactly the historical
 * `gpt-5.6-luna | gpt-5.6-sol` enum.
 */
// implements REQ-skillopt-codex-optimization
export const PinnedModelSchema = ModelIdSchema.refine(
  (model) => pinnedModelIds().includes(model),
  { message: "model_not_pinned" },
);

const OperatorPricingSchema = z.record(
  ModelIdSchema,
  ModelPricingSchema.nullable(),
);

function operatorPricing(
  env: NodeJS.ProcessEnv,
): Readonly<Record<string, ModelPricing | null>> {
  const raw = env[SKILLOPT_MODEL_ENV.pricing];
  if (raw === undefined || raw.trim() === "") return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new SkillOptModelConfigError(
      `${SKILLOPT_MODEL_ENV.pricing} must be a JSON object`,
    );
  }
  const parsed = OperatorPricingSchema.safeParse(value);
  if (!parsed.success)
    throw new SkillOptModelConfigError(
      `${SKILLOPT_MODEL_ENV.pricing} must map model ids to {inputPerMillionTokens, cachedInputPerMillionTokens, outputPerMillionTokens}`,
    );
  return parsed.data;
}

/**
 * Resolves the price-equivalent table for the active models. Built-in prices
 * are kept for the default models and cannot be overridden. Every non-default
 * model needs an explicit operator entry; prices are never invented. Only the
 * target may be priced as explicit `null` (no estimate), mirroring the
 * built-in target; the optimizer always needs numeric prices.
 */
// implements REQ-skillopt-codex-optimization
export function resolveSkillOptModelPricing(
  config: SkillOptModelConfig = activeSkillOptModelConfig(),
  env: NodeJS.ProcessEnv = process.env,
): Readonly<Record<SkillOptModelId, ModelPricing | null>> {
  const supplied = operatorPricing(env);
  const pinned = pinnedModelIds(config);
  for (const model of Object.keys(supplied)) {
    if (!pinned.includes(model))
      throw new SkillOptModelConfigError(
        `${SKILLOPT_MODEL_ENV.pricing} prices unconfigured model ${model}`,
      );
    if (Object.hasOwn(BUILT_IN_MODEL_PRICING, model))
      throw new SkillOptModelConfigError(
        `${SKILLOPT_MODEL_ENV.pricing} cannot override built-in pricing for ${model}`,
      );
  }
  const table: Record<string, ModelPricing | null> = {};
  for (const model of pinned) {
    const pricing = Object.hasOwn(BUILT_IN_MODEL_PRICING, model)
      ? BUILT_IN_MODEL_PRICING[model]
      : Object.hasOwn(supplied, model)
        ? supplied[model]
        : undefined;
    if (pricing === undefined)
      throw new SkillOptModelConfigError(
        `missing pricing for model ${model}: set ${SKILLOPT_MODEL_ENV.pricing}`,
      );
    if (pricing === null && model === config.optimizerModel)
      throw new SkillOptModelConfigError(
        `optimizer model ${model} needs numeric pricing in ${SKILLOPT_MODEL_ENV.pricing}`,
      );
    table[model] = pricing;
  }
  return Object.freeze(table);
}

/**
 * Gate for every paid launch or canary: the model configuration must be valid
 * and every pinned model must have explicit pricing before any spend.
 */
// implements REQ-skillopt-codex-optimization
export function assertSkillOptModelsReadyForPaidWork(
  env: NodeJS.ProcessEnv = process.env,
): SkillOptModelConfig {
  const config = resolveSkillOptModelConfig(env);
  resolveSkillOptModelPricing(config, env);
  return config;
}

// implements REQ-skillopt-codex-optimization
export function sameSkillOptModelConfig(
  left: SkillOptModelConfig,
  right: SkillOptModelConfig,
): boolean {
  return (
    left.targetModel === right.targetModel &&
    left.targetReasoningEffort === right.targetReasoningEffort &&
    left.optimizerModel === right.optimizerModel &&
    left.optimizerReasoningEffort === right.optimizerReasoningEffort
  );
}
