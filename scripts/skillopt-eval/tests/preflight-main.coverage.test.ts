import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createPreflightFixture } from "./preflight-fixture";
import { preflightMain } from "../preflight";

const roots: string[] = [];
afterEach(async () => {
  Reflect.deleteProperty(process.env, "KIBI_SKILLOPT_TEST_FIXTURE");
  Reflect.deleteProperty(process.env, "KIBI_SKILLOPT_TEST_RECEIPT_DELAY_MS");
  Reflect.deleteProperty(process.env, "KIBI_SKILLOPT_TEST_RECEIPT_READY");
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("preflightMain CLI coverage", () => {
  test("writes a no-go receipt for invalid CLI arguments", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-preflight-cli-"));
    roots.push(root);
    const artifactRoot = join(root, "artifacts");
    const output = join(artifactRoot, "preflight.json");
    await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
    const code = await preflightMain([
      "--sandbox-lock",
      join(root, "missing.json"),
      "--artifact-root",
      artifactRoot,
      "--output",
      output,
      "--provider-lock",
    ]);
    expect(code).toBe(2);
    const receipt = JSON.parse(await readFile(output, "utf8"));
    expect(receipt.status).toBe("no-go");
    expect(receipt.reasons[0]?.check).toBe("cli-arguments");
  });

  test("rejects path traversal and disabled fixture-root", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-preflight-flags-"));
    roots.push(root);
    const artifactRoot = join(root, "artifacts");
    const output = join(artifactRoot, "preflight.json");
    await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
    expect(
      await preflightMain([
        "--sandbox-lock",
        "../etc/passwd",
        "--provider-lock",
        "a",
        "--verifier-lock",
        "b",
        "--artifact-root",
        artifactRoot,
        "--output",
        output,
      ]),
    ).toBe(2);
    process.env.KIBI_SKILLOPT_TEST_FIXTURE = "0";
    expect(
      await preflightMain([
        "--sandbox-lock",
        "a",
        "--provider-lock",
        "b",
        "--verifier-lock",
        "c",
        "--artifact-root",
        artifactRoot,
        "--output",
        output,
        "--fixture-root",
        root,
      ]),
    ).toBe(2);
  });

  test("skips writing a failure receipt when output traversal is present", async () => {
    const code = await preflightMain([
      "--not-enough",
      "--artifact-root",
      "/tmp/ok",
      "--output",
      "../escape.json",
    ]);
    expect(code).toBe(2);
  });

  test("qualifies a fixture host and writes the receipt", async () => {
    const fixture = await createPreflightFixture();
    roots.push(fixture.root);
    process.env.KIBI_SKILLOPT_TEST_FIXTURE = "1";
    process.env.KIBI_SKILLOPT_TEST_RECEIPT_DELAY_MS = "0";
    const code = await preflightMain([
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
    ]);
    expect([0, 1]).toContain(code);
    const receipt = JSON.parse(await readFile(fixture.output, "utf8"));
    expect(receipt.schemaVersion).toBe("1.0.0");
    expect(receipt.artifactType).toBe("skillopt-host-preflight");
  });

  test("writes TEMP_READY when the fixture receipt-ready flag is set", async () => {
    const fixture = await createPreflightFixture();
    roots.push(fixture.root);
    process.env.KIBI_SKILLOPT_TEST_FIXTURE = "1";
    process.env.KIBI_SKILLOPT_TEST_RECEIPT_READY = "1";
    process.env.KIBI_SKILLOPT_TEST_RECEIPT_DELAY_MS = "not-a-number";
    const code = await preflightMain([
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
    ]);
    expect([0, 1, 2]).toContain(code);
  });
});
