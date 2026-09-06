export function isFreshnessLane(lane: string | undefined): boolean {
  return (
    lane === "requirements" ||
    lane === "scenarios" ||
    lane === "tests" ||
    lane === "facts" ||
    lane === "adr" ||
    lane === "flags" ||
    lane === "events" ||
    lane === "symbols.yaml" ||
    lane === "symbol-coordinates.yaml"
  );
}

// implements REQ-cursor-kibi-plugin-v1
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

export function isDirectKbPath(candidate: string): boolean {
  return pathSegments(candidate).includes(".kb");
}

export function isMeaningfulTrackedPath(candidate: string): boolean {
  const normalized = normalizePath(candidate);
  const segments = pathSegments(normalized);

  if (segments.includes("dist")) {
    return false;
  }

  if (segments.includes(".kb")) {
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

/** Paths whose edits should trigger a KB freshness stop follow-up. */
export function isKbFreshnessRelevantPath(candidate: string): boolean {
  const segments = pathSegments(normalizePath(candidate));

  if (segments[0] === ".kb") {
    const lane = segments[1];
    if (isFreshnessLane(lane)) {
      return true;
    }
  }

  // Legacy layout during migration
  if (segments.includes("documentation")) {
    return true;
  }

  return (
    segments[0] === "packages" &&
    segments[1] === "core" &&
    segments[2] === "src"
  );
}

export function isSourceImpactRelevantPath(candidate: string): boolean {
  const normalized = normalizePath(candidate);
  const segments = pathSegments(normalized);

  if (
    segments.includes(".kb") ||
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

export function isDocumentationTrackedPath(candidate: string): boolean {
  const normalized = normalizePath(candidate);
  const segments = pathSegments(normalized);
  const basename = segments.at(-1) ?? "";
  const extension = basename.includes(".")
    ? `.${basename.split(".").at(-1) ?? ""}`
    : "";

  return (
    segments.includes("docs") ||
    segments.includes("documentation") ||
    documentationExtensions.has(extension)
  );
}

export function toRepoRelativePath(
  candidate: string,
  cwd: string | undefined,
): string {
  const normalized = normalizePath(candidate);
  if (!cwd) {
    return normalized;
  }

  const cwdPrefix = `${normalizePath(cwd)}/`;
  if (normalized.startsWith(cwdPrefix)) {
    return normalized.slice(cwdPrefix.length);
  }

  return normalized;
}
