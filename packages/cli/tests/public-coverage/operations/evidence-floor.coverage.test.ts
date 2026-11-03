import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  EVIDENCE_FLOOR_RULE,
  type EvidenceFloorRow,
  collectEvidenceFloorViolations,
  gapDetailLines,
} from "../../../src/public/operations/evidence-floor.js";
import type {
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import * as reporting from "../../../src/public/operations/specs/reporting.js";
import * as manifest from "../../../src/utils/kb-manifest.js";

const spies: Array<{ mockRestore: () => void }> = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const row: EvidenceFloorRow = {
  id: "REQ-1",
  evidenceLevel: "none",
  requiredEvidence: "tested",
  requiredEvidenceSource: "explicit",
  status: "below",
  proofStatus: "missing",
  proofGaps: [],
};

describe("gapDetailLines", () => {
  test("labels each non-empty gap list and truncates long ones", () => {
    expect(
      gapDetailLines({
        ...row,
        gapDetails: {
          missingReceiptTests: ["T1", "T2"],
          staleReceiptTests: [],
          custom: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
        },
      }),
    ).toStrictEqual([
      "no receipt: T1, T2",
      "custom: a, b, c, d, e, f, g, h (+2 more)",
    ]);
    expect(gapDetailLines(row)).toStrictEqual([]);
  });
});

describe("collectEvidenceFloorViolations with fresh evidence", () => {
  function context(): OperationContext {
    const prolog = {
      oneShotMode: true,
      query: async () => ({
        success: true,
        bindings: { JsonString: JSON.stringify({ evaluated: 0, rows: [] }) },
      }),
    } as unknown as PrologPort;
    return {
      workspaceRoot: "/tmp",
      signal: new AbortController().signal,
      clock: () => new Date(0),
      prolog,
    } as OperationContext;
  }

  function setup() {
    spies.push(
      spyOn(manifest, "readKbManifest").mockReturnValue({
        schemaVersion: 11,
      } as never),
      spyOn(reporting, "perContractTestBindings").mockResolvedValue(null),
    );
  }

  test("a dirty or missing proof snapshot is reported first", async () => {
    setup();
    const rules = new Set([EVIDENCE_FLOOR_RULE]);
    const dirty = await collectEvidenceFloorViolations(context(), rules, {
      freshEvidence: true,
      snapshotEvidence: {
        available: true,
        snapshot: { hash: "a".repeat(64), dirty: true },
      } as never,
    });
    expect(dirty).toStrictEqual([
      {
        rule: EVIDENCE_FLOOR_RULE,
        entityId: "proof-snapshot",
        description:
          "--fresh-evidence needs a clean proof snapshot, but the working tree has uncommitted changes",
        suggestion:
          "Commit or stash working-tree changes (or run inside a Git checkout), run kibi prove, then rerun kibi check --fresh-evidence.",
      },
    ]);
    const missing = await collectEvidenceFloorViolations(context(), rules, {
      freshEvidence: true,
      snapshotEvidence: { available: false, error: "not a git checkout" } as never,
    });
    expect(missing[0]?.description).toBe(
      "--fresh-evidence needs a proof snapshot, but none is available: not a git checkout",
    );
    const clean = await collectEvidenceFloorViolations(context(), rules, {
      freshEvidence: true,
      snapshotEvidence: {
        available: true,
        snapshot: { hash: "a".repeat(64), dirty: false },
      } as never,
    });
    expect(clean).toStrictEqual([]);
  });
});
