// Mutation testing configuration for kibi.
//
// Scope: the three small packages (runtime, codex, cursor) whose unit suites
// are fast enough for per-mutant `bun test` runs, plus kibi-cli modules added
// one at a time (CLI_MUTATION_MODULES). The gate is absolute: any surviving
// mutant fails the run. Before extending scope, read
// docs/mutation-testing.md. kibi-mcp, the editor hosts and the tree-sitter
// readers have lanes of their own (stryker.*.conf.mjs), and the Prolog core
// is gated by Mutalog (mutalog.config.pl).
//
// The test runner is @hughescr/stryker-bun-runner: it spawns a fresh
// `bun test` child per run and correlates tests to mutants via Bun's
// inspector protocol. bunfig.toml's `[test] root = "test"` breaks bun's
// directory-argument discovery, so tests are passed as an explicit
// "./"-prefixed file list (same form scripts/run-unit-coverage.ts uses).
import { readdirSync } from "node:fs";
import { join, posix } from "node:path";

// Whole packages in scope: every src/**/*.ts file is mutated and every
// tests/**/*.test.ts file runs against the mutants.
export const MUTATION_PACKAGES = [
  "packages/runtime",
  "packages/codex",
  "packages/cursor",
  "packages/plugin-sdk",
  "packages/plugin-jev",
  "packages/agent-core",
  "packages/zcode",
  "packages/claude",
  "packages/plugin-ui",
  "packages/plugin-search-hints",
  "packages/plugin-builtin",
];

/**
 * Test files of a whole package in scope that cannot run in the Stryker
 * sandbox. rationale: the claude distribution test compares the committed hook
 * bundle with the source, and the sandbox source is instrumented, so it always
 * fails the initial run there.
 */
