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
    expect(bundle.manifest.version).toBe("1.0.0");
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
  });

  test("body contains MCP workflow terms", () => {
    expect(bundle.body).toContain("kb_search");
    expect(bundle.body).toContain("kb_query");
    expect(bundle.body).toContain("kb_upsert");
    expect(bundle.body).toContain("kb_check");
  });

  test("body explains OpenCode tool prefix convention", () => {
    expect(bundle.body).toContain("OpenCode");
    expect(bundle.body).toContain("kibi_kb_search");
    expect(bundle.body).toContain("kibi_kb_query");
    expect(bundle.body).toContain("kibi_kb_upsert");
    expect(bundle.body).toContain("canonical MCP names");
  });

  test("body contains relationship terms", () => {
    expect(bundle.body).toContain("implements");
    expect(bundle.body).toContain("specified_by");
    expect(bundle.body).toContain("verified_by");
    expect(bundle.body).toContain("validates");
    expect(bundle.body).toContain("executable_for");
    expect(bundle.body).toContain("constrains");
    expect(bundle.body).toContain("requires_property");
    expect(bundle.body).toContain("supersedes");
  });

  test("body contains fact lane terms", () => {
    expect(bundle.body).toContain("fact_kind: subject");
    expect(bundle.body).toContain("fact_kind: property_value");
    expect(bundle.body).toContain("observation");
    expect(bundle.body).toContain("meta");
  });

  test("body contains entity type terms", () => {
    expect(bundle.body).toContain("flag");
    expect(bundle.body).toContain("fact");
    expect(bundle.body).toContain("req");
    expect(bundle.body).toContain("scenario");
    expect(bundle.body).toContain("test");
  });

  test("body contains workflow terms", () => {
    expect(bundle.body).toContain("sequential");
    expect(bundle.body).toContain("discovery");
    expect(bundle.body).toContain("Create-Before-Link");
  });

  test("body contains validation terms", () => {
    expect(bundle.body).toContain("domain-contradictions");
  });

  test("body contains anti-pattern terms", () => {
    expect(bundle.body).toContain("Anti-Patterns");
    expect(bundle.body).toContain("Remediation");
    expect(bundle.body).toContain("do not");
  });

  test("body does not contain CLI-first guidance", () => {
    expect(bundle.body).not.toContain("kibi sync");
    expect(bundle.body).not.toContain("kibi init");
    expect(bundle.body).not.toContain("kibi doctor");
    expect(bundle.body).not.toContain("kibi migrate");
  });

  test("body covers activation criteria", () => {
    expect(bundle.body).toContain(
      "Consult this skill before any Kibi knowledge base operation",
    );
  });

  test("body covers MCP-only rules", () => {
    expect(bundle.body).toContain("Do not read or edit files inside");
    expect(bundle.body).toContain(".kb/");
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
    expect(bundle.body).toContain("If no requirement exists, create one for the corrected behavior");
    expect(bundle.body).toContain("Do not link facts directly to tests");
    expect(bundle.body).toContain("REQ -> TEST");
    expect(bundle.body).toContain("`verified_by`");
    expect(bundle.body).toContain("MCP writes do not automatically stage markdown evidence");
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

  test("body avoids unsupported typed fact value examples", () => {
    expect(bundle.body).not.toContain("value_type: list");
    expect(bundle.body).not.toContain("value_json");
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
    expect(workflows).toContain("Small Behavior Fix With No Existing Requirement");
    expect(workflows).toContain("Do not create a test-fact pair");
  });
});
