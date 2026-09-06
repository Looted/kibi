// implements REQ-test-journaled-engine-harness
import { afterEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaultImportHelpers,
  main,
  runPackedE2E,
  runPackedE2EIfEntrypoint,
} from "../run-packed-e2e.mjs";

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
    await expect(
      defaultImportHelpers("/tmp/compiled-missing-helpers-remain"),
    ).rejects.toThrow(/Packed E2E helper is missing/);
  });

  test("defaultImportHelpers loads helpers.js when present", async () => {
    const directory = mkdtempSync(join(tmpdir(), "kibi-packed-helpers-"));
    writeFileSync(
      join(directory, "helpers.js"),
      "export const marker = 'packed-helpers';\n",
    );
    const helpers = await defaultImportHelpers(directory);
    expect(helpers.marker).toBe("packed-helpers");
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

    const previousExit = process.exitCode;
    try {
      await runPackedE2EIfEntrypoint("/tmp/other.mjs", "file:///tmp/run.mjs");
      await runPackedE2EIfEntrypoint("/tmp/run.mjs", "file:///tmp/run.mjs", async () => 0);
      expect(process.exitCode).toBe(0);
      await runPackedE2EIfEntrypoint("/tmp/run.mjs", "file:///tmp/run.mjs", async () => {
        throw new Error("packed-entry-failed");
      });
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExit ?? 0;
    }
  });

});
