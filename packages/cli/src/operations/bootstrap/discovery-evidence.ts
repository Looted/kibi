import path from "node:path";

import { OperationError } from "../../cli-errors.js";
import type {
  FilesystemPort,
  GitPort,
  OperationContext,
} from "../../public/operations/runtime-types.js";
import type {
  BootstrapEvidence,
  EvidenceKind,
  EvidenceProviderName,
} from "./types.js";

const SCAN_PATTERNS = [
  "**/*.md",
  "**/symbols.{yml,yaml}",
  "**/package.json",
  "**/tsconfig*.json",
  "**/pyproject.toml",
  "**/Cargo.toml",
  "**/go.mod",
  "**/opencode.json",
  "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,py,rb,go,rs,java,kt,swift,php,c,cc,cpp,h,hpp}",
] as const;
const CODE_EXTENSION =
  /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|py|rb|go|rs|java|kt|swift|php|c|cc|cpp|h|hpp)$/i;
const LAYOUT_ROOTS = new Set([
  "src",
  "app",
  "apps",
  "packages",
  "tests",
  "test",
  "docs",
  "scripts",
]);

export type EvidenceScan = {
  readonly files: readonly string[];
  readonly ignoredSources: readonly string[];
  readonly evidence: readonly BootstrapEvidence[];
  readonly warnings: readonly string[];
};

type ScanFilesystem = FilesystemPort & {
  readonly glob: (
    patterns: readonly string[],
    options: { readonly cwd: string; readonly includeIgnored?: boolean },
  ) => Promise<readonly string[]>;
};
type ScanGit = GitPort & {
  readonly ignoredPaths: (
    workspaceRoot: string,
    paths: readonly string[],
  ) => Promise<readonly string[]>;
};

function isScanFilesystem(
  value: FilesystemPort | undefined,
): value is ScanFilesystem {
  return Boolean(value && "glob" in value && typeof value.glob === "function");
}

function isScanGit(value: GitPort | undefined): value is ScanGit {
  return Boolean(
    value &&
      "ignoredPaths" in value &&
      typeof value.ignoredPaths === "function",
  );
}

const TYPED_KIBI_LANE =
  /(^|\/)(\.kb|documentation)\/(requirements|scenarios|tests|adr|flags|events|facts)\//;
const EXECUTABLE_TEST_HARNESS =
  /(^|\/)(\.kb|documentation)\/tests\/(e2e|benchmarks)\//;

function isTypedKibiMarkdownPath(relativePath: string): boolean {
  const posix = relativePath.replaceAll("\\", "/");
  if (EXECUTABLE_TEST_HARNESS.test(posix)) return false;
  return TYPED_KIBI_LANE.test(posix);
}

function classifyFile(
  relativePath: string,
  content: string,
): readonly [EvidenceProviderName, EvidenceKind] | null {
  if (/^\.kb\/symbols\.ya?ml$/i.test(relativePath))
    return ["typed_kibi_docs", "symbol_manifest"];
  if (/\.md$/i.test(relativePath)) {
    return /^---\s*[\r\n]/.test(content) &&
      isTypedKibiMarkdownPath(relativePath)
      ? ["typed_kibi_docs", "typed_markdown"]
      : ["generic_repo_docs", "generic_markdown"];
  }
  if (
    /(^|\/)(package\.json|tsconfig[^/]*\.json|pyproject\.toml|Cargo\.toml|go\.mod)$/.test(
      relativePath,
    )
  )
    return ["repo_metadata", "repo_metadata"];
  if (
    /\.(test|spec)\.[^.]+$/i.test(relativePath) ||
    /(^|\/)__tests__\//.test(relativePath)
  )
    return ["test_topology", "test_topology"];
  if (CODE_EXTENSION.test(relativePath))
    return ["source_symbols", "source_symbols"];
  return null;
}

