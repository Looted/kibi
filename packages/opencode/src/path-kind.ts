// implements REQ-opencode-kibi-plugin-v1
import path from "node:path";

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

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
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

  // Check for Kibi doc paths
  const normalized = rel.toLowerCase();
  for (const pattern of KIBI_DOC_PATTERNS) {
    if (normalized.startsWith(pattern.replace(/\*\*/g, ""))) {
      isKibiDocRelevant = true;
      if (kind === "unknown") {
        // Map to specific kind based on path
        if (pattern.includes("requirements")) kind = "requirement";
        else if (pattern.includes("scenarios")) kind = "scenario";
        else if (pattern.includes("tests")) kind = "test";
        else if (pattern.includes("adr")) kind = "adr";
        else if (pattern.includes("facts")) kind = "fact";
        else if (pattern.includes("events"))
          kind = "fact"; // events map to fact for routing
        else if (pattern.includes("flags"))
          kind = "fact"; // flags map to fact for routing
        else if (pattern.includes("symbols")) kind = "fact";
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