export const MUTATION_TEST_EXCLUDES = [
  "packages/claude/tests/distribution.test.ts",
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
  "packages/cli/src/logic/ir.ts": ["packages/cli/tests/logic/ir.test.ts"],
  "packages/cli/src/search-hints.ts": [
    "packages/cli/tests/search-hints.test.ts",
  ],
  "packages/cli/src/plugins/compose-search-hints.ts": [
    "packages/cli/tests/search-hints.test.ts",
  ],
  "packages/cli/src/plugins/generated-sources.ts": [
    "packages/cli/tests/plugins/generated-sources-mutation.test.ts",
    "packages/cli/tests/plugins/language-pack-relevance.test.ts",
  ],
  "packages/cli/src/utils/canonical-path.ts": [
    "packages/cli/tests/utils/canonical-path.test.ts",
  ],
  "packages/cli/src/utils/symbol-manifest-layout.ts": [
    "packages/cli/tests/utils/symbol-manifest-layout.test.ts",
  ],
  "packages/cli/src/utils/prolog-cleanup.ts": [
    "packages/cli/tests/utils/prolog-cleanup.test.ts",
  ],
  "packages/cli/src/utils/first-sentence.ts": [
    "packages/cli/tests/utils/first-sentence.test.ts",
  ],
  "packages/cli/src/utils/prolog-query-plan-safety.ts": [
    "packages/cli/tests/utils/prolog-query-plan-safety.test.ts",
  ],
  "packages/cli/src/utils/repo-relative-path.ts": [
    "packages/cli/tests/utils/repo-relative-path.test.ts",
  ],
  "packages/cli/src/utils/entity-id-style.ts": [
    "packages/cli/tests/utils/entity-id-style.test.ts",
  ],
  "packages/cli/src/utils/manifest-paths.ts": [
    "packages/cli/tests/utils/manifest-paths.test.ts",
  ],
  "packages/cli/src/utils/merge-driver-setup.ts": [
    "packages/cli/tests/utils/merge-driver-setup.test.ts",
  ],
  "packages/cli/src/utils/schema-version.ts": [
    "packages/cli/tests/utils/schema-version.test.ts",
  ],
  "packages/cli/src/utils/branch-store-locator.ts": [
    "packages/cli/tests/utils/branch-store-locator.test.ts",
  ],
  "packages/cli/src/utils/kb-paths.ts": [
    "packages/cli/tests/utils/kb-paths.test.ts",
  ],
  "packages/cli/src/utils/rule-registry.ts": [
    "packages/cli/tests/utils/rule-registry-classes.test.ts",
  ],
  "packages/cli/src/utils/config.ts": [
    "packages/cli/tests/utils/config-legacy.test.ts",
  ],
  "packages/cli/src/utils/kb-manifest.ts": [
    "packages/cli/tests/utils/kb-manifest.test.ts",
  ],
  "packages/cli/src/utils/content-freshness.ts": [
    "packages/cli/tests/utils/content-freshness-evidence.test.ts",
  ],
  "packages/cli/src/utils/git-repository-context.ts": [
    "packages/cli/tests/utils/git-repository-context-fake.test.ts",
  ],
  "packages/cli/src/utils/branch-store.ts": [
    "packages/cli/tests/utils/branch-store-inspection.test.ts",
  ],
  "packages/cli/src/utils/strict-modeling.ts": [
    "packages/cli/tests/utils/strict-modeling-shape.test.ts",
  ],
  "packages/cli/src/utils/branch-resolver.ts": [
    "packages/cli/tests/utils/branch-resolver-scripted.test.ts",
  ],
  "packages/cli/src/report/relative-time.ts": [
    "packages/cli/tests/report/report-pure.test.ts",
  ],
  "packages/cli/src/report/report-view.ts": [
    "packages/cli/tests/report/report-pure.test.ts",
  ],
  "packages/cli/src/report/brand.ts": [
    "packages/cli/tests/report/report-pure.test.ts",
  ],
  "packages/cli/src/report/repository.ts": [
    "packages/cli/tests/report/report-pure.test.ts",
  ],
  "packages/cli/src/query/service.ts": [
    "packages/cli/tests/query/service.test.ts",
  ],
  "packages/cli/src/relationships/shards.ts": [
    "packages/cli/tests/relationships/shards-mutation.test.ts",
  ],
  "packages/cli/src/extractors/symbols-ts.ts": [
    "packages/cli/tests/extractors/symbols-ts-adapter.test.ts",
  ],
  "packages/cli/src/extractors/symbol-title-match.ts": [
    "packages/cli/tests/extractors/symbol-title-match-rules.test.ts",
  ],
  "packages/cli/src/extractors/playwright-cases.ts": [
    "packages/cli/tests/extractors/playwright-cases-scanner.test.ts",
  ],
  "packages/cli/src/extractors/relationships.ts": [
    "packages/cli/tests/extractors/relationships-convert.test.ts",
  ],
  "packages/cli/src/runtime/detached-snapshot.ts": [
    "packages/cli/tests/runtime/detached-snapshot-attachment.test.ts",
  ],
  "packages/cli/src/runtime/cli-runtime.ts": [
    "packages/cli/tests/runtime/cli-runtime-open.test.ts",
  ],
  "packages/cli/src/signoff/model.ts": [
    "packages/cli/tests/signoff/model-pure.test.ts",
  ],
  "packages/cli/src/signoff/markdown.ts": [
    "packages/cli/tests/signoff/markdown-render.test.ts",
  ],
  "packages/cli/src/signoff/html.ts": [
    "packages/cli/tests/signoff/html-render.test.ts",
  ],
  "packages/cli/src/proof/evaluate.ts": [
    "packages/cli/tests/proof/evaluate-contract.test.ts",
  ],
  "packages/cli/src/proof/integrations.ts": [
    "packages/cli/tests/proof/integrations-config.test.ts",
  ],
  "packages/cli/src/plugins/external-allowlist.ts": [
    "packages/cli/tests/plugins/external-allowlist.test.ts",
  ],
  "packages/cli/src/plugins/approved-source-analyzers.ts": [
    "packages/cli/tests/plugins/approved-source-analyzers.test.ts",
  ],
  "packages/cli/src/plugins/plugin-install-check.ts": [
    "packages/cli/tests/plugins/plugin-install-check.test.ts",
  ],
  "packages/cli/src/plugins/load-plugin.ts": [
    "packages/cli/tests/plugins/load-plugin.test.ts",
  ],
  "packages/cli/src/plugins/project-config.ts": [
    "packages/cli/tests/plugins/project-config.test.ts",
  ],
  "packages/cli/src/plugins/check-policies.ts": [
    "packages/cli/tests/plugins/check-policies.test.ts",
  ],
  "packages/cli/src/plugins/proof-reference-extractors.ts": [
    "packages/cli/tests/plugins/proof-reference-loader.test.ts",
  ],
  "packages/cli/src/plugins/compose-vocabulary-alignment.ts": [
    "packages/cli/tests/plugins/compose-vocabulary-alignment.test.ts",
  ],
  "packages/cli/src/plugins/compose-semantic-classifier.ts": [
    "packages/cli/tests/plugins/compose-semantic-classifier.test.ts",
  ],
  "packages/cli/src/plugins/source-change-analysis.ts": [
    "packages/cli/tests/plugins/source-change-analysis.test.ts",
  ],
  "packages/cli/src/traceability/markdown-validate.ts": [
    "packages/cli/tests/traceability/markdown-validate.test.ts",
    "packages/cli/tests/traceability/markdown-validate-remaining.coverage.test.ts",
  ],
  "packages/cli/src/traceability/staged-migration.ts": [
    "packages/cli/tests/traceability/staged-migration-contract.test.ts",
  ],
  "packages/cli/src/traceability/staged-entity-id-style.ts": [
    "packages/cli/tests/traceability/staged-entity-id-style.test.ts",
  ],
  "packages/cli/src/traceability/impact-git-tree.ts": [
    "packages/cli/tests/traceability/impact-git-tree.test.ts",
  ],
  "packages/cli/src/traceability/impact-policy.ts": [
    "packages/cli/tests/traceability/impact-policy.test.ts",
  ],
  "packages/cli/src/traceability/analysis-gate.ts": [
    "packages/cli/tests/traceability/analysis-gate-contract.test.ts",
  ],
  "packages/cli/src/traceability/evidence-model.ts": [
    "packages/cli/tests/traceability/evidence-model-contract.test.ts",
  ],
  "packages/cli/src/traceability/staged-diagnostics.ts": [
    "packages/cli/tests/traceability/staged-diagnostics-contract.test.ts",
  ],
  "packages/cli/src/traceability/staged-entity-context.ts": [
    "packages/cli/tests/traceability/staged-entity-context.test.ts",
  ],
  "packages/cli/src/traceability/snapshot-knowledge.ts": [
    "packages/cli/tests/traceability/snapshot-knowledge-reader.test.ts",
  ],
  "packages/cli/src/traceability/impact-pr-diff.ts": [
    "packages/cli/tests/traceability/impact-pr-diff.test.ts",
  ],
  "packages/cli/src/traceability/staged-impact-contract.ts": [
    "packages/cli/tests/traceability/staged-impact-contract-rules.test.ts",
  ],
  "packages/cli/src/traceability/commit-amend.ts": [
    "packages/cli/tests/traceability/commit-amend-probe.test.ts",
  ],
  "packages/cli/src/traceability/staged-inventory-drift.ts": [
    "packages/cli/tests/traceability/staged-inventory-drift-contract.test.ts",
    "packages/cli/tests/traceability/staged-inventory-drift.test.ts",
  ],
  "packages/cli/src/traceability/impact-record-validation.ts": [
    "packages/cli/tests/traceability/impact-record-validation.test.ts",
  ],
  "packages/cli/src/traceability/trusted-pr-event.ts": [
    "packages/cli/tests/traceability/trusted-pr-event-scripted.test.ts",
  ],
  "packages/cli/src/traceability/impact-knowledge.ts": [
    "packages/cli/tests/traceability/impact-knowledge.test.ts",
  ],
  "packages/cli/src/traceability/impact-side-evidence.ts": [
    "packages/cli/tests/traceability/impact-side-evidence.test.ts",
  ],
  "packages/cli/src/env/bootstrap.ts": [
    "packages/cli/tests/env/bootstrap-mutation.test.ts",
  ],
  "packages/cli/src/report/html-report.ts": [
    "packages/cli/tests/report/html-report-mutation.test.ts",
  ],
  "packages/cli/src/signoff/collect.ts": [
    "packages/cli/tests/signoff/collect-mutation.test.ts",
  ],
  "packages/cli/src/extractors/manifest.ts": [
    "packages/cli/tests/extractors/manifest-mutation.test.ts",
  ],
  "packages/cli/src/extractors/markdown.ts": [
    "packages/cli/tests/extractors/markdown-mutation.test.ts",
  ],
  "packages/cli/src/extractors/symbols-coordinator.ts": [
    "packages/cli/tests/extractors/symbols-coordinator-mutation.test.ts",
  ],
  "packages/cli/src/extractors/symbol-coordinates.ts": [
    "packages/cli/tests/extractors/symbol-coordinates-mutation.test.ts",
  ],
  "packages/cli/src/proof/command-test-report.ts": [
    "packages/cli/tests/proof/command-test-report-mutation.test.ts",
  ],
  "packages/cli/src/proof/step-runner.ts": [
    "packages/cli/tests/proof/step-runner-mutation.test.ts",
  ],
  "packages/cli/src/proof/inspect.ts": [
    "packages/cli/tests/proof/inspect-mutation.test.ts",
  ],
  "packages/cli/src/proof/integration-plan.ts": [
    "packages/cli/tests/proof/integration-plan-mutation.test.ts",
  ],
};

// Plugin package modules gated the same way: each with the hermetic tests of
// its own package.
export const PLUGIN_MUTATION_MODULES = {
  "packages/swipl/index.js": ["packages/swipl/tests/index.test.ts"],
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
          const file = posix.join(pkg, "tests", rel, entry.name);
          if (!MUTATION_TEST_EXCLUDES.includes(file)) files.push(`./${file}`);
        }
      }
    };
    walk("");
  }
  for (const tests of [
    ...Object.values(CLI_MUTATION_MODULES),
    ...Object.values(PLUGIN_MUTATION_MODULES),
  ]) {
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
    "packages/plugin-sdk/src/**/*.ts",
    "packages/plugin-jev/src/**/*.ts",
    "packages/agent-core/src/**/*.ts",
    "packages/zcode/src/**/*.ts",
    "packages/claude/src/**/*.ts",
    "packages/plugin-ui/src/**/*.ts",
    "packages/plugin-search-hints/src/**/*.ts",
    "packages/plugin-builtin/src/**/*.ts",
    ...Object.keys(CLI_MUTATION_MODULES),
    ...Object.keys(PLUGIN_MUTATION_MODULES),
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
    // Local agent worktrees are whole checkouts of the repository.
    ".claude/worktrees/**",
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
