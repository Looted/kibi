import type { PrologProcess } from "@kibi/cli/prolog";
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

function escapeAtom(value: string): string {
  return value.replace(/'/g, "\\'");
}
