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

const KIBI_LANE_KINDS: Array<{ prefix: string; kind: PathKind }> = [
  { prefix: "requirements/", kind: "requirement" },
  { prefix: "scenarios/", kind: "scenario" },
  { prefix: "tests/", kind: "test" },
  { prefix: "adr/", kind: "adr" },
  { prefix: "flags/", kind: "flag" },
  { prefix: "events/", kind: "event" },
  { prefix: "facts/", kind: "fact" },
  { prefix: "symbols.yaml", kind: "symbol" },
  { prefix: "symbol-coordinates.yaml", kind: "symbol" },
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

  const normalized = rel.toLowerCase();

  if (normalized.startsWith(`${KB_PREFIX}/`)) {
    isUnderKb = true;
    const rest = normalized.slice(KB_PREFIX.length + 1);
    for (const lane of KIBI_LANE_KINDS) {
      if (rest === lane.prefix || rest.startsWith(lane.prefix)) {
        kind = lane.kind;
        isKibiDocRelevant = true;
        break;
      }
    }
    if (kind === "unknown") {
      kind = "kb";
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
