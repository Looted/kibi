// implements REQ-zcode-kibi-plugin-v1
import path from "node:path";

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

const sourceExtensions = new Set([
  ".c",
  ".cc",
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
]);

const documentationExtensions = new Set([".md", ".mdx", ".rst", ".txt"]);

const CANONICAL_KB_KNOWLEDGE_LANES = new Set([
  "requirements",
  "scenarios",
  "tests",
  "facts",
  "adr",
  "flags",
  "events",
]);

const CANONICAL_KB_KNOWLEDGE_FILES = new Set([
  "symbols.yaml",
  "symbol-coordinates.yaml",
]);

function isCanonicalKbKnowledgePath(segments: readonly string[]): boolean {
  if (segments[0] !== ".kb") {
    return false;
  }
  const lane = segments[1];
  if (lane === undefined) {
    return false;
  }
  return (
    CANONICAL_KB_KNOWLEDGE_FILES.has(lane) ||
    CANONICAL_KB_KNOWLEDGE_LANES.has(lane)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePath(candidate: string): string {
  return candidate.trim().replaceAll("\\", "/");
}

function pathSegments(candidate: string): string[] {
  return normalizePath(candidate).split("/").filter(Boolean);
}

function collectPathValues(value: unknown, output: string[]): void {
  if (typeof value === "string") {
    const normalized = normalizePath(value);
    if (normalized.length > 0) {
      output.push(normalized);
    }
    return;
  }

  if (!Array.isArray(value)) {
    return;
  }

  for (const item of value) {
    collectPathValues(item, output);
  }
}

function visitExplicitPathFields(value: unknown, output: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitExplicitPathFields(item, output);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (explicitPathKeys.has(key.toLowerCase())) {
      collectPathValues(child, output);
    }

    visitExplicitPathFields(child, output);
  }
}

export function extractExplicitPathFields(input: unknown): string[] {
  const paths: string[] = [];
  visitExplicitPathFields(input, paths);
  return [...new Set(paths)];
}

export type CanonicalWorkspacePath = {
  /** Normalized path relative to the Kibi workspace root (forward slashes). */
  workspaceRelative: string;
  /** Absolute platform path after resolving dot segments. */
  absolute: string;
};

/**
 * Canonical identity for a path named by a tool call or check argument.
 *
 * Relative paths resolve against the originating event's cwd (editor-style
 * arguments) or against the Kibi workspace root (kb_check contract:
 * repo-relative sourceFiles); the result is normalized relative to the
 * workspace root. Paths outside the workspace return undefined so they are
 * never reinterpreted as workspace-internal files, and deleted or renamed
 * paths keep working because existence is never required.
 */
export function canonicalizeWorkspacePath(
  workspaceRoot: string,
  options: {
    eventCwd?: string | undefined;
    base?: string | undefined;
    rawPath: string;
  },
): CanonicalWorkspacePath | undefined {
  const trimmed = options.rawPath.trim().replaceAll("\\", "/");
  if (trimmed.length === 0) return undefined;

  const base = options.base ?? options.eventCwd ?? workspaceRoot;
  const absolute = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(base, trimmed);

  const workspaceRelative = path
    .relative(workspaceRoot, absolute)
    .replaceAll("\\", "/");
  // An empty relative path names the workspace root itself; an absolute
  // remainder means the path sits on a different drive (Windows).
  if (
    workspaceRelative.length === 0 ||
    workspaceRelative.startsWith("../") ||
    path.isAbsolute(workspaceRelative)
  ) {
    return undefined;
  }

  return { workspaceRelative, absolute };
}

/** Canonical KB knowledge lanes live directly under the workspace `.kb/`. */
export function isDirectKbPath(candidate: string): boolean {
  return pathSegments(candidate)[0] === ".kb";
}

export function isMeaningfulTrackedPath(candidate: string): boolean {
  const normalized = normalizePath(candidate);
  const segments = pathSegments(normalized);

  if (segments.includes("dist")) {
    return false;
  }

  if (segments[0] === ".kb") {
    return isCanonicalKbKnowledgePath(segments);
  }

  const basename = segments.at(-1) ?? "";
  const extension = basename.includes(".")
    ? `.${basename.split(".").at(-1) ?? ""}`
    : "";

  if (segments.includes("docs") || segments.includes("documentation")) {
    return documentationExtensions.has(extension);
  }

  if (basename === "README.md") {
    return true;
  }

  if (
    segments.includes("src") ||
    segments.includes("tests") ||
    segments.includes("test")
  ) {
    return (
      sourceExtensions.has(extension) || documentationExtensions.has(extension)
    );
  }

  return false;
}

export function isSourceImpactRelevantPath(candidate: string): boolean {
  const normalized = normalizePath(candidate);
  const segments = pathSegments(normalized);

  if (
    segments[0] === ".kb" ||
    segments.includes("dist") ||
    segments.includes("tests") ||
    segments.includes("test") ||
    segments.includes("docs") ||
    segments.includes("documentation")
  ) {
    return false;
  }

  const basename = segments.at(-1) ?? "";
  const extension = basename.includes(".")
    ? `.${basename.split(".").at(-1) ?? ""}`
    : "";

  return segments.includes("src") && sourceExtensions.has(extension);
}
