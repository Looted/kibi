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

// Typed fact field enums per proposal
import { SYMBOL_ROLES, type SymbolRole } from "../symbol-granularity.js";

type FactKind =
  | "subject"
  | "property_value"
  | "observation"
  | "meta"
  | "predicate_schema"
  | "predicate";
type Operator = "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
type ValueType = "string" | "int" | "number" | "bool";
type Polarity = "require" | "forbid" | "assert" | "deny";

const factConditionals = JSON.parse(`[
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

const entitySchema: Record<string, unknown> = {
  $id: "entity.schema.json",
  title: "Entity",
  type: "object",
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
    sourceFile: { type: "string" },
    granularity_reason: {
      type: "string",
      enum: [
        "config-artifact",
        "module-level-behavior",
        "extractor-miss",
        "legacy-link",
      ],
    },
    symbol_role: {
      type: "string",
      enum: [...SYMBOL_ROLES] satisfies SymbolRole[],
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
    predicate_name: { type: "string" },
    predicate_namespace: { type: "string" },
    predicate_arity: { type: "integer", minimum: 1 },
    argument_names: { type: "array", items: { type: "string" } },
    argument_types: { type: "array", items: { type: "string" } },
    argument_descriptions: { type: "array", items: { type: "string" } },
    aliases: { type: "array", items: { type: "string" } },
    examples: { type: "array", items: { type: "string" } },
    predicate_args: { type: "array", items: { type: "string" } },
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
            { required: ["predicate_name"] },
            { required: ["predicate_namespace"] },
            { required: ["predicate_arity"] },
            { required: ["argument_names"] },
            { required: ["argument_types"] },
            { required: ["argument_descriptions"] },
            { required: ["aliases"] },
            { required: ["examples"] },
            { required: ["predicate_args"] },
          ],
        },
      },
    },
    ...factConditionals,
  ],
  additionalProperties: false,
};

export default entitySchema;
