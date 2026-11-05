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

import * as fs from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PluginValidationError } from "kibi-plugin-sdk";

import {
  type ProjectPackageManifest,
  readProjectPackageJson,
} from "./project-config.js";

// implements REQ-capability-plugin-activation-disclosure-v1
export class PluginResolutionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PluginResolutionError";
    this.code = code;
  }
}

// implements REQ-capability-plugin-activation-disclosure-v1
export type ResolvedProjectPackage = Readonly<{
  packageName: string;
  packageRoot: string;
  packageJsonPath: string;
  packageJson: ProjectPackageManifest & Readonly<Record<string, unknown>>;
  /** Absolute filesystem path of the package entry used for dynamic import. */
  entryPath: string;
  /** file:// URL for dynamic import. */
  entryUrl: string;
}>;

function readJson(path: string): unknown {
  // String(buffer) decodes UTF-8.
  return JSON.parse(String(fs.readFileSync(path)));
}

function nextAncestorDirectory(current: string): string | undefined {
  const parent = dirname(current);
  return parent === current ? undefined : parent;
}

// The root itself relates as "", which neither starts with ".." nor is absolute.
function isWithinRoot(rootPath: string, candidatePath: string): boolean {
  const relativePath = relative(resolve(rootPath), resolve(candidatePath));
  // rationale: path.relative only returns an absolute path across Windows
  // drives, so on the POSIX test hosts the isAbsolute guard is always false.
  // Stryker disable next-line ConditionalExpression
  return !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

/**
 * Bare npm package names only. Paths, URLs, subpaths, and aliases are rejected.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export function isBarePackageName(packageName: string): boolean {
  const trimmed = packageName.trim();
  if (!trimmed || trimmed !== packageName) return false;
  if (
    trimmed.startsWith(".") ||
    trimmed.includes(":") ||
    trimmed.includes("\\") ||
    trimmed.includes("..")
  ) {
    return false;
  }
  // Reject absolute paths, subpath imports (`pkg/sub`) and Windows drive paths.
  if (trimmed.includes("/") && !trimmed.startsWith("@")) return false;
  // A scope ("@scope", never empty) and a non-empty name, nothing more.
  if (trimmed.startsWith("@")) {
    const parts = trimmed.split("/");
    if (parts.length !== 2 || !parts[1]) return false;
  }
  return true;
}

// implements REQ-capability-plugin-activation-disclosure-v1, REQ-capability-plugin-observable-behavior-v1
export function assertBarePackageName(packageName: string): void {
  if (!isBarePackageName(packageName)) {
    throw new PluginResolutionError(
      "INVALID_PACKAGE_REFERENCE",
      `Plugin package '${packageName}' must be a bare package name; paths, URLs, and subpaths are rejected`,
    );
  }
}

// implements REQ-capability-plugin-activation-disclosure-v1, REQ-capability-plugin-observable-behavior-v1
export function hasDeclaredProjectDependency(
  workspaceRoot: string,
  packageName: string,
  manifest?: ProjectPackageManifest,
): boolean {
  const packageJson = manifest ?? readProjectPackageJson(workspaceRoot);
  return [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
  ].some((dependencies) =>
    Boolean(
      dependencies &&
        typeof dependencies === "object" &&
        dependencies[packageName],
    ),
  );
}

// implements REQ-capability-plugin-activation-disclosure-v1
export function hasConsumerNodeModulesLink(
  workspaceRoot: string,
  packageName: string,
  packageRoot: string,
): boolean {
  try {
    const linkPath = join(
      workspaceRoot,
      "node_modules",
      ...packageName.split("/"),
    );
    const linkedRoot = fs.realpathSync(linkPath);
    return (
      isWithinRoot(linkedRoot, packageRoot) ||
      isWithinRoot(packageRoot, linkedRoot)
    );
  } catch {
    return false;
  }
}

/**
 * Same project-scope policy as packages/cursor/bin/launch-kibi-mcp.mjs:
 * within workspace OR node_modules symlink OR Yarn PnP active resolver.
 * Rejects NODE_PATH / global / ambient packages.
 */
// implements REQ-capability-plugin-activation-disclosure-v1, REQ-capability-plugin-observable-behavior-v1
export function isProjectScopedPackage(
  workspaceRoot: string,
  packageName: string,
  packageRoot: string,
): boolean {
  if (isWithinRoot(workspaceRoot, packageRoot)) return true;
  return (
    hasConsumerNodeModulesLink(workspaceRoot, packageName, packageRoot) ||
    Boolean(process.versions.pnp)
  );
}

// implements REQ-capability-plugin-activation-disclosure-v1
export function packageJsonForResolvedFile(
  startPath: string,
  expectedPackageName: string,
): {
  packageJsonPath: string;
  packageRoot: string;
  packageJson: ProjectPackageManifest & Readonly<Record<string, unknown>>;
} | null {
  // A file (or missing path) has no package.json beneath it, so the walk
  // simply moves on to its directory.
  let cursor: string | undefined = resolve(startPath);
  while (cursor !== undefined) {
    const packageJsonPath = join(cursor, "package.json");
    try {
      const packageJson = readJson(packageJsonPath) as ProjectPackageManifest &
        Record<string, unknown>;
      if (packageJson.name === expectedPackageName) {
        return { packageJsonPath, packageRoot: cursor, packageJson };
      }
    } catch {
      // Keep walking past a missing or malformed package manifest.
    }
    cursor = nextAncestorDirectory(cursor);
  }
  return null;
}

/**
 * Confine a resolved entry to the realpath'd package root. Rejects
 * `exports`/`main` traversal and symlink escapes.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export function assertResolvedEntryInsidePackageRoot(
  packageRoot: string,
  entryPath: string,
): string {
  let realRoot: string;
  try {
    realRoot = fs.realpathSync(packageRoot);
  } catch {
    throw new PluginResolutionError(
      "PACKAGE_NOT_FOUND",
      `Plugin package root '${packageRoot}' is not readable`,
    );
  }

  let realEntry: string;
  try {
    const stats = fs.statSync(entryPath);
    if (!stats.isFile()) {
      throw new PluginResolutionError(
        "PACKAGE_ENTRY_NOT_FILE",
        `Plugin package entry '${entryPath}' is not a regular file`,
      );
    }
    realEntry = fs.realpathSync(entryPath);
  } catch (error) {
    if (error instanceof PluginResolutionError) throw error;
    throw new PluginResolutionError(
      "PACKAGE_ENTRY_NOT_FOUND",
      `Plugin package entry '${entryPath}' does not exist`,
    );
  }

  if (!isWithinRoot(realRoot, realEntry)) {
    throw new PluginResolutionError(
      "PACKAGE_ENTRY_OUTSIDE_ROOT",
      `Resolved plugin entry '${realEntry}' is outside package root '${realRoot}'`,
    );
  }
  return realEntry;
}

function candidateFromManifest(
  packageJson: ProjectPackageManifest & Readonly<Record<string, unknown>>,
): string | undefined {
  const exportsField = packageJson.exports;
  if (typeof exportsField === "string") return exportsField;
  // Reading a property of an array, number or boolean yields undefined, so
  // only null and undefined need guarding.
  const rootExport = (exportsField as Record<string, unknown> | null)?.["."];
  if (typeof rootExport === "string") return rootExport;
  const conditional = rootExport as Record<string, unknown> | null | undefined;
  if (typeof conditional?.import === "string") return conditional.import;
  if (typeof conditional?.default === "string") return conditional.default;
  if (typeof conditional?.require === "string") return conditional.require;
  if (typeof packageJson.module === "string") return packageJson.module;
  if (typeof packageJson.main === "string") return packageJson.main;
  return undefined;
}

function resolvePackageEntryWithNode(
  packageRoot: string,
  packageJson: ProjectPackageManifest & Readonly<Record<string, unknown>>,
  packageName: string,
  consumerRequire: NodeJS.Require,
): { entryPath: string; entryUrl: string } {
  let resolved: string | undefined;
  try {
    resolved = consumerRequire.resolve(packageName);
  } catch {
    // Fall back to the manifest's declared entry below.
  }
  if (resolved === undefined) {
    const candidate = candidateFromManifest(packageJson);
    if (candidate) {
      resolved = resolve(packageRoot, candidate);
    }
  }
  if (resolved === undefined) {
    throw new PluginResolutionError(
      "PACKAGE_ENTRY_NOT_FOUND",
      `Node could not resolve the root export of '${packageName}' from ${packageRoot}`,
    );
  }
  const entryPath = assertResolvedEntryInsidePackageRoot(packageRoot, resolved);
  return { entryPath, entryUrl: pathToFileURL(entryPath).href };
}

/**
 * Resolve a declared project-local plugin package through the workspace
 * package.json require graph. NODE_PATH / global / path / URL references fail.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export function resolveProjectLocalPackage(
  workspaceRoot: string,
  packageName: string,
): ResolvedProjectPackage {
  assertBarePackageName(packageName);

  const root = resolve(workspaceRoot);
  const manifest = readProjectPackageJson(root);
  if (!hasDeclaredProjectDependency(root, packageName, manifest)) {
    throw new PluginResolutionError(
      "UNDECLARED_DEPENDENCY",
      `Plugin package '${packageName}' must be listed in dependencies, devDependencies, or optionalDependencies of ${join(root, "package.json")}`,
    );
  }

  const consumerRequire = createRequire(join(root, "package.json"));
  let packageInfo: {
    packageJsonPath: string;
    packageRoot: string;
    packageJson: ProjectPackageManifest & Readonly<Record<string, unknown>>;
  } | null = null;

  try {
    packageInfo = packageJsonForResolvedFile(
      consumerRequire.resolve(`${packageName}/package.json`),
      packageName,
    );
  } catch {
    try {
      packageInfo = packageJsonForResolvedFile(
        consumerRequire.resolve(packageName),
        packageName,
      );
    } catch {
      // Neither resolves: reported as not found below.
    }
  }

  if (!packageInfo) {
    throw new PluginResolutionError(
      "PACKAGE_NOT_FOUND",
      `No project-local package '${packageName}' was found for ${root}. Install it in that workspace and retry.`,
    );
  }

  if (!isProjectScopedPackage(root, packageName, packageInfo.packageRoot)) {
    throw new PluginResolutionError(
      "PACKAGE_OUTSIDE_WORKSPACE",
      `Resolved '${packageName}' outside the consumer workspace: ${packageInfo.packageRoot}. Install it in ${root}; global, NODE_PATH, and ambient packages are not supported.`,
    );
  }

  const { entryPath, entryUrl } = resolvePackageEntryWithNode(
    packageInfo.packageRoot,
    packageInfo.packageJson,
    packageName,
    consumerRequire,
  );

  return {
    packageName,
    packageRoot: packageInfo.packageRoot,
    packageJsonPath: packageInfo.packageJsonPath,
    packageJson: packageInfo.packageJson,
    entryPath,
    entryUrl,
  };
}

/** Re-export for callers that catch SDK validation failures as resolution errors. */
export { PluginValidationError };
