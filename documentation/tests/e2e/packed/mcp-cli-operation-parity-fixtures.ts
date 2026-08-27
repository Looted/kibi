// implements REQ-kibi-operation-interface-parity
export type JsonRecord = Record<string, unknown>;

export type OperationCase = {
  readonly tool: string;
  readonly route: string;
  readonly input: JsonRecord;
};

export const OPERATIONS: readonly OperationCase[] = [
  {
    tool: "kb_query",
    route: "query",
    input: { type: "req", sourceFile: ".kb/requirements" },
  },
  {
    tool: "kb_search",
    route: "search",
    input: { query: "packed parity" },
  },
  { tool: "kb_status", route: "status", input: {} },
  { tool: "kb_skills_list", route: "skills-list", input: {} },
  {
    tool: "kb_skills_load",
    route: "skills-load",
    input: { id: "kibi-usage" },
  },
  {
    tool: "kb_skills_read",
    route: "skills-read",
    input: {
      id: "kibi-usage",
      resource: "resources/operation-access.md",
    },
  },
  { tool: "kb_find_gaps", route: "find-gaps", input: { type: "req" } },
  { tool: "kb_coverage", route: "coverage", input: { by: "req" } },
  {
    tool: "kb_validate_upsert",
    route: "validate-upsert",
    input: {
      type: "req",
      id: "REQ-PACKED-UPSERT",
      properties: { title: "Packed upsert", status: "open" },
    },
  },
  {
    tool: "kb_upsert",
    route: "upsert",
    input: {
      type: "req",
      id: "REQ-PACKED-UPSERT",
      properties: { title: "Packed upsert", status: "open" },
      document: { path: ".kb/requirements/REQ-PACKED-UPSERT.md" },
      relationships: [
        {
          type: "relates_to",
          from: "REQ-PACKED-UPSERT",
          to: "REQ-PACKED-UPSERT",
        },
      ],
    },
  },
  {
    tool: "kb_graph",
    route: "graph",
    input: {
      seedIds: ["REQ-PACKED-UPSERT"],
      relationships: ["relates_to"],
    },
  },
  {
    tool: "kb_semantic_advisor",
    route: "semantic-advisor",
    input: { text: "Packed routes must remain equivalent." },
  },
  {
    tool: "kb_model_requirement",
    route: "model-requirement",
    input: {
      text: "Packed routes must remain equivalent.",
      confidence: 0.6,
    },
  },
  {
    tool: "kb_suggest_predicates",
    route: "suggest-predicates",
    input: { text: "The CLI must expose every MCP operation." },
  },
  {
    tool: "kb_plan_bootstrap",
    route: "plan-bootstrap",
    input: { includeGenericMarkdown: false, maxCandidates: 1 },
  },
  {
    tool: "kb_delete",
    route: "delete",
    input: { ids: ["REQ-PACKED-UPSERT"] },
  },
  {
    tool: "kb_check",
    route: "check",
    input: { rules: ["required-fields", "query-plan-safety"] },
  },
  {
    tool: "kb_sparql_remote",
    route: "sparql-remote",
    input: {
      endpoint: "SPARQL_ENDPOINT",
      query:
        'SELECT ?subject WHERE { VALUES ?subject { "REQ-PACKED-PARITY" } }',
    },
  },
] as const;

export const EXPECTED_BUNDLE_PATHS = [
  "package/skills/kibi-bootstrap/SKILL.md",
  "package/skills/kibi-freshness/SKILL.md",
  "package/skills/kibi-traceability/SKILL.md",
  "package/skills/kibi-usage/SKILL.md",
  "package/skills/kibi-usage/resources/fact-lanes.md",
  "package/skills/kibi-usage/resources/operation-access.md",
  "package/skills/kibi-usage/resources/relationship-directions.md",
  "package/skills/kibi-usage/resources/workflows.md",
] as const;
