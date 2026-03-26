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

import * as path from "node:path";
import Table from "cli-table3";
import { PrologProcess } from "../prolog.js";
import {
  parseEntityFromBinding,
  parseEntityFromList,
  parseListOfLists,
  parsePrologValue,
  parsePropertyList,
  splitTopLevel,
} from "../prolog/codec.js";
import relationshipSchema from "../public/schemas/relationship.js";
import { VALID_ENTITY_TYPES } from "../query/service.js";
import { resolveActiveBranch } from "../utils/branch-resolver.js";
import { safeCleanupProlog } from "../utils/prolog-cleanup.js";

const REL_TYPES = relationshipSchema.properties.type.enum;

type QueryRelationship = {
  type: string;
  from: string;
  to: string;
};

type QueryEntity = Record<string, unknown>;

interface QueryOptions {
  id?: string;
  tag?: string;
  source?: string;
  relationships?: string;
  format?: "json" | "table";
  limit?: string;
  offset?: string;
}

// implements REQ-003
export async function queryCommand(
  type: string | undefined,
  options: QueryOptions,
): Promise<{ exitCode: number }> {
  let prolog: PrologProcess | null = null;
  let attached = false;
  try {
    prolog = new PrologProcess({ timeout: 120000 });
    await prolog.start();

    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    let currentBranch: string;
    const branchResult = resolveActiveBranch();

    if ("error" in branchResult) {
      const isNonGitError =
        branchResult.code === "NOT_A_GIT_REPO" ||
        branchResult.code === "GIT_NOT_AVAILABLE";

      if (isNonGitError) {
        // For query command, use "main" as default branch when git is not available
        // or the current directory is not a git repository. This allows querying
        // after init in a non-git directory.
        currentBranch = "main";
      } else {
        console.error(
          `Error: Failed to resolve active branch:\n${branchResult.error}`,
        );
        await prolog.terminate();
        return { exitCode: 1 };
      }
    } else {
      currentBranch = branchResult.branch;
    }

    const kbPath = path.join(process.cwd(), `.kb/branches/${currentBranch}`);
    const attachResult = await prolog.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      console.error(
        `Error: Failed to attach KB: ${attachResult.error || "Unknown error"}`,
      );
      return { exitCode: 1 };
    }
    attached = true;

    let results: Array<QueryRelationship | QueryEntity> = [];

    if (options.relationships) {
      const fromId = String(options.relationships);
      const safeFromId = fromId.replace(/'/g, "''");
      const relTypesList = REL_TYPES.join(", ");

      const goal = `findall([Type,From,To], (member(Type, [${relTypesList}]), kb_relationship(Type, '${safeFromId}', To), From='${safeFromId}'), Results)`;

      const queryResult = await prolog.query(goal);

      if (queryResult.success && queryResult.bindings.Results) {
        const rows = parseListOfLists(queryResult.bindings.Results);
        const parsed = rows
          .filter((r) => r.length >= 3)
          .map((r) => ({
            type: parsePrologValue(r[0]),
            from: parsePrologValue(r[1]),
            to: parsePrologValue(r[2]),
          }));
        results = parsed.filter(
          (rel) =>
            rel &&
            typeof rel.type === "string" &&
            typeof rel.from === "string" &&
            typeof rel.to === "string" &&
            rel.from === fromId &&
            REL_TYPES.includes(rel.type),
        );
      }
    } else if (type || options.source) {
      if (type && !VALID_ENTITY_TYPES.includes(type)) {
        console.error(
          `Error: Invalid type '${type}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}`,
        );
        return { exitCode: 1 };
      }

      let goal: string;

      if (options.source) {
        const safeSource = String(options.source).replace(/'/g, "\\'");
        if (type) {
          goal = `findall([Id,'${type}',Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, '${type}', Props)), Results)`;
        } else {
          goal = `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
        }
      } else if (options.id) {
        const safeId = String(options.id).replace(/'/g, "''");
        goal = `kb_entity('${safeId}', '${type}', Props), Id = '${safeId}', Type = '${type}', Result = [Id, Type, Props]`;
      } else if (options.tag) {
        const safeTag = String(options.tag).replace(/'/g, "''");
        goal = `findall([Id,'${type}',Props], (kb_entity(Id, '${type}', Props), memberchk(tags=Tags, Props), member('${safeTag}', Tags)), Results)`;
      } else {
        goal = `findall([Id,'${type}',Props], kb_entity(Id, '${type}', Props), Results)`;
      }

      const queryResult = await prolog.query(goal);

      if (queryResult.success) {
        if (options.id) {
          // Single entity query
          if (queryResult.bindings.Result) {
            const entity = parseEntityFromBinding(queryResult.bindings.Result);
            results = [entity];
          }
        } else {
          // Multiple entities query
          if (queryResult.bindings.Results) {
            const entitiesData = parseListOfLists(queryResult.bindings.Results);

            for (const data of entitiesData) {
              const entity = parseEntityFromList(data);
              results.push(entity);
            }
          }
        }
      }
    } else {
      console.error(
        "Error: Must specify entity type, --source, or --relationships option",
      );
      return { exitCode: 1 };
    }

    const limit = Number.parseInt(options.limit || "100");
    const offset = Number.parseInt(options.offset || "0");
    const paginated = results.slice(offset, offset + limit);

    if (!paginated || paginated.length === 0) {
      if (options.format === "json") {
        console.log("[]");
      } else {
        console.log("No entities found");
      }
      return { exitCode: 0 };
    }

    // Format output
    if (options.format === "table") {
      outputTable(paginated, Boolean(options.relationships));
    } else {
      console.log(JSON.stringify(paginated, null, 2));
    }
    return { exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return { exitCode: 1 };
  } finally {
    await safeCleanupProlog(prolog);
  }
}

/**
 * Output results as a formatted table.
 */
function outputTable(
  items: Array<QueryRelationship | QueryEntity>,
  isRelationships: boolean,
): void {
  if (items.length === 0) {
    console.log("No entities found.");
    return;
  }

  if (isRelationships) {
    const table = new Table({
      head: ["Type", "From", "To"],
      colWidths: [20, 18, 18],
    });

    for (const item of items) {
      const rel = item as QueryRelationship;
      table.push([
        rel.type || "N/A",
        rel.from.substring(0, 16) || "N/A",
        rel.to.substring(0, 16) || "N/A",
      ]);
    }

    console.log(table.toString());
  } else {
    const table = new Table({
      head: ["ID", "Type", "Title", "Status", "Tags"],
      colWidths: [18, 10, 40, 12, 30],
    });

    for (const entity of items) {
      const record = entity as QueryEntity;
      const id = typeof record.id === "string" ? record.id : "N/A";
      const entityType = typeof record.type === "string" ? record.type : "N/A";
      const title = typeof record.title === "string" ? record.title : "N/A";
      const status = typeof record.status === "string" ? record.status : "N/A";
      const tags = Array.isArray(record.tags)
        ? record.tags
            .filter((tag): tag is string => typeof tag === "string")
            .join(", ")
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
}
