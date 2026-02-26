export const TOOLS = [
  {
    name: "kb_query",
    description:
      "Read entities from the KB with filters. Use for discovery and lookup before edits. Do not use for writes. No mutation side effects.",
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
    name: "kb_upsert",
    description:
      "Create or update one entity and optional relationships. Use for KB mutations after validating intent. Use the `relationships` array for batch creation of multiple links in a single call (e.g., linking a requirement to multiple tests or facts). Prefer modeling requirements as reusable fact links (`constrains`, `requires_property`) so consistency and contradiction checks remain queryable. Do not use for read-only inspection. Side effects: writes KB, may refresh symbol coordinates.",
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
              enum: [
                "active",
                "draft",
                "archived",
                "deleted",
                "approved",
                "rejected",
                "pending",
                "in_progress",
                "superseded",
              ],
              description:
                "Required lifecycle state. Allowed values are fixed enum options. Example: 'active'.",
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
          },
          required: ["title", "status"],
        },
        relationships: {
          type: "array",
          description:
            "Optional relationship rows to create in the same call. For requirement encoding, prefer `constrains` + `requires_property` edges from req IDs to shared fact IDs to maximize reuse and detect conflicts. Side effect: asserts edges in KB.",
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
                  "constrained_by",
                  "constrains",
                  "requires_property",
                  "guards",
                  "publishes",
                  "consumes",
                  "supersedes",
                  "relates_to",
                ],
                description:
                  "Relationship type enum. Use only supported values. Direction semantics follow KB model (e.g., implements symbol->req, verified_by req->test).",
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
      "Run KB validation rules and return violations. Use before or after mutations. Do not use for point lookups. No write side effects.",
    inputSchema: {
      type: "object",
      properties: {
        rules: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional rule subset. Allowed: must-priority-coverage, no-dangling-refs, no-cycles, required-fields. If omitted, server runs all.",
        },
      },
      },
  },
  {
    name: "kb_branch_ensure",
    description:
      "Ensure a branch KB exists, creating it from develop when missing. Use when targeting non-develop branches. Do not use to switch git branches. Side effects: creates .kb/branches/<branch>.",
    inputSchema: {
      type: "object",
      required: ["branch"],
      properties: {
        branch: {
          type: "string",
          description:
            "Required git branch name. Example: 'feature/auth-hardening'. Path traversal patterns are rejected.",
        },
      },
      },
  },
  {
    name: "kb_branch_gc",
    description:
      "Find or delete stale branch KB directories not present in git. Use for repository hygiene. Do not use if you need historical branch KBs. Side effects: can delete branch KB folders when dry_run is false.",
    inputSchema: {
      type: "object",
      properties: {
        dry_run: {
          type: "boolean",
          default: true,
          description:
            "Optional safety flag. true = report only; false = delete stale branch KBs. Default: true.",
        },
      },
      },
  },
  {
    name: "kb_query_relationships",
    description:
      "Read relationship edges with optional from/to/type filters. Use for traceability traversal. Do not use to create links. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Optional source entity ID filter. Example: 'REQ-001'.",
        },
        to: {
          type: "string",
          description: "Optional target entity ID filter. Example: 'TEST-010'.",
        },
        type: {
          type: "string",
          enum: [
            "depends_on",
            "specified_by",
            "verified_by",
            "validates",
            "implements",
            "covered_by",
            "constrained_by",
            "constrains",
            "requires_property",
            "guards",
            "publishes",
            "consumes",
            "supersedes",
            "relates_to",
          ],
          description:
            "Optional relationship type filter. Allowed enum values only. Example: 'implements'.",
        },
      },
      },
  },
  {
    name: "kb_derive",
    description:
      "Run deterministic inference predicates and return rows. Use for impact, coverage, and consistency analysis. Do not use for entity CRUD. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["rule"],
      properties: {
        rule: {
          type: "string",
          enum: [
            "transitively_implements",
            "transitively_depends",
            "impacted_by_change",
            "affected_symbols",
            "coverage_gap",
            "untested_symbols",
            "stale",
            "orphaned",
            "conflicting",
            "deprecated_still_used",
            "current_adr",
            "adr_chain",
            "superseded_by",
            "domain_contradictions",
          ],
          description:
            "Required inference rule name. Allowed values are the enum options. Example: 'coverage_gap'.",
        },
        params: {
          type: "object",
          description:
            "Optional rule-specific parameters. Example: { changed: 'REQ-001' } for impacted_by_change.",
        },
      },
      },
  },
  {
    name: "kb_impact",
    description:
      "Return entities impacted by a changed entity ID. Use for quick change blast radius checks. Do not use for general querying. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["entity"],
      properties: {
        entity: {
          type: "string",
          description: "Required changed entity ID. Example: 'REQ-001'.",
        },
      },
      },
  },
  {
    name: "kb_coverage_report",
    description:
      "Compute aggregate traceability coverage for requirements and/or symbols. Use for health snapshots. Do not use for raw entity dumps. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["req", "symbol"],
          description:
            "Optional focus scope: 'req' or 'symbol'. Omit to include both.",
        },
      },
      },
  },
  {
    name: "kb_symbols_refresh",
    description:
      "Refresh generated symbol coordinates in the symbols manifest. Use after refactors that move symbols. Do not use for semantic edits. Side effects: may rewrite symbols.yaml unless dryRun is true.",
    inputSchema: {
      type: "object",
      properties: {
        dryRun: {
          type: "boolean",
          default: false,
          description:
            "Optional preview mode. true = report only, false = apply file updates. Default: false.",
        },
      },
      },
  },
  {
    name: "kb_list_entity_types",
    description:
      "List supported entity type names. Use when building valid tool arguments. Do not use for entity data retrieval. No mutation side effects.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "kb_list_relationship_types",
    description:
      "List supported relationship type names. Use before asserting or filtering relationships. Do not use for graph traversal. No mutation side effects.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "kbcontext",
    description:
      "Return KB entities linked to a source file plus first-hop relationships. Use for file-centric traceability. Do not use for cross-repo search. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["sourceFile"],
      properties: {
        sourceFile: {
          type: "string",
          description:
            "Required source path substring. Example: 'src/auth/login.ts'.",
        },
        branch: {
          type: "string",
          description:
            "Optional branch hint for clients. Must match the server's active branch or will return an error.",
        },
      },
    },
  },
  {
    name: "get_help",
    description:
      "Returns documentation for this MCP server. Call this first if you are unsure how to proceed or which tool to use. Available topics: overview, tools, workflow, constraints, examples, errors.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [
            "overview",
            "tools",
            "workflow",
            "constraints",
            "examples",
            "errors",
            "branching",
          ],
          description:
            "Optional documentation section. Omit to return overview. Example: 'workflow'.",
        },
      },
    },
  },
  {
    name: "analyze_shared_facts",
    description:
      "Analyze requirements and suggest shared domain facts for extraction. LLMs call this to identify missed semantic opportunities before upserting. Lightweight heuristic: finds overlapping capitalized terms and repeated phrases across requirements.",
    inputSchema: {
      type: "object",
      properties: {
        min_frequency: {
          type: "number",
          default: 2,
          description:
            "Minimum frequency threshold for shared concepts. Default: 2. Example: 3 to only show concepts mentioned in 3+ requirements.",
        },
      },
    },
  },
];
