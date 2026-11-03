import { describe, expect, test } from "bun:test";
import {
  collectPredicateSchemaConformanceViolations,
  evaluatePredicateSchemaConformance,
} from "../../../src/public/operations/predicate-schema-conformance.js";

const schema = {
  id: "FACT-SCHEMA-POLICY",
  type: "fact",
  fact_kind: "predicate_schema",
  predicate_namespace: "kibi.checks",
  predicate_name: "policy",
  predicate_arity: 2,
  argument_names: ["rule", "severity"],
  argument_types: ["check_rule", "diagnostic_severity"],
  argument_constants: JSON.stringify({ severity: ["warning", "info"] }),
  argument_aliases: JSON.stringify({ severity: { warn: "warning" } }),
};

function fact(
  id: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id,
    type: "fact",
    title: `Predicate: ${String(fields.canonical_key)}`,
    status: "active",
    source: `.kb/facts/${id}.md`,
    fact_kind: "predicate",
    polarity: "assert",
    relates_to: "kb:entity/REQ-x",
    ...fields,
  };
}

function byId(
  violations: ReturnType<typeof evaluatePredicateSchemaConformance>,
) {
  return Object.fromEntries(
    violations.map((violation) => [
      violation.entityId,
      { description: violation.description, suggestion: violation.suggestion },
    ]),
  );
}

describe("evaluatePredicateSchemaConformance", () => {
  test("describes each kind of non-conforming predicate fact", () => {
    const violations = evaluatePredicateSchemaConformance([
      schema,
      { ...schema, id: "FACT-SCHEMA-OTHER", predicate_namespace: "kibi.other" },
      {
        ...schema,
        id: "FACT-SCHEMA-BAD",
        predicate_name: "bad",
        argument_aliases: JSON.stringify({ severity: { warn: "fatal" } }),
      },
      { ...schema, id: "FACT-SCHEMA-SOLO", predicate_name: "solo" },
      fact("FACT-OK", {
        predicate_namespace: "kibi.checks",
        predicate_name: "policy",
        predicate_args: ["r", "warning"],
        canonical_key: "policy(r,warning)",
      }),
      fact("FACT-ALIAS", {
        predicate_namespace: "kibi.checks",
        predicate_name: "policy",
        predicate_args: ["r", "warn"],
        canonical_key: "policy(r,warn)",
      }),
      fact("FACT-FATAL", {
        predicate_namespace: "kibi.checks",
        predicate_name: "policy",
        predicate_args: ["r", "fatal"],
        canonical_key: "policy(r,fatal)",
      }),
      fact("FACT-AMBIGUOUS", {
        predicate_name: "policy",
        predicate_args: ["r", "warning"],
        canonical_key: "policy(r,warning)",
      }),
      fact("FACT-DRIFT", {
        predicate_name: "solo",
        predicate_args: ["r", "warn"],
        canonical_key: "solo(r,warn)",
      }),
      fact("FACT-UNKNOWN", {
        predicate_name: "made_up",
        predicate_args: ["a"],
        canonical_key: "made_up(a)",
      }),
    ]);
    const found = byId(violations);
    expect(Object.keys(found).sort()).toStrictEqual([
      "FACT-ALIAS",
      "FACT-AMBIGUOUS",
      "FACT-DRIFT",
      "FACT-FATAL",
      "FACT-SCHEMA-BAD",
      "FACT-UNKNOWN",
    ]);
    expect(found["FACT-SCHEMA-BAD"]?.description).toStartWith(
      "Predicate schema FACT-SCHEMA-BAD declares an invalid argument vocabulary: ",
    );
    expect(found["FACT-ALIAS"]).toStrictEqual({
      description:
        "Predicate fact FACT-ALIAS (kibi.checks:policy/2); argument severity uses alias warn for warning",
      suggestion:
        "Mechanical repair available: review and apply it with kibi migrate --apply-safe (or replay the kb_upsert in the migration action).",
    });
    expect(found["FACT-FATAL"]).toStrictEqual({
      description:
        "Predicate fact FACT-FATAL (kibi.checks:policy/2); argument severity value fatal is not a declared constant (warning, info)",
      suggestion:
        "Use a declared constant, add the value to argument_constants, or map it with argument_aliases so kibi migrate can rewrite it.",
    });
    expect(found["FACT-AMBIGUOUS"]).toStrictEqual({
      description:
        "Predicate fact FACT-AMBIGUOUS uses default:policy/2; schemas with this signature exist in several namespaces (kibi.checks, kibi.other)",
      suggestion:
        "Set predicate_namespace to the schema this claim belongs to.",
    });
    expect(found["FACT-DRIFT"]?.description).toBe(
      "Predicate fact FACT-DRIFT uses default:solo/2, but its schema FACT-SCHEMA-SOLO is in namespace kibi.checks; argument severity uses alias warn for warning",
    );
    expect(found["FACT-UNKNOWN"]).toStrictEqual({
      description:
        "Predicate fact FACT-UNKNOWN uses default:made_up/1, which has no predicate_schema",
      suggestion:
        "Declare a predicate_schema for this signature (kb_model mode predicates helps pick an existing one) or move the claim to a schema that already exists.",
    });
  });
});

describe("collectPredicateSchemaConformanceViolations", () => {
  test("reads every fact from the KB", async () => {
    const goals: string[] = [];
    const violations = await collectPredicateSchemaConformanceViolations({
      async query(goal: string) {
        goals.push(goal);
        return {
          success: true,
          bindings: {
            Results:
              "[['FACT-X',fact,[title='x',fact_kind=predicate,predicate_name=made_up,predicate_args=[a],canonical_key='made_up(a)']]]",
          },
        };
      },
    });
    expect(goals[0]).toContain("'fact'");
    expect(violations.map((violation) => violation.entityId)).toStrictEqual([
      "FACT-X",
    ]);
  });
});
