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

import type { ProofBinding, ProofContract } from "../public/proof-protocol.js";
import type { ProofReceipt } from "../public/proof-receipt.js";

export interface BaseEntity {
  id: string;
  title: string;
  status: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  source: string; // URI
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  links?: string[];
  text_ref?: string;
}

// Typed fact fields per proposal
export interface FactFields {
  fact_kind?:
    | "subject"
    | "property_value"
    | "observation"
    | "meta"
    | "predicate_schema"
    | "predicate";
  subject_key?: string;
  property_key?: string;
  operator?: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
  value_type?: "string" | "int" | "number" | "bool";
  value_string?: string;
  value_int?: number;
  value_number?: number;
  value_bool?: boolean;
  unit?: string;
  scope?: string;
  polarity?: "require" | "forbid" | "assert" | "deny";
  closed_world?: boolean;
  valid_from?: string;
  valid_to?: string;
  canonical_key?: string;
  claim_key?: string;
  claim_text?: string;
  predicate_name?: string;
  predicate_namespace?: string;
  predicate_arity?: number;
  argument_names?: string[];
  argument_types?: string[];
  argument_descriptions?: string[];
  aliases?: string[];
  examples?: string[];
  predicate_args?: string[];
}

export interface TestVerificationFields {
  verification_scope?: "unit" | "integration" | "end_to_end";
  verification_perspective?: "internal" | "consumer";
  proof_contract?: ProofContract;
  proof_bindings?: readonly ProofBinding[];
  proof_receipts?: readonly ProofReceipt[];
}

export type Requirement = BaseEntity & {
  type: "req";
  semantic_text?: string;
  logic_claims?: string[];
};
export type Scenario = BaseEntity & { type: "scenario" };
export type TestEntity = BaseEntity & TestVerificationFields & { type: "test" };
export type ADR = BaseEntity & { type: "adr" };
export type Flag = BaseEntity & { type: "flag" };
export type Event = BaseEntity & { type: "event" };
export type Symbol = BaseEntity & { type: "symbol" };
export type Fact = BaseEntity & FactFields & { type: "fact" };

export type Entity =
  | Requirement
  | Scenario
  | TestEntity
  | ADR
  | Flag
  | Event
  | Symbol
  | Fact;
