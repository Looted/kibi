import { generateKeyPairSync, sign } from "node:crypto";
import type { KeyObject } from "node:crypto";
import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export { invokePreflight, updateProbe } from "./preflight-fixture-runtime";

export type HostProbe = Readonly<{
  platform: "linux" | "darwin";
  identities: Readonly<{
    provider: Readonly<{ name: "kibi-skillopt-provider"; uid: number }>;
    evaluator: Readonly<{ name: "kibi-skillopt-evaluator"; uid: number }>;
    verifier: Readonly<{ name: "kibi-skillopt-verifier"; uid: number }>;
  }>;
  systemdSocketActivation: boolean;
  peerUidMatches: boolean;
  pidfd: boolean;
  namespaces: Readonly<{
    user: boolean;
    mount: boolean;
    pid: boolean;
    network: boolean;
  }>;
  yamaPtraceScope: 3;
  dumpable: false;
  protectedProc: boolean;
  procReadable: boolean;
  serviceKeysReadable: boolean;
  subordinateUids: boolean;
  fdInventory: readonly [
    "control-socket",
    "service-pidfd",
    "sealed-authorization",
    "sealed-snapshot-artifact",
  ];
  authorizationSealed: boolean;
  snapshotSealed: boolean;
  pinnedCaDigest: string;
  toolDigests: Readonly<Record<string, string>>;
  privilegeDropped: boolean;
  veth: boolean;
  nftDefaultDrop: boolean;
}>;

export type PreflightFixture = Readonly<{
  root: string;
  externalRoot: string;
  artifactRoot: string;
  output: string;
  sentinel: string;
  sandboxLock: string;
  providerLock: string;
  verifierLock: string;
  probePath: string;
  privateKey: KeyObject;
  probe: HostProbe;
}>;

function digest(data: string | Buffer): string {
  return new Bun.CryptoHasher("sha256").update(data).digest("hex");
}

async function writeJson(
  path: string,
  value: unknown,
  mode = 0o600,
): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode });
}

function signed<T>(
  payload: T,
  privateKey: PreflightFixture["privateKey"],
): Readonly<{ payload: T; signature: string }> {
  return {
    payload,
    signature: sign(
      null,
      Buffer.from(JSON.stringify(payload)),
      privateKey,
    ).toString("base64"),
  };
}

