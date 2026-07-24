import { createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ZodError } from "zod";
import {
  EXTERNAL_ROOT,
  ExternalBundleSchema,
  FD_INVENTORY,
  type HostProbe,
  INSTALLER_COMMAND,
  LAUNCHER,
  type PreflightReason,
  type PreflightReceipt,
  type ProviderLock,
  ProviderLockSchema,
  type SandboxLock,
  SandboxLockSchema,
  SignedHostProbeSchema,
  type VerifierLock,
  VerifierLockSchema,
} from "./preflight-contracts";
import {
  PreflightInputError,
  digest,
  parseLock,
  readNoFollow,
  validateTrustDirectory,
} from "./preflight-io";

export type HostPreflightOptions = Readonly<{
  sandboxLock: string;
  providerLock: string;
  verifierLock: string;
  fixtureRoot?: string;
}>;

type LoadedLocks = Readonly<{
  sandbox: SandboxLock;
  provider: ProviderLock;
  verifier: VerifierLock;
  digests: PreflightReceipt["lockDigests"];
}>;

type CheckState = {
  readonly passed: string[];
  readonly reasons: PreflightReason[];
};

export class PreflightNoGo extends Error {
  readonly name = "PreflightNoGo";
  constructor(readonly receipt: PreflightReceipt) {
    super(receipt.code);
  }
}

async function loadLocks(options: HostPreflightOptions): Promise<LoadedLocks> {
  const [sandbox, provider, verifier] = await Promise.all([
    parseLock(options.sandboxLock, SandboxLockSchema),
    parseLock(options.providerLock, ProviderLockSchema),
    parseLock(options.verifierLock, VerifierLockSchema),
  ]);
  return {
    sandbox: sandbox.value,
    provider: provider.value,
    verifier: verifier.value,
    digests: {
      sandbox: sandbox.digest,
      provider: provider.digest,
      verifier: verifier.digest,
    },
  };
}

function expected(locks?: LoadedLocks): PreflightReceipt["expected"] {
  const identities =
    locks === undefined
      ? []
      : Object.values(locks.provider.identities).map(
          (identity) => `${identity.name}:${identity.uid}`,
        );
  return {
    externalRoot: EXTERNAL_ROOT,
    launcher: LAUNCHER,
    installerCommand: INSTALLER_COMMAND,
    paths: [
      "/etc/kibi-skillopt/publisher.ed25519.pub",
      "/etc/kibi-skillopt/verifier-bundle.lock",
      "/etc/kibi-skillopt/protocol-v1/authorization.schema.json",
      "/etc/kibi-skillopt/protocol-v1/preflight.schema.json",
      "/etc/kibi-skillopt/protocol-v1/verdict.schema.json",
      "/var/lib/kibi-skillopt/ledger",
      "/var/lib/kibi-skillopt/evaluator",
      "/var/lib/kibi-skillopt/verdict",
    ],
    identities,
    fdInventory: [...FD_INVENTORY],
    digests:
      locks === undefined
        ? {}
        : {
            publisherKey: locks.verifier.publisherKeyDigest,
            externalBundleLock: locks.verifier.externalBundleLockDigest,
            protocols: locks.verifier.protocolDigests,
            pinnedCa: locks.verifier.pinnedCa.digest,
            tools: locks.sandbox.tools,
          },
    systemdSocketActivation: true,
  };
}

function receipt(
  input: Readonly<{
    status: "qualified" | "no-go";
    code: PreflightReceipt["code"];
    locks?: LoadedLocks;
    state?: CheckState;
    probe?: Readonly<{ payload: HostProbe; signature: string }>;
  }>,
): PreflightReceipt {
  return {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-host-preflight",
    status: input.status,
    code: input.code,
    reasons: input.state?.reasons ?? [],
    lockDigests: input.locks?.digests ?? {
      sandbox: "",
      provider: "",
      verifier: "",
    },
    expected: expected(input.locks),
    checks: (input.state?.passed ?? []).map((name) => ({
      name,
      status: "pass" as const,
    })),
    verifierAttestation: input.probe ?? {
      payload: null,
      signature: "unavailable",
    },
    paidModelCalls: 0,
    runtimeAuthorized: false,
  };
}

