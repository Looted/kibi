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
import type { PrologProcess } from "kibi-cli/prolog";
import {
  parseEntityFromList,
  parseListOfLists,
  parsePrologValue,
  parsePropertyList,
  splitTopLevel,
} from "kibi-cli/prolog/codec";

export interface ContextArgs {
  sourceFile: string;
}

export interface ContextResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    sourceFile: string;
    entities: Array<{
      id: string;
      type: string;
      title: string;
      status: string;
      tags: string[];
    }>;
    relationships: Array<{ relType: string; fromId: string; toId: string }>;
    provenance: {
      predicate: string;
      deterministic: boolean;
    };
  };
}

export async function handleKbContext(
  prolog: PrologProcess,
  args: ContextArgs,
): Promise<ContextResult> {
  const { sourceFile } = args;

  try {
    const safeSource = sourceFile.replace(/'/g, "\\'");

    const entityGoal = `findall([Id,Type,Props], (kb_entities_by_source('${safeSource}', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)`;
    const entityQueryResult = await prolog.query(entityGoal);

    const entities: Array<{
      id: string;
      type: string;
      title: string;
      status: string;
      tags: string[];
    }> = [];
    const entityIds: string[] = [];

    if (entityQueryResult.success && entityQueryResult.bindings.Results) {
      const entitiesData = parseListOfLists(entityQueryResult.bindings.Results);

      for (const data of entitiesData) {
        const entity = parseEntityFromList(data);
        entities.push({
          id: entity.id as string,
          type: entity.type as string,
          title: entity.title as string,
          status: entity.status as string,
          tags: (entity.tags as string[]) || [],
        });
        entityIds.push(entity.id as string);
      }
    }

    const relationships: Array<{
      relType: string;
      fromId: string;
      toId: string;
    }> = [];

    for (const entityId of entityIds) {
      const relGoal = `findall([RelType,FromId,ToId], (kb_relationship(RelType, FromId, ToId), (FromId = '${entityId}' ; ToId = '${entityId}')), RelResults)`;
      const relQueryResult = await prolog.query(relGoal);

      if (relQueryResult.success && relQueryResult.bindings.RelResults) {
        const relData = parseListOfLists(relQueryResult.bindings.RelResults);

        for (const rel of relData) {
          relationships.push({
            relType: rel[0],
            fromId: rel[1],
            toId: rel[2],
          });
        }
      }
    }

    const text =
      entities.length > 0
        ? `Found ${entities.length} KB entities linked to source file "${sourceFile}": ${entities.map((e) => e.id).join(", ")}`
        : `No KB entities found for source file "${sourceFile}"`;

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
      structuredContent: {
        sourceFile,
        entities,
        relationships,
        provenance: {
          predicate: "kb_entities_by_source",
          deterministic: true,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Context query failed: ${message}`);
  }
}
