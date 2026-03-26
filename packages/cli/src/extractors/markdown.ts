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

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import matter from "gray-matter";
import entitySchema from "../schemas/entity.schema.json" with { type: "json" };

// Typed fact field constants for extraction
const FACT_STRING_FIELDS = [
  "fact_kind",
  "subject_key",
  "property_key",
  "operator",
  "value_type",
  "value_string",
  "unit",
  "scope",
  "polarity",
  "valid_from",
  "valid_to",
  "canonical_key",
] as const;

const FACT_NUMBER_FIELDS = ["value_int", "value_number"] as const;
const FACT_BOOLEAN_FIELDS = ["value_bool", "closed_world"] as const;
const FACT_ONLY_FIELDS = [
  ...FACT_STRING_FIELDS,
  ...FACT_NUMBER_FIELDS,
  ...FACT_BOOLEAN_FIELDS,
] as const;

const ajv = new Ajv({ strict: false, allErrors: true });
const validateExtractedEntity = ajv.compile(entitySchema);

export interface ExtractedEntity {
  id: string;
  type: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  source: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  text_ref?: string;
  // Typed fact fields - only present when type === 'fact'
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

export interface ExtractedRelationship {
  type: string;
  from: string;
  to: string;
}

export interface ExtractionResult {
  entity: ExtractedEntity;
  relationships: ExtractedRelationship[];
}

const DEFAULT_STATUS_BY_TYPE: Record<string, string> = {
  req: "open",
  scenario: "draft",
  test: "pending",
  adr: "proposed",
  flag: "active",
  event: "active",
  symbol: "active",
  fact: "active",
};

export class FrontmatterError extends Error {
  public classification: string;
  public hint: string;
  public originalError?: string;

  constructor(
    message: string,
    public filePath: string,
    options?: {
      classification?: string;
      hint?: string;
      originalError?: string;
    },
  ) {
    super(message);
    this.name = "FrontmatterError";
    this.classification = options?.classification || "Generic Error";
    this.hint = options?.hint || "Check the file for syntax errors.";
    this.originalError = options?.originalError;
  }

