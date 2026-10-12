// implements REQ-model-predicates-grounding-guards
import { describe, expect, test } from "bun:test";
import { handleKbSuggestPredicates } from "../../src/operations/modeling/suggest-predicates.js";
import type {
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

/** A KB whose only predicate schema lives in a project namespace. */
function namespacedSchemaKb(namespace: string | null): PrologPort {
  const namespaceField =
    namespace === null ? "" : `,predicate_namespace=${namespace}`;
  return {
    query: async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("kb:predicate_schema") || goal.includes("Results"))
        return {
          success: true,
          bindings: {
            Results: `[['FACT-SCHEMA-RELEASE-GATE',fact,[fact_kind=predicate_schema,predicate_name=release_gate${namespaceField},title="Release gate",description="A release gate holds or clears a stage.",argument_names=[subject,stage,decision],argument_types=[entity,stage,decision],examples=[release_gate(subject,stage,decision)],tags=[release]]]]`,
          },
        };
      return { success: false, bindings: {} };
    },
  } as unknown as PrologPort;
}

const ARGS = {
  text: "The release gate must hold the publish stage.",
  subjectHint: "release.pipeline",
  schemaId: "FACT-SCHEMA-RELEASE-GATE",
  argumentBindings: {
    subject: "release.pipeline",
    stage: "publish",
    decision: "hold",
  },
  maxCandidates: 1,
};

describe("kb_model predicates with a namespaced project schema", () => {
  test("the planned fact carries the schema's predicate_namespace so it conforms to that schema", async () => {
    const result = await handleKbSuggestPredicates(
      namespacedSchemaKb("kibi.release"),
      ARGS,
    );
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("apply_requires_predicate");
    expect(data.candidates[0]?.schema.predicate_namespace).toBe("kibi.release");
    expect(data.applyPlan[0]?.properties).toMatchObject({
      fact_kind: "predicate",
      predicate_name: "release_gate",
      predicate_namespace: "kibi.release",
      predicate_args: ["release.pipeline", "publish", "hold"],
    });
  });

  test("a schema in the default namespace plans a fact without a namespace field", async () => {
    const result = await handleKbSuggestPredicates(
      namespacedSchemaKb(null),
      ARGS,
    );
    const data = result.structuredContent;
    expect(data.candidates[0]?.schema.predicate_namespace).toBeUndefined();
    expect(data.applyPlan[0]?.properties).not.toHaveProperty(
      "predicate_namespace",
    );
  });
});
