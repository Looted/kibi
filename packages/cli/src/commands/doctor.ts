/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BootstrapKibiEnvironmentResult,
  type EnvValueSource,
  bootstrapKibiEnvironment,
  secretSourceFromBootstrap,
} from "../env/bootstrap.js";
import { kibiPackageVersions } from "../package-versions.js";
import {
  describeConfiguredCapabilityPlugins,
  readProjectKibiConfig,
} from "../plugins/project-config.js";
import { workspaceReferenceLanguageNote } from "../plugins/reference-language-suggestion.js";
import {
  type ResolvedSwipl,
  SwiplResolutionError,
  inspectSwiplBundle,
  probeRequiredLibraries,
  resolveSwipl,
} from "../prolog/swipl-resolver.js";
import {
  buildMigrationPlan,
  migrationAction,
} from "../public/operations/migration-plan.js";
import { noteCliErrorCategory } from "../usage-telemetry.js";
import {
  resolveBranchAttachment,
  resolveReadBranchAttachment,
} from "../utils/branch-resolver.js";
import {
  branchStoreCompilation,
  inspectBranchStore,
  storeLockTakeoverReason,
  uncompiledBranchStoreReason,
} from "../utils/branch-store.js";
import {
  LEGACY_KB_MIGRATION_COMMAND,
  LEGACY_KB_MIGRATION_NOTE,
} from "../utils/config.js";
import {
  type GitRepositoryContext,
  resolveGitRepository,
} from "../utils/git-repository-context.js";
import { readKbManifestStatus } from "../utils/kb-manifest.js";
import {
  manifestMergeDriverGaps,
  mergeDriverSetup,
} from "../utils/merge-driver-setup.js";
import { LATEST_KB_SCHEMA_VERSION } from "../utils/schema-version.js";
import {
  type DetectedHookManager,
  detectHookManager,
  hookManagerCommands,
  missingKibiHookCommands,
} from "./hook-managers.js";
import {
  KIBI_HOOK_BEGIN,
  type ManagedHookName,
  hasManagedHooks,
  outdatedManagedHooks,
} from "./init-helpers.js";
import { planLegacyStorageMigration } from "./legacy-storage-migration.js";

/**
 * First-party plugin diagnostics known without importing the package.
 * Generic third-party plugins report package/capability/mode/declared only.
 */
// implements REQ-kibi-env-bootstrap, REQ-capability-plugin-configuration-v1
const FIRST_PARTY_PLUGIN_SECRETS: Readonly<Record<string, readonly string[]>> =
  {
    "kibi-plugin-jev": ["TYPESAFE_API_KEY"],
  };

/** Static Jev defaults — must stay aligned with kibi-plugin-jev (no import). */
const JEV_DEFAULT_MODEL = "jev-latest";
const JEV_MAX_TIMEOUT_MS = 120_000;

interface DoctorCheckResult {
  passed: boolean;
  /** Passed, but something the operator should fix (shown with "!"). */
  warning?: boolean;
  message: string;
  remediation?: string;
  /** Structured facts for JSON consumers (for example SWI-Prolog source/path/version). */
  details?: Record<string, unknown>;
}

interface DoctorCheck {
  name: string;
  check: () => DoctorCheckResult | Promise<DoctorCheckResult>;
}

export interface DoctorOptions {
  format?: "json" | "table";
}

// implements REQ-kibi-anonymous-usage-telemetry
/** `doctor:capability_plugins+git_hooks` for the checks that failed. */
export function doctorFailureCategory(
  results: readonly { name: string; passed: boolean }[],
): string | undefined {
  const failed = results
    .filter((result) => !result.passed)
    .map((result) =>
      result.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, ""),
    );
  return failed.length === 0 ? undefined : `doctor:${failed.join("+")}`;
}

// implements REQ-003
export async function doctorCommand(
  options: DoctorOptions = {},
): Promise<{ exitCode: number }> {
  // The repository context is per-diagnostic-run state: clearing here keeps
  // repeated in-process invocations honest when core.hooksPath changes
  // between runs, without introducing another ambient cache.
  cachedRepositoryContext = undefined;
  const checks: DoctorCheck[] = [
    {
      name: "SWI-Prolog",
      check: checkSWIProlog,
    },
    {
      name: ".kb/ directory",
      check: checkKbDirectory,
    },
    {
      name: ".kb/ manifest",
      check: checkKbManifest,
    },
    {
      name: "Canonical storage",
      check: checkLegacyStorage,
    },
    {
      name: "Git repository",
      check: checkGitRepository,
    },
    {
      name: "Branch store",
      check: checkBranchStore,
    },
    {
      name: "Git hooks",
      check: checkGitHooks,
    },
    {
      name: "pre-commit hook",
      check: checkPreCommitHook,
    },
    {
      name: "post-rewrite hook",
      check: checkPostRewriteHook,
    },
    {
      name: "Kibi-managed hook sections",
      check: checkManagedHookSections,
    },
    {
      name: "Manifest merge driver",
      check: checkManifestMergeDriver,
    },
    {
      name: "Capability plugins",
      check: checkCapabilityPlugins,
    },
    {
      name: "Engine daemon",
      check: checkEngineDaemon,
    },
  ];

  const results = [];
  for (const { name, check } of checks) {
    results.push({ name, ...(await check()) });
  }
  const allPassed = results.every((result) => result.passed);
  // Usage telemetry names the failing checks by their fixed names.
  noteCliErrorCategory(doctorFailureCategory(results));
  const warnings = results.filter(
    (result) => result.passed && result.warning === true,
  ).length;
  const runtime = await runtimeProvenance();
  const packageActions = await packageMigrationActions(runtime);
  const migrationPlan = buildMigrationPlan({
    expected: {
      branch: null,
      kbBranch: null,
      configHash: null,
    },
    evaluatedDomains: ["package"],
    actions: packageActions,
  });
  if (options.format === "json") {
    console.log(
      JSON.stringify(
        {
          version: "kibi.doctor.v1",
          passed: allPassed,
          warnings,
          runtime,
          checks: results,
          migrationPlan,
        },
        null,
        2,
      ),
    );
    return { exitCode: allPassed ? 0 : 1 };
  }

  console.log("Kibi Environment Diagnostics\n");
  for (const result of results) {
    const warned = result.passed && result.warning === true;
    const status = !result.passed ? "✗" : warned ? "!" : "✓";
    console.log(`${status} ${result.name}: ${result.message}`);
    if ((!result.passed || warned) && result.remediation)
      console.log(`  → ${result.remediation}`);
  }
  console.log();

  if (allPassed && warnings > 0) {
    console.log(
      `All required checks passed, with ${warnings} warning(s) above (marked !).`,
    );
    return { exitCode: 0 };
  }
  if (allPassed) {
    console.log("All checks passed! Your environment is ready.");
    return { exitCode: 0 };
  }
  console.log("Some checks failed. Please address the issues above.");
  return { exitCode: 1 };
}

