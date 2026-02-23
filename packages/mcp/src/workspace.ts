import fs from "node:fs";
import path from "node:path";

const WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
] as const;

const KB_PATH_ENV_KEYS = ["KIBI_KB_PATH", "KB_PATH"] as const;

export function resolveWorkspaceRoot(startDir: string = process.cwd()): string {
  const envRoot = readFirstEnv(WORKSPACE_ENV_KEYS);
  if (envRoot) {
    return path.resolve(envRoot);
  }

  const kbRoot = findUpwards(startDir, ".kb");
  if (kbRoot) {
    return kbRoot;
  }

  const gitRoot = findUpwards(startDir, ".git");
  if (gitRoot) {
    return gitRoot;
  }

  return path.resolve(startDir);
}

export function resolveWorkspaceRootInfo(startDir: string = process.cwd()): {
  root: string;
  reason: "env" | "kb" | "git" | "cwd";
} {
  const envRoot = readFirstEnv(WORKSPACE_ENV_KEYS);
  if (envRoot) {
    return { root: path.resolve(envRoot), reason: "env" };
  }

  const kbRoot = findUpwards(startDir, ".kb");
  if (kbRoot) {
    return { root: kbRoot, reason: "kb" };
  }

  const gitRoot = findUpwards(startDir, ".git");
  if (gitRoot) {
    return { root: gitRoot, reason: "git" };
  }

  return { root: path.resolve(startDir), reason: "cwd" };
}

export function resolveKbPath(workspaceRoot: string, branch: string): string {
  const envPath = readFirstEnv(KB_PATH_ENV_KEYS);
  if (envPath) {
    const resolved = path.resolve(envPath);
    if (isBranchPath(resolved)) {
      return resolved;
    }
    return path.join(resolved, "branches", branch);
  }

  return path.join(workspaceRoot, ".kb", "branches", branch);
}

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

function findUpwards(startDir: string, marker: string): string | null {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, marker);
    if (fs.existsSync(candidate)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function isBranchPath(p: string): boolean {
  const parent = path.basename(path.dirname(p));
  return parent === "branches";
}
