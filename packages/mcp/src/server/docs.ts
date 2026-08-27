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
import { KIBI_ICONS } from "./icons.js";

interface ToolConfig {
  name: string;
  description: string;
  inputSchema: Readonly<Record<string, unknown>>;
}
const ACTIVE_TOOLS: readonly ToolConfig[] = TOOLS;

export interface DocResource {
  uri: string;
  name: string;
  title: string;
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
    name: "kibi-bootstrap",
    title: "Bootstrap Kibi knowledge",
    description:
      "Bootstrap Kibi knowledge for an existing repository through the canonical planner and apply operation.",
    text: [
      "# Kibi Bootstrap",
      "",
      "Route an explicit bootstrap request to the canonical `kibi-bootstrap` skill and planner.",
      "",
      "## Route",
      "",
      "Inspect `kb_status.bootstrap` and follow its typed `nextAction`. If infrastructure is missing, run `kibi init` before planning.",
      "",
      "## Preview and Approval",
      "",
      "Call `kb_plan_bootstrap` read-only. Ask only the bounded questions returned when its status is `needs_context`; do not invent a questionnaire.",
      "",
      "Show the exact returned `structuredContent.plan`, its actions, and canonical hash. Get explicit user approval, then pass that plan object unchanged to `kb_apply_plan`.",
      "",
      "## Verify and repair",
      "",
      "Inspect the typed `kb_apply_plan` result, follow any `nextActions` for recovery, and finish with `kb_check` and `kb_status`. Never read or edit `.kb` directly or reconstruct a plan.",
    ].join("\n"),
  },
  {
    name: "kibi_overview",
    title: "Kibi usage overview",
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
      "- `kb_coverage`: Curated proof reporting plus deterministic read-only repair batches for requirements",
      "- `kb_graph`: Bounded graph traversal from seed IDs",
      "- `kb_upsert`: Create or update entities and their relationships",
      "- `kb_delete`: Remove entities by ID (with dependency safety checks)",
      "- `kb_check`: Validate KB integrity against configurable rules; omit `rules` for final full validation plus full-KB `qualityDiagnostics[]` audit review",
      "",
      "Core modeling principles:",
      "- Kibi has eight entity types: common authoring (req, scenario, test, fact) and supporting/system (adr, flag, event, symbol).",
      "- Encode requirements as linked facts: `req --constrains--> fact` plus `req --requires_property--> fact`.",
      "- High-confidence `kb_model_requirement` output is deterministic; `/kibi-bootstrap` bootstrap writes still require preview and explicit approval.",
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
    title: "Kibi workflow steps",
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
      "7. **Plan repairs**: Requirement `kb_coverage` returns `repairPlan`; require `repairPlan.scope.complete`, apply only a batch whose state is `ready`, and treat every batch as non-auto-applicable guidance.",
      "8. **Mutate sequentially**: Query current endpoints, validate each payload, then call `kb_upsert` one at a time or `kb_delete` for explicit removals. Re-run `kb_coverage` after each batch rather than continuing from a stale plan.",
      "9. **Targeted checks**: Run `kb_check` after meaningful mutations; specify only the rules you need so scoped validation stays fast and skips the full-KB advisory scan.",
      "10. **Final check**: Run `kb_check` without `rules` before completion so hard `violations[]` and advisory full-KB `qualityDiagnostics[]`—including telemetry acceptance when usage evidence exists—are both reviewed.",
      "11. **Telemetry gate**: When `.kb/usage.log` exists, run the CLI-only `kibi usage-metrics --format json --require-acceptance`; stale, partial, or insufficient `kibi.telemetry-acceptance.v1` evidence is not a pass.",
      "",
      "If a tool returns empty results, do not assume failure. Re-check filters (type, id, tags, sourceFile, limit, or offset).",
    ].join("\n"),
  },
  {
    name: "kibi_constraints",
    title: "Kibi constraints",
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
    '2. `kb_coverage` with `{ "by": "req", "includePassing": false }` to review proof rows and `repairPlan`; require `repairPlan.scope.complete` before treating it as a project-wide inventory',
    "3. Apply only a `repairPlan` batch whose state is `ready`; batches are non-auto-applicable guidance, so query current endpoints, validate every write, and keep `kb_upsert` sequential",
    "4. Re-run `kb_coverage` after each batch instead of continuing from a stale plan",
    '5. `kb_graph` with `{ "seedIds": ["REQ-001"], "direction": "both", "depth": 2 }` to inspect neighboring entities',
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
      title: "Kibi server overview",
      description: "Full server description, purpose, and scope.",
      mimeType: "text/markdown",
      text: overview,
    },
    {
      uri: "kibi://docs/tools",
      name: "kibi docs tools",
      title: "Kibi tools reference",
      description: "Available tools with summaries and required parameters.",
      mimeType: "text/markdown",
      text: renderToolsDoc(),
    },
    {
      uri: "kibi://docs/errors",
      name: "kibi docs errors",
      title: "Kibi error guide",
      description: "Common error modes and suggested recovery actions.",
      mimeType: "text/markdown",
      text: errors,
    },
    {
      uri: "kibi://docs/examples",
      name: "kibi docs examples",
      title: "Kibi usage examples",
      description: "Concrete tool call sequences for common tasks.",
      mimeType: "text/markdown",
      text: examples,
    },
  ];
}

export const DOC_RESOURCES = registerDocResources();

export function setupDocsAndPrompts(server: McpServer): void {
  for (const prompt of PROMPTS) {
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
      },
      async () => ({
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: prompt.text },
          },
        ],
      }),
    );
  }

  for (const resource of DOC_RESOURCES) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
        icons: KIBI_ICONS,
      },
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
