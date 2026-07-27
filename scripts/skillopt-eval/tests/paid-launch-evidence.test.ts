import { describe, expect, test } from "bun:test";
import { JsonValueSchema, contractHash } from "../contracts/common";
import {
  buildPaidLaunchReceiptEvidence,
  buildTodo5EvidenceDocument,
} from "../runtime/paid-launch-evidence";
import {
  debitSubentryReceiptFixture,
  finalDebitReceiptFixture,
  finalVerdictReceiptFixture,
} from "./fixtures/trust-plane-fixtures";

describe("paid launch evidence generation", () => {
  test("preserves every parsed launch binding in generated receipt evidence", () => {
    // Given
    const receipts = {
      debitSubentry: debitSubentryReceiptFixture,
      finalDebit: finalDebitReceiptFixture,
      finalVerdict: finalVerdictReceiptFixture,
    };

    // When
    const evidence = buildPaidLaunchReceiptEvidence(receipts);

    // Then
    expect(
      evidence.finalDebitReconciliation.parsedReceipt.launchBindings,
    ).toEqual([debitSubentryReceiptFixture.launchBinding]);
    expect(evidence.finalVerdict.parsedReceipt.launchBindings).toEqual([
      debitSubentryReceiptFixture.launchBinding,
    ]);
    expect(evidence.finalDebitReconciliation.rawArtifactHash).toBe(
      contractHash(JsonValueSchema.parse(finalDebitReceiptFixture)),
    );
    expect(buildPaidLaunchReceiptEvidence(receipts)).toEqual(evidence);
  });

  test("preserves raw run receipts while rebinding generated evidence to the implementation", () => {
    // Given
    const redGreenReceipts = [{ phase: "RED", rawHash: "a".repeat(64) }];
    const cleanupReceipt = { cleanup: "rm-recursive-force" };
    const implementationBinding = {
      commit: "1".repeat(40),
      tree: "2".repeat(40),
      commitSubject: "fix(skillopt): bind model and lease capabilities",
    };

    // When
    const evidence = buildTodo5EvidenceDocument({
      existing: {
        schemaVersion: "1.0.0",
        task: 5,
        scope: "paid launch",
        redGreenReceipts,
        requiredQaRuns: [],
        externalPrerequisiteNoGo: { cleanupReceipt },
      },
      receipts: {
        debitSubentry: debitSubentryReceiptFixture,
        finalDebit: finalDebitReceiptFixture,
        finalVerdict: finalVerdictReceiptFixture,
      },
      implementationBinding,
      observedAt: "2026-07-27T00:00:00.000Z",
    });

    // Then
    expect(evidence.implementationBinding).toEqual(implementationBinding);
    expect(evidence.redGreenReceipts).toEqual(redGreenReceipts);
    expect(evidence.externalPrerequisiteNoGo).toEqual({ cleanupReceipt });
    expect(
      evidence.fixtureReceiptChain.finalVerdict.parsedReceipt.launchBindings,
    ).toEqual([debitSubentryReceiptFixture.launchBinding]);
  });
});
