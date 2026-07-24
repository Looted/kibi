import { z } from "zod";

export const INSTALLER_COMMAND =
  "sudo /usr/libexec/kibi-skillopt-installer install --bundle <signed-bundle> --version kibi-skillopt-trust-v1" as const;
export const LAUNCHER = "/usr/libexec/kibi-skillopt-verifier-launch" as const;
export const EXTERNAL_ROOT = "/etc/kibi-skillopt" as const;
export const FD_INVENTORY = [
  "control-socket",
  "service-pidfd",
  "sealed-authorization",
  "sealed-snapshot-artifact",
] as const;

const DigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const IdentitySchema = z
  .object({ name: z.string().min(1), uid: z.number().int().positive() })
  .strict();

export const SandboxLockSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    kind: z.literal("kibi-skillopt-sandbox-toolchain-lock"),
    platform: z.literal("linux"),
    tools: z.record(z.string().startsWith("/"), DigestSchema),
    requiredPrimitives: z
      .array(
        z.enum([
          "user-namespace",
          "mount-namespace",
          "pid-namespace",
          "network-namespace",
          "pidfd",
          "memfd-sealing",
          "veth",
          "nft-default-drop",
        ]),
      )
      .min(8),
  })
  .strict();

export const ProviderLockSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    kind: z.literal("kibi-skillopt-provider-policy-lock"),
    launcher: z.literal(LAUNCHER),
    installerCommand: z.literal(INSTALLER_COMMAND),
    systemdSocketActivation: z.literal(true),
    identities: z
      .object({
        provider: IdentitySchema.extend({
          name: z.literal("kibi-skillopt-provider"),
        }),
        evaluator: IdentitySchema.extend({
          name: z.literal("kibi-skillopt-evaluator"),
        }),
        verifier: IdentitySchema.extend({
          name: z.literal("kibi-skillopt-verifier"),
        }),
      })
      .strict(),
    fdInventory: z.tuple([
      z.literal("control-socket"),
      z.literal("service-pidfd"),
      z.literal("sealed-authorization"),
      z.literal("sealed-snapshot-artifact"),
    ]),
    stores: z.tuple([
      z.literal("/var/lib/kibi-skillopt/ledger"),
      z.literal("/var/lib/kibi-skillopt/evaluator"),
      z.literal("/var/lib/kibi-skillopt/verdict"),
    ]),
  })
  .strict();

const PinnedCaSchema = z
  .object({
    path: z.literal("/etc/kibi-skillopt/provider-ca.pem"),
    digest: DigestSchema,
  })
  .strict();
export const VerifierLockSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    kind: z.literal("kibi-skillopt-verifier-bundle-lock"),
    bundleVersion: z.literal("kibi-skillopt-trust-v1"),
    publisherKeyDigest: DigestSchema,
    externalBundleLockDigest: DigestSchema,
    protocolDigests: z.record(
      z.string().regex(/^protocol-v1\/[a-z0-9-]+\.schema\.json$/),
      DigestSchema,
    ),
    pinnedCa: PinnedCaSchema,
  })
  .strict();

export const ExternalBundleSchema = z
  .object({
    payload: z
      .object({
        bundleVersion: z.literal("kibi-skillopt-trust-v1"),
        publisherKeyDigest: DigestSchema,
        protocolDigests: z.record(z.string(), DigestSchema),
        pinnedCa: PinnedCaSchema,
        launcher: z.literal(LAUNCHER),
      })
      .strict(),
    signature: z.string().min(1),
  })
  .strict();

export const HostProbeSchema = z
  .object({
    platform: z.enum(["linux", "darwin"]),
    identities: z
      .object({
        provider: IdentitySchema,
        evaluator: IdentitySchema,
        verifier: IdentitySchema,
      })
      .strict(),
    systemdSocketActivation: z.boolean(),
    peerUidMatches: z.boolean(),
    pidfd: z.boolean(),
    namespaces: z
      .object({
        user: z.boolean(),
        mount: z.boolean(),
        pid: z.boolean(),
        network: z.boolean(),
      })
      .strict(),
    yamaPtraceScope: z.number().int(),
    dumpable: z.boolean(),
    protectedProc: z.boolean(),
    procReadable: z.boolean(),
    serviceKeysReadable: z.boolean(),
    subordinateUids: z.boolean(),
    fdInventory: z.array(z.string()),
    authorizationSealed: z.boolean(),
    snapshotSealed: z.boolean(),
    pinnedCaDigest: DigestSchema,
    toolDigests: z.record(z.string(), DigestSchema),
    privilegeDropped: z.boolean(),
    veth: z.boolean(),
    nftDefaultDrop: z.boolean(),
  })
  .strict();

export const SignedHostProbeSchema = z
  .object({ payload: HostProbeSchema, signature: z.string().min(1) })
  .strict();
export type SandboxLock = z.infer<typeof SandboxLockSchema>;
export type ProviderLock = z.infer<typeof ProviderLockSchema>;
export type VerifierLock = z.infer<typeof VerifierLockSchema>;
export type HostProbe = z.infer<typeof HostProbeSchema>;

export type PreflightReason = Readonly<{
  check: string;
  expected: unknown;
  observed?: unknown;
}>;
export type PreflightReceipt = Readonly<{
  schemaVersion: "1.0.0";
  artifactType: "skillopt-host-preflight";
  status: "qualified" | "no-go";
  code:
    | "OK"
    | "EXTERNAL_PREREQUISITE_MISSING"
    | "LOCK_INVALID"
    | "PREFLIGHT_NO_GO";
  reasons: readonly PreflightReason[];
  lockDigests: Readonly<{
    sandbox: string;
    provider: string;
    verifier: string;
  }>;
  expected: Readonly<{
    externalRoot: typeof EXTERNAL_ROOT;
    launcher: typeof LAUNCHER;
    installerCommand: typeof INSTALLER_COMMAND;
    paths: readonly string[];
    identities: readonly string[];
    fdInventory: readonly string[];
    digests: Readonly<{
      publisherKey?: string;
      externalBundleLock?: string;
      protocols?: Readonly<Record<string, string>>;
      pinnedCa?: string;
      tools?: Readonly<Record<string, string>>;
    }>;
    systemdSocketActivation: true;
  }>;
  checks: readonly Readonly<{ name: string; status: "pass" }>[];
  verifierAttestation: Readonly<{
    payload: HostProbe | null;
    signature: string;
  }>;
  paidModelCalls: 0;
  runtimeAuthorized: false;
}>;
