// implements REQ-codex-kibi-plugin-v1
import fs from "node:fs";
import path from "node:path";

/**
 * Workspace opt-in for the Kibi Codex plugin.
 *
 * The plugin may be installed and enabled globally, but it must stay silent in
 * workspaces that never adopted Kibi. A workspace is opted in when its Kibi
 * project root owns `.kb/manifest.json` (the lifecycle manifest `kibi init`
 * creates). Executable availability, global installation, or plugin
 * enablement never count as opt-in.
 *
 * Root resolution mirrors the Kibi MCP workspace resolver: an explicit
 * `KIBI_WORKSPACE` / `KIBI_PROJECT_ROOT` / `KIBI_ROOT` environment override
 * wins, then the walk from the session directory stops at the first
 * `.kb/manifest.json` (opted in) or `.git` boundary (not opted in, unless the
 * boundary directory itself is opted in). Stopping at `.git` keeps sibling and
 * enclosing repositories — including unrelated checkouts above a worktree —
 * from leaking opt-in into this workspace; a Git worktree carries its own
 * `.git` file, so its root is evaluated independently of the main checkout.
 */

export const KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
] as const;

export type KibiWorkspaceResolution = {
  /** Kibi project root used for opt-in and state isolation. */
  root: string;
  /** True only when `root/.kb/manifest.json` exists. */
  optedIn: boolean;
};

function nextAncestorDirectory(current: string): string | undefined {
  const parent = path.dirname(current);
  return parent === current ? undefined : parent;
}

function hasKibiManifest(directory: string): boolean {
  return fs.existsSync(path.join(directory, ".kb", "manifest.json"));
}

function hasGitBoundary(directory: string): boolean {
  return fs.existsSync(path.join(directory, ".git"));
}

function resolutionFor(root: string): KibiWorkspaceResolution {
  return { root, optedIn: hasKibiManifest(root) };
}

export function resolveKibiWorkspace(
  startDir: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): KibiWorkspaceResolution {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      return resolutionFor(path.resolve(value));
    }
  }

  let current: string | undefined = path.resolve(
    startDir && startDir.trim().length > 0 ? startDir : process.cwd(),
  );
  while (current !== undefined) {
    if (hasKibiManifest(current)) {
      return { root: current, optedIn: true };
    }
    if (hasGitBoundary(current)) {
      return { root: current, optedIn: false };
    }
    current = nextAncestorDirectory(current);
  }

  return resolutionFor(path.resolve(startDir ?? process.cwd()));
}
