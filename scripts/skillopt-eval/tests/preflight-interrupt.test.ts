import { afterEach, expect, test } from "bun:test";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { createPreflightFixture } from "./preflight-fixture";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

test("preflight removes an uncommitted receipt when SIGTERM interrupts the atomic write", async () => {
  // Given
  const fixture = await createPreflightFixture();
  roots.push(fixture.root);
  const child = Bun.spawn(
    [
      "bun",
      "run",
      join(import.meta.dir, "..", "preflight.ts"),
      "--sandbox-lock",
      fixture.sandboxLock,
      "--provider-lock",
      fixture.providerLock,
      "--verifier-lock",
      fixture.verifierLock,
      "--artifact-root",
      fixture.artifactRoot,
      "--output",
      fixture.output,
      "--fixture-root",
      fixture.root,
    ],
    {
      env: {
        ...process.env,
        KIBI_SKILLOPT_TEST_FIXTURE: "1",
        KIBI_SKILLOPT_TEST_RECEIPT_DELAY_MS: "30000",
        KIBI_SKILLOPT_TEST_RECEIPT_READY: "1",
      },
      stdout: "pipe",
      stderr: "ignore",
    },
  );

  // When
  const reader = child.stdout.getReader();
  const readiness = await reader.read();
  const temporaryObserved =
    !readiness.done &&
    new TextDecoder().decode(readiness.value) === "TEMP_READY\n";
  reader.releaseLock();
  child.kill("SIGTERM");
  const exitCode = await child.exited;

  // Then
  expect(temporaryObserved).toBe(true);
  expect(exitCode).toBe(143);
  expect(await Bun.file(fixture.output).exists()).toBe(false);
  expect(
    (await readdir(fixture.artifactRoot)).some((name) =>
      name.startsWith(".preflight.json."),
    ),
  ).toBe(false);
});
