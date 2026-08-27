import { z } from "zod";
import { CANONICAL_SKILLS } from "./catalog";
import {
  JsonValueSchema,
  Sha256Schema,
  canonicalJson,
  contractHash,
  parseContractText,
} from "./contracts/common";
import type { FrozenCandidateHashes } from "./fixtures/predicate-corpus";
import { type CorpusRoots, RootsSchema } from "./real-workflow-types";

const Variants = ["baseline", "one-shot", "skillopt"] as const;
const Replicates = [1, 2, 3] as const;
const CandidateHashesSchema = z
  .object({
    baseline: Sha256Schema,
    oneShot: Sha256Schema,
    skillopt: Sha256Schema,
  })
  .strict();
const GenericCellSchema = z
  .object({
    caseId: z.string().min(1),
    variant: z.enum(Variants),
    replicate: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .strict();
const ReservationSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("held-out-matrix-reservation"),
    matrixId: z.uuid(),
    runId: z.uuid(),
    skill: z.enum(CANONICAL_SKILLS),
    cellCount: z.number().int().positive(),
    reservedBeforeCellOne: z.literal(true),
    roots: RootsSchema,
    candidateHashes: CandidateHashesSchema,
    heldOutCaseIds: z.array(z.string().min(1)).min(1),
    // The matrix is scoped to the selected canonical skill. Predicate-only
    // reservations have 4 cases (36 cells); other skills may reserve their
    // full held-out case set without changing the envelope version.
    cells: z.array(GenericCellSchema).min(1),
    fixtureClaimRoot: Sha256Schema,
    catalogRoot: Sha256Schema,
    corpusRoot: Sha256Schema,
  })
  .strict();
const GateSchema = z
  .object({
    outcome: z.enum(["pass", "fail", "ambiguous"]),
    adoptionEligible: z.boolean(),
  })
  .strict();

export const HeldOutTerminalReceiptSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    artifactType: z.literal("held-out-terminal-eligibility-receipt"),
    eligibility: z.enum(["eligible", "HELD_OUT_MATRIX_INELIGIBLE"]),
    reservationHash: Sha256Schema,
    authorizationRootHash: Sha256Schema,
    physicalCellCount: z.number().int().nonnegative(),
    frozenVariantHashes: CandidateHashesSchema.nullable(),
    episodeHashes: z.array(Sha256Schema),
    evidenceHashes: z.array(Sha256Schema),
    gateOutcomes: z
      .object({
        predicate: z.enum(["eligible", "HELD_OUT_MATRIX_INELIGIBLE"]),
        skill: GateSchema,
        bundle: GateSchema,
      })
      .strict(),
  })
  .strict();

export type PredicateVariant = (typeof Variants)[number];
export type PredicateReplicate = (typeof Replicates)[number];
export type PredicateMatrixCell = Readonly<{
  caseId: string;
  variant: PredicateVariant;
  replicate: PredicateReplicate;
}>;
export type HeldOutTerminalReceipt = z.infer<
  typeof HeldOutTerminalReceiptSchema
>;
export type HeldOutEvidenceBinding = Readonly<{
  roots: CorpusRoots;
  candidateHashes: FrozenCandidateHashes;
  heldOutCaseIds: readonly string[];
  runId: string;
  skill: (typeof CANONICAL_SKILLS)[number];
  fixtureClaimRoot: string;
}>;
export type ReservedPredicateMatrix = Readonly<{
  matrixId: string;
  cellCount: number;
  reservedBeforeCellOne: true;
  receiptBytes: string;
  isReservedCell: (cell: PredicateMatrixCell) => boolean;
  matchesFrozenCandidateHashes: (hashes: FrozenCandidateHashes) => boolean;
  authorizationRootHash: string;
  reservationHash: string;
}>;

export class HeldOutEvidenceError extends Error {
  readonly name = "HeldOutEvidenceError";

  constructor(
    readonly code:
      | "held_out_binding_mismatch"
      | "held_out_receipt_not_canonical"
      | "held_out_reservation_invalid",
  ) {
    super(code);
  }
}