export async function detectExecuteApplyPlanExport(
  load: () => Promise<{ executeApplyPlan?: unknown }> = () =>
    import("../public/operations/index.js"),
): Promise<boolean> {
  try {
    const operations = await load();
    return typeof operations.executeApplyPlan === "function";
  } catch {
    return false;
  }
}

export async function packageMigrationActions(
  runtime: Readonly<Record<string, unknown>>,
) {
  const actions = [];
  const versions = ["cliVersion", "coreVersion", "mcpVersion"].filter(
    (key) => runtime[key] === "unresolved" || runtime[key] === "unknown",
  );
  if (versions.length > 0) {
    actions.push(
      migrationAction({
        id: "package-provenance-unresolved",
        code: "package_provenance_unresolved",
        category: "package",
        safety: "operator",
        invocation: {
          kind: "review",
          instruction:
            "Install one coordinated Kibi artifact set and rerun kibi doctor; Kibi never selects a package manager or rewrites dependency configuration.",
        },
        evidence: { unresolvedVersions: versions },
        dispositionRequired: true,
      }),
    );
  }
  const cliVersion =
    typeof runtime.cliVersion === "string" ? runtime.cliVersion : "unknown";
  const mcpCliRange =
    typeof runtime.mcpCliRange === "string" ? runtime.mcpCliRange : "unknown";
  if (
    cliVersion !== "unknown" &&
    mcpCliRange !== "unknown" &&
    !satisfiesCaretRange(cliVersion, mcpCliRange)
  ) {
    actions.push(
      migrationAction({
        id: "package-mcp-cli-range-mismatch",
        code: "package_dependency_range_mismatch",
        category: "package",
        safety: "operator",
        invocation: {
          kind: "review",
          instruction:
            "Install a newly versioned coordinated Kibi package set whose MCP CLI dependency range includes the installed CLI; project-local overrides are temporary and Kibi never edits dependency configuration.",
        },
        evidence: { cliVersion, mcpCliRange },
        dispositionRequired: true,
      }),
    );
  }
  if (runtime.executeApplyPlanExported === false) {
    actions.push(
      migrationAction({
        id: "package-cli-export-surface-drift",
        code: "package_export_surface_drift",
        category: "package",
        safety: "operator",
        invocation: {
          kind: "review",
          instruction:
            "Treat same-version artifacts with different exports as a release defect: obtain a newly versioned CLI/MCP pair and do not downgrade receipts or hand-edit package metadata.",
        },
        evidence: { executeApplyPlanExported: false },
        dispositionRequired: true,
      }),
    );
  }
  return actions;
}

function satisfiesCaretRange(version: string, range: string): boolean {
  const match = range.trim().match(/^\^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return true;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const actual = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!actual) return false;
  const aMajor = Number(actual[1]);
  const aMinor = Number(actual[2]);
  const aPatch = Number(actual[3]);
  return (
    aMajor === major &&
    (aMinor > minor || (aMinor === minor && aPatch >= patch))
  );
}

