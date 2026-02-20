import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { PrologProcess } from "@kibi/cli/src/prolog.js";

export interface BranchEnsureArgs {
  branch: string;
}

export interface BranchEnsureResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    created: boolean;
    path: string;
  };
}

export interface BranchGcArgs {
  dry_run?: boolean;
}

export interface BranchGcResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    stale: string[];
    deleted: number;
  };
}

/**
 * Handle kb_branch_ensure tool calls - create branch KB if not exists
 */
export async function handleKbBranchEnsure(
  prolog: PrologProcess,
  args: BranchEnsureArgs,
): Promise<BranchEnsureResult> {
  const { branch } = args;

  if (!branch || branch.trim() === "") {
    throw new Error("Branch name is required");
  }

  // Sanitize branch name (prevent path traversal)
  const safeBranch = branch.replace(/\.\./g, "").replace(/^\/+/, "");
  if (safeBranch !== branch) {
    throw new Error(`Invalid branch name: ${branch}`);
  }

  try {
    const kbRoot = path.resolve(process.cwd(), ".kb/branches");
    const branchPath = path.join(kbRoot, safeBranch);
    const mainPath = path.join(kbRoot, "main");

    // Check if branch KB already exists
    if (fs.existsSync(branchPath)) {
      return {
        content: [
          {
            type: "text",
            text: `Branch KB '${safeBranch}' already exists`,
          },
        ],
        structuredContent: {
          created: false,
          path: branchPath,
        },
      };
    }

    // Ensure main branch exists
    if (!fs.existsSync(mainPath)) {
      throw new Error("Main branch KB does not exist. Run 'kb init' first.");
    }

    // Copy main branch KB to new branch
    fs.cpSync(mainPath, branchPath, { recursive: true });

    return {
      content: [
        {
          type: "text",
          text: `Created branch KB '${safeBranch}' from main`,
        },
      ],
      structuredContent: {
        created: true,
        path: branchPath,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Branch ensure failed: ${message}`);
  }
}

/**
 * Handle kb_branch_gc tool calls - garbage collect stale branch KBs
 */
export async function handleKbBranchGc(
  prolog: PrologProcess,
  args: BranchGcArgs,
): Promise<BranchGcResult> {
  const { dry_run = true } = args;

  try {
    const kbRoot = path.resolve(process.cwd(), ".kb/branches");

    // Check if .kb/branches exists
    if (!fs.existsSync(kbRoot)) {
      return {
        content: [
          {
            type: "text",
            text: "No branch KBs found (.kb/branches does not exist)",
          },
        ],
        structuredContent: {
          stale: [],
          deleted: 0,
        },
      };
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
          .split("
")
          .map((b) => b.trim().replace(/^'|'$/g, ""))
          .filter((b) => b),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Not in a git repository or git command failed: ${message}`,
      );
    }

    // Get all KB branches
    const kbBranches = fs
      .readdirSync(kbRoot, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    // Find stale branches (KB exists but git branch doesn't, excluding main)
    const staleBranches = kbBranches.filter(
      (kb) => kb !== "main" && !gitBranches.has(kb),
    );

    // Delete stale branches if not dry run
    let deletedCount = 0;
    if (!dry_run && staleBranches.length > 0) {
      for (const branch of staleBranches) {
        const branchPath = path.join(kbRoot, branch);
        fs.rmSync(branchPath, { recursive: true, force: true });
        deletedCount++;
      }
    }

    const summary = dry_run
      ? `Found ${staleBranches.length} stale branch KB(s) (dry run - not deleted)`
      : `Deleted ${deletedCount} stale branch KB(s)`;

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
      structuredContent: {
        stale: staleBranches,
        deleted: deletedCount,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Branch GC failed: ${message}`);
  }
}
