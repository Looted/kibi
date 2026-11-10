import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const roots: string[] = [];

/** A fresh temporary workspace, removed by `cleanupWorkspaces`. */
export function workspace(prefix = "kibi-opsm-"): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

export function writeIn(
  root: string,
  relative: string,
  content: string,
): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

export function cleanupWorkspaces(): void {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
}

/** A fresh temporary workspace holding `files` (workspace-relative paths). */
export function tempWorkspace(files: Record<string, string> = {}): string {
  const root = workspace("kibi-ops-mutation-");
  for (const [relative, content] of Object.entries(files)) {
    writeIn(root, relative, content);
  }
  return root;
}

/** Remove every workspace created here; call from `afterEach`. */
export function removeTempWorkspaces(): void {
  cleanupWorkspaces();
}
