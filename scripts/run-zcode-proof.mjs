#!/usr/bin/env node

// Native proof producer for the Linux/WSL ZCode packed-consumer contract.
// The producer runs the real Bun suite, reads its JUnit case report, and emits
// only case-bound results with complete first-attempt facts. Missing cases,
// skipped cases, packaging failures, and launcher handshake failures are all
// proof failures; none are treated as unavailable prerequisites.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const ZCODE_TEST_ID = "TEST-zcode-kibi-plugin-v1";
export const ZCODE_PROOF_COMMAND = ["node", "scripts/run-zcode-proof.mjs"];
export const ZCODE_BUN_TEST_ARGS = Object.freeze([
  "test",
  "--retry=0",
  "--max-concurrency=1",
  "--timeout",
  "120000",
  "--reporter=junit",
  "--reporter-outfile",
  "<temporary-junit-report>",
  "./packages/zcode/tests",
]);

// These are the real native Bun test cases that exercise the behavioral proof
// symbols. Keep the names explicit: a renamed, duplicated, skipped, or failed
// case must fail proof production instead of silently turning into an
// aggregate pass.
export const ZCODE_NATIVE_CASES = Object.freeze([
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

function xmlDecode(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function xmlAttributes(source) {
  const attributes = {};
  for (const match of source.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) {
    attributes[match[1]] = xmlDecode(match[2]);
  }
  return attributes;
}

export function parseJUnitCases(xml) {
  const cases = [];
  const testcasePattern = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const match of xml.matchAll(testcasePattern)) {
    const attributes = xmlAttributes(match[1]);
    const body = match[2] ?? "";
    const status = /<error\b|<failure\b/.test(body)
      ? "failed"
      : /<skipped\b/.test(body)
        ? "skipped"
        : "passed";
    const timeSeconds = Number(attributes.time ?? 0);
    cases.push({
      file: attributes.file ?? "",
      classname: attributes.classname ?? "",
      name: attributes.name ?? "",
      native_id: `${attributes.file ?? ""}::${attributes.classname ?? ""}::${attributes.name ?? ""}`,
      outcome: status,
      duration_ms:
        Number.isFinite(timeSeconds) && timeSeconds >= 0
          ? Math.round(timeSeconds * 1000)
          : 0,
    });
  }
  return cases;
}

export function nativeId(testCase) {
  return `${testCase.file}::${testCase.classname}::${testCase.name}`;
}

export function buildProofResults(cases, requiredCases = ZCODE_NATIVE_CASES) {
  return requiredCases.map((required) => {
    const matches = cases.filter(
      (candidate) =>
        candidate.file === required.file &&
        candidate.classname === required.classname &&
        candidate.name === required.name,
    );
    if (matches.length === 0) {
      throw new Error(
        `ZCode proof missing native test case: ${required.file}::${required.classname}::${required.name}`,
      );
    }
    if (matches.length !== 1) {
      throw new Error(
        `ZCode proof found duplicate native test case (${matches.length}): ${required.file}::${required.classname}::${required.name}`,
      );
    }
    const [match] = matches;
    if (match.outcome !== "passed") {
      throw new Error(
        `ZCode proof native test case did not pass (${match.outcome}): ${required.file}::${required.classname}::${required.name}`,
      );
    }
    return {
      symbol_id: required.symbol_id,
      target: "default",
      outcome: "passed",
      binding: "native_case",
      native_id: nativeId(match),
      attempts: {
        status: "complete",
        entries: [{ outcome: "passed", duration_ms: match.duration_ms }],
      },
    };
  });
}

export function proofArtifact({
  snapshot,
  integration,
  commandArgv,
  startedAt,
  finishedAt,
  exitCode,
  cases,
}) {
  if (!/^[a-f0-9]{64}$/.test(snapshot)) {
    throw new Error(
      "KIBI_PROOF_SNAPSHOT must be a 64-character lowercase SHA-256 hash",
    );
  }
  const proofResults = buildProofResults(cases);
  return {
    version: "kibi.proof-run.v1",
    producer: { name: "kibi-zcode-proof-producer", version: "1.0.0" },
    executor: { name: "node", version: process.version },
    integration,
    command_argv: [...commandArgv],
    code_snapshot: snapshot,
    environment: {
      os: process.platform,
      arch: process.arch,
      runtime: { name: "node", version: process.version },
    },
    run: {
      outcome: exitCode === 0 ? "passed" : "failed",
      exit_code: exitCode,
      started_at: startedAt,
      finished_at: finishedAt,
    },
    proof_results: proofResults,
  };
}

function parseCommandArgv(value) {
  if (!value) return [...ZCODE_PROOF_COMMAND];
  const parsed = JSON.parse(value);
  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    parsed.some((part) => typeof part !== "string" || part.length === 0)
  ) {
    throw new Error(
      "KIBI_PROOF_COMMAND_ARGV must be a non-empty JSON argv array",
    );
  }
  return parsed;
}

export function validateProofTestIds(value) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 1 ||
    parsed[0] !== ZCODE_TEST_ID
  ) {
    throw new Error(`KIBI_PROOF_TEST_IDS must be exactly ["${ZCODE_TEST_ID}"]`);
  }
  return parsed;
}

export function runZcodeProof(options = {}) {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const outputPath = options.outputPath ?? process.env.KIBI_PROOF_OUTPUT;
  if (!outputPath) throw new Error("KIBI_PROOF_OUTPUT is required");
  if (process.platform === "win32")
    throw new Error("ZCode packed consumer proof is Linux/WSL-only");
  validateProofTestIds(
    options.testIds ?? process.env.KIBI_PROOF_TEST_IDS ?? null,
  );

  const reportRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-zcode-proof-"));
  const reportPath = path.join(reportRoot, "bun-junit.xml");
  const startedAt = new Date().toISOString();
  const bun = options.bun ?? process.env.BUN_BIN ?? "bun";
  const bunArgs = ZCODE_BUN_TEST_ARGS.map((argument) =>
    argument === "<temporary-junit-report>" ? reportPath : argument,
  );
  const result = spawnSync(bun, bunArgs, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      KIBI_ZCODE_PACKED_SMOKE: "1",
      KIBI_PROOF_RUN: "1",
    },
    stdio: "inherit",
  });
  try {
    if (result.error) throw result.error;
    if (result.status === null)
      throw new Error("Bun test was terminated by a signal");
    if (!readFileSync(reportPath, "utf8"))
      throw new Error("Bun produced an empty JUnit report");
    const cases = parseJUnitCases(readFileSync(reportPath, "utf8"));
    if (result.status !== 0)
      throw new Error(
        `ZCode adapter suite failed with exit code ${result.status}`,
      );
    const artifact = proofArtifact({
      snapshot: options.snapshot ?? process.env.KIBI_PROOF_SNAPSHOT ?? "",
      integration:
        options.integration ??
        process.env.KIBI_PROOF_INTEGRATION ??
        "self-proof",
      commandArgv:
        options.commandArgv ??
        parseCommandArgv(process.env.KIBI_PROOF_COMMAND_ARGV),
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: result.status,
      cases,
    });
    writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    return artifact;
  } finally {
    rmSync(reportRoot, { recursive: true, force: true });
  }
}

export function main() {
  return runZcodeProof();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
