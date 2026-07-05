import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import type { HunkRange } from "../../traceability/git-staged.js";
import {
  getStagedFiles,
  parseHunksFromDiff,
} from "../../traceability/git-staged.js";
import { hasMeaningfulSourceDiff } from "./diff-meaning.js";
import type { ChangedFileImpactOptions, SourceChange } from "./types.js";

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

function isSupportedSourcePath(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(filePath));
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

function escapeGitPath(filePath: string): string {
  return filePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function runGit(workspaceRoot: string, command: string): string {
  return execSync(command, { cwd: workspaceRoot, encoding: "utf8" });
}

function readWorkingTreeSource(
  workspaceRoot: string,
  sourceFile: string,
): string | null {
  const absolutePath = path.resolve(workspaceRoot, sourceFile);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, "utf8");
}

function fullFileHunk(content: string): HunkRange[] {
  return [{ start: 1, end: Math.max(1, content.split(/\r?\n/).length) }];
}

function getWorkingTreeDiffSourceFiles(workspaceRoot: string): string[] {
  try {
    return uniqueSorted(
      runGit(workspaceRoot, "git diff --name-only --diff-filter=ACMR")
        .split(/\r?\n/)
        .map((filePath) => normalizeSourceFile(workspaceRoot, filePath.trim()))
        .filter((filePath) => filePath.length > 0)
        .filter(isSupportedSourcePath),
    );
  } catch {
    return [];
  }
}

function getWorkingTreeHunks(
  workspaceRoot: string,
  sourceFile: string,
): HunkRange[] {
  try {
    const diffText = runGit(
      workspaceRoot,
      `git diff -U0 -- "${escapeGitPath(sourceFile)}"`,
    );
    return parseHunksFromDiff(diffText);
  } catch {
    return [];
  }
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
      if (file.content === undefined || file.hunkRanges.length === 0) return [];
      if (
        file.diffText !== undefined &&
        !hasMeaningfulSourceDiff(file.diffText)
      ) {
        return [];
      }
      return [
        {
          file: file.path,
          status: file.status,
          hunkRanges: file.hunkRanges,
          content: file.content,
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
    const diffText = runGit(
      workspaceRoot,
      `git diff -U0 -- "${escapeGitPath(sourceFile)}"`,
    );
    if (!hasMeaningfulSourceDiff(diffText)) return [];
    const hunkRanges = getWorkingTreeHunks(workspaceRoot, sourceFile);
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
    (options.sourceFiles ?? [])
      .map((sourceFile) => normalizeSourceFile(workspaceRoot, sourceFile))
      .filter(isSupportedSourcePath),
  );

  if (options.staged)
    return getStagedSourceChanges(workspaceRoot, sourceFileFilter);
  if (options.includeWorkingTreeDiff) {
    return getWorkingTreeSourceChanges(workspaceRoot, sourceFileFilter);
  }
  return getExplicitSourceChanges(workspaceRoot, sourceFileFilter);
}