async function runtimeProvenance(): Promise<Record<string, unknown>> {
  const packagePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "package.json",
  );
  let cli: Record<string, unknown> = {};
  try {
    cli = JSON.parse(readFileSync(packagePath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    // Keep doctor JSON useful even from an unusual packed entrypoint.
  }
  const core = resolveInstalledPackageInfo("kibi-core");
  const mcp = resolveInstalledPackageInfo("kibi-mcp");
  const executeApplyPlanExported = await detectExecuteApplyPlanExport();
  return {
    cliVersion: typeof cli.version === "string" ? cli.version : "unknown",
    coreVersion: core.version,
    mcpVersion: mcp.version,
    coreRange:
      cli.dependencies && typeof cli.dependencies === "object"
        ? ((cli.dependencies as Record<string, unknown>)["kibi-core"] ??
          "unknown")
        : "unknown",
    mcpCliRange: mcp.dependencies?.["kibi-cli"] ?? "unknown",
    executeApplyPlanExported,
    entrypoint: process.argv[1] ?? "unknown",
    packageVersions: kibiPackageVersions(),
    locations: {
      cli: packagePath,
      cliEntrypoint: process.argv[1] ?? "unknown",
      core: core.path,
      coreEntrypoint: core.entrypoint,
      mcp: mcp.path,
      mcpEntrypoint: mcp.entrypoint,
    },
  };
}

interface InstalledPackageInfo {
  version: string;
  path: string;
  entrypoint: string;
  dependencies?: Record<string, string> | undefined;
}

function packageInfoFromManifest(
  manifestPath: string,
): InstalledPackageInfo | undefined {
  let metadata: {
    version?: unknown;
    main?: unknown;
    dependencies?: unknown;
  };
  try {
    metadata = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    // Missing or unreadable manifest is not usable provenance.
    return undefined;
  }
  return {
    version:
      typeof metadata.version === "string" ? metadata.version : "unknown",
    path: manifestPath,
    entrypoint:
      typeof metadata.main === "string"
        ? path.resolve(path.dirname(manifestPath), metadata.main)
        : "unknown",
    dependencies:
      metadata.dependencies && typeof metadata.dependencies === "object"
        ? (metadata.dependencies as Record<string, string>)
        : undefined,
  };
}

export function nextAncestorDirectory(current: string): string | undefined {
  const parent = path.dirname(current);
  return parent === current ? undefined : parent;
}

export function nearestNamedPackageManifest(
  startDir: string,
  name: string,
): string | undefined {
  let current: string | undefined = startDir;
  while (current !== undefined) {
    const candidate = path.join(current, "package.json");
    try {
      const metadata = JSON.parse(readFileSync(candidate, "utf8")) as {
        name?: unknown;
      };
      if (metadata.name === name) return candidate;
    } catch {
      // Keep walking; an unrelated or absent manifest is not a match.
    }
    current = nextAncestorDirectory(current);
  }
  return undefined;
}

function resolveInstalledPackageInfo(name: string): InstalledPackageInfo {
  const require = createRequire(import.meta.url);

  // Preferred: direct manifest subpath. Works when the package exports
  // "./package.json" or has no restrictive exports map at all.
  try {
    const info = packageInfoFromManifest(
      require.resolve(`${name}/package.json`),
    );
    if (info) return info;
  } catch {
    // Fall through to entrypoint-based resolution below.
  }

  // Fallback: a tight exports map may hide ./package.json while the package
  // itself is installed and runnable. Resolve the entrypoint, then walk up to
  // the nearest manifest that actually names the target package so doctor
  // never reports a coordinated install as unresolved.
  try {
    const entrypoint = require.resolve(name);
    const manifestPath = nearestNamedPackageManifest(
      path.dirname(entrypoint),
      name,
    );
    const info = manifestPath
      ? packageInfoFromManifest(manifestPath)
      : undefined;
    if (info) return info;
  } catch {
    // The package is genuinely absent from this install graph.
  }

  // Last resort: sibling workspace package inside the Kibi monorepo.
  const local = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    name.replace(/^kibi-/, ""),
    "package.json",
  );
  if (existsSync(local)) {
    const info = packageInfoFromManifest(local);
    if (info) return info;
  }
  return {
    version: "unresolved",
    path: "unresolved",
    entrypoint: "unresolved",
    dependencies: undefined,
  };
}

const SWIPL_SOURCE_LABELS = {
  env: "KIBI_SWIPL",
  bundled: "the bundled build",
  path: "PATH",
} as const;

// implements REQ-prolog-doctor-runtime-report
function checkSWIProlog(): DoctorCheckResult {
  let resolved: ResolvedSwipl;
  try {
    resolved = resolveSwipl();
  } catch (error) {
    if (!(error instanceof SwiplResolutionError)) throw error;
    const [headline = error.message, ...guidance] = error.message.split("\n");
    return {
      passed: false,
      message: headline,
      ...(guidance.length === 0 ? {} : { remediation: guidance.join("\n   ") }),
      details: {
        code: error.code,
        platform: error.platform,
        ...(error.packageName === undefined
          ? {}
          : { bundledPackage: error.packageName }),
      },
    };
  }

  const details: Record<string, unknown> = {
    source: resolved.source,
    path: resolved.bin,
    version: resolved.version,
    ...(resolved.home === undefined ? {} : { home: resolved.home }),
  };
  const summary = `Version ${resolved.version} from ${SWIPL_SOURCE_LABELS[resolved.source]} at ${resolved.bin}`;
  const probe = probeRequiredLibraries(resolved);
  if (probe.kind !== "ok") {
    const remediation =
      resolved.source === "bundled"
        ? "Reinstall the bundled SWI-Prolog package, or set KIBI_SWIPL=system to use swipl from PATH."
        : "Install a full SWI-Prolog 9.0+ distribution that provides these libraries (for example swi-prolog rather than swi-prolog-nox or a minimal build), or point KIBI_SWIPL at one.";
    if (probe.kind === "missing") {
      return {
        passed: false,
        message: `${summary}; cannot load required libraries: ${probe.libraries.join(", ")}`,
        remediation,
        details: { ...details, missingLibraries: probe.libraries },
      };
    }
    return {
      passed: false,
      message: `${summary}; the required-library load check could not run (${probe.detail})`,
      remediation,
      details,
    };
  }

  let bundleNote = "";
  if (resolved.source === "path") {
    try {
      const bundle = inspectSwiplBundle();
      if (bundle.state === "missing") {
        bundleNote = `; bundled ${bundle.packageName} is not installed (npm install --save-dev ${bundle.packageName})`;
      }
    } catch {
      // The bundle note is advisory; never let it fail the check.
    }
  }
  return {
    passed: true,
    message: `${summary}; required libraries load${bundleNote}`,
    details,
  };
}

/**
 * Read-only view of package.json plugin activation.
 * Does not import or execute plugin packages (no loadPluginPackage / dynamic import).
 */
