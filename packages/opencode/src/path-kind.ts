// implements REQ-opencode-kibi-plugin-v1
import path from "node:path";

export type PathKind =
  | "code"
  | "requirement"
  | "scenario"
  | "test"
  | "adr"
  | "fact"
  | "flag"
  | "event"
  | "symbol"
  | "kb"
  | "unknown";

export interface PathAnalysis {
  kind: PathKind;
  isUnderKb: boolean;
  isKibiDocRelevant: boolean;
}

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py"];
const KB_PREFIX = ".kb";

const KIBI_DOC_PATTERNS = [
  "requirements/**",
  "scenarios/**",
  "tests/**",
  "adr/**",
  "flags/**",
  "events/**",
  "facts/**",
  "symbols.yaml",
];

export function analyzePath(
  // implements REQ-opencode-kibi-plugin-v1
  filePath: string,
  cwd = process.cwd(),
): PathAnalysis {
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

  // Check for Kibi doc paths
  const normalized = rel.toLowerCase();
  for (const pattern of KIBI_DOC_PATTERNS) {
    const patternPrefix = pattern.replace(/\*\*/g, "");
    const fullPathPattern = `documentation/${patternPrefix}`;
    if (normalized.startsWith(fullPathPattern)) {
      isKibiDocRelevant = true;
      if (kind === "unknown") {
        // Map to specific kind based on path
        if (patternPrefix.includes("requirements")) kind = "requirement";
        else if (patternPrefix.includes("scenarios")) kind = "scenario";
        else if (patternPrefix.includes("tests")) kind = "test";
        else if (patternPrefix.includes("adr")) kind = "adr";
        else if (patternPrefix.includes("facts")) kind = "fact";
        else if (patternPrefix.includes("events")) kind = "event";
        else if (patternPrefix.includes("flags")) kind = "flag";
        else if (patternPrefix.includes("symbols")) kind = "symbol";
      }
      break;
    }
  }

  if (kind === "unknown") {
    const isTestPath =
      normalized.includes("/__tests__/") ||
      normalized.startsWith("tests/") ||
      /(?:^|\/)[^/]+\.(test|spec)\.[^.]+$/i.test(normalized);
    if (isTestPath) {
      kind = "test";
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
