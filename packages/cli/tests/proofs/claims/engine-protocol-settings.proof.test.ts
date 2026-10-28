import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  ENGINE_IDLE_TIMEOUT_MS,
  ENGINE_PROTOCOL_VERSION,
} from "../../../src/engine.js";

// implements REQ-engine-protocol-settings

/**
 * The protocol version of the Kibi engine daemon and how long it waits idle. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** The engine protocol version shall be 1. */
export function engineProtocolVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-engine-protocol-version",
    variable: "protocol_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: ENGINE_PROTOCOL_VERSION }],
    claim: { operator: "eq", value: 1 },
  });
}

/** The engine daemon shall stop after 600000 milliseconds idle. */
export function engineIdleTimeoutCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-engine-idle-timeout",
    variable: "idle_timeout_ms",
    valueType: "int",
    assumptions: [{ operator: "eq", value: ENGINE_IDLE_TIMEOUT_MS }],
    claim: { operator: "eq", value: 600000 },
  });
}

describe("Engine protocol version and idle timeout", () => {
  test("The engine protocol version shall be 1", () => {
    writeCodeCertificate(engineProtocolVersionCertificate());
    expect(ENGINE_PROTOCOL_VERSION).toBe(1);
  });

  test("The engine daemon shall stop after 600000 milliseconds idle", () => {
    writeCodeCertificate(engineIdleTimeoutCertificate());
    expect(ENGINE_IDLE_TIMEOUT_MS).toBe(600000);
  });
});
