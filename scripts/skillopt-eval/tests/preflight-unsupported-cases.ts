import { chmod, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { updateProbe } from "./preflight-fixture";
import type { createPreflightFixture } from "./preflight-fixture";

type Fixture = Awaited<ReturnType<typeof createPreflightFixture>>;
export type UnsupportedCase = Readonly<{
  name: string;
  check: string;
  mutate: (fixture: Fixture) => Promise<void>;
}>;

export const unsupportedCases: readonly UnsupportedCase[] = [
  {
    name: "unsupported OS",
    check: "platform",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({ ...probe, platform: "darwin" })),
  },
  {
    name: "absent bundle",
    check: "external-bundle-lock",
    mutate: async (fixture) =>
      unlink(join(fixture.externalRoot, "verifier-bundle.lock")),
  },
  {
    name: "writable bundle",
    check: "external-bundle-mode",
    mutate: async (fixture) =>
      chmod(join(fixture.externalRoot, "verifier-bundle.lock"), 0o666),
  },
  {
    name: "UID mismatch",
    check: "service-identities",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({
        ...probe,
        identities: {
          ...probe.identities,
          verifier: { ...probe.identities.verifier, uid: 61101 },
        },
      })),
  },
  {
    name: "pidfd mismatch",
    check: "pidfd",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({ ...probe, pidfd: false })),
  },
  {
    name: "peer mismatch",
    check: "peer-credentials",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({ ...probe, peerUidMatches: false })),
  },
  {
    name: "signature drift",
    check: "bundle-signature",
    mutate: async (fixture) => {
      const path = join(fixture.externalRoot, "verifier-bundle.lock");
      const value = JSON.parse(await readFile(path, "utf8"));
      value.signature = Buffer.from("drift").toString("base64");
      await chmod(path, 0o600);
      await writeFile(path, `${JSON.stringify(value)}\n`);
      await chmod(path, 0o444);
    },
  },
  {
    name: "digest drift",
    check: "protocol-digests",
    mutate: async (fixture) => {
      const path = join(
        fixture.externalRoot,
        "protocol-v1",
        "verdict.schema.json",
      );
      await chmod(path, 0o600);
      await writeFile(path, "{}\n");
      await chmod(path, 0o444);
    },
  },
  {
    name: "CA drift",
    check: "pinned-ca",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({
        ...probe,
        pinnedCaDigest: "0".repeat(64),
      })),
  },
  {
    name: "disabled isolation",
    check: "namespaces",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({
        ...probe,
        namespaces: { ...probe.namespaces, network: false },
      })),
  },
  {
    name: "readable keys",
    check: "service-key-isolation",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({
        ...probe,
        serviceKeysReadable: true,
      })),
  },
  {
    name: "readable proc",
    check: "proc-isolation",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({ ...probe, procReadable: true })),
  },
  {
    name: "missing sealing",
    check: "memfd-sealing",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({ ...probe, snapshotSealed: false })),
  },
  {
    name: "failed veth",
    check: "veth",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({ ...probe, veth: false })),
  },
  {
    name: "failed nft",
    check: "nft-default-drop",
    mutate: async (fixture) =>
      updateProbe(fixture, (probe) => ({ ...probe, nftDefaultDrop: false })),
  },
];
