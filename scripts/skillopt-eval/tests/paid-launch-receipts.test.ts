import { describe, expect, test } from "bun:test";
import {
  parseDebitSubentryReceipt,
  parseFinalDebitReceipt,
  parseFinalVerdictReceipt,
} from "../contracts/paid-launch-receipts";
import {
  debitSubentryReceiptFixture,
  finalDebitReceiptFixture,
  finalVerdictReceiptFixture,
  fixtureHash as hash,
} from "./fixtures/trust-plane-fixtures";

describe("paid launch fixture receipt contracts", () => {
  test("parses the strict deterministic fake-signed receipt chain", () => {
    // Given / When
    const debit = parseDebitSubentryReceipt(debitSubentryReceiptFixture);
    const reconciliation = parseFinalDebitReceipt(finalDebitReceiptFixture, [
      debit,
    ]);
    const verdict = parseFinalVerdictReceipt(
      finalVerdictReceiptFixture,
      reconciliation,
    );

    // Then
    expect(debit.artifactType).toBe("provider-debit-subentry-receipt");
    expect(debit.launchBinding.requestId).toBe("request-fixture-1");
    expect(debit.signer).toMatchObject({
      role: "provider-supervisor",
      signatureProvenance: "deterministic-test-fixture",
    });
    expect(reconciliation.reconciled).toBe(true);
    expect(reconciliation.signer.role).toBe("ledger-reconciler");
    expect(verdict.verdict).toBe("pass");
    expect(verdict.signer.role).toBe("verifier");
  });

  test("rejects unknown fields binding tampering and fake-signature tampering", () => {
    // Given
    const unknownField = { ...debitSubentryReceiptFixture, external: true };
    const reboundRequest = {
      ...debitSubentryReceiptFixture,
      launchBinding: {
        ...debitSubentryReceiptFixture.launchBinding,
        requestHash: hash("0"),
      },
    };
    const forgedVerdict = {
      ...finalVerdictReceiptFixture,
      signer: { ...finalVerdictReceiptFixture.signer, signature: hash("0") },
    };

    // When / Then
    expect(() => parseDebitSubentryReceipt(unknownField)).toThrow();
    expect(() => parseDebitSubentryReceipt(reboundRequest)).toThrow(
      "fixture_signature_invalid",
    );
    expect(() =>
      parseFinalVerdictReceipt(
        forgedVerdict,
        parseFinalDebitReceipt(finalDebitReceiptFixture, [
          parseDebitSubentryReceipt(debitSubentryReceiptFixture),
        ]),
      ),
    ).toThrow("fixture_signature_invalid");
  });
});
