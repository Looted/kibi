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
import { resolveEnvFilePath, resolveWorkspaceRoot } from "./workspace.js";

const DEFAULT_ENV_FILE = ".env";

function getEnvValue(key: string): string | undefined {
  const value = process.env[key];
  return typeof value === "string" ? value : undefined;
}

function getTrimmedEnvValue(key: string): string | undefined {
  const value = getEnvValue(key)?.trim();
  return value ? value : undefined;
}

export function getEnvFileName(): string {
  // implements REQ-002
  return getTrimmedEnvValue("KIBI_ENV_FILE") ?? DEFAULT_ENV_FILE;
}

export function isMcpDebugEnabled(): boolean {
  // implements REQ-002
  return Boolean(getEnvValue("KIBI_MCP_DEBUG"));
}

export function getBranchOverride(): string | undefined {
  // implements REQ-002
  return getTrimmedEnvValue("KIBI_BRANCH");
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

export function loadDefaultEnvFile(): LoadEnvResult {
  // implements REQ-002
  const envFileName = getEnvFileName();
  const workspaceRoot = resolveWorkspaceRoot();
  return loadEnvFile({ envFileName, workspaceRoot });
}

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

interface EnvEntry {
  key: string;
  value: string;
}

function parseEnvContent(content: string): EnvEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: EnvEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = line.substring(0, eqIndex).trim();
    let value = line.substring(eqIndex + 1).trim();

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }

    entries.push({ key, value });
  }

  return entries;
}
