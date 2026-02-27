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

/*
 How to apply this header to source files (examples)

 1) Prepend header to a single file (POSIX shells):

    cat LICENSE_HEADER.txt "$FILE" > "$FILE".with-header && mv "$FILE".with-header "$FILE"

 2) Apply to multiple files (example: the project's main entry files):

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp packages/cli/src/*.ts packages/mcp/src/*.ts; do
      if [ -f "$f" ]; then
        cp "$f" "$f".bak
        (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
      fi
    done

 3) Avoid duplicating the header: run a quick guard to only add if missing

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp; do
      if [ -f "$f" ]; then
        if ! head -n 5 "$f" | grep -q "Copyright (C) 2026 Piotr Franczyk"; then
          cp "$f" "$f".bak
          (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
        fi
      fi
    done
*/
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
