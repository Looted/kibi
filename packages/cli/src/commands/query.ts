import Table from "cli-table3";
import { parseListOfLists, parsePrologValue } from "../prolog/codec.js";
import { VALID_ENTITY_TYPES } from "../public/operations/discovery-entities.js";
import { executeOperation } from "../public/operations/runtime-types.js";
import { querySpec } from "../public/operations/specs/discovery.js";
import relationshipSchema from "../public/schemas/relationship.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";
import { withAttachedBranchProlog } from "./discovery-shared.js";

const REL_TYPES = relationshipSchema.properties.type.enum;

type QueryRelationship = {
  readonly type: string;
  readonly from: string;
  readonly to: string;
};

type QueryEntity = Record<string, unknown>;

interface QueryOptions {
  readonly id?: string;
  readonly tag?: string;
  readonly source?: string;
  readonly relationships?: string;
  readonly format?: "json" | "table";
  readonly limit?: string;
  readonly offset?: string;
}

export async function queryCommand(
  type: string | undefined,
  options: QueryOptions,
): Promise<{ exitCode: number }> {
  // implements REQ-003, REQ-kibi-operation-interface-parity
  if (!type && !options.source && !options.relationships) {
    console.error(
      "Error: Must specify entity type, --source, or --relationships option",
    );
    return { exitCode: 1 };
  }
  if (type && !VALID_ENTITY_TYPES.some((candidate) => candidate === type)) {
    console.error(
      `Error: Invalid type '${type}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}`,
    );
    return { exitCode: 1 };
  }

  try {
    const limit = Number.parseInt(options.limit || "100", 10);
    const offset = Number.parseInt(options.offset || "0", 10);
    if (options.relationships) {
      const relationships = await queryRelationships(options.relationships);
      printRelationships(
        relationships.slice(offset, offset + limit),
        options.format,
      );
      return { exitCode: 0 };
    }

    const result = await executeOperation(
      createCliRuntime(),
      querySpec,
      {
        ...(type !== undefined ? { type } : {}),
        ...(options.id !== undefined ? { id: options.id } : {}),
        ...(options.tag !== undefined ? { tags: [options.tag] } : {}),
        ...(options.source !== undefined ? { sourceFile: options.source } : {}),
        limit,
        offset,
      },
      { workspaceRoot: process.cwd() },
    );
    printEntities(result.structuredContent?.entities ?? [], options.format);
    return { exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return { exitCode: 1 };
  }
}

async function queryRelationships(
  fromId: string,
): Promise<QueryRelationship[]> {
  return withAttachedBranchProlog(async (prolog) => {
    const safeFromId = fromId.replaceAll("'", "''");
    const goal = `findall([Type,From,To], (member(Type, [${REL_TYPES.join(", ")}]), kb_relationship(Type, '${safeFromId}', To), From='${safeFromId}'), Results)`;
    const result = await prolog.query(goal);
    const binding = result.bindings.Results;
    if (!result.success || !binding) return [];
    return parseListOfLists(binding).flatMap((row) => {
      const [typeValue, fromValue, toValue] = row;
      if (!typeValue || !fromValue || !toValue) return [];
      const type = parsePrologValue(typeValue);
      const from = parsePrologValue(fromValue);
      const to = parsePrologValue(toValue);
      if (
        typeof type !== "string" ||
        typeof from !== "string" ||
        typeof to !== "string" ||
        from !== fromId ||
        !REL_TYPES.includes(type)
      ) {
        return [];
      }
      return [{ type, from, to }];
    });
  });
}

function printRelationships(
  items: readonly QueryRelationship[],
  format: "json" | "table" | undefined,
): void {
  if (items.length === 0) {
    console.log(format === "json" ? "[]" : "No entities found");
    return;
  }
  if (format !== "table") {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  const table = new Table({
    head: ["Type", "From", "To"],
    colWidths: [20, 18, 18],
  });
  for (const item of items) {
    table.push([
      item.type || "N/A",
      item.from.substring(0, 16) || "N/A",
      item.to.substring(0, 16) || "N/A",
    ]);
  }
  console.log(table.toString());
}

function printEntities(
  items: readonly QueryEntity[],
  format: "json" | "table" | undefined,
): void {
  if (items.length === 0) {
    console.log(format === "json" ? "[]" : "No entities found");
    return;
  }
  if (format !== "table") {
    console.log(JSON.stringify(items, null, 2));
    return;
  }
  const table = new Table({
    head: ["ID", "Type", "Title", "Status", "Tags"],
    colWidths: [18, 10, 40, 12, 30],
  });
  for (const item of items) {
    const id = typeof item.id === "string" ? item.id : "N/A";
    const entityType = typeof item.type === "string" ? item.type : "N/A";
    const title = typeof item.title === "string" ? item.title : "N/A";
    const status = typeof item.status === "string" ? item.status : "N/A";
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((tag) => typeof tag === "string").join(", ")
      : "";
    table.push([
      id.substring(0, 16),
      entityType,
      title.substring(0, 38),
      status,
      tags.substring(0, 28),
    ]);
  }
  console.log(table.toString());
}
