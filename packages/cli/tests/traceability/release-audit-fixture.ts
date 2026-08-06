import { createHash } from "node:crypto";
import { extractFromManifestString } from "../../src/extractors/manifest.js";

type MirrorFixture = Readonly<{
  files: Readonly<Record<string, string>>;
  hashes: Readonly<Record<string, string>>;
}>;

export type AuditInput = Readonly<{
  changedPaths: readonly string[];
  expectedChangedPaths: readonly string[];
  changesets: readonly string[];
  symbolsManifest: string;
  canonicalFiles?: Readonly<Record<string, string>>;
  mirrors?: Readonly<Record<string, MirrorFixture>>;
}>;

const PUBLISHABLE_PACKAGE_SOURCES = {
  "packages/core/src/": "kibi-core",
  "packages/cli/src/": "kibi-cli",
  "packages/mcp/src/": "kibi-mcp",
  "packages/opencode/src/": "kibi-opencode",
  "packages/codex/src/": "kibi-codex",
  "packages/cursor/src/": "kibi-cursor",
} as const;

const PROJECT_SOURCE_ROOTS = [
  "scripts/skillopt-eval/",
  "tools/skillopt/kibi_skillopt/",
  "tools/skillopt/tests/",
] as const;

export const CURRENT_CHANGED_PATHS: readonly string[] = [
  ".changeset/scoped-skill-readers.md",
  ".gitignore",
  "docs/skillopt.md",
  "documentation/requirements/REQ-skillopt-external-adoption-verdict.md",
  "documentation/scenarios/SCEN-skillopt-external-adoption-verdict.md",
  "documentation/symbol-coordinates.yaml",
  "documentation/symbols.yaml",
  "documentation/tests/TEST-skillopt-external-adoption-verdict.md",
  "package.json",
  "packages/cli/src/public/skill-system/errors.ts",
  "packages/cli/src/public/skill-system/loader.ts",
  "packages/cli/src/public/skill-system/paths.ts",
  "packages/cli/src/public/skill-system/types.ts",
  "packages/cli/src/public/skill-system/validation.ts",
  "packages/cli/src/public/skills.ts",
  "packages/cli/tests/skills-scoped-readers.test.ts",
  "packages/cli/tests/traceability/release-audit-corrective.test.ts",
  "packages/cli/tests/traceability/release-audit-fixture.ts",
  "packages/cli/tests/traceability/release-audit.test.ts",
  "packages/cli/tests/traceability/release-scope.ts",
  "packages/cli/tests/traceability/temp-kb-signal.test.ts",
  "packages/mcp/tests/attached-kb-discovery.test.ts",
  "scripts/skillopt-eval/adoption-approved.ts",
  "scripts/skillopt-eval/adoption-durable.ts",
  "scripts/skillopt-eval/adoption-integration.ts",
  "scripts/skillopt-eval/adoption-lock.ts",
  "scripts/skillopt-eval/adoption-snapshot.ts",
  "scripts/skillopt-eval/adoption-types.ts",
  "scripts/skillopt-eval/adoption.ts",
  "scripts/skillopt-eval/artifact-path-error.ts",
  "scripts/skillopt-eval/artifact-path-write.ts",
  "scripts/skillopt-eval/artifact-path.ts",
  "scripts/skillopt-eval/bridge-cli.ts",
  "scripts/skillopt-eval/cli-options.ts",
  "scripts/skillopt-eval/cli-workflow.ts",
  "scripts/skillopt-eval/cli.ts",
  "scripts/skillopt-eval/contracts/episode.ts",
  "scripts/skillopt-eval/fixtures/fixture-claim.ts",
  "scripts/skillopt-eval/fixtures/materialize.ts",
  "scripts/skillopt-eval/fixtures/predicate-corpus.ts",
  "scripts/skillopt-eval/fixtures/predicate-matrix.ts",
  "scripts/skillopt-eval/held-out-cell-binding.ts",
  "scripts/skillopt-eval/held-out-completeness.ts",
  "scripts/skillopt-eval/held-out-eligibility.ts",
  "scripts/skillopt-eval/held-out-evaluation.ts",
  "scripts/skillopt-eval/held-out-evidence.ts",
  "scripts/skillopt-eval/held-out-execution-lease.ts",
  "scripts/skillopt-eval/held-out-receipt-io.ts",
  "scripts/skillopt-eval/held-out-receipt-store.ts",
  "scripts/skillopt-eval/held-out-review.ts",
  "scripts/skillopt-eval/offline-artifacts.ts",
  "scripts/skillopt-eval/orchestration-store.ts",
  "scripts/skillopt-eval/orchestration.ts",
  "scripts/skillopt-eval/preflight-contracts.ts",
  "scripts/skillopt-eval/preflight-io.ts",
  "scripts/skillopt-eval/prepared-root.ts",
  "scripts/skillopt-eval/real-workflow-setup.ts",
  "scripts/skillopt-eval/real-workflow-types.ts",
  "scripts/skillopt-eval/real-workflow.ts",
  "scripts/skillopt-eval/report.ts",
  "scripts/skillopt-eval/runtime/bridge-cli-execution.ts",
  "scripts/skillopt-eval/runtime/bridge-cli-options.ts",
  "scripts/skillopt-eval/runtime/codex-cell-runner.ts",
  "scripts/skillopt-eval/runtime/file-bridge.ts",
  "scripts/skillopt-eval/runtime/skill-assembly.ts",
  "scripts/skillopt-eval/runtime/task-fixture.ts",
  "scripts/skillopt-eval/scoring/held-out-predicate.ts",
  "scripts/skillopt-eval/source-tree-hash.ts",
  "scripts/skillopt-eval/tests/adoption-exactly-once.test.ts",
  "scripts/skillopt-eval/tests/adoption-lock.test.ts",
  "scripts/skillopt-eval/tests/adoption-recovery.test.ts",
  "scripts/skillopt-eval/tests/adoption.test.ts",
  "scripts/skillopt-eval/tests/artifact-path.test.ts",
  "scripts/skillopt-eval/tests/authorization-broker.test.ts",
  "scripts/skillopt-eval/tests/bridge-cli.test.ts",
  "scripts/skillopt-eval/tests/catalog.test.ts",
  "scripts/skillopt-eval/tests/cli-workflow.test.ts",
  "scripts/skillopt-eval/tests/codex-cell-runner-rejection.test.ts",
  "scripts/skillopt-eval/tests/docs-contract.test.ts",
  "scripts/skillopt-eval/tests/episode-contract.test.ts",
  "scripts/skillopt-eval/tests/file-bridge.test.ts",
  "scripts/skillopt-eval/tests/fixture-private.test.ts",
  "scripts/skillopt-eval/tests/fixture-public.test.ts",
  "scripts/skillopt-eval/tests/fixtures/adoption-fixtures.ts",
  "scripts/skillopt-eval/tests/fixtures/adoption-once-fixtures.ts",
  "scripts/skillopt-eval/tests/held-out-evaluation-concurrency.test.ts",
  "scripts/skillopt-eval/tests/held-out-evaluation-test-helpers.ts",
  "scripts/skillopt-eval/tests/held-out-evaluation.test.ts",
  "scripts/skillopt-eval/tests/held-out-receipt-store.test.ts",
  "scripts/skillopt-eval/tests/mcp-startup-probe.test.ts",
  "scripts/skillopt-eval/tests/prepared-root.test.ts",
  "scripts/skillopt-eval/tests/promise-assertion-hygiene.test.ts",
  "scripts/skillopt-eval/tests/real-workflow.test.ts",
  "scripts/skillopt-eval/tests/report.test.ts",
  "scripts/skillopt-eval/tests/runtime-config.test.ts",
  "scripts/skillopt-eval/tests/scoring-gates.test.ts",
  "scripts/skillopt-eval/tests/skill-assembly.test.ts",
  "scripts/skillopt-eval/tests/skill-reader-lock.test.ts",
  "scripts/skillopt-eval/tests/source-tree-hash.test.ts",
  "scripts/skillopt-eval/tests/task-fixture.test.ts",
  "scripts/skillopt-eval/tests/verify-harness.test.ts",
  "scripts/skillopt-eval/training-setup.ts",
  "scripts/skillopt-eval/verification-harness-options.ts",
  "scripts/skillopt-eval/verify-harness.ts",
  "scripts/sync-agent-skills.ts",
  "tools/skillopt/README.md",
  "tools/skillopt/kibi_skillopt/__main__.py",
  "tools/skillopt/kibi_skillopt/adapter.py",
  "tools/skillopt/kibi_skillopt/bridge_runner.py",
  "tools/skillopt/kibi_skillopt/models.py",
  "tools/skillopt/tests/test_adapter_contract.py",
  "tools/skillopt/tests/test_adapter_invocation_contract.py",
  "tools/skillopt/tests/test_adapter_lineage_contract.py",
  "tools/skillopt/tests/test_bridge.py",
  "tools/skillopt/tests/test_bridge_process_cleanup.py",
  "tools/skillopt/tests/test_model_validation_errors.py",
  "tools/skillopt/tests/test_trainer_contract.py",
];

