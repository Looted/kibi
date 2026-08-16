import { withContractDefaults } from "./public/operations/catalog.js";
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
  let spec: OperationSpec;
  switch (name) {
    case "kb_skills_list":
      spec = (await import("./public/operations/specs/skills.js"))
        .skillsListSpec;
      break;
    case "kb_skills_load":
      spec = (await import("./public/operations/specs/skills.js"))
        .skillsLoadSpec;
      break;
    case "kb_skills_read":
      spec = (await import("./public/operations/specs/skills.js"))
        .skillsReadSpec;
      break;
    case "kb_query":
      spec = (await import("./public/operations/specs/discovery.js")).querySpec;
      break;
    case "kb_search":
      spec = (await import("./public/operations/specs/discovery.js"))
        .searchSpec;
      break;
    case "kb_status":
      spec = (await import("./public/operations/specs/discovery.js"))
        .statusSpec;
      break;
    case "kb_find_gaps":
      spec = (await import("./public/operations/specs/reporting.js"))
        .findGapsSpec;
      break;
    case "kb_coverage":
      spec = (await import("./public/operations/specs/reporting.js"))
        .coverageSpec;
      break;
    case "kb_graph":
      spec = (await import("./public/operations/specs/reporting.js")).graphSpec;
      break;
    case "kb_sparql_remote":
      spec = (await import("./public/operations/specs/sparql.js"))
        .sparqlRemoteSpec;
      break;
    case "kb_semantic_advisor":
      spec = (await import("./public/operations/specs/semantic.js"))
        .semanticAdvisorSpec;
      break;
    case "kb_model_requirement":
      spec = (await import("./public/operations/specs/modeling.js"))
        .modelRequirementSpec;
      break;
    case "kb_suggest_predicates":
      spec = (await import("./public/operations/specs/modeling.js"))
        .suggestPredicatesSpec;
      break;
    case "kb_autopilot_generate":
      spec = (await import("./public/operations/specs/autopilot.js"))
        .autopilotGenerateSpec;
      break;
    case "kb_validate_upsert":
      spec = (await import("./public/operations/specs/mutation.js"))
        .validateUpsertSpec;
      break;
    case "kb_upsert":
      spec = (await import("./public/operations/specs/upsert.js")).upsertSpec;
      break;
    case "kb_delete":
      spec = (await import("./public/operations/specs/mutation.js")).deleteSpec;
      break;
    case "kb_check":
      spec = (await import("./public/operations/specs/check.js")).checkSpec;
      break;
    case "kb_compile_intent":
      spec = (await import("./public/operations/specs/planning.js"))
        .compileIntentSpec;
      break;
    case "kb_apply_plan":
      spec = (await import("./public/operations/specs/planning.js"))
        .applyPlanSpec;
      break;
    case "kb_ingest_verification":
      spec = (await import("./public/operations/specs/verification.js"))
        .ingestVerificationSpec;
      break;
  }
  return withContractDefaults(spec);
}
