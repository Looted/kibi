import type {
  OperationName,
  OperationSpec,
} from "./public/operations/types.js";

// Load only the implementation selected by the client. Importing the public
// catalog remains useful for introspection and parity tests, but pulling every
// operation into each short-lived CLI process makes test and shell startup pay
// for unrelated commands.
// implements REQ-test-journaled-engine-harness
export async function loadOperationSpec(
  name: OperationName,
): Promise<OperationSpec> {
  switch (name) {
    case "kb_skills_list":
      return (await import("./public/operations/specs/skills.js"))
        .skillsListSpec;
    case "kb_skills_load":
      return (await import("./public/operations/specs/skills.js"))
        .skillsLoadSpec;
    case "kb_skills_read":
      return (await import("./public/operations/specs/skills.js"))
        .skillsReadSpec;
    case "kb_query":
      return (await import("./public/operations/specs/discovery.js")).querySpec;
    case "kb_search":
      return (await import("./public/operations/specs/discovery.js"))
        .searchSpec;
    case "kb_status":
      return (await import("./public/operations/specs/discovery.js"))
        .statusSpec;
    case "kb_find_gaps":
      return (await import("./public/operations/specs/reporting.js"))
        .findGapsSpec;
    case "kb_coverage":
      return (await import("./public/operations/specs/reporting.js"))
        .coverageSpec;
    case "kb_graph":
      return (await import("./public/operations/specs/reporting.js")).graphSpec;
    case "kb_sparql_remote":
      return (await import("./public/operations/specs/sparql.js"))
        .sparqlRemoteSpec;
    case "kb_semantic_advisor":
      return (await import("./public/operations/specs/semantic.js"))
        .semanticAdvisorSpec;
    case "kb_model_requirement":
      return (await import("./public/operations/specs/modeling.js"))
        .modelRequirementSpec;
    case "kb_suggest_predicates":
      return (await import("./public/operations/specs/modeling.js"))
        .suggestPredicatesSpec;
    case "kb_autopilot_generate":
      return (await import("./public/operations/specs/autopilot.js"))
        .autopilotGenerateSpec;
    case "kb_validate_upsert":
      return (await import("./public/operations/specs/mutation.js"))
        .validateUpsertSpec;
    case "kb_upsert":
      return (await import("./public/operations/specs/upsert.js")).upsertSpec;
    case "kb_delete":
      return (await import("./public/operations/specs/mutation.js")).deleteSpec;
    case "kb_check":
      return (await import("./public/operations/specs/check.js")).checkSpec;
  }
}
