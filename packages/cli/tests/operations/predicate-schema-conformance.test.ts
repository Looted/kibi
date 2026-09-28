import { describe, expect, test } from "bun:test";
import { partitionCheckFindings } from "../../src/public/operations/check-helpers.js";
import { buildActionsFromCheck } from "../../src/public/operations/migration-plan.js";
import { evaluatePredicateSchemaConformance } from "../../src/public/operations/predicate-schema-conformance.js";

const policySchema = {
  id: "FACT-SCHEMA-CHECK-FINDING-POLICY",
  type: "fact",
  fact_kind: "predicate_schema",
  predicate_namespace: "kibi.checks",
  predicate_name: "check_finding_policy",
  predicate_arity: 3,
  argument_names: ["rule", "finding", "severity"],
  argument_types: ["check_rule", "finding_class", "diagnostic_severity"],
  argument_constants: JSON.stringify({ severity: ["warning", "info"] }),
  argument_aliases: JSON.stringify({ severity: { warn: "warning" } }),
};

function predicateFact(
  id: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id,
    type: "fact",
    title: `Predicate: ${fields.canonical_key}`,
    status: "active",
    source: `.kb/facts/${id}.md`,
    created_at: "2026-09-28T00:00:00Z",
    updated_at: "2026-09-28T00:00:00Z",
    fact_kind: "predicate",
    polarity: "assert",
    claim_key: "CLAIM-0000000000000001",
    relates_to: ["kb:entity/REQ-anything"],
    ...fields,
  };
}

function evidenceOf(
  violations: ReturnType<typeof evaluatePredicateSchemaConformance>,
  id: string,
) {
  return violations.find((violation) => violation.entityId === id)?.evidence as
    | Record<string, unknown>
    | undefined;
}