// implements REQ-capability-plugin-configuration-v1, REQ-kibi-env-bootstrap
function checkCapabilityPlugins(): {
  // implements REQ-cli-doctor, REQ-capability-plugin-observable-behavior-v1
  passed: boolean;
  warning?: boolean;
  message: string;
  remediation?: string;
} {
  try {
    const bootstrap = bootstrapKibiEnvironment();
    const workspaceRoot = bootstrap.workspaceRoot;
    const rows = describeConfiguredCapabilityPlugins(workspaceRoot);
    const languages = workspaceReferenceLanguageNote(workspaceRoot);
    if (rows.length === 0) {
      return {
        passed: true,
        message: "None configured; builtin providers only",
        ...(languages === null
          ? {}
          : { warning: true, remediation: languages }),
      };
    }
    const parts: string[] = rows.map(
      (row) =>
        `${row.package} ${row.capability} ${row.mode} declared=${row.declared ? "yes" : "no"}`,
    );

    if (rows.some((row) => !row.declared)) {
      return {
        passed: false,
        message: parts.join("; "),
        remediation:
          "Add the configured plugin package to dependencies, devDependencies, or optionalDependencies, or remove the kibi.plugins activation entry.",
      };
    }

    const config = readProjectKibiConfig(workspaceRoot);
    const packages = [
      ...new Set((config.plugins ?? []).map((plugin) => plugin.package)),
    ];
    const missingSecrets: string[] = [];
    // Secrets whose plugin only augments a builtin provider: without them the
    // plugin is skipped and the builtin keeps working, so doctor warns.
    const optionalMissingSecrets: string[] = [];
    const legacySecrets: string[] = [];

    for (const packageName of packages) {
      const secrets = FIRST_PARTY_PLUGIN_SECRETS[packageName] ?? [];
      for (const secret of secrets) {
        const source = formatSecretSourcePart(secret, bootstrap);
        parts.push(`${secret}=${source}`);
        if (source === "missing") {
          const augmentOnly = rows
            .filter((row) => row.package === packageName)
            .every((row) => row.mode === "augment");
          (augmentOnly ? optionalMissingSecrets : missingSecrets).push(secret);
        }
        if (source === "legacy_env") legacySecrets.push(secret);
      }

      if (packageName === "kibi-plugin-jev") {
        parts.push(...formatJevStaticConfigParts());
      }
    }

    const message = parts.join("; ");
    if (missingSecrets.length > 0) {
      const jevMissing = missingSecrets.includes("TYPESAFE_API_KEY");
      return {
        passed: false,
        message,
        remediation: jevMissing
          ? "Set `TYPESAFE_API_KEY` in `~/.config/kibi/env` (user-wide) or `<workspace>/.env.kibi` (project override), then restart long-running Kibi MCP/host processes."
          : `Set missing plugin secret(s) (${missingSecrets.join(", ")}) in ~/.config/kibi/env or <workspace>/.env.kibi, then restart long-running Kibi MCP/host processes.`,
      };
    }

    if (optionalMissingSecrets.length > 0) {
      return {
        passed: true,
        warning: true,
        message,
        remediation: `${optionalMissingSecrets.join(", ")} is not set, so the augment-mode plugin is skipped and builtin providers answer alone. Set it in ~/.config/kibi/env or <workspace>/.env.kibi to enable the plugin, then restart long-running Kibi MCP/host processes.`,
      };
    }

    if (legacySecrets.length > 0) {
      return {
        passed: true,
        message,
        remediation: `Migrate ${legacySecrets.join(", ")} from legacy \`.env\` to \`~/.config/kibi/env\` or \`<workspace>/.env.kibi\`, then restart long-running Kibi MCP/host processes.`,
      };
    }

    return {
      passed: true,
      message,
      ...(languages === null ? {} : { warning: true, remediation: languages }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      message,
      remediation:
        "Fix package.json kibi.plugins, then restart long-running Kibi MCP or client processes.",
    };
  }
}

function formatSecretSourcePart(
  secret: string,
  bootstrap: BootstrapKibiEnvironmentResult,
): EnvValueSource {
  return secretSourceFromBootstrap(secret, bootstrap);
}

/**
 * Static first-party Jev diagnostics — mirrors plugin resolve helpers without importing.
 */
// implements REQ-kibi-env-bootstrap, REQ-capability-plugin-configuration-v1
function formatJevStaticConfigParts(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const model = env.KIBI_JEV_MODEL?.trim() || JEV_DEFAULT_MODEL;
  const raw = env.KIBI_JEV_TIMEOUT_MS;
  if (raw === undefined || raw.trim() === "") {
    return [`jev.model=${model}`, "jev.timeoutMs=default"];
  }
  const trimmed = raw.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return [`jev.model=${model}`, "jev.timeoutMs=invalid"];
  }
  const timeoutMs = Number(trimmed);
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > JEV_MAX_TIMEOUT_MS
  ) {
    return [`jev.model=${model}`, "jev.timeoutMs=invalid"];
  }
  return [`jev.model=${model}`, `jev.timeoutMs=${String(timeoutMs)}`];
}

/**
 * The package versions and SWI-Prolog of the engine daemon serving this
 * workspace and branch, read through its handshake without starting one. A
 * daemon with other versions is replaced by the next Kibi command, so it is
 * reported, not failed.
 */
// implements REQ-engine-daemon-package-versions
async function checkEngineDaemon(): Promise<DoctorCheckResult> {
  const workspaceRoot = path.resolve(
    process.env.KIBI_WORKSPACE ??
      process.env.KIBI_PROJECT_ROOT ??
      process.env.KIBI_ROOT ??
      process.cwd(),
  );
  const expected = kibiPackageVersions();
  const attachment = resolveReadBranchAttachment(workspaceRoot);
  if ("error" in attachment) {
    return {
      passed: true,
      message: "Not checked: no branch to address the engine daemon",
      details: { running: false, expectedPackageVersions: expected },
    };
  }
  const { EngineClient } = await import("../engine.js");
  const client = new EngineClient({
    workspaceRoot,
    branch: attachment.kbBranch,
  });
  let daemon: Awaited<ReturnType<typeof client.inspectLiveDaemon>> = null;
  try {
    daemon = await client.inspectLiveDaemon();
  } catch (error) {
    return {
      passed: true,
      message: `Not reachable: ${error instanceof Error ? error.message : String(error)}`,
      details: { running: false, expectedPackageVersions: expected },
    };
  } finally {
    await client.terminate();
  }
  if (daemon === null) {
    return {
      passed: true,
      message: "Not running",
      details: { running: false, expectedPackageVersions: expected },
    };
  }
  const details = {
    running: true,
    pid: client.getPid(),
    branch: attachment.kbBranch,
    packageVersions: daemon.packageVersions,
    prologIdentity: daemon.prologIdentity,
    expectedPackageVersions: expected,
  };
  if (daemon.packageVersions === expected) {
    return {
      passed: true,
      message: `Running ${daemon.packageVersions}`,
      details,
    };
  }
  return {
    passed: true,
    message: `Running ${daemon.packageVersions ?? "a daemon that reports no package versions"}, not this CLI's ${expected}; the next Kibi command replaces it`,
    remediation: "Run: kibi engine stop",
    details,
  };
}

