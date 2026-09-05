/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
  PROOF_BINDINGS_SCHEMA,
  PROOF_CONTRACT_SCHEMA,
} from "../proof-protocol.js";
import { PROOF_RECEIPT_SCHEMA } from "../proof-receipt.js";
// Typed fact field enums per proposal
import { SYMBOL_ROLES, type SymbolRole } from "../symbol-granularity.js";

type FactKind =
  | "subject"
  | "property_value"
  | "observation"
  | "meta"
  | "predicate_schema"
  | "predicate"
  | "rule_schema"
  | "rule";
type Operator = "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
type ValueType = "string" | "int" | "number" | "bool";
type Polarity = "require" | "forbid" | "assert" | "deny";
type VerificationScope = "unit" | "integration" | "end_to_end";
type VerificationPerspective = "internal" | "consumer";

const factConditionals = JSON.parse(`[
  {
    "if": {
      "anyOf": [
        { "required": ["claim_key"] },
        { "required": ["claim_text"] }
      ]
    },
    "then": { "required": ["claim_key", "claim_text"] }
  },
  {
    "if": {
      "properties": {
        "type": { "const": "fact" },
        "fact_kind": { "const": "predicate_schema" }
      },
      "required": ["type", "fact_kind"]
    },
    "then": {
      "required": [
        "predicate_name",
        "predicate_arity",
        "argument_names",
        "argument_types"
      ]
    }
  },
  {
    "if": {
      "properties": {
        "type": { "const": "fact" },
        "fact_kind": { "const": "predicate" }
      },
      "required": ["type", "fact_kind"]
    },
    "then": {
      "required": ["predicate_name", "predicate_args", "canonical_key"],
      "properties": {
        "polarity": { "enum": ["assert", "deny"] }
      }
    }
  },
  {
    "if": {
      "properties": {
        "type": { "const": "fact" },
        "fact_kind": { "const": "rule_schema" }
      },
      "required": ["type", "fact_kind"]
    },
    "then": {
      "required": ["rule_name", "argument_names", "argument_types"]
    }
  },
  {
    "if": {
      "properties": {
        "type": { "const": "fact" },
        "fact_kind": { "const": "rule" }
      },
      "required": ["type", "fact_kind"]
    },
    "then": {
      "required": ["rule_ir", "rule_hash", "rule_schema_id", "rule_name", "semantic_key"]
    }
  },
  {
    "if": {
      "properties": {
        "type": { "const": "fact" },
        "fact_kind": { "const": "property_value" }
      },
      "required": ["type", "fact_kind"]
    },
    "then": {
      "properties": {
        "polarity": { "enum": ["require", "forbid"] }
      }
    }
  }
]`) as Array<Record<string, unknown>>;

