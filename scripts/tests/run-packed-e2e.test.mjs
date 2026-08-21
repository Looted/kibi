import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { runPackedE2E } from "../run-packed-e2e.mjs";

function fakeSignalTarget() {
  return new EventEmitter();
}

// executable_for TEST-test-journaled-engine-harness
test("packed runner prepares once, propagates both paths, and preserves bounded concurrency", async () => {
  const calls = [];
  let prepareCount = 0;
  let cleanupCount = 0;
  const result = await runPackedE2E({
    compiledDirectory: "/tmp/compiled",
    testFiles: ["/tmp/one.test.js", "/tmp/two.test.js"],
    env: { SENTINEL: "kept" },
    signalTarget: fakeSignalTarget(),
    importHelpers: async (directory) => {
      assert.equal(directory, "/tmp/compiled");
      return {
        prepareSharedPackedEnvironment: async () => {
          prepareCount += 1;
          return { prefix: "/tmp/prefix", tarballsRoot: "/tmp/tarballs" };
        },
        cleanupSharedPackedInstallation: () => {
          cleanupCount += 1;
        },
      };
    },
    spawnProcess: (command, argv, options) => {
      const child = new EventEmitter();
      calls.push({ command, argv, options });
      queueMicrotask(() => child.emit("exit", 0, null));
      return child;
    },
    nodeExecutable: "fake-node",
  });

  assert.equal(result, 0);
  assert.equal(prepareCount, 1);
  assert.equal(cleanupCount, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "fake-node");
  assert.deepEqual(calls[0].argv, [
    "--test",
    "--test-concurrency=2",
    "/tmp/one.test.js",
    "/tmp/two.test.js",
  ]);
  assert.equal(calls[0].options.env.KIBI_E2E_PREFIX, "/tmp/prefix");
  assert.equal(calls[0].options.env.KIBI_TEST_TARBALLS, "/tmp/tarballs");
  assert.equal(calls[0].options.env.SENTINEL, "kept");
});

test("packed runner cleans up after child failure and spawn error", async () => {
  for (const outcome of ["exit", "error"]) {
    let cleanupCount = 0;
    const signalTarget = fakeSignalTarget();
    const run = runPackedE2E({
      compiledDirectory: "/tmp/compiled",
      testFiles: ["/tmp/failing.test.js"],
      signalTarget,
      importHelpers: async () => ({
        prepareSharedPackedEnvironment: async () => ({
          prefix: "/tmp/prefix",
          tarballsRoot: "/tmp/tarballs",
        }),
        cleanupSharedPackedInstallation: () => {
          cleanupCount += 1;
        },
      }),
      spawnProcess: () => {
        const child = new EventEmitter();
        queueMicrotask(() => {
          if (outcome === "exit") child.emit("exit", 7, null);
          else child.emit("error", new Error("spawn failed"));
        });
        return child;
      },
    });
    if (outcome === "exit") {
      assert.equal(await run, 7);
    } else {
      await assert.rejects(run, /spawn failed/);
    }
    assert.equal(cleanupCount, 1);
  }
});