function checkKbDirectory(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const kbDir = path.join(process.cwd(), ".kb");

  if (!existsSync(kbDir)) {
    return {
      passed: false,
      message: "Not found",
      remediation: "Run: kibi init",
    };
  }

  return {
    passed: true,
    message: "Found",
  };
}

function checkKbManifest(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const status = readKbManifestStatus(process.cwd());

  if (status.state === "missing") {
    // 'kibi init' on a legacy layout would claim the latest schema and skip
    // the legacy migration steps; migrate writes the manifest itself.
    const legacy = planLegacyStorageMigration(process.cwd());
    return {
      passed: false,
      message: "Not found",
      remediation:
        legacy.legacyConfig === "absent"
          ? "Run: kibi init"
          : `Run: ${LEGACY_KB_MIGRATION_COMMAND} (${LEGACY_KB_MIGRATION_NOTE})`,
    };
  }

  if (status.state !== "ok") {
    return {
      passed: false,
      message:
        status.state === "invalid" ? "Invalid manifest" : "Future version",
      remediation: `Repair .kb/manifest.json: ${status.warning}`,
    };
  }

  // A knowledge base written by an older Kibi keeps reading and checking
  // until migrated, but the current CLI expects its own schema: say so here,
  // where the operator looks first, instead of leaving it to the next
  // failing check. The migration plan below names the actions.
  if (status.manifest.schemaVersion < LATEST_KB_SCHEMA_VERSION) {
    return {
      passed: false,
      message: `schemaVersion ${status.manifest.schemaVersion} (this Kibi expects ${LATEST_KB_SCHEMA_VERSION})`,
      remediation:
        "Run: kibi migrate (previews the plan), then kibi migrate --yes to apply it, or kibi migrate --apply-safe --approved-plan-hash <planHash> --approved-action <id> for selected actions",
    };
  }

  return {
    passed: true,
    message: `schemaVersion ${status.manifest.schemaVersion}`,
  };
}

function checkLegacyStorage(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const plan = planLegacyStorageMigration(process.cwd());

  if (plan.legacyConfig === "malformed") {
    return {
      passed: false,
      message: "Legacy .kb/config.json is malformed",
      remediation:
        plan.legacyConfigError ??
        "Repair or remove the legacy .kb/config.json, then run: kibi migrate --yes",
    };
  }

  if (plan.blockers.length > 0) {
    return {
      passed: false,
      message: `${plan.blockers.length} legacy knowledge file(s) outside .kb/ cannot be moved automatically`,
      remediation: `${plan.blockers.join(" ")} Then run: kibi migrate --yes`,
    };
  }

  if (
    plan.legacyConfig === "present" ||
    plan.moves.length > 0 ||
    plan.removals.length > 0
  ) {
    const outside = plan.moves.length + plan.removals.length;
    return {
      passed: false,
      message:
        outside > 0
          ? `${outside} legacy knowledge file(s) still outside .kb/${plan.removals.length > 0 ? ` (${plan.removals.length} identical to the .kb/ copy, which kibi migrate removes)` : ""}`
          : "Legacy .kb/config.json still present",
      remediation: "Run: kibi migrate --yes",
    };
  }

  return {
    passed: true,
    message: "Canonical .kb/ layout",
  };
}

function checkGitRepository(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  try {
    execSync("git status", { stdio: "pipe", cwd: process.cwd() });

    return {
      passed: true,
      message: "Found",
    };
  } catch (error) {
    return {
      passed: false,
      message: "Not a git repository",
      remediation: "Run: git init",
    };
  }
}

/**
 * `.kb/symbols.yaml` conflicts on nearly every parallel branch; `kibi
 * merge-driver` resolves them by record id, but only when Git routes the
 * file to it. A warning, not a failure: merges still work without it.
 */
// implements REQ-cli-doctor
function checkManifestMergeDriver(): DoctorCheckResult {
  const gaps = manifestMergeDriverGaps(process.cwd());
  if (gaps === null) {
    return {
      passed: true,
      message: "Not needed yet (no git repository or no symbols)",
    };
  }
  if (gaps.length === 0) return { passed: true, message: "Configured" };
  return {
    passed: true,
    warning: true,
    message: `Not configured: ${gaps.join("; ")}. Merges of .kb/symbols.yaml fall back to line conflicts.`,
    remediation: mergeDriverSetup(process.cwd()),
  };
}

/**
 * The current branch's KB store: it must exist and hold a compilation
 * (journal sequence above 0) when .kb/ has authored sources. Kibi stores are
 * per branch and never copied, so a branch created without the post-checkout
 * hook starts empty until `kibi sync`.
 */
