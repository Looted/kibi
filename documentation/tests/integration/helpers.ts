import { execSync } from "node:child_process";

export function ensureDevelopBranch(cwd: string) {
  try {
    const branch = execSync("git branch --show-current", {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    if (branch === "master" || branch === "main") {
      execSync(`git branch -m ${branch} develop`, { cwd, stdio: "pipe" });
    }
  } catch {
    // ignore
  }
}

// Deprecated alias for backward compatibility during migration
export const ensureMainBranch = ensureDevelopBranch;