function sameCandidateHashes(
  left: FrozenCandidateHashes,
  right: FrozenCandidateHashes,
): boolean {
  return (
    left.baseline === right.baseline &&
    left.oneShot === right.oneShot &&
    left.skillopt === right.skillopt
  );
}

function matrixId(
  roots: CorpusRoots,
  candidateHashes: FrozenCandidateHashes,
): string {
  const digest = contractHash(
    JsonValueSchema.parse({ roots, candidateHashes }),
  );
  const hex = digest.slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

function genericCells(
  caseIds: readonly string[],
): readonly z.infer<typeof GenericCellSchema>[] {
  return Variants.flatMap((variant) =>
    Replicates.flatMap((replicate) =>
      caseIds.map((caseId) => ({
        // The reservation intentionally carries opaque case identities only;
        // private evaluators bind the real task claims later.
        caseId,
        variant,
        replicate,
      })),
    ),
  );
}

function assertHeldOutCaseIds(caseIds: readonly string[]): void {
  if (caseIds.length < 4 || new Set(caseIds).size !== caseIds.length) {
    throw new HeldOutEvidenceError("held_out_reservation_invalid");
  }
}

export function buildHeldOutReservation(
  binding: HeldOutEvidenceBinding,
): ReservedPredicateMatrix {
  assertHeldOutCaseIds(binding.heldOutCaseIds);
  const record = ReservationSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "held-out-matrix-reservation",
    matrixId: matrixId(binding.roots, binding.candidateHashes),
    runId: binding.runId,
    skill: binding.skill,
    cellCount: 36,
    reservedBeforeCellOne: true,
    roots: binding.roots,
    candidateHashes: binding.candidateHashes,
    heldOutCaseIds: [...binding.heldOutCaseIds],
    cells: genericCells(binding.heldOutCaseIds),
    fixtureClaimRoot: binding.fixtureClaimRoot,
    catalogRoot: binding.roots.catalog,
    corpusRoot: binding.roots.corpus,
  });
  const receiptBytes = canonicalJson(record);
  const reservedCells = new Set(
    binding.heldOutCaseIds.flatMap((caseId) =>
      Variants.flatMap((variant) =>
        Replicates.map(
          (replicate) => `${caseId}\u0000${variant}\u0000${replicate}`,
        ),
      ),
    ),
  );
  return {
    matrixId: record.matrixId,
    cellCount: record.cellCount,
    reservedBeforeCellOne: record.reservedBeforeCellOne,
    receiptBytes,
    isReservedCell: (cell) =>
      reservedCells.has(
        `${cell.caseId}\u0000${cell.variant}\u0000${cell.replicate}`,
      ),
    matchesFrozenCandidateHashes: (hashes) =>
      sameCandidateHashes(hashes, binding.candidateHashes),
    authorizationRootHash: contractHash(JsonValueSchema.parse(binding.roots)),
    reservationHash: contractHash(record),
  };
}

export function parseHeldOutReservation(
  receiptBytes: string,
  binding: HeldOutEvidenceBinding,
): ReservedPredicateMatrix {
  const record = parseContractText(ReservationSchema, receiptBytes);
  if (canonicalJson(record) !== receiptBytes) {
    throw new HeldOutEvidenceError("held_out_receipt_not_canonical");
  }
  const expected = buildHeldOutReservation(binding);
  if (receiptBytes !== expected.receiptBytes) {
    throw new HeldOutEvidenceError("held_out_binding_mismatch");
  }
  return expected;
}

export function parseHeldOutTerminalReceipt(
  receiptBytes: string,
): HeldOutTerminalReceipt {
  const receipt = parseContractText(HeldOutTerminalReceiptSchema, receiptBytes);
  if (canonicalJson(receipt) !== receiptBytes) {
    throw new HeldOutEvidenceError("held_out_receipt_not_canonical");
  }
  return receipt;
}

export function assertTerminalReceiptBinding(
  input: Readonly<{
    reservation: ReservedPredicateMatrix;
    receipt: HeldOutTerminalReceipt;
  }>,
): void {
  if (
    input.receipt.reservationHash !== input.reservation.reservationHash ||
    input.receipt.authorizationRootHash !==
      input.reservation.authorizationRootHash
  ) {
    throw new HeldOutEvidenceError("held_out_binding_mismatch");
  }
}
