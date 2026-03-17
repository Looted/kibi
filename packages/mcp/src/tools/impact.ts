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
import { escapeAtom } from "kibi-cli/prolog/codec";
import { parseAtomList } from "./prolog-list.js";

export interface ImpactArgs {
  entity: string;
}

export interface ImpactResult {
  content: Array<{ type: string; text: string }>;
  structuredContent: {
    entity: string;
    impacted: Array<{ id: string; type: string }>;
    count: number;
    provenance: {
      predicate: "impacted_by_change";
      deterministic: true;
    };
  };
}

export async function handleKbImpact(
  prolog: PrologProcess,
  args: ImpactArgs,
): Promise<ImpactResult> {
  if (!args.entity || typeof args.entity !== "string") {
    throw new Error("'entity' is required");
  }

  const goal = `setof(Id, (impacted_by_change(Id, '${escapeAtom(args.entity)}'), Id \\= '${escapeAtom(args.entity)}'), Impacted)`;
  const impactedIds = await queryAtoms(prolog, goal, "Impacted");

  const impacted: Array<{ id: string; type: string }> = [];
  for (const id of impactedIds) {
    const type = await getEntityType(prolog, id);
    impacted.push({ id, type: type ?? "unknown" });
  }

  impacted.sort((a, b) => {
    if (a.type === b.type) {
      return a.id.localeCompare(b.id);
    }
    return a.type.localeCompare(b.type);
  });

  return {
    content: [
      {
        type: "text",
        text: `Impact analysis for '${args.entity}': ${impacted.length} impacted entity(s).`,
      },
    ],
    structuredContent: {
      entity: args.entity,
      impacted,
      count: impacted.length,
      provenance: {
        predicate: "impacted_by_change",
        deterministic: true,
      },
    },
  };
}

async function queryAtoms(
  prolog: PrologProcess,
  goal: string,
  bindingName: string,
): Promise<string[]> {
  const result = await prolog.query(goal);
  if (!result.success || !result.bindings[bindingName]) {
    return [];
  }
  return parseAtomList(result.bindings[bindingName]);
}

async function getEntityType(
  prolog: PrologProcess,
  id: string,
): Promise<string | null> {
  const result = await prolog.query(`kb_entity('${escapeAtom(id)}', Type, _)`);
  if (!result.success || !result.bindings.Type) {
    return null;
  }

  return result.bindings.Type;
}
