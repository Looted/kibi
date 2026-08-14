import { beforeAll, describe, expect, test } from "bun:test";
import {
  loadBundledSkill,
  readBundledSkillResource,
} from "../src/public/skills";

describe("kibi-usage skill content", () => {
  let bundle: ReturnType<typeof loadBundledSkill>;

  beforeAll(() => {
    bundle = loadBundledSkill("kibi-usage");
  });

  test("manifest has required fields", () => {
    expect(bundle.manifest.id).toBe("kibi-usage");
    expect(bundle.manifest.name).toBe("Kibi Usage");
    expect(bundle.manifest.description).toBe(
      "Guides agents to use Kibi MCP, facts, relationships, and validation correctly",
    );
    expect(bundle.manifest.version).toBe("1.4.0");
    expect(bundle.manifest.kibiCompatibility).toBe(">=0.11.0");
    expect(bundle.manifest.tags).toContain("kibi");
    expect(bundle.manifest.tags).toContain("mcp");
    expect(bundle.manifest.tags).toContain("knowledge-base");
    expect(bundle.manifest.tags).toContain("traceability");
    expect(bundle.manifest.tags).toContain("agent-guidance");
  });

  test("manifest declares resources", () => {
    expect(bundle.manifest.resources).toContain(
      "resources/relationship-directions.md",
    );
    expect(bundle.manifest.resources).toContain("resources/fact-lanes.md");
    expect(bundle.manifest.resources).toContain("resources/workflows.md");
    expect(bundle.manifest.resources).toContain(
      "resources/operation-access.md",
    );
    expect(bundle.manifest.resources).toContain("resources/logic-ir.md");
  });

  test("body contains MCP workflow terms", () => {
    expect(bundle.body).toContain("kb_search");
    expect(bundle.body).toContain("kb_query");
    expect(bundle.body).toContain("kb_upsert");
    expect(bundle.body).toContain("kb_check");
  });

  test("predicate guidance loads a canonical decision tree with immutable resource examples", () => {
    const requiredOperations = [
      "kb_semantic_advisor",
      "kb_suggest_predicates",
      "kb_model_requirement",
      "requires_predicate",
      "kb_upsert",
      "kb_check",
    ] as const;
    const factLanes = readBundledSkillResource(
      "kibi-usage",
      "resources/fact-lanes.md",
    );
    const workflows = readBundledSkillResource(
      "kibi-usage",
      "resources/workflows.md",
    );

    expect(bundle.body).toContain("## Predicate Ontology Decision Tree");
    for (const operation of requiredOperations) {
      expect(bundle.body).toContain(operation);
      expect(workflows).toContain(operation);
    }
    for (const exampleClass of [
      "Built-in predicate",
      "Project-local predicate",
      "Deny predicate",
      "Strict scalar",
      "Ambiguous claim",
      "False-positive trap",
      "Ontology gap",
    ] as const) {
      expect(factLanes).toContain(exampleClass);
    }
    expect(bundle.body).toContain("fact_kind: predicate");
    expect(bundle.body).toContain("fact_kind: observation");
  });

  test("body explains OpenCode tool prefix convention", () => {
    expect(bundle.body).toContain("OpenCode");
    expect(bundle.body).toContain("kibi_kb_search");
    expect(bundle.body).toContain("kibi_kb_query");
    expect(bundle.body).toContain("kibi_kb_upsert");
    expect(bundle.body).toContain("canonical MCP names");
  });

  test("body defines the capability selection order", () => {
    const interfaceSection = bundle.body.match(
      /## Interface Selection\n([\s\S]*?)(?=\n## )/,
    )?.[1];

    expect(interfaceSection).toBeDefined();
    expect(interfaceSection).toMatch(/1\.[\s\S]*MCP/);
    expect(interfaceSection).toMatch(/2\.[\s\S]*npx --no-install/);
    expect(interfaceSection).not.toMatch(/bunx --no-install/);
    expect(interfaceSection).toMatch(/3\.[\s\S]*operator/);
    expect(interfaceSection).toMatch(/too old/);
    expect(interfaceSection).toMatch(/4\.[\s\S]*global/);
    expect(interfaceSection).toMatch(/installing runner/);
    expect(interfaceSection?.toLowerCase()).not.toContain("mcp only");
    expect(interfaceSection?.toLowerCase()).not.toContain(
      "exclusively through mcp",
    );
  });

  test("body covers activation criteria", () => {
    expect(bundle.body).toContain(
      "Consult this skill before any Kibi knowledge base operation",
    );
  });

  test("body preserves direct-storage safety rules", () => {
    expect(bundle.body).toContain("Do not read or edit files inside");
    expect(bundle.body).toContain(".kb/");
  });

  test("body links the operation catalog and provides an executable CLI JSON recipe", () => {
    const bashBlocks = [...bundle.body.matchAll(/```bash\n([\s\S]*?)```/g)].map(
      (match) => match[1] ?? "",
    );

    expect(bundle.body).toContain("resources/operation-access.md");
    expect(
      bashBlocks.some(
        (block) =>
          block.includes("npx --no-install kibi upsert --input -") &&
          block.includes('"type":"req"') &&
          block.includes('"id":"REQ-001"'),
      ),
    ).toBe(true);
  });

  test("body covers discovery-first workflow", () => {
    expect(bundle.body).toContain("Always discover before you mutate");
  });

  test("body covers relationship direction table", () => {
    expect(bundle.body).toContain("Relationship direction is fixed");
  });

  test("body requires symbol-first traceability instead of legacy comments", () => {
    expect(bundle.body).toContain("Symbol-First Traceability");
    expect(bundle.body).toContain(
      "Do not use legacy `// implements REQ-xxx` comments",
    );
    expect(bundle.body).toContain("`symbol` entity");
    expect(bundle.body).toContain(
      "`implements` relationship from the symbol to the requirement",
    );
  });

  test("body covers strict fact lane", () => {
    expect(bundle.body).toContain(
      "Normative requirements that must participate in contradiction blocking",
    );
  });

  test("body requires clause-complete logical coverage", () => {
    expect(bundle.body).toContain("## Complete Logical Coverage");
    expect(bundle.body).toContain("atomic normative clauses");
    expect(bundle.body).toContain("claim_key");
    expect(bundle.body).toContain("claim_text");
    expect(bundle.body).toContain("logic_claims");
    expect(bundle.body).toContain("logic-coverage");
    expect(bundle.body).toContain(
      "human or agent review still confirms that the atomic clauses exhaust the prose",
    );
  });

  test("body covers granular strict facts with coherent and incoherent examples", () => {
    expect(bundle.body).toContain(
      "Granular fact examples for coherence checks",
    );
    expect(bundle.body).toContain("REQ-ROLE-SET-2");
    expect(bundle.body).toContain("REQ-ROLE-SET-3");
    expect(bundle.body).toContain("user.roles.allowed_set");
    expect(bundle.body).toContain("user,admin");
    expect(bundle.body).toContain("user,admin,superadmin");
    expect(bundle.body).toContain("REQ-ADMIN-CAN-MANAGE-BILLING");
    expect(bundle.body).toContain("REQ-ONLY-SUPERADMIN-MANAGES-BILLING");
    expect(bundle.body).toContain("billing.manage.allowed_actor");
    expect(bundle.body).toContain("domain-contradictions");
  });

  test("body covers fact vs flag", () => {
    expect(bundle.body).toContain(
      "Use `flag` for runtime or config gates only",
    );
  });

  test("body covers create-before-link", () => {
    expect(bundle.body).toContain(
      "Always confirm or create endpoint entities before linking them",
    );
  });

  test("body covers small behavior fix impact evidence recipe", () => {
    expect(bundle.body).toContain("Small Behavior Fix Impact Evidence");
    expect(bundle.body).toContain(
      "If no requirement exists, create one for the corrected behavior",
    );
    expect(bundle.body).toContain("Do not link facts directly to tests");
    expect(bundle.body).toContain("REQ -> TEST");
    expect(bundle.body).toContain("`verified_by`");
    expect(bundle.body).toContain(
      "Kibi operation writes do not automatically stage markdown evidence",
    );
  });

  test("body covers sequential upserts", () => {
    expect(bundle.body).toContain("Never fire `kb_upsert` calls in parallel");
  });

  test("body covers targeted and final checks", () => {
    expect(bundle.body).toContain(
      "Run `kb_check` with specific rules during iteration",
    );
  });

  test("body covers domain contradictions", () => {
    expect(bundle.body).toContain("domain-contradictions");
    expect(bundle.body).toContain("kb_model_requirement");
  });

  test("body covers stale KB handling", () => {
    expect(bundle.body).toContain("kb_status");
    expect(bundle.body).toContain("stale");
  });

  test("body covers anti-patterns with remediation", () => {
    expect(bundle.body).toContain("Anti-Patterns and Remediation");
    expect(bundle.body).toContain("Reversed relationship direction");
    expect(bundle.body).toContain("Bug-as-flag");
  });

  test("body covers diagnostics guardrails for req status, upserts, and retries", () => {
    expect(bundle.body).toContain("status: implemented");
    expect(bundle.body).toContain(
      "Use a valid status such as `closed`, add an `implemented` tag, and link evidence instead",
    );
    expect(bundle.body).toContain(
      "strict `kb_upsert.properties` rejects unknown fields",
    );
    expect(bundle.body).toContain(
      "each row's `from` must equal the upserted entity ID",
    );
    expect(bundle.body).toContain("Keep symbol payloads minimal");
    expect(bundle.body).toContain(
      "When a generic `Query failed` appears, do not keep retrying the same payload",
    );
  });

  test("resources are readable and non-empty", () => {
    const relDir = readBundledSkillResource(
      "kibi-usage",
      "resources/relationship-directions.md",
    );
    expect(relDir).toContain("implements");
    expect(relDir).toContain("specified_by");

    const factLanes = readBundledSkillResource(
      "kibi-usage",
      "resources/fact-lanes.md",
    );
    expect(factLanes).toContain("fact_kind: subject");
    expect(factLanes).toContain("fact_kind: property_value");
    expect(factLanes).toContain("user.roles.allowed_set");
    expect(factLanes).toContain("billing.manage.allowed_actor");
    expect(factLanes).toContain("value_type: string");
    expect(factLanes).not.toContain("value_type: list");
    expect(factLanes).not.toContain("value_json");

    const workflows = readBundledSkillResource(
      "kibi-usage",
      "resources/workflows.md",
    );
    expect(workflows).toContain("kb_search");
    expect(workflows).toContain("kb_check");
    expect(workflows).toContain(
      "Small Behavior Fix With No Existing Requirement",
    );
    expect(workflows).toContain("Do not create a test-fact pair");
  });
});
