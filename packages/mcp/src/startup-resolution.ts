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

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type McpPackageInfo = {
  packageRoot: string;
  version: string;
  entrypoint: string;
};

export type McpResolutionComparison = {
  stale: boolean;
  reason: string;
  forbiddenVersionObserved: boolean;
};

export type McpResolutionResult = McpResolutionComparison & {
  packageName: "kibi-mcp";
  cwd: string;
  running: McpPackageInfo;
  projectLocal: McpPackageInfo | null;
};

type PackageJson = {
  name?: string;
  version?: string;
};

const PACKAGE_NAME = "kibi-mcp";
const FORBIDDEN_VERSION = "0.13.0";

function toEntrypointPath(entrypointUrl: string): string {
  if (entrypointUrl.startsWith("file:")) {
    return fileURLToPath(entrypointUrl);
  }
  return path.resolve(entrypointUrl);
}

function readJson(filePath: string): PackageJson {
  return JSON.parse(readFileSync(filePath, "utf8")) as PackageJson;
}

function nearestPackageJson(startPath: string): string {
  let current = path.dirname(startPath);
  while (true) {
    const candidate = path.join(current, "package.json");
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Unable to find package.json for ${startPath}`);
    }
    current = parent;
  }
}

function packageInfoFromEntrypoint(entrypoint: string): McpPackageInfo {
  const normalizedEntrypoint = path.resolve(entrypoint);
  const packageJsonPath = nearestPackageJson(normalizedEntrypoint);
  const packageJson = readJson(packageJsonPath);
  if (packageJson.name && packageJson.name !== PACKAGE_NAME) {
    throw new Error(
      `Resolved package ${packageJson.name} for ${normalizedEntrypoint}; expected ${PACKAGE_NAME}`,
    );
  }

  return {
    packageRoot: path.dirname(packageJsonPath),
    version: packageJson.version ?? "unknown",
    entrypoint: normalizedEntrypoint,
  };
}

export function readRunningPackageInfo(entrypointUrl: string): McpPackageInfo {
  return packageInfoFromEntrypoint(toEntrypointPath(entrypointUrl));
}

export function resolveProjectLocalMcp(cwd: string): McpPackageInfo | null {
  try {
    const projectRequire = createRequire(
      path.join(path.resolve(cwd), "package.json"),
    );
    const resolved = projectRequire.resolve(PACKAGE_NAME);
    const entrypoint =
      realpathSync.native?.(resolved) ?? realpathSync(resolved);
    return packageInfoFromEntrypoint(entrypoint);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND") {
      return null;
    }
    return null;
  }
}

export function compareMcpResolution(
  running: McpPackageInfo,
  projectLocal: McpPackageInfo | null,
): McpResolutionComparison {
  // implements REQ-cursor-agent-plugin-standard-v1
  const diagnosticText = JSON.stringify({ running, projectLocal });
  const forbiddenVersionObserved = diagnosticText.includes(FORBIDDEN_VERSION);

  if (!projectLocal) {
    return {
      stale: false,
      reason: "no project-local kibi-mcp resolved",
      forbiddenVersionObserved,
    };
  }

  if (running.version !== projectLocal.version) {
    return {
      stale: true,
      reason: `version mismatch: running ${running.version}, project-local ${projectLocal.version}`,
      forbiddenVersionObserved,
    };
  }

  // Same version: the running build is the version the project pins. Re-entering
  // a same-version copy (e.g. a bun-store published install) abandons the local
  // dev build for an identical-version store copy, which defeats local
  // dogfooding and can silently drop unreleased local fixes. Only re-enter on a
  // genuine version mismatch.
  return {
    stale: false,
    reason: "running kibi-mcp matches the project-local version",
    forbiddenVersionObserved,
  };
}

export function formatResolutionJson(result: McpResolutionResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}
