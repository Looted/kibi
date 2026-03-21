// implements REQ-opencode-kibi-plugin-v1
import path from "node:path";
import { loadKbSyncPaths } from "./file-filter.js";

export type PathKind =
  | "code"
  | "requirement"
  | "scenario"
  | "test"
  | "adr"
  | "fact"
  | "kb"
  | "unknown";

export interface PathAnalysis {
  kind: PathKind;
  isUnderKb: boolean;
  isKibiDocRelevant: boolean;
}

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py"];
const KB_PREFIX = ".kb";

/**
 * Derive the PathKind from a path key and relative file path.
 */
function kindFromPathKey(key: string, rel: string): PathKind | null {
  // Normalize for comparison
  const keyLower = key.toLowerCase();

  // Check if the path matches the expected pattern for this key
  // Handle both glob patterns and directory prefixes
  const isMatch = (pattern: string, target: string): boolean => {
    const normalizedPattern = pattern.replace(/\*\*/g, "").toLowerCase();
    const normalizedTarget = target.toLowerCase();
    // Check exact file match or directory prefix match
    const prefix = `${normalizedPattern.replace(/\/+$/, "")}/`;
    return (
      normalizedTarget === normalizedPattern ||
      normalizedTarget.startsWith(prefix)
    );
  };

  if (!isMatch(key, rel)) return null;

  switch (keyLower) {
    case "requirements":
      return "requirement";
    case "scenarios":
      return "scenario";
    case "tests":
      return "test";
    case "adr":
      return "adr";
    case "facts":
      return "fact";
    case "events":
      return "fact"; // events map to fact for routing
    case "flags":
      return "fact"; // flags map to fact for routing
    default:
      return null;
  }
}

export function analyzePath(filePath: string, cwd: string): PathAnalysis {
  const rel = path.isAbsolute(filePath)
    ? path.relative(cwd, filePath).split(path.sep).join("/")
    : filePath.split(path.sep).join("/");

  let kind: PathKind = "unknown";
  let isUnderKb = false;
  let isKibiDocRelevant = false;

  // Check if under .kb/**
  if (rel.startsWith(`${KB_PREFIX}/`)) {
    kind = "kb";
    isUnderKb = true;
  }

  // Check for Kibi doc paths using config-aware patterns
  const paths = loadKbSyncPaths(cwd);
  const pathKeys: Array<keyof typeof paths> = [
    "requirements",
    "scenarios",
    "tests",
    "adr",
    "facts",
    "flags",
    "events",
    "symbols",
  ];

  for (const key of pathKeys) {
    const pattern = paths[key];
    if (!pattern) continue;

    // Convert pattern to a path for matching
    // e.g., "requirements/**/*.md" -> "requirements/"
    const dirPattern = pattern
      .replace(/\/\*\*\/\*\.md$/, "")
      .replace(/\*\*/g, "");

    // Check if the file matches this pattern
    const normalizedRel = rel.toLowerCase();
    const normalizedPattern = dirPattern.toLowerCase();
    const patternPrefix = `${normalizedPattern}/`;

    // Match if file is in this directory or matches exactly
    if (
      normalizedRel.startsWith(patternPrefix) ||
      normalizedRel === normalizedPattern
    ) {
      isKibiDocRelevant = true;
      if (kind === "unknown") {
        const derivedKind = kindFromPathKey(key, rel);
        if (derivedKind) {
          kind = derivedKind;
        }
      }
      break;
    }
  }

  // Check for code files
  if (kind === "unknown") {
    const ext = path.extname(rel).toLowerCase();
    if (CODE_EXTENSIONS.includes(ext)) {
      kind = "code";
    }
  }

  return { kind, isUnderKb, isKibiDocRelevant };
}
