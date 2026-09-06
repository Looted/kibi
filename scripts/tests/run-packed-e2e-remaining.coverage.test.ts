// implements REQ-test-journaled-engine-harness
import { afterEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";
import { main, runPackedE2E } from "../run-packed-e2e.mjs";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("run-packed-e2e remaining helper-missing and main-guard branches", () => {
  test("uses the default importHelpers path when helpers.js is absent", async () => {
    await expect(
      runPackedE2E({
        compiledDirectory: "/tmp/compiled-missing-helpers-remain",
        testFiles: ["/tmp/one.test.js"],
      }),
    ).rejects.toThrow(/Packed E2E helper is missing/);
  });

  test("prepares once, maps spawn errors, invalid helpers, and forwarded signals", async () => {
    const signalTarget = new EventEmitter();
    const killed: string[] = [];
    const ok = await runPackedE2E({
      compiledDirectory: "/tmp/compiled",
      testFiles: ["/tmp/one.test.js", "/tmp/two.test.js"],
      env: { SENTINEL: "kept" },
      signalTarget,
      nodeExecutable: "fake-node",
      importHelpers: async () => ({
        prepareSharedPackedEnvironment: async () => ({
          prefix: "/tmp/prefix",
          tarballsRoot: "/tmp/tarballs",
        }),
        cleanupSharedPackedInstallation: () => undefined,
      }),
      spawnProcess: (_command, _argv, _options) => {
        const child = new EventEmitter() as EventEmitter & {
          kill: (signal: string) => boolean;
        };
        child.kill = (signal) => {
          killed.push(signal);
          queueMicrotask(() => child.emit("exit", null, signal));
          return true;
        };
        queueMicrotask(() => {
          signalTarget.emit("SIGINT");
          signalTarget.emit("SIGTERM");
        });
        return child as never;
      },
    });
    expect(ok).toBe(128);
    expect(killed).toContain("SIGINT");
    expect(killed).toContain("SIGTERM");

    await expect(
      runPackedE2E({
        compiledDirectory: "",
        testFiles: [],
      }),
    ).rejects.toThrow(/Usage:/);

    await expect(
      runPackedE2E({
        compiledDirectory: "/tmp/compiled",
        testFiles: ["/tmp/one.test.js"],
        importHelpers: async () => ({
          prepareSharedPackedEnvironment: async () => ({ prefix: 1 }),
          cleanupSharedPackedInstallation: () => undefined,
        }),
      }),
    ).rejects.toThrow(/invalid shared environment/);

    await expect(
      runPackedE2E({
        compiledDirectory: "/tmp/compiled",
        testFiles: ["/tmp/failing.test.js"],
        signalTarget: new EventEmitter(),
        importHelpers: async () => ({
          prepareSharedPackedEnvironment: async () => ({
            prefix: "/tmp/prefix",
            tarballsRoot: "/tmp/tarballs",
          }),
          cleanupSharedPackedInstallation: () => undefined,
        }),
        spawnProcess: () => {
          const child = new EventEmitter();
          queueMicrotask(() => child.emit("error", new Error("spawn failed")));
          return child as never;
        },
      }),
    ).rejects.toThrow(/spawn failed/);

    const previous = process.argv.slice();
    process.argv = ["node", "scripts/run-packed-e2e.mjs"];
    try {
      await expect(main()).rejects.toThrow(/Usage:/);
    } finally {
      process.argv = previous;
    }
  });

  test("evaluates the direct-invocation guard against this test process argv", async () => {
    const scriptPath = fileURLToPath(
      new URL("../run-packed-e2e.mjs", import.meta.url),
    );
    const previousArgv = process.argv.slice();
    const previousExit = process.exitCode;
    process.argv = ["bun", scriptPath];
    try {
      await import(`${scriptPath}?remaining=${Date.now()}`);
      expect(process.exitCode).toBe(1);
    } finally {
      process.argv = previousArgv;
      process.exitCode = previousExit ?? 0;
    }
  });
});
