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
