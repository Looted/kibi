import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import {
  type PredicateMaterialization,
  materializePredicateCorpus,
} from "../fixtures/predicate-corpus";
import {
  HeldOutReceiptStore,
  HeldOutReceiptStoreError,
} from "../held-out-receipt-store";
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
  extras: Readonly<{
    skill?: "kibi-usage" | "kibi-freshness";
    expectedPhysicalCellCount?: number;
    artifactRoot?: string;
  }> = {},
) {
  return new HeldOutReceiptStore({
    artifactRoot: extras.artifactRoot ?? join(root, "run-artifacts"),
    roots: corpus.roots,
    candidateHashes: {
      ...corpus.frozenCandidateHashes,
      skillopt: candidateHash(candidate),
    },
    heldOutCaseIds: corpus.heldOutCaseIds,
    runId: "00000000-0000-4000-8000-000000000096",
    fixtureClaimRoot: corpus.roots.corpus,
    ...(extras.skill === undefined ? {} : { skill: extras.skill }),
    ...(extras.expectedPhysicalCellCount === undefined
      ? {}
      : { expectedPhysicalCellCount: extras.expectedPhysicalCellCount }),
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

  test("Given no reservation When loadTerminal runs Then it returns undefined", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });

    expect(await store(root, corpus).loadTerminal()).toBeUndefined();
  });

  test("Given a reservation without a terminal When loadTerminal runs Then it returns undefined", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const receiptStore = store(root, corpus, "candidate", {
      skill: "kibi-freshness",
    });
    await receiptStore.reserve();
    await receiptStore.reserve();

    expect(await receiptStore.loadTerminal()).toBeUndefined();
  });

  test("Given no reservation When persistTerminal runs Then it requires the reservation", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const receiptStore = store(root, corpus);
    try {
      await receiptStore.persistTerminal(
        terminal({
          reservationHash: "a".repeat(64),
          authorizationRootHash: "b".repeat(64),
        } as never),
      );
      throw new Error("expected reservation required");
    } catch (error) {
      expect(error).toBeInstanceOf(HeldOutReceiptStoreError);
      expect((error as HeldOutReceiptStoreError).code).toBe(
        "held_out_reservation_required",
      );
    }
  });

  test("Given a reserved matrix When the cell count is invalid Then persist fails closed", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const receiptStore = store(root, corpus, "candidate", {
      expectedPhysicalCellCount: 36,
    });
    const reservation = await receiptStore.reserve();

    try {
      await receiptStore.persistTerminal({
        ...terminal(reservation),
        physicalCellCount: 0,
      });
      throw new Error("expected cell count invalid");
    } catch (error) {
      expect(error).toBeInstanceOf(HeldOutReceiptStoreError);
      expect((error as HeldOutReceiptStoreError).code).toBe(
        "held_out_terminal_cell_count_invalid",
      );
    }

    try {
      await receiptStore.persistTerminal(terminal(reservation));
      throw new Error("expected expected-count mismatch");
    } catch (error) {
      expect(error).toBeInstanceOf(HeldOutReceiptStoreError);
      expect((error as HeldOutReceiptStoreError).code).toBe(
        "held_out_terminal_cell_count_invalid",
      );
    }
  });

  test("Given a persisted terminal When a different receipt is retried Then the store reports a conflict", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const receiptStore = store(root, corpus);
    const reservation = await receiptStore.reserve();
    await receiptStore.persistTerminal(terminal(reservation));

    try {
      await receiptStore.persistTerminal({
        ...terminal(reservation),
        physicalCellCount: 97,
      });
      throw new Error("expected terminal conflict");
    } catch (error) {
      expect(error).toBeInstanceOf(HeldOutReceiptStoreError);
      expect((error as HeldOutReceiptStoreError).code).toBe(
        "held_out_terminal_conflict",
      );
    }
  });

  test("Given a symlink artifact directory When the store opens Then the path is rejected", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const realArtifacts = join(root, "real-artifacts");
    mkdirSync(realArtifacts, { mode: 0o700 });
    const artifactRoot = join(root, "run-artifacts");
    symlinkSync(realArtifacts, artifactRoot);

    try {
      await store(root, corpus, "candidate", { artifactRoot }).reserve();
      throw new Error("expected invalid artifact path");
    } catch (error) {
      expect(error).toBeInstanceOf(HeldOutReceiptStoreError);
      expect((error as HeldOutReceiptStoreError).code).toBe(
        "held_out_artifact_path_invalid",
      );
    }
  });

  test("Given a symlink named held-out-evidence When the store opens Then the path is rejected", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const artifactRoot = join(root, "run-artifacts");
    const realEvidence = join(root, "real-evidence");
    mkdirSync(artifactRoot, { recursive: true, mode: 0o700 });
    mkdirSync(realEvidence, { mode: 0o700 });
    symlinkSync(realEvidence, join(artifactRoot, "held-out-evidence"));

    try {
      await store(root, corpus, "candidate", { artifactRoot }).loadTerminal();
      throw new Error("expected invalid artifact path");
    } catch (error) {
      expect(error).toBeInstanceOf(HeldOutReceiptStoreError);
      expect((error as HeldOutReceiptStoreError).code).toBe(
        "held_out_artifact_path_invalid",
      );
    }
  });

  test("Given a directory named terminal.json When loadTerminal reads Then the IO error is rethrown", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const receiptStore = store(root, corpus);
    await receiptStore.reserve();
    mkdirSync(join(root, "run-artifacts", "held-out-evidence", "terminal.json"));

    await expect(receiptStore.loadTerminal()).rejects.toMatchObject({
      code: "EISDIR",
    });
  });

  test("Given a directory named reservation.json When persistTerminal reads Then the IO error is rethrown", async () => {
    const root = temporaryRoot();
    roots.push(root);
    const corpus = materializePredicateCorpus({
      artifactRoot: join(root, "predicate-corpus"),
    });
    const artifactRoot = join(root, "run-artifacts");
    mkdirSync(join(artifactRoot, "held-out-evidence"), {
      recursive: true,
      mode: 0o700,
    });
    mkdirSync(join(artifactRoot, "held-out-evidence", "reservation.json"));

    await expect(
      store(root, corpus, "candidate", { artifactRoot }).persistTerminal(
        terminal({
          reservationHash: "a".repeat(64),
          authorizationRootHash: "b".repeat(64),
        } as never),
      ),
    ).rejects.toMatchObject({ code: "EISDIR" });
  });
});
