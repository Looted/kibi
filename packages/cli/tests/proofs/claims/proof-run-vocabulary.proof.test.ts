import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  ATTEMPTS_STATUS,
  PROOF_BINDING_KINDS,
  PROOF_RESULT_OUTCOMES,
  RUN_FAILURE_PHASES,
  SUCCESS_POLICIES,
} from "../../../src/public/proof-protocol.js";
import {
  PRODUCER_KINDS,
  PROOF_INTEGRATIONS_PATH,
  PROOF_RUNS_DIR,
} from "../../../src/proof/integrations.js";
import { MAX_PROOF_RECEIPTS } from "../../../src/public/proof-receipt.js";
import { COVERAGE_ROW_PAGE_SIZE } from "../../../src/public/operations/specs/reporting.js";

// implements REQ-kibi-proof-run-vocabulary

/**
 * The closed lists, paths and bounds of a proof run and its receipts. Kibi reads
 * every constant itself at ingest, so the certificate is checked against the code.
 */

/** A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored. */
export async function proofResultOutcomesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-proof-result-outcomes",
    domain: {
      symbolId: "SYM-proof-result-outcomes",
      members: [...PROOF_RESULT_OUTCOMES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A proof run failure phase shall be setup, collection, execution, teardown or infrastructure. */
export async function runFailurePhasesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-run-failure-phases",
    domain: {
      symbolId: "SYM-run-failure-phases",
      members: [...RUN_FAILURE_PHASES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A proof success policy shall be all_required_first_attempt or own_results_first_attempt. */
export async function successPoliciesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-success-policies",
    domain: {
      symbolId: "SYM-success-policies",
      members: [...SUCCESS_POLICIES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A proof binding kind shall be native_case or aggregate_run. */
export async function proofBindingKindsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-proof-binding-kinds",
    domain: {
      symbolId: "SYM-proof-binding-kinds",
      members: [...PROOF_BINDING_KINDS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A proof run attempts status shall be complete or unavailable. */
export async function attemptsStatusCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-attempts-status",
    domain: {
      symbolId: "SYM-attempts-status-2",
      members: [...ATTEMPTS_STATUS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A proof producer shall be command, playwright, junit or tap. */
export async function producerKindsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-producer-kinds",
    domain: { symbolId: "SYM-producer-kinds", members: [...PRODUCER_KINDS] },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The proof integrations file shall be .kb/proof/integrations.json. */
export function proofIntegrationsPathCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-proof-integrations-path",
    symbolId: "SYM-proof-integrations-path",
    value: PROOF_INTEGRATIONS_PATH,
  });
}

/** Proof runs shall be stored under .kb/proof/runs. */
export function proofRunsDirCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-proof-runs-dir",
    symbolId: "SYM-proof-runs-dir",
    value: PROOF_RUNS_DIR,
  });
}

/** Kibi shall keep at most 50 proof receipts per test. */
export function maxProofReceiptsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-max-proof-receipts",
    variable: "max_receipts",
    valueType: "int",
    assumptions: [{ operator: "eq", value: MAX_PROOF_RECEIPTS }],
    claim: { operator: "eq", value: 50 },
  });
}

/** Kibi shall read coverage rows in pages of at most 10 rows. */
export function coverageRowPageSizeCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-coverage-row-page-size",
    variable: "coverage_page_size",
    valueType: "int",
    assumptions: [{ operator: "eq", value: COVERAGE_ROW_PAGE_SIZE }],
    claim: { operator: "eq", value: 10 },
  });
}

describe("Proof run results and producers", () => {
  test("A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored", async () => {
    writeCodeCertificate(await proofResultOutcomesCertificate());
    expect([...PROOF_RESULT_OUTCOMES].sort()).toEqual([
      "errored",
      "failed",
      "interrupted",
      "passed",
      "skipped",
      "timed_out",
    ]);
  });

  test("A proof run failure phase shall be setup, collection, execution, teardown or infrastructure", async () => {
    writeCodeCertificate(await runFailurePhasesCertificate());
    expect([...RUN_FAILURE_PHASES].sort()).toEqual([
      "collection",
      "execution",
      "infrastructure",
      "setup",
      "teardown",
    ]);
  });

  test("A proof success policy shall be all_required_first_attempt or own_results_first_attempt", async () => {
    writeCodeCertificate(await successPoliciesCertificate());
    expect([...SUCCESS_POLICIES].sort()).toEqual([
      "all_required_first_attempt",
      "own_results_first_attempt",
    ]);
  });

  test("A proof binding kind shall be native_case or aggregate_run", async () => {
    writeCodeCertificate(await proofBindingKindsCertificate());
    expect([...PROOF_BINDING_KINDS].sort()).toEqual([
      "aggregate_run",
      "native_case",
    ]);
  });

  test("A proof run attempts status shall be complete or unavailable", async () => {
    writeCodeCertificate(await attemptsStatusCertificate());
    expect([...ATTEMPTS_STATUS].sort()).toEqual(["complete", "unavailable"]);
  });

  test("A proof producer shall be command, playwright, junit or tap", async () => {
    writeCodeCertificate(await producerKindsCertificate());
    expect([...PRODUCER_KINDS].sort()).toEqual([
      "command",
      "junit",
      "playwright",
      "tap",
    ]);
  });

  test("The proof integrations file shall be .kb/proof/integrations.json", () => {
    writeCodeCertificate(proofIntegrationsPathCertificate());
    expect(PROOF_INTEGRATIONS_PATH).toBe(".kb/proof/integrations.json");
  });

  test("Proof runs shall be stored under .kb/proof/runs", () => {
    writeCodeCertificate(proofRunsDirCertificate());
    expect(PROOF_RUNS_DIR).toBe(".kb/proof/runs");
  });

  test("Kibi shall keep at most 50 proof receipts per test", () => {
    writeCodeCertificate(maxProofReceiptsCertificate());
    expect(MAX_PROOF_RECEIPTS).toBe(50);
  });

  test("Kibi shall read coverage rows in pages of at most 10 rows", () => {
    writeCodeCertificate(coverageRowPageSizeCertificate());
    expect(COVERAGE_ROW_PAGE_SIZE).toBe(10);
  });
});
