import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  PROOF_GATE_KEYS,
  REPORT_FILTERS,
} from "../../../src/report/report-view.js";

// implements REQ-kibi-report-filters-and-gates

/**
 * The filters the health report offers and the proof gates it shows for each requirement. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A health report filter shall be all, proved, tested, attention, below_floor, pending_reproof, stale or contradiction. */
export async function reportFilterNamesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-report-filter-names",
    domain: {
      symbolId: "SYM-cli-report-filters",
      members: [...REPORT_FILTERS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A health report proof gate shall be semantic, scenario, implementation, e2e, evidence or proved. */
export async function reportProofGateKeysCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-report-proof-gate-keys",
    domain: {
      symbolId: "SYM-cli-report-proof-gate-keys",
      members: [...PROOF_GATE_KEYS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Health report filters and proof gates", () => {
  test("A health report filter shall be all, proved, tested, attention, below_floor, pending_reproof, stale or contradiction", async () => {
    writeCodeCertificate(await reportFilterNamesCertificate());
    expect([...REPORT_FILTERS].sort()).toEqual([
      "all",
      "attention",
      "below_floor",
      "contradiction",
      "pending_reproof",
      "proved",
      "stale",
      "tested",
    ]);
  });

  test("A health report proof gate shall be semantic, scenario, implementation, e2e, evidence or proved", async () => {
    writeCodeCertificate(await reportProofGateKeysCertificate());
    expect([...PROOF_GATE_KEYS].sort()).toEqual([
      "e2e",
      "evidence",
      "implementation",
      "proved",
      "scenario",
      "semantic",
    ]);
  });
});
