// Mutation testing configuration for kibi.
//
// Scope: the three small packages (runtime, codex, cursor) whose unit suites
// are fast enough for per-mutant `bun test` runs, plus kibi-cli modules added
// one at a time (CLI_MUTATION_MODULES). The gate is absolute: any surviving
// mutant fails the run. Before extending scope, read
// docs/mutation-testing.md — the rest of cli, mcp and core stay out of scope
// (engine-heavy tests, Prolog sources).
//
// The test runner is @hughescr/stryker-bun-runner: it spawns a fresh
// `bun test` child per run and correlates tests to mutants via Bun's
// inspector protocol. bunfig.toml's `[test] root = "test"` breaks bun's
// directory-argument discovery, so tests are passed as an explicit
// "./"-prefixed file list (same form scripts/run-unit-coverage.ts uses).
import { readdirSync } from "node:fs";
import { join, posix } from "node:path";

const MUTATION_PACKAGES = [
  "packages/runtime",
  "packages/codex",
  "packages/cursor",
];

// kibi-cli is too large and engine-heavy to mutate whole. Each module joins
// once its own hermetic unit tests kill every mutant; the value lists those
// tests (only they run against the module's mutants).
export const CLI_MUTATION_MODULES = {
  "packages/cli/src/cli-input.ts": ["packages/cli/tests/cli-input.test.ts"],
  "packages/cli/src/firm-decision-edit.ts": [
    "packages/cli/tests/firm-decision-edit.test.ts",
  ],
  "packages/cli/src/diagnostics.ts": [
    "packages/cli/tests/diagnostics-pure.test.ts",
  ],
  "packages/cli/src/engine-limits.ts": [
    "packages/cli/tests/engine-limits.test.ts",
  ],
  "packages/cli/src/decision-firmness.ts": [
    "packages/cli/tests/decision-firmness.test.ts",
  ],
  "packages/cli/src/entity-body-context.ts": [
    "packages/cli/tests/entity-body-context.test.ts",
  ],
  "packages/cli/src/search-ranking.ts": [
    "packages/cli/tests/search-ranking.test.ts",
  ],
};

// Explicit test-file list, enumerated relative to the repo root (the Stryker
// sandbox root). Helpers and fixtures are never picked up — only *.test.ts.
function scopedTestFiles() {
  const files = [];
  for (const pkg of MUTATION_PACKAGES) {
    const walk = (rel) => {
      for (const entry of readdirSync(join(pkg, "tests", rel), {
        withFileTypes: true,
      })) {
        if (entry.isDirectory()) {
          walk(posix.join(rel, entry.name));
        } else if (entry.name.endsWith(".test.ts")) {
          files.push(`./${posix.join(pkg, "tests", rel, entry.name)}`);
        }
      }
    };
    walk("");
  }
  for (const tests of Object.values(CLI_MUTATION_MODULES)) {
    for (const test of tests) files.push(`./${test}`);
  }
  return [...new Set(files)].sort();
}

/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
const config = {
  testRunner: "bun",
  // Stryker only auto-loads @stryker-mutator/* packages; the community bun
  // runner must be registered explicitly.
  plugins: ["@hughescr/stryker-bun-runner"],
  coverageAnalysis: "perTest",
  mutate: [
    "packages/runtime/src/**/*.ts",
    // Pure re-export barrel of kibi-cli: no logic of its own to mutate.
    "!packages/runtime/src/index.ts",
    "packages/codex/src/**/*.ts",
    "packages/cursor/src/**/*.ts",
    ...Object.keys(CLI_MUTATION_MODULES),
  ],
  bun: {
    testFiles: scopedTestFiles(),
    // Watchdog for a whole `bun test` child; the scoped suites take ~20s
    // sequentially, and engine-spawning tests legally take seconds each.
    timeout: 120000,
    // Bun opens its inspector socket asynchronously; under a loaded machine
    // the 5s default can elapse before the child answers, which Stryker
    // reports as a failed initial run. Give cold starts room to breathe.
    inspectorTimeout: 30000,
  },
  // The sandbox copier cannot copy the tracked plugins/ symlinks (EISDIR)
  // and recreates directories with default modes (.kibi must stay 0700 for
  // the adoption-lock check in the cursor build). Skip plugins/ during the
  // copy, then repair both drifts inside each sandbox. The slash in
  // "plugins/**" is deliberate: without it, glob matchBase would also
  // exclude .agents/plugins/marketplace.json, which the tests read.
  ignorePatterns: [
    "plugins/**",
    "tools/skillopt/.venv/**",
    // Root-level symlink to an external tool's index store; the sandbox
    // copier follows it and fails with EISDIR.
    ".codegraph",
    ".codegraph/**",
  ],
  buildCommand: "sh scripts/mutation-sandbox-setup.sh",
  // All-or-nothing: a single surviving mutant fails `bun run test:mutation`.
  thresholds: { high: 100, low: 100, break: 100 },
  concurrency: 4,
  reporters: ["progress", "html", "json", "clear-text"],
  // `bun.*` is the @hughescr/stryker-bun-runner option namespace; Stryker's
  // core schema does not know it, but the plugin reads it from settings.
  warnings: { unknownOptions: false },
  timeoutMS: 20000,
  timeoutFactor: 1.5,
};

export default config;
