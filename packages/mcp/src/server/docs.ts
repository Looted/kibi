/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TOOLS } from "../tools-config.js";

interface ToolConfig {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
// INTENTIONAL: TOOLS is imported as a Zod-inferred schema type; ToolConfig is the runtime
// interface with looser Record<string, unknown> inputSchema. The cast is safe because the
// tool definitions are statically authored and validated at startup.
const ACTIVE_TOOLS = TOOLS as unknown as ToolConfig[];

export interface DocResource {
  uri: string;
  name: string;
  description: string;
  mimeType: "text/markdown";
  text: string;
}

function renderToolsDoc(): string {
  const lines = [
    "# kibi-mcp Tools",
    "",
    "Use this reference to choose the correct tool before calling it.",
    "",
    "| Tool | Summary | Required Parameters |",
    "| --- | --- | --- |",
  ];

  for (const tool of ACTIVE_TOOLS) {
    const required = Array.isArray(tool.inputSchema?.required)
      ? tool.inputSchema.required.join(", ")
      : "none";
  }
  lines.push("");
  lines.push(
    "Modeling note: Prefer query-first discovery; create `fact` entities before `req` entities and express semantics via `constrains` + `requires_property`.",
  );
  return lines.join("\n");
}

export const PROMPTS = [
  // implements REQ-002, REQ-013, REQ-mcp-search-discovery
  {
    name: "init-kibi",
    description: "Activation workflow to populate a new or empty Kibi KB from an existing repository.",
    text: [
      "# Kibi Activation Workflow",
      "",
      "Use this workflow to populate a Kibi knowledge base when it is new or empty.",
      "",
      "## Step 1: Generate Candidates (read-only)",
      "",
      "Call `kb_autopilot_generate` to scan the repository and produce candidate entities.",
      "",
      "This tool is **read-only** — it never writes to the KB. It returns:",
      "- `activationState`: the current KB state (e.g. `root_uninitialized`, `root_partial`)",
      "- `candidates[]`: proposed entities with confidence scores and evidence",
      "- `suppressedCandidates[]`: low-confidence proposals withheld by default",
      "- `discoverySummary` / `payoffSummary`: context for agent review",
      "",
      "## Step 2: Review Candidates",
      "",
      "Inspect `activationState`. If `applyBlocked` is true, stop — the KB cannot accept writes.",
      "",
      "For each candidate, evaluate:",
      "- **confidence** (0–1): prefer high-confidence entities first",
      "- **evidence**: verify the source reference is real before applying",
      "",
      "Discard or edit candidates that look speculative. The agent decides what to apply — the generator never writes.", "",
      "## Step 3: Apply Approved Candidates", "",
      "Apply candidates sequentially via `kb_upsert`, one at a time:",
      "1. Call `kb_upsert` with the candidate's `type`, `id`, `properties`, and `relationships`",
      "2. Confirm the upsert succeeded before applying the next candidate",
      "3. After each batch, call `kb_check` with targeted rules (`required-fields`, `no-dangling-refs`) to catch issues early",
      "",
      "## Step 4: Payoff Verification",
      "",
      "After all approved candidates are applied, verify the result:",
      "- `kb_check` with all rules — must return zero violations",
      "- `kb_find_gaps` with `{ type: 'req', missingRelationships: ['specified_by', 'verified_by'] }` — identify under-linked requirements",
"- `kb_coverage` with `{ by: 'req' }` — confirm traceability coverage",   "",
      "## Doc Hygiene",
      "",
      "- Always call `kb_query` before creating to avoid duplicate entities",
      "- Run `kb_check` after each batch, not just at the end",
      "- All writes go through `kb_upsert` — do not invoke CLI commands directly",
      "- `kb_autopilot_generate` is read-only; only `kb_upsert` mutates the KB",
    ].join("\n"),
  },
  {
    name: "kibi_overview",
    description: "High-level model for using kibi-mcp safely and effectively.",
    text: [
      "# kibi-mcp Overview",
      "",
      "Treat this server as a branch-aware knowledge graph interface for software traceability.",
      "",
      "The server exposes a curated public tool surface for KB operations:",
      "- `kb_search`: Discovery across metadata and markdown body text",
      "- `kb_query`: Exact lookup of entities by type, ID, tags, or source file",
      "- `kb_status`: Branch, snapshot, and freshness inspection",
      "- `kb_find_gaps`: Bulk missing/present relationship analysis",
      "- `kb_coverage`: Curated coverage reporting",
      "- `kb_graph`: Bounded graph traversal from seed IDs",
      "- `kb_upsert`: Create or update entities and their relationships",
      "- `kb_delete`: Remove entities by ID (with dependency safety checks)",
      "- `kb_check`: Validate KB integrity against configurable rules",
      "",
      "Core modeling principles:",
      "- Encode requirements as linked facts: `req --constrains--> fact` plus `req --requires_property--> fact`.",
      "- Reuse canonical fact IDs across requirements; shared constrained facts make contradictions detectable.",
      "- Use `kb_search` first for discovery, then `kb_query` for exact follow-up before any mutation.",
      "- Use `kb_upsert` and `kb_delete` only for intentional, traceable KB changes.",
      "- Run `kb_check` after meaningful mutations to catch integrity issues early.",
      "- Prefer explicit IDs and enum values to avoid invalid parameters.",
      "- Assume every write can affect downstream traceability queries.",
      "- Model requirements by first creating/reusing fact entities, then express req semantics with `constrains` + `requires_property` relationships (create-before-link).",
      "- flag gates runtime/config behavior; use `fact` with `fact_kind: observation` or `meta` for bug and workaround notes.",
    ].join("\n"),
  },
  {
    name: "kibi_workflow",
    description:
      "Step-by-step call order for discovery, mutation, and verification.",
    text: [
      "# kibi-mcp Workflow",
      "Follow this sequence for reliable operation:",
      "",
      "1. **Discover first**: Call `kb_search` for exploratory discovery, then `kb_query` to confirm exact current state before mutation.",
      "2. **Create-before-link**: Create endpoint entities with `kb_upsert` before linking them.",
      "3. **Validate intent**: If creating links, call `kb_query` for both endpoint IDs first to ensure they exist.",
      "4. **Model requirements as facts**: For new/updated reqs, create/reuse fact entities first, then express req semantics with `constrains` + `requires_property`.",
      "5. **Mutate**: Call `kb_upsert` for create/update, or `kb_delete` for explicit removals.",
      "6. **Targeted checks**: Run `kb_check` after meaningful mutations; specify only the rules you need.",
      "",
      "If a tool returns empty results, do not assume failure. Re-check filters (type, id, tags, sourceFile, limit, or offset).",
    ].join("\n"),
  },
  {
    name: "kibi_constraints",
    description: "Operational limits, validation rules, and mutation gotchas.",
    text: [
      "# kibi-mcp Constraints",
      "",
      "Apply these rules before calling write operations:",
      "",
      "## Validation Rules",
      "- `kb_upsert` validates entity and relationship payloads against JSON Schema.",
      "- `kb_delete` blocks deletion when dependents still reference the entity.",
      "- Relationship and rule names are strict enums; unknown values fail validation.",
      "- Branch KB setup is automatic at server startup; lifecycle maintenance stays outside the public MCP tool surface.",
      "",
      "## Telemetry-Driven Guardrails",
      "- The server does not send external telemetry or analytics.",
      "- All operations are local and branch-scoped.",
      "- No network requests are made to external services.",
      "- KB state persists only within the repository's `.kb/` directory.",
    ].join("\n"),
  },
];

function registerDocResources(): DocResource[] {
  const overview = [
    "# kibi-mcp Server Overview",
    "",
    "kibi-mcp is a stdio MCP server for querying and mutating the Kibi knowledge base.",
    "",
    "Scope:",
    "- Read-only discovery and reporting (`kb_search`, `kb_query`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`)",
    "- KB mutation and validation (`kb_upsert`, `kb_delete`, `kb_check`)",
    "- Automatic branch-local attachment for the active workspace",
    "",
    "Use this server when you need branch-local, machine-readable project memory.",
  ].join("\n");

  const errors = [
    "# kibi-mcp Error Guide",
    "",
    "Common failure modes and recoveries:",
    "",
    "- `-32602 INVALID_PARAMS`: Tool arguments are missing/invalid. Recover by checking enum values and required fields.",
    "- `-32601 METHOD_NOT_FOUND`: Unknown MCP method. Recover by using supported methods (`tools/*`, `prompts/*`, `resources/*`).",
    "- `-32000 PROLOG_QUERY_FAILED`: Prolog query failed. Recover by validating IDs, rule names, and branch KB availability.",
    "- `VALIDATION_ERROR` message: `kb_upsert` payload failed schema checks. Recover by fixing required fields and enum values.",
    "- Delete blocked by dependents: `kb_delete` detected incoming references. Recover by removing/rewiring relationships first.",
    "- Empty results: filters may be too strict. Recover by loosening type/id/tags/source filters and retrying.",
  ].join("\n");

  const examples = [
    "# kibi-mcp Examples",
    "",
    "## Discover before mutating",
    '1. `kb_search` with `{ "query": "login flow" }` to discover related requirements, tests, and ADRs',
    '2. `kb_query` with `{ "type": "req", "sourceFile": "src/auth/login.ts" }` for exact follow-up',
    "3. `kb_status` with `{}` when branch attachment or freshness confidence matters",
    "",
    "## Model requirements as reusable facts",
    '1. `kb_query` with `{ "type": "fact" }` to find existing fact IDs before creating new ones',
    "2. `kb_upsert` for the fact entity first (create-before-link)",
    "3. `kb_upsert` for the req entity and include `relationships` with `constrains` and `requires_property`",
    "4. Reuse the same constrained fact ID across related requirements; vary property facts only when semantics differ",
    '5. `kb_check` with `{ "rules": ["required-fields","no-dangling-refs"] }` for targeted validation',
    "",
    "Note: Create or reuse `fact` entities first, then create `req` entities and link with `constrains` and `requires_property` (create-before-link). Use `flag` for runtime/config gates; use `fact` with `fact_kind: observation` or `meta` for bug and workaround notes.",
    "",
    "## Find missing coverage",
    '1. `kb_find_gaps` with `{ "type": "req", "missingRelationships": ["specified_by", "verified_by"] }` to find under-linked requirements',
    "",
    "## Find missing coverage",
    "",
    "## Find missing coverage",
    '1. `kb_find_gaps` with `{ "type": "req", "missingRelationships": ["specified_by", "verified_by"] }` to find under-linked requirements',
    '2. `kb_coverage` with `{ "by": "req", "includePassing": false }` to review evaluated coverage rows',
    '3. `kb_graph` with `{ "seedIds": ["REQ-001"], "direction": "both", "depth": 2 }` to inspect neighboring entities',
    "",
    "## Add a requirement and link it to a test",
    '1. `kb_query` with `{ "type": "test" }` to check for existing test IDs',
    '2. `kb_query` with `{ "id": "REQ-XXX" }` to verify the requirement exists',
    "3. `kb_upsert` with entity payload and `relationships` containing `verified_by`",
    '4. `kb_check` with `{ "rules": ["required-fields","no-dangling-refs"] }` for targeted validation',
    "",
    "Note: Always use query-first pattern. Specify only needed rules in kb_check for faster validation.",
  ].join("\n");

  return [
    {
      uri: "kibi://docs/overview",
      name: "kibi docs overview",
      description: "Full server description, purpose, and scope.",
      mimeType: "text/markdown",
      text: overview,
    },
    {
      uri: "kibi://docs/tools",
      name: "kibi docs tools",
      description: "Available tools with summaries and required parameters.",
      mimeType: "text/markdown",
      text: renderToolsDoc(),
    },
    {
      uri: "kibi://docs/errors",
      name: "kibi docs errors",
      description: "Common error modes and suggested recovery actions.",
      mimeType: "text/markdown",
      text: errors,
    },
    {
      uri: "kibi://docs/examples",
      name: "kibi docs examples",
      description: "Concrete tool call sequences for common tasks.",
      mimeType: "text/markdown",
      text: examples,
    },
  ];
}

export const DOC_RESOURCES = registerDocResources();

export function setupDocsAndPrompts(server: McpServer): void {
  for (const prompt of PROMPTS) {
    server.prompt(prompt.name, prompt.description, async () => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: prompt.text },
        },
      ],
    }));
  }

  for (const resource of DOC_RESOURCES) {
    server.resource(
      resource.name,
      resource.uri,
      { description: resource.description, mimeType: resource.mimeType },
      async () => ({
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          },
        ],
      }),
    );
  }
}
