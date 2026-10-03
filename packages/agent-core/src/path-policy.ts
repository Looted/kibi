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
 * Source detection deliberately does not require a `src/` segment: `lib/`,
 * `app/`, and root-level packages are source too.
 */
export type PathKind = "source" | "test" | "kb" | "other";

const codeExtensions = new Set([
  ".c",
  ".cc",
  ".cjs",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".hpp",
  ".html",
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

const documentationExtensions = new Set([".md", ".mdx", ".rst", ".txt"]);
const documentationSegments = new Set(["docs", "documentation"]);
const canonicalKbKnowledgeLanes = new Set([
  "requirements",
  "scenarios",
  "tests",
  "facts",
  "adr",
  "flags",
  "events",
]);
const canonicalKbKnowledgeFiles = new Set([
  "symbols.yaml",
  "symbol-coordinates.yaml",
]);
const explicitPathKeys = new Set([
  "absolute_path",
  "file",
  "file_path",
  "filepath",
  "new_path",
  "old_path",
  "path",
  "paths",
  "relative_path",
  "target_path",
]);

export type WorkspacePath = {
  /** Path relative to the workspace root, forward slashes. */
  relative: string;
  absolute: string;
};

export type CanonicalWorkspacePath = {
  workspaceRelative: string;
  absolute: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeWorkspacePath(candidate: string): string {
  return candidate.trim().replaceAll("\\", "/");
}

function pathSegments(candidate: string): string[] {
  return normalizeWorkspacePath(candidate).split("/").filter(Boolean);
}

function collectPathValues(value: unknown, output: string[]): void {
  if (typeof value === "string") {
    const normalized = normalizeWorkspacePath(value);
    if (normalized.length > 0) output.push(normalized);
    return;
  }
  if (!Array.isArray(value)) return;
  for (const item of value) collectPathValues(item, output);
}

function visitExplicitPathFields(value: unknown, output: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) visitExplicitPathFields(item, output);
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (explicitPathKeys.has(key.toLowerCase()))
      collectPathValues(child, output);
    visitExplicitPathFields(child, output);
  }
}

export function extractExplicitPathFields(input: unknown): string[] {
  const paths: string[] = [];
  visitExplicitPathFields(input, paths);
  return [...new Set(paths)];
}

const patchFileHeader = /^\*\*\* (?:Update|Add|Delete) File: (.+)$/;
const patchTextKeys = ["command", "patch", "input", "patchText"] as const;

/**
 * Files named by an `apply_patch` envelope (`*** Update File: <path>`,
 * `*** Add File:`, `*** Delete File:`), in patch order.
 */
// implements REQ-codex-kibi-plugin-v1
export function extractPatchFilePaths(patch: string): string[] {
  const paths: string[] = [];
  for (const line of patch.split(/\r?\n/)) {
    const match = patchFileHeader.exec(line.trim());
    const candidate = match?.[1] ? normalizeWorkspacePath(match[1]) : "";
    if (candidate.length > 0) paths.push(candidate);
  }
  return [...new Set(paths)];
}

/**
 * Paths an edit tool call targets: explicit path fields plus the files named
 * in patch text (Codex sends `apply_patch` with the patch in `command`).
 */
// implements REQ-codex-kibi-plugin-v1, REQ-zcode-kibi-plugin-v1
export function extractEditedPaths(toolInput: unknown): string[] {
  const paths = extractExplicitPathFields(toolInput);
  if (isRecord(toolInput)) {
    for (const key of patchTextKeys) {
      const value = toolInput[key];
      if (typeof value === "string" && value.includes("*** ")) {
        paths.push(...extractPatchFilePaths(value));
      }
    }
  }
  return [...new Set(paths)];
}

export function canonicalizeWorkspacePath(
  workspaceRoot: string,
  options: {
    eventCwd?: string | undefined;
    base?: string | undefined;
    rawPath: string;
  },
): CanonicalWorkspacePath | undefined {
  const trimmed = normalizeWorkspacePath(options.rawPath);
  if (trimmed.length === 0) return undefined;

  const base = options.base ?? options.eventCwd ?? workspaceRoot;
  const absolute = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(base, trimmed);
  const workspaceRelative = path
    .relative(workspaceRoot, absolute)
    .replaceAll("\\", "/");
  if (
    workspaceRelative.length === 0 ||
    workspaceRelative === ".." ||
    workspaceRelative.startsWith("../") ||
    path.isAbsolute(workspaceRelative)
  ) {
    return undefined;
  }
  return { workspaceRelative, absolute };
}

/**
 * Resolve a tool-call path against the event cwd and express it relative to
 * the Kibi workspace root. Paths outside the workspace return undefined.
 */
export function toWorkspacePath(
  workspaceRoot: string,
  rawPath: string,
  eventCwd?: string,
): WorkspacePath | undefined {
  const canonical = canonicalizeWorkspacePath(workspaceRoot, {
    rawPath,
    eventCwd,
  });
  return canonical
    ? { relative: canonical.workspaceRelative, absolute: canonical.absolute }
    : undefined;
}

export function classifyPath(relativePath: string): PathKind {
  const segments = pathSegments(relativePath);
  if (segments[0] === ".kb") return "kb";
  if (segments.some((segment) => ignoredSegments.has(segment))) return "other";
  if (segments.some((segment) => documentationSegments.has(segment))) {
    return "other";
  }

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

export function isKbPath(candidate: string): boolean {
  return pathSegments(candidate).includes(".kb");
}

export function isRootKbPath(candidate: string): boolean {
  return pathSegments(candidate)[0] === ".kb";
}

function isCanonicalKbKnowledgePath(segments: readonly string[]): boolean {
  const kbIndex = segments.indexOf(".kb");
  if (kbIndex < 0) return false;
  const lane = segments[kbIndex + 1];
  return (
    lane !== undefined &&
    (canonicalKbKnowledgeFiles.has(lane) || canonicalKbKnowledgeLanes.has(lane))
  );
}

export function isMeaningfulTrackedPath(candidate: string): boolean {
  const segments = pathSegments(candidate);
  if (segments.some((segment) => ignoredSegments.has(segment))) return false;
  if (segments.includes(".kb")) return isCanonicalKbKnowledgePath(segments);

  const basename = segments.at(-1) ?? "";
  const extension = path.extname(basename).toLowerCase();
  if (basename === "README.md") return true;
  if (segments.some((segment) => documentationSegments.has(segment))) {
    return documentationExtensions.has(extension);
  }
  if (
    testBasename.test(basename) ||
    segments.slice(0, -1).some((segment) => testSegments.has(segment))
  ) {
    return (
      codeExtensions.has(extension) || documentationExtensions.has(extension)
    );
  }
  return codeExtensions.has(extension);
}

export function isSourceImpactRelevantPath(candidate: string): boolean {
  return classifyPath(normalizeWorkspacePath(candidate)) === "source";
}

export function isDocumentationTrackedPath(candidate: string): boolean {
  const segments = pathSegments(candidate);
  const basename = segments.at(-1) ?? "";
  return (
    basename === "README.md" ||
    segments.some((segment) => documentationSegments.has(segment)) ||
    documentationExtensions.has(path.extname(basename).toLowerCase())
  );
}
