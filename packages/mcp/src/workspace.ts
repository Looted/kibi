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
 along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import path from "node:path";
import { branchStorePath, resolveKibiWorkspaceRoot } from "kibi-runtime";

const KB_PATH_ENV_KEYS = ["KIBI_KB_PATH", "KB_PATH"] as const;

/**
 * Canonical workspace root — delegates to shared resolveKibiWorkspaceRoot.
 */
// implements REQ-002, REQ-012, REQ-kibi-env-bootstrap
export function resolveWorkspaceRoot(startDir: string = process.cwd()): string {
  return resolveKibiWorkspaceRoot(startDir);
}

// implements REQ-002, REQ-012
export function resolveKbPath(workspaceRoot: string, branch: string): string {
  const envPath = readFirstEnv(KB_PATH_ENV_KEYS);
  if (envPath) {
    const resolved = path.resolve(envPath);
    if (isBranchPath(resolved)) {
      return resolved;
    }
    return branchStorePath(resolved, branch);
  }

  return branchStorePath(workspaceRoot, branch);
}

// implements REQ-002
export function resolveEnvFilePath(
  envFileName: string,
  workspaceRoot: string,
): string {
  if (path.isAbsolute(envFileName)) {
    return envFileName;
  }
  return path.resolve(workspaceRoot, envFileName);
}

function readFirstEnv(keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

export function nextAncestorDirectory(current: string): string | undefined {
  const parent = path.dirname(current);
  return parent === current ? undefined : parent;
}

function isBranchPath(p: string): boolean {
  const parent = path.basename(path.dirname(p));
  return parent === "branches";
}
