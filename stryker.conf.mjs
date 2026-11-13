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
 * sandbox. rationale: both read source text that the sandbox instruments, so
 * they always fail the initial run there. The claude distribution test
 * compares the committed hook bundle with the source; the agent-core
 * shared-hook-inputs test parses the host sources for local function bodies,
 * and Stryker's mutant switches make every such body look hand-written.
 */
export const MUTATION_TEST_EXCLUDES = [
  "packages/agent-core/tests/shared-hook-inputs.test.ts",
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
  "packages/cli/src/telemetry-details.ts": [
    "packages/cli/tests/telemetry-details.test.ts",
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
  "packages/cli/src/cli-command.ts": ["packages/cli/tests/cli-command.test.ts"],
  "packages/cli/src/env.ts": ["packages/cli/tests/env.test.ts"],
  "packages/cli/src/provenance-stub.ts": [
    "packages/cli/tests/provenance-stub.test.ts",
  ],
  "packages/cli/src/prolog/utf8-transport.ts": [
    "packages/cli/tests/prolog/utf8-transport-pure.test.ts",
  ],
  "packages/cli/src/cli-errors.ts": ["packages/cli/tests/cli-errors.test.ts"],
  "packages/cli/src/workspace-cwd.ts": [
    "packages/cli/tests/workspace-cwd.test.ts",
  ],
  "packages/cli/src/cli-register-json.ts": [
    "packages/cli/tests/cli-register-json-mutation.test.ts",
    "packages/cli/tests/cli-register-json-routes.test.ts",
  ],
  "packages/cli/src/cli-validate.ts": [
    "packages/cli/tests/cli-validate-mutation.test.ts",
  ],
  "packages/cli/src/search-token-cache.ts": [
    "packages/cli/tests/search-token-cache-mutation.test.ts",
    "packages/cli/tests/search-token-cache.test.ts",
  ],
  "packages/cli/src/cli-register-skills.ts": [
    "packages/cli/tests/cli-register-skills.test.ts",
  ],
  "packages/cli/src/usage-telemetry.ts": [
    "packages/cli/tests/usage-telemetry-mutation.test.ts",
    "packages/cli/tests/usage-telemetry.test.ts",
  ],
  "packages/cli/src/cli-operation-loader.ts": [
    "packages/cli/tests/cli-operation-metadata.test.ts",
    "packages/cli/tests/cli-operation-metadata-remaining.coverage.test.ts",
  ],
  "packages/cli/src/cli-operation-metadata.ts": [
    "packages/cli/tests/cli-operation-metadata.test.ts",
    "packages/cli/tests/cli-operation-metadata-remaining.coverage.test.ts",
  ],
  "packages/cli/src/package-versions.ts": [
    "packages/cli/tests/package-versions.test.ts",
  ],
  "packages/cli/src/performance-trace.ts": [
    "packages/cli/tests/performance-trace.test.ts",
  ],
  "packages/cli/src/cli-register-foundation.ts": [
    "packages/cli/tests/cli-register-foundation.test.ts",
  ],
  "packages/cli/src/cli-register-reporting.ts": [
    "packages/cli/tests/cli-register-reporting.test.ts",
  ],
  "packages/cli/src/cli-register-maintenance.ts": [
    "packages/cli/tests/cli-register-maintenance.test.ts",
  ],
  "packages/cli/src/cli-register-proof.ts": [
    "packages/cli/tests/cli-register-proof.test.ts",
  ],
  "packages/cli/src/cli-protocol.ts": [
    "packages/cli/tests/cli-protocol-mutation.test.ts",
  ],
  "packages/cli/src/cli-json-command.ts": [
    "packages/cli/tests/cli-json-command-mutation.test.ts",
  ],
  "packages/cli/src/update-check.ts": [
    "packages/cli/tests/update-check.test.ts",
  ],
  "packages/cli/src/cli.ts": [
    "packages/cli/tests/cli-main-pure.test.ts",
    "packages/cli/tests/cli-main-mutation.test.ts",
    "packages/cli/tests/cli-main-remaining.coverage.test.ts",
  ],
  "packages/cli/src/prolog/janitor.ts": [
    "packages/cli/tests/prolog/janitor-mutation.test.ts",
  ],
  "packages/cli/src/prolog/error-terms.ts": [
    "packages/cli/tests/prolog/error-terms-parse.test.ts",
  ],
  "packages/cli/src/prolog/store-lock.ts": [
    "packages/cli/tests/prolog/store-lock-mutation.test.ts",
    "packages/cli/tests/prolog/store-lock.test.ts",
  ],
  "packages/cli/src/prolog/swipl-resolver.ts": [
    "packages/cli/tests/prolog/swipl-resolver-mutation.test.ts",
    "packages/cli/tests/prolog/swipl-resolver.test.ts",
  ],
  "packages/cli/src/prolog/codec.ts": [
    "packages/cli/tests/prolog/codec-mutation.test.ts",
    "packages/cli/tests/prolog/codec.test.ts",
    "packages/cli/tests/prolog/codec-literal-edges.test.ts",
    "packages/cli/tests/prolog/codec-coverage.test.ts",
    "packages/cli/tests/prolog/codec-remaining.coverage.test.ts",
  ],
  "packages/cli/src/intent-search.ts": [
    "packages/cli/tests/intent-search-mutation.test.ts",
    "packages/cli/tests/intent-search.test.ts",
    "packages/cli/tests/intent-search.coverage.test.ts",
    "packages/cli/tests/intent-search-remaining.coverage.test.ts",
  ],
  "packages/cli/src/search-answer.ts": [
    "packages/cli/tests/search-answer-mutation.test.ts",
    "packages/cli/tests/search-answer.test.ts",
    "packages/cli/tests/proofs/claims/search-answer-limits.proof.test.ts",
    "packages/cli/tests/search-provenance-stubs.test.ts",
  ],
  "packages/cli/src/commands/status.ts": [
    "packages/cli/tests/commands/discovery-wrappers-mutation.test.ts",
  ],
  "packages/cli/src/commands/gaps.ts": [
    "packages/cli/tests/commands/discovery-wrappers-mutation.test.ts",
  ],
  "packages/cli/src/commands/graph.ts": [
    "packages/cli/tests/commands/discovery-wrappers-mutation.test.ts",
  ],
  "packages/cli/src/commands/search.ts": [
    "packages/cli/tests/commands/discovery-wrappers-mutation.test.ts",
  ],
  "packages/cli/src/commands/query.ts": [
    "packages/cli/tests/commands/discovery-wrappers-mutation.test.ts",
  ],
  "packages/cli/src/commands/coverage.ts": [
    "packages/cli/tests/commands/discovery-wrappers-mutation.test.ts",
  ],
  "packages/cli/src/commands/telemetry.ts": [
    "packages/cli/tests/commands/telemetry-command-mutation.test.ts",
  ],
  "packages/cli/src/commands/usage-remediation.ts": [
    "packages/cli/tests/commands/usage-remediation-mutation.test.ts",
    "packages/cli/tests/commands/usage-remediation.test.ts",
  ],
  "packages/cli/src/commands/proof-explain.ts": [
    "packages/cli/tests/commands/proof-commands-mutation.test.ts",
  ],
  "packages/cli/src/commands/proof-migrate-legacy.ts": [
    "packages/cli/tests/commands/proof-commands-mutation.test.ts",
  ],
  "packages/cli/src/commands/proof-prune.ts": [
    "packages/cli/tests/commands/proof-commands-mutation.test.ts",
  ],
  "packages/cli/src/commands/proof-compact.ts": [
    "packages/cli/tests/commands/proof-commands-mutation.test.ts",
  ],
  "packages/cli/src/commands/skills.ts": [
    "packages/cli/tests/commands/skills-command-mutation.test.ts",
  ],
  "packages/cli/src/commands/check-diff.ts": [
    "packages/cli/tests/commands-coverage/check-diff.test.ts",
    "packages/cli/tests/commands/check-diff.test.ts",
  ],
  "packages/cli/src/commands/migrate-plan-record.ts": [
    "packages/cli/tests/commands/migrate-plan-record-mutation.test.ts",
    "packages/cli/tests/commands/migrate-plan-record.test.ts",
  ],
  "packages/cli/src/commands/sync/extraction.ts": [
    "packages/cli/tests/commands/sync/extraction-mutation.test.ts",
  ],
  "packages/cli/src/commands/sync/errors.ts": [
    "packages/cli/tests/commands/sync-errors-mutation.test.ts",
  ],
  "packages/cli/src/commands/discovery-shared.ts": [
    "packages/cli/tests/commands/discovery-shared-mutation.test.ts",
  ],
  "packages/cli/src/commands/merge-driver.ts": [
    "packages/cli/tests/commands/merge-driver-mutation.test.ts",
    "packages/cli/tests/commands/merge-driver.test.ts",
    "packages/cli/tests/commands-coverage/merge-driver.test.ts",
  ],
  "packages/cli/src/commands/sync/untracked-targets.ts": [
    "packages/cli/tests/commands/sync/untracked-targets-mutation.test.ts",
    "packages/cli/tests/commands/sync/untracked-targets.test.ts",
  ],
  "packages/cli/src/commands/engine.ts": [
    "packages/cli/tests/commands/engine-command-mutation.test.ts",
  ],
  "packages/cli/src/commands/gc.ts": [
    "packages/cli/tests/commands/gc-mutation.test.ts",
  ],
  "packages/cli/src/commands/check-certificates.ts": [
    "packages/cli/tests/commands/check-certificates-mutation.test.ts",
    "packages/cli/tests/commands/check-certificates.test.ts",
    "packages/cli/tests/commands-coverage/check-certificates.test.ts",
  ],
  "packages/cli/src/commands/aggregated-checks.ts": [
    "packages/cli/tests/commands/aggregated-checks.test.ts",
    "packages/cli/tests/commands/aggregated-checks-mutation.test.ts",
  ],
  "packages/cli/src/commands/signoff.ts": [
    "packages/cli/tests/commands/signoff-command-mutation.test.ts",
    "packages/cli/tests/commands/signoff.test.ts",
    "packages/cli/tests/commands-coverage/signoff.test.ts",
  ],
  "packages/cli/src/commands/report.ts": [
    "packages/cli/tests/commands/report-command-mutation.test.ts",
    "packages/cli/tests/commands/report.test.ts",
    "packages/cli/tests/commands-coverage/report.test.ts",
    "packages/cli/tests/commands/report-badge-coverage.test.ts",
  ],
  "packages/cli/src/commands/check-generated.ts": [
    "packages/cli/tests/commands/check-generated-mutation.test.ts",
    "packages/cli/tests/commands-coverage/check-generated.test.ts",
    "packages/cli/tests/commands/check-generated-hook.test.ts",
  ],
  "packages/cli/src/commands/sync/staging.ts": [
    "packages/cli/tests/commands/sync/staging-mutation.test.ts",
    "packages/cli/tests/commands/sync/staging.test.ts",
    "packages/cli/tests/commands/sync/staging-liveness.test.ts",
    "packages/cli/tests/commands/sync/staging-remaining.coverage.test.ts",
  ],
  "packages/cli/src/commands/sync/discovery.ts": [
    "packages/cli/tests/commands/sync/discovery-mutation.test.ts",
    "packages/cli/tests/commands/sync/discovery-coverage.test.ts",
    "packages/cli/tests/commands/sync/discovery-remaining.coverage.test.ts",
    "packages/cli/tests/coverage-isolates/discovery-remaining.coverage.test.ts",
  ],
  "packages/cli/src/commands/init.ts": [
    "packages/cli/tests/commands/init-command-mutation.test.ts",
    "packages/cli/tests/commands/init-coverage.test.ts",
    "packages/cli/tests/commands/init-git-context.test.ts",
    "packages/cli/tests/commands/init-remaining.coverage.test.ts",
    "packages/cli/tests/commands-coverage/init-command.test.ts",
  ],
  "packages/cli/src/commands/discovery-table.ts": [
    "packages/cli/tests/commands/discovery-table-mutation.test.ts",
    "packages/cli/tests/commands-coverage/discovery-table-github-init.test.ts",
  ],
  "packages/cli/src/commands/github-init.ts": [
    "packages/cli/tests/commands/github-init-mutation.test.ts",
    "packages/cli/tests/commands/github-init.test.ts",
    "packages/cli/tests/commands/github-init-remaining.coverage.test.ts",
    "packages/cli/tests/commands-coverage/discovery-table-github-init.test.ts",
  ],
  "packages/cli/src/commands/sync/cache.ts": [
    "packages/cli/tests/commands/sync/cache-mutation.test.ts",
    "packages/cli/tests/sync-cache-pure.test.ts",
    "packages/cli/tests/commands-coverage/sync-cache.test.ts",
    "packages/cli/tests/commands/sync/cache-remaining.coverage.test.ts",
    "packages/cli/tests/commands/sync/compiler-fingerprint.test.ts",
  ],
  "packages/cli/src/commands/hook-managers.ts": [
    "packages/cli/tests/commands/hook-managers-mutation.test.ts",
    "packages/cli/tests/commands/hook-managers.test.ts",
    "packages/cli/tests/commands-coverage/hook-managers.test.ts",
  ],
  "packages/cli/src/commands/init-helpers.ts": [
    "packages/cli/tests/commands/init-helpers-mutation.test.ts",
    "packages/cli/tests/commands/init-helpers.test.ts",
    "packages/cli/tests/commands-coverage/init-helpers.test.ts",
    "packages/cli/tests/commands/install-hook-safety.test.ts",
    "packages/cli/tests/proofs/claims/git-hook-managed-names.proof.test.ts",
    "packages/cli/tests/commands/init-command-mutation.test.ts",
  ],
  "packages/cli/src/commands/usage-metrics.ts": [
    "packages/cli/tests/commands/usage-metrics-mutation.test.ts",
    "packages/cli/tests/commands/usage-metrics.test.ts",
    "packages/cli/tests/commands/usage.in-process.test.ts",
  ],
  "packages/cli/src/commands/branch.ts": [
    "packages/cli/tests/commands/branch-command-mutation.test.ts",
    "packages/cli/tests/commands/branch-remaining.coverage.test.ts",
    "packages/cli/tests/commands/branch.in-process.test.ts",
  ],
  "packages/cli/src/commands/sync/manifest.ts": [
    "packages/cli/tests/commands/sync/manifest-mutation.test.ts",
    "packages/cli/tests/commands/sync/manifest.test.ts",
    "packages/cli/tests/commands-coverage/sync-manifest.test.ts",
    "packages/cli/tests/commands/sync/manifest-remaining.coverage.test.ts",
    "packages/cli/tests/commands/sync/incremental-coordinates.test.ts",
  ],
  "packages/cli/src/commands/legacy-storage-migration.ts": [
    "packages/cli/tests/commands/legacy-storage-migration-mutation.test.ts",
    "packages/cli/tests/commands-coverage/legacy-storage-migration.test.ts",
    "packages/cli/tests/commands/legacy-storage-migration-remaining.coverage.test.ts",
    "packages/cli/tests/commands/legacy-storage-migration.test.ts",
  ],
  "packages/cli/src/commands/sync/persistence.ts": [
    "packages/cli/tests/commands/sync/persistence-mutation.test.ts",
    "packages/cli/tests/commands-coverage/sync-persistence.test.ts",
    "packages/cli/tests/commands/sync/persistence.test.ts",
    "packages/cli/tests/commands/sync/persistence-gap-behaviors.test.ts",
    "packages/cli/tests/commands/sync/persistence-remaining.coverage.test.ts",
    "packages/cli/tests/commands/sync/persistence-reset.test.ts",
  ],
  "packages/cli/src/commands/prove.ts": [
    "packages/cli/tests/commands/prove-mutation.test.ts",
    "packages/cli/tests/commands-coverage/prove.test.ts",
    "packages/cli/tests/proof/prove-command.test.ts",
    "packages/cli/tests/commands/prove-remaining.coverage.test.ts",
    "packages/cli/tests/commands/prove-drift.test.ts",
    "packages/cli/tests/proof/evaluate.test.ts",
    "packages/cli/tests/cli-register-proof-coverage.test.ts",
  ],
  "packages/cli/src/commands/agent-instructions.ts": [
    "packages/cli/tests/commands/agent-instructions-mutation.test.ts",
  ],
  "packages/cli/src/commands/setup-choices.ts": [
    "packages/cli/tests/commands/setup-choices-mutation.test.ts",
  ],
  "packages/cli/src/commands/hooks-install.ts": [
    "packages/cli/tests/commands/hooks-install-mutation.test.ts",
  ],
  "packages/cli/src/traceability/staged-consistency.ts": [
    "packages/cli/tests/traceability/staged-consistency-mutation.test.ts",
  ],
  "packages/cli/src/traceability/validate.ts": [
    "packages/cli/tests/traceability/validate.test.ts",
  ],
  "packages/cli/src/plugins/resolve-package.ts": [
    "packages/cli/tests/plugins/resolve-package.test.ts",
  ],
  "packages/cli/src/plugins/maintenance-source-analysis.ts": [
    "packages/cli/tests/plugins/maintenance-source-analysis-mutation.test.ts",
    "packages/cli/tests/plugins/maintenance-source-analysis.test.ts",
    "packages/cli/tests/plugins/maintenance-source-closure.test.ts",
  ],
  "packages/cli/src/plugins/compose-ontology-packs.ts": [
    "packages/cli/tests/plugins/compose-ontology-packs.test.ts",
  ],
  "packages/cli/src/traceability/staged-file-coverage.ts": [
    "packages/cli/tests/traceability/staged-file-coverage-mutation.test.ts",
  ],
  "packages/cli/src/traceability/git-staged.ts": [
    "packages/cli/tests/traceability/git-staged-mutation.test.ts",
  ],
  "packages/cli/src/traceability/impact-evaluator.ts": [
    "packages/cli/tests/traceability/impact-evaluator-mutation.test.ts",
  ],
  "packages/cli/src/traceability/symbol-extract.ts": [
    "packages/cli/tests/traceability/symbol-extract-mutation.test.ts",
  ],
  "packages/cli/src/plugins/reference-language-suggestion.ts": [
    "packages/cli/tests/plugins/language-pack-relevance.test.ts",
    "packages/cli/tests/plugins/language-pack-suggestion.test.ts",
    "packages/cli/tests/plugins/reference-language-suggestion-mutation.test.ts",
    "packages/cli/tests/plugins/reference-language-suggestion-units.test.ts",
    "packages/cli/tests/plugins/reference-language-workspace.test.ts",
  ],
  "packages/cli/src/traceability/impact-review.ts": [
    "packages/cli/tests/traceability/impact-review-parse.test.ts",
  ],
  "packages/cli/src/plugins/source-classification.ts": [
    "packages/cli/tests/plugins/source-classification.test.ts",
    "packages/cli/tests/plugins/source-classification-cases.test.ts",
  ],
  "packages/cli/src/traceability/staged-symbols-manifest.ts": [
    "packages/cli/tests/traceability/staged-symbols-manifest-mutation.test.ts",
  ],
  "packages/cli/src/plugins/registry.ts": [
    "packages/cli/tests/plugins/registry-mutation.test.ts",
  ],
  "packages/cli/src/plugins/source-analysis-service.ts": [
    "packages/cli/tests/plugins/source-analysis-service-units.test.ts",
    "packages/cli/tests/plugins/source-analysis-service-mutation.test.ts",
  ],
  "packages/cli/src/traceability/temp-kb.ts": [
    "packages/cli/tests/traceability/temp-kb-mutation.test.ts",
  ],
  "packages/cli/src/traceability/git-change-snapshot.ts": [
    "packages/cli/tests/traceability/git-change-snapshot-mutation.test.ts",
  ],
  "packages/cli/src/operations/modeling/logic-modeling.ts": [
    "packages/cli/tests/operations-mutation/modeling/logic-modeling.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-applicability.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-applicability.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-applyplan.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-applyplan.test.ts",
    "packages/cli/tests/operations-mutation/modeling/predicate-applyplan-suggestions.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-binding-hints.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-binding-hints.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-bindings.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-bindings.test.ts",
    "packages/cli/tests/operations-mutation/modeling/predicate-binding-hints.test.ts",
    "packages/cli/tests/operations-mutation/modeling/predicate-applyplan.test.ts",
    "packages/cli/tests/operations-mutation/modeling/predicate-applyplan-suggestions.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-catalog.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-catalog-1.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-catalog-2.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-catalog-3.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-catalog-4.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-catalog-5.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-catalog-6.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-closed-vocabularies.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-usage-hints-1.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-usage-hints-2.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-usage-hints-3.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-usage-hints-4.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-data.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-inference-1.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-inference-1.test.ts",
    "packages/cli/tests/operations-mutation/modeling/predicate-applyplan-suggestions.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-inference-2.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-inference-2.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-inference-3.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-inference-3.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-inference-launcher.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-inference-launcher.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-inference.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-inference.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-loader.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-loader.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-ranker.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-ranker.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-score-1.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-score-1.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-score-2.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-score-2.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-utils.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-utils.test.ts",
  ],
  "packages/cli/src/operations/modeling/requirement-applyplan.ts": [
    "packages/cli/tests/operations-mutation/modeling/requirement-applyplan.test.ts",
  ],
  "packages/cli/src/operations/modeling/requirement-heuristics.ts": [
    "packages/cli/tests/operations-mutation/modeling/requirement-heuristics.test.ts",
  ],
  "packages/cli/src/operations/modeling/requirement-modeler.ts": [
    "packages/cli/tests/operations-mutation/modeling/requirement-modeler.test.ts",
  ],
  "packages/cli/src/operations/modeling/requirement-utils.ts": [
    "packages/cli/tests/operations-mutation/modeling/requirement-utils.test.ts",
  ],
  "packages/cli/src/operations/modeling/vocabulary-alignment.ts": [
    "packages/cli/tests/operations-mutation/modeling/vocabulary-alignment.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-score-3.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-score-3.test.ts",
    "packages/cli/tests/operations-mutation/modeling/predicate-score-3-golden.test.ts",
  ],
  "packages/cli/src/operations/modeling/predicate-vocabulary.ts": [
    "packages/cli/tests/operations-mutation/modeling/predicate-vocabulary.test.ts",
    "packages/cli/tests/operations-mutation/mutation/strict-fact.test.ts",
  ],
  "packages/cli/src/operations/mutation/audit.ts": [
    "packages/cli/tests/operations-mutation/mutation/audit.test.ts",
  ],
  "packages/cli/src/operations/mutation/context-warning.ts": [
    "packages/cli/tests/operations-mutation/mutation/context-warning.test.ts",
  ],
  "packages/cli/src/operations/mutation/entity-projection.ts": [
    "packages/cli/tests/operations-mutation/mutation/entity-projection.test.ts",
  ],
  "packages/cli/src/operations/mutation/firm-decision-guard.ts": [
    "packages/cli/tests/operations-mutation/mutation/firm-decision-guard.test.ts",
  ],
  "packages/cli/src/operations/mutation/omitted-properties.ts": [
    "packages/cli/tests/operations-mutation/mutation/omitted-properties.test.ts",
  ],
  "packages/cli/src/operations/mutation/origin.ts": [
    "packages/cli/tests/operations-mutation/mutation/origin.test.ts",
  ],
  "packages/cli/src/operations/mutation/predicate-vocabulary-guard.ts": [
    "packages/cli/tests/operations-mutation/mutation/predicate-vocabulary-guard.test.ts",
  ],
  "packages/cli/src/operations/mutation/requirement-semantics.ts": [
    "packages/cli/tests/operations-mutation/mutation/requirement-semantics.test.ts",
  ],
  "packages/cli/src/operations/mutation/saga.ts": [
    "packages/cli/tests/operations-mutation/mutation/saga.test.ts",
  ],
  "packages/cli/src/operations/mutation/save.ts": [
    "packages/cli/tests/operations-mutation/mutation/save.test.ts",
  ],
  "packages/cli/src/operations/mutation/serialization.ts": [
    "packages/cli/tests/operations-mutation/mutation/serialization.test.ts",
  ],
  "packages/cli/src/operations/mutation/symbol-granularity.ts": [
    "packages/cli/tests/operations-mutation/mutation/symbol-granularity.test.ts",
  ],
  "packages/cli/src/operations/mutation/uncompiled-source.ts": [
    "packages/cli/tests/operations-mutation/mutation/uncompiled-source.test.ts",
  ],
  "packages/cli/src/operations/mutation/validation.ts": [
    "packages/cli/tests/operations-mutation/mutation/validation.test.ts",
  ],
  "packages/cli/src/operations/mutation/warnings.ts": [
    "packages/cli/tests/operations-mutation/mutation/warnings.test.ts",
  ],
  "packages/cli/src/operations/mutation/what-if.ts": [
    "packages/cli/tests/operations-mutation/mutation/what-if.test.ts",
  ],
  "packages/cli/src/operations/mutation/symbol-compiler-lock.ts": [
    "packages/cli/tests/operations-mutation/mutation/symbol-compiler-lock.test.ts",
  ],
  "packages/cli/src/operations/mutation/workspace-mutation-lock.ts": [
    "packages/cli/tests/operations-mutation/mutation/workspace-mutation-lock.test.ts",
  ],
  "packages/cli/src/operations/mutation/relationships.ts": [
    "packages/cli/tests/operations-mutation/mutation/relationships.test.ts",
  ],
  "packages/cli/src/operations/mutation/stored-entity.ts": [
    "packages/cli/tests/operations-mutation/mutation/stored-entity.test.ts",
    "packages/cli/tests/operations-mutation/mutation/origin.test.ts",
  ],
  "packages/cli/src/operations/mutation/strict-fact.ts": [
    "packages/cli/tests/operations-mutation/mutation/strict-fact.test.ts",
    "packages/cli/tests/operations-coverage/mutation/write-guards.test.ts",
    "packages/cli/tests/operations/requirement-semantics.test.ts",
  ],
  "packages/cli/src/operations/mutation/symbol-refresh.ts": [
    "packages/cli/tests/operations-mutation/mutation/symbol-refresh.test.ts",
    "packages/cli/tests/operations/symbol-refresh-remaining.coverage.test.ts",
  ],
  "packages/cli/src/operations/proof/code-languages.ts": [
    "packages/cli/tests/operations-mutation/proof/code-languages.test.ts",
  ],
  "packages/cli/src/operations/proof/code-runner.ts": [
    "packages/cli/tests/operations-mutation/proof/code-runner.test.ts",
  ],
  "packages/cli/src/operations/proof/compact-receipts.ts": [
    "packages/cli/tests/operations-mutation/proof/compact-receipts.test.ts",
  ],
  "packages/cli/src/operations/proof/migrate-legacy-receipts.ts": [
    "packages/cli/tests/operations-mutation/proof/migrate-legacy-receipts.test.ts",
  ],
  "packages/cli/src/operations/proof/prolog-evaluator.ts": [
    "packages/cli/tests/operations-mutation/proof/prolog-evaluator.test.ts",
  ],
  "packages/cli/src/operations/proof/prune-receipts.ts": [
    "packages/cli/tests/operations-mutation/proof/prune-receipts.test.ts",
  ],
  "packages/cli/src/operations/proof/receipt-compaction.ts": [
    "packages/cli/tests/operations-mutation/proof/receipt-compaction.test.ts",
  ],
  "packages/cli/src/operations/proof/receipt-document.ts": [
    "packages/cli/tests/operations-mutation/proof/receipt-document.test.ts",
  ],
  "packages/cli/src/operations/proof/java-package-shadow.ts": [
    "packages/cli/tests/proofs/java-package-shadow.test.ts",
    "packages/cli/tests/proofs/java-package-shadow-mutation.test.ts",
    "packages/cli/tests/proofs/java-package-shadow-go.test.ts",
    "packages/cli/tests/operations-mutation/proof/java-package-shadow.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/candidate-helpers.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/candidate-helpers.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/candidates.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/candidates.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/claim-restatement.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/claim-restatement.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/conflict-review.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/conflict-review.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/discovery.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/discovery.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/guidance-actions.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/guidance-actions.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/guidance.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/guidance.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/plugin-offers.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/plugin-offers.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/types.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/types.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/validation.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/validation.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/activation.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/activation.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/discovery-evidence.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/discovery-evidence.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/markdown-candidates.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/markdown-candidates.test.ts",
  ],
  "packages/cli/src/operations/migration/entity-body-context.ts": [
    "packages/cli/tests/operations-mutation/migration/entity-body-context.test.ts",
  ],
  "packages/cli/src/operations/migration/entity-type.ts": [
    "packages/cli/tests/operations-mutation/migration/entity-type.test.ts",
  ],
  "packages/cli/src/operations/migration/evidence-floor.ts": [
    "packages/cli/tests/operations-mutation/migration/evidence-floor.test.ts",
  ],
  "packages/cli/src/operations/migration/firm-supersede.ts": [
    "packages/cli/tests/operations-mutation/migration/firm-supersede.test.ts",
  ],
  "packages/cli/src/operations/migration/kb-sources.ts": [
    "packages/cli/tests/operations-mutation/migration/kb-sources.test.ts",
  ],
  "packages/cli/src/operations/migration/origin-backfill.ts": [
    "packages/cli/tests/operations-mutation/migration/origin-backfill.test.ts",
  ],
  "packages/cli/src/operations/migration/polarity-values.ts": [
    "packages/cli/tests/operations-mutation/migration/polarity-values.test.ts",
  ],
  "packages/cli/src/operations/migration/proof-contract-claims.ts": [
    "packages/cli/tests/operations-mutation/migration/proof-contract-claims.test.ts",
  ],
  "packages/cli/src/operations/migration/requirement-status.ts": [
    "packages/cli/tests/operations-mutation/migration/requirement-status.test.ts",
  ],
  "packages/cli/src/operations/migration/superseded-closure.ts": [
    "packages/cli/tests/operations-mutation/migration/superseded-closure.test.ts",
  ],
  "packages/cli/src/operations/migration/supersedes-reason.ts": [
    "packages/cli/tests/operations-mutation/migration/supersedes-reason.test.ts",
  ],
  "packages/cli/src/operations/migration/symbol-coordinates-refresh.ts": [
    "packages/cli/tests/operations-mutation/migration/symbol-coordinates-refresh.test.ts",
  ],
  "packages/cli/src/operations/migration/untrack-symbol-coordinates.ts": [
    "packages/cli/tests/operations-mutation/migration/untrack-symbol-coordinates.test.ts",
  ],
  "packages/cli/src/operations/planning/conflict-review.ts": [
    "packages/cli/tests/operations-mutation/planning/conflict-review.test.ts",
  ],
  "packages/cli/src/operations/planning/migration-refusal.ts": [
    "packages/cli/tests/operations-mutation/planning/migration-refusal.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/analysis-receipt.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/analysis-receipt.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/clauses.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/clauses.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/observation-plan.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/observation-plan.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/predicate-rule.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/predicate-rule.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/proposition-role.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/proposition-role.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/prose-coverage-evaluator.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/prose-coverage-evaluator.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/stored-ledger-drift.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/stored-ledger-drift.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/strict-count-rules.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/strict-count-rules.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/case-preview.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/case-preview.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/shared.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/shared.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/conditional-rules.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/conditional-rules.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/ingestion-boundary.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/ingestion-boundary.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/predicate-rules-core.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/predicate-rules-reexports.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/predicate-rules-policy.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/predicate-rules-reexports.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/predicate-rules-product.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/predicate-rules-reexports.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/predicate-rules-product-tail.ts":
    [
      "packages/cli/tests/operations-mutation/semantic-advisor/predicate-rules-reexports.test.ts",
    ],
  "packages/cli/src/operations/semantic-advisor/predicate-rules-launcher.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/predicate-rules-reexports.test.ts",
  ],
  "packages/cli/src/public/operational-artifacts.ts": [
    "packages/cli/tests/public/operational-artifacts.test.ts",
  ],
  "packages/cli/src/public/evidence-levels.ts": [
    "packages/cli/tests/public-mutation/evidence-levels.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/manifest.ts": [
    "packages/cli/tests/public/impact/manifest.test.ts",
    "packages/cli/tests/public-coverage/impact/impact-small.coverage.test.ts",
  ],
  "packages/cli/src/public/operations/source-path-dangling.ts": [
    "packages/cli/tests/public-coverage/operations/source-path-dangling.coverage.test.ts",
  ],
  "packages/cli/src/public/operations/specs/check-rules.generated.ts": [
    "packages/cli/tests/public-mutation/generated-vocabularies.mutation.test.ts",
  ],
  "packages/cli/src/public/symbol-granularity.generated.ts": [
    "packages/cli/tests/public-mutation/generated-vocabularies.mutation.test.ts",
  ],
  "packages/cli/src/public/schemas/relationship.ts": [
    "packages/cli/tests/public-mutation/schemas-relationship.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/symbol-granularity-check.ts": [
    "packages/cli/tests/public-mutation/operations/symbol-granularity-check.mutation.test.ts",
    "packages/cli/tests/public/symbol-granularity-check.test.ts",
  ],
  "packages/cli/src/public/operations/evidence-floor.ts": [
    "packages/cli/tests/public-mutation/operations/evidence-floor.mutation.test.ts",
    "packages/cli/tests/public-coverage/operations/evidence-floor.coverage.test.ts",
  ],
  "packages/cli/src/public/schemas/entity.ts": [
    "packages/cli/tests/public-mutation/schemas-entity.mutation.test.ts",
  ],
  "packages/cli/src/public/telemetry-acceptance.ts": [
    "packages/cli/tests/public-mutation/telemetry-acceptance.mutation.test.ts",
    "packages/cli/tests/public/telemetry-acceptance.test.ts",
    "packages/cli/tests/public/telemetry-acceptance-edges.test.ts",
  ],
  "packages/cli/src/public/skill-system/errors.ts": [
    "packages/cli/tests/public-mutation/skill-system/errors.mutation.test.ts",
  ],
  "packages/cli/src/public/skill-system/paths.ts": [
    "packages/cli/tests/public-mutation/skill-system/paths.mutation.test.ts",
  ],
  "packages/cli/src/public/skill-system/validation.ts": [
    "packages/cli/tests/public-mutation/skill-system/validation.mutation.test.ts",
  ],
  "packages/cli/src/public/skill-system/loader.ts": [
    "packages/cli/tests/public-mutation/skill-system/loader.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/workspace-snapshot.ts": [
    "packages/cli/tests/public-mutation/operations/workspace-snapshot.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/proof-receipt-projection.ts": [
    "packages/cli/tests/public-mutation/operations/proof-receipt-projection.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/runtime-types.ts": [
    "packages/cli/tests/public-mutation/operations/runtime-types.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/symbol-coordinates-check.ts": [
    "packages/cli/tests/public-mutation/operations/symbol-coordinates-check.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/summaries.ts": [
    "packages/cli/tests/public-mutation/impact/summaries.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/prolog-json.ts": [
    "packages/cli/tests/public-mutation/operations/prolog-json.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/proof-contract-claims.ts": [
    "packages/cli/tests/public-mutation/operations/proof-contract-claims.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/specs/skills.ts": [
    "packages/cli/tests/public-mutation/operations/specs/skills.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/specs/sparql.ts": [
    "packages/cli/tests/public-mutation/operations/specs/sparql.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/specs/composite.ts": [
    "packages/cli/tests/public-mutation/operations/specs/composite.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/diff-meaning.ts": [
    "packages/cli/tests/public-mutation/impact/diff-meaning.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/requirement-statements.ts": [
    "packages/cli/tests/public-mutation/impact/requirement-statements.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/symbol-quality-model.ts": [
    "packages/cli/tests/public-mutation/impact/symbol-quality-model.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/symbol-quality.ts": [
    "packages/cli/tests/public-mutation/impact/symbol-quality.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/diagnostics.ts": [
    "packages/cli/tests/public-mutation/impact/diagnostics.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/source-changes.ts": [
    "packages/cli/tests/public-mutation/impact/source-changes.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/unowned-files.ts": [
    "packages/cli/tests/public-mutation/impact/unowned-files.mutation.test.ts",
  ],
  "packages/cli/src/public/entity-origin.ts": [
    "packages/cli/tests/public-mutation/entity-origin.mutation.test.ts",
  ],
  "packages/cli/src/public/symbol-granularity.ts": [
    "packages/cli/tests/public-mutation/symbol-granularity.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/check-format-shared.ts": [
    "packages/cli/tests/public-mutation/operations/check-format-shared.mutation.test.ts",
  ],
  "packages/cli/src/public/ignore-policy.ts": [
    "packages/cli/tests/public-mutation/ignore-policy.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/node-ports.ts": [
    "packages/cli/tests/public-mutation/operations/node-ports.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/check-helpers.ts": [
    "packages/cli/tests/public-mutation/operations/check-helpers.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/catalog.ts": [
    "packages/cli/tests/public-mutation/operations/catalog.mutation.test.ts",
  ],
  "packages/cli/src/public/proof-fingerprint.ts": [
    "packages/cli/tests/public-mutation/proof-fingerprint.mutation.test.ts",
  ],
  "packages/cli/src/public/diagnostic-usage.ts": [
    "packages/cli/tests/public-mutation/diagnostic-usage.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/result-envelope.ts": [
    "packages/cli/tests/public-mutation/operations/result-envelope.mutation.test.ts",
  ],
  "packages/cli/src/public/telemetry-remediation.ts": [
    "packages/cli/tests/public-mutation/telemetry-remediation.mutation.test.ts",
  ],
  "packages/cli/src/public/distribution-parity.ts": [
    "packages/cli/tests/public-mutation/distribution-parity.mutation.test.ts",
  ],
  "packages/cli/src/public/proof-receipt.ts": [
    "packages/cli/tests/public-mutation/proof-receipt.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/repair-plan.ts": [
    "packages/cli/tests/public-mutation/operations/repair-plan.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/contracts.ts": [
    "packages/cli/tests/public-mutation/operations/contracts.mutation.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/generate.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/generate.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/intent-claims.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/intent-claims.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/presentation.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/presentation.test.ts",
  ],
  "packages/cli/src/operations/bootstrap/requirement-claims.ts": [
    "packages/cli/tests/operations-mutation/bootstrap/requirement-claims.test.ts",
  ],
  "packages/cli/src/operations/migration/inventory-rederive.ts": [
    "packages/cli/tests/operations-mutation/migration/inventory-rederive.test.ts",
  ],
  "packages/cli/src/operations/migration/schema6.ts": [
    "packages/cli/tests/operations-mutation/migration/schema6.test.ts",
    "packages/cli/tests/operations/migration/domain-subjects.test.ts",
  ],
  "packages/cli/src/operations/migration/source-paths.ts": [
    "packages/cli/tests/operations-mutation/migration/source-paths.test.ts",
  ],
  "packages/cli/src/operations/migration/symbol-legacy-links.ts": [
    "packages/cli/tests/operations-mutation/migration/symbol-legacy-links.test.ts",
  ],
  "packages/cli/src/operations/planning/compile-intent.ts": [
    "packages/cli/tests/operations-mutation/planning/compile-intent.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/analyze-prose.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/analyze-prose.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/plugin-orchestration.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/plugin-orchestration.test.ts",
  ],
  "packages/cli/src/operations/semantic-advisor/strict-rules.ts": [
    "packages/cli/tests/operations-mutation/semantic-advisor/strict-rules.test.ts",
  ],
  "packages/cli/src/operations/planning/apply-plan.ts": [
    "packages/cli/tests/operations-mutation/planning/apply-plan/validation.test.ts",
    "packages/cli/tests/operations-mutation/planning/apply-plan/source-writes.test.ts",
    "packages/cli/tests/operations-mutation/planning/apply-plan/bootstrap.test.ts",
    "packages/cli/tests/operations-mutation/planning/apply-plan/compile.test.ts",
    "packages/cli/tests/operations-mutation/planning/apply-plan/recovery.test.ts",
    "packages/cli/tests/operations-mutation/planning/apply-plan/migration.test.ts",
  ],
  "packages/cli/src/operations/proof/explain.ts": [
    "packages/cli/tests/operations-mutation/proof/explain.test.ts",
    "packages/cli/tests/operations-coverage/proof/explain.test.ts",
  ],
  "packages/cli/src/operations/proof/claim-bindings.ts": [
    "packages/cli/tests/operations-coverage/proof/claim-bindings.test.ts",
    "packages/cli/tests/proofs/claim-binding-verdicts.proof.test.ts",
    "packages/cli/tests/proofs/non-numeric-proof-kinds.test.ts",
    "packages/cli/tests/proofs/claim-binding-source-scope.test.ts",
    "packages/cli/tests/operations-mutation/proof/claim-bindings.test.ts",
  ],
  "packages/cli/src/operations/proof/code-models.ts": [
    "packages/cli/tests/operations-coverage/proof/code-models.test.ts",
    "packages/cli/tests/proofs/code-certificate-symbols.test.ts",
    "packages/cli/tests/proofs/claims/code-certificate-settings.proof.test.ts",
    "packages/cli/tests/proofs/non-numeric-proof-kinds.test.ts",
    "packages/cli/tests/proofs/domain-loading.test.ts",
    "packages/cli/tests/proofs/prolog-code-proofs.test.ts",
    "packages/cli/tests/operations-mutation/proof/code-models.test.ts",
  ],
  "packages/cli/src/operations/proof/ingest-proof.ts": [
    "packages/cli/tests/operations-coverage/proof/ingest-proof.test.ts",
    "packages/cli/tests/operations/ingest-proof-remaining.coverage.test.ts",
    "packages/cli/tests/operations/ingest-proof-coverage.test.ts",
    "packages/cli/tests/operations/ingest-proof.test.ts",
    "packages/cli/tests/operations-mutation/proof/ingest-proof.test.ts",
  ],
  "packages/cli/src/operations/mutation/validate-upsert.ts": [
    "packages/cli/tests/operations-mutation/mutation/validate-upsert.test.ts",
    "packages/cli/tests/operations-coverage/mutation/validate-upsert.test.ts",
    "packages/cli/tests/operations/mutation.test.ts",
  ],
  "packages/cli/src/operations/mutation/plan-apply-journal.ts": [
    "packages/cli/tests/operations-mutation/mutation/plan-apply-journal.test.ts",
    "packages/cli/tests/operations-coverage/mutation/plan-apply-journal.test.ts",
    "packages/cli/tests/proofs/claims/plan-apply-journal-version.proof.test.ts",
  ],
  "packages/cli/src/operations/mutation/delete.ts": [
    "packages/cli/tests/operations-mutation/mutation/delete.test.ts",
    "packages/cli/tests/operations-coverage/mutation/delete.test.ts",
    "packages/cli/tests/operations/delete-remaining.coverage.test.ts",
    "packages/cli/tests/operations/delete-coverage.test.ts",
    "packages/cli/tests/operations/apply-plan.test.ts",
  ],
  "packages/cli/src/operations/mutation/upsert.ts": [
    "packages/cli/tests/operations-mutation/mutation/upsert.test.ts",
    "packages/cli/tests/operations-mutation/mutation/upsert-validation.test.ts",
    "packages/cli/tests/operations-coverage/mutation/upsert.test.ts",
    "packages/cli/tests/operations/upsert-coverage.test.ts",
    "packages/cli/tests/operations/upsert-remaining.coverage.test.ts",
    "packages/cli/tests/operations/mutation.test.ts",
    "packages/cli/tests/operations/dry-run-commit-parity.test.ts",
    "packages/cli/tests/operations/validate-upsert-contradiction-preview.test.ts",
    "packages/cli/tests/operations/workspace-path-alias.test.ts",
  ],
  "packages/cli/src/operations/mutation/source-authoring.ts": [
    "packages/cli/tests/operations-mutation/mutation/source-authoring.test.ts",
    "packages/cli/tests/operations-coverage/mutation/source-authoring.test.ts",
    "packages/cli/tests/operations/source-authoring-remaining.coverage.test.ts",
    "packages/cli/tests/operations/source-authoring-coverage.test.ts",
    "packages/cli/tests/operations/source-authoring.test.ts",
    "packages/cli/tests/operations/workspace-path-alias.test.ts",
    "packages/cli/tests/proofs/claims/generated-coordinate-settings.proof.test.ts",
  ],
  "packages/cli/src/operations/proof/code-certificates.ts": [
    "packages/cli/tests/operations-mutation/proof/code-certificates.test.ts",
    "packages/cli/tests/operations-coverage/proof/code-certificates.test.ts",
    "packages/cli/tests/proofs/domain-loading.test.ts",
    "packages/cli/tests/proofs/code-certificate-symbols.test.ts",
  ],
  "packages/cli/src/operations/proof/source-code-readers.ts": [
    "packages/cli/tests/operations-mutation/proof/source-code-readers.test.ts",
    "packages/cli/tests/operations-coverage/proof/readers-and-documents.test.ts",
    "packages/cli/tests/proofs/source-code-readers-mutation.test.ts",
    "packages/cli/tests/proofs/script-references-remaining.coverage.test.ts",
    "packages/cli/tests/proofs/csharp-project-usings.test.ts",
    "packages/cli/tests/proofs/plugin-references.test.ts",
  ],
  "packages/cli/src/operations/proof/prolog-source-reader.ts": [
    "packages/cli/tests/operations-mutation/proof/prolog-source-reader.test.ts",
  ],
  "packages/cli/src/operations/mutation/contradictions.ts": [
    "packages/cli/tests/operations-mutation/mutation/contradictions.test.ts",
    "packages/cli/tests/operations/contradictions-remaining.coverage.test.ts",
  ],
  "packages/cli/src/operations/proof/code-scope.ts": [
    "packages/cli/tests/operations-mutation/proof/code-scope.test.ts",
    "packages/cli/tests/proof/code-scope.test.ts",
    "packages/cli/tests/proof/receipt-binding.test.ts",
  ],
  "packages/cli/src/operations/modeling/model-requirement.ts": [
    "packages/cli/tests/operations-mutation/modeling/model-requirement.test.ts",
    "packages/cli/tests/operations-coverage/modeling/model-requirement.test.ts",
    "packages/cli/tests/operations/model-requirement.coverage.test.ts",
  ],
  "packages/cli/src/operations/modeling/suggest-predicates.ts": [
    "packages/cli/tests/operations-mutation/modeling/suggest-predicates.test.ts",
    "packages/cli/tests/operations-coverage/modeling/suggest-predicates.test.ts",
    "packages/cli/tests/operations/suggest-predicates-remaining.coverage.test.ts",
  ],
  "packages/cli/src/operations/proof/regular-language.ts": [
    "packages/cli/tests/operations-mutation/proof/regular-language.test.ts",
  ],
  "packages/cli/src/public/operations/migration-plan.ts": [
    "packages/cli/tests/public-mutation/operations/migration-plan.mutation.test.ts",
  ],
  "packages/cli/src/public/proof-protocol.ts": [
    "packages/cli/tests/public-mutation/proof-protocol.mutation.test.ts",
  ],
  "packages/cli/src/public/proof-sources.ts": [
    "packages/cli/tests/public-mutation/proof-sources.mutation.test.ts",
    "packages/cli/tests/public-mutation/proof-sources-edges.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/analyzer.ts": [
    "packages/cli/tests/public-mutation/impact/analyzer.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/requirement-quality.ts": [
    "packages/cli/tests/public-mutation/impact/requirement-quality.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/coverage-depth-quality.ts": [
    "packages/cli/tests/public-mutation/impact/coverage-depth-quality.mutation.test.ts",
  ],
  "packages/cli/src/public/impact/full-kb-quality.ts": [
    "packages/cli/tests/public-mutation/impact/full-kb-quality.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/specs/semantic.ts": [
    "packages/cli/tests/public-mutation/operations/specs/semantic.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/specs/reporting.ts": [
    "packages/cli/tests/public-mutation/operations/specs/reporting.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/entity-context.ts": [
    "packages/cli/tests/public-mutation/operations/entity-context.mutation.test.ts",
    "packages/cli/tests/public/entity-context.test.ts",
  ],
  "packages/cli/src/public/operations/source-relationship-parity.ts": [
    "packages/cli/tests/public-mutation/operations/source-relationship-parity.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/symbol-repair-plan.ts": [
    "packages/cli/tests/public-mutation/operations/symbol-repair-plan.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/predicate-schema-conformance.ts": [
    "packages/cli/tests/public-mutation/operations/predicate-schema-conformance.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/origin-review.ts": [
    "packages/cli/tests/public-mutation/operations/origin-review.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/source-analysis-cache.ts": [
    "packages/cli/tests/public-mutation/operations/source-analysis-cache.mutation.test.ts",
    "packages/cli/tests/public/operations/source-analysis-cache.test.ts",
  ],
  "packages/cli/src/public/operations/check-policy-rules.ts": [
    "packages/cli/tests/public-mutation/operations/check-policy-rules.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/decision-firmness.ts": [
    "packages/cli/tests/public-mutation/operations/decision-firmness.mutation.test.ts",
  ],
  "packages/cli/src/engine-daemon.ts": [
    "packages/cli/tests/engine-daemon-mutation.test.ts",
  ],
  "packages/cli/src/prolog.ts": ["packages/cli/tests/prolog-mutation.test.ts"],
  "packages/cli/src/public/operations/check-executor.ts": [
    "packages/cli/tests/public-mutation/operations/check-executor.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/impact-review-preparation.ts": [
    "packages/cli/tests/public-mutation/operations/impact-review-preparation.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/discovery-entities.ts": [
    "packages/cli/tests/public-mutation/operations/discovery-entities.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/legacy-migration-plan.ts": [
    "packages/cli/tests/public-mutation/operations/legacy-migration-plan.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/schema6-check-actions.ts": [
    "packages/cli/tests/public-mutation/operations/schema6-check-actions.mutation.test.ts",
  ],
  "packages/cli/src/public/operations/discovery-executors.ts": [
    "packages/cli/tests/public-mutation/operations/discovery-query.mutation.test.ts",
    "packages/cli/tests/public-mutation/operations/discovery-search.mutation.test.ts",
    "packages/cli/tests/public-mutation/operations/discovery-status.mutation.test.ts",
  ],
  "packages/cli/src/commands/doctor.ts": [
    "packages/cli/tests/doctor-mutation.test.ts",
  ],
  "packages/cli/src/commands/migrate.ts": [
    "packages/cli/tests/migrate-mutation.test.ts",
  ],
  "packages/cli/src/commands/check.ts": [
    "packages/cli/tests/commands-mutation/check/helpers.test.ts",
    "packages/cli/tests/commands-mutation/check/staged-helpers.test.ts",
    "packages/cli/tests/commands-mutation/check/evidence.test.ts",
    "packages/cli/tests/commands-mutation/check/full-check.test.ts",
    "packages/cli/tests/commands-mutation/check/staged-setup.test.ts",
    "packages/cli/tests/commands-mutation/check/staged-rules.test.ts",
    "packages/cli/tests/commands-mutation/check/staged-results.test.ts",
  ],
  "packages/cli/src/commands/sync.ts": [
    "packages/cli/tests/commands-mutation/sync/helpers.test.ts",
    "packages/cli/tests/commands-mutation/sync/sync-setup.test.ts",
    "packages/cli/tests/commands-mutation/sync/sync-plan.test.ts",
    "packages/cli/tests/commands-mutation/sync/sync-shards.test.ts",
    "packages/cli/tests/commands-mutation/sync/sync-semantic.test.ts",
    "packages/cli/tests/commands-mutation/sync/sync-engine.test.ts",
    "packages/cli/tests/commands-mutation/sync/sync-staging.test.ts",
  ],
  "packages/cli/src/engine.ts": ["packages/cli/tests/engine-mutation.test.ts"],
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
