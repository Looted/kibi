// implements REQ-claude-code-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "yaml";

import * as agentCore from "../src/index";
import {
  canonicalKbToolName,
  extractKbMcpToolCall,
  resolveKibiInterface,
} from "../src/kb-mcp-tools";
import {
  buildKnowledgeIndex,
  loadKnowledgeIndex,
  readEntitySummary,
  scanSymbolCoordinates,
  scanSymbolsManifest,
} from "../src/knowledge-index";
import {
  classifyPath,
  isMeaningfulTrackedPath,
  isSourceImpactRelevantPath,
  toWorkspacePath,
} from "../src/path-policy";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function tempDir(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(directory);
  return directory;
}

function write(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

describe("agent-core path policy", () => {
  test("production code is source wherever it lives, not only under src/", () => {
    for (const file of [
      "src/app.ts",
      "lib/parser.py",
      "app/routes.tsx",
      "main.go",
      "packages/cli/src/engine.ts",
    ]) {
      expect(classifyPath(file)).toBe("source");
      expect(isSourceImpactRelevantPath(file)).toBe(true);
    }
  });

  test("tests, docs, generated, vendored, and KB paths are not production source", () => {
    expect(classifyPath("tests/app.test.ts")).toBe("test");
    expect(classifyPath("src/app.spec.ts")).toBe("test");
    expect(classifyPath("test_parser.py")).toBe("test");
    expect(classifyPath(".kb/requirements/REQ-cli-gc.md")).toBe("kb");
    for (const file of [
      "docs/guide.ts",
      "dist/app.js",
      "node_modules/pkg/index.js",
      "vendor/lib.go",
      "README.md",
    ]) {
      expect(classifyPath(file)).toBe("other");
      expect(isSourceImpactRelevantPath(file)).toBe(false);
    }
  });

  test("tracked paths include docs and canonical KB lanes but not KB runtime state", () => {
    expect(isMeaningfulTrackedPath("README.md")).toBe(true);
    expect(isMeaningfulTrackedPath("docs/install.md")).toBe(true);
    expect(isMeaningfulTrackedPath(".kb/requirements/REQ-cli-gc.md")).toBe(
      true,
    );
    expect(isMeaningfulTrackedPath(".kb/symbols.yaml")).toBe(true);
    expect(isMeaningfulTrackedPath(".kb/branches/main/kb.rdf")).toBe(false);
    expect(isMeaningfulTrackedPath("dist/app.js")).toBe(false);
  });

  test("workspace paths resolve against the event cwd and never escape the root", () => {
    const root = path.resolve("/workspace/repo");
    expect(toWorkspacePath(root, "src/app.ts", path.join(root, "pkg"))).toEqual(
      {
        relative: "pkg/src/app.ts",
        absolute: path.join(root, "pkg/src/app.ts"),
      },
    );
    expect(toWorkspacePath(root, path.join(root, "a.ts"))?.relative).toBe(
      "a.ts",
    );
    expect(toWorkspacePath(root, "../other/a.ts")).toBeUndefined();
    expect(toWorkspacePath(root, "   ")).toBeUndefined();
  });
});

describe("agent-core Kibi tool recognition", () => {
  test("host-prefixed MCP names resolve to the canonical operation", () => {
    for (const name of [
      "kb_check",
      "mcp__kibi__kb_check",
      "mcp__plugin_kibi-claude_kibi__kb_check",
      "MCP:kb_check",
      "kibi_kb_check",
    ]) {
      expect(canonicalKbToolName(name)).toBe("kb_check");
    }
    expect(canonicalKbToolName("mcp__github__search")).toBeUndefined();
    expect(canonicalKbToolName(undefined)).toBeUndefined();
  });

  test("an impact check needs source files, impact diagnostics, and the working-tree diff", () => {
    expect(
      extractKbMcpToolCall("mcp__kibi__kb_check", {
        sourceFiles: ["src/a.ts"],
        includeImpactDiagnostics: true,
        includeWorkingTreeDiff: true,
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
    expect(
      extractKbMcpToolCall("mcp__kibi__kb_check", { sourceFiles: ["src/a.ts"] })
        ?.impactCheckRun,
    ).toBe(false);
    // Hosts that wrap MCP calls report the tool name inside the payload.
    expect(
      extractKbMcpToolCall("CallMcpTool", {
        toolName: "kb_check",
        arguments: {
          source_files: ["src/b.ts"],
          include_impact_diagnostics: true,
          include_working_tree_diff: true,
        },
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: true,
      sourceFiles: ["src/b.ts"],
    });
    expect(extractKbMcpToolCall("Edit", { file_path: "a.ts" })).toBeUndefined();
  });

  test("the Kibi interface falls back to the CLI only in a trusted workspace", () => {
    expect(resolveKibiInterface("observed", false)).toBe("mcp");
    expect(resolveKibiInterface("unknown", true)).toBe("cli");
    expect(resolveKibiInterface("unknown", false)).toBe("setup");
  });
});

const SYMBOLS = `symbols:
  - id: SYM-compute
    title: computeTotal
    sourceFile: src/checkout.ts
    relationships:
      - type: implements
        target: REQ-checkout-rounding
      - type: covered_by
        target: TEST-checkout-rounding
  - id: SYM-legacy
    title: 'legacyHelper'
    sourceFile: ./src/legacy.ts
    links: [REQ-legacy]
  - id: SYM-test
    title: checkout suite
    sourceFile: tests/checkout.test.ts
    relationships:
      - type: executable_for
        target: TEST-checkout-rounding
other:
  - id: SYM-not-a-symbol
    sourceFile: src/ignored.ts
    links: [REQ-ignored]
`;

const COORDINATES = `version: 1
coordinates:
  SYM-compute:
    sourceFile: src/checkout.ts
    sourceLine: 3
    sourceEndLine: 7
`;

describe("agent-core knowledge index", () => {
  test("the line scanner matches a full YAML parse and ignores non-symbol sequences", () => {
    const parsed = parse(SYMBOLS) as { symbols: Record<string, unknown>[] };
    const coordinates = {
      "SYM-compute": { line: 3, endLine: 7 },
    };
    expect(
      buildKnowledgeIndex(
        scanSymbolsManifest(SYMBOLS),
        scanSymbolCoordinates(COORDINATES),
      ),
    ).toEqual(buildKnowledgeIndex(parsed.symbols, coordinates));
    expect(
      buildKnowledgeIndex(
        scanSymbolsManifest(SYMBOLS),
        scanSymbolCoordinates(COORDINATES),
      ).files["src/ignored.ts"],
    ).toBeUndefined();
  });

  test("legacy string links count as ownership unless the adapter opts out", () => {
    const records = scanSymbolsManifest(SYMBOLS);
    expect(
      buildKnowledgeIndex(records).files["src/legacy.ts"]?.[0]?.implements,
    ).toEqual(["REQ-legacy"]);
    expect(
      buildKnowledgeIndex(records, {}, { legacyLinksAsImplements: false })
        .files["src/legacy.ts"],
    ).toBeUndefined();
  });

  test("the cache is reused until a manifest changes, per adapter cache file", () => {
    const root = tempDir("kibi-agent-core-ws-");
    const cacheDir = tempDir("kibi-agent-core-cache-");
    write(root, ".kb/symbols.yaml", SYMBOLS);
    write(root, ".kb/symbol-coordinates.yaml", COORDINATES);

    const first = loadKnowledgeIndex(root, cacheDir, {
      cacheFileName: "claude.json",
    });
    expect(first.files["src/checkout.ts"]?.[0]?.line).toBe(3);
    const cachePath = path.join(cacheDir, "claude.json");
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    cached.index.files["src/checkout.ts"][0].title = "from-cache";
    fs.writeFileSync(cachePath, JSON.stringify(cached));
    expect(
      loadKnowledgeIndex(root, cacheDir, { cacheFileName: "claude.json" })
        .files["src/checkout.ts"]?.[0]?.title,
    ).toBe("from-cache");

    write(
      root,
      ".kb/symbols.yaml",
      `${SYMBOLS.split("other:")[0]}  - id: SYM-new\n    sourceFile: src/new.ts\n    links: [REQ-new]\n`,
    );
    const rebuilt = loadKnowledgeIndex(root, cacheDir, {
      cacheFileName: "claude.json",
    });
    expect(rebuilt.files["src/checkout.ts"]?.[0]?.title).toBe("computeTotal");
    expect(rebuilt.files["src/new.ts"]?.[0]?.implements).toEqual(["REQ-new"]);
    expect(loadKnowledgeIndex(tempDir("kibi-agent-core-empty-"))).toEqual({
      files: {},
      symbolCount: 0,
    });
  });

  test("entity summaries read the canonical lane document and cannot escape it", () => {
    const root = tempDir("kibi-agent-core-entity-");
    write(
      root,
      ".kb/requirements/REQ-checkout-rounding.md",
      "---\nid: REQ-checkout-rounding\ntitle: 'Totals round to cents'\nstatus: superseded\n---\n",
    );
    write(root, "secret.md", "---\ntitle: leaked\n---\n");
    expect(readEntitySummary(root, "REQ-checkout-rounding")).toEqual({
      id: "REQ-checkout-rounding",
      title: "Totals round to cents",
      status: "superseded",
    });
    expect(readEntitySummary(root, "REQ-../../secret")).toEqual({
      id: "REQ-../../secret",
    });
    expect(readEntitySummary(root, "UNKNOWN-id")).toEqual({ id: "UNKNOWN-id" });
  });

  test("entity summaries carry typed and plain frontmatter links", () => {
    const root = tempDir("kibi-agent-core-links-");
    write(
      root,
      ".kb/requirements/REQ-checkout-rounding.md",
      "---\nid: REQ-checkout-rounding\ntitle: Totals round to cents\nlinks:\n  - type: constrains\n    target: FACT-checkout-total\n  - ADR-money\nstatus: open\n---\n",
    );
    expect(readEntitySummary(root, "REQ-checkout-rounding")).toEqual({
      id: "REQ-checkout-rounding",
      title: "Totals round to cents",
      status: "open",
      links: [
        { type: "constrains", target: "FACT-checkout-total" },
        { type: "relates_to", target: "ADR-money" },
      ],
    });
  });

  test("the package entry re-exports the shared adapter surface", () => {
    expect(agentCore.classifyPath).toBe(classifyPath);
    expect(agentCore.canonicalKbToolName).toBe(canonicalKbToolName);
    expect(agentCore.loadKnowledgeIndex).toBe(loadKnowledgeIndex);
  });
});
