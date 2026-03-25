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
  fact_kind?: "subject" | "property_value" | "observation" | "meta";
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
  polarity?: "require" | "forbid";
  closed_world?: boolean;
  valid_from?: string;
  valid_to?: string;
  canonical_key?: string;
}

export type Requirement = BaseEntity & { type: "req" };
export type Scenario = BaseEntity & { type: "scenario" };
export type TestEntity = BaseEntity & { type: "test" };
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
