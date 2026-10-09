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
  CHECK_POLICY_CAPABILITY_ID,
  type CheckPolicyDocument,
  validateCheckPolicyDocument,
} from "kibi-plugin-sdk";

import { readProjectKibiConfig } from "./project-config.js";
import {
  assertResolvedEntryInsidePackageRoot,
  resolveProjectLocalPackage,
} from "./resolve-package.js";

/** A check policy read from an activated plugin package, as data. */
// implements REQ-capability-check-policy
export type ActiveCheckPolicy = Readonly<{
  packageName: string;
  packageVersion: string;
  document: CheckPolicyDocument;
}>;

/** Why an activated check policy could not be read. */
// implements REQ-capability-check-policy
export type CheckPolicyLoadError = Readonly<{
  packageName: string;
  message: string;
}>;

// implements REQ-capability-check-policy
export type CheckPolicyReadResult = Readonly<{
  policies: readonly ActiveCheckPolicy[];
  errors: readonly CheckPolicyLoadError[];
}>;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function policyPath(packageJson: Readonly<Record<string, unknown>>): string {
  const kibi = packageJson.kibi;
  const path =
    typeof kibi === "object" && kibi !== null && !Array.isArray(kibi)
      ? (kibi as Record<string, unknown>).checkPolicy
      : undefined;
  if (typeof path !== "string" || path.trim() === "") {
    throw new Error(
      `its package.json has no kibi.checkPolicy path to a ${CHECK_POLICY_CAPABILITY_ID} document`,
    );
  }
  return path;
}

/**
 * Read the check policies of every package activated for
 * `kibi.check-policy.v1`. Only package.json files and the declared policy JSON
 * are read; no plugin module is imported, so maintenance paths such as
 * `kb_check` stay free of third-party code.
 */
// implements REQ-capability-check-policy
export function readActiveCheckPolicies(
  workspaceRoot: string,
): CheckPolicyReadResult {
  let entries: readonly { package: string }[];
  try {
    entries = (readProjectKibiConfig(workspaceRoot).plugins ?? []).filter(
      (entry) => entry.capabilities[CHECK_POLICY_CAPABILITY_ID] !== undefined,
    );
  } catch (error) {
    return {
      policies: [],
      errors: [{ packageName: "package.json", message: message(error) }],
    };
  }

  const policies: ActiveCheckPolicy[] = [];
  const errors: CheckPolicyLoadError[] = [];
  for (const entry of entries) {
    try {
      const resolved = resolveProjectLocalPackage(workspaceRoot, entry.package);
      const documentPath = assertResolvedEntryInsidePackageRoot(
        resolved.packageRoot,
        join(resolved.packageRoot, policyPath(resolved.packageJson)),
      );
      const document = validateCheckPolicyDocument(
        JSON.parse(fs.readFileSync(documentPath, "utf8")),
      );
      const version = resolved.packageJson.version;
      policies.push({
        packageName: entry.package,
        packageVersion: typeof version === "string" ? version : "unknown",
        document,
      });
    } catch (error) {
      errors.push({ packageName: entry.package, message: message(error) });
    }
  }
  return { policies, errors };
}