describe("predicate-schema-conformance", () => {
  test("conforming project and built-in predicates are silent", () => {
    const violations = evaluatePredicateSchemaConformance([
      policySchema,
      predicateFact("FACT-OK", {
        predicate_namespace: "kibi.checks",
        predicate_name: "check_finding_policy",
        predicate_args: ["domain_redundancy", "same_signature", "warning"],
        canonical_key:
          "check_finding_policy(domain_redundancy,same_signature,warning)",
      }),
      // acceptance_rule/2 is in the built-in catalog, which lives in the
      // default namespace.
      predicateFact("FACT-BUILTIN", {
        predicate_name: "acceptance_rule",
        predicate_args: ["search_results", "shows_empty_state"],
        canonical_key: "acceptance_rule(search_results,shows_empty_state)",
      }),
    ]);
    expect(violations).toEqual([]);
  });

  test("namespace drift onto the only matching schema has an exact repair", () => {
    const violations = evaluatePredicateSchemaConformance([
      policySchema,
      predicateFact("FACT-DRIFT", {
        predicate_name: "check_finding_policy",
        predicate_args: ["domain_redundancy", "same_signature", "warn"],
        canonical_key:
          "check_finding_policy(domain_redundancy,same_signature,warn)",
      }),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("predicate-schema-conformance");
    const evidence = evidenceOf(violations, "FACT-DRIFT");
    expect(evidence).toMatchObject({
      issue: "missing_schema",
      namespace: "default",
      alignment: {
        namespace: "kibi.checks",
        schemaId: "FACT-SCHEMA-CHECK-FINDING-POLICY",
      },
      rewrites: [
        { index: 2, argumentName: "severity", from: "warn", to: "warning" },
      ],
      undeclared: [],
    });
    const repair = evidence?.repair as {
      id: string;
      properties: Record<string, unknown>;
    };
    expect(repair.id).toBe("FACT-DRIFT");
    expect(repair.properties).toMatchObject({
      predicate_namespace: "kibi.checks",
      predicate_args: ["domain_redundancy", "same_signature", "warning"],
      canonical_key:
        "check_finding_policy(domain_redundancy,same_signature,warning)",
      title:
        "Predicate: check_finding_policy(domain_redundancy,same_signature,warning)",
      claim_key: "CLAIM-0000000000000001",
    });
    // Compiled-only fields and relationship projections never enter an upsert.
    for (const key of ["id", "type", "source", "created_at", "relates_to"]) {
      expect(repair.properties).not.toHaveProperty(key);
    }
  });

  test("undeclared constants and ambiguous namespaces are left for review", () => {
    const violations = evaluatePredicateSchemaConformance([
      policySchema,
      {
        ...policySchema,
        id: "FACT-SCHEMA-OTHER",
        predicate_namespace: "kibi.other",
      },
      predicateFact("FACT-FATAL", {
        predicate_namespace: "kibi.checks",
        predicate_name: "check_finding_policy",
        predicate_args: ["domain_redundancy", "same_signature", "fatal"],
        canonical_key:
          "check_finding_policy(domain_redundancy,same_signature,fatal)",
      }),
      predicateFact("FACT-AMBIGUOUS", {
        predicate_name: "check_finding_policy",
        predicate_args: ["domain_redundancy", "same_signature", "warning"],
        canonical_key:
          "check_finding_policy(domain_redundancy,same_signature,warning)",
      }),
      predicateFact("FACT-UNKNOWN", {
        predicate_name: "made_up_rule",
        predicate_args: ["a"],
        canonical_key: "made_up_rule(a)",
      }),
    ]);
    expect(evidenceOf(violations, "FACT-FATAL")).toMatchObject({
      issue: "undeclared_constant",
      undeclared: [{ argumentName: "severity", value: "fatal" }],
      repair: null,
    });
    expect(evidenceOf(violations, "FACT-AMBIGUOUS")).toMatchObject({
      issue: "missing_schema",
      alignment: null,
      candidateNamespaces: ["kibi.checks", "kibi.other"],
      repair: null,
    });
    expect(evidenceOf(violations, "FACT-UNKNOWN")).toMatchObject({
      issue: "missing_schema",
      candidateNamespaces: [],
      repair: null,
    });
  });

  test("an invalid schema vocabulary is reported on the schema", () => {
    const violations = evaluatePredicateSchemaConformance([
      {
        ...policySchema,
        argument_aliases: JSON.stringify({ severity: { warn: "fatal" } }),
      },
    ]);
    expect(violations.map((violation) => violation.entityId)).toEqual([
      "FACT-SCHEMA-CHECK-FINDING-POLICY",
    ]);
  });

  test("mechanical repairs become automatic kb_upsert migration actions", () => {
    const findings = evaluatePredicateSchemaConformance([
      policySchema,
      predicateFact("FACT-DRIFT", {
        predicate_name: "check_finding_policy",
        predicate_args: ["domain_redundancy", "same_signature", "warn"],
        canonical_key:
          "check_finding_policy(domain_redundancy,same_signature,warn)",
      }),
      predicateFact("FACT-FATAL", {
        predicate_namespace: "kibi.checks",
        predicate_name: "check_finding_policy",
        predicate_args: ["domain_redundancy", "same_signature", "fatal"],
        canonical_key:
          "check_finding_policy(domain_redundancy,same_signature,fatal)",
      }),
    ]);
    const { violations, qualityDiagnostics } = partitionCheckFindings(findings);
    // The rule is advisory: nothing blocks.
    expect(violations).toEqual([]);
    const actions = buildActionsFromCheck({
      qualityDiagnostics: qualityDiagnostics as unknown as Record<
        string,
        unknown
      >[],
    });
    const automatic = actions.filter((action) => action.autoApplicable);
    expect(automatic).toHaveLength(1);
    expect(automatic[0]).toMatchObject({
      id: "predicate-schema-alignment-FACT-DRIFT",
      code: "predicate_schema_alignment",
      safety: "automatic",
      state: "ready",
      invocation: {
        kind: "operation",
        name: "kb_upsert",
        input: { type: "fact", id: "FACT-DRIFT" },
      },
    });
    const review = actions.find((action) =>
      action.affectedEntityIds.includes("FACT-FATAL"),
    );
    expect(review).toMatchObject({ safety: "review", autoApplicable: false });
  });
});
