// implements REQ-opencode-kibi-plugin-v1
import * as path from "node:path";

// Canonical Kibi knowledge paths — must stay in sync with
// packages/cli/src/utils/kb-paths.ts CANONICAL_ENTITY_PATHS.
const CANONICAL_KB_PATHS = {
  requirements: ".kb/requirements/**/*.md",
  scenarios: ".kb/scenarios/**/*.md",
  tests: ".kb/tests/**/*.md",
  adr: ".kb/adr/**/*.md",
  flags: ".kb/flags/**/*.md",
  events: ".kb/events/**/*.md",
  facts: ".kb/facts/**/*.md",
  symbols: ".kb/symbols.yaml",
} as const;

export function loadKbSyncPaths(_cwd = process.cwd()) {
  return CANONICAL_KB_PATHS;
}

// implements REQ-opencode-kibi-plugin-v1
export interface KbExistenceTarget {
  key: string;
  relativePath: string;
  kind: "dir" | "file";
}

// implements REQ-opencode-kibi-plugin-v1
export function getKbExistenceTargets(
  cwd = process.cwd(),
): KbExistenceTarget[] {
  const paths = loadKbSyncPaths(cwd);
  return (Object.keys(paths) as Array<keyof typeof paths>).map((key) => {
    const raw = paths[key];
    return raw.endsWith(".yaml")
      ? { key, relativePath: raw, kind: "file" }
      : { key, relativePath: stripToRoot(raw), kind: "dir" };
  });
}

// implements REQ-opencode-kibi-plugin-v1
/** Strip the first path segment containing a glob character and everything
 *  after it, returning the directory root to check with existsSync.
 */
export function stripToRoot(p: string): string {
  const segments = p.split("/");
  const rootSegments: string[] = [];
  for (const seg of segments) {
    if (seg.includes("*") || seg.includes("?") || seg.includes("[")) break;
    rootSegments.push(seg);
  }
  const result = rootSegments.join("/");
  return result || ".";
}

// implements REQ-opencode-kibi-plugin-v1
/** Whether a path is a Kibi knowledge document: a markdown file under one of
 *  the canonical lanes, or the symbols manifest. */
export function shouldHandleFile(
  filePath: string,
  cwd = process.cwd(),
): boolean {
  const rel = path.isAbsolute(filePath)
    ? path.relative(cwd, filePath).split(path.sep).join("/")
    : filePath.split(path.sep).join("/");

  return getKbExistenceTargets(cwd).some((target) =>
    target.kind === "file"
      ? rel === target.relativePath
      : rel.startsWith(`${target.relativePath}/`) && rel.endsWith(".md"),
  );
}

export default shouldHandleFile;
