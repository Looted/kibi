import { z } from "zod";
import {
  JsonValueSchema,
  canonicalJson,
  contractHash,
} from "../contracts/common";
import {
  parseDebitSubentryReceipt,
  parseFinalDebitReceipt,
  parseFinalVerdictReceipt,
} from "../contracts/paid-launch-receipts";

const ExistingTodo5EvidenceSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    task: z.literal(5),
    scope: z.string().min(1),
    redGreenReceipts: z.array(z.unknown()),
    requiredQaRuns: z.array(z.unknown()),
    externalPrerequisiteNoGo: z.unknown(),
  })
  .loose();

const ImplementationBindingSchema = z
  .object({
    commit: z.string().regex(/^[a-f0-9]{40}$/),
    tree: z.string().regex(/^[a-f0-9]{40}$/),
    commitSubject: z.string().min(1),
  })
  .strict();

type ReceiptArtifactEvidence<Receipt> = Readonly<{
  rawArtifactHash: string;
  rawCanonicalJson: string;
  parsedReceipt: Receipt;
}>;

function receiptEvidence<Receipt>(
  rawReceipt: unknown,
  parsedReceipt: Receipt,
): ReceiptArtifactEvidence<Receipt> {
  const value = JsonValueSchema.parse(rawReceipt);
  return {
    rawArtifactHash: contractHash(value),
    rawCanonicalJson: canonicalJson(value),
    parsedReceipt,
  };
}

export function buildPaidLaunchReceiptEvidence(
  inputs: Readonly<{
    debitSubentry: unknown;
    finalDebit: unknown;
    finalVerdict: unknown;
  }>,
) {
  const debitSubentry = parseDebitSubentryReceipt(inputs.debitSubentry);
  const finalDebit = parseFinalDebitReceipt(inputs.finalDebit, [debitSubentry]);
  const finalVerdict = parseFinalVerdictReceipt(
    inputs.finalVerdict,
    finalDebit,
  );

  return {
    debitSubentry: receiptEvidence(inputs.debitSubentry, debitSubentry),
    finalDebitReconciliation: receiptEvidence(inputs.finalDebit, finalDebit),
    finalVerdict: receiptEvidence(inputs.finalVerdict, finalVerdict),
  };
}

export function buildTodo5EvidenceDocument(
  input: Readonly<{
    existing: unknown;
    receipts: Readonly<{
      debitSubentry: unknown;
      finalDebit: unknown;
      finalVerdict: unknown;
    }>;
    implementationBinding: unknown;
    observedAt: string;
  }>,
) {
  const existing = ExistingTodo5EvidenceSchema.parse(input.existing);
  const implementationBinding = ImplementationBindingSchema.parse(
    input.implementationBinding,
  );
  return {
    ...existing,
    observedAt: z.iso.datetime().parse(input.observedAt),
    implementationBinding,
    fixtureReceiptChain: buildPaidLaunchReceiptEvidence(input.receipts),
  };
}
