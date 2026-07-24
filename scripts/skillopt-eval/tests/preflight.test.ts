import { afterEach, describe, expect, test } from "bun:test";
import {
  chmod,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { PreflightNoGo, qualifySkillOptHost } from "../preflight";
import {
  type HostProbe,
  createPreflightFixture,
  invokePreflight,
  updateProbe,
} from "./preflight-fixture";

const roots: string[] = [];
const ResultSchema = z.object({
  status: z.enum(["qualified", "no-go"]),
  code: z.string(),
  reasons: z.array(
    z.object({ check: z.string(), expected: z.unknown() }).loose(),
  ),
  lockDigests: z.object({
    sandbox: z.string(),
    provider: z.string(),
    verifier: z.string(),
  }),
  expected: z.object({
    launcher: z.literal("/usr/libexec/kibi-skillopt-verifier-launch"),
    installerCommand: z.literal(
      "sudo /usr/libexec/kibi-skillopt-installer install --bundle <signed-bundle> --version kibi-skillopt-trust-v1",
    ),
    identities: z.array(z.string()),
    fdInventory: z.array(z.string()),
  }),
  checks: z.array(z.object({ name: z.string(), status: z.literal("pass") })),
  verifierAttestation: z.object({ signature: z.string().min(1) }),
  paidModelCalls: z.literal(0),
  runtimeAuthorized: z.literal(false),
});

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

describe("SkillOpt trust-plane preflight", () => {
  test("preflight rejects a group or world writable external trust root", async () => {
    // Given
    const cases = await Promise.all(
      [
        (fixture: Awaited<ReturnType<typeof createPreflightFixture>>) =>
          fixture.root,
        (fixture: Awaited<ReturnType<typeof createPreflightFixture>>) =>
          join(fixture.root, "etc"),
        (fixture: Awaited<ReturnType<typeof createPreflightFixture>>) =>
          fixture.externalRoot,
        (fixture: Awaited<ReturnType<typeof createPreflightFixture>>) =>
          join(fixture.externalRoot, "protocol-v1"),
      ].map(async (pathFor) => {
        const fixture = await createPreflightFixture();
        roots.push(fixture.root);
        await chmod(pathFor(fixture), 0o777);
        return fixture;
      }),
    );

    // When
    const results = await Promise.all(
      cases.map((fixture) => invokePreflight(fixture)),
    );

    // Then
    for (const result of results) {
      expect(result.exitCode).not.toBe(0);
      expect(
        ResultSchema.parse(result.output).reasons.map((reason) => reason.check),
      ).toContain("external-root-mode");
    }
  });

  test("qualifySkillOptHost throws typed PreflightNoGo for rejected hosts", async () => {
    // Given
    const fixture = await createPreflightFixture();
    roots.push(fixture.root);
    await updateProbe(fixture, (probe) => ({ ...probe, platform: "darwin" }));
    let captured: unknown;

    // When
    try {
      await qualifySkillOptHost({
        sandboxLock: fixture.sandboxLock,
        providerLock: fixture.providerLock,
        verifierLock: fixture.verifierLock,
        fixtureRoot: fixture.root,
      });
    } catch (error) {
      captured = error;
    }

    // Then
    expect(captured).toBeInstanceOf(PreflightNoGo);
    if (!(captured instanceof PreflightNoGo)) return;
    expect(captured.receipt.status).toBe("no-go");
    expect(captured.receipt.reasons.map((reason) => reason.check)).toContain(
      "platform",
    );
  });

  test("preflight validates repository-relative locks before external handoff", async () => {
    // Given
    const fixture = await createPreflightFixture();
    roots.push(fixture.root);
    const output = join(fixture.root, "real-preflight.json");

    // When
    const child = Bun.spawn([
      "bun",
      "run",
      join(import.meta.dir, "..", "preflight.ts"),
      "--sandbox-lock",
      "tools/skillopt/sandbox-toolchain-lock.json",
      "--provider-lock",
      "tools/skillopt/provider-policy-lock.json",
      "--verifier-lock",
      "tools/skillopt/verifier-bundle-lock.json",
      "--artifact-root",
      fixture.artifactRoot,
      "--output",
      output,
    ]);
    const exitCode = await child.exited;

    // Then
    expect(exitCode).not.toBe(0);
    const receipt = ResultSchema.parse(await Bun.file(output).json());
    expect(receipt.code).toBe("EXTERNAL_PREREQUISITE_MISSING");
    expect(
      Object.values(receipt.lockDigests).every((value) => value.length === 64),
    ).toBe(true);
  });

  test("preflight accepts a receipt beside the artifact root", async () => {
    // Given
    const fixture = await createPreflightFixture();
    roots.push(fixture.root);
    const output = join(fixture.root, "preflight.json");

    // When
    const result = await invokePreflight(fixture, { output });

    // Then
    expect(result.exitCode).toBe(0);
    expect(ResultSchema.parse(result.output).status).toBe("qualified");
  });

  test("preflight accepts qualified host", async () => {
    // Given
    const fixture = await createPreflightFixture();
    roots.push(fixture.root);

    // When
    const result = await invokePreflight(fixture);

    // Then
    expect(result.exitCode).toBe(0);
    const receipt = ResultSchema.parse(result.output);
    expect(receipt.status).toBe("qualified");
    expect(receipt.code).toBe("OK");
    expect(
      Object.values(receipt.lockDigests).every((digest) =>
        /^[a-f0-9]{64}$/.test(digest),
      ),
    ).toBe(true);
    expect(receipt.checks.length).toBeGreaterThanOrEqual(18);
    expect(receipt.expected.identities).toEqual([
      "kibi-skillopt-provider:61101",
      "kibi-skillopt-evaluator:61102",
      "kibi-skillopt-verifier:61103",
    ]);
  });

  test("preflight rejects every unsupported primitive before spawn", async () => {
    // Given
    const cases: readonly Readonly<{
      name: string;
      check: string;
      mutate: (
        fixture: Awaited<ReturnType<typeof createPreflightFixture>>,
      ) => Promise<void>;
    }>[] = [
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
          updateProbe(fixture, (probe) => ({
            ...probe,
            peerUidMatches: false,
          })),
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
          updateProbe(fixture, (probe) => ({
            ...probe,
            snapshotSealed: false,
          })),
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
          updateProbe(fixture, (probe) => ({
            ...probe,
            nftDefaultDrop: false,
          })),
      },
    ];

    // When
    const results = [];
    for (const testCase of cases) {
      const fixture = await createPreflightFixture();
      roots.push(fixture.root);
      await testCase.mutate(fixture);
      results.push({
        testCase,
        fixture,
        result: await invokePreflight(fixture),
      });
    }

    // Then
    for (const { testCase, fixture, result } of results) {
      expect(result.exitCode, testCase.name).not.toBe(0);
      const receipt = ResultSchema.parse(result.output);
      expect(receipt.status, testCase.name).toBe("no-go");
      expect(
        receipt.reasons.map((reason) => reason.check),
        testCase.name,
      ).toContain(testCase.check);
      const sentinel = await readFile(fixture.sentinel, "utf8").catch(() => "");
      expect(sentinel, testCase.name).toBe("");
    }
  });

  test("preflight rejects malformed missing traversal and symlink lock inputs", async () => {
    // Given
    const fixtures = await Promise.all([
      createPreflightFixture(),
      createPreflightFixture(),
      createPreflightFixture(),
      createPreflightFixture(),
    ]);
    roots.push(...fixtures.map((fixture) => fixture.root));
    await writeFile(fixtures[0].sandboxLock, "{", "utf8");
    await unlink(fixtures[1].providerLock);
    const symlinkLock = join(fixtures[3].root, "locks", "sandbox-symlink.json");
    await symlink(fixtures[3].sandboxLock, symlinkLock);

    // When
    const results = await Promise.all([
      invokePreflight(fixtures[0]),
      invokePreflight(fixtures[1]),
      invokePreflight(fixtures[2], {
        sandboxLock: `${fixtures[2].root}/locks/../locks/sandbox-toolchain-lock.json`,
      }),
      invokePreflight(fixtures[3], { sandboxLock: symlinkLock }),
    ]);

    // Then
    expect(results.every((result) => result.exitCode !== 0)).toBe(true);
    expect(
      results.map((result) => ResultSchema.parse(result.output).code),
    ).toEqual(["LOCK_INVALID", "LOCK_INVALID", "LOCK_INVALID", "LOCK_INVALID"]);
  });

  test("preflight rejects stale state changed after qualification", async () => {
    // Given
    const fixture = await createPreflightFixture();
    roots.push(fixture.root);
    const staleProbe: HostProbe = {
      ...fixture.probe,
      toolDigests: {
        ...fixture.probe.toolDigests,
        "/usr/bin/bwrap": "f".repeat(64),
      },
    };
    await updateProbe(fixture, () => staleProbe);

    // When
    const result = await invokePreflight(fixture);

    // Then
    expect(result.exitCode).not.toBe(0);
    expect(
      ResultSchema.parse(result.output).reasons.map((reason) => reason.check),
    ).toContain("tool-digests");
  });
});
