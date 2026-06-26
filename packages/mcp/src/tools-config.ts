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

import {
  DIAGNOSTIC_MODE_ENABLED,
  DIAGNOSTIC_TELEMETRY_SCHEMA,
} from "./diagnostics.js";

const BASE_TOOLS = [
  // implements REQ-002
  {
    name: "kb_query",
    description:
      "Read entities from the KB with filters. Use for discovery and lookup before edits. Do not use for writes. No mutation side effects. Tags filter by metadata tags only, not entity IDs.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "req",
            "scenario",
            "test",
            "adr",
            "flag",
            "event",
            "symbol",
            "fact",
          ],
          description:
            "Optional entity type filter. Allowed: req, scenario, test, adr, flag, event, symbol, fact. Example: 'req'.",
        },
        id: {
          type: "string",
          description:
            "Optional exact entity ID. Example: 'REQ-001'. If omitted, returns matching entities by other filters.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional tag filter. Matches entities that contain any provided tag. Example: ['security','billing'].",
        },
        sourceFile: {
          type: "string",
          description:
            "Optional source-file substring filter. Example: 'src/auth/login.ts'. Uses KB source linkage, not file-system scanning.",
        },
        limit: {
          type: "number",
          default: 100,
          description:
            "Optional max rows to return after filtering. Default: 100 when omitted. Example: 25.",
        },
        offset: {
          type: "number",
          default: 0,
          description:
            "Optional zero-based pagination offset. Default: 0. Example: 50 to skip first 50 rows.",
        },
      },
    },
  },
  {
    name: "kb_search",
    description:
      "Search KB entities for discovery using metadata and markdown body text. Use for exploratory lookup before exact follow-up with kb_query. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description:
            "Free-text query for metadata and markdown body discovery. Example: 'OAuth login flow'.",
        },
        type: {
          type: "string",
          enum: [
            "req",
            "scenario",
            "test",
            "adr",
            "flag",
            "event",
            "symbol",
            "fact",
          ],
          description:
            "Optional entity type filter to narrow discovery. Example: 'req'.",
        },
        limit: {
          type: "integer",
          default: 20,
          description:
            "Optional max rows to return after ranking. Default: 20.",
        },
        offset: {
          type: "integer",
          default: 0,
          description: "Optional zero-based pagination offset. Default: 0.",
        },
      },
    },
  },
  {
    name: "kb_status",
    description:
      "Report current branch, snapshot, and freshness metadata for the attached KB. Read-only status inspection with no mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "kb_skills_list",
    description:
      "List bundled Kibi agent skills available for progressive disclosure. Read-only; does not mutate the KB or require Prolog.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "kb_skills_load",
    description:
      "Load a bundled Kibi agent skill by ID, returning its manifest metadata, Markdown body, declared resources, content hash, and source type. Read-only; does not execute scripts or require Prolog.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "Bundled skill ID to load. Example: 'kibi-usage'.",
        },
      },
    },
  },
  {
    name: "kb_skills_read",
    description:
      "Read a declared resource from a bundled Kibi agent skill. Resource paths are restricted to the skill manifest; arbitrary file paths are not exposed. Read-only; does not require Prolog.",
    inputSchema: {
      type: "object",
      required: ["id", "resource"],
      properties: {
        id: {
          type: "string",
          description: "Bundled skill ID. Example: 'kibi-usage'.",
        },
        resource: {
          type: "string",
          description:
            "Manifest-declared resource path to read. Example: 'resources/workflows.md'.",
        },
      },
    },
  },
  {
    name: "kb_find_gaps",
    description:
      "Run bulk missing/present relationship analysis over KB entities. Use for questions like which requirements lack scenarios or tests. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "req",
            "scenario",
            "test",
            "adr",
            "flag",
            "event",
            "symbol",
            "fact",
          ],
        },
        missingRelationships: {
          type: "array",
          items: { type: "string" },
        },
        presentRelationships: {
          type: "array",
          items: { type: "string" },
        },
        tags: {
          type: "array",
          items: { type: "string" },
        },
        sourceFile: {
          type: "string",
        },
        limit: {
          type: "integer",
          default: 100,
        },
        offset: {
          type: "integer",
          default: 0,
        },
      },
    },
  },
  {
    name: "kb_coverage",
    description:
      "Generate curated coverage reports for requirements, symbols, or grouped types. Read-only reporting with no mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        by: {
          type: "string",
          enum: ["req", "symbol", "type"],
          default: "req",
        },
        tags: {
          type: "array",
          items: { type: "string" },
        },
        includePassing: {
          type: "boolean",
          default: false,
        },
        includeTransitive: {
          type: "boolean",
          default: true,
        },
        limit: {
          type: "integer",
          default: 100,
        },
        offset: {
          type: "integer",
          default: 0,
        },
      },
    },
  },
  {
    name: "kb_graph",
    description:
      "Run bounded graph traversal from one or more seed IDs across curated relationship types. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["seedIds"],
      properties: {
        seedIds: {
          type: "array",
          items: { type: "string" },
        },
        relationships: {
          type: "array",
          items: { type: "string" },
        },
        direction: {
          type: "string",
          enum: ["outgoing", "incoming", "both"],
          default: "outgoing",
        },
        depth: {
          type: "integer",
          default: 1,
          minimum: 1,
          maximum: 5,
        },
        entityTypes: {
          type: "array",
          items: { type: "string" },
        },
        maxNodes: {
          type: "integer",
          default: 200,
        },
        maxEdges: {
          type: "integer",
          default: 500,
        },
      },
    },
  },
  {
    name: "kb_sparql_remote",
    description:
      "Opt-in remote SPARQL query tool for external HTTP(S) RDF endpoints. This does not query Kibi's local RDF store directly, stores no credentials, and depends on network availability.",
    inputSchema: {
      type: "object",
      required: ["endpoint", "query"],
      properties: {
        endpoint: {
          type: "string",
          description:
            "Remote SPARQL endpoint URL. Must start with http:// or https://.",
        },
        query: {
          type: "string",
          description: "SPARQL SELECT query to send to the remote endpoint.",
        },
        timeoutMs: {
          type: "number",
          description:
            "Optional positive timeout in milliseconds for the remote query.",
        },
      },
    },
  },
  {
    name: "kb_semantic_advisor",
    description:
      "Analyze requirement prose without mutating the KB and return semantic advisor receipts with modeling suggestions. Use before constructing kb_upsert payloads when prose may contain machine-checkable logic. Suggestions can include strict-property facts, predicate facts, ambiguity observations, or ontology-gap observations; all suggestions are advisory and reviewable.",
    inputSchema: {
      type: "object",
      required: ["text"],
      properties: {
        text: {
          type: "string",
          description:
            "Requirement prose to inspect for machine-checkable modeling suggestions.",
        },
        type: {
          type: "string",
          enum: ["req"],
          default: "req",
          description:
            "Entity type context for analysis. Currently requirement prose is supported.",
        },
        id: {
          type: "string",
          description:
            "Optional requirement ID used for deterministic draft relationship guidance.",
        },
        title: {
          type: "string",
          description: "Optional requirement title for draft apply plans.",
        },
        source: {
          type: "string",
          description: "Optional provenance for draft suggestions.",
        },
        status: {
          type: "string",
          description: "Optional requirement status for draft suggestions.",
        },
      },
    },
  },
  {
    name: "kb_upsert",
    description:
      "Create or update one entity and optional relationships. Use for KB mutations after validating intent; prefer kb_validate_upsert first because it returns semantic advisor receipts for prose-heavy requirements. Use kb_model_requirement before hand-writing strict property facts from prose, and kb_suggest_predicates before hand-writing ontology predicate facts. Use the `relationships` array for batch creation of multiple links in a single call (e.g., linking a requirement to multiple tests or facts). Prefer modeling requirements as reusable fact links (`constrains`, `requires_property`, or `requires_predicate`) so consistency and contradiction checks remain queryable. Relationship endpoints must already exist in KB. For requirements, the write will be rejected if it contradicts existing current requirements that constrain the same subject with incompatible properties. To replace a conflicting requirement, include a `supersedes` relationship from the new requirement to the old one in the same request. Successful writes may return non-blocking semantic advisor warnings; inspect and repair those warnings before treating prose as contradiction-checkable. Do not use for read-only inspection. Side effects: writes KB, may refresh symbol coordinates.",
    inputSchema: {
      type: "object",
      required: ["type", "id", "properties"],
      properties: {
        type: {
          type: "string",
          enum: [
            "req",
            "scenario",
            "test",
            "adr",
            "flag",
            "event",
            "symbol",
            "fact",
          ],
          description:
            "Entity type to create/update. Allowed: req, scenario, test, adr, flag, event, symbol, fact. Example: 'req'.",
        },
        id: {
          type: "string",
          description:
            "Unique entity ID (string). Example: 'REQ-123'. Existing ID updates the entity; new ID creates it.",
        },
        properties: {
          type: "object",
          description:
            "Entity fields to persist. Must include title and status. If created_at, updated_at, or source are omitted, server fills defaults.",
          properties: {
            title: {
              type: "string",
              description:
                "Required short title. Example: 'Protect account settings endpoint'.",
            },
            status: {
              type: "string",
              description:
                "Required lifecycle state. Allowed values depend on entity type; backward-compatible legacy statuses are also accepted. Examples: 'open', 'passing', 'accepted', 'active'.",
            },
            source: {
              type: "string",
              description:
                "Optional provenance string. Example: 'docs/requirements/REQ-123.md'. Defaults to 'mcp://kibi/upsert'.",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional categorization tags. Example: ['security','api'].",
            },
            owner: {
              type: "string",
              description:
                "Optional owner name/team. Example: 'platform-team'.",
            },
            priority: {
              type: "string",
              description: "Optional priority label. Example: 'high'.",
            },
            severity: {
              type: "string",
              description: "Optional severity label. Example: 'critical'.",
            },
            links: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional references. Example: ['REQ-010','https://example.com/spec'].",
            },
            text_ref: {
              type: "string",
              description:
                "Optional text anchor/reference. Example: 'requirements.md#L40'.",
            },
            sourceFile: {
              type: "string",
              description:
                "Optional code source file for symbol entities. Example: 'src/auth/login.ts'.",
            },
            granularity_reason: {
              type: "string",
              enum: [
                "config-artifact",
                "module-level-behavior",
                "extractor-miss",
                "legacy-link",
              ],
              description:
                "Optional justification for a coarse file/module-level symbol traceability relationship when narrower function/class/type symbols exist.",
            },
            symbol_role: {
              type: "string",
              enum: [
                "behavioral",
                "structural",
                "type-shape",
                "config",
                "module",
                "unknown",
              ],
              description:
                "Optional role classification for symbol entities. Example: 'behavioral'.",
            },
            fact_kind: {
              type: "string",
              enum: [
                "subject",
                "property_value",
                "observation",
                "meta",
                "predicate_schema",
                "predicate",
              ],
              description:
                "Optional fact lane kind for fact entities. Strict lane uses 'subject' and 'property_value'; context lane uses 'observation' or 'meta'; ontology lane uses 'predicate_schema' or 'predicate'. Use kb_model_requirement or kb_suggest_predicates when starting from prose.",
            },
            subject_key: {
              type: "string",
              description:
                "Snake_case only. Optional canonical subject key for strict fact entities. Example: 'user.session'. Do not use subjectKey in kb_upsert.properties.",
            },
            property_key: {
              type: "string",
              description:
                "Snake_case only. Optional canonical property key for property_value facts. Example: 'session.timeout_minutes'. Do not use propertyKey in kb_upsert.properties.",
            },
            operator: {
              type: "string",
              enum: ["eq", "neq", "lt", "lte", "gt", "gte"],
              description:
                "Optional comparison operator for property_value facts. Example: 'eq'.",
            },
            value_type: {
              type: "string",
              enum: ["string", "int", "number", "bool"],
              description:
                "Optional typed value discriminator for property_value facts. Pair with exactly one value_string, value_int, value_number, or value_bool; do not use generic value.",
            },
            value_string: {
              type: "string",
              description: "Optional string value for property_value facts.",
            },
            value_int: {
              type: "integer",
              description: "Optional integer value for property_value facts.",
            },
            value_number: {
              type: "number",
              description: "Optional number value for property_value facts.",
            },
            value_bool: {
              type: "boolean",
              description: "Optional boolean value for property_value facts.",
            },
            unit: {
              type: "string",
              description: "Optional unit for numeric property_value facts.",
            },
            scope: {
              type: "string",
              description: "Optional scope qualifier for fact entities.",
            },
            polarity: {
              type: "string",
              enum: ["require", "forbid", "assert", "deny"],
              description:
                "Optional polarity for property_value or predicate facts.",
            },
            closed_world: {
              type: "boolean",
              description:
                "Optional closed-world marker for strict fact interpretation.",
            },
            canonical_key: {
              type: "string",
              description:
                "Optional canonical identity key for predicate or strict fact claims.",
            },
            predicate_name: {
              type: "string",
              description:
                "Optional predicate name for ontology predicate facts. Prefer kb_suggest_predicates before hand-writing predicate_name.",
            },
            predicate_args: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional ordered predicate arguments for ontology predicate facts. Prefer kb_suggest_predicates before hand-writing predicate_args.",
            },
          },
          required: ["title", "status"],
        },
        relationships: {
          type: "array",
          description:
            "Optional relationship rows to create in the same call. For requirement encoding, prefer `constrains` + `requires_property` for strict property facts or `requires_predicate` for ontology predicate facts. Side effect: asserts edges in KB.",
          items: {
            type: "object",
            required: ["type", "from", "to"],
            properties: {
              type: {
                type: "string",
                enum: [
                  "depends_on",
                  "specified_by",
                  "verified_by",
                  "validates",
                  "implements",
                  "covered_by",
                  "executable_for",
                  "constrained_by",
                  "constrains",
                  "requires_property",
                  "requires_predicate",
                  "guards",
                  "publishes",
                  "consumes",
                  "supersedes",
                  "relates_to",
                ],
                description:
                  "Relationship type enum. Use only supported values. Direction semantics follow KB model (e.g., implements symbol->req, verified_by req/scenario->test, executable_for symbol->test).",
              },
              from: {
                type: "string",
                description:
                  "Source entity ID (must exist). Example: 'SYM-login-handler'.",
              },
              to: {
                type: "string",
                description:
                  "Target entity ID (must exist). Example: 'REQ-001'.",
              },
            },
          },
        },
      },
    },
  },
  {
    name: "kb_validate_upsert",
    description:
      "Validate a kb_upsert payload without mutating the KB. Use this read-only preflight before kb_upsert, especially for requirements, because it returns schema/modeling errors plus semantic advisor receipts that identify prose likely needing kb_model_requirement, kb_suggest_predicates, ambiguity review, or an ontology-gap observation.",
    inputSchema: {
      type: "object",
      required: ["type", "id", "properties"],
      properties: {
        type: {
          type: "string",
          enum: [
            "req",
            "scenario",
            "test",
            "adr",
            "flag",
            "event",
            "symbol",
            "fact",
          ],
        },
        id: { type: "string" },
        properties: {
          type: "object",
          description:
            "Entity properties to validate using the same snake_case field names accepted by kb_upsert.",
        },
        relationships: {
          type: "array",
          items: { type: "object" },
        },
      },
    },
  },
  {
    name: "kb_delete",
    description:
      "Delete entities by ID. Use only for intentional removals after dependency checks. Do not use as a bulk cleanup shortcut. Side effects: mutates and saves KB; skips entities with dependents.",
    inputSchema: {
      type: "object",
      required: ["ids"],
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description:
            "Required list of entity IDs to delete. Example: ['REQ-001','TEST-002']. At least one ID is required.",
        },
      },
    },
  },
  {
    name: "kb_check",
    description:
      "Run KB validation rules and return violations. Use before or after mutations, and after meaningful source edits with impact options to surface symbol granularity and semantic-review diagnostics. Do not use for point lookups. No write side effects. Prefer explicit rules for faster iteration.",
    inputSchema: {
      type: "object",
      properties: {
        rules: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "must-priority-coverage",
              "symbol-coverage",
              "symbol-traceability",
              "no-dangling-refs",
              "no-cycles",
              "required-fields",
              "deprecated-adr-no-successor",
              "domain-contradictions",
              "strict-fact-shape",
              "strict-req-fact-pairing",
            ],
          },
          description:
            "Optional rule subset. Allowed: must-priority-coverage, symbol-coverage, symbol-traceability, no-dangling-refs, no-cycles, required-fields, deprecated-adr-no-successor, domain-contradictions, strict-fact-shape, strict-req-fact-pairing. If omitted, server runs all.",
        },
        sourceFiles: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional repo-relative source files to inspect for early impact diagnostics. Use with includeImpactDiagnostics after meaningful source edits.",
        },
        staged: {
          type: "boolean",
          description:
            "When true, inspect staged source changes for impact diagnostics using the shared CLI impact analyzer without shelling out to kibi check.",
        },
        includeWorkingTreeDiff: {
          type: "boolean",
          description:
            "When true, inspect current unstaged working-tree diffs for impact diagnostics. Pair with sourceFiles to scope the analysis.",
        },
        includeImpactDiagnostics: {
          type: "boolean",
          description:
            "When true, include changed-file impact diagnostics such as symbol_granularity_violation and symbol_semantic_review_needed in structured output.",
        },
        maxDiagnostics: {
          type: "integer",
          minimum: 0,
          description:
            "Optional maximum number of impact diagnostics to return. Graph validation violations are not capped by this value.",
        },
        workspaceRoot: {
          type: "string",
          description:
            "Optional workspace root for impact diagnostics and .kb/config.json lookup. Defaults to the MCP server workspace.",
        },
      },
    },
  },
  {
    name: "kb_model_requirement",
    description:
      "Convert a prose requirement plus optional extracted claim fields into a deterministic strict-lane write set. Read-only modeling returns a sequential applyPlan for later kb_upsert calls. High-confidence claims emit req+fact strict output; lower-confidence claims emit an observation review artifact. Includes migration warnings when legacy schemaVersion metadata is detected.",
    inputSchema: {
      type: "object",
      required: ["text"],
      properties: {
        text: {
          type: "string",
          description:
            "Required prose requirement text to model. Example: 'Customer data must be retained for 7 years.'",
        },
        source: {
          type: "string",
          description:
            "Optional primary source path or provenance root used for stable IDs and text refs. Example: 'documentation/requirements/customer-retention.md'.",
        },
        sourceFiles: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional related source files. The first value is used as the source fallback when source is omitted.",
        },
        confidence: {
          type: "number",
          default: 0.8,
          minimum: 0,
          maximum: 1,
          description:
            "Confidence score for the extracted claim. >= 0.70 yields strict-lane output; lower confidence yields observation-only review output.",
        },
        subjectKey: {
          type: "string",
          description:
            "Optional extracted semantic claim subjectKey. Example: 'Customer.Data'.",
        },
        propertyKey: {
          type: "string",
          description:
            "Optional extracted semantic claim propertyKey. Example: 'Retention Years'.",
        },
        operator: {
          type: "string",
          enum: ["eq", "gte", "lte", "neq", "bool", "polarity"],
          description:
            "Optional extracted semantic claim operator. Example: 'eq'.",
        },
        value: {
          description:
            "Optional extracted semantic claim value. Accepts string, number, or boolean.",
        },
        provenance: {
          type: "string",
          description:
            "Optional extracted text reference. Falls back to source when omitted. Example: 'documentation/requirements/customer-retention.md#L1'.",
        },
      },
    },
  },
  {
    name: "kb_suggest_predicates",
    description:
      "Suggest ontology predicate schemas for prose requirements before agents write facts. Read-only guidance returns ranked candidates, a safe predicate-fact applyPlan, a separate requires_predicate relationshipPlan when a requirement ID is supplied, or an explicit ontology-gap observation when no predicate fits.",
    inputSchema: {
      type: "object",
      required: ["text"],
      properties: {
        text: {
          type: "string",
          description:
            "Required prose requirement or claim to classify into ontology predicates. Example: 'When users navigate away, draft edits must auto-save.'.",
        },
        requirementId: {
          type: "string",
          description:
            "Optional existing requirement ID. When provided, the response includes a relationshipPlan describing the req -> fact requires_predicate link to attach after preserving existing requirement metadata.",
        },
        source: {
          type: "string",
          description:
            "Optional provenance or text reference for generated predicate facts or ontology-gap observations.",
        },
        subjectHint: {
          type: "string",
          description:
            "Optional canonical subject key to use as the first predicate argument. Example: 'editor.annotation'.",
        },
        maxCandidates: {
          type: "integer",
          default: 5,
          minimum: 1,
          maximum: 20,
          description:
            "Maximum ranked predicate candidates to return. Default: 5.",
        },
        minScore: {
          type: "number",
          default: 0.35,
          minimum: 0,
          maximum: 1,
          description:
            "Minimum candidate score. Higher values make ontology-gap fallback more likely. Default: 0.35.",
        },
        includeExistingSchemas: {
          type: "boolean",
          default: true,
          description:
            "Whether to include existing KB fact_kind=predicate_schema facts alongside Kibi's built-in predicate catalog. Default: true.",
        },
      },
    },
  },
  {
    name: "kb_autopilot_generate",
    description:
      "Generate agent-centric bootstrap output for KB population. Read-only analysis that returns activation state, bootstrap guidance, candidate entities with evidence, payoff summary, and exact applyPlan payloads for later kb_upsert calls. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        includeGenericMarkdown: {
          type: "boolean",
          default: true,
          description:
            "Whether to include generic markdown file content as candidate facts. Default: true.",
        },
        minConfidence: {
          type: "number",
          default: 0.8,
          minimum: 0.6,
          maximum: 0.95,
          description:
            "Minimum confidence threshold for candidates. Clamped to [0.60, 0.95]. Default: 0.80.",
        },
        maxCandidates: {
          type: "integer",
          default: 50,
          minimum: 1,
          maximum: 200,
          description:
            "Maximum number of candidates to return. Clamped to [1, 200]. Default: 50.",
        },
        entityTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["req", "scenario", "test", "adr", "fact", "symbol"],
          },
          description:
            "Optional filter to limit candidate generation to specific entity types.",
        },
        bootstrapContext: {
          type: "object",
          description:
            "Optional declared bootstrap context supplied by the agent to ground the read-only synthesis output.",
          properties: {
            projectSummary: {
              type: "string",
              description:
                "Optional short summary of the project or bootstrap goal.",
            },
            sourceOfTruthPaths: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional repo-relative paths that should be treated as declared sources of truth.",
            },
            sourceOfTruthNotes: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional notes about how to interpret the declared sources of truth.",
            },
            priorityRoots: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional repo roots the bootstrap flow should prioritize when authoring entities.",
            },
            verificationAnchors: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional verification commands, documents, or checkpoints to reference in the output.",
            },
          },
        },
      },
    },
  },
];

/**
 * Tool configuration type with flexible inputSchema.
 */
interface ToolConfig {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Inject _diagnostic_telemetry schema into tool inputs when diagnostic mode is enabled.
 * Exported for unit coverage; TOOLS still applies it only when the server starts
 * with the --diagnostic-mode flag.
 */
export function withDiagnosticTelemetrySchema(
  tools: ToolConfig[],
): ToolConfig[] {
  return tools.map((tool) => {
    const schema = tool.inputSchema;
    const properties =
      schema.properties && typeof schema.properties === "object"
        ? (schema.properties as Record<string, unknown>)
        : {};
    return {
      ...tool,
      inputSchema: {
        ...schema,
        properties: {
          ...properties,
          _diagnostic_telemetry: DIAGNOSTIC_TELEMETRY_SCHEMA,
        },
      },
    };
  });
}

/**
 * Active tools list.
 * In diagnostic mode, all tools include the _diagnostic_telemetry parameter.
 */
export const TOOLS: ToolConfig[] = DIAGNOSTIC_MODE_ENABLED
  ? withDiagnosticTelemetrySchema(BASE_TOOLS as ToolConfig[])
  : (BASE_TOOLS as ToolConfig[]);
