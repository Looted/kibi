import { execFileSync, execSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
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
  ".py",
  ".pyi",
  ".go",
  ".rs",
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

function runGit(workspaceRoot: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, GIT_LITERAL_PATHSPECS: "1" },
  });
}

function readWorkingTreeSource(
  workspaceRoot: string,
  sourceFile: string,
): string | null {
  const absolutePath = path.resolve(workspaceRoot, sourceFile);
  const relative = path.relative(workspaceRoot, absolutePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("Source path must remain inside the workspace");
  if (!existsSync(absolutePath) || !lstatSync(absolutePath).isFile())
    return null;
  const actualRelative = path.relative(
    realpathSync(workspaceRoot),
    realpathSync(absolutePath),
  );
  if (actualRelative.startsWith("..") || path.isAbsolute(actualRelative))
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
  return [{ start: 1, end: Math.max(1, content.split(/\r?\n/).length) }];
}

function getWorkingTreeDiffSourceFiles(workspaceRoot: string): string[] {
  try {
    return uniqueSorted(
      runGit(workspaceRoot, ["diff", "--name-only", "-z", "--diff-filter=ACMR"])
        .split("\0")
        .map((filePath) => normalizeSourceFile(workspaceRoot, filePath))
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
    const diffText = runGit(workspaceRoot, ["diff", "-U0", "--", sourceFile]);
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
        !/\.(pyi?|go|rs)$/.test(file.path) &&
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
    const diffText = runGit(workspaceRoot, ["diff", "-U0", "--", sourceFile]);
    if (
      !/\.(pyi?|go|rs)$/.test(sourceFile) &&
      !hasMeaningfulSourceDiff(diffText)
    )
      return [];
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
