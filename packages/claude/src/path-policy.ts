// implements REQ-claude-code-kibi-plugin-v1
import path from "node:path";

/**
 * What a workspace path means for Kibi guidance.
 *
 * - `source`: production code whose behavior requirements may own.
 * - `test`: test code (owned through TEST entities / executable_for).
 * - `kb`: Kibi-managed knowledge under `.kb/`.
 * - `other`: docs, config, generated output, dependencies — no snippets.
 *
 * Unlike the ZCode/Codex adapters, source detection does not require a `src/`
 * segment: `lib/`, `app/`, and root-level packages are source too.
 */
export type PathKind = "source" | "test" | "kb" | "other";

const codeExtensions = new Set([
  ".c",
  ".cc",
  ".cjs",
  ".cpp",
  ".cs",
  ".go",
  ".h",
  ".hpp",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".lua",
  ".mjs",
  ".mts",
  ".cts",
  ".php",
  ".pl",
  ".py",
  ".rb",
  ".rs",
  ".scala",
  ".sh",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte",
]);

/** Directories whose contents are generated, vendored, or tool state. */
const ignoredSegments = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "target",
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "__pycache__",
]);

const testSegments = new Set([
  "test",
  "tests",
  "__tests__",
  "spec",
  "specs",
  "e2e",
  "__mocks__",
  "fixtures",
]);

const testBasename = /(\.|_)(test|spec|e2e)\.[^.]+$|^test_[^/]+\.py$/;

export type WorkspacePath = {
  /** Path relative to the workspace root, forward slashes. */
  relative: string;
  absolute: string;
};

/**
 * Resolve a tool-call path against the event cwd and express it relative to
 * the Kibi workspace root. Paths outside the workspace return undefined.
 */
export function toWorkspacePath(
  workspaceRoot: string,
  rawPath: string,
  eventCwd?: string,
): WorkspacePath | undefined {
  const trimmed = rawPath.trim();
  if (trimmed.length === 0) return undefined;

  const absolute = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(eventCwd ?? workspaceRoot, trimmed);
  const relative = path.relative(workspaceRoot, absolute).replaceAll("\\", "/");
  if (
    relative.length === 0 ||
    relative === ".." ||
    relative.startsWith("../") ||
    path.isAbsolute(relative)
  ) {
    return undefined;
  }
  return { relative, absolute };
}

export function classifyPath(relativePath: string): PathKind {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments[0] === ".kb") return "kb";
  if (segments.some((segment) => ignoredSegments.has(segment))) return "other";

  const basename = segments.at(-1) ?? "";
  const extension = path.extname(basename).toLowerCase();
  if (!codeExtensions.has(extension)) return "other";

  if (
    testBasename.test(basename) ||
    segments.slice(0, -1).some((segment) => testSegments.has(segment))
  ) {
    return "test";
  }
  return "source";
}
