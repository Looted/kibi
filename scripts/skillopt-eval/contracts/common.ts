import { createHash } from "node:crypto";
import canonicalize from "canonicalize";
import { z } from "zod";

export const CONTRACT_SCHEMA_VERSION = "1.0.0" as const;
/**
 * Version of the offline review contracts (run lock, run state, ledger,
 * report, proposal, approval). 1.1.0 removed the assembled-bundle gate,
 * phase, ledger category and report result; nothing reads 1.0.0 copies.
 */
export const OFFLINE_CONTRACT_SCHEMA_VERSION = "1.1.0" as const;
export const MAX_CONTRACT_BYTES = 1_048_576;

export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const NonEmptyStringSchema = z.string().min(1);
export const ArtifactIdSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
export const TimestampSchema = z
  .string()
  .regex(
    /^(?:[0-9]{3}[1-9]|[0-9]{2}[1-9][0-9]|[0-9][1-9][0-9]{2}|[1-9][0-9]{3})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/,
  )
  .refine((value) => {
    const calendarDate = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    return (
      !Number.isNaN(calendarDate.getTime()) &&
      calendarDate.toISOString().slice(0, 10) === value.slice(0, 10)
    );
  }, "timestamp has an invalid calendar date");
export const JsonValueSchema = z.json();

export type JsonValue = z.infer<typeof JsonValueSchema>;

function serializedSize(value: unknown): number {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? 0 : Buffer.byteLength(serialized, "utf8");
}

export function boundedContractSchema<T extends z.ZodType>(schema: T) {
  return z
    .unknown()
    .refine(
      (value) => serializedSize(value) <= MAX_CONTRACT_BYTES,
      `contract exceeds ${MAX_CONTRACT_BYTES} bytes`,
    )
    .pipe(schema);
}

export const UsageSchema = z
  .object({
    inputTokens: z.int().nonnegative(),
    cachedInputTokens: z.int().nonnegative(),
    outputTokens: z.int().nonnegative(),
  })
  .strict();

export const PriceEquivalentEstimateSchema = z
  .object({
    currency: z.literal("USD"),
    amount: z.number().nonnegative(),
    pricingHash: Sha256Schema,
    kind: z.literal("price-equivalent-estimate-not-invoice"),
  })
  .strict();

export class ContractInputError extends Error {
  readonly name = "ContractInputError";

  constructor(
    message: string,
    readonly reason: "malformed-json" | "oversized-json",
  ) {
    super(message);
  }
}

export class ContractIntegrityError extends Error {
  readonly name = "ContractIntegrityError";

  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
  }
}

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

export function parseContractText<T>(schema: z.ZodType<T>, text: string): T {
  return schema.parse(parseJsonText(text));
}

export function canonicalJson(value: JsonValue): string {
  const canonical = canonicalize(value);
  if (canonical === undefined) {
    throw new ContractInputError(
      "contract cannot be represented as RFC 8785 JSON",
      "malformed-json",
    );
  }
  return canonical;
}

export function contractHash(value: JsonValue): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
