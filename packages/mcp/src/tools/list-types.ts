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
export interface ListEntityTypesResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: { types: string[] };
}

export interface ListRelationshipTypesResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: { types: string[] };
}

/**
 * Handle kb_list_entity_types tool calls
 * Returns the static list of supported KB entity type names (req, scenario, test, adr, flag, event, symbol, fact).
 */
export async function handleKbListEntityTypes(): Promise<ListEntityTypesResult> {
  return {
    content: [
      {
        type: "text",
        text: "Available entity types: req, scenario, test, adr, flag, event, symbol, fact",
      },
    ],
    structuredContent: {
      types: [
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
  };
}

/**
 * Handle kb_list_relationship_types tool calls
 * Returns the static list of supported KB relationship type names (depends_on, specified_by, verified_by, etc.).
 */
export async function handleKbListRelationshipTypes(): Promise<ListRelationshipTypesResult> {
  return {
    content: [
      {
        type: "text",
        text: "Available relationship types: depends_on, specified_by, verified_by, validates, implements, covered_by, constrained_by, constrains, requires_property, guards, publishes, consumes, supersedes, relates_to",
      },
    ],
    structuredContent: {
      types: [
        "depends_on",
        "specified_by",
        "verified_by",
        "validates",
        "implements",
        "covered_by",
        "constrained_by",
        "constrains",
        "requires_property",
        "guards",
        "publishes",
        "consumes",
        "supersedes",
        "relates_to",
      ],
    },
  };
}
