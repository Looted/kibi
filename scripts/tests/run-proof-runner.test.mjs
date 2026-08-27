import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { runProofContracts } from "../run-proof-runner.mjs";

function registryFor(entries) {
  return { contracts: entries };
}

function entry(testId, { packed = false } = {}) {
  return {
    test_id: testId,
    contract: {
      command_argv: [
        "node",
        "scripts/run-proof-contract.mjs",
        "--test-id",
        testId,
      ],
    },
    steps: packed
      ? [
          [
            "node",
            "scripts/run-packed-e2e.mjs",
            "/tmp/compiled",
            `/tmp/compiled/${testId}.test.js`,
          ],
        ]
      : [["bun", "test", `${testId}.test.ts`]],
  };
}

function fakeSpawn(calls, exitCodes = []) {
  return (command, argv, options) => {
    const child = new EventEmitter();
    calls.push({ command, argv, options });
    queueMicrotask(() => child.emit("close", exitCodes.shift() ?? 0, null));
    return child;
  };
}

// executable_for TEST-test-journaled-engine-harness
test("prepares one packed environment and propagates both paths to every verify", async () => {
  const calls = [];
  let prepareCount = 0;
  let cleanupCount = 0;
  const output = [];
  const result = await runProofContracts({
    registry: registryFor([
      entry("packed-a", { packed: true }),
      entry("packed-b", { packed: true }),
    ]),
    env: { KIBI_CLI: "fake-kibi", SENTINEL: "kept" },
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
    spawnProcess: fakeSpawn(calls),
    writeOut: (text) => output.push(text),
    writeErr: (text) => output.push(text),
  });

  assert.equal(result, 0);
  assert.equal(prepareCount, 1);
  assert.equal(cleanupCount, 1);
  assert.deepEqual(
    calls.map(({ command, argv }) => [command, argv]),
    [
      [
        "fake-kibi",
        [
          "verify",
          "--test-id",
          "packed-a",
          "--",
          "node",
          "scripts/run-proof-contract.mjs",
          "--test-id",
          "packed-a",
        ],
      ],
      [
        "fake-kibi",
        [
          "verify",
          "--test-id",
          "packed-b",
          "--",
          "node",
          "scripts/run-proof-contract.mjs",
          "--test-id",
          "packed-b",
        ],
      ],
    ],
  );
  for (const { options } of calls) {
    assert.equal(options.env.KIBI_E2E_PREFIX, "/tmp/prefix");
    assert.equal(options.env.KIBI_TEST_TARBALLS, "/tmp/tarballs");
    assert.equal(options.env.SENTINEL, "kept");
  }
  assert.match(output.join(""), /packed-a/);
  assert.match(output.join(""), /packed-b/);
});

test("non-packed selection skips helper preparation and preserves CLI environment", async () => {
  const calls = [];
  let imported = false;
  const result = await runProofContracts({
    registry: registryFor([entry("plain")]),
    env: { KIBI_CLI: "fake-kibi", KIBI_E2E_PREFIX: "/existing" },
    importHelpers: async () => {
      imported = true;
      throw new Error("must not import packed helpers");
    },
    spawnProcess: fakeSpawn(calls),
    writeOut: () => {},
    writeErr: () => {},
  });

  assert.equal(result, 0);
  assert.equal(imported, false);
  assert.equal(calls[0].options.env.KIBI_E2E_PREFIX, "/existing");
  assert.equal(calls[0].options.env.KIBI_TEST_TARBALLS, undefined);
});

test("--only preserves mixed selection and prepares only when the selected entry is packed", async () => {
  const calls = [];
  let prepareCount = 0;
  const result = await runProofContracts({
    registry: registryFor([entry("packed", { packed: true }), entry("plain")]),
    args: ["--only", "plain"],
    env: { KIBI_CLI: "fake-kibi" },
    importHelpers: async () => {
      prepareCount += 1;
      throw new Error(
        "the selected plain contract must not prepare packed state",
      );
    },
    spawnProcess: fakeSpawn(calls),
    writeOut: () => {},
    writeErr: () => {},
  });

  assert.equal(result, 0);
  assert.equal(prepareCount, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].argv[2], "plain");
});

test("conflicting packed compiled directories fail before preparation", async () => {
  const first = entry("first", { packed: true });
  const second = entry("second", { packed: true });
  second.steps[0][2] = "/tmp/other-compiled";
  await assert.rejects(
    runProofContracts({
      registry: registryFor([first, second]),
      env: { KIBI_CLI: "fake-kibi" },
      importHelpers: async () => {
        throw new Error("must not import helpers for conflicting directories");
      },
      spawnProcess: fakeSpawn([]),
      writeOut: () => {},
      writeErr: () => {},
    }),
    /conflicting compiled directories/,
  );
});

test("failure is fail-fast and still cleans the prepared environment", async () => {
  const calls = [];
  let cleanupCount = 0;
  const result = await runProofContracts({
    registry: registryFor([
      entry("first", { packed: true }),
      entry("second", { packed: true }),
      entry("third", { packed: true }),
    ]),
    env: { KIBI_CLI: "fake-kibi" },
    importHelpers: async () => ({
      prepareSharedPackedEnvironment: async () => ({
        prefix: "/p",
        tarballsRoot: "/t",
      }),
      cleanupSharedPackedInstallation: () => {
        cleanupCount += 1;
      },
    }),
    spawnProcess: fakeSpawn(calls, [7, 0]),
    writeOut: () => {},
    writeErr: () => {},
  });

  assert.equal(result, 1);
  assert.equal(calls.length, 1);
  assert.equal(cleanupCount, 1);
});