// The persisted rule payload is still data, but its shape is constrained at
// the JSON boundary as well as by validateLogicIr.  Keeping this vocabulary
// closed prevents a raw_goal/raw Prolog field from entering an upsert payload.
const logicTermSchema = {
  oneOf: [
    {
      type: "object",
      required: ["kind", "name", "type"],
      properties: {
        kind: { const: "var" },
        name: { type: "string", pattern: "^[A-Z][A-Za-z0-9_]*$" },
        type: { type: "string", pattern: "^[a-z][a-z0-9_:.\\/-]*$" },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["kind", "value"],
      properties: {
        kind: { const: "const" },
        value: { type: "string", minLength: 1 },
        type: { type: "string", pattern: "^[a-z][a-z0-9_:.\\/-]*$" },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["kind", "value"],
      properties: {
        kind: { const: "number" },
        value: { type: "number" },
        unit: { type: "string", pattern: "^[a-z][a-z0-9_:.\\/-]*$" },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["kind", "value", "unit"],
      properties: {
        kind: { const: "duration" },
        value: { type: "number", minimum: 0 },
        unit: { type: "string", enum: ["ms", "s", "m", "h", "d", "w"] },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["kind", "value"],
      properties: {
        kind: { const: "timestamp" },
        value: { type: "string" },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["kind", "start", "end"],
      properties: {
        kind: { const: "interval" },
        start: { type: "string" },
        end: { type: "string" },
      },
      additionalProperties: false,
    },
  ],
};

const logicAtomSchema = {
  type: "object",
  required: ["kind", "name", "args"],
  properties: {
    kind: { const: "atom" },
    namespace: { type: "string", pattern: "^[a-z][a-z0-9_:.\\/-]*$" },
    name: { type: "string", pattern: "^[a-z][a-z0-9_:.\\/-]*$" },
    args: {
      type: "array",
      maxItems: 8,
      items: { $ref: "#/$defs/logicTerm" },
    },
    polarity: { enum: ["positive", "negative"] },
    closedWorld: { type: "boolean" },
  },
  additionalProperties: false,
};

const logicExpressionSchema = {
  oneOf: [
    { $ref: "#/$defs/logicAtom" },
    {
      type: "object",
      required: ["kind", "items"],
      properties: {
        kind: { enum: ["all", "any"] },
        items: {
          type: "array",
          minItems: 1,
          maxItems: 32,
          items: { $ref: "#/$defs/logicExpression" },
        },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["kind", "item"],
      properties: {
        kind: { const: "not" },
        item: { $ref: "#/$defs/logicAtom" },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["kind", "operator", "left", "right"],
      properties: {
        kind: { const: "compare" },
        operator: { enum: ["eq", "neq", "lt", "lte", "gt", "gte"] },
        left: { $ref: "#/$defs/logicTerm" },
        right: { $ref: "#/$defs/logicTerm" },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["kind", "atom", "operator", "value"],
      properties: {
        kind: { const: "count" },
        atom: { $ref: "#/$defs/logicAtom" },
        operator: { enum: ["eq", "neq", "lt", "lte", "gt", "gte"] },
        value: { type: "integer", minimum: 0 },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["kind", "relation", "left", "right"],
      properties: {
        kind: { const: "temporal" },
        relation: {
          enum: ["before", "after", "during", "overlaps", "starts", "finishes"],
        },
        left: { $ref: "#/$defs/logicTerm" },
        right: { $ref: "#/$defs/logicTerm" },
      },
      additionalProperties: false,
    },
  ],
};

const logicRuleSchema = {
  type: "object",
  required: ["version", "kind", "modality"],
  properties: {
    version: { const: "kibi.logic.v1" },
    kind: { enum: ["atom", "rule", "constraint"] },
    modality: { enum: ["assert", "deny", "oblige", "permit", "forbid"] },
    head: { $ref: "#/$defs/logicAtom" },
    body: { $ref: "#/$defs/logicExpression" },
    variables: {
      type: "array",
      maxItems: 32,
      items: {
        type: "object",
        required: ["name", "type"],
        properties: {
          name: { type: "string", pattern: "^[A-Z][A-Za-z0-9_]*$" },
          type: { type: "string", pattern: "^[a-z][a-z0-9_:.\\/-]*$" },
          quantifier: { enum: ["forall", "exists"] },
        },
        additionalProperties: false,
      },
    },
    exceptions: {
      type: "array",
      maxItems: 16,
      items: { $ref: "#/$defs/logicExpression" },
    },
    scope: {
      type: "object",
      properties: {
        authority: { type: "string" },
        name: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
    validFrom: { type: "string" },
    validTo: { type: "string" },
    ruleSchemaId: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

const entitySchema: Record<string, unknown> = {
  $id: "entity.schema.json",
  title: "Entity",
  type: "object",
  $defs: {
    logicTerm: logicTermSchema,
    logicAtom: logicAtomSchema,
    logicExpression: logicExpressionSchema,
    logicRule: logicRuleSchema,
  },
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    status: {
      type: "string",
      enum: [
        "active",
        "inactive",
        "draft",
        "archived",
        "deleted",
        "approved",
        "rejected",
        "pending",
        "in_progress",
        "superseded",
        "open",
        "closed",
        "deprecated",
        "passing",
        "failing",
        "skipped",
        "proposed",
        "accepted",
        "removed",
      ],
    },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    source: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    owner: { type: "string" },
    priority: { type: "string" },
    severity: { type: "string" },
    links: { type: "array", items: { type: "string" } },
    text_ref: { type: "string" },
    semantic_text: {
      type: "string",
      description:
        "Requirement-only authored prose whose exact UTF-8 bytes anchor the semantic inventory without replacing text_ref evidence.",
    },
    logic_claims: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", pattern: "^CLAIM-[A-F0-9]{16}$" },
    },
    semantic_clauses: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
    semantic_inventory_version: {
      type: "string",
      const: "kibi.semantic-inventory.v1",
    },
    semantic_source_field: {
      type: "string",
      enum: ["semantic_text", "text_ref", "title"],
    },
    semantic_source_hash: {
      type: "string",
      pattern: "^[a-f0-9]{64}$",
    },
    semantic_inventory: {
      type: "array",
      items: {
        type: "object",
        required: ["claim_key", "claim_text", "role", "status", "span"],
        properties: {
          claim_key: { type: "string", pattern: "^CLAIM-[A-F0-9]{16}$" },
          claim_text: { type: "string", minLength: 1 },
          role: {
            type: "string",
            enum: [
              "normative",
              "definition",
              "descriptive",
              "condition",
              "exception",
              "rationale",
              "example",
              "subjective",
            ],
          },
          status: {
            type: "string",
            enum: [
              "modeled",
              "ambiguous",
              "ontology_gap",
              "nonlogical",
              "missing",
            ],
          },
          span: {
            type: "object",
            required: ["start", "end"],
            properties: {
              start: { type: "integer", minimum: 0 },
              end: { type: "integer", minimum: 0 },
            },
            additionalProperties: false,
          },
          semantic_key: { type: "string" },
          payload_hash: { type: "string" },
          reason: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    sourceFile: { type: "string" },
    granularity_reason: {
      type: "string",
      enum: [
        "config-artifact",
        "module-level-behavior",
        "extractor-miss",
        "legacy-link",
        "test-suite",
      ],
    },
    symbol_role: {
      type: "string",
      enum: [...SYMBOL_ROLES] satisfies SymbolRole[],
    },
    verification_scope: {
      type: "string",
      enum: ["unit", "integration", "end_to_end"] satisfies VerificationScope[],
    },
    verification_perspective: {
      type: "string",
      enum: ["internal", "consumer"] satisfies VerificationPerspective[],
    },
    proof_contract: PROOF_CONTRACT_SCHEMA,
    proof_bindings: PROOF_BINDINGS_SCHEMA,
    proof_receipts: {
      type: "array",
      items: PROOF_RECEIPT_SCHEMA,
    },
    type: {
      type: "string",
      enum: [
        "req",
        "scenario",
        "test",
        "adr",
        "flag",
        "event",
        "symbol",
        "fact",
      ],
    },
    // Typed fact fields - only valid when type === "fact"
    fact_kind: {
      type: "string",
      enum: [
        "subject",
        "property_value",
        "observation",
        "meta",
        "predicate_schema",
        "predicate",
        "rule_schema",
        "rule",
      ] satisfies FactKind[],
    },
    subject_key: { type: "string" },
    property_key: { type: "string" },
    operator: { type: "string", enum: ["eq", "neq", "lt", "lte", "gt", "gte"] },
    value_type: { type: "string", enum: ["string", "int", "number", "bool"] },
    value_string: { type: "string" },
    value_int: { type: "integer" },
    value_number: { type: "number" },
    value_bool: { type: "boolean" },
    unit: { type: "string" },
    scope: { type: "string" },
    polarity: {
      type: "string",
      enum: ["require", "forbid", "assert", "deny"] satisfies Polarity[],
    },
    closed_world: { type: "boolean" },
    valid_from: { type: "string" },
    valid_to: { type: "string" },
    canonical_key: { type: "string" },
    claim_key: { type: "string", pattern: "^CLAIM-[A-F0-9]{16}$" },
    claim_text: { type: "string" },
    predicate_name: { type: "string" },
    predicate_namespace: { type: "string" },
    predicate_arity: { type: "integer", minimum: 1 },
    argument_names: { type: "array", items: { type: "string" } },
    argument_types: { type: "array", items: { type: "string" } },
    argument_descriptions: { type: "array", items: { type: "string" } },
    aliases: { type: "array", items: { type: "string" } },
    examples: { type: "array", items: { type: "string" } },
    predicate_args: { type: "array", items: { type: "string" } },
    rule_ir: { $ref: "#/$defs/logicRule" },
    rule_hash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    rule_schema_id: { type: "string", minLength: 1 },
    rule_name: { type: "string", minLength: 1 },
    semantic_key: { type: "string", pattern: "^SEM-[A-F0-9]{24}$" },
    claim_span_start: { type: "integer", minimum: 0 },
    claim_span_end: { type: "integer", minimum: 0 },
  },
  required: [
    "id",
    "title",
    "status",
    "created_at",
    "updated_at",
    "source",
    "type",
  ],
  allOf: [
    {
      if: {
        properties: { type: { const: "req" } },
      },
      else: {
        not: { required: ["logic_claims"] },
      },
    },
    // Forbid fact-only fields on non-fact entities
    {
      if: {
        properties: { type: { const: "fact" } },
      },
      // Fact entities can have fact fields (no restriction)
      // Non-fact entities cannot have fact fields
      else: {
        not: {
          anyOf: [
            { required: ["fact_kind"] },
            { required: ["subject_key"] },
            { required: ["property_key"] },
            { required: ["operator"] },
            { required: ["value_type"] },
            { required: ["value_string"] },
            { required: ["value_int"] },
            { required: ["value_number"] },
            { required: ["value_bool"] },
            { required: ["unit"] },
            { required: ["scope"] },
            { required: ["polarity"] },
            { required: ["closed_world"] },
            { required: ["valid_from"] },
            { required: ["valid_to"] },
            { required: ["canonical_key"] },
            { required: ["claim_key"] },
            { required: ["claim_text"] },
            { required: ["predicate_name"] },
            { required: ["predicate_namespace"] },
            { required: ["predicate_arity"] },
            { required: ["argument_names"] },
            { required: ["argument_types"] },
            { required: ["argument_descriptions"] },
            { required: ["aliases"] },
            { required: ["examples"] },
            { required: ["predicate_args"] },
            { required: ["rule_ir"] },
            { required: ["rule_hash"] },
            { required: ["rule_schema_id"] },
            { required: ["rule_name"] },
            { required: ["semantic_key"] },
            { required: ["claim_span_start"] },
            { required: ["claim_span_end"] },
          ],
        },
      },
    },
    {
      if: {
        properties: { type: { const: "test" } },
      },
      else: {
        not: {
          anyOf: [
            { required: ["verification_scope"] },
            { required: ["verification_perspective"] },
            { required: ["proof_contract"] },
            { required: ["proof_bindings"] },
            { required: ["proof_receipts"] },
          ],
        },
      },
    },
    {
      if: { required: ["proof_receipts"] },
      // biome-ignore lint/suspicious/noThenProperty: JSON Schema conditional keyword.
      then: { required: ["verification_scope"] },
    },
    {
      if: {
        properties: { type: { const: "req" } },
      },
      else: {
        not: {
          anyOf: [
            { required: ["semantic_inventory"] },
            { required: ["semantic_clauses"] },
            { required: ["semantic_text"] },
            { required: ["semantic_inventory_version"] },
            { required: ["semantic_source_field"] },
            { required: ["semantic_source_hash"] },
          ],
        },
      },
    },
    ...factConditionals,
  ],
  additionalProperties: false,
};

export default entitySchema;
