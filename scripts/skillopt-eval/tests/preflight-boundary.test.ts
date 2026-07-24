import { afterEach, expect, test } from "bun:test";
import { chmod, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PreflightNoGo, qualifySkillOptHost } from "../preflight";
import {
  type HostProbe,
  createPreflightFixture,
  invokePreflight,
  updateProbe,
} from "./preflight-fixture";
import { ResultSchema } from "./preflight-result";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("preflight rejects group or world writable external trust parents", async () => {
  const paths = [
    (fixture: Awaited<ReturnType<typeof createPreflightFixture>>) =>
      fixture.root,
    (fixture: Awaited<ReturnType<typeof createPreflightFixture>>) =>
      join(fixture.root, "etc"),
    (fixture: Awaited<ReturnType<typeof createPreflightFixture>>) =>
      fixture.externalRoot,
    (fixture: Awaited<ReturnType<typeof createPreflightFixture>>) =>
      join(fixture.externalRoot, "protocol-v1"),
  ];
  const fixtures = await Promise.all(
    paths.map(async (pathFor) => {
      const fixture = await createPreflightFixture();
      roots.push(fixture.root);
      await chmod(pathFor(fixture), 0o777);
      return fixture;
    }),
  );
  const results = await Promise.all(
    fixtures.map((fixture) => invokePreflight(fixture)),
  );
  for (const result of results)
    expect(
      ResultSchema.parse(result.output).reasons.map((reason) => reason.check),
    ).toContain("external-root-mode");
});

test("qualifySkillOptHost throws typed PreflightNoGo for rejected hosts", async () => {
  const fixture = await createPreflightFixture();
  roots.push(fixture.root);
  await updateProbe(fixture, (probe) => ({ ...probe, platform: "darwin" }));
  let captured: unknown;
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
  expect(captured).toBeInstanceOf(PreflightNoGo);
  if (!(captured instanceof PreflightNoGo)) return;
  expect(captured.receipt.status).toBe("no-go");
  expect(captured.receipt.reasons.map((reason) => reason.check)).toContain(
    "platform",
  );
});

test("preflight validates repository-relative locks before external handoff", async () => {
  const fixture = await createPreflightFixture();
  roots.push(fixture.root);
  const output = join(fixture.root, "real-preflight.json");
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
  expect(await child.exited).not.toBe(0);
  const receipt = ResultSchema.parse(await Bun.file(output).json());
  expect(receipt.code).toBe("EXTERNAL_PREREQUISITE_MISSING");
  expect(
    Object.values(receipt.lockDigests).every((value) => value.length === 64),
  ).toBe(true);
});

test("preflight accepts a receipt beside the artifact root", async () => {
  const fixture = await createPreflightFixture();
  roots.push(fixture.root);
  const result = await invokePreflight(fixture, {
    output: join(fixture.root, "preflight.json"),
  });
  expect(result.exitCode).toBe(0);
  expect(ResultSchema.parse(result.output).status).toBe("qualified");
});

test("preflight rejects malformed missing traversal and symlink lock inputs", async () => {
  const fixtures = await Promise.all(
    Array.from({ length: 4 }, () => createPreflightFixture()),
  );
  roots.push(...fixtures.map((fixture) => fixture.root));
  await writeFile(fixtures[0].sandboxLock, "{", "utf8");
  await unlink(fixtures[1].providerLock);
  const symlinkLock = join(fixtures[3].root, "locks", "sandbox-symlink.json");
  await symlink(fixtures[3].sandboxLock, symlinkLock);
  const results = await Promise.all([
    invokePreflight(fixtures[0]),
    invokePreflight(fixtures[1]),
    invokePreflight(fixtures[2], {
      sandboxLock: `${fixtures[2].root}/locks/../locks/sandbox-toolchain-lock.json`,
    }),
    invokePreflight(fixtures[3], { sandboxLock: symlinkLock }),
  ]);
  expect(results.every((result) => result.exitCode !== 0)).toBe(true);
  expect(
    results.map((result) => ResultSchema.parse(result.output).code),
  ).toEqual(["LOCK_INVALID", "LOCK_INVALID", "LOCK_INVALID", "LOCK_INVALID"]);
});

test("preflight rejects stale state changed after qualification", async () => {
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
  const result = await invokePreflight(fixture);
  expect(result.exitCode).not.toBe(0);
  expect(
    ResultSchema.parse(result.output).reasons.map((reason) => reason.check),
  ).toContain("tool-digests");
});
