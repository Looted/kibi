import assert from "node:assert/strict";
import { test } from "node:test";
import { proofRunArtifactErrors } from "../../packages/cli/src/public/proof-protocol.ts";
import {
  ZCODE_BUN_TEST_ARGS,
  ZCODE_NATIVE_CASES,
  buildProofResults,
  parseJUnitCases,
  proofArtifact,
  validateProofTestIds,
} from "../run-zcode-proof.mjs";

const SNAPSHOT = "a".repeat(64);

test("ZCode producer accepts only its exact proof test selection and disables retries", () => {
  assert.deepEqual(validateProofTestIds('["TEST-zcode-kibi-plugin-v1"]'), [
    "TEST-zcode-kibi-plugin-v1",
  ]);
  assert.throws(
    () => validateProofTestIds('["TEST-other"]'),
    /must be exactly/,
  );
  assert.throws(
    () => validateProofTestIds('["TEST-zcode-kibi-plugin-v1","TEST-other"]'),
    /must be exactly/,
  );
  assert.equal(ZCODE_BUN_TEST_ARGS[1], "--retry=0");
  assert.equal(ZCODE_BUN_TEST_ARGS[2], "--max-concurrency=1");
  assert.deepEqual(ZCODE_NATIVE_CASES, [
    {
      symbol_id: "SYM-zcode-case-mutated-workspace-paths",
      file: "packages/zcode/tests/hook-runner.test.ts",
      classname: "ZCode hook runner workspace opt-in",
      name: "each supported mutating payload records its affected paths",
    },
    {
      symbol_id: "SYM-zcode-case-canonicalize-check-source-files",
      file: "packages/zcode/tests/hook-runner.test.ts",
      classname: "ZCode hook runner workspace opt-in",
      name: "absolute edit paths canonicalize against relative check paths",
    },
    {
      symbol_id: "SYM-zcode-case-unconfigured-workspace-silent",
      file: "packages/zcode/tests/hook-runner.test.ts",
      classname: "ZCode hook runner workspace opt-in",
      name: "every hook event stays silent in an unconfigured workspace",
    },
    {
      symbol_id: "SYM-zcode-case-session-state-isolation",
      file: "packages/zcode/tests/hook-runner.test.ts",
      classname: "ZCode hook runner session isolation",
      name: "separate hook processes recover the same session state",
    },
    {
      symbol_id: "SYM-zcode-case-canonicalize-workspace-path",
      file: "packages/zcode/tests/hook-runner.test.ts",
      classname: "ZCode hook runner workspace opt-in",
      name: "PreToolUse canonicalizes absolute and ./-prefixed .kb targets",
    },
    {
      symbol_id: "SYM-zcode-case-packed-consumer-install-launch",
      file: "packages/zcode/tests/packed-consumer-smoke.test.ts",
      classname: "packed kibi-mcp consumer resolution",
      name: "installs the local MCP tarball and launches it through the shipped Node launcher",
    },
    {
      symbol_id: "SYM-zcode-case-optional-package-contract",
      file: "packages/zcode/tests/package-contract.test.ts",
      classname: "kibi-zcode package contract",
      name: "optional package contract has no install lifecycle or core runtime mutation",
    },
    {
      symbol_id: "SYM-zcode-case-readme-optional-adapter",
      file: "packages/zcode/tests/package-contract.test.ts",
      classname: "kibi-zcode package contract",
      name: "README declares the ZCode adapter optional",
    },
    {
      symbol_id: "SYM-zcode-case-manual-mcp-fallback",
      file: "packages/zcode/tests/package-contract.test.ts",
      classname: "kibi-zcode package contract",
      name: "manual MCP fallback is only for unused marketplace installs and invokes kibi-mcp",
    },
    {
      symbol_id: "SYM-zcode-case-advisory-hooks",
      file: "packages/zcode/tests/hook-runner.test.ts",
      classname: "ZCode hook runner workspace opt-in",
      name: "hook outputs are advisory and never hard deny",
    },
    {
      symbol_id: "SYM-zcode-case-hooks-no-kb-mutation",
      file: "packages/zcode/tests/hook-runner.test.ts",
      classname: "ZCode hook runner workspace opt-in",
      name: "hook events never mutate .kb contents",
    },
    {
      symbol_id: "SYM-zcode-case-shipped-plugin-payload",
      file: "packages/zcode/tests/install-artifact.test.ts",
      classname: "kibi-zcode distribution artifacts",
      name: "an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command",
    },
  ]);
});

