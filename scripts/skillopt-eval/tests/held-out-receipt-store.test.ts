import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { rmSync } from "node:fs";
import { join } from "node:path";
import {
  type PredicateMaterialization,
  materializePredicateCorpus,
} from "../fixtures/predicate-corpus";
import { HeldOutReceiptStore } from "../held-out-receipt-store";
import { temporaryRoot } from "./fixture-test-helpers";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function candidateHash(candidate: string): string {
  return createHash("sha256").update(candidate).digest("hex");
}

async function rejectionMessage(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "";
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
}

function store(
  root: string,
  corpus: PredicateMaterialization,
  candidate = "candidate",
) {
  return new HeldOutReceiptStore({
    artifactRoot: join(root, "run-artifacts"),
    roots: corpus.roots,
    candidateHashes: {
      ...corpus.frozenCandidateHashes,
      skillopt: candidateHash(candidate),
    },
    heldOutCaseIds: corpus.heldOutCaseIds,
    runId: "00000000-0000-4000-8000-000000000096",
    fixtureClaimRoot: corpus.roots.corpus,
  });
}

function terminal(
  reservation: Awaited<ReturnType<HeldOutReceiptStore["reserve"]>>,
) {
  return {
    schemaVersion: "1.0.0" as const,
    artifactType: "held-out-terminal-eligibility-receipt" as const,
    eligibility: "HELD_OUT_MATRIX_INELIGIBLE" as const,
    reservationHash: reservation.reservationHash,
    authorizationRootHash: reservation.authorizationRootHash,
    physicalCellCount: 96,
    frozenVariantHashes: null,
    episodeHashes: [],
    evidenceHashes: [],
    gateOutcomes: {
      predicate: "HELD_OUT_MATRIX_INELIGIBLE" as const,
      skill: { outcome: "fail" as const, adoptionEligible: false },
      bundle: { outcome: "fail" as const, adoptionEligible: false },
    },
  };
}

describe("held-out receipt store", () => {
  test("Given a receipt artifact When held-out execution starts Then the store exposes a durable execution lease", () => {
    // Given
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });

    // When
    const executionLease = Reflect.get(store(root, corpus), "withLease");

    // Then
    expect(executionLease).toBeTypeOf("function");
  });

  test("Given a held-out owner When a same-artifact retry arrives Then it waits for the owner before entering", async () => {
    // Given
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const receiptStore = store(root, corpus);
    const ownerStarted = Promise.withResolvers<void>();
    const releaseOwner = Promise.withResolvers<void>();
    const order: string[] = [];
    const owner = receiptStore.withLease(async () => {
      order.push("owner");
      ownerStarted.resolve();
      await releaseOwner.promise;
      order.push("owner-finished");
    });
    await ownerStarted.promise;

    // When
    const retry = receiptStore.withLease(async () => {
      order.push("retry");
    });
    await new Promise<void>((resolve) => setImmediate(resolve));

    // Then
    expect(order).toEqual(["owner"]);
    releaseOwner.resolve();
    await Promise.all([owner, retry]);
    expect(order).toEqual(["owner", "owner-finished", "retry"]);
  });

  test("Given an interrupted held-out owner When the same artifact is retried Then the released lease allows execution", async () => {
    // Given
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const receiptStore = store(root, corpus);

    // When
    expect(
      await rejectionMessage(
        receiptStore.withLease(async () => {
          throw new Error("interrupted_owner");
        }),
      ),
    ).toContain("interrupted_owner");
    const retry = await receiptStore.withLease(async () => "resumed");

    // Then
    expect(retry).toBe("resumed");
  });

  test("Given a reserved matrix When a terminal receipt is retried after store reconstruction Then its canonical bytes are reused", async () => {
    // Given
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const firstStore = store(root, corpus);
    const reservation = await firstStore.reserve();

    // When
    const first = await firstStore.persistTerminal(terminal(reservation));
    const retryStore = store(root, corpus);
    const second = await retryStore.loadTerminal();

    // Then
    expect(second?.receiptBytes).toBe(first.receiptBytes);
    expect(second?.evidenceId).toBe(first.evidenceId);
    expect(JSON.stringify(reservation)).not.toContain("predicate-held-out");
  });

  test("Given a durable reservation When a different candidate retries the run Then the store fails closed", async () => {
    // Given
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    await store(root, corpus).reserve();

    // When / Then
    expect(
      await rejectionMessage(
        store(root, corpus, "different-candidate").reserve(),
      ),
    ).toContain("held_out_binding_mismatch");
  });

  test("Given a durable reservation When its corpus roots drift Then the store fails closed", async () => {
    // Given
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    await store(root, corpus).reserve();
    const drifted = {
      ...corpus,
      roots: { ...corpus.roots, corpus: "0".repeat(64) },
    };

    // When / Then
    expect(await rejectionMessage(store(root, drifted).reserve())).toContain(
      "held_out_binding_mismatch",
    );
  });

  test("Given an interrupted reservation When a drifted retry rereads its terminal receipt Then it fails closed", async () => {
    // Given
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    await store(root, corpus).reserve();
    const drifted = {
      ...corpus,
      roots: { ...corpus.roots, corpus: "0".repeat(64) },
    };

    // When / Then
    expect(
      await rejectionMessage(store(root, drifted).loadTerminal()),
    ).toContain("held_out_binding_mismatch");
  });
});
