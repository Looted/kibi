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
