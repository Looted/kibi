import { autopilotGenerateSpec } from "./specs/autopilot.js";
import { checkSpec } from "./specs/check.js";
import { querySpec, searchSpec, statusSpec } from "./specs/discovery.js";
import {
  modelRequirementSpec,
  suggestPredicatesSpec,
} from "./specs/modeling.js";
import {
  deleteSpec,
  upsertSpec,
  validateUpsertSpec,
} from "./specs/mutation.js";
import { applyPlanSpec, compileIntentSpec } from "./specs/planning.js";
import { coverageSpec, findGapsSpec, graphSpec } from "./specs/reporting.js";
import { semanticAdvisorSpec } from "./specs/semantic.js";
import {
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
} from "./specs/skills.js";
import { sparqlRemoteSpec } from "./specs/sparql.js";
import { ingestVerificationSpec } from "./specs/verification.js";
import type {
  OperationEffect,
  OperationName,
  OperationSpec,
} from "./types.js";

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
  compileIntentSpec,
  applyPlanSpec,
  ingestVerificationSpec,
] as const satisfies readonly OperationSpec[];

const WRITE_EFFECTS = new Set<OperationEffect>(["kb-write", "workspace-write"]);
const DESTRUCTIVE_OPERATIONS = new Set<OperationName>([
  "kb_upsert",
  "kb_delete",
  "kb_apply_plan",
  "kb_ingest_verification",
]);
const UNSAFE_OPERATIONS = new Set<OperationName>([
  "kb_upsert",
  "kb_delete",
  "kb_apply_plan",
  "kb_ingest_verification",
]);

function envelopeSchema(spec: OperationSpec): Readonly<Record<string, unknown>> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    additionalProperties: false,
    required: [
      "kibiProtocol",
      "operation",
      "resultVersion",
      "status",
      "data",
      "effects",
      "diagnostics",
      "nextActions",
    ],
    properties: {
      kibiProtocol: { const: 1 },
      operation: { const: spec.name },
      resultVersion: { const: spec.resultVersion ?? `kibi.${spec.name}.v1` },
      status: { enum: ["success", "committed_with_repairs", "error"] },
      data: {
        type: "object",
        description: `Typed ${spec.name} result payload; operation-specific fields are preserved for forward compatibility.`,
        additionalProperties: true,
      },
      effects: {
        type: "array",
        items: {
          type: "object",
          required: ["kind", "status"],
          properties: {
            kind: { type: "string" },
            status: { enum: ["completed", "failed", "not_applicable"] },
            detail: {},
            errorCode: { type: "string" },
          },
        },
      },
      diagnostics: { type: "array", items: { type: "object" } },
      nextActions: { type: "array", items: { type: "object" } },
      error: { type: "object" },
    },
  };
}

function effectDeclarations(spec: OperationSpec) {
  return spec.effects.map((kind) => ({
    kind,
    mutability: WRITE_EFFECTS.has(kind) ? ("write" as const) : ("read" as const),
    destructive: DESTRUCTIVE_OPERATIONS.has(spec.name) && WRITE_EFFECTS.has(kind),
    retrySafety: UNSAFE_OPERATIONS.has(spec.name) ? ("unsafe" as const) : ("safe" as const),
    openWorld: kind === "network-read",
  }));
}

export function withContractDefaults(spec: OperationSpec): OperationSpec {
  // Enrich the canonical object in place so every exported OperationSpec —
  // including the lazy CLI loader's spec identity — carries the same machine
  // contract fields. This keeps catalog, CLI, MCP, and runtime introspection
  // on one object rather than maintaining a decorated shadow catalog.
  return Object.assign(spec, {
    resultVersion: spec.resultVersion ?? `kibi.${spec.name}.v1`,
    outputSchema: spec.outputSchema ?? envelopeSchema(spec),
    declaredEffects: spec.declaredEffects ?? effectDeclarations(spec),
  });
}

const SPECS_BY_NAME: ReadonlyMap<OperationName, OperationSpec> = new Map(
  OPERATION_CATALOG.map((spec) => [spec.name, withContractDefaults(spec)]),
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
  return OPERATION_CATALOG.map(withContractDefaults);
}