function check(
  state: CheckState,
  name: string,
  valid: boolean,
  expectedValue: unknown,
  observed: unknown,
): void {
  if (valid) state.passed.push(name);
  else state.reasons.push({ check: name, expected: expectedValue, observed });
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function runLauncher(): Promise<string> {
  const child = Bun.spawn([LAUNCHER, "preflight", "--format", "json"], {
    env: {},
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 30_000);
  try {
    const [stdout, , exitCode] = await Promise.all([
      readBounded(child.stdout, 1_048_576),
      readBounded(child.stderr, 1_048_576),
      child.exited,
    ]);
    if (exitCode !== 0) {
      throw new PreflightInputError("launcher-probe", "PREFLIGHT_NO_GO");
    }
    return stdout;
  } finally {
    clearTimeout(timeout);
  }
}

async function readBounded(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) return Buffer.concat(chunks).toString("utf8");
      size += result.value.byteLength;
      if (size > limit)
        throw new PreflightInputError(
          "launcher-output-bounded",
          "PREFLIGHT_NO_GO",
        );
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
}

function externalPath(options: HostPreflightOptions, suffix: string): string {
  return options.fixtureRoot === undefined
    ? join(EXTERNAL_ROOT, suffix)
    : join(options.fixtureRoot, "etc", "kibi-skillopt", suffix);
}

async function validateTrustRoot(options: HostPreflightOptions): Promise<void> {
  const fixtureRoot = options.fixtureRoot;
  const expectedUid =
    fixtureRoot === undefined ? 0 : (process.getuid?.() ?? -1);
  const paths =
    fixtureRoot === undefined
      ? ["/", "/etc", EXTERNAL_ROOT, join(EXTERNAL_ROOT, "protocol-v1")]
      : [
          fixtureRoot,
          join(fixtureRoot, "etc"),
          join(fixtureRoot, "etc", "kibi-skillopt"),
          join(fixtureRoot, "etc", "kibi-skillopt", "protocol-v1"),
        ];
  for (const path of paths) await validateTrustDirectory(path, expectedUid);
}

async function loadAttestation(options: HostPreflightOptions): Promise<string> {
  if (options.fixtureRoot !== undefined)
    return readFile(externalPath(options, "fixture-preflight.json"), "utf8");
  if (process.env.KIBI_SKILLOPT_PREFLIGHT_SENTINEL !== undefined) {
    await Bun.write(
      process.env.KIBI_SKILLOPT_PREFLIGHT_SENTINEL,
      "launcher-spawned\n",
    );
  }
  return runLauncher();
}

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

    const attestationText = await loadAttestation(options);
    const attestation = SignedHostProbeSchema.parse(
      JSON.parse(attestationText),
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

function evaluateHost(
  state: CheckState,
  locks: LoadedLocks,
  host: HostProbe,
): void {
  check(state, "platform", host.platform === "linux", "linux", host.platform);
  check(
    state,
    "launcher",
    locks.provider.launcher === LAUNCHER,
    LAUNCHER,
    locks.provider.launcher,
  );
  check(
    state,
    "service-identities",
    sameJson(host.identities, locks.provider.identities),
    locks.provider.identities,
    host.identities,
  );
  check(
    state,
    "systemd-socket-activation",
    host.systemdSocketActivation,
    true,
    host.systemdSocketActivation,
  );
  check(
    state,
    "peer-credentials",
    host.peerUidMatches,
    true,
    host.peerUidMatches,
  );
  check(state, "pidfd", host.pidfd, true, host.pidfd);
  check(
    state,
    "namespaces",
    Object.values(host.namespaces).every(Boolean),
    "all enabled",
    host.namespaces,
  );
  check(state, "yama", host.yamaPtraceScope === 3, 3, host.yamaPtraceScope);
  check(state, "dumpability", host.dumpable === false, false, host.dumpable);
  check(
    state,
    "proc-isolation",
    host.protectedProc && !host.procReadable,
    "protected and unreadable",
    { protected: host.protectedProc, readable: host.procReadable },
  );
  check(
    state,
    "service-key-isolation",
    !host.serviceKeysReadable,
    false,
    host.serviceKeysReadable,
  );
  check(
    state,
    "subordinate-uids",
    host.subordinateUids,
    true,
    host.subordinateUids,
  );
  check(
    state,
    "fd-inventory",
    sameJson(host.fdInventory, locks.provider.fdInventory),
    locks.provider.fdInventory,
    host.fdInventory,
  );
  check(
    state,
    "memfd-sealing",
    host.authorizationSealed && host.snapshotSealed,
    "authorization and snapshot sealed",
    { authorization: host.authorizationSealed, snapshot: host.snapshotSealed },
  );
  check(
    state,
    "pinned-ca",
    host.pinnedCaDigest === locks.verifier.pinnedCa.digest,
    locks.verifier.pinnedCa.digest,
    host.pinnedCaDigest,
  );
  check(
    state,
    "tool-digests",
    sameJson(host.toolDigests, locks.sandbox.tools),
    locks.sandbox.tools,
    host.toolDigests,
  );
  check(
    state,
    "privilege-drop",
    host.privilegeDropped,
    true,
    host.privilegeDropped,
  );
  check(state, "veth", host.veth, true, host.veth);
  check(
    state,
    "nft-default-drop",
    host.nftDefaultDrop,
    true,
    host.nftDefaultDrop,
  );
}
