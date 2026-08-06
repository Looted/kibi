import { afterEach, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { PreflightNoGo, qualifySkillOptHost } from "../preflight";
import { createPreflightFixture, updateProbe } from "./preflight-fixture";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("unsupported primitives stop before the production launcher spawn boundary", async () => {
  // Given
  const rejected = await createPreflightFixture();
  const qualified = await createPreflightFixture();
  roots.push(rejected.root, qualified.root);
  await updateProbe(rejected, (probe) => ({ ...probe, pidfd: false }));
  const rejectedCalls: (readonly string[])[] = [];
  const qualifiedCalls: (readonly string[])[] = [];
  const rejectedOptions = {
    ...preflightOptions(rejected),
    launcherSpawner: launcherSpawner(rejected.probePath, rejectedCalls),
  };
  const qualifiedOptions = {
    ...preflightOptions(qualified),
    launcherSpawner: launcherSpawner(qualified.probePath, qualifiedCalls),
  };

  // When
  const rejectedResult = qualifySkillOptHost(rejectedOptions).catch(
    (error: unknown) => error,
  );
  const qualifiedResult = await qualifySkillOptHost(qualifiedOptions);

  // Then
  expect(await rejectedResult).toBeInstanceOf(PreflightNoGo);
  expect(rejectedCalls).toEqual([]);
  expect(qualifiedResult.status).toBe("qualified");
  expect(qualifiedCalls).toEqual([
    [
      "/usr/libexec/kibi-skillopt-verifier-launch",
      "preflight",
      "--format",
      "json",
    ],
  ]);
});

function preflightOptions(
  fixture: Awaited<ReturnType<typeof createPreflightFixture>>,
) {
  return {
    sandboxLock: fixture.sandboxLock,
    providerLock: fixture.providerLock,
    verifierLock: fixture.verifierLock,
    fixtureRoot: fixture.root,
  };
}

function launcherSpawner(path: string, calls: (readonly string[])[]) {
  return (argv: readonly string[]) => {
    calls.push(argv);
    return {
      stdout: Bun.file(path).stream(),
      stderr: new Blob([]).stream(),
      exited: Promise.resolve(0),
      kill: (_signal: NodeJS.Signals) => {},
    };
  };
}
