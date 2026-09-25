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
import { join } from "node:path";
import {
  type CapabilityId,
  PluginValidationError,
  type ProjectKibiConfig,
  validateProjectKibiConfig,
} from "kibi-plugin-sdk";

// implements REQ-capability-plugin-activation-disclosure-v1
export type ProjectPackageManifest = Readonly<{
  name?: string;
  dependencies?: Readonly<Record<string, string>>;
  devDependencies?: Readonly<Record<string, string>>;
  optionalDependencies?: Readonly<Record<string, string>>;
  peerDependencies?: Readonly<Record<string, string>>;
  kibi?: unknown;
}>;

// implements REQ-capability-plugin-activation-disclosure-v1
export function readProjectPackageJson(
  workspaceRoot: string,
): ProjectPackageManifest {
  const packageJsonPath = join(workspaceRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new PluginValidationError(
      "MISSING_PACKAGE_JSON",
      `No package.json found at ${packageJsonPath}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PluginValidationError(
      "INVALID_PACKAGE_JSON",
      `Failed to parse package.json: ${message}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new PluginValidationError(
      "INVALID_PACKAGE_JSON",
      "package.json must be a JSON object",
    );
  }
  return parsed as ProjectPackageManifest;
}

/**
 * Read and validate `package.json#kibi` for capability-plugin activation.
 * Missing package.json, `kibi`, or `kibi.plugins` yields empty config
 * (builtin-only), matching historical workspaces without a package manifest.
 */
// implements REQ-capability-plugin-activation-disclosure-v1, REQ-capability-plugin-observable-behavior-v1
export function readProjectKibiConfig(
  workspaceRoot: string,
): ProjectKibiConfig {
  const packageJsonPath = join(workspaceRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return {};
  }
  const manifest = readProjectPackageJson(workspaceRoot);
  return validateProjectKibiConfig(manifest.kibi);
}

export type ConfiguredCapabilityPluginDiagnostic = Readonly<{
  package: string;
  capability: string;
  mode: string;
  /** True when the package is listed in dependencies, devDependencies, or optionalDependencies. */
  declared: boolean;
}>;

// implements REQ-capability-plugin-activation-disclosure-v1
function dependencyDeclared(
  manifest: ProjectPackageManifest,
  packageName: string,
): boolean {
  return [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.optionalDependencies,
  ].some(
    (dependencies) =>
      Boolean(dependencies) &&
      Object.prototype.hasOwnProperty.call(dependencies, packageName),
  );
}

/**
 * Parsed `package.json#kibi.plugins` rows. Does not import plugin modules.
 */
// implements REQ-capability-plugin-activation-disclosure-v1, REQ-capability-plugin-observable-behavior-v1
// covered_by TEST-e2e-capability-plugins
export function describeConfiguredCapabilityPlugins(
  workspaceRoot: string,
): readonly ConfiguredCapabilityPluginDiagnostic[] {
  const config = readProjectKibiConfig(workspaceRoot);
  const plugins = config.plugins ?? [];
  if (plugins.length === 0) return [];
  const manifest = readProjectPackageJson(workspaceRoot);
  const rows: ConfiguredCapabilityPluginDiagnostic[] = [];
  for (const plugin of plugins) {
    const declared = dependencyDeclared(manifest, plugin.package);
    for (const capability of Object.keys(
      plugin.capabilities,
    ) as CapabilityId[]) {
      const entry = plugin.capabilities[capability];
      if (!entry) continue;
      rows.push({
        package: plugin.package,
        capability,
        mode: entry.mode,
        declared,
      });
    }
  }
  return rows;
}
