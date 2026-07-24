import {
  EXTERNAL_ROOT,
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
  type VerifierLock,
  VerifierLockSchema,
} from "./preflight-contracts";
import { parseLock } from "./preflight-io";

export type HostPreflightOptions = Readonly<{
  sandboxLock: string;
  providerLock: string;
  verifierLock: string;
  fixtureRoot?: string;
}>;

export type LoadedLocks = Readonly<{
  sandbox: SandboxLock;
  provider: ProviderLock;
  verifier: VerifierLock;
  digests: PreflightReceipt["lockDigests"];
}>;

export type CheckState = {
  readonly passed: string[];
  readonly reasons: PreflightReason[];
};

export class PreflightNoGo extends Error {
  readonly name = "PreflightNoGo";
  constructor(readonly receipt: PreflightReceipt) {
    super(receipt.code);
  }
}

export async function loadLocks(
  options: HostPreflightOptions,
): Promise<LoadedLocks> {
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

export function receipt(
  input: Readonly<{
    status: "qualified" | "no-go";
    code: PreflightReceipt["code"];
    locks?: LoadedLocks;
    state?: CheckState;
    probe?: Readonly<{ payload: HostProbe; signature: string }>;
  }>,
): PreflightReceipt {
  const identities =
    input.locks === undefined
      ? []
      : Object.values(input.locks.provider.identities).map(
          (identity) => `${identity.name}:${identity.uid}`,
        );
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
    expected: {
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
        input.locks === undefined
          ? {}
          : {
              publisherKey: input.locks.verifier.publisherKeyDigest,
              externalBundleLock: input.locks.verifier.externalBundleLockDigest,
              protocols: input.locks.verifier.protocolDigests,
              pinnedCa: input.locks.verifier.pinnedCa.digest,
              tools: input.locks.sandbox.tools,
            },
      systemdSocketActivation: true,
    },
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
