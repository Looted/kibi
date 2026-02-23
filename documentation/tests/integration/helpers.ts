import { execSync } from "node:child_process";

export function ensureMainBranch(cwd: string) {
  try {
    const branch = execSync("git branch --show-current", {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    if (branch === "master") {
      execSync("git branch -m master main", { cwd, stdio: "pipe" });
    }
  } catch {
    // ignore
  }
}