  override toString() {
    let msg = `${this.filePath}: [${this.classification}] ${this.message}`;
    if (this.hint) {
      msg += `\nHow to fix:\n- ${this.hint}`;
    }
    if (this.originalError) {
      msg += `\n\nOriginal error: ${this.originalError}`;
    }
    return msg;
  }
}

export function detectEmbeddedEntities(
  data: Record<string, unknown>,
  entityType: string,
): string[] {
  if (entityType !== "req") {
    return [];
  }

  const detected: string[] = [];

  const scenarioFields = ["scenarios", "given", "when", "then", "steps"];
  for (const field of scenarioFields) {
    if (field in data) {
      const value = data[field];
      if (
        value !== null &&
        value !== undefined &&
        (Array.isArray(value) ||
          typeof value === "object" ||
          typeof value === "string")
      ) {
        if (!detected.includes("scenario")) {
          detected.push("scenario");
        }
        break;
      }
    }
  }

  const testFields = ["tests", "testCases", "assertions", "testSteps"];
  for (const field of testFields) {
    if (field in data) {
      const value = data[field];
      if (
        value !== null &&
        value !== undefined &&
        (Array.isArray(value) ||
          typeof value === "object" ||
          typeof value === "string")
      ) {
        if (!detected.includes("test")) {
          detected.push("test");
        }
        break;
      }
    }
  }

  return detected;
}

// implements REQ-007, REQ-004
export function extractFromMarkdown(filePath: string): ExtractionResult {
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new FrontmatterError(
      `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
      { classification: "File Read Error" },
    );
  }

  try {
    const { data } = matter(content);

    if (content.trim().startsWith("---")) {
      const parts = content.split("---");
      if (parts.length < 3) {
        throw new FrontmatterError("Missing closing --- delimiter", filePath, {
          classification: "Missing closing ---",
          hint: "Ensure the frontmatter is enclosed between two '---' delimiters.",
        });
      }
    }

    const type = data.type || inferTypeFromPath(filePath);

    if (!type) {
      throw new FrontmatterError(
        "Could not determine entity type from path or frontmatter",
        filePath,
        {
          classification: "Missing Type",
          hint: "Add 'type: <type>' to frontmatter or place file in a typed directory (e.g., /requirements/).",
        },
      );
    }

    if (!data.title) {
      throw new FrontmatterError("Missing required field: title", filePath, {
        classification: "Missing Field",
        hint: "Add a 'title: ...' field to the YAML frontmatter.",
      });
    }

    const embeddedEntities = detectEmbeddedEntities(data, type);
    if (embeddedEntities.length > 0) {
      const entityTypes = embeddedEntities.join(" and ");
      throw new FrontmatterError(
        `Invalid embedded entity: requirement contains ${entityTypes} fields`,
        filePath,
        {
          classification: "Embedded Entity Violation",
          hint: `Move ${entityTypes} to separate entity files and link them via relationship shards in .kb/relationships/.`,
        },
      );
    }

    const id = data.id || generateId(filePath, data.title);

    const relationships: ExtractedRelationship[] = [];

    if (Array.isArray(data.links)) {
      for (const link of data.links) {
        if (typeof link === "string") {
          relationships.push({
            type: "relates_to",
            from: id,
            to: link,
          });
          continue;
        }

        if (
          link &&
          typeof link === "object" &&
          typeof link.type === "string" &&
          typeof link.target === "string"
        ) {
          relationships.push({
            type: link.type,
            from: id,
            to: link.target,
          });
        }
      }
    }

    // Build base entity with explicit field list
    const entity: ExtractedEntity = {
      id,
      type,
      title: data.title,
      status: data.status || DEFAULT_STATUS_BY_TYPE[String(type)] || "active",
      created_at:
        normalizeDateLike(data.created_at) || new Date().toISOString(),
      updated_at:
        normalizeDateLike(data.updated_at) || new Date().toISOString(),
      source: filePath,
    };

    // Add optional base fields only if present
    if (data.tags !== undefined) entity.tags = data.tags;
    if (data.owner !== undefined) entity.owner = data.owner;
    if (data.priority !== undefined) entity.priority = data.priority;
    if (data.severity !== undefined) entity.severity = data.severity;
    if (data.text_ref !== undefined) entity.text_ref = data.text_ref;

    if (type !== "fact") {
      const invalidFactField = FACT_ONLY_FIELDS.find(
        (field) => data[field] !== undefined,
      );
      if (invalidFactField) {
        throw new FrontmatterError(
          `Fact-only fields are only allowed on type: fact (found ${invalidFactField})`,
          filePath,
          {
            classification: "Fact Field on Non-Fact Entity",
            hint: "Remove fact-only fields or change the entity type to fact.",
          },
        );
      }
    }

    // Add typed fact fields only for fact entities
    if (type === "fact") {
      // String fields
      for (const field of FACT_STRING_FIELDS) {
        if (data[field] !== undefined) {
          // Normalize date fields
          if (field === "valid_from" || field === "valid_to") {
            (entity as unknown as Record<string, unknown>)[field] =
              normalizeDateLike(data[field]);
          } else {
            (entity as unknown as Record<string, unknown>)[field] = data[field];
          }
        }
      }

      // Number fields
      for (const field of FACT_NUMBER_FIELDS) {
        if (data[field] !== undefined) {
          (entity as unknown as Record<string, unknown>)[field] = data[field];
        }
      }

      // Boolean fields
      for (const field of FACT_BOOLEAN_FIELDS) {
        if (data[field] !== undefined) {
          (entity as unknown as Record<string, unknown>)[field] = data[field];
        }
      }
    }

    if (!validateExtractedEntity(entity)) {
      const messages = (validateExtractedEntity.errors || [])
        .map((e) => `${e.instancePath || "root"}: ${e.message}`)
        .join("; ");
      throw new FrontmatterError(
        `Entity validation failed: ${messages}`,
        filePath,
        {
          classification: "Entity Validation Error",
          hint: "Fix the entity fields so they match the public schema.",
        },
      );
    }

    return {
      entity,
      relationships,
    };
  } catch (error) {
    if (error instanceof FrontmatterError) {
      throw error;
    }

    if (error instanceof Error) {
      const message = error.message;
      let classification = "Frontmatter YAML syntax error";
      let hint = "Check the YAML syntax in your frontmatter.";

      if (
        message.includes("incomplete explicit mapping pair") &&
        message.includes(":")
      ) {
        classification = "Unquoted colon likely in title";
        hint =
          'Wrap values containing colons in quotes (e.g., title: "Foo: Bar").';
      } else if (
        !content.trim().startsWith("---") ||
        content.split("---").length < 3
      ) {
        if (
          content.trim().startsWith("---") &&
          content.split("---").length < 3
        ) {
          classification = "Missing closing ---";
          hint =
            "Ensure the frontmatter is enclosed between two '---' delimiters.";
        }
      } else if (
        message.includes("unexpected end of the stream") ||
        message.includes("flow collection") ||
        message.includes("end of the stream")
      ) {
        classification = "Generic YAML mapping error";
        hint = "Check for unclosed brackets, braces, or quotes in your YAML.";
      }

      throw new FrontmatterError(
        `Failed to parse frontmatter: ${message}`,
        filePath,
        {
          classification,
          hint,
          originalError: message,
        },
      );
    }

    throw error;
  }
}

export function inferTypeFromPath(filePath: string): string | null {
  if (filePath.includes("/requirements/")) return "req";
  if (filePath.includes("/scenarios/")) return "scenario";
  if (filePath.includes("/tests/")) return "test";
  if (filePath.includes("/adr/")) return "adr";
  if (filePath.includes("/flags/")) return "flag";
  if (filePath.includes("/events/")) return "event";
  if (filePath.includes("/facts/")) return "fact";
  return null;
}

function generateId(filePath: string, title: string): string {
  const hash = createHash("sha256");
  hash.update(`${filePath}:${title}`);
  return hash.digest("hex").substring(0, 16);
}

// implements REQ-007
export function normalizeDateLike(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}