export async function createPreflightFixture(): Promise<PreflightFixture> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-host-preflight-"));
  const externalRoot = join(root, "etc", "kibi-skillopt");
  const protocolRoot = join(externalRoot, "protocol-v1");
  const lockRoot = join(root, "locks");
  const artifactRoot = join(root, "artifacts");
  const toolRoot = join(root, "host-tools");
  await Promise.all([
    mkdir(protocolRoot, { recursive: true }),
    mkdir(lockRoot, { recursive: true }),
    mkdir(artifactRoot, { recursive: true }),
    mkdir(toolRoot, { recursive: true }),
  ]);

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicPem = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const ca = "fixture-ca-v1\n";
  const protocols = {
    "authorization.schema.json":
      '{"type":"object","title":"authorization-v1"}\n',
    "preflight.schema.json": '{"type":"object","title":"preflight-v1"}\n',
    "verdict.schema.json": '{"type":"object","title":"verdict-v1"}\n',
  } as const;
  const tools = {
    "/usr/bin/bwrap": "bubblewrap-fixture-v1\n",
    "/usr/bin/systemctl": "systemctl-fixture-v1\n",
    "/usr/sbin/ip": "iproute-fixture-v1\n",
    "/usr/sbin/nft": "nftables-fixture-v1\n",
  } as const;
  await Promise.all([
    writeFile(join(externalRoot, "publisher.ed25519.pub"), publicPem, {
      mode: 0o444,
    }),
    writeFile(join(externalRoot, "provider-ca.pem"), ca, { mode: 0o444 }),
    ...Object.entries(protocols).map(([name, body]) =>
      writeFile(join(protocolRoot, name), body, { mode: 0o444 }),
    ),
    ...Object.entries(tools).map(([path, body]) => {
      const fixturePath = join(toolRoot, path.slice(1).replaceAll("/", "__"));
      return writeFile(fixturePath, body, { mode: 0o555 });
    }),
  ]);

  const protocolDigests = Object.fromEntries(
    Object.entries(protocols).map(([name, body]) => [
      `protocol-v1/${name}`,
      digest(body),
    ]),
  );
  const toolDigests = Object.fromEntries(
    Object.entries(tools).map(([path, body]) => [path, digest(body)]),
  );
  const bundlePayload = {
    bundleVersion: "kibi-skillopt-trust-v1",
    publisherKeyDigest: digest(publicPem),
    protocolDigests,
    pinnedCa: {
      path: "/etc/kibi-skillopt/provider-ca.pem",
      digest: digest(ca),
    },
    launcher: "/usr/libexec/kibi-skillopt-verifier-launch",
  } as const;
  const externalLock = signed(bundlePayload, privateKey);
  const externalLockText = `${JSON.stringify(externalLock, null, 2)}\n`;
  await writeFile(
    join(externalRoot, "verifier-bundle.lock"),
    externalLockText,
    { mode: 0o444 },
  );

  const sandboxLock = join(lockRoot, "sandbox-toolchain-lock.json");
  const providerLock = join(lockRoot, "provider-policy-lock.json");
  const verifierLock = join(lockRoot, "verifier-bundle-lock.json");
  await Promise.all([
    writeJson(sandboxLock, {
      schemaVersion: "1.0.0",
      kind: "kibi-skillopt-sandbox-toolchain-lock",
      platform: "linux",
      tools: toolDigests,
      requiredPrimitives: [
        "user-namespace",
        "mount-namespace",
        "pid-namespace",
        "network-namespace",
        "pidfd",
        "memfd-sealing",
        "veth",
        "nft-default-drop",
      ],
    }),
    writeJson(providerLock, {
      schemaVersion: "1.0.0",
      kind: "kibi-skillopt-provider-policy-lock",
      launcher: "/usr/libexec/kibi-skillopt-verifier-launch",
      installerCommand:
        "sudo /usr/libexec/kibi-skillopt-installer install --bundle <signed-bundle> --version kibi-skillopt-trust-v1",
      systemdSocketActivation: true,
      identities: {
        provider: { name: "kibi-skillopt-provider", uid: 61101 },
        evaluator: { name: "kibi-skillopt-evaluator", uid: 61102 },
        verifier: { name: "kibi-skillopt-verifier", uid: 61103 },
      },
      fdInventory: [
        "control-socket",
        "service-pidfd",
        "sealed-authorization",
        "sealed-snapshot-artifact",
      ],
      stores: [
        "/var/lib/kibi-skillopt/ledger",
        "/var/lib/kibi-skillopt/evaluator",
        "/var/lib/kibi-skillopt/verdict",
      ],
    }),
    writeJson(verifierLock, {
      schemaVersion: "1.0.0",
      kind: "kibi-skillopt-verifier-bundle-lock",
      bundleVersion: "kibi-skillopt-trust-v1",
      publisherKeyDigest: digest(publicPem),
      externalBundleLockDigest: digest(externalLockText),
      protocolDigests,
      pinnedCa: bundlePayload.pinnedCa,
    }),
  ]);

  const probe: HostProbe = {
    platform: "linux",
    identities: {
      provider: { name: "kibi-skillopt-provider", uid: 61101 },
      evaluator: { name: "kibi-skillopt-evaluator", uid: 61102 },
      verifier: { name: "kibi-skillopt-verifier", uid: 61103 },
    },
    systemdSocketActivation: true,
    peerUidMatches: true,
    pidfd: true,
    namespaces: { user: true, mount: true, pid: true, network: true },
    yamaPtraceScope: 3,
    dumpable: false,
    protectedProc: true,
    procReadable: false,
    serviceKeysReadable: false,
    subordinateUids: true,
    fdInventory: [
      "control-socket",
      "service-pidfd",
      "sealed-authorization",
      "sealed-snapshot-artifact",
    ],
    authorizationSealed: true,
    snapshotSealed: true,
    pinnedCaDigest: digest(ca),
    toolDigests,
    privilegeDropped: true,
    veth: true,
    nftDefaultDrop: true,
  };
  const probePath = join(externalRoot, "fixture-preflight.json");
  await writeJson(probePath, signed(probe, privateKey), 0o444);
  await Promise.all([chmod(externalRoot, 0o755), chmod(protocolRoot, 0o755)]);
  return {
    root,
    externalRoot,
    artifactRoot,
    output: join(artifactRoot, "preflight.json"),
    sentinel: join(root, "runtime-sentinel.log"),
    sandboxLock,
    providerLock,
    verifierLock,
    probePath,
    privateKey,
    probe,
  };
}
