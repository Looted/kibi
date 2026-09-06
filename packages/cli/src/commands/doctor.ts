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
  buildMigrationPlan,
  migrationAction,
} from "../public/operations/migration-plan.js";
import { readKbManifestStatus } from "../utils/kb-manifest.js";
import { planLegacyStorageMigration } from "./legacy-storage-migration.js";

interface DoctorCheck {
  name: string;
  check: () => { passed: boolean; message: string; remediation?: string };
}

export interface DoctorOptions {
  format?: "json" | "table";
}

// implements REQ-003
export async function doctorCommand(
  options: DoctorOptions = {},
): Promise<{ exitCode: number }> {
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
  ];

  const results = checks.map(({ name, check }) => ({ name, ...check() }));
  const allPassed = results.every((result) => result.passed);
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
    const status = result.passed ? "✓" : "✗";
    console.log(`${status} ${result.name}: ${result.message}`);
    if (!result.passed && result.remediation)
      console.log(`  → ${result.remediation}`);
  }
  console.log();

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
    packageVersions: process.env.KIBI_PACKAGE_VERSIONS ?? "unknown",
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

function checkSWIProlog(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  try {
    const output = execSync("swipl --version", { encoding: "utf-8" });
    const versionMatch = output.match(/version\s+(\d+)\.(\d+)/i);

    if (!versionMatch) {
      return {
        passed: false,
        message: "Unable to parse version",
        remediation: "Reinstall SWI-Prolog from https://www.swi-prolog.org/",
      };
    }

    const majorText = versionMatch[1];
    if (!majorText) {
      return {
        passed: false,
        message: "Unable to parse major version",
        remediation: "Reinstall SWI-Prolog from https://www.swi-prolog.org/",
      };
    }

    const major = Number.parseInt(majorText, 10);

    if (major < 9) {
      return {
        passed: false,
        message: `Version ${major}.x found (requires ≥9.0)`,
        remediation:
          "Upgrade SWI-Prolog to version 9.0 or higher from https://www.swi-prolog.org/",
      };
    }

    return {
      passed: true,
      message: `Version ${versionMatch[0]} installed`,
    };
  } catch (error) {
    return {
      passed: false,
      message: "Not installed or not in PATH",
      remediation:
        "Install SWI-Prolog from https://www.swi-prolog.org/ and add to PATH",
    };
  }
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
    return {
      passed: false,
      message: "Not found",
      remediation: "Run: kibi init",
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

  if (plan.legacyConfig === "present" || plan.moves.length > 0) {
    return {
      passed: false,
      message:
        plan.moves.length > 0
          ? `${plan.moves.length} legacy knowledge file(s) still outside .kb/`
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

function checkGitHooks(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const postCheckoutPath = path.join(process.cwd(), ".git/hooks/post-checkout");
  const postMergePath = path.join(process.cwd(), ".git/hooks/post-merge");

  const postCheckoutExists = existsSync(postCheckoutPath);
  const postMergeExists = existsSync(postMergePath);

  if (!postCheckoutExists && !postMergeExists) {
    return {
      passed: true,
      message: "Not installed (optional)",
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
          message: "Installed and executable",
        };
      }
      return {
        passed: false,
        message: "Installed but not executable",
        remediation:
          "Run: chmod +x .git/hooks/post-checkout .git/hooks/post-merge",
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
    message: "Partially installed",
    remediation: "Run: kibi init",
  };
}

function checkPreCommitHook(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const postCheckoutPath = path.join(process.cwd(), ".git/hooks/post-checkout");
  const postMergePath = path.join(process.cwd(), ".git/hooks/post-merge");
  const preCommitPath = path.join(process.cwd(), ".git/hooks/pre-commit");

  const postCheckoutExists = existsSync(postCheckoutPath);
  const postMergeExists = existsSync(postMergePath);

  if (!postCheckoutExists && !postMergeExists) {
    return {
      passed: true,
      message: "Not installed (optional)",
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

    const usesKibi = content.includes("kibi check");
    const usesStaged = content.includes("kibi check --staged");

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
        return {
          passed: true,
          message: "Installed and executable (uses 'kibi check --staged')",
        };
      }

      // Warn but pass if using legacy kibi check without --staged
      return {
        passed: true,
        message:
          "Installed and executable (uses legacy 'kibi check' — consider running 'kibi init' to update hooks to use '--staged')",
        remediation:
          "Run: kibi init to update git hooks to the latest template",
      };
    }

    return {
      passed: false,
      message: "Installed but not executable",
      remediation: "Run: chmod +x .git/hooks/pre-commit",
    };
  } catch (error) {
    return {
      passed: false,
      message: "Unable to check hook permissions or read content",
      remediation: "Run: kibi init",
    };
  }
}

function checkPostRewriteHook(): {
  passed: boolean;
  message: string;
  remediation?: string;
} {
  const postCheckoutPath = path.join(process.cwd(), ".git/hooks/post-checkout");
  const postMergePath = path.join(process.cwd(), ".git/hooks/post-merge");
  const postRewritePath = path.join(process.cwd(), ".git/hooks/post-rewrite");

  const postCheckoutExists = existsSync(postCheckoutPath);
  const postMergeExists = existsSync(postMergePath);

  if (!postCheckoutExists && !postMergeExists) {
    return {
      passed: true,
      message: "Not installed (optional)",
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

    // Read hook content to verify it invokes kibi
    const content = readFileSync(postRewritePath, "utf-8");

    const usesKibi = content.includes("kibi sync");

    if (!usesKibi) {
      return {
        passed: false,
        message: "post-rewrite hook installed but does not invoke kibi",
        remediation: "Run: kibi init to install recommended hooks",
      };
    }

    if (postRewriteExecutable) {
      return {
        passed: true,
        message: "Installed and executable",
      };
    }

    return {
      passed: false,
      message: "Installed but not executable",
      remediation: "Run: chmod +x .git/hooks/post-rewrite",
    };
  } catch (error) {
    return {
      passed: false,
      message: "Unable to check hook permissions or read content",
      remediation: "Run: kibi init",
    };
  }
}
