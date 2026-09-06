// implements REQ-test-journaled-engine-harness
import { afterEach, describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { runPackedE2E } from "../run-packed-e2e.mjs";

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
