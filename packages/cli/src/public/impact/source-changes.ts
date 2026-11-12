import { execFileSync, execSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import * as path from "node:path";
import { isQualifiedSourcePath } from "../../plugins/source-classification.js";
import type { HunkRange } from "../../traceability/git-staged.js";
import {
  getStagedFiles,
  parseHunksFromDiff,
} from "../../traceability/git-staged.js";
import { hasMeaningfulSourceDiff } from "./diff-meaning.js";
import type { ChangedFileImpactOptions, SourceChange } from "./types.js";

function isSupportedSourcePath(filePath: string): boolean {
  return isQualifiedSourcePath(filePath);
}

export function normalizeSourceFile(
  workspaceRoot: string,
  sourceFile: string,
): string {
  const relativePath = path.isAbsolute(sourceFile)
    ? path.relative(workspaceRoot, sourceFile)
    : sourceFile;
  return relativePath.split(path.sep).join("/");
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function runGit(workspaceRoot: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, GIT_LITERAL_PATHSPECS: "1" },
  });
}

/** Whether a path.relative() result leaves its base ("..x" stays inside). */
function leavesBase(relative: string): boolean {
  return (
    // path.relative returns an absolute path only across Windows drives.
    relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
  );
}

function readWorkingTreeSource(
  workspaceRoot: string,
  sourceFile: string,
): string | null {
  const absolutePath = path.resolve(workspaceRoot, sourceFile);
  const relative = path.relative(workspaceRoot, absolutePath);
  // Callers pass qualified source file paths, never the root or its parent.
  if (leavesBase(relative))
    throw new Error("Source path must remain inside the workspace");
  if (!existsSync(absolutePath) || !lstatSync(absolutePath).isFile())
    return null;
  const actualRelative = path.relative(
    realpathSync(workspaceRoot),
    realpathSync(absolutePath),
  );
  if (leavesBase(actualRelative))
    throw new Error("Source path escapes the workspace");
  const bytes = readFileSync(absolutePath);
  if (bytes.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function fullFileHunk(content: string): HunkRange[] {
  // Splitting always yields at least one line.
  return [{ start: 1, end: content.split(/\r?\n/).length }];
}

/**
 * Python, Go and Rust changes are reviewed whatever their diff looks like:
 * whitespace is meaningful there or the diff filter does not understand them.
 */
function isMeaningfulChange(sourceFile: string, diffText: string): boolean {
  return (
    /\.(pyi?|go|rs)$/.test(sourceFile) || hasMeaningfulSourceDiff(diffText)
  );
}

function getWorkingTreeDiffSourceFiles(workspaceRoot: string): string[] {
  // rationale: any fallback text yields no source path once filtered
  // Stryker disable next-line StringLiteral
  let names = "";
  try {
    names = runGit(workspaceRoot, [
      "diff",
      "--name-only",
      "-z",
      "--diff-filter=ACMR",
    ]);
  } catch {
    // Outside a repository there is no working-tree diff.
  }
  return uniqueSorted(
    names
      .split("\0")
      .map((filePath) => normalizeSourceFile(workspaceRoot, filePath))
      // The trailing "" after the last NUL is not a source path either.
      .filter(isSupportedSourcePath),
  );
}

function getStagedSourceChanges(
  workspaceRoot: string,
  sourceFileFilter: ReadonlySet<string>,
): SourceChange[] {
  const stagedFiles = getStagedFiles((command, options) =>
    execSync(command, { ...options, cwd: workspaceRoot }),
  );

  return stagedFiles
    .filter((file) => isSupportedSourcePath(file.path))
    .filter(
      (file) => sourceFileFilter.size === 0 || sourceFileFilter.has(file.path),
    )
    .flatMap((file): SourceChange[] => {
      // getStagedFiles always reads both the staged diff and content, and
      // yields JavaScript and TypeScript only, whose hunk-less diffs (mode
      // changes) are never meaningful.
      if (!isMeaningfulChange(file.path, file.diffText as string)) return [];
      return [
        {
          file: file.path,
          status: file.status,
          hunkRanges: file.hunkRanges,
          content: file.content as string,
        },
      ];
    });
}

function getWorkingTreeSourceChanges(
  workspaceRoot: string,
  sourceFileFilter: ReadonlySet<string>,
): SourceChange[] {
  const sourceFiles =
    sourceFileFilter.size > 0
      ? [...sourceFileFilter]
      : getWorkingTreeDiffSourceFiles(workspaceRoot);

  return sourceFiles.flatMap((sourceFile): SourceChange[] => {
    const content = readWorkingTreeSource(workspaceRoot, sourceFile);
    if (content === null) return [];
    const diffText = runGit(workspaceRoot, ["diff", "-U0", "--", sourceFile]);
    if (!isMeaningfulChange(sourceFile, diffText)) return [];
    // The same diff names the hunks; reading it again could only disagree
    // through a race.
    const hunkRanges = parseHunksFromDiff(diffText);
    if (hunkRanges.length === 0) return [];
    return [{ file: sourceFile, status: "M", hunkRanges, content }];
  });
}

function getExplicitSourceChanges(
  workspaceRoot: string,
  sourceFileFilter: ReadonlySet<string>,
): SourceChange[] {
  return [...sourceFileFilter].flatMap((sourceFile): SourceChange[] => {
    const content = readWorkingTreeSource(workspaceRoot, sourceFile);
    if (content === null) return [];
    return [
      {
        file: sourceFile,
        status: "M",
        hunkRanges: fullFileHunk(content),
        content,
      },
    ];
  });
}

export function collectSourceChanges(
  options: ChangedFileImpactOptions,
): SourceChange[] {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const sourceFileFilter = new Set(
    options.sourceFiles
      ?.map((sourceFile) => normalizeSourceFile(workspaceRoot, sourceFile))
      .filter(isSupportedSourcePath),
  );

  if (options.staged)
    return getStagedSourceChanges(workspaceRoot, sourceFileFilter);
  if (options.includeWorkingTreeDiff) {
    return getWorkingTreeSourceChanges(workspaceRoot, sourceFileFilter);
  }
  return getExplicitSourceChanges(workspaceRoot, sourceFileFilter);
}
