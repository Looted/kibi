import { createHash } from "node:crypto";
import { z } from "zod";

// implements REQ-skillopt-codex-optimization
export const CONTRACT_SCHEMA_VERSION = "1.0.0" as const;
// implements REQ-skillopt-codex-optimization
export const MAX_CONTRACT_BYTES = 1_048_576;

// implements REQ-skillopt-codex-optimization
export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
// implements REQ-skillopt-codex-optimization
export const NonEmptyStringSchema = z.string().min(1);
// implements REQ-skillopt-codex-optimization
export const ArtifactIdSchema = z.uuid();
// implements REQ-skillopt-codex-optimization
export const TimestampSchema = z.iso.datetime({ offset: true });
// implements REQ-skillopt-codex-optimization
export const JsonValueSchema = z.json();

// implements REQ-skillopt-codex-optimization
export type JsonValue = z.infer<typeof JsonValueSchema>;

// implements REQ-skillopt-codex-optimization
export const UsageSchema = z
  .object({
    inputTokens: z.int().nonnegative(),
    cachedInputTokens: z.int().nonnegative(),
    outputTokens: z.int().nonnegative(),
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export const PriceEquivalentEstimateSchema = z
  .object({
    currency: z.literal("USD"),
    amount: z.number().nonnegative(),
    pricingHash: Sha256Schema,
    kind: z.literal("price-equivalent-estimate-not-invoice"),
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export class ContractInputError extends Error {
  // implements REQ-skillopt-codex-optimization
  readonly name = "ContractInputError";

  constructor(
    message: string,
    readonly reason: "malformed-json" | "oversized-json",
  ) {
    super(message);
  }
}

// implements REQ-skillopt-codex-optimization
export class ContractIntegrityError extends Error {
  // implements REQ-skillopt-codex-optimization
  readonly name = "ContractIntegrityError";

  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
  }
}

// implements REQ-skillopt-codex-optimization
export function parseJsonText(text: string): JsonValue {
  if (Buffer.byteLength(text, "utf8") > MAX_CONTRACT_BYTES) {
    throw new ContractInputError(
      `contract exceeds ${MAX_CONTRACT_BYTES} bytes`,
      "oversized-json",
    );
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return JsonValueSchema.parse(parsed);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      throw new ContractInputError(
        "contract is not valid JSON",
        "malformed-json",
      );
    }
    throw error;
  }
}

// implements REQ-skillopt-codex-optimization
export function parseContractText<T>(schema: z.ZodType<T>, text: string): T {
  return schema.parse(parseJsonText(text));
}

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

// implements REQ-skillopt-codex-optimization
export function contractHash(value: JsonValue): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}
