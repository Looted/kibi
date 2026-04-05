// implements REQ-opencode-smart-enforcement-v1, REQ-opencode-kibi-plugin-v1

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
export class GuidanceCache {
  // implements REQ-opencode-kibi-plugin-v1
  private entries = new Map<string, CacheEntry>();
  private ttlMs: number;
  private idleResetMs: number;
  private lastTouchedAt: number;

  constructor(ttlMs = 600000, idleResetMs = Number.POSITIVE_INFINITY) {
    this.ttlMs = ttlMs;
    this.idleResetMs = idleResetMs;
    this.lastTouchedAt = Date.now();
  }

  setTtlMs(ttlMs: number): void {
    this.ttlMs = ttlMs;
  }

  setIdleResetMs(idleResetMs: number): void {
    this.idleResetMs = idleResetMs;
  }

  /**
   * Check whether a preflight has been satisfied for the given key
   * and is still within the TTL window.
   */
  isSatisfied(key: CacheKey): boolean {
    this.resetIfIdle();
    const serialized = serializeKey(key);
    const entry = this.entries.get(serialized);
    if (!entry) return false;
    this.lastTouchedAt = Date.now();
    return !this.isExpired(entry);
  }

  /**
   * Record that a preflight has been satisfied for the given key.
   */
  recordSatisfied(key: CacheKey, preflightType: string): void {
    this.resetIfIdle();
    const serialized = serializeKey(key);
    this.entries.set(serialized, {
      satisfiedAt: Date.now(),
      preflightType,
    });
    this.lastTouchedAt = Date.now();
  }

  /**
   * Invalidate all cache entries.
   */
  invalidate(): void {
    this.entries.clear();
    this.lastTouchedAt = Date.now();
  }

  /**
   * Invalidate all entries matching a specific posture.
   */
  invalidateForPosture(posture: RepoPosture): void {
    this.resetIfIdle();
    for (const [serialized] of this.entries) {
      // Key format: workspaceRoot\0branch\0posture\0riskClass\0fileBucket
      const parts = serialized.split("\0");
      if (parts[2] === posture) {
        this.entries.delete(serialized);
      }
    }
    this.lastTouchedAt = Date.now();
  }

  /**
   * Invalidate all entries matching a specific branch.
   */
  invalidateForBranch(branch: string): void {
    this.resetIfIdle();
    for (const [serialized] of this.entries) {
      const parts = serialized.split("\0");
      if (parts[1] === branch) {
        this.entries.delete(serialized);
      }
    }
    this.lastTouchedAt = Date.now();
  }

  /**
   * Invalidate all entries matching a specific workspace root.
   */
  invalidateForWorkspace(workspaceRoot: string): void {
    this.resetIfIdle();
    for (const [serialized] of this.entries) {
      const parts = serialized.split("\0");
      if (parts[0] === workspaceRoot) {
        this.entries.delete(serialized);
      }
    }
    this.lastTouchedAt = Date.now();
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

  private resetIfIdle(): void {
    const now = Date.now();
    if (now - this.lastTouchedAt > this.idleResetMs) {
      this.entries.clear();
    }
    this.lastTouchedAt = now;
  }
}

// ── Singleton ───────────────────────────────────────────────────────

let globalCache: GuidanceCache | null = null;

export function getGuidanceCache(
  ttlMs?: number,
  idleResetMs?: number,
): GuidanceCache {
  // implements REQ-opencode-kibi-plugin-v1
  if (!globalCache) {
    globalCache = new GuidanceCache(ttlMs, idleResetMs);
  } else {
    if (typeof ttlMs === "number") globalCache.setTtlMs(ttlMs);
    if (typeof idleResetMs === "number")
      globalCache.setIdleResetMs(idleResetMs);
  }
  return globalCache;
}

export function resetGuidanceCache(ttlMs?: number, idleResetMs?: number): void {
  // implements REQ-opencode-kibi-plugin-v1
  globalCache = new GuidanceCache(ttlMs, idleResetMs);
}
