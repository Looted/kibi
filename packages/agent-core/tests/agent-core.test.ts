// implements REQ-claude-code-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "yaml";

import { firmEditConfirmation } from "../src/decision-guard";
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
import { describeEntity } from "../src/snippets";

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

  test("a dry-run upsert is reported as validation, not a KB write", () => {
    expect(
      extractKbMcpToolCall("mcp__kibi__kb_upsert", {
        type: "req",
        id: "REQ-x",
        dryRun: true,
      })?.toolName,
    ).toBe("kb_validate_upsert");
    expect(
      extractKbMcpToolCall("mcp__kibi__kb_upsert", { type: "req", id: "REQ-x" })
        ?.toolName,
    ).toBe("kb_upsert");
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
      "SYM-compute": { line: 3, endLine: 7, sourceFile: "src/checkout.ts" },
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
      manifest: "missing",
      coordinateFiles: [],
      unlinkedFiles: [],
    });
  });

  test("a manifest written as one flow sequence indexes like its block form", () => {
    // kibi-cli before 2.18.0 appended to the `symbols: []` that `kibi init`
    // writes, so every symbol of such a project sits on this one line.
    const oneLine =
      "# symbols.yaml\nsymbols: [ { id: SYM-seek, title: seekTo, sourceFile: src/app/services/playback.service.ts, relationships: [ { type: covered_by, target: TEST-seek }, { type: implements, target: REQ-seek } ] }, { id: SYM-auth, title: 'toggle', sourceFile: ./src/app/services/auth.service.ts, links: [REQ-auth], tags: [a, b] } ]\n";
    const wrapped =
      "symbols:\r\n  [\r\n    { id: SYM-seek, sourceFile: src/app/services/playback.service.ts,\r\n      relationships: [ { type: implements, target: REQ-seek } ] },\r\n    { id: SYM-auth, sourceFile: src/app/services/auth.service.ts, links: [REQ-auth] }\r\n  ]\r\n";
    const blockWithFlowValues =
      "symbols:\n  - id: SYM-seek\n    sourceFile: src/app/services/playback.service.ts\n    relationships: [{type: implements,\n      target: REQ-seek}, {type: covered_by, target: TEST-seek}]\n  - id: SYM-auth\n    sourceFile: src/app/services/auth.service.ts\n    links: [REQ-auth]\n";
    for (const text of [oneLine, wrapped, blockWithFlowValues]) {
      const reference = (parse(text) as { symbols: Record<string, unknown>[] })
        .symbols;
      expect(buildKnowledgeIndex(scanSymbolsManifest(text))).toEqual(
        buildKnowledgeIndex(reference),
      );
      const index = buildKnowledgeIndex(scanSymbolsManifest(text));
      expect(index.symbolCount).toBe(2);
      expect(
        index.files["src/app/services/auth.service.ts"]?.[0]?.implements,
      ).toEqual(["REQ-auth"]);
      expect(
        index.files["src/app/services/playback.service.ts"]?.[0]?.implements,
      ).toEqual(["REQ-seek"]);
    }
  });

  test("flow reading stays conservative on scalars, broken brackets and later sections", () => {
    const variants = [
      // A plain scalar that merely starts with `[` stays a string.
      "symbols:\n  - id: SYM-a\n    title: '[WIP] fix rounding'\n    sourceFile: src/a.ts\n    links: [REQ-1]\n",
      // A flow `symbols:` section after another top-level key.
      "version: 1\nsymbols: [ { id: S1, sourceFile: src/a.ts, links: [REQ-1] } ]\n",
      // Flow mappings as block list items.
      "symbols:\n  - id: SYM-a\n    sourceFile: src/a.ts\n    relationships:\n      - { type: implements, target: REQ-1 }\n      - type: covered_by\n        target: TEST-1\n",
    ];
    for (const text of variants) {
      const reference = (parse(text) as { symbols: Record<string, unknown>[] })
        .symbols;
      expect(buildKnowledgeIndex(scanSymbolsManifest(text))).toEqual(
        buildKnowledgeIndex(reference),
      );
    }
    // A bracket that never closes keeps that one value as text and does not
    // swallow the records after it.
    const broken =
      "symbols:\n  - id: SYM-a\n    sourceFile: src/a.ts\n    links: [REQ-1\n  - id: SYM-b\n    sourceFile: src/b.ts\n    links: [REQ-2]\n";
    const records = scanSymbolsManifest(broken);
    expect(records.map((record) => record.id)).toEqual(["SYM-a", "SYM-b"]);
    expect(records[0]?.links).toBe("[REQ-1");
    expect(
      buildKnowledgeIndex(records).files["src/b.ts"]?.[0]?.implements,
    ).toEqual(["REQ-2"]);
  });

  test("files with a record but no link are listed separately from linked files", () => {
    const index = buildKnowledgeIndex(
      scanSymbolsManifest(
        "symbols:\n  - id: S\n    sourceFile: ./src/u.ts\n  - id: T\n    sourceFile: src/l.ts\n    links: [REQ-1]\n",
      ),
    );
    expect(Object.keys(index.files)).toEqual(["src/l.ts"]);
    expect(index.unlinkedFiles).toEqual(["src/u.ts"]);
  });

  test("the index says whether the manifest was missing, empty, read or unreadable", () => {
    const root = tempDir("kibi-agent-core-state-");
    expect(loadKnowledgeIndex(root).manifest).toBe("missing");
    write(root, ".kb/symbols.yaml", "# symbols.yaml\nsymbols: []\n");
    expect(loadKnowledgeIndex(root).manifest).toBe("empty");
    write(root, ".kb/symbols.yaml", "---\nversion: 1\nsymbols: []\n");
    expect(loadKnowledgeIndex(root).manifest).toBe("empty");
    write(root, ".kb/symbols.yaml", SYMBOLS);
    expect(loadKnowledgeIndex(root).manifest).toBe("indexed");
    write(
      root,
      ".kb/symbols.yaml",
      "symbols: [ { id: SYM-broken, sourceFile: src/x.ts\n",
    );
    const unreadable = loadKnowledgeIndex(root);
    expect(unreadable.manifest).toBe("unreadable");
    expect(unreadable.symbolCount).toBe(0);
    // Coordinates still name the files that carry symbols.
    write(
      root,
      ".kb/symbol-coordinates.yaml",
      "version: 2\ncoordinates:\n  abc:\n    sourceFile: ./src/x.ts\n    sourceLine: 1\n  def:\n    sourceFile: src/y.ts\n",
    );
    expect(loadKnowledgeIndex(root).coordinateFiles).toEqual([
      "src/x.ts",
      "src/y.ts",
    ]);
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
      firmness: "firm",
    });
    expect(readEntitySummary(root, "REQ-../../secret")).toEqual({
      id: "REQ-../../secret",
    });
    expect(readEntitySummary(root, "UNKNOWN-id")).toEqual({ id: "UNKNOWN-id" });
  });

  // implements REQ-kb-decision-firmness, REQ-kb-decision-firmness-from-origin
  test("entity summaries carry firmness, from the origin when unauthored, and snippets label firm and exploratory decisions", () => {
    const root = tempDir("kibi-agent-core-firmness-");
    write(
      root,
      ".kb/adr/ADR-money.md",
      "---\nid: ADR-money\ntitle: Money is integer cents\nfirmness: firm\n---\n",
    );
    write(
      root,
      ".kb/requirements/REQ-guess.md",
      "---\nid: REQ-guess\ntitle: Retry three times\nfirmness: exploratory\n---\n",
    );
    write(
      root,
      ".kb/requirements/REQ-plain.md",
      "---\nid: REQ-plain\ntitle: Plain\norigin:\n  kind: agent\n  recorded_at: 2026-10-13T00:00:00Z\n---\n",
    );
    write(
      root,
      ".kb/requirements/REQ-flow.md",
      "---\nid: REQ-flow\ntitle: Flow\norigin: { kind: agent }\n---\n",
    );
    write(
      root,
      ".kb/requirements/REQ-imported.md",
      "---\nid: REQ-imported\ntitle: Imported\norigin:\n  kind: import\n  ref: docs/spec.md#L3\n---\n",
    );
    write(
      root,
      ".kb/adr/ADR-legacy.md",
      "---\nid: ADR-legacy\ntitle: Legacy\n---\n",
    );
    expect(readEntitySummary(root, "ADR-money")).toEqual({
      id: "ADR-money",
      title: "Money is integer cents",
      firmness: "firm",
    });
    expect(describeEntity(readEntitySummary(root, "ADR-money"))).toBe(
      "ADR-money [firm: ask before changing]: Money is integer cents",
    );
    expect(describeEntity(readEntitySummary(root, "REQ-guess"))).toBe(
      "REQ-guess [exploratory]: Retry three times",
    );
    expect(describeEntity(readEntitySummary(root, "REQ-plain"))).toBe(
      "REQ-plain: Plain",
    );
    expect(readEntitySummary(root, "REQ-flow").firmness).toBe("default");
    expect(describeEntity(readEntitySummary(root, "REQ-imported"))).toBe(
      "REQ-imported [firm: ask before changing]: Imported",
    );
    expect(describeEntity(readEntitySummary(root, "ADR-legacy"))).toBe(
      "ADR-legacy [firm: ask before changing]: Legacy",
    );
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
      firmness: "firm",
      links: [
        { type: "constrains", target: "FACT-checkout-total" },
        { type: "relates_to", target: "ADR-money" },
      ],
    });
  });

  test("typed frontmatter links keep their type whichever key comes first", () => {
    const root = tempDir("kibi-agent-core-link-order-");
    write(
      root,
      ".kb/requirements/REQ-checkout-rounding.md",
      [
        "---",
        "id: REQ-checkout-rounding",
        "links:",
        "  - target: FACT-checkout-total",
        "    type: constrains",
        "  - type: requires_property",
        "    target: FACT-total-rounding-cents",
        "  - target: ADR-money",
        "  - SCEN-rounding",
        "status: open",
        "---",
        "",
      ].join("\n"),
    );
    expect(readEntitySummary(root, "REQ-checkout-rounding").links).toEqual([
      { type: "constrains", target: "FACT-checkout-total" },
      { type: "requires_property", target: "FACT-total-rounding-cents" },
      { type: "relates_to", target: "ADR-money" },
      { type: "relates_to", target: "SCEN-rounding" },
    ]);
  });

  test("entity summaries include links stored only in relationship shards", () => {
    const root = tempDir("kibi-agent-core-shards-");
    const shard = (id: string) =>
      createHash("sha256").update(id).digest("hex").slice(0, 2);
    write(
      root,
      ".kb/requirements/REQ-checkout-rounding.md",
      "---\nid: REQ-checkout-rounding\ntitle: Totals round to cents\nstatus: open\nlinks:\n  - type: constrains\n    target: FACT-checkout-total\n---\n",
    );
    write(
      root,
      `.kb/relationships/${shard("REQ-checkout-rounding")}.yaml`,
      [
        "relationships:",
        "  - id: rel-1",
        "    type: requires_property",
        "    from: REQ-checkout-rounding",
        "    to: FACT-total-rounding-cents",
        '    created_at: "2026-08-16T21:04:44.071Z"',
        "  - from: REQ-checkout-rounding",
        "    to: FACT-checkout-total",
        "    type: constrains",
        "    id: rel-2",
        "  - type: implements",
        "    from: SYM-other",
        "    to: REQ-checkout-rounding",
        "",
      ].join("\n"),
    );
    expect(readEntitySummary(root, "REQ-checkout-rounding").links).toEqual([
      { type: "constrains", target: "FACT-checkout-total" },
      { type: "requires_property", target: "FACT-total-rounding-cents" },
    ]);

    // Grounding that lives only in a shard still reaches the summary, and a
    // rewritten shard is re-read rather than served from the parse cache.
    write(
      root,
      ".kb/requirements/REQ-shard-only.md",
      "---\nid: REQ-shard-only\ntitle: Shard grounded\nstatus: open\n---\n",
    );
    const shardPath = `.kb/relationships/${shard("REQ-shard-only")}.yaml`;
    write(
      root,
      shardPath,
      "relationships:\n  - type: relates_to\n    from: REQ-shard-only\n    to: ADR-money\n",
    );
    expect(readEntitySummary(root, "REQ-shard-only").links).toEqual([
      { type: "relates_to", target: "ADR-money" },
    ]);
    write(
      root,
      shardPath,
      "relationships:\n  - type: relates_to\n    from: REQ-shard-only\n    to: ADR-money\n  - type: requires_rule\n    from: REQ-shard-only\n    to: FACT-rule\n",
    );
    expect(readEntitySummary(root, "REQ-shard-only").links).toEqual([
      { type: "relates_to", target: "ADR-money" },
      { type: "requires_rule", target: "FACT-rule" },
    ]);
  });

  test("a superseded requirement keeps its status alongside its shard links", () => {
    const root = tempDir("kibi-agent-core-retired-");
    write(
      root,
      ".kb/requirements/REQ-old-rounding.md",
      "---\nid: REQ-old-rounding\ntitle: Totals truncate\nstatus: superseded\n---\n",
    );
    const shard = createHash("sha256")
      .update("REQ-old-rounding")
      .digest("hex")
      .slice(0, 2);
    write(
      root,
      `.kb/relationships/${shard}.yaml`,
      "relationships:\n  - type: constrains\n    from: REQ-old-rounding\n    to: FACT-old-total\n",
    );
    expect(readEntitySummary(root, "REQ-old-rounding")).toEqual({
      id: "REQ-old-rounding",
      title: "Totals truncate",
      status: "superseded",
      firmness: "firm",
      links: [{ type: "constrains", target: "FACT-old-total" }],
    });
  });

  test("the package entry re-exports the shared adapter surface", () => {
    expect(agentCore.classifyPath).toBe(classifyPath);
    expect(agentCore.canonicalKbToolName).toBe(canonicalKbToolName);
    expect(agentCore.loadKnowledgeIndex).toBe(loadKnowledgeIndex);
  });
});

describe("firmEditConfirmation", () => {
  test("a requirement title ending in a full stop reads as one sentence", () => {
    expect(
      firmEditConfirmation("toggleViewMode in src/auth.ts", [
        {
          id: "REQ-view-mode",
          title: "A student must not gain coach rights from a view preference.",
          firmness: "firm",
        },
      ]),
    ).toBe(
      "Kibi: this edit changes toggleViewMode in src/auth.ts, which implements a firm requirement recorded in the knowledge base: REQ-view-mode: A student must not gain coach rights from a view preference. Allow it if the change keeps that requirement, or if you mean to change the requirement too.",
    );
  });
});
