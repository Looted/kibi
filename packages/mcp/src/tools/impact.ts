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

/*
 How to apply this header to source files (examples)

 1) Prepend header to a single file (POSIX shells):

    cat LICENSE_HEADER.txt "$FILE" > "$FILE".with-header && mv "$FILE".with-header "$FILE"

 2) Apply to multiple files (example: the project's main entry files):

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp packages/cli/src/*.ts packages/mcp/src/*.ts; do
      if [ -f "$f" ]; then
        cp "$f" "$f".bak
        (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
      fi
    done

 3) Avoid duplicating the header: run a quick guard to only add if missing

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp; do
      if [ -f "$f" ]; then
        if ! head -n 5 "$f" | grep -q "Copyright (C) 2026 Piotr Franczyk"; then
          cp "$f" "$f".bak
          (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
        fi
      fi
    done

 Notes:
 - Apply the header to the source files (TS/JS/other) in `packages/*/src` before building.
 - For small CLI wrapper scripts (e.g. `packages/*/bin/*`) you can add the header as a block comment directly above the shebang line or below it; if you need the shebang to remain the very first line, place the header after the shebang.
 - Built `dist/` files are generated; prefer to modify source files and rebuild rather than editing `dist/` directly.

*/

import type { PrologProcess } from "kibi-cli/prolog";
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
