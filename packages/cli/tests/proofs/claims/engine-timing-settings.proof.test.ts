import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  ENGINE_IDLE_CHECK_INTERVAL_MS,
  ENGINE_PROLOG_EXIT_GRACE_MS,
} from "../../../src/engine.js";

// implements REQ-engine-timing-settings

/**
 * How often the engine daemon checks for idleness and how long it waits for Prolog to exit. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The engine daemon shall check for idleness every 30000 milliseconds. */
export function engineIdleCheckCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-engine-idle-check",
    variable: "idle_check_ms",
    valueType: "int",
    assumptions: [{ operator: "eq", value: ENGINE_IDLE_CHECK_INTERVAL_MS }],
    claim: { operator: "eq", value: 30000 },
  });
}

/** The engine shall give Prolog 1000 milliseconds to exit. */
export function engineExitGraceCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-engine-exit-grace",
    variable: "exit_grace_ms",
    valueType: "int",
    assumptions: [{ operator: "eq", value: ENGINE_PROLOG_EXIT_GRACE_MS }],
    claim: { operator: "eq", value: 1000 },
  });
}

describe("Engine idle check and exit grace", () => {
  test("The engine daemon shall check for idleness every 30000 milliseconds", () => {
    writeCodeCertificate(engineIdleCheckCertificate());
    expect(ENGINE_IDLE_CHECK_INTERVAL_MS).toBe(30000);
  });

  test("The engine shall give Prolog 1000 milliseconds to exit", () => {
    writeCodeCertificate(engineExitGraceCertificate());
    expect(ENGINE_PROLOG_EXIT_GRACE_MS).toBe(1000);
  });
});
