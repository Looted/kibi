// implements REQ-mcp-suggest-predicates
import { describe, expect, test } from "bun:test";
import { evaluateSemanticApplicability } from "../../src/operations/modeling/predicate-applicability.js";
import { rankSchema } from "../../src/operations/modeling/predicate-ranker.js";
import type { PredicateSchemaCandidate } from "../../src/operations/modeling/predicate-types.js";
import { handleKbSuggestPredicates } from "../../src/operations/modeling/suggest-predicates.js";
import type {
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

/** A project-local schema with no keywords, aliases or examples. */
const SCHEMA: PredicateSchemaCandidate = {
  id: "FACT-SCHEMA-DEPLOY-PROVENANCE",
  predicate_name: "deploy_provenance",
  title: "Deploy provenance",
  description: "Project-local deploy provenance schema.",
  argument_names: ["image_digest", "signing_key", "commit_ref"],
  argument_types: ["hash", "key", "revision"],
  keywords: [],
  examples: [],
  tags: [],
};

const NAMED_CLAIM =
  "A deploy is trusted only when its provenance binds the image digest, the signing key, and the commit ref.";
const UNNAMED_CLAIM =
  "A deploy is trusted only when its provenance binds the image digest.";

describe("semantic applicability of an explicitly selected schema", () => {
  test("lexical ranking alone rejects a keyword-less project schema", () => {
    const result = evaluateSemanticApplicability(
      rankSchema(SCHEMA, NAMED_CLAIM),
      NAMED_CLAIM,
    );
    expect(result.eligible).toBe(false);
  });

  test("passes when the claim names the predicate and every argument", () => {
    const result = evaluateSemanticApplicability(
      rankSchema(SCHEMA, NAMED_CLAIM),
      NAMED_CLAIM,
      { explicitSchema: true },
    );
    expect(result).toMatchObject({ eligible: true, reasons: [] });
    expect(result.applicabilityScore).toBeGreaterThanOrEqual(0.62);
  });

  test("names the schema terms the claim leaves out when it still refuses", () => {
    const result = evaluateSemanticApplicability(
      rankSchema(SCHEMA, UNNAMED_CLAIM),
      UNNAMED_CLAIM,
      { explicitSchema: true },
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain(
      "the claim does not name signing_key, commit_ref from the selected schema deploy_provenance",
    );
  });

  test("still requires normative intent", () => {
    const text =
      "The deploy provenance lists the image digest, the signing key, and the commit ref.";
    const result = evaluateSemanticApplicability(
      rankSchema(SCHEMA, text),
      text,
      { explicitSchema: true },
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain(
      "prose does not express normative or validity intent",
    );
  });
});

function projectSchemaKb(): PrologPort {
  return {
    query: async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("kb:predicate_schema") || goal.includes("Results"))
        return {
          success: true,
          bindings: {
            Results: `[['FACT-SCHEMA-DEPLOY-PROVENANCE',fact,[fact_kind=predicate_schema,predicate_name=deploy_provenance,title="Deploy provenance",description="Project-local deploy provenance schema.",argument_names=[image_digest,signing_key,commit_ref],argument_types=[hash,key,revision],tags=[]]]]`,
          },
        };
      return { success: false, bindings: {} };
    },
  } as unknown as PrologPort;
}

describe("kb_model predicates with an explicit project-local schemaId", () => {
  test("selects the schema the claim names instead of rejecting it", async () => {
    const result = await handleKbSuggestPredicates(projectSchemaKb(), {
      text: NAMED_CLAIM,
      schemaId: "FACT-SCHEMA-DEPLOY-PROVENANCE",
      maxCandidates: 1,
    });
    const candidate = result.structuredContent.candidates[0];
    expect(candidate?.predicate_name).toBe("deploy_provenance");
    expect(candidate?.eligibility).toBe("eligible");
  });
});