// implements REQ-cli-doctor
function checkBranchStore(): DoctorCheckResult {
  const workspaceRoot = process.cwd();
  let attachment: ReturnType<typeof resolveBranchAttachment>;
  try {
    attachment = resolveBranchAttachment(workspaceRoot);
  } catch (error) {
    attachment = {
      error: error instanceof Error ? error.message : String(error),
    } as ReturnType<typeof resolveBranchAttachment>;
  }
  if ("error" in attachment) {
    return {
      passed: true,
      message: `Not checked: no current Git branch (${attachment.error})`,
    };
  }
  const branch = attachment.kbBranch;
  const store = inspectBranchStore(workspaceRoot, branch);
  const details = { branch, path: store.path, state: store.state };
  if (store.state === "incomplete" || store.state === "unreadable") {
    return {
      passed: false,
      message: `Store for ${branch} is ${store.state}: ${store.detail ?? store.errorCode ?? "requires recovery"}`,
      remediation: "Run: kibi branch recover, then kibi branch recover --apply",
      details,
    };
  }
  const compilation = branchStoreCompilation(store);
  // implements REQ-core-journaled-engine-persistence
  const takeover = storeLockTakeoverReason(store.path);
  // A takeover is reported whether or not the store holds a compilation yet.
  const withTakeover = (message: string): string =>
    takeover
      ? `${message}${message.endsWith(".") ? "" : "."} ${String(takeover.detail)}`
      : message;
  const takeoverDetails = takeover ? { lockTakeover: takeover } : {};
  if (compilation.compiled) {
    return {
      passed: true,
      message: withTakeover(
        `Compiled for ${branch}${compilation.generation ? ` (${compilation.generation})` : ""}`,
      ),
      details: {
        ...details,
        generation: compilation.generation,
        ...takeoverDetails,
      },
    };
  }
  const reason = uncompiledBranchStoreReason(workspaceRoot, store, branch);
  if (reason === null) {
    return {
      passed: true,
      message: withTakeover(
        `Not compiled yet for ${branch}; .kb/ holds no authored sources`,
      ),
      details: { ...details, ...takeoverDetails },
    };
  }
  return {
    passed: false,
    message: withTakeover(String(reason.detail)),
    remediation: "Run: kibi sync",
    details: {
      ...details,
      generation: compilation.generation,
      authoredSources: reason.authoredSources,
      ...takeoverDetails,
    },
  };
}

// Hook health must be diagnosed against the hooks directory Git actually
// executes (resolved via git rev-parse --git-path hooks, honoring
// core.hooksPath and linked worktrees), not against <cwd>/.git/hooks.
// implements REQ-git-hook-effective-install
let cachedRepositoryContext:
  | { cwd: string; context: GitRepositoryContext | null }
  | undefined;

function doctorRepositoryContext(): GitRepositoryContext | null {
  const cwd = process.cwd();
  if (cachedRepositoryContext?.cwd !== cwd) {
    const resolution = resolveGitRepository(cwd);
    cachedRepositoryContext = {
      cwd,
      context: resolution.status === "ok" ? resolution.context : null,
    };
  }
  return cachedRepositoryContext.context;
}

