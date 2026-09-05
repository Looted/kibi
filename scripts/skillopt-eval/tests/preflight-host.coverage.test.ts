// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { chmod, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PreflightNoGo, qualifySkillOptHost } from "../preflight-host";
import { PreflightInputError } from "../preflight-io";
import * as runtime from "../preflight-host-runtime";
import { createPreflightFixture } from "./preflight-fixture";

const roots: string[] = [];
const spies: Array<{ mockRestore: () => void }> = [];

afterEach(async () => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function emptyStream(text = ""): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      if (text.length > 0) controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe("qualifySkillOptHost remaining lock and classification branches", () => {
  test("maps missing locks to a typed PreflightNoGo", async () => {
    await expect(
      qualifySkillOptHost({
        sandboxLock: "/tmp/kibi-missing-sandbox.json",
        providerLock: "/tmp/kibi-missing-provider.json",
        verifierLock: "/tmp/kibi-missing-verifier.json",
      }),
    ).rejects.toBeInstanceOf(PreflightNoGo);
  });

  test("classifies invalid bundle JSON as a signature no-go after locks load", async () => {
    const fixture = await createPreflightFixture();
    roots.push(fixture.root);
    await chmod(join(fixture.externalRoot, "verifier-bundle.lock"), 0o644);
    await writeFile(
      join(fixture.externalRoot, "verifier-bundle.lock"),
      "{not-json\n",
      { mode: 0o444 },
    );
    try {
      await qualifySkillOptHost({
        sandboxLock: fixture.sandboxLock,
        providerLock: fixture.providerLock,
        verifierLock: fixture.verifierLock,
        fixtureRoot: fixture.root,
      });
      throw new Error("expected PreflightNoGo");
    } catch (error) {
      expect(error).toBeInstanceOf(PreflightNoGo);
      if (!(error instanceof PreflightNoGo)) return;
      expect(error.receipt.reasons.map((reason) => reason.check)).toContain(
        "bundle-signature",
      );
    }
  });

  test("swallows verify Errors, rethrows unexpected failures, and launches after qualify", async () => {
    const fixture = await createPreflightFixture();
    roots.push(fixture.root);
    const input = spyOn(runtime, "validateTrustRoot").mockImplementation(
      async () => {
        throw new PreflightInputError(
          "external-bundle-lock",
          "EXTERNAL_PREREQUISITE_MISSING",
        );
      },
    );
    spies.push(input);
    try {
      await qualifySkillOptHost({
        sandboxLock: fixture.sandboxLock,
        providerLock: fixture.providerLock,
        verifierLock: fixture.verifierLock,
        fixtureRoot: fixture.root,
      });
      throw new Error("expected PreflightNoGo");
    } catch (error) {
      expect(error).toBeInstanceOf(PreflightNoGo);
      if (!(error instanceof PreflightNoGo)) return;
      expect(error.receipt.code).toBe("EXTERNAL_PREREQUISITE_MISSING");
      expect(error.receipt.reasons.map((reason) => reason.check)).toContain(
        "external-bundle-lock",
      );
    }
    input.mockRestore();

    const unexpected = spyOn(runtime, "validateTrustRoot").mockImplementation(
      async () => {
        throw new RangeError("unexpected host failure");
      },
    );
    spies.push(unexpected);
    await expect(
      qualifySkillOptHost({
        sandboxLock: fixture.sandboxLock,
        providerLock: fixture.providerLock,
        verifierLock: fixture.verifierLock,
        fixtureRoot: fixture.root,
      }),
    ).rejects.toBeInstanceOf(RangeError);
    unexpected.mockRestore();

    const qualified = await qualifySkillOptHost({
      sandboxLock: fixture.sandboxLock,
      providerLock: fixture.providerLock,
      verifierLock: fixture.verifierLock,
      fixtureRoot: fixture.root,
      launcherSpawner: () => ({
        stdout: emptyStream("{}"),
        stderr: emptyStream(),
        exited: Promise.resolve(0),
        kill() {},
      }),
    });
    expect(qualified.status).toBe("qualified");
  });
});
