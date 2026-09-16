// implements REQ-skillopt-codex-optimization
import { createPublicKey, verify } from "node:crypto";

export function rethrowIfNotError(error: unknown): void {
  if (!(error instanceof Error)) throw error;
}

export function tryVerifyBundleSignature(
  payload: unknown,
  publisherText: string,
  signature: string,
): boolean {
  try {
    return verify(
      null,
      Buffer.from(JSON.stringify(payload)),
      createPublicKey(publisherText),
      Buffer.from(signature, "base64"),
    );
  } catch (error) {
    rethrowIfNotError(error);
    return false;
  }
}
