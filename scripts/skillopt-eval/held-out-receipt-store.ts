import { lstat, mkdir } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  JsonValueSchema,
  canonicalJson,
  contractHash,
} from "./contracts/common";
import type { FrozenCandidateHashes } from "./fixtures/predicate-corpus";
import {
  HeldOutTerminalReceiptSchema,
  assertTerminalReceiptBinding,
  buildHeldOutReservation,
  parseHeldOutReservation,
  parseHeldOutTerminalReceipt,
} from "./held-out-evidence";
import type {
  HeldOutEvidenceBinding,
  HeldOutTerminalReceipt,
  ReservedPredicateMatrix,
} from "./held-out-evidence";
import { withHeldOutExecutionLease } from "./held-out-execution-lease";
import { createAtomically, isErrno, readNoFollow } from "./held-out-receipt-io";
import type { CorpusRoots } from "./real-workflow-types";
import type { CanonicalSkill } from "./catalog";

export type StoredHeldOutTerminalReceipt = Readonly<{
  receipt: HeldOutTerminalReceipt;
  receiptBytes: string;
  evidenceId: string;
}>;

export class HeldOutReceiptStoreError extends Error {
  readonly name = "HeldOutReceiptStoreError";

  constructor(
    readonly code:
      | "held_out_artifact_path_invalid"
      | "held_out_reservation_required"
      | "held_out_terminal_conflict"
      | "held_out_terminal_cell_count_invalid",
  ) {
    super(code);
  }
}

function isNestedPath(root: string, target: string): boolean {
  const relativeTarget = relative(root, target);
  return (
    relativeTarget === "" ||
    (!relativeTarget.startsWith("..") && !isAbsolute(relativeTarget))
  );
}

async function assertDirectory(path: string): Promise<void> {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new HeldOutReceiptStoreError("held_out_artifact_path_invalid");
  }
}

function storedTerminalReceipt(
  receipt: HeldOutTerminalReceipt,
  receiptBytes: string,
): StoredHeldOutTerminalReceipt {
  return {
    receipt,
    receiptBytes,
    evidenceId: contractHash(JsonValueSchema.parse(receipt)),
  };
}

export class HeldOutReceiptStore {
  constructor(
    private readonly options: Readonly<{
      artifactRoot: string;
      roots: CorpusRoots;
      candidateHashes: FrozenCandidateHashes;
      heldOutCaseIds: readonly string[];
      runId: string;
      skill?: CanonicalSkill;
      fixtureClaimRoot: string;
    }>,
  ) {}

  async withLease<T>(operation: () => Promise<T>): Promise<T> {
    return withHeldOutExecutionLease(await this.directory(), operation);
  }

  async reserve(): Promise<ReservedPredicateMatrix> {
    const directory = await this.directory();
    const expected = buildHeldOutReservation(this.binding());
    const receiptBytes = await this.createOrRead({
      directory,
      name: "reservation.json",
      bytes: expected.receiptBytes,
    });
    return parseHeldOutReservation(receiptBytes, this.binding());
  }

  async loadTerminal(): Promise<StoredHeldOutTerminalReceipt | undefined> {
    const directory = await this.directory();
    const path = join(directory, "terminal.json");
    let receiptBytes: string;
    try {
      receiptBytes = await readNoFollow(path);
    } catch (error) {
      if (isErrno(error, "ENOENT")) {
        await this.readReservationIfPresent(directory);
        return undefined;
      }
      throw error;
    }
    const reservation = await this.readReservation(directory);
    const receipt = parseHeldOutTerminalReceipt(receiptBytes);
    assertTerminalReceiptBinding({ reservation, receipt });
    return storedTerminalReceipt(receipt, receiptBytes);
  }

  async persistTerminal(
    receipt: HeldOutTerminalReceipt,
  ): Promise<StoredHeldOutTerminalReceipt> {
    const directory = await this.directory();
    const reservation = await this.readReservation(directory);
    const expected = HeldOutTerminalReceiptSchema.parse(receipt);
    if (expected.physicalCellCount !== 96) {
      throw new HeldOutReceiptStoreError(
        "held_out_terminal_cell_count_invalid",
      );
    }
    assertTerminalReceiptBinding({ reservation, receipt: expected });
    const expectedBytes = canonicalJson(expected);
    const receiptBytes = await this.createOrRead({
      directory,
      name: "terminal.json",
      bytes: expectedBytes,
    });
    if (receiptBytes !== expectedBytes) {
      throw new HeldOutReceiptStoreError("held_out_terminal_conflict");
    }
    const persisted = parseHeldOutTerminalReceipt(receiptBytes);
    assertTerminalReceiptBinding({ reservation, receipt: persisted });
    return storedTerminalReceipt(persisted, receiptBytes);
  }

  private async readReservation(
    directory: string,
  ): Promise<ReservedPredicateMatrix> {
    try {
      return parseHeldOutReservation(
        await readNoFollow(join(directory, "reservation.json")),
        this.binding(),
      );
    } catch (error) {
      if (isErrno(error, "ENOENT")) {
        throw new HeldOutReceiptStoreError("held_out_reservation_required");
      }
      throw error;
    }
  }

  private async readReservationIfPresent(directory: string): Promise<void> {
    try {
      await this.readReservation(directory);
    } catch (error) {
      if (
        error instanceof HeldOutReceiptStoreError &&
        error.code === "held_out_reservation_required"
      )
        return;
      throw error;
    }
  }

  private async createOrRead(
    input: Readonly<{
      directory: string;
      name: "reservation.json" | "terminal.json";
      bytes: string;
    }>,
  ): Promise<string> {
    const targetPath = join(input.directory, input.name);
    try {
      await createAtomically({
        directory: input.directory,
        targetPath,
        bytes: input.bytes,
      });
      return input.bytes;
    } catch (error) {
      if (isErrno(error, "EEXIST")) return readNoFollow(targetPath);
      throw error;
    }
  }

  private binding(): HeldOutEvidenceBinding {
    return {
      roots: this.options.roots,
      candidateHashes: this.options.candidateHashes,
      heldOutCaseIds: this.options.heldOutCaseIds,
      runId: this.options.runId,
      skill: this.options.skill ?? "kibi-usage",
      fixtureClaimRoot: this.options.fixtureClaimRoot,
    };
  }

  private async directory(): Promise<string> {
    const artifactRoot = resolve(this.options.artifactRoot);
    const directory = resolve(artifactRoot, "held-out-evidence");
    if (!isNestedPath(artifactRoot, directory)) {
      throw new HeldOutReceiptStoreError("held_out_artifact_path_invalid");
    }
    await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
    await assertDirectory(artifactRoot);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await assertDirectory(directory);
    return directory;
  }
}