function junitFor(cases) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<testsuites>",
    ...cases.map(
      ({ file, classname, name, time = "0.010", body = "" }) =>
        `<testcase file="${file}" classname="${classname}" name="${name}" time="${time}">${body}</testcase>`,
    ),
    "</testsuites>",
  ].join("\n");
}

test("ZCode producer parses native Bun cases and preserves first-attempt facts", () => {
  const parsed = parseJUnitCases(
    junitFor([
      {
        file: "packages/zcode/tests/example.test.ts",
        classname: "example",
        name: "passes & remains native",
        time: "0.125",
      },
      {
        file: "packages/zcode/tests/example.test.ts",
        classname: "example",
        name: "is skipped",
        body: "<skipped />",
      },
      {
        file: "packages/zcode/tests/example.test.ts",
        classname: "example",
        name: "fails",
        body: '<failure message="nope" />',
      },
    ]),
  );

  assert.deepEqual(
    parsed.map((entry) => entry.outcome),
    ["passed", "skipped", "failed"],
  );
  assert.equal(
    parsed[0].native_id,
    "packages/zcode/tests/example.test.ts::example::passes & remains native",
  );
  assert.equal(parsed[0].duration_ms, 125);
});

test("ZCode producer fails closed when a required native case is absent", () => {
  assert.throws(
    () =>
      buildProofResults(
        [],
        [
          {
            symbol_id: "SYM-zcode-test-missing",
            file: "packages/zcode/tests/missing.test.ts",
            classname: "missing",
            name: "missing case",
          },
        ],
      ),
    /missing native test case/,
  );
});

test("ZCode producer rejects duplicate, skipped, and failed required native cases", () => {
  const required = ZCODE_NATIVE_CASES[0];
  const nativeCase = { ...required, duration_ms: 10 };
  assert.throws(
    () => buildProofResults([nativeCase, nativeCase], [required]),
    /duplicate native test case \(2\)/,
  );
  for (const outcome of ["skipped", "failed"]) {
    assert.throws(
      () => buildProofResults([{ ...nativeCase, outcome }], [required]),
      new RegExp(`did not pass \\(${outcome}\\)`),
    );
  }
});

test("ZCode producer emits a strict native proof artifact for every required behavior case", () => {
  const cases = ZCODE_NATIVE_CASES.map((entry) => ({
    ...entry,
    outcome: "passed",
    duration_ms: 10,
  }));
  const artifact = proofArtifact({
    snapshot: SNAPSHOT,
    integration: "zcode-native",
    commandArgv: ["node", "scripts/run-zcode-proof.mjs"],
    startedAt: "2026-09-16T00:00:00.000Z",
    finishedAt: "2026-09-16T00:00:01.000Z",
    exitCode: 0,
    cases,
  });

  assert.equal(artifact.version, "kibi.proof-run.v1");
  assert.equal(artifact.integration, "zcode-native");
  assert.deepEqual(artifact.command_argv, [
    "node",
    "scripts/run-zcode-proof.mjs",
  ]);
  assert.deepEqual(artifact.producer, {
    name: "kibi-zcode-proof-producer",
    version: "1.0.0",
  });
  assert.equal(artifact.proof_results.length, 12);
  for (const result of artifact.proof_results) {
    assert.equal(result.binding, "native_case");
    assert.equal(result.attempts.status, "complete");
    assert.equal(result.attempts.entries.length, 1);
    assert.equal(result.attempts.entries[0].outcome, "passed");
    assert.ok(result.native_id.includes("::"));
  }
  assert.deepEqual(proofRunArtifactErrors(artifact), []);
});

test("ZCode producer rejects an invalid proof snapshot before claiming evidence", () => {
  assert.throws(
    () =>
      proofArtifact({
        snapshot: "not-a-snapshot",
        integration: "self-proof",
        commandArgv: ["node", "scripts/run-zcode-proof.mjs"],
        startedAt: "2026-09-16T00:00:00.000Z",
        finishedAt: "2026-09-16T00:00:01.000Z",
        exitCode: 0,
        cases: [],
      }),
    /64-character lowercase SHA-256 hash/,
  );
});
