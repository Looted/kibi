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

import {
  type KibiPluginV1,
  PluginValidationError,
  validateKibiPlugin,
} from "kibi-plugin-sdk";

import {
  PluginResolutionError,
  resolveProjectLocalPackage,
  type ResolvedProjectPackage,
} from "./resolve-package.js";

// implements REQ-capability-plugin-activation-disclosure-v1
export type LoadedPlugin = Readonly<{
  packageName: string;
  resolved: ResolvedProjectPackage;
  plugin: KibiPluginV1;
}>;

// implements REQ-capability-plugin-activation-disclosure-v1
export type LoadPluginOptions = Readonly<{
  /** Injectable dynamic import for tests. */
  importModule?: (url: string) => Promise<unknown>;
  /** Injectable package resolver for tests. */
  resolvePackage?: (
    workspaceRoot: string,
    packageName: string,
  ) => ResolvedProjectPackage;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Dynamically import a project-local plugin package and validate the named
 * `kibiPlugin` export against kibi.plugin.v1.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export async function loadPluginPackage(
  workspaceRoot: string,
  packageName: string,
  options: LoadPluginOptions = {},
): Promise<LoadedPlugin> {
  const resolvePackage = options.resolvePackage ?? resolveProjectLocalPackage;
  const importModule = options.importModule ?? ((url: string) => import(url));

  const resolved = resolvePackage(workspaceRoot, packageName);
  let moduleExports: unknown;
  try {
    moduleExports = await importModule(resolved.entryUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PluginResolutionError(
      "PLUGIN_IMPORT_FAILED",
      `Failed to import plugin package '${packageName}': ${message}`,
    );
  }

  if (!isRecord(moduleExports) || !("kibiPlugin" in moduleExports)) {
    throw new PluginValidationError(
      "MISSING_KIBI_PLUGIN_EXPORT",
      `Package '${packageName}' must export a named 'kibiPlugin' binding`,
    );
  }

  const plugin = validateKibiPlugin(moduleExports.kibiPlugin);
  return { packageName, resolved, plugin };
}
