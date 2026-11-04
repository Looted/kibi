import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const roots: string[] = [];

/** A fresh temporary workspace holding `files` (workspace-relative paths). */
export function tempWorkspace(files: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-ops-mutation-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  return root;
}

/** Remove every workspace `tempWorkspace` created; call from `afterEach`. */
export function removeTempWorkspaces(): void {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
}
