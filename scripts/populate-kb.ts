#!/usr/bin/env bun
/**
 * Populates the Kibi KB with entities derived from project documentation.
 * Run from repo root: bun run scripts/populate-kb.ts
 */
import { PrologProcess } from "../packages/cli/src/prolog.js";
import { handleKbUpsert } from "../packages/mcp/src/tools/upsert.js";
import path from "node:path";

const kbPath = path.resolve(".kb/branches/main");
const prolog = new PrologProcess({ timeout: 30000 });
await prolog.start();

const attachResult = await prolog.query(`kb_attach('${kbPath}')`);
if (!attachResult.success) {
  console.error("Failed to attach KB at", kbPath);
  process.exit(1);
}

type EntityDef = {
  type: string;
  id: string;
  properties: Record<string, unknown>;
};

const entities: EntityDef[] = [
  // ── Requirements ──────────────────────────────────────────────────────────
  {
    type: "req",
    id: "REQ-001",
    properties: {
      title: "Repo-local per-branch knowledge base",
      status: "active",
      source: "brief.md#3.1",
      priority: "must",
      tags: ["core", "storage", "branching"],
    },
  },
  {
    type: "req",
    id: "REQ-002",
    properties: {
      title: "MCP server with 6 tools over stdio transport",
      status: "active",
      source: "brief.md#4.2",
      priority: "must",
      tags: ["mcp", "api", "tools"],
    },
  },
  {
    type: "req",
    id: "REQ-003",
    properties: {
      title: "CLI with init, sync, query, check, gc, doctor commands",
      status: "active",
      source: "brief.md#4.3",
      priority: "must",
      tags: ["cli", "commands"],
    },
  },
  {
    type: "req",
    id: "REQ-004",
    properties: {
      title:
        "Eight entity types: req, scenario, test, adr, flag, event, symbol, fact",
      status: "active",
      source: "brief.md#2.1",
      priority: "must",
      tags: ["schema", "entities"],
    },
  },
  {
    type: "req",
    id: "REQ-005",
    properties: {
      title: "Typed relationships between entities with audit metadata",
      status: "active",
      source: "brief.md#2.2",
      priority: "must",
      tags: ["schema", "relationships"],
    },
  },
  {
    type: "req",
    id: "REQ-006",
    properties: {
      title:
        "Built-in consistency validation rules (must-priority-coverage, no-cycles, no-dangling-refs)",
      status: "active",
      source: "brief.md#2.3",
      priority: "must",
      tags: ["validation", "check"],
    },
  },
  {
    type: "req",
    id: "REQ-007",
    properties: {
      title: "Markdown and YAML manifest extractors for entity import",
      status: "active",
      source: "brief.md#5.2",
      priority: "must",
      tags: ["extractors", "sync"],
    },
  },
  {
    type: "req",
    id: "REQ-008",
    properties: {
      title: "Git hooks for automated KB sync on branch checkout and merge",
      status: "active",
      source: "brief.md#3.3",
      priority: "must",
      tags: ["git", "hooks", "automation"],
    },
  },
  {
    type: "req",
    id: "REQ-009",
    properties: {
      title: "RDF persistence using SWI-Prolog rdf_persistency library",
      status: "active",
      source: "brief.md#3.2",
      priority: "must",
      tags: ["storage", "prolog", "rdf"],
    },
  },
  {
    type: "req",
    id: "REQ-010",
    properties: {
      title: "VS Code extension with TreeView sidebar for KB navigation",
      status: "active",
      source: "brief.md",
      priority: "should",
      tags: ["vscode", "ui"],
    },
  },
  {
    type: "req",
    id: "REQ-011",
    properties: {
      title: "Write governance: validated changesets and append-only audit log",
      status: "active",
      source: "brief.md#5.3",
      priority: "must",
      tags: ["governance", "audit", "safety"],
    },
  },
  {
    type: "req",
    id: "REQ-012",
    properties: {
      title: "Copy-from-main semantics for new branch KB creation",
      status: "active",
      source: "brief.md#3.1",
      priority: "must",
      tags: ["branching", "copy-from-main"],
    },
  },

  // ── Architecture Decision Records ─────────────────────────────────────────
  {
    type: "adr",
    id: "ADR-001",
    properties: {
      title: "Use SWI-Prolog with RDF persistence for knowledge base storage",
      status: "active",
      source: "brief.md#3.2",
      tags: ["storage", "prolog", "rdf"],
      text_ref: "docs/architecture.md",
    },
  },
  {
    type: "adr",
    id: "ADR-002",
    properties: {
      title: "Use Bun/Node.js as CLI wrapper around SWI-Prolog subprocess",
      status: "active",
      source: ".sisyphus/plans/kibi-v0.md",
      tags: ["cli", "bun", "nodejs"],
    },
  },
  {
    type: "adr",
    id: "ADR-003",
    properties: {
      title:
        "Use stdio JSON-RPC transport for MCP server (no embedded newlines)",
      status: "active",
      source: "brief.md#4.1",
      tags: ["mcp", "transport", "json-rpc"],
    },
  },
  {
    type: "adr",
    id: "ADR-004",
    properties: {
      title: "Per-branch KB isolation with no automatic cross-branch merging",
      status: "active",
      source: "brief.md#3.1",
      tags: ["branching", "isolation", "guardrail"],
    },
  },
  {
    type: "adr",
    id: "ADR-005",
    properties: {
      title:
        "Language-agnostic symbol extraction via YAML manifest files (SCIP deferred to v1)",
      status: "active",
      source: "brief.md#5.2",
      tags: ["symbols", "manifest", "extractors"],
    },
  },
  {
    type: "adr",
    id: "ADR-006",
    properties: {
      title: "Monorepo structure: core (Prolog) + cli + mcp + vscode packages",
      status: "active",
      source: ".sisyphus/plans/kibi-v0.md",
      tags: ["monorepo", "structure"],
    },
  },
  {
    type: "adr",
    id: "ADR-007",
    properties: {
      title: "Defer graph visualization and full VS Code features to post-v0",
      status: "active",
      source: ".sisyphus/plans/kibi-v0.md",
      tags: ["vscode", "scope", "deferred"],
    },
  },

  // ── Feature Flags ─────────────────────────────────────────────────────────
  {
    type: "flag",
    id: "FLAG-001",
    properties: {
      title:
        "vscode-full-features: full VS Code extension with graph visualization",
      status: "draft",
      source: ".sisyphus/plans/kibi-v0.md",
      tags: ["vscode", "deferred", "post-v0"],
    },
  },
  {
    type: "flag",
    id: "FLAG-002",
    properties: {
      title:
        "scip-symbol-extraction: SCIP/LSP-based language-specific symbol indexing",
      status: "draft",
      source: "brief.md#5.2",
      tags: ["symbols", "scip", "v1"],
    },
  },
  {
    type: "flag",
    id: "FLAG-003",
    properties: {
      title: "web-ui: browser-based KB explorer UI",
      status: "draft",
      source: "brief.md",
      tags: ["ui", "web", "non-goal-v0"],
    },
  },
  {
    type: "flag",
    id: "FLAG-004",
    properties: {
      title: "cross-repo-support: KB federation across multiple repositories",
      status: "draft",
      source: "brief.md",
      tags: ["multi-repo", "non-goal-v0"],
    },
  },
  {
    type: "flag",
    id: "FLAG-005",
    properties: {
      title: "ci-coverage-import: import test coverage data from CI into KB",
      status: "draft",
      source: "brief.md#5.2",
      tags: ["ci", "coverage", "future"],
    },
  },

  // ── Domain Events ─────────────────────────────────────────────────────────
  {
    type: "event",
    id: "EVT-001",
    properties: {
      title: "v0.0.1 released as Functional Alpha",
      status: "active",
      source: ".sisyphus/CONTINUATION-PLAN.md",
      tags: ["release", "v0"],
    },
  },
  {
    type: "event",
    id: "EVT-002",
    properties: {
      title: "KB initialized on repository with kibi init",
      status: "active",
      source: "README.md",
      tags: ["init", "lifecycle"],
    },
  },
  {
    type: "event",
    id: "EVT-003",
    properties: {
      title: "Branch KB created from main snapshot on first checkout",
      status: "active",
      source: "brief.md#3.1",
      tags: ["branching", "lifecycle"],
    },
  },
  {
    type: "event",
    id: "EVT-004",
    properties: {
      title: "Entity sync triggered by post-checkout or post-merge git hook",
      status: "active",
      source: "brief.md#3.3",
      tags: ["git", "hooks", "sync"],
    },
  },
  {
    type: "event",
    id: "EVT-005",
    properties: {
      title: "KB garbage collected: stale branch stores deleted by kibi gc",
      status: "active",
      source: "brief.md#3.3",
      tags: ["gc", "maintenance"],
    },
  },

  // ── BDD Scenarios ─────────────────────────────────────────────────────────
  {
    type: "scenario",
    id: "SCEN-001",
    properties: {
      title: "Agent queries requirements from KB via MCP kb_query tool",
      status: "active",
      source: ".sisyphus/plans/kibi-v0.md",
      tags: ["mcp", "query", "agent"],
    },
  },
  {
    type: "scenario",
    id: "SCEN-002",
    properties: {
      title:
        "Developer initializes KB on fresh repository with kibi init --hooks",
      status: "active",
      source: "README.md",
      tags: ["init", "setup"],
    },
  },
  {
    type: "scenario",
    id: "SCEN-003",
    properties: {
      title: "Branch switch triggers copy-from-main KB creation and auto-sync",
      status: "active",
      source: "brief.md#3.3",
      tags: ["branching", "hooks", "automation"],
    },
  },
  {
    type: "scenario",
    id: "SCEN-004",
    properties: {
      title:
        "LLM agent upserts new requirement via MCP and KB validates schema",
      status: "active",
      source: "brief.md#5.3",
      tags: ["mcp", "upsert", "validation"],
    },
  },
  {
    type: "scenario",
    id: "SCEN-005",
    properties: {
      title:
        "kibi check detects must-priority requirement without scenario coverage",
      status: "active",
      source: "brief.md#2.3",
      tags: ["check", "validation", "coverage"],
    },
  },
  {
    type: "scenario",
    id: "SCEN-006",
    properties: {
      title: "kibi gc removes KB directory for branch deleted from git",
      status: "active",
      source: "README.md",
      tags: ["gc", "cleanup"],
    },
  },
  {
    type: "scenario",
    id: "SCEN-007",
    properties: {
      title:
        "kibi sync imports entities from Markdown frontmatter and YAML manifest",
      status: "active",
      source: "README.md",
      tags: ["sync", "extractors", "markdown"],
    },
  },

  // ── Tests ─────────────────────────────────────────────────────────────────
  {
    type: "test",
    id: "TEST-001",
    properties: {
      title: "kibi init creates .kb/ directory structure",
      status: "active",
      source: "packages/cli/tests/commands/init.test.ts",
      tags: ["cli", "init", "unit"],
    },
  },
  {
    type: "test",
    id: "TEST-002",
    properties: {
      title: "kibi sync imports entities from fixture Markdown files",
      status: "active",
      source: "packages/cli/tests/commands/sync.test.ts",
      tags: ["cli", "sync", "unit"],
    },
  },
  {
    type: "test",
    id: "TEST-003",
    properties: {
      title: "kibi query returns correct entities by type",
      status: "active",
      source: "packages/cli/tests/commands/query.test.ts",
      tags: ["cli", "query", "unit"],
    },
  },
  {
    type: "test",
    id: "TEST-004",
    properties: {
      title: "kibi check detects must-priority coverage violations",
      status: "active",
      source: "packages/cli/tests/commands/check.test.ts",
      tags: ["cli", "check", "unit"],
    },
  },
  {
    type: "test",
    id: "TEST-005",
    properties: {
      title: "MCP server responds to all 6 tools with valid JSON-RPC format",
      status: "active",
      source: "packages/mcp/tests/server.test.ts",
      tags: ["mcp", "server", "unit"],
    },
  },
  {
    type: "test",
    id: "TEST-006",
    properties: {
      title: "Git hooks fire on branch switch and trigger KB sync",
      status: "active",
      source: "tests/integration/hook-integration.test.ts",
      tags: ["integration", "hooks", "git"],
    },
  },
  {
    type: "test",
    id: "TEST-007",
    properties: {
      title: "Prolog KB attaches, asserts typed entities and persists to RDF",
      status: "active",
      source: "packages/core/tests/kb.plt",
      tags: ["prolog", "core", "unit"],
    },
  },
  {
    type: "test",
    id: "TEST-008",
    properties: {
      title: "End-to-end: init then sync then query then check pipeline passes",
      status: "active",
      source: "tests/integration/init-sync-check.test.ts",
      tags: ["integration", "e2e", "cli"],
    },
  },
  {
    type: "test",
    id: "TEST-009",
    properties: {
      title:
        "Branch workflow: create branch, KB copied from main, evolves independently",
      status: "active",
      source: "tests/integration/branch-workflow.test.ts",
      tags: ["integration", "branching"],
    },
  },

  // ── Code Symbols ──────────────────────────────────────────────────────────
  {
    type: "symbol",
    id: "SYM-001",
    properties: {
      title:
        "PrologProcess: spawns and manages SWI-Prolog subprocess with query interface",
      status: "active",
      source: "packages/cli/src/prolog.ts",
      tags: ["cli", "prolog", "class"],
    },
  },
  {
    type: "symbol",
    id: "SYM-002",
    properties: {
      title:
        "handleKbUpsert: MCP tool handler — validates and asserts entity to Prolog KB",
      status: "active",
      source: "packages/mcp/src/tools/upsert.ts",
      tags: ["mcp", "tools", "function"],
    },
  },
  {
    type: "symbol",
    id: "SYM-003",
    properties: {
      title:
        "handleKbQuery: MCP tool handler — queries KB by type, id, or tags",
      status: "active",
      source: "packages/mcp/src/tools/query.ts",
      tags: ["mcp", "tools", "function"],
    },
  },
  {
    type: "symbol",
    id: "SYM-004",
    properties: {
      title:
        "handleKbCheck: MCP tool handler — runs consistency validation rules",
      status: "active",
      source: "packages/mcp/src/tools/check.ts",
      tags: ["mcp", "tools", "function"],
    },
  },
  {
    type: "symbol",
    id: "SYM-005",
    properties: {
      title:
        "KibiTreeDataProvider: VS Code TreeDataProvider for KB entity tree view",
      status: "active",
      source: "packages/vscode/src/treeProvider.ts",
      tags: ["vscode", "ui", "class"],
    },
  },
  {
    type: "symbol",
    id: "SYM-006",
    properties: {
      title:
        "extractMarkdown: parses Markdown frontmatter YAML into entity objects",
      status: "active",
      source: "packages/cli/src/extractors/markdown.ts",
      tags: ["extractors", "markdown", "function"],
    },
  },
  {
    type: "symbol",
    id: "SYM-007",
    properties: {
      title:
        "extractManifest: parses YAML symbol manifest into symbol entities and relationships",
      status: "active",
      source: "packages/cli/src/extractors/manifest.ts",
      tags: ["extractors", "manifest", "function"],
    },
  },
  {
    type: "symbol",
    id: "SYM-008",
    properties: {
      title:
        "kb_assert_entity/2: Prolog predicate asserts typed entity as RDF triples",
      status: "active",
      source: "packages/core/src/kb.pl",
      tags: ["prolog", "core", "predicate"],
    },
  },
  {
    type: "symbol",
    id: "SYM-009",
    properties: {
      title:
        "kb_attach/1: Prolog predicate attaches RDF persistent store from branch directory",
      status: "active",
      source: "packages/core/src/kb.pl",
      tags: ["prolog", "core", "predicate"],
    },
  },
  {
    type: "symbol",
    id: "SYM-010",
    properties: {
      title:
        "startServer: initializes kibi-mcp stdio JSON-RPC server and event loop",
      status: "active",
      source: "packages/mcp/src/server.ts",
      tags: ["mcp", "server", "function"],
    },
  },
];

let created = 0;
let updated = 0;
const errors: string[] = [];

for (const e of entities) {
  try {
    const result = await handleKbUpsert(
      prolog,
      e as Parameters<typeof handleKbUpsert>[1],
    );
    if (result.structuredContent?.created) created++;
    else updated++;
    process.stdout.write(".");
  } catch (err) {
    errors.push(`${e.id}: ${err instanceof Error ? err.message : String(err)}`);
    process.stdout.write("x");
  }
}

// Single save at the end
await prolog.query("kb_save");
await prolog.terminate();

console.log(
  `\n✓ ${created} created, ${updated} updated, ${errors.length} errors across ${entities.length} entities`,
);
if (errors.length) {
  console.error("Errors:\n" + errors.map((e) => `  ${e}`).join("\n"));
  process.exit(1);
}
