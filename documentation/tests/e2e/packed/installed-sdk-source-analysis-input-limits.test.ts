import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";
const COMMAND_TIMEOUT_MS = 120_000;

function outputOf(result: { stdout: string; stderr: string }): string {
  return `${result.stdout}\n${result.stderr}`;
}

function assertCommandSucceeded(
  result: { stdout: string; stderr: string; exitCode: number },
  label: string,
): void {
  assert.equal(
    result.exitCode,
    0,
    `${label} exited ${result.exitCode}.\n${outputOf(result)}`,
  );
}

function installedSdkConsumerProgram(): string {
  return String.raw`import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PluginValidationError,
  SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS,
  validateSourceAnalysisResultV2,
} from "kibi-plugin-sdk";

const maxInputCodeUnits = SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS;
assert.equal(maxInputCodeUnits, 5 * 1024 * 1024);
const installedSdkEntry = fileURLToPath(import.meta.resolve("kibi-plugin-sdk"));
const installedSdkRoot =
  path.join(process.cwd(), "node_modules", "kibi-plugin-sdk") + path.sep;
assert.ok(
  installedSdkEntry.startsWith(installedSdkRoot),
  "the SDK must resolve from this relocated consumer's installed package",
);

const sourceFile = "src/boundary.ts";
const inputFor = (content) => ({ path: sourceFile, content });
const resultFor = (input, status, overrides = {}) => ({
  contractVersion: "kibi.symbol-extractor.v2",
  status,
  sourceFile: input.path,
  language: "typescript",
  module: {
    title: "boundary",
    language: "typescript",
    analysisMode: "fallback",
    ...(status === "failed" ? { fallbackReason: "input_limit" } : {}),
  },
  symbols: [],
  diagnostics:
    status === "failed"
      ? [{ code: "input_limit", message: "Source exceeds the SDK input limit" }]
      : [],
  uncoveredRanges: [],
  ...overrides,
});
const assertRejectedWithSdkError = (input, result, message) => {
  assert.throws(
    () => validateSourceAnalysisResultV2(result, input),
    (error) =>
      error instanceof PluginValidationError &&
      error.code === "INVALID_CAPABILITY_RESULT" &&
      error.message.includes(message),
    "expected the installed SDK to reject the result with " + message,
  );
};

const asciiAtLimit = inputFor("x".repeat(maxInputCodeUnits));
assert.equal(asciiAtLimit.content.length, maxInputCodeUnits);
assert.equal(
  validateSourceAnalysisResultV2(resultFor(asciiAtLimit, "ok"), asciiAtLimit)
    .status,
  "ok",
  "an otherwise valid result at the exact SDK limit is accepted",
);

const astralAtLimitContent = "😀".repeat(maxInputCodeUnits / 2);
assert.equal(astralAtLimitContent.length, maxInputCodeUnits);
assert.ok(
  Buffer.byteLength(astralAtLimitContent, "utf8") > 8 * 1024 * 1024,
  "this direct SDK case exceeds the host's separate UTF-8 byte preflight while remaining at the SDK UTF-16 limit",
);
const astralAtLimit = inputFor(astralAtLimitContent);
assert.equal(
  validateSourceAnalysisResultV2(resultFor(astralAtLimit, "ok"), astralAtLimit)
    .status,
  "ok",
  "the exported SDK limit counts JavaScript UTF-16 code units, not UTF-8 bytes",
);

const asciiAboveLimit = inputFor("x".repeat(maxInputCodeUnits + 1));
assert.equal(asciiAboveLimit.content.length, maxInputCodeUnits + 1);
const acceptedFailure = resultFor(asciiAboveLimit, "failed", {
  diagnostics: [
    { code: "input_limit", message: "Source exceeds the SDK input limit" },
  ],
});
const validatedFailure = validateSourceAnalysisResultV2(
  acceptedFailure,
  asciiAboveLimit,
);
assert.equal(validatedFailure.status, "failed");
assert.equal(validatedFailure.module.fallbackReason, "input_limit");
assert.equal(validatedFailure.diagnostics[0]?.code, "input_limit");

const astralPlusOneUnit = inputFor(astralAtLimitContent + "x");
assert.equal(astralPlusOneUnit.content.length, maxInputCodeUnits + 1);
assert.equal(
  validateSourceAnalysisResultV2(
    resultFor(astralPlusOneUnit, "failed"),
    astralPlusOneUnit,
  ).status,
  "failed",
  "an astral-containing input with one extra UTF-16 code unit is over the limit",
);

for (const status of ["ok", "partial", "unsupported"]) {
  assertRejectedWithSdkError(
    asciiAboveLimit,
    resultFor(asciiAboveLimit, status),
    "oversized input requires a failed result",
  );
}

assertRejectedWithSdkError(
  asciiAboveLimit,
  resultFor(asciiAboveLimit, "failed", { symbols: [{}] }),
  "oversized failed input must not include symbols",
);
assertRejectedWithSdkError(
  asciiAboveLimit,
  resultFor(asciiAboveLimit, "failed", {
    uncoveredRanges: [
      { startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 },
    ],
  }),
  "oversized failed input must not include uncovered source ranges",
);
assertRejectedWithSdkError(
  asciiAboveLimit,
  resultFor(asciiAboveLimit, "failed", {
    diagnostics: [
      {
        code: "input_limit",
        message: "Source exceeds the SDK input limit",
        range: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 },
      },
    ],
  }),
  "oversized failed input diagnostics must not include source ranges",
);

process.stdout.write("Installed public SDK input-limit boundaries passed.\n");
`;
}

// executable_for TEST-installed-sdk-source-analysis-input-limits
export async function runInstalledSdkSourceAnalysisInputLimitsWorkflow() {
  const tarballs: Tarballs = await packAll();
  const sandbox: TestSandbox = createSandbox();
  try {
    const consumerPrefix = join(sandbox.baseDir, "sdk-consumer");
    mkdirSync(consumerPrefix, { recursive: true });
    writeFileSync(
      join(consumerPrefix, "package.json"),
      `${JSON.stringify(
        {
          name: "installed-sdk-input-limit-consumer",
          private: true,
          type: "module",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const install = await run(
      "npm",
      [
        "install",
        "--offline",
        "--prefix",
        consumerPrefix,
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--no-save",
        "--package-lock=false",
        `file:${tarballs["plugin-sdk"]}`,
      ],
      {
        cwd: consumerPrefix,
        env: sandbox.env,
        timeoutMs: COMMAND_TIMEOUT_MS,
      },
    );
    assertCommandSucceeded(
      install,
      "offline install of the supplied SDK tarball",
    );

    const consumerProgram = join(consumerPrefix, "input-limit-consumer.mjs");
    writeFileSync(consumerProgram, installedSdkConsumerProgram(), "utf8");
    const result = await run(process.execPath, [consumerProgram], {
      cwd: consumerPrefix,
      env: sandbox.env,
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    assertCommandSucceeded(result, "installed public SDK input-limit consumer");
    assert.match(
      result.stdout,
      /Installed public SDK input-limit boundaries passed/,
    );
  } finally {
    await sandbox.cleanup();
  }
}

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Packed installed SDK source-analysis input limits",
    { concurrency: false },
    () => {
      it(
        "enforces the installed SDK UTF-16 input limit using its public export and validator",
        { timeout: 240_000 },
        async () => runInstalledSdkSourceAnalysisInputLimitsWorkflow(),
      );
    },
  );
}
