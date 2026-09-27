import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  type ProjectPluginEntry,
  validateProjectKibiConfig,
} from "kibi-plugin-sdk";
import type { ProjectKibiConfig } from "kibi-plugin-sdk";
import { SYMBOL_EXTRACTOR_V2_CAPABILITY_ID } from "kibi-plugin-sdk";
import type { GitChangeSnapshot } from "../traceability/git-change-snapshot.js";
import {
  APPROVED_SOURCE_ANALYZERS,
  type ApprovedSourceAnalyzer,
} from "./approved-source-analyzers.js";
import { readProjectKibiConfig } from "./project-config.js";
import { CapabilityRegistry } from "./registry.js";
import { resolveProjectLocalPackage } from "./resolve-package.js";
import {
  type SourceAnalysisService,
  createSourceAnalysisService,
} from "./source-analysis-service.js";

function digestFile(root: string, file: string): string {
  const candidate = resolve(root, file);
  const rel = relative(root, candidate);
  if (!rel || rel.startsWith("..") || isAbsolute(rel))
    throw new Error(`Invalid approved asset path: ${file}`);
  const actual = realpathSync(candidate);
  const actualRel = relative(realpathSync(root), actual);
  if (actualRel.startsWith("..") || isAbsolute(actualRel))
    throw new Error(`Approved asset escapes its package: ${file}`);
  return createHash("sha256").update(readFileSync(actual)).digest("hex");
}

function verifyFiles(
  root: string,
  files: Readonly<Record<string, string>>,
): void {
  if (Object.keys(files).length === 0)
    throw new Error("An approved analyzer must pin its executable closure");
  for (const [file, expected] of Object.entries(files)) {
    if (digestFile(root, file) !== expected)
      throw new Error(`Source analyzer integrity mismatch: ${file}`);
  }
}

function dependencyRoot(importer: string, packageName: string): string {
  const require = createRequire(join(importer, "package.json"));
  let current = dirname(require.resolve(packageName));
  for (;;) {
    try {
      const json = JSON.parse(
        readFileSync(join(current, "package.json"), "utf8"),
      ) as { name?: unknown };
      if (json.name === packageName) return current;
    } catch {
      /* Walk through a package's dist directories. */
    }
    const parent = dirname(current);
    if (parent === current)
      throw new Error(`Cannot locate approved dependency: ${packageName}`);
    current = parent;
  }
}

/** Verify the exact host-approved closure before any plugin entrypoint executes. */
// implements REQ-capability-plugin-activation-disclosure-v1
export function verifyApprovedSourceAnalyzer(
  root: string,
  approval: ApprovedSourceAnalyzer,
): string {
  verifyFiles(root, approval.files);
  const manifest = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  ) as { name?: unknown; version?: unknown };
  if (
    manifest.name !== approval.packageName ||
    manifest.version !== approval.version
  )
    throw new Error(
      "Source analyzer package identity does not match host approval",
    );
  for (const dependency of approval.dependencies) {
    const depRoot = dependencyRoot(root, dependency.packageName);
    verifyFiles(depRoot, dependency.files);
    const metadata = JSON.parse(
      readFileSync(join(depRoot, "package.json"), "utf8"),
    ) as { version?: unknown };
    if (metadata.version !== dependency.version)
      throw new Error(
        `Unapproved source runtime version: ${dependency.packageName}`,
      );
  }
  return createHash("sha256").update(JSON.stringify(approval)).digest("hex");
}

/** Maintenance resolves source capabilities only; unrelated plugin code is never imported. */
// implements REQ-capability-plugin-activation-disclosure-v1
export function createMaintenanceSourceAnalysisService(
  workspaceRoot: string,
  projectConfig?: ProjectKibiConfig,
): SourceAnalysisService {
  const config = projectConfig ?? readProjectKibiConfig(workspaceRoot);
  const fingerprints: Record<string, string> = {};
  const sourceEntries = (config.plugins ?? []).filter(
    (entry) => entry.capabilities[SYMBOL_EXTRACTOR_V2_CAPABILITY_ID],
  );
  const registry = new CapabilityRegistry({
    workspaceRoot,
    projectConfig: {
      plugins: sourceEntries.flatMap((entry) => {
        const capability =
          entry.capabilities[SYMBOL_EXTRACTOR_V2_CAPABILITY_ID];
        return capability
          ? [
              {
                package: entry.package,
                capabilities: {
                  [SYMBOL_EXTRACTOR_V2_CAPABILITY_ID]: capability,
                },
              },
            ]
          : [];
      }),
    },
  });
  return createSourceAnalysisService({
    registry,
    providerFingerprints: fingerprints,
    resolveExtractorsV2: async () => {
      for (const entry of sourceEntries) {
        const approval = APPROVED_SOURCE_ANALYZERS.find(
          (item) => item.packageName === entry.package,
        );
        if (!approval)
          throw new Error(
            `Source analyzer is not approved for maintenance: ${entry.package}`,
          );
        const resolved = resolveProjectLocalPackage(
          workspaceRoot,
          entry.package,
        );
        const entryRelative = relative(
          resolved.packageRoot,
          resolved.entryPath,
        ).replaceAll("\\", "/");
        if (!approval.files[entryRelative])
          throw new Error(
            "Source analyzer entrypoint is outside its approved closure",
          );
        fingerprints[entry.package] = verifyApprovedSourceAnalyzer(
          resolved.packageRoot,
          approval,
        );
      }
      return registry.resolveSymbolExtractorsV2();
    },
  });
}

/** Capture activation with the same source snapshot and retain baseline analyzers for code changes. */
// implements REQ-source-analysis-v2
export function readSnapshotSourceConfig(
  snapshot: GitChangeSnapshot,
): ProjectKibiConfig {
  const readConfig = (tree: string): ProjectKibiConfig => {
    const entry = snapshot
      .readGit(["ls-tree", tree, "--", "package.json"])
      .toString("utf8");
    if (!entry) return {};
    if (!/^100(?:644|755) blob /.test(entry))
      throw new Error(
        "Source analyzer configuration must be a regular snapshot file",
      );
    return validateProjectKibiConfig(
      JSON.parse(
        snapshot.readGit(["show", `${tree}:package.json`]).toString("utf8"),
      ).kibi,
    );
  };
  const entries = new Map<string, ProjectPluginEntry>();
  for (const entry of readConfig(snapshot.headTree).plugins ?? [])
    entries.set(entry.package, entry);
  const configurationPaths = new Set([
    "package.json",
    "bun.lock",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
  ]);
  if (
    snapshot.inventory.some(
      (file) =>
        !configurationPaths.has(file.path) && !file.path.startsWith(".kb/"),
    )
  ) {
    for (const entry of readConfig(snapshot.baseTree).plugins ?? []) {
      const baseline = entry.capabilities[SYMBOL_EXTRACTOR_V2_CAPABILITY_ID];
      if (!baseline || baseline.mode === "shadow") continue;
      const selected = entries.get(entry.package)?.capabilities[
        SYMBOL_EXTRACTOR_V2_CAPABILITY_ID
      ];
      if (selected?.mode === "shadow")
        throw new Error(
          `Cannot downgrade active source analyzer '${entry.package}' to shadow while changing source; separate the configuration change`,
        );
      if (!selected) entries.set(entry.package, entry);
    }
  }
  return { plugins: [...entries.values()] };
}
