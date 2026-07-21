import { autopilotGenerateSpec } from "./specs/autopilot.js";
import { checkSpec } from "./specs/check.js";
import { querySpec, searchSpec, statusSpec } from "./specs/discovery.js";
import { modelRequirementSpec, suggestPredicatesSpec } from "./specs/modeling.js";
import { deleteSpec, upsertSpec, validateUpsertSpec } from "./specs/mutation.js";
import { coverageSpec, findGapsSpec, graphSpec } from "./specs/reporting.js";
import { semanticAdvisorSpec } from "./specs/semantic.js";
import { skillsListSpec, skillsLoadSpec, skillsReadSpec } from "./specs/skills.js";
import { sparqlRemoteSpec } from "./specs/sparql.js";
import type { OperationName, OperationSpec } from "./types.js";

export const OPERATION_CATALOG = [
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
  querySpec,
  searchSpec,
  statusSpec,
  findGapsSpec,
  coverageSpec,
  graphSpec,
  semanticAdvisorSpec,
  modelRequirementSpec,
  suggestPredicatesSpec,
  autopilotGenerateSpec,
  validateUpsertSpec,
  upsertSpec,
  deleteSpec,
  checkSpec,
  sparqlRemoteSpec,
] as const satisfies readonly OperationSpec[];

const SPECS_BY_NAME: ReadonlyMap<OperationName, OperationSpec> = new Map(
  OPERATION_CATALOG.map((spec) => [spec.name, spec]),
);

// implements REQ-kibi-operation-interface-parity
export function getSpec(name: OperationName): OperationSpec {
  const spec = SPECS_BY_NAME.get(name);
  if (!spec) {
    throw new RangeError(`Unknown Kibi operation: ${name}`);
  }
  return spec;
}

// implements REQ-kibi-operation-interface-parity
export function listSpecs(): readonly OperationSpec[] {
  return OPERATION_CATALOG;
}
