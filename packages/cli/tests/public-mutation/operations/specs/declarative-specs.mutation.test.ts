import { describe, expect, test } from "bun:test";
import { executeDelete } from "../../../../src/operations/mutation/delete.js";
import { executeUpsert } from "../../../../src/operations/mutation/upsert.js";
import { executeValidateUpsert } from "../../../../src/operations/mutation/validate-upsert.js";
import { executeIngestProof } from "../../../../src/operations/proof/ingest-proof.js";
import { withContractDefaults } from "../../../../src/public/operations/catalog.js";
import { executeCheck } from "../../../../src/public/operations/check-executor.js";
import { executePrepareImpactReview } from "../../../../src/public/operations/impact-review-preparation.js";
import { checkSpec } from "../../../../src/public/operations/specs/check.js";
import { prepareImpactReviewSpec } from "../../../../src/public/operations/specs/impact-review-preparation.js";
import {
  deleteSpec,
  upsertSpec as reexportedUpsertSpec,
  validateUpsertSpec,
} from "../../../../src/public/operations/specs/mutation.js";
import {
  ingestProofSpec,
  executeIngestProof as reexportedIngestProof,
} from "../../../../src/public/operations/specs/proof.js";
import { upsertSpec } from "../../../../src/public/operations/specs/upsert.js";
import { expectGolden } from "../../helpers/golden.js";

describe("declarative operation specs", () => {
  test("kb_ingest_proof", () => {
    expectGolden("spec-ingest-proof", withContractDefaults(ingestProofSpec));
    expect(ingestProofSpec.execute).toBe(executeIngestProof);
    expect(reexportedIngestProof).toBe(executeIngestProof);
  });

  test("kb_prepare_impact_review", () => {
    expectGolden(
      "spec-prepare-impact-review",
      withContractDefaults(prepareImpactReviewSpec),
    );
    expect(prepareImpactReviewSpec.execute).toBe(executePrepareImpactReview);
  });

  test("kb_check", () => {
    expectGolden("spec-check", withContractDefaults(checkSpec));
    expect(checkSpec.execute).toBe(executeCheck);
  });

  test("kb_upsert", () => {
    expectGolden("spec-upsert", withContractDefaults(upsertSpec));
    expect(upsertSpec.execute).toBe(executeUpsert);
    expect(reexportedUpsertSpec).toBe(upsertSpec);
  });

  test("kb_validate_upsert", () => {
    expectGolden(
      "spec-validate-upsert",
      withContractDefaults(validateUpsertSpec),
    );
    expect(validateUpsertSpec.execute).toBe(executeValidateUpsert);
  });

  test("kb_delete", () => {
    expectGolden("spec-delete", withContractDefaults(deleteSpec));
    expect(deleteSpec.execute).toBe(executeDelete);
  });
});
