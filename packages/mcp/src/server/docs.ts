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
    lines.push(
      `| \`${tool.name}\` | ${tool.description} | ${required || "none"} |`,
    );
  }
  lines.push("");
  lines.push(
    "Modeling note: Kibi has eight core entity types grouped into common authoring (req, scenario, test, fact) and supporting/system (adr, flag, event, symbol).",
  );
  lines.push(
    "Only strict domain facts (`fact_kind: subject` + `property_value`) participate in contradiction inference; use `flag` for runtime/config gates and `fact_kind: observation` or `meta` for bug/workaround notes.",
  );
  lines.push(
    "Predicate flow: before writing ontology prose, call `kb_suggest_predicates`; apply a suggested `fact_kind: predicate` via `requires_predicate`, or record the returned `review:ontology-gap` observation when no predicate fits.",
  );
  return lines.join("\n");
}

export const PROMPTS = [
  // implements REQ-002, REQ-013, REQ-mcp-search-discovery
  {
    name: "init-kibi",
    description:
      "Activation workflow to populate a new or empty Kibi KB from an existing repository.",
    text: [
      "# Kibi Interactive Activation Workflow",
      "",
      "Use this post-hoc workflow to onboard a new or empty repository into Kibi through interactive discovery.",
      "",
      "## Step 1: Gather Declared Context",
      "",
      "The agent must ask at most 4 bounded questions to gather declared intent from the user:",
      "1. **Project Summary**: What is the core purpose of this project?",
      "2. **Source of Truth**: Where is the primary documentation (canonical requirements, ADRs)?",
      "3. **Priority Root**: In a monorepo, which package should be prioritized?",
      "4. **Verification Anchors**: Where are the primary tests or verification configs located?",
      "",
      "## Step 2: Synthesize Candidates (read-only)",
      "",
      "Call `kb_autopilot_generate` with the gathered context to synthesize candidate entities.",
      "",
      "This tool is **read-only**. It returns additive `structuredContent` with:",
      "- `promptBlock`: review text that must be surfaced before writes",
      "- `recommendedActions`: agent-facing next steps, including any REQ/SCEN/TEST authoring routed for manual handling",
      "- `declaredContext`: the user-provided bootstrap context",
      "- `confidence`: confidence summary for the generated output",
      "- `bootstrapMode`: current KB state (e.g., `root_uninitialized`)",
      "- `candidates`: synthesized entities grounded in declared context and source evidence",
      "- `applyPlan`: exact sequential `kb_upsert` payloads for approved candidates",
      "- `discoverySummary`: source-backed discovery notes",
      "",
      "## Step 3: Preview and Approval",
      "",
      "Surface the `promptBlock`, a summary of `candidates`, and the exact `structuredContent.applyPlan` payloads. Wait for explicit user approval before proceeding to writes.",
      "",
      "## Step 4: Apply Candidates",
      "",
      "Apply candidates sequentially using `kb_upsert`.",
      "1. Execute `structuredContent.applyPlan` sequentially in listed order.",
      "2. Confirm success of each `kb_upsert` before moving to the next.",
      "3. Run `kb_check` after the batch to verify KB integrity.",
      "",
      "## Rules",
      "- Never apply bootstrap writes without user-facing preview and explicit approval.",
      "- `kb_autopilot_generate` is strictly read-only; synthesis is the backend, not the actor.",
      "- Guidance must stay MCP-only; do not suggest `kibi` CLI commands.",
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
      "- `kb_check`: Validate KB integrity against configurable rules; omit `rules` for final full validation plus full-KB `qualityDiagnostics[]` audit review",
      "",
      "Core modeling principles:",
      "- Kibi has eight entity types: common authoring (req, scenario, test, fact) and supporting/system (adr, flag, event, symbol).",
      "- Encode requirements as linked facts: `req --constrains--> fact` plus `req --requires_property--> fact`.",
      "- High-confidence `kb_model_requirement` output is deterministic; `/init-kibi` bootstrap writes still require preview and explicit approval.",
      "- Low-confidence claims (< 0.7) are downgraded to `observation` facts to prevent false-positive contradictions.",
      "- Only strict domain facts participate in contradiction inference; observation and meta facts are non-blocking notes.",
      "- v1 contradictions are limited to exact-value, boolean/enum, numeric range, and polarity conflicts.",
      "- Use `kb_search` first for discovery, then `kb_query` for exact follow-up before any mutation.",
      "- Use `kb_upsert` and `kb_delete` only for intentional, traceable KB changes.",
      "- Run `kb_check` with explicit `rules` during iteration for scoped feedback; run an unfiltered `kb_check` before completion to include the full-KB `qualityDiagnostics[]` audit scan.",
      "- Prefer explicit IDs and enum values to avoid invalid parameters.",
      "- Model requirements by first creating/reusing fact entities (create-before-link).",
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
      "2. **Check schema status**: Call `kb_status` to see if a schema migration is required for the branch KB.",
      "3. **Create-before-link**: Create endpoint entities with `kb_upsert` before linking them.",
      "4. **Validate intent**: If creating links, call `kb_query` for both endpoint IDs first to ensure they exist.",
      "5. **Model requirements as facts**: For new/updated reqs, create/reuse fact entities first, then express req semantics with `constrains` + `requires_property` (automated via `kb_model_requirement`).",
      "6. **Suggest predicates before prose**: For ontology-lane requirements, spell out the prose claim and call `kb_suggest_predicates` before writing `fact_kind: observation`. Apply the selected `fact_kind: predicate` applyPlan, then attach the returned `relationshipPlan` as `requires_predicate` while preserving existing req metadata; use the returned `review:ontology-gap` observation when no predicate fits.",
      "7. **Mutate**: Call `kb_upsert` for create/update, or `kb_delete` for explicit removals.",
      "8. **Targeted checks**: Run `kb_check` after meaningful mutations; specify only the rules you need so scoped validation stays fast and skips the full-KB advisory scan.",
      "9. **Final check**: Run `kb_check` without `rules` before completion so hard `violations[]` and advisory full-KB `qualityDiagnostics[]` are both reviewed.",
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
    '5. `kb_check` with `{ "rules": ["required-fields","no-dangling-refs"] }` for targeted validation; supplying `rules` skips the full-KB advisory scan',
    "",
    "## Model requirements as ontology predicates",
    '1. Spell out the requirement prose and call `kb_suggest_predicates` with `{ "text": "...", "requirementId": "REQ-..." }`',
    "2. If candidates are returned, apply the top or user-selected `structuredContent.applyPlan` to create `fact_kind: predicate`, then attach `structuredContent.relationshipPlan` with `requires_predicate` while preserving existing req metadata",
    "3. If no candidate fits, apply or review the returned `review:ontology-gap` observation instead of silently writing prose",
    "",
    "Note: Kibi has eight core entity types. Create or reuse `fact` entities first, then create `req` entities and link with `constrains` and `requires_property` (create-before-link).",
    "Only strict domain facts are contradiction-safe. Use `flag` for runtime/config gates; use `fact` with `fact_kind: observation` or `meta` for bug/workaround notes.",
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
    '4. `kb_check` with `{ "rules": ["required-fields","no-dangling-refs"] }` for targeted validation; use an unfiltered `kb_check` before completion for full-KB `qualityDiagnostics[]`',
    "",
    "Note: Always use query-first pattern. Specify only needed rules in kb_check for faster iteration; omit rules for the final full validation and full-KB quality diagnostics review.",
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