function evidenceData(
  provider: EvidenceProviderName,
  relativePath: string,
  content: string,
): Readonly<Record<string, unknown>> {
  if (provider === "repo_metadata") {
    const languages = new Set<string>();
    if (/^package\.json$/i.test(path.basename(relativePath))) {
      try {
        const parsed = JSON.parse(content) as {
          bin?: unknown;
          scripts?: Record<string, unknown>;
        };
        const text = JSON.stringify(parsed);
        if (/\.(?:ts|tsx|mts|cts)\b/.test(text)) languages.add("typescript");
        if (/\.(?:js|jsx|mjs|cjs)\b|node\b/.test(text))
          languages.add("javascript");
      } catch {
        // The scanner records a parse warning separately below.
      }
    }
    if (/Cargo\.toml$/i.test(relativePath)) languages.add("rust");
    if (/go\.mod$/i.test(relativePath)) languages.add("go");
    if (/pyproject\.toml$/i.test(relativePath)) languages.add("python");
    return {
      title: `Repository metadata: ${path.basename(relativePath)}`,
      factKind: "meta",
      confidence: relativePath.includes("tsconfig") ? 0.9 : 0.86,
      evidence: [`repo_metadata:${relativePath}`],
      languages: [...languages],
    };
  }
  if (provider === "test_topology") {
    const frameworks = [
      content.includes("bun:test") ? "bun:test" : "",
      content.includes("vitest") ? "vitest" : "",
      content.includes("node:test") ? "node:test" : "",
    ].filter(Boolean);
    return {
      title: `Test topology: ${frameworks.join(", ") || relativePath}`,
      factKind: "observation",
      confidence: frameworks.length > 0 ? 0.92 : 0.85,
      evidence: [
        `test_topology:${relativePath}`,
        ...frameworks.map((item) => `framework:${item}`),
      ],
      frameworks,
    };
  }
  if (provider === "source_symbols") {
    const symbolCount = Array.from(
      content.matchAll(
        /\b(?:export\s+)?(?:function|class|const|let|var|interface|type)\s+([A-Za-z_$][\w$]*)/g,
      ),
    ).length;
    return {
      title: `Source module: ${path.basename(relativePath, path.extname(relativePath))}`,
      factKind: "observation",
      confidence: 0.82,
      evidence: [`source_symbols:${relativePath}`],
      analysisMode: "parser",
      symbolCount,
    };
  }
  return {};
}

function layoutEvidence(
  workspaceRoot: string,
  files: readonly string[],
  ignored: ReadonlySet<string>,
): BootstrapEvidence[] {
  const roots = [
    ...new Set(
      files
        .filter((file) => !ignored.has(file))
        .map((file) => file.split("/", 1)[0] ?? "")
        .filter((root) => LAYOUT_ROOTS.has(root)),
    ),
  ];
  return roots.map((root) => ({
    provider: "repo_layout",
    kind: "repo_layout",
    label: root,
    relativePath: root,
    absolutePath: path.join(workspaceRoot, root),
    data: {
      title: `Repository layout: ${root} directory`,
      factKind: "observation",
      confidence: 0.84,
      evidence: [`repo_layout:${root}`],
    },
  }));
}

// implements REQ-KIBI-BOOTSTRAP-PLAN
export async function scanEvidence(
  context: OperationContext,
): Promise<EvidenceScan> {
  const fs = context.fs;
  const git = context.git;
  if (!isScanFilesystem(fs) || !isScanGit(git))
    throw new OperationError(
      "OPERATION_FAILED",
      "Bootstrap requires filesystem glob and git ignore ports.",
    );
  const files = [
    ...(await fs.glob(SCAN_PATTERNS, {
      cwd: context.workspaceRoot,
      includeIgnored: true,
    })),
  ].sort();
  const ignoredSources = [
    ...(await git.ignoredPaths(context.workspaceRoot, files)),
  ].sort();
  const ignored = new Set(ignoredSources);
  const evidence: BootstrapEvidence[] = [];
  const warnings: string[] = [];
  for (const relativePath of files) {
    if (ignored.has(relativePath)) continue;
    const absolutePath = path.resolve(context.workspaceRoot, relativePath);
    try {
      const content = await fs.readFile(absolutePath);
      const classification = classifyFile(relativePath, content);
      if (!classification) continue;
      const [provider, kind] = classification;
      if (
        provider === "repo_metadata" &&
        path.basename(relativePath) === "package.json"
      ) {
        try {
          JSON.parse(content);
        } catch {
          warnings.push(`repo_metadata:failed_to_parse:${relativePath}`);
        }
      }
      evidence.push({
        provider,
        kind,
        label: relativePath,
        relativePath,
        absolutePath,
        content,
        data: evidenceData(provider, relativePath, content),
      });
    } catch {
      const warningProvider = /\.(?:test|spec)\.[^.]+$/i.test(relativePath)
        ? "test_topology"
        : CODE_EXTENSION.test(relativePath)
          ? "source_symbols"
          : "generic_repo_docs";
      warnings.push(
        `${warningProvider}:failed_to_${warningProvider === "test_topology" ? "read" : "analyze"}:${relativePath}`,
      );
    }
  }
  evidence.push(...layoutEvidence(context.workspaceRoot, files, ignored));
  return { files, ignoredSources, evidence, warnings };
}
