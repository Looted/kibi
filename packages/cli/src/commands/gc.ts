import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export async function gcCommand(options: {
  dryRun?: boolean;
  force?: boolean;
}) {
  // If force is true, perform deletion. Otherwise default to dry run.
  const dryRun = options?.force ? false : (options?.dryRun ?? true);

  try {
    const kbRoot = path.resolve(process.cwd(), ".kb/branches");

    if (!fs.existsSync(kbRoot)) {
      console.error("No branch KBs found (.kb/branches does not exist)");
      process.exitCode = 1;
      return;
    }

    let gitBranches: Set<string>;
    try {
      execSync("git rev-parse --git-dir", {
        encoding: "utf-8",
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      const output = execSync("git branch --format='%(refname:short)'", {
        encoding: "utf-8",
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      gitBranches = new Set(
        output
          .trim()
          .split("\n")
          .map((b) => b.trim().replace(/^'|'$/g, ""))
          .filter((b) => b),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `Not in a git repository or git command failed: ${message}`,
      );
      process.exitCode = 1;
      return;
    }

    const kbBranches = fs
      .readdirSync(kbRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const staleBranches = kbBranches.filter(
      (kb) => kb !== "main" && !gitBranches.has(kb),
    );

    // Perform deletion when dryRun is false (force requested)
    const performDelete = !dryRun;
    let deletedCount = 0;
    if (performDelete && staleBranches.length > 0) {
      for (const branch of staleBranches) {
        const branchPath = path.join(kbRoot, branch);
        fs.rmSync(branchPath, { recursive: true, force: true });
        deletedCount++;
      }
    }

    if (dryRun) {
      console.log(
        `Found ${staleBranches.length} stale branch KB(s) (dry run - not deleted)`,
      );
      if (staleBranches.length > 0) {
        for (const b of staleBranches) console.log(`  - ${b}`);
      }
    } else {
      console.log(`Deleted ${deletedCount} stale branch KB(s)`);
    }

    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Branch GC failed: ${message}`);
    process.exitCode = 1;
  }
}

export default gcCommand;
