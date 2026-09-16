import {
  OPERATION_DATA_SCHEMAS,
  type OperationJsonSchema,
  declaredEffects,
} from "./contracts.js";
import { planBootstrapSpec } from "./specs/bootstrap.js";
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
import { ingestProofSpec } from "./specs/proof.js";
import { coverageSpec, findGapsSpec, graphSpec } from "./specs/reporting.js";
import { semanticAdvisorSpec } from "./specs/semantic.js";
import {
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
} from "./specs/skills.js";
import { sparqlRemoteSpec } from "./specs/sparql.js";
import type {
  OperationName,
  OperationSpec,
  ResolvedOperationSpec,
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
  planBootstrapSpec,
  validateUpsertSpec,
  upsertSpec,
  deleteSpec,
  checkSpec,
  sparqlRemoteSpec,
  compileIntentSpec,
  applyPlanSpec,
  ingestProofSpec,
] as const satisfies readonly OperationSpec[];

function envelopeSchema(
  spec: OperationSpec,
  resultVersion: string,
): OperationJsonSchema {
  const data = OPERATION_DATA_SCHEMAS[spec.name];
  if (!data) throw new Error(`Missing output contract for ${spec.name}`);
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
      resultVersion: { const: resultVersion },
      status: { enum: ["success", "committed_with_repairs", "error"] },
      data,
      effects: {
        type: "array",
        minItems: spec.effects.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "status"],
          properties: {
            kind: { type: "string" },
            status: { enum: ["completed", "failed", "not_applicable"] },
            detail: {},
            errorCode: { type: "string" },
          },
        },
      },
      diagnostics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["message"],
          properties: {
            code: { type: "string" },
            severity: { enum: ["info", "warning", "error"] },
            message: { type: "string" },
            detail: {},
            category: { type: "string" },
            suggestion: { type: "string" },
            file: { type: "string" },
          },
        },
      },
      nextActions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["operation", "reason", "required"],
          properties: {
            operation: { type: "string" },
            input: {},
            reason: { type: "string" },
            required: { type: "boolean" },
          },
        },
      },
      error: {
        type: "object",
        additionalProperties: false,
        required: ["code", "message", "retryable"],
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          retryable: { type: "boolean" },
          details: {},
        },
      },
    },
  };
}

export function withContractDefaults(
  spec: OperationSpec,
): ResolvedOperationSpec {
  const resultVersion = spec.resultVersion ?? `kibi.${spec.name}.v1`;
  // Resolve the generated contract on the canonical spec object itself. The
  // implementation loader and the public catalog must share one identity so
  // adapters cannot accidentally execute an uncontracted compatibility copy.
  const resolved = spec as ResolvedOperationSpec;
  if (resolved.resultVersion === undefined) {
    Object.defineProperty(resolved, "resultVersion", {
      value: resultVersion,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  if (resolved.outputSchema === undefined) {
    Object.defineProperty(resolved, "outputSchema", {
      value: envelopeSchema(spec, resultVersion),
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  if (resolved.declaredEffects === undefined) {
    Object.defineProperty(resolved, "declaredEffects", {
      value: declaredEffects(spec.name, spec.effects),
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return resolved;
}

const SPECS_BY_NAME: ReadonlyMap<OperationName, ResolvedOperationSpec> =
  new Map(
    OPERATION_CATALOG.map((spec) => [spec.name, withContractDefaults(spec)]),
  );

// implements REQ-kibi-operation-interface-parity
export function requireKnownSpec(
  spec: ResolvedOperationSpec | undefined,
  name: OperationName,
): ResolvedOperationSpec {
  if (!spec) {
    throw new RangeError(`Unknown Kibi operation: ${name}`);
  }
  return spec;
}

export function getSpec(name: OperationName): ResolvedOperationSpec {
  return requireKnownSpec(SPECS_BY_NAME.get(name), name);
}

// implements REQ-kibi-operation-interface-parity
export function listSpecs(): readonly ResolvedOperationSpec[] {
  return OPERATION_CATALOG.map(withContractDefaults);
}
