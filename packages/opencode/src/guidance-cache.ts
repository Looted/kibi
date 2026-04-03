// implements REQ-opencode-kibi-plugin-v1

import type { RepoPosture } from "./repo-posture.js";
import type { RiskClass } from "./risk-classifier.js";

/**
 * Cache key uniquely identifies a preflight context by combining
 * workspace root, branch, posture, risk class, and file bucket.
 */
export interface CacheKey {
  workspaceRoot: string;
  branch: string;
  posture: RepoPosture;
  riskClass: RiskClass;
  fileBucket: string;
}

/**
 * Cache entry tracking when a preflight was last satisfied.
 */
export interface CacheEntry {
  satisfiedAt: number;
  preflightType: string;
}

/**
 * Serializes a CacheKey into a deterministic string for use as a Map key.
 */
function serializeKey(key: CacheKey): string {
  return `${key.workspaceRoot}\0${key.branch}\0${key.posture}\0${key.riskClass}\0${key.fileBucket}`;
}

/**
 * In-memory cache tracking satisfied preflight checks per unique context.
 *
 * The cache is keyed by (workspaceRoot, branch, posture, riskClass, fileBucket)
 * and tracks when each preflight was last satisfied. Entries expire after
 * a configurable TTL or when context changes (branch switch, posture change,
 * workspace change).
 *
 * v1: in-memory only, no disk persistence.
 */
export class GuidanceCache { // implements REQ-opencode-kibi-plugin-v1
  private entries = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs = 600000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Check whether a preflight has been satisfied for the given key
   * and is still within the TTL window.
   */
  isSatisfied(key: CacheKey): boolean {
    const serialized = serializeKey(key);
    const entry = this.entries.get(serialized);
    if (!entry) return false;
    return !this.isExpired(entry);
  }

  /**
   * Record that a preflight has been satisfied for the given key.
   */
  recordSatisfied(key: CacheKey, preflightType: string): void {
    const serialized = serializeKey(key);
    this.entries.set(serialized, {
      satisfiedAt: Date.now(),
      preflightType,
    });
  }

  /**
   * Invalidate all cache entries.
   */
  invalidate(): void {
    this.entries.clear();
  }

  /**
   * Invalidate all entries matching a specific posture.
   */
  invalidateForPosture(posture: RepoPosture): void {
    for (const [serialized] of this.entries) {
      // Key format: workspaceRoot\0branch\0posture\0riskClass\0fileBucket
      const parts = serialized.split("\0");
      if (parts[2] === posture) {
        this.entries.delete(serialized);
      }
    }
  }

  /**
   * Invalidate all entries matching a specific branch.
   */
  invalidateForBranch(branch: string): void {
    for (const [serialized] of this.entries) {
      const parts = serialized.split("\0");
      if (parts[1] === branch) {
        this.entries.delete(serialized);
      }
    }
  }

  /**
   * Invalidate all entries matching a specific workspace root.
   */
  invalidateForWorkspace(workspaceRoot: string): void {
    for (const [serialized] of this.entries) {
      const parts = serialized.split("\0");
      if (parts[0] === workspaceRoot) {
        this.entries.delete(serialized);
      }
    }
  }

  /**
   * Get the number of entries currently in the cache (including potentially expired).
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Check whether a cache entry has expired based on the configured TTL.
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.satisfiedAt > this.ttlMs;
  }
}

// ── Singleton ───────────────────────────────────────────────────────

let globalCache: GuidanceCache | null = null;

export function getGuidanceCache(ttlMs?: number): GuidanceCache { // implements REQ-opencode-kibi-plugin-v1
  if (!globalCache) {
    globalCache = new GuidanceCache(ttlMs);
  }
  return globalCache;
}

export function resetGuidanceCache(ttlMs?: number): void { // implements REQ-opencode-kibi-plugin-v1
  globalCache = new GuidanceCache(ttlMs);
}
