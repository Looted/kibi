import {
  type OperationName,
  listSpecs,
} from "../../src/public/operations/index.js";

type JsonInput = Readonly<Record<string, unknown>>;

// implements REQ-kibi-operation-interface-parity
export type ParityCase = {
  readonly operation: OperationName;
  readonly input: JsonInput;
};

const SEED_INPUTS = {
  kb_query: { type: "req", limit: 1, offset: 0 },
  kb_search: { query: "freeze contracts", type: "req", limit: 1, offset: 0 },
  kb_status: {},
  kb_skills_list: {},
  kb_skills_load: { id: "kibi-usage" },
  kb_skills_read: { id: "kibi-usage", resource: "resources/workflows.md" },
  kb_find_gaps: {
    type: "req",
    missingRelationships: ["verified_by"],
    limit: 25,
    offset: 0,
  },
  kb_coverage: {
    by: "req",
    includePassing: false,
    includeTransitive: true,
    limit: 25,
    offset: 0,
  },
  kb_graph: { seedIds: ["REQ-CONTRACT-001"], direction: "outgoing", depth: 1 },
  kb_sparql_remote: {
    endpoint: "http://127.0.0.1:9/sparql",
    query: "SELECT * WHERE {}",
    timeoutMs: 1000,
  },
  kb_semantic_advisor: {
    text: "The editor must save changes automatically when the user navigates away.",
    type: "req",
  },
  kb_upsert: {
    type: "req",
    id: "REQ-CONTRACT-002",
    properties: { title: "Add parity test coverage", status: "open" },
  },
  kb_validate_upsert: {
    type: "req",
    id: "REQ-CONTRACT-002",
    properties: { title: "Add parity test coverage", status: "open" },
  },
  kb_delete: { ids: ["REQ-CONTRACT-001"] },
  kb_check: { rules: [] },
  kb_model_requirement: {
    text: "Customer data must be retained for 7 years.",
    confidence: 0.8,
  },
  kb_suggest_predicates: {
    text: "The editor must save changes automatically when the user navigates away.",
    maxCandidates: 1,
  },
  kb_autopilot_generate: {
    includeGenericMarkdown: false,
    minConfidence: 0.8,
    maxCandidates: 1,
  },
} as const satisfies Record<OperationName, JsonInput>;

// implements REQ-kibi-operation-interface-parity
export const PARITY_CASES: readonly ParityCase[] = listSpecs().map((spec) => ({
  operation: spec.name,
  input: SEED_INPUTS[spec.name],
}));
