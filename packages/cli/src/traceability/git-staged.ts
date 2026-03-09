import { execSync } from "node:child_process";

export type Status = "A" | "M" | "R" | "D";

export interface HunkRange {
  start: number; // 1-based start line in new file
  end: number; // inclusive end line in new file
}

export interface StagedFile {
  path: string;
  status: Status;
  oldPath?: string; // for renames
  hunkRanges: HunkRange[]; // ranges in new-file coordinates
  content?: string; // staged file content (UTF-8)
}

function runGit(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" });
  } catch (err: unknown) {
    // wrap common errors
    const e = err as { message?: unknown } | undefined;
    const message = e && e.message ? String(e.message) : String(err);
    throw new Error(`git command failed: ${cmd} -> ${message}`);
  }
}

/**
 * Parse null-separated name-status output from git
 */
export function parseNameStatusNull(
  input: string,
): Array<{ status: string; parts: string[] }> {
  if (!input) return [];
  const entries = input.split("\0").filter(Boolean);
  return entries.map((entry) => {
    const cols = entry.split("\t");
    const status = cols[0];
    const parts = cols.slice(1);
    return { status, parts };
  });
}

const SUPPORTED_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

function hasSupportedExt(p: string): boolean {
  for (const ext of SUPPORTED_EXT) {
    if (p.endsWith(ext)) return true;
  }
  return false;
}

/**
 * Parse unified diff hunks (new-file coordinates) from git diff output
 */
export function parseHunksFromDiff(
  diffText: string,
  isNewFile = false,
): HunkRange[] {
  const ranges: HunkRange[] = [];
  if (!diffText) return ranges;
  const regex = /^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,(\d+))?\s+@@/gm;
  let m: RegExpExecArray | null = null;
  while (true) {
    m = regex.exec(diffText);
    if (!m) break;
    const c = Number.parseInt(m[1], 10);
    const d = m[2] ? Number.parseInt(m[2], 10) : 1;
    if (d > 0) {
      ranges.push({ start: c, end: c + d - 1 });
    }
  }
  // If no hunks found and isNewFile, treat entire file as changed (we'll use a sentinel later)
  if (ranges.length === 0 && isNewFile) {
    // Represent as a single wide range starting at 1, using Number.MAX_SAFE_INTEGER as a sentinel end to indicate unknown (we'll set later)
    ranges.push({ start: 1, end: Number.MAX_SAFE_INTEGER });
  }
  return ranges;
}

/**
 * Get staged files with statuses, hunks and content.
 */
export function getStagedFiles(): StagedFile[] {
  // 1. get staged name-status -z
  let nameStatus: string;
  try {
    nameStatus = runGit(
      "git diff --cached --name-status -z --diff-filter=ACMRD",
    );
  } catch (err: unknown) {
    throw new Error(`failed to list staged files: ${String(err)}`);
  }

  const parsed = parseNameStatusNull(nameStatus);
  const results: StagedFile[] = [];

  for (const entry of parsed) {
    const statusRaw = entry.status;
    const status = (statusRaw[0] as Status) || "M";

    if (status === "D") {
      // deleted files: skip but log via console.debug
      console.debug(
        `Skipping deleted file (staged): ${entry.parts.join(" -> ")}`,
      );
      continue;
    }

    // handle renames: parts = [old, new]
    let path = entry.parts[0] ?? "";
    let oldPath: string | undefined;
    if (status === "R") {
      if (entry.parts.length >= 2) {
        oldPath = entry.parts[0];
        path = entry.parts[1];
      }
    }

    if (!hasSupportedExt(path)) {
      console.debug(`Skipping unsupported extension: ${path}`);
      continue;
    }

    // 4. compute hunks using git diff --cached -U0 -- <path>
    let diffText = "";
    try {
      // use new path for diff; quote the path to handle spaces
      diffText = runGit(
        `git diff --cached -U0 -- "${path.replace(/"/g, '\\"')}"`,
      );
    } catch (err: unknown) {
      console.debug(`Failed to get diff for ${path}: ${String(err)}`);
      diffText = "";
    }

    // determine if new file: status 'A' or diff contains /dev/null in old file path
    const isNewFile = status === "A" || /\bdev\/null\b/.test(diffText);
    const hunkRanges = parseHunksFromDiff(diffText, isNewFile);

    // 5. read staged content using git show :<path>
    let content: string | undefined;
    try {
      content = runGit(`git show :"${path.replace(/"/g, '\\"')}"`);
    } catch (err: unknown) {
      // binary or deleted in index
      const e = err as { message?: unknown } | undefined;
      const em = e && e.message ? String(e.message) : String(err);
      console.debug(
        `Skipping binary/deleted or unreadable staged file ${path}: ${em}`,
      );
      continue;
    }

    // If we had a new-file sentinel (end = MAX_SAFE_INTEGER) set a realistic end as content lines
    const lines = content.split(/\r?\n/);
    for (const r of hunkRanges) {
      if (r.end === Number.MAX_SAFE_INTEGER) {
        r.end = Math.max(1, lines.length);
      }
    }

    results.push({ path, status, oldPath, hunkRanges, content });
  }

  return results;
}

export default getStagedFiles;
