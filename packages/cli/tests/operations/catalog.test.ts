import { describe, expect, test } from "bun:test";

import { OPERATION_CATALOG, getSpec, listSpecs } from "kibi-cli/operations";

const EXPECTED_CLI_NAMES = {
  kb_query: "query",
  kb_search: "search",
  kb_status: "status",
  kb_skills_list: "skills list",
  kb_skills_load: "skills load",
  kb_skills_read: "skills read",
  kb_find_gaps: "find-gaps",
  kb_coverage: "coverage",
  kb_graph: "graph",
  kb_semantic_advisor: "semantic-advisor",
  kb_model_requirement: "model-requirement",
  kb_suggest_predicates: "suggest-predicates",
  kb_autopilot_generate: "autopilot-generate",
  kb_validate_upsert: "validate-upsert",
  kb_upsert: "upsert",
  kb_delete: "delete",
  kb_check: "check",
  kb_sparql_remote: "sparql-remote",
} as const;

const PROLOG_FREE_OPERATIONS = new Set([
  "kb_skills_list",
  "kb_skills_load",
  "kb_skills_read",
  "kb_semantic_advisor",
  "kb_autopilot_generate",
  "kb_sparql_remote",
]);

const VALID_EFFECTS = new Set([
  "local-read",
  "kb-read",
  "workspace-read",
  "network-read",
  "kb-write",
  "workspace-write",
]);

describe("public operation catalog", () => {
  test("contains exactly the 18 unique operations and CLI routes", () => {
    expect(OPERATION_CATALOG).toHaveLength(18);
    expect(new Set(OPERATION_CATALOG.map(({ name }) => name)).size).toBe(18);
    expect(
      Object.fromEntries(
        OPERATION_CATALOG.map(({ name, cliName }) => [name, cliName]),
      ),
    ).toEqual(EXPECTED_CLI_NAMES);
  });

  test("declares Prolog requirements and valid non-empty effects", () => {
    for (const spec of OPERATION_CATALOG) {
      expect(spec.requiresProlog).toBe(!PROLOG_FREE_OPERATIONS.has(spec.name));
      expect(spec.effects.length).toBeGreaterThan(0);
      for (const effect of spec.effects) {
        expect(VALID_EFFECTS.has(effect)).toBe(true);
      }
    }
  });

  test("exposes immutable list and exact lookup helpers", () => {
    expect(listSpecs()).toBe(OPERATION_CATALOG);
    for (const spec of OPERATION_CATALOG) {
      expect(getSpec(spec.name)).toBe(spec);
    }
  });
});
