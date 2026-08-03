import { z } from "zod";

export const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const ModelSchema = z.enum(["gpt-5.4-mini", "gpt-5.6-sol"]);

export const ConfigurationSchema = z
  .object({
    parentId: z.uuid(),
    parentHash: HashSchema,
    authorizationMicrousd: z.int().nonnegative(),
    maxRequests: z.int().positive(),
    pricingHash: HashSchema,
    providerKeyId: z.string().min(1),
    verifierKeyId: z.string().min(1),
    destination: z
      .object({
        scheme: z.literal("https"),
        host: z.string().min(1),
        port: z.literal(443),
        sni: z.string().min(1),
        pinnedIps: z.array(z.ipv4()).min(1),
        selectedIp: z.ipv4(),
        caDigest: HashSchema,
        redirects: z.literal(false),
        proxies: z.literal(false),
        tunnels: z.literal(false),
      })
      .strict(),
    ceilings: z
      .object({
        models: z.array(ModelSchema).min(1),
        maxInputTokens: z.int().positive(),
        maxOutputTokens: z.int().positive(),
        maxRetries: z.int().nonnegative(),
        timeoutMs: z.int().positive(),
        maxChargeMicrousd: z.int().positive(),
      })
      .strict(),
  })
  .strict()
  .superRefine((configuration, context) => {
    if (configuration.providerKeyId === configuration.verifierKeyId) {
      context.addIssue({ code: "custom", message: "role_key_reuse" });
    }
    if (
      configuration.destination.host !== configuration.destination.sni ||
      !configuration.destination.pinnedIps.includes(
        configuration.destination.selectedIp,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "pinned_destination_invalid",
      });
    }
  });

export const RequestSchema = z
  .object({
    requestId: z.string().min(1),
    requestHash: HashSchema,
    model: ModelSchema,
    leaseId: z.uuid(),
    inputTokens: z.int().nonnegative(),
    maxOutputTokens: z.int().nonnegative(),
    maxRetries: z.int().nonnegative(),
    timeoutMs: z.int().positive(),
  })
  .strict();

export const CapabilitySchema = z
  .object({
    capabilityId: HashSchema,
    parentHash: HashSchema,
    requestId: z.string().min(1),
    requestHash: HashSchema,
    pricingHash: HashSchema,
    model: ModelSchema,
    leaseId: z.uuid(),
    sealed: z.literal(true),
    oneUse: z.literal(true),
  })
  .strict();

export const OutcomeSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("success"),
      chargedMicrousd: z.int().nonnegative(),
      invoiceId: z.string().min(1),
      providerOutput: z.string().optional(),
    })
    .strict(),
  z.object({ kind: z.literal("ambiguous") }).strict(),
]);

export type Configuration = Readonly<z.infer<typeof ConfigurationSchema>>;
export type Request = Readonly<z.infer<typeof RequestSchema>>;
export type Outcome = Readonly<z.infer<typeof OutcomeSchema>>;
export type Capability = Readonly<z.infer<typeof CapabilitySchema>>;
export type DebitReceipt = Readonly<{
  requestId: string;
  status: "finalized" | "ambiguous-max-charged" | "retained-after-crash";
  authorization: Readonly<{
    reservedMicrousd: number;
    chargedMicrousd: number;
    releasedMicrousd: number;
  }>;
  invoice: Readonly<{ invoiceId: string; amountMicrousd: number }> | null;
  providerOutput?: string;
}>;

export type Reservation = Readonly<{
  capability: Capability;
  receipt?: DebitReceipt;
}>;
