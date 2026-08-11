import {
  type ModelRequirementArgs,
  type ModelRequirementResult,
  executeModelRequirement,
} from "../../../operations/modeling/model-requirement.js";
import {
  type SuggestPredicatesArgs,
  type SuggestPredicatesResult,
  executeSuggestPredicates,
} from "../../../operations/modeling/suggest-predicates.js";
import type { OperationSpec } from "../types.js";

export const modelRequirementSpec = {
  name: "kb_model_requirement",
  cliName: "model-requirement",
  description:
    "Convert a prose requirement plus optional extracted claim fields into a deterministic strict-lane write set. Read-only modeling returns a sequential applyPlan for later kb_upsert calls. High-confidence claims emit req+fact strict output; lower-confidence claims emit an observation review artifact. Includes migration warnings when legacy schemaVersion metadata is detected.",
  businessInputSchema: {
    type: "object",
    required: ["text"],
    properties: {
      text: {
        type: "string",
        description:
          "Required prose requirement text to model. Example: 'Customer data must be retained for 7 years.'",
      },
      source: {
        type: "string",
        description:
          "Optional primary source path or provenance root used for stable IDs and text refs. Example: 'documentation/requirements/customer-retention.md'.",
      },
      sourceFiles: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional related source files. The first value is used as the source fallback when source is omitted.",
      },
      confidence: {
        type: "number",
        default: 0.8,
        minimum: 0,
        maximum: 1,
        description:
          "Confidence score for the extracted claim. >= 0.70 yields strict-lane output; lower confidence yields observation-only review output.",
      },
      subjectKey: {
        type: "string",
        description:
          "Optional extracted semantic claim subjectKey. Example: 'Customer.Data'.",
      },
      propertyKey: {
        type: "string",
        description:
          "Optional extracted semantic claim propertyKey. Example: 'Retention Years'.",
      },
      operator: {
        type: "string",
        enum: ["eq", "gte", "lte", "neq", "bool", "polarity"],
        description:
          "Optional extracted semantic claim operator. Example: 'eq'.",
      },
      value: {
        description:
          "Optional extracted semantic claim value. Accepts string, number, or boolean.",
      },
      provenance: {
        type: "string",
        description:
          "Optional extracted text reference. Falls back to source when omitted. Example: 'documentation/requirements/customer-retention.md#L1'.",
      },
      existingLogicClaims: {
        type: "array",
        items: { type: "string", pattern: "^CLAIM-[A-F0-9]{16}$" },
        uniqueItems: true,
        description:
          "Existing requirement logic_claims values. The returned requirement update merges the new atomic claim key into this manifest instead of replacing prior claims.",
      },
      requirementId: {
        type: "string",
        description:
          "Optional existing requirement ID to receive the requires_rule relationship.",
      },
      claimKey: {
        type: "string",
        description:
          "Optional advisor-issued claim key for the exact proposition represented by logic.",
      },
      claimText: {
        type: "string",
        description:
          "Optional exact proposition text represented by logic; defaults to text.",
      },
      logic: {
        type: "object",
        description:
          "Optional typed kibi.logic.v1 IR. Kibi validates and canonicalizes it into a rule fact; raw Prolog is rejected.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executeModelRequirement,
} as const satisfies OperationSpec<
  ModelRequirementArgs,
  ModelRequirementResult["structuredContent"]
>;

export const suggestPredicatesSpec = {
  name: "kb_suggest_predicates",
  cliName: "suggest-predicates",
  description:
    "Suggest ontology predicate schemas for prose requirements before agents write facts. Read-only guidance returns ranked candidates, an applicable predicate-fact plan only when every ordered argument is bound, a separate requires_predicate relationship plan when a requirement ID is supplied, or an explicit ontology-gap observation when no predicate fits.",
  businessInputSchema: {
    type: "object",
    required: ["text"],
    properties: {
      text: {
        type: "string",
        description:
          "Required prose requirement or claim to classify into ontology predicates. Example: 'When users navigate away, draft edits must auto-save.'.",
      },
      requirementId: {
        type: "string",
        description:
          "Optional existing requirement ID. When provided, the response includes a relationshipPlan describing the req -> fact requires_predicate link to attach after preserving existing requirement metadata.",
      },
      source: {
        type: "string",
        description:
          "Optional provenance or text reference for generated predicate facts or ontology-gap observations.",
      },
      subjectHint: {
        type: "string",
        description:
          "Optional canonical subject key to use as the first predicate argument. Example: 'editor.annotation'.",
      },
      maxCandidates: {
        type: "integer",
        default: 5,
        minimum: 1,
        maximum: 20,
        description:
          "Maximum ranked predicate candidates to return. Default: 5.",
      },
      minScore: {
        type: "number",
        default: 0.35,
        minimum: 0,
        maximum: 1,
        description:
          "Minimum candidate score. Higher values make ontology-gap fallback more likely. Default: 0.35.",
      },
      includeExistingSchemas: {
        type: "boolean",
        default: true,
        description:
          "Whether to include existing KB fact_kind=predicate_schema facts alongside Kibi's built-in predicate catalog. Default: true.",
      },
      schemaId: {
        type: "string",
        minLength: 1,
        description:
          "Optional exact reviewed predicate schema ID. When supplied, Kibi selects that schema instead of lexical rank order and fails closed if it is unavailable.",
      },
      argumentBindings: {
        type: "object",
        additionalProperties: { type: "string", minLength: 1 },
        description:
          "Optional exact predicate argument values keyed by a candidate schema's argument_names. Required before applying a candidate whose binding_status is incomplete; Kibi never substitutes guessed values for unbound arguments.",
      },
      polarityHint: {
        type: "string",
        enum: ["assert", "deny"],
        description:
          "Optional reviewed polarity override for claims whose surface negation does not express predicate denial. Use only after reviewing the selected schema and full claim scope.",
      },
      existingLogicClaims: {
        type: "array",
        items: { type: "string", pattern: "^CLAIM-[A-F0-9]{16}$" },
        uniqueItems: true,
        description:
          "Existing requirement logic_claims values. Returned relationship guidance includes a merged manifest so repeated clause modeling does not discard earlier claims.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executeSuggestPredicates,
} as const satisfies OperationSpec<
  SuggestPredicatesArgs,
  SuggestPredicatesResult["structuredContent"]
>;