function effectiveHooksDir(): string {
  const context = doctorRepositoryContext();
  return (
    context?.effectiveHooksDir ?? path.join(process.cwd(), ".git", "hooks")
  );
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function remediationHookPaths(...hooks: string[]): string {
  const dir = effectiveHooksDir();
  return `Run: chmod +x ${hooks.map((hook) => shellQuote(path.join(dir, hook))).join(" ")}`;
}

function hooksPathSuffix(): string {
  const context = doctorRepositoryContext();
  if (!context?.hooksPathConfig) return "";
  const origin = context.hooksPathOrigin
    ? ` from ${context.hooksPathOrigin}`
    : "";
  return ` (core.hooksPath=${context.hooksPathConfig}${origin})`;
}

/**
 * The hook manager (lefthook, husky, pre-commit) that owns this repository's
 * hooks. Its hook files are generated runners, so the commands they run are
 * read from the manager's configuration instead of the files Git executes.
 */
// implements REQ-git-hook-manager-integration
function doctorHookManager(): DetectedHookManager | null {
  const context = doctorRepositoryContext();
  if (!context) return null;
  return detectHookManager(
    context.worktreeRoot,
    context.effectiveHooksDir,
    context.hooksPathConfig,
  );
}

// implements REQ-git-hook-manager-integration
function checkHookManagerDelegation(
  manager: DetectedHookManager,
  hooks: readonly ManagedHookName[],
  consequence: string,
): DoctorCheckResult {
  const worktreeRoot = doctorRepositoryContext()?.worktreeRoot ?? process.cwd();
  const owner = `Managed by ${manager.name} (${manager.configPath})`;
  const coverage = hooks.map((hook) => ({
    hook,
    missing: missingKibiHookCommands(
      hook,
      hookManagerCommands(manager.name, worktreeRoot, hook) ?? [],
    ),
  }));
  const gaps = coverage.filter((entry) => entry.missing.length > 0);
  if (gaps.length === 0) {
    const runs = coverage
      .map(
        ({ hook }) =>
          `${hook} runs ${missingKibiHookCommands(hook, [])
            .map((label) => `'${label}'`)
            .join(" and ")}`,
      )
      .join("; ");
    return { passed: true, message: `${owner}; ${runs}` };
  }
  // The manager may reach Kibi through a task runner or script that is not
  // part of its configuration, so an invisible command is a warning only.
  const described = gaps
    .map(
      ({ hook, missing }) =>
        `${hook} does not visibly run ${missing.map((label) => `'${label}'`).join(" and ")}`,
    )
    .join("; ");
  return {
    passed: true,
    warning: true,
    message: `${owner}; ${described}. Kibi reads only the ${manager.name} configuration, not the task runners or scripts it calls; unless they run these commands, ${consequence}`,
    remediation: `Add Kibi's commands to ${manager.configPath}. Print them with: kibi init --print-hook ${gaps.length === 1 ? (gaps[0]?.hook ?? "all") : "all"} --format ${manager.name}`,
  };
}

/**
 * Kibi-managed hook sections must match what this CLI installs. A section
 * written by an older CLI keeps running while silently lacking newer gates
 * (the pre-commit `check-generated` step, for example), and the other hook
 * checks only confirm that kibi is invoked at all.
 */
// implements REQ-cli-doctor
function checkManagedHookSections(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const hooksDir = effectiveHooksDir();
  let outdated: string[];
  try {
    if (!hasManagedHooks(hooksDir)) {
      return { passed: true, message: "Not installed (optional)" };
    }
    outdated = outdatedManagedHooks(hooksDir);
  } catch {
    return {
      passed: false,
      message: "Unable to read hook content",
      remediation: "Run: kibi init",
    };
  }
  if (outdated.length > 0) {
    return {
      passed: false,
      message: `Outdated for this Kibi CLI: ${outdated.join(", ")} (installed by a different version; newer gates may be missing)${hooksPathSuffix()}`,
      remediation: "Run: kibi init to refresh the kibi-managed hook sections",
    };
  }
  return { passed: true, message: "Current for this Kibi CLI" };
}

function checkGitHooks(): DoctorCheckResult {
  const manager = doctorHookManager();
  if (manager) {
    return checkHookManagerDelegation(
      manager,
      ["post-checkout", "post-merge"],
      "a new branch is not compiled on checkout or after a merge",
    );
  }
  const postCheckoutPath = path.join(effectiveHooksDir(), "post-checkout");
  const postMergePath = path.join(effectiveHooksDir(), "post-merge");
  const preCommitPath = path.join(effectiveHooksDir(), "pre-commit");

  const postCheckoutExists = existsSync(postCheckoutPath);
  const postMergeExists = existsSync(postMergePath);

  // An existing pre-commit is hard enforcement; the companions being absent
  // must not downgrade the summary to "optional".
  // implements REQ-cli-doctor
  // Without the hooks kibi init installs, a new branch starts with an empty
  // store (post-checkout compiles it) and commits skip kibi check --staged.
  if (!postCheckoutExists && !postMergeExists && !existsSync(preCommitPath)) {
    return {
      passed: true,
      warning: true,
      message: `Not installed: a new branch is not compiled on checkout and commits skip 'kibi check --staged'${hooksPathSuffix()}`,
      remediation: "Run: kibi init (installs the git hooks)",
    };
  }

  if (postCheckoutExists && postMergeExists) {
    try {
      const checkoutStats = statSync(postCheckoutPath);
      const mergeStats = statSync(postMergePath);

      const checkoutExecutable = (checkoutStats.mode & 0o111) !== 0;
      const mergeExecutable = (mergeStats.mode & 0o111) !== 0;

      if (checkoutExecutable && mergeExecutable) {
        return {
          passed: true,
          message: `Installed and executable${hooksPathSuffix()}`,
        };
      }
      return {
        passed: false,
        message: `Installed but not executable${hooksPathSuffix()}`,
        remediation: remediationHookPaths("post-checkout", "post-merge"),
      };
    } catch (error) {
      return {
        passed: false,
        message: "Unable to check hook permissions",
      };
    }
  }

  return {
    passed: false,
    message: `Partially installed${hooksPathSuffix()}`,
    remediation: "Run: kibi init",
  };
}

// implements REQ-git-hook-effective-install
function checkCustomPreCommitHook(
  content: string,
  executable: boolean,
): { passed: boolean; message: string; remediation?: string } {
  const missing = missingKibiHookCommands("pre-commit", [content]).map(
    (label) => `'${label}'`,
  );
  if (missing.length > 0) {
    // An unmarked file that still carries the old template header is a Kibi
    // hook from before managed sections; removing it lets init reinstall it.
    const oldTemplate = content.includes("# pre-commit hook for kibi")
      ? " If this file is an old Kibi template, delete it and run 'kibi init' instead."
      : "";
    return {
      passed: false,
      message: `Custom pre-commit hook (no kibi-managed section) does not run ${missing.join(" or ")}; commits skip Kibi enforcement${hooksPathSuffix()}`,
      remediation: `Delegate from your hook to both 'kibi check-generated --staged --changed-only' and 'kibi check --staged'. Print a copy-paste snippet that resolves a project-local kibi with: kibi init --print-hook pre-commit (kibi init never edits a custom hook).${oldTemplate}`,
    };
  }
  if (!executable) {
    return {
      passed: false,
      message: `Installed but not executable${hooksPathSuffix()}`,
      remediation: remediationHookPaths("pre-commit"),
    };
  }
  return {
    passed: true,
    message: `Custom hook delegates to 'kibi check-generated --staged --changed-only' and 'kibi check --staged'${hooksPathSuffix()}`,
  };
}

function checkPreCommitHook(): DoctorCheckResult {
  const manager = doctorHookManager();
  if (manager) {
    return checkHookManagerDelegation(
      manager,
      ["pre-commit"],
      "commits skip Kibi enforcement",
    );
  }
  const postCheckoutPath = path.join(effectiveHooksDir(), "post-checkout");
  const postMergePath = path.join(effectiveHooksDir(), "post-merge");
  const preCommitPath = path.join(effectiveHooksDir(), "pre-commit");

  const postCheckoutExists = existsSync(postCheckoutPath);
  const postMergeExists = existsSync(postMergePath);

  if (!postCheckoutExists && !postMergeExists && !existsSync(preCommitPath)) {
    return {
      passed: true,
      message: `Not installed (optional)${hooksPathSuffix()}`,
    };
  }

  const preCommitExists = existsSync(preCommitPath);

  if (!preCommitExists) {
    return {
      passed: false,
      message: "Not installed",
      remediation: "Run: kibi init",
    };
  }

  try {
    const preCommitStats = statSync(preCommitPath);
    const preCommitExecutable = (preCommitStats.mode & 0o111) !== 0;

    // Read hook content to determine whether it's using the new staged check
    const content = readFileSync(preCommitPath, "utf-8");

    // A hook without a kibi-managed section is the user's own (hand-written,
    // husky, lefthook, ...). `kibi init` never edits it, so the only useful
    // check is whether it delegates to the gate the managed template runs.
    if (!content.includes(KIBI_HOOK_BEGIN)) {
      return checkCustomPreCommitHook(content, preCommitExecutable);
    }

    // Current templates resolve the kibi binary into KIBI_BIN before invoking
    // it (git hooks do not get node_modules/.bin on PATH); legacy templates
    // invoked bare `kibi`.
    const resolvesKibi = content.includes("KIBI_BIN=");
    const usesKibi = resolvesKibi || content.includes("kibi check");
    const usesStaged =
      content.includes('"$KIBI_BIN" check --staged') ||
      content.includes("kibi check --staged");

    if (!usesKibi) {
      // Fail if hook doesn't invoke kibi at all
      return {
        passed: false,
        message: "pre-commit hook installed but does not invoke kibi",
        remediation: "Run: kibi init to install recommended hooks",
      };
    }

    if (preCommitExecutable) {
      if (usesStaged) {
        if (!resolvesKibi) {
          // Functional template that invokes bare `kibi`: it fails whenever
          // kibi is installed only as a project dependency.
          return {
            passed: true,
            message:
              "Installed and executable (legacy template without kibi CLI resolution — run 'kibi init' to regenerate so hooks work with local installs)",
            remediation:
              "Run: kibi init to update git hooks to the latest template",
          };
        }

        return {
          passed: true,
          message: `Installed and executable (resolves kibi CLI; uses 'kibi check --staged')${hooksPathSuffix()}`,
        };
      }

      // Warn but pass if using legacy kibi check without --staged
      return {
        passed: true,
        message:
          "Installed and executable (uses legacy 'kibi check' — consider running 'kibi init' to update hooks to use '--staged' with CLI resolution)",
        remediation:
          "Run: kibi init to update git hooks to the latest template",
      };
    }

    return {
      passed: false,
      message: `Installed but not executable${hooksPathSuffix()}`,
      remediation: remediationHookPaths("pre-commit"),
    };
  } catch (error) {
    return {
      passed: false,
      message: "Unable to check hook permissions or read content",
      remediation: "Run: kibi init",
    };
  }
}

function checkPostRewriteHook(): DoctorCheckResult {
  const manager = doctorHookManager();
  if (manager) {
    return checkHookManagerDelegation(
      manager,
      ["post-rewrite"],
      "a rebased branch keeps a stale KB until the next 'kibi sync'",
    );
  }
  const postCheckoutPath = path.join(effectiveHooksDir(), "post-checkout");
  const postMergePath = path.join(effectiveHooksDir(), "post-merge");
  const postRewritePath = path.join(effectiveHooksDir(), "post-rewrite");

  const postCheckoutExists = existsSync(postCheckoutPath);
  const postMergeExists = existsSync(postMergePath);

  if (!postCheckoutExists && !postMergeExists && !existsSync(postRewritePath)) {
    return {
      passed: true,
      message: `Not installed (optional)${hooksPathSuffix()}`,
    };
  }

  const postRewriteExists = existsSync(postRewritePath);

  if (!postRewriteExists) {
    return {
      passed: false,
      message: "Not installed",
      remediation: "Run: kibi init",
    };
  }

  try {
    const postRewriteStats = statSync(postRewritePath);
    const postRewriteExecutable = (postRewriteStats.mode & 0o111) !== 0;

    // Read hook content to verify it invokes kibi. Current templates invoke
    // the resolved KIBI_BIN; legacy templates invoked bare `kibi sync`.
    const content = readFileSync(postRewritePath, "utf-8");

    // A custom hook (no kibi-managed section) is never edited by init.
    // implements REQ-git-hook-effective-install
    if (!content.includes(KIBI_HOOK_BEGIN)) {
      if (missingKibiHookCommands("post-rewrite", [content]).length > 0) {
        return {
          passed: false,
          message: `Custom post-rewrite hook (no kibi-managed section) does not run 'kibi sync'${hooksPathSuffix()}`,
          remediation:
            "Delegate from your hook to 'kibi sync' after rebases. Print a copy-paste snippet that resolves a project-local kibi with: kibi init --print-hook post-rewrite (kibi init never edits a custom hook).",
        };
      }
      return postRewriteExecutable
        ? {
            passed: true,
            message: `Custom hook delegates to 'kibi sync'${hooksPathSuffix()}`,
          }
        : {
            passed: false,
            message: `Installed but not executable${hooksPathSuffix()}`,
            remediation: remediationHookPaths("post-rewrite"),
          };
    }

    const usesKibi =
      content.includes('"$KIBI_BIN" sync') || content.includes("kibi sync");
    const resolvesKibi = content.includes("KIBI_BIN=");

    if (!usesKibi) {
      return {
        passed: false,
        message: "post-rewrite hook installed but does not invoke kibi",
        remediation: "Run: kibi init to install recommended hooks",
      };
    }

    if (postRewriteExecutable) {
      if (!resolvesKibi) {
        return {
          passed: true,
          message:
            "Installed and executable (legacy template without kibi CLI resolution — run 'kibi init' to regenerate so hooks work with local installs)",
          remediation:
            "Run: kibi init to update git hooks to the latest template",
        };
      }
      return {
        passed: true,
        message: `Installed and executable${hooksPathSuffix()}`,
      };
    }

    return {
      passed: false,
      message: `Installed but not executable${hooksPathSuffix()}`,
      remediation: remediationHookPaths("post-rewrite"),
    };
  } catch (error) {
    return {
      passed: false,
      message: "Unable to check hook permissions or read content",
      remediation: "Run: kibi init",
    };
  }
}
