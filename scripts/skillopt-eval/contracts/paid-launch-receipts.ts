export const PAID_LAUNCH_RECEIPTS_MODULE = true;
import { z } from "zod";
import {
  ArtifactIdSchema,
  CONTRACT_SCHEMA_VERSION,
  JsonValueSchema,
  NonEmptyStringSchema,
  Sha256Schema,
  boundedContractSchema,
  contractHash,
} from "./common";

const LaunchBindingSchema = z
  .object({
    requestId: NonEmptyStringSchema,
    requestHash: Sha256Schema,
    parentHash: Sha256Schema,
    capabilityId: Sha256Schema,
    invoiceId: NonEmptyStringSchema,
    usageHash: Sha256Schema,
    pricingHash: Sha256Schema,
    model: z.enum(["gpt-5.4-mini", "gpt-5.6-sol"]),
    leaseId: ArtifactIdSchema,
  })
  .strict();

const fixtureSigner = <Role extends string>(role: Role) =>
  z
    .object({
      role: z.literal(role),
      keyId: NonEmptyStringSchema,
      signatureAlgorithm: z.literal("fixture-sha256-digest"),
      signatureProvenance: z.literal("deterministic-test-fixture"),
      externallySigned: z.literal(false),
      signature: Sha256Schema,
    })
    .strict();

export const DebitSubentryReceiptSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("provider-debit-subentry-receipt"),
      launchBinding: LaunchBindingSchema,
      chargedMicrousd: z.int().nonnegative(),
      signer: fixtureSigner("provider-supervisor"),
    })
    .strict(),
);

export const FinalDebitReceiptSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("final-debit-reconciliation-receipt"),
      parentHash: Sha256Schema,
      debitSubentryHashes: z.array(Sha256Schema).min(1),
      launchBindings: z.array(LaunchBindingSchema).min(1),
      authorizationMicrousd: z.int().nonnegative(),
      totalChargedMicrousd: z.int().nonnegative(),
      remainingMicrousd: z.int().nonnegative(),
      reconciled: z.literal(true),
      signer: fixtureSigner("ledger-reconciler"),
    })
    .strict(),
);

export const FinalVerdictReceiptSchema = boundedContractSchema(
  z
    .object({
      schemaVersion: z.literal(CONTRACT_SCHEMA_VERSION),
      artifactType: z.literal("final-verdict-receipt"),
      parentHash: Sha256Schema,
      finalDebitReceiptHash: Sha256Schema,
      launchBindings: z.array(LaunchBindingSchema).min(1),
      evidenceRootHash: Sha256Schema,
      verdict: z.enum(["pass", "fail"]),
      reasons: z.array(NonEmptyStringSchema).max(100),
      signer: fixtureSigner("verifier"),
    })
    .strict(),
);

export type DebitSubentryReceipt = Readonly<
  z.infer<typeof DebitSubentryReceiptSchema>
>;
export type FinalDebitReceipt = Readonly<
  z.infer<typeof FinalDebitReceiptSchema>
>;
export type FinalVerdictReceipt = Readonly<
  z.infer<typeof FinalVerdictReceiptSchema>
>;

export class PaidLaunchReceiptError extends Error {
  readonly name = "PaidLaunchReceiptError";
}

export function fixtureReceiptSignature(value: unknown): string {
  return contractHash(JsonValueSchema.parse(value));
}

function assertFixtureSignature(
  receipt: DebitSubentryReceipt | FinalDebitReceipt | FinalVerdictReceipt,
): void {
  const { signature, ...signer } = receipt.signer;
  const expected = fixtureReceiptSignature({ ...receipt, signer });
  if (signature !== expected) {
    throw new PaidLaunchReceiptError("fixture_signature_invalid");
  }
}

export function parseDebitSubentryReceipt(
  value: unknown,
): DebitSubentryReceipt {
  const receipt = DebitSubentryReceiptSchema.parse(value);
  assertFixtureSignature(receipt);
  return receipt;
}

export function parseFinalDebitReceipt(
  value: unknown,
  subentries: readonly DebitSubentryReceipt[],
): FinalDebitReceipt {
  const receipt = FinalDebitReceiptSchema.parse(value);
  assertFixtureSignature(receipt);
  const hashes = subentries.map((entry) =>
    contractHash(JsonValueSchema.parse(entry)),
  );
  const total = subentries.reduce(
    (sum, entry) => sum + entry.chargedMicrousd,
    0,
  );
  const bindings = subentries.map((entry) => entry.launchBinding);
  if (
    JSON.stringify(receipt.debitSubentryHashes) !== JSON.stringify(hashes) ||
    JSON.stringify(receipt.launchBindings) !== JSON.stringify(bindings) ||
    receipt.totalChargedMicrousd !== total ||
    receipt.remainingMicrousd !== receipt.authorizationMicrousd - total ||
    bindings.some((binding) => binding.parentHash !== receipt.parentHash)
  ) {
    throw new PaidLaunchReceiptError("debit_reconciliation_invalid");
  }
  return receipt;
}

export function parseFinalVerdictReceipt(
  value: unknown,
  finalDebit: FinalDebitReceipt,
): FinalVerdictReceipt {
  const receipt = FinalVerdictReceiptSchema.parse(value);
  assertFixtureSignature(receipt);
  const finalDebitHash = contractHash(JsonValueSchema.parse(finalDebit));
  if (
    receipt.finalDebitReceiptHash !== finalDebitHash ||
    receipt.parentHash !== finalDebit.parentHash ||
    JSON.stringify(receipt.launchBindings) !==
      JSON.stringify(finalDebit.launchBindings)
  ) {
    throw new PaidLaunchReceiptError("final_verdict_binding_invalid");
  }
  return receipt;
}
