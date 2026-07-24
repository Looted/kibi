import { createPublicKey, verify } from "node:crypto";
import { ZodError } from "zod";
import {
  ExternalBundleSchema,
  type PreflightReceipt,
  SignedHostProbeSchema,
} from "./preflight-contracts";
import { check, evaluateHost, sameJson } from "./preflight-host-checks";
import {
  type CheckState,
  type HostPreflightOptions,
  type LoadedLocks,
  PreflightNoGo,
  loadLocks,
  receipt,
} from "./preflight-host-model";
import {
  externalPath,
  loadAttestation,
  validateTrustRoot,
} from "./preflight-host-runtime";
import { PreflightInputError, digest, readNoFollow } from "./preflight-io";

export { PreflightNoGo } from "./preflight-host-model";
export type { HostPreflightOptions } from "./preflight-host-model";

// implements REQ-skillopt-codex-optimization
export async function qualifySkillOptHost(
  options: HostPreflightOptions,
): Promise<PreflightReceipt> {
  let locks: LoadedLocks;
  try {
    locks = await loadLocks(options);
  } catch (error) {
    if (error instanceof PreflightInputError)
      throw new PreflightNoGo(
        receipt({
          status: "no-go",
          code: error.code,
          state: {
            passed: [],
            reasons: [
              { check: error.check, expected: "valid checked-in lock" },
            ],
          },
        }),
      );
    throw error;
  }
  const state: CheckState = { passed: [], reasons: [] };
  try {
    await validateTrustRoot(options);
    const publisher = await readNoFollow(
      externalPath(options, "publisher.ed25519.pub"),
      "external",
      true,
    );
    const externalLockFile = await readNoFollow(
      externalPath(options, "verifier-bundle.lock"),
      "external",
      true,
    );
    check(
      state,
      "external-root-ownership",
      options.fixtureRoot !== undefined ||
        (publisher.uid === 0 && externalLockFile.uid === 0),
      0,
      [publisher.uid, externalLockFile.uid],
    );
    check(
      state,
      "publisher-key-digest",
      digest(publisher.text) === locks.verifier.publisherKeyDigest,
      locks.verifier.publisherKeyDigest,
      digest(publisher.text),
    );
    const externalLock = ExternalBundleSchema.parse(
      JSON.parse(externalLockFile.text),
    );
    let signatureValid = false;
    try {
      signatureValid = verify(
        null,
        Buffer.from(JSON.stringify(externalLock.payload)),
        createPublicKey(publisher.text),
        Buffer.from(externalLock.signature, "base64"),
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
    check(state, "bundle-signature", signatureValid, true, signatureValid);
    check(
      state,
      "external-bundle-digest",
      digest(externalLockFile.text) === locks.verifier.externalBundleLockDigest,
      locks.verifier.externalBundleLockDigest,
      digest(externalLockFile.text),
    );
    check(
      state,
      "bundle-contract",
      sameJson(
        externalLock.payload.protocolDigests,
        locks.verifier.protocolDigests,
      ),
      locks.verifier.protocolDigests,
      externalLock.payload.protocolDigests,
    );
    const protocolResults = await Promise.all(
      Object.entries(locks.verifier.protocolDigests).map(
        async ([path, expectedDigest]) => {
          const file = await readNoFollow(
            externalPath(options, path),
            "external",
            true,
          );
          return {
            path,
            expectedDigest,
            observed: digest(file.text),
            uid: file.uid,
          };
        },
      ),
    );
    check(
      state,
      "protocol-digests",
      protocolResults.every((item) => item.expectedDigest === item.observed),
      locks.verifier.protocolDigests,
      Object.fromEntries(
        protocolResults.map((item) => [item.path, item.observed]),
      ),
    );
    check(
      state,
      "protocol-ownership",
      options.fixtureRoot !== undefined ||
        protocolResults.every((item) => item.uid === 0),
      0,
      protocolResults.map((item) => item.uid),
    );
    const ca = await readNoFollow(
      externalPath(options, "provider-ca.pem"),
      "external",
      true,
    );
    check(
      state,
      "pinned-ca-file",
      digest(ca.text) === locks.verifier.pinnedCa.digest,
      locks.verifier.pinnedCa.digest,
      digest(ca.text),
    );
    const attestation = SignedHostProbeSchema.parse(
      JSON.parse(await loadAttestation(options)),
    );
    const attestationValid = verify(
      null,
      Buffer.from(JSON.stringify(attestation.payload)),
      createPublicKey(publisher.text),
      Buffer.from(attestation.signature, "base64"),
    );
    check(
      state,
      "attestation-signature",
      attestationValid,
      true,
      attestationValid,
    );
    evaluateHost(state, locks, attestation.payload);
    const stableExternalLock = await readNoFollow(
      externalPath(options, "verifier-bundle.lock"),
      "external",
      true,
    );
    const stableProtocols = await Promise.all(
      Object.keys(locks.verifier.protocolDigests).map(async (path) =>
        digest(
          (await readNoFollow(externalPath(options, path), "external", true))
            .text,
        ),
      ),
    );
    const stableCa = await readNoFollow(
      externalPath(options, "provider-ca.pem"),
      "external",
      true,
    );
    check(
      state,
      "external-state-stable",
      digest(stableExternalLock.text) === digest(externalLockFile.text) &&
        sameJson(
          stableProtocols,
          protocolResults.map((item) => item.observed),
        ) &&
        digest(stableCa.text) === digest(ca.text),
      "unchanged since validation",
      "re-read before receipt",
    );
    const code = state.reasons.length === 0 ? "OK" : "PREFLIGHT_NO_GO";
    const result = receipt({
      status: code === "OK" ? "qualified" : "no-go",
      code,
      locks,
      state,
      probe: attestation,
    });
    if (result.status === "no-go") throw new PreflightNoGo(result);
    if (
      options.fixtureRoot !== undefined &&
      process.env.KIBI_SKILLOPT_TEST_SPAWN_SENTINEL !== undefined
    )
      await Bun.write(
        process.env.KIBI_SKILLOPT_TEST_SPAWN_SENTINEL,
        "spawn-boundary\n",
      );
    return result;
  } catch (error) {
    if (error instanceof PreflightNoGo) throw error;
    if (error instanceof PreflightInputError)
      state.reasons.push({
        check: error.check,
        expected: "immutable operator prerequisite",
      });
    else if (
      error instanceof SyntaxError ||
      error instanceof TypeError ||
      error instanceof ZodError
    )
      state.reasons.push({
        check: "bundle-signature",
        expected: "valid signed bundle",
      });
    else throw error;
    const code =
      error instanceof PreflightInputError ? error.code : "PREFLIGHT_NO_GO";
    throw new PreflightNoGo(receipt({ status: "no-go", code, locks, state }));
  }
}