function releasedPackages(changesets: readonly string[]): ReadonlySet<string> {
  const releases = changesets.flatMap((changeset) =>
    Array.from(
      changeset.matchAll(/^"([^"]+)":\s*(?:major|minor|patch)$/gm),
    ).map((match) => match[1] ?? ""),
  );
  return new Set(releases);
}

function changedPublishablePackages(
  changedPaths: readonly string[],
): readonly string[] {
  return Object.entries(PUBLISHABLE_PACKAGE_SOURCES).flatMap(
    ([sourcePath, packageName]) =>
      changedPaths.some((path) => path.startsWith(sourcePath))
        ? [packageName]
        : [],
  );
}

function hasTechnicalFirstSummary(changeset: string): boolean {
  const summary = changeset.split(/^---\r?$/m)[2]?.trim() ?? "";
  return /^(?:feat|fix|refactor|test|docs|chore)(?:\([^\n)]+\))?:/i.test(
    summary,
  );
}

function isTestSource(path: string): boolean {
  return path.includes("/tests/") || /\.test\.[cm]?[jt]sx?$/.test(path);
}

function isTraceableChangedPath(path: string): boolean {
  return (
    Object.keys(PUBLISHABLE_PACKAGE_SOURCES).some((sourcePath) =>
      path.startsWith(sourcePath),
    ) ||
    (path.startsWith("packages/") && isTestSource(path)) ||
    PROJECT_SOURCE_ROOTS.some((sourcePath) => path.startsWith(sourcePath))
  );
}

