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
*/
export interface TypedRelationship {
  type: string;
  from: string;
  to: string;
}

export interface RelationshipCacheEntry {
  data: TypedRelationship[];
  timestamp: number;
}

export class RelationshipCache {
  private cache = new Map<string, RelationshipCacheEntry>();
  private inflight = new Map<string, Promise<TypedRelationship[]>>();
  private readonly CACHE_TTL = 30000; // 30 seconds

  get(key: string): RelationshipCacheEntry | undefined {
    return this.cache.get(key);
  }

  set(key: string, entry: RelationshipCacheEntry): void {
    this.cache.set(key, entry);
  }

  getInflight(key: string): Promise<TypedRelationship[]> | undefined {
    return this.inflight.get(key);
  }

  setInflight(key: string, promise: Promise<TypedRelationship[]>): void {
    this.inflight.set(key, promise);
  }

  deleteInflight(key: string): void {
    this.inflight.delete(key);
  }

  getTTL(): number {
    return this.CACHE_TTL;
  }

  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }
}
