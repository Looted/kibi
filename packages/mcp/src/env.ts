import fs from "node:fs";
import { resolveEnvFilePath, resolveWorkspaceRoot } from "./workspace.js";

const DEFAULT_ENV_FILE = ".env";

export type LoadEnvResult = {
  loaded: boolean;
  envFilePath: string;
  keysLoaded: string[];
};

export function loadDefaultEnvFile(): LoadEnvResult {
  const envFileName = process.env.KIBI_ENV_FILE ?? DEFAULT_ENV_FILE;
  const workspaceRoot = resolveWorkspaceRoot();
  return loadEnvFile({ envFileName, workspaceRoot });
}

export function loadEnvFile(options: {
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