function traceabilityFindings(input: AuditInput): readonly string[] {
  const traceableChangedPaths = input.changedPaths.filter(
    isTraceableChangedPath,
  );
  const symbols = extractFromManifestString(
    input.symbolsManifest,
    "documentation/symbols.yaml",
  ).filter(
    (symbol) =>
      symbol.sourceFile !== undefined &&
      input.changedPaths.includes(symbol.sourceFile),
  );

  const missingSymbolFindings = traceableChangedPaths.flatMap((path) =>
    symbols.some((symbol) => symbol.sourceFile === path)
      ? []
      : [`missing manifest symbol for ${path}`],
  );

  return [
    ...missingSymbolFindings,
    ...symbols.flatMap((symbol) => {
      const relationshipTypes = new Set(
        symbol.relationships.map((relationship) => relationship.type),
      );
      if (isTestSource(symbol.sourceFile ?? "")) {
        return relationshipTypes.has("executable_for")
          ? []
          : [`missing executable_for for ${symbol.entity.id}`];
      }

      const findings: string[] = [];
      if (relationshipTypes.has("relates_to")) {
        findings.push(
          `generic relationship is not traceability evidence for ${symbol.entity.id}`,
        );
      }
      if (!relationshipTypes.has("implements")) {
        findings.push(`missing implements for ${symbol.entity.id}`);
      }
      if (!relationshipTypes.has("covered_by")) {
        findings.push(`missing covered_by for ${symbol.entity.id}`);
      }
      return findings;
    }),
  ];
}

function mirrorFindings(input: AuditInput): readonly string[] {
  const { canonicalFiles, mirrors } = input;
  if (canonicalFiles === undefined || mirrors === undefined) {
    return [];
  }

  return Object.entries(mirrors).flatMap(([target, mirror]) =>
    Object.entries(canonicalFiles).flatMap(([path, canonical]) => {
      const expectedHash = createHash("sha256").update(canonical).digest("hex");
      const findings: string[] = [];
      if (mirror.files[path] !== canonical) {
        findings.push(`mirror content drift for ${target}/${path}`);
      }
      if (mirror.hashes[path] !== expectedHash) {
        findings.push(`mirror hash drift for ${target}/${path}`);
      }
      return findings;
    }),
  );
}

function isAbsolutePath(path: string): boolean {
  return (
    path.startsWith("/") ||
    path.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(path)
  );
}

function pathListFindings(input: AuditInput): readonly string[] {
  const paths = [
    ...new Set([...input.changedPaths, ...input.expectedChangedPaths]),
  ];
  const absolutePathFindings = paths
    .filter(isAbsolutePath)
    .map((path) => `absolute path is not allowed: ${path}`);
  if (absolutePathFindings.length > 0) {
    return absolutePathFindings;
  }

  return input.changedPaths.length === input.expectedChangedPaths.length &&
    input.changedPaths.every(
      (path, index) => path === input.expectedChangedPaths[index],
    )
    ? []
    : ["changed paths do not exactly match expectedChangedPaths"];
}

export function detectScopeDrift(
  actualPaths: readonly string[],
  scopePaths: readonly string[],
): readonly string[] {
  if (actualPaths.length !== scopePaths.length) {
    return ["changed paths do not exactly match expected scope"];
  }
  const sortedActual = [...actualPaths].sort();
  const sortedScope = [...scopePaths].sort();
  for (let i = 0; i < sortedActual.length; i++) {
    if (sortedActual[i] !== sortedScope[i]) {
      return ["changed paths do not exactly match expected scope"];
    }
  }
  return [];
}
export function auditReleaseTraceability(input: AuditInput): readonly string[] {
  const pathFindings = pathListFindings(input);
  if (pathFindings.length > 0) {
    return pathFindings;
  }

  const releases = releasedPackages(input.changesets);
  const releaseFindings = changedPublishablePackages(
    input.changedPaths,
  ).flatMap((packageName) =>
    releases.has(packageName) ? [] : [`missing changeset for ${packageName}`],
  );
  const summaryFindings = input.changesets.some(hasTechnicalFirstSummary)
    ? ["changeset summary must be human-readable first"]
    : [];
  return [
    ...releaseFindings,
    ...summaryFindings,
    ...traceabilityFindings(input),
    ...mirrorFindings(input),
  ];
}
