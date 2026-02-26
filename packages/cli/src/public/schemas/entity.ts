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

// Public export of entity schema
// Generated from entity.schema.json
const entitySchema = {
  $id: "entity.schema.json",
  title: "Entity",
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    status: {
      type: "string",
      enum: [
        "active",
        "draft",
        "archived",
        "deleted",
        "approved",
        "rejected",
        "pending",
        "in_progress",
        "superseded",
      ],
    },
    created_at: { type: "string" },
    updated_at: { type: "string" },
    source: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    owner: { type: "string" },
    priority: { type: "string" },
    severity: { type: "string" },
    links: { type: "array", items: { type: "string" } },
    text_ref: { type: "string" },
    type: {
      type: "string",
      enum: [
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
  },
  required: [
    "id",
    "title",
    "status",
    "created_at",
    "updated_at",
    "source",
    "type",
  ],
  additionalProperties: false,
};

export default entitySchema;
