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
import fs from "node:fs";
import {
  KIBI_PROJECT_ENV_FILE,
  bootstrapKibiEnvironment,
  inspectSecretSource,
  parseEnvContent,
  resolveEnvFilePath,
  resolveKibiProjectEnvPath,
  resolveKibiWorkspaceRoot,
} from "kibi-runtime";

function getEnvValue(key: string): string | undefined {
  const value = process.env[key];
  return typeof value === "string" ? value : undefined;
}

function getTrimmedEnvValue(key: string): string | undefined {
  const value = getEnvValue(key)?.trim();
  return value ? value : undefined;
}

/** Preferred project env file name (`.env.kibi` or `KIBI_ENV_FILE` override). */
export function getEnvFileName(): string {
  // implements REQ-002
  return getTrimmedEnvValue("KIBI_ENV_FILE") ?? KIBI_PROJECT_ENV_FILE;
}

export function isMcpDebugEnabled(): boolean {
  // implements REQ-002
  return Boolean(getEnvValue("KIBI_MCP_DEBUG"));
}

export function getBranchOverride(): string | undefined {
  // implements REQ-002
  // Branch names are identities, not display labels. Preserve the value
  // exactly so the Git-ref validator can reject whitespace or other invalid
  // input instead of silently attaching a different branch.
  const value = getEnvValue("KIBI_BRANCH");
  return value === undefined || value.length === 0 ? undefined : value;
}

export function getKbPlPathOverride(): string | undefined {
  // implements REQ-002
  return getEnvValue("KIBI_KB_PL_PATH");
}

export function getCoreModulePathOverride(
  fileName: string,
): string | undefined {
  // implements REQ-002
  const envKey = `KIBI_${fileName.replace(/\W/g, "_").toUpperCase()}_PATH`;
  return getEnvValue(envKey);
}

export type LoadEnvResult = {
  loaded: boolean;
  envFilePath: string;
  keysLoaded: string[];
};

/**
 * Harness-independent bootstrap: process → project `.env.kibi`/`KIBI_ENV_FILE`
 * → user `~/.config/kibi/env`, plus legacy `.env` gap-fill.
 * Prefer calling from `startServer()` only.
 */
export function loadDefaultEnvFile(): LoadEnvResult {
  // implements REQ-002
  const result = bootstrapKibiEnvironment();
  const keysLoaded = [
    ...result.keysLoadedFromUser,
    ...result.keysLoadedFromProject,
    ...result.keysLoadedFromLegacy,
  ];
  return {
    loaded: keysLoaded.length > 0,
    envFilePath: result.projectEnvPath,
    keysLoaded,
  };
}

/** @deprecated Prefer bootstrapKibiEnvironment; kept for targeted file tests. */
export function loadEnvFile(options: {
  // implements REQ-002
  envFileName: string;
  workspaceRoot: string;
}): LoadEnvResult {
  const { envFileName, workspaceRoot } = options;
  const envFilePath = resolveEnvFilePath(envFileName, workspaceRoot);
  const keysLoaded: string[] = [];

  if (!fs.existsSync(envFilePath)) {
    return { loaded: false, envFilePath, keysLoaded };
  }

  try {
    const raw = fs.readFileSync(envFilePath, "utf8");
    for (const { key, value } of parseEnvContent(raw)) {
      if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
        continue;
      }
      process.env[key] = value;
      keysLoaded.push(key);
    }
    return { loaded: true, envFilePath, keysLoaded };
  } catch (error) {
    console.error(
      `[Kibi] Unable to load environment file ${envFilePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return { loaded: false, envFilePath, keysLoaded };
  }
}

export {
  resolveEnvFilePath,
  resolveKibiProjectEnvPath,
  resolveKibiWorkspaceRoot,
  inspectSecretSource,
};
