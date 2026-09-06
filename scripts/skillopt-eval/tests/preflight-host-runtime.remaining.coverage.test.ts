// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  launchAttestation,
  loadAttestation,
} from "../preflight-host-runtime";

const spies: Array<{ mockRestore: () => void }> = [];
const roots: string[] = [];
const previousSentinel = process.env.KIBI_SKILLOPT_PREFLIGHT_SENTINEL;

afterEach(async () => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  if (previousSentinel === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_SKILLOPT_PREFLIGHT_SENTINEL");
  } else {
    process.env.KIBI_SKILLOPT_PREFLIGHT_SENTINEL = previousSentinel;
  }
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function streamFrom(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      if (text.length > 0) controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

function dummyOptions() {
  return {
    sandboxLock: "/tmp/sandbox.lock",
    providerLock: "/tmp/provider.lock",
    verifierLock: "/tmp/verifier.lock",
  };
}

describe("preflight-host-runtime remaining launcher and bound-output branches", () => {
  test("writes the sentinel and spawns the default launcher", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-preflight-rt-"));
    roots.push(root);
    const sentinel = join(root, "sentinel.txt");
    process.env.KIBI_SKILLOPT_PREFLIGHT_SENTINEL = sentinel;
    const spawn = spyOn(Bun, "spawn").mockImplementation((() => ({
      stdout: streamFrom('{"ok":true}'),
      stderr: streamFrom(""),
      exited: Promise.resolve(0),
      kill() {},
    })) as never);
    spies.push(spawn);

    const stdout = await loadAttestation(dummyOptions());
    expect(stdout).toBe('{"ok":true}');
    expect(await readFile(sentinel, "utf8")).toBe("launcher-spawned\n");
    expect(spawn).toHaveBeenCalled();
    const argv = spawn.mock.calls[0]?.[0];
    expect(argv).toEqual([
      "/usr/libexec/kibi-skillopt-verifier-launch",
      "preflight",
      "--format",
      "json",
    ]);
  });

  test("rejects launcher output larger than one mebibyte", async () => {
    const huge = "x".repeat(1_048_576 + 1);
    await expect(
      launchAttestation(() => ({
        stdout: streamFrom(huge),
        stderr: streamFrom(""),
        exited: Promise.resolve(0),
        kill() {},
      })),
    ).rejects.toMatchObject({
      name: "PreflightInputError",
      check: "launcher-output-bounded",
      code: "PREFLIGHT_NO_GO",
    });
  });
});
