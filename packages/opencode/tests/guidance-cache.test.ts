import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  type CacheKey,
  GuidanceCache,
  getGuidanceCache,
  resetGuidanceCache,
} from "../src/guidance-cache";
import type { RepoPosture } from "../src/repo-posture";
import type { RiskClass } from "../src/risk-classifier";

// implements REQ-opencode-kibi-plugin-v1

function makeKey(overrides: Partial<CacheKey> = {}): CacheKey {
  return {
    workspaceRoot: "/workspace/project",
    branch: "main",
    posture: "root_active" as RepoPosture,
    riskClass: "behavior_candidate" as RiskClass,
    fileBucket: "src",
    ...overrides,
  };
}

describe("GuidanceCache", () => {
  let cache: GuidanceCache;

  beforeEach(() => {
    cache = new GuidanceCache(600000); // 10 minutes TTL
  });

  describe("isSatisfied", () => {
    test("returns false for never-recorded key", () => {
      expect(cache.isSatisfied(makeKey())).toBe(false);
    });

    test("returns true after recording satisfied", () => {
      const key = makeKey();
      cache.recordSatisfied(key, "preflight");
      expect(cache.isSatisfied(key)).toBe(true);
    });

    test("returns false for different key", () => {
      cache.recordSatisfied(makeKey({ branch: "main" }), "preflight");
      expect(cache.isSatisfied(makeKey({ branch: "develop" }))).toBe(false);
    });

    test("returns false after TTL expiry", () => {
      // Use a very short TTL
      const shortCache = new GuidanceCache(1); // 1ms TTL
      shortCache.recordSatisfied(makeKey(), "preflight");

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy-wait 5ms
      }

      expect(shortCache.isSatisfied(makeKey())).toBe(false);
    });
    test("returns false after idle reset", () => {
      const idleCache = new GuidanceCache(600000, 1); // 1ms idle reset
      idleCache.recordSatisfied(makeKey(), "preflight");
      expect(idleCache.isSatisfied(makeKey())).toBe(true);

      // Wait past the idle window
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy-wait 5ms
      }

      // After idle period, any cache operation should trigger reset
      expect(idleCache.isSatisfied(makeKey())).toBe(false);
    });

    test("differentiates by workspaceRoot", () => {
      cache.recordSatisfied(makeKey({ workspaceRoot: "/ws/a" }), "preflight");
      expect(cache.isSatisfied(makeKey({ workspaceRoot: "/ws/a" }))).toBe(true);
      expect(cache.isSatisfied(makeKey({ workspaceRoot: "/ws/b" }))).toBe(
        false,
      );
    });

    test("differentiates by posture", () => {
      cache.recordSatisfied(
        makeKey({ posture: "root_active" as RepoPosture }),
        "preflight",
      );
      expect(
        cache.isSatisfied(makeKey({ posture: "root_active" as RepoPosture })),
      ).toBe(true);
      expect(
        cache.isSatisfied(
          makeKey({ posture: "root_uninitialized" as RepoPosture }),
        ),
      ).toBe(false);
    });

    test("differentiates by riskClass", () => {
      cache.recordSatisfied(
        makeKey({ riskClass: "behavior_candidate" as RiskClass }),
        "preflight",
      );
      expect(
        cache.isSatisfied(
          makeKey({ riskClass: "behavior_candidate" as RiskClass }),
        ),
      ).toBe(true);
      expect(
        cache.isSatisfied(
          makeKey({ riskClass: "safe_docs_only" as RiskClass }),
        ),
      ).toBe(false);
    });

    test("differentiates by fileBucket", () => {
      cache.recordSatisfied(makeKey({ fileBucket: "src" }), "preflight");
      expect(cache.isSatisfied(makeKey({ fileBucket: "src" }))).toBe(true);
      expect(cache.isSatisfied(makeKey({ fileBucket: "requirements" }))).toBe(
        false,
      );
    });
  });

  describe("recordSatisfied", () => {
    test("stores entry with timestamp and type", () => {
      const key = makeKey();
      const before = Date.now();
      cache.recordSatisfied(key, "structured-check");
      const after = Date.now();

      expect(cache.isSatisfied(key)).toBe(true);
      // Verify it's accessible via size
      expect(cache.size).toBe(1);
    });

    test("overwrites previous entry for same key", () => {
      const key = makeKey();
      cache.recordSatisfied(key, "first");
      cache.recordSatisfied(key, "second");

      expect(cache.size).toBe(1);
      expect(cache.isSatisfied(key)).toBe(true);
    });

    test("stores multiple entries for different keys", () => {
      cache.recordSatisfied(makeKey({ branch: "main" }), "preflight");
      cache.recordSatisfied(makeKey({ branch: "develop" }), "preflight");

      expect(cache.size).toBe(2);
      expect(cache.isSatisfied(makeKey({ branch: "main" }))).toBe(true);
      expect(cache.isSatisfied(makeKey({ branch: "develop" }))).toBe(true);
    });
  });

  describe("invalidate", () => {
    test("clears all entries", () => {
      cache.recordSatisfied(makeKey({ branch: "main" }), "preflight");
      cache.recordSatisfied(makeKey({ branch: "develop" }), "preflight");
      cache.recordSatisfied(makeKey({ branch: "feature" }), "preflight");

      expect(cache.size).toBe(3);

      cache.invalidate();

      expect(cache.size).toBe(0);
      expect(cache.isSatisfied(makeKey({ branch: "main" }))).toBe(false);
      expect(cache.isSatisfied(makeKey({ branch: "develop" }))).toBe(false);
    });
  });

  describe("invalidateForPosture", () => {
    test("removes only entries matching the posture", () => {
      cache.recordSatisfied(
        makeKey({ posture: "root_active" as RepoPosture, branch: "a" }),
        "preflight",
      );
      cache.recordSatisfied(
        makeKey({ posture: "root_partial" as RepoPosture, branch: "b" }),
        "preflight",
      );
      cache.recordSatisfied(
        makeKey({ posture: "root_active" as RepoPosture, branch: "c" }),
        "preflight",
      );

      cache.invalidateForPosture("root_active" as RepoPosture);

      expect(cache.size).toBe(1);
      expect(
        cache.isSatisfied(
          makeKey({ posture: "root_active" as RepoPosture, branch: "a" }),
        ),
      ).toBe(false);
      expect(
        cache.isSatisfied(
          makeKey({ posture: "root_partial" as RepoPosture, branch: "b" }),
        ),
      ).toBe(true);
    });

    test("does nothing when no entries match", () => {
      cache.recordSatisfied(
        makeKey({ posture: "root_active" as RepoPosture }),
        "preflight",
      );

      cache.invalidateForPosture("vendored_only" as RepoPosture);

      expect(cache.size).toBe(1);
    });
  });

  describe("invalidateForBranch", () => {
    test("removes only entries matching the branch", () => {
      cache.recordSatisfied(makeKey({ branch: "main" }), "preflight");
      cache.recordSatisfied(makeKey({ branch: "develop" }), "preflight");
      cache.recordSatisfied(
        makeKey({ branch: "main", fileBucket: "tests" }),
        "preflight",
      );

      cache.invalidateForBranch("main");

      expect(cache.size).toBe(1);
      expect(cache.isSatisfied(makeKey({ branch: "main" }))).toBe(false);
      expect(cache.isSatisfied(makeKey({ branch: "develop" }))).toBe(true);
    });

    test("does nothing when no entries match", () => {
      cache.recordSatisfied(makeKey({ branch: "main" }), "preflight");

      cache.invalidateForBranch("feature-x");

      expect(cache.size).toBe(1);
    });
  });

  describe("invalidateForWorkspace", () => {
    test("removes only entries matching the workspace root", () => {
      cache.recordSatisfied(
        makeKey({ workspaceRoot: "/ws/a", branch: "main" }),
        "preflight",
      );
      cache.recordSatisfied(
        makeKey({ workspaceRoot: "/ws/b", branch: "main" }),
        "preflight",
      );

      cache.invalidateForWorkspace("/ws/a");

      expect(cache.size).toBe(1);
      expect(
        cache.isSatisfied(makeKey({ workspaceRoot: "/ws/a", branch: "main" })),
      ).toBe(false);
      expect(
        cache.isSatisfied(makeKey({ workspaceRoot: "/ws/b", branch: "main" })),
      ).toBe(true);
    });

    test("does nothing when no entries match", () => {
      cache.recordSatisfied(makeKey({ workspaceRoot: "/ws/a" }), "preflight");

      cache.invalidateForWorkspace("/ws/z");

      expect(cache.size).toBe(1);
    });
  });

  describe("TTL expiry", () => {
    test("expired entry is not considered satisfied", () => {
      const ttlCache = new GuidanceCache(1);
      ttlCache.recordSatisfied(makeKey(), "preflight");

      // Wait to exceed TTL
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy-wait
      }

      expect(ttlCache.isSatisfied(makeKey())).toBe(false);
    });

    test("entry within TTL is satisfied", () => {
      const longTtlCache = new GuidanceCache(600000);
      longTtlCache.recordSatisfied(makeKey(), "preflight");
      expect(longTtlCache.isSatisfied(makeKey())).toBe(true);
    });

    test("custom TTL is respected", () => {
      const customCache = new GuidanceCache(50);
      customCache.recordSatisfied(makeKey(), "preflight");
      expect(customCache.isSatisfied(makeKey())).toBe(true);

      const start = Date.now();
      while (Date.now() - start < 60) {
        // busy-wait past TTL
      }

      expect(customCache.isSatisfied(makeKey())).toBe(false);
    });
  });

  describe("cache key serialization", () => {
    test("same key components produce same cache slot", () => {
      const key1: CacheKey = {
        workspaceRoot: "/ws",
        branch: "main",
        posture: "root_active" as RepoPosture,
        riskClass: "behavior_candidate" as RiskClass,
        fileBucket: "src",
      };
      const key2: CacheKey = {
        workspaceRoot: "/ws",
        branch: "main",
        posture: "root_active" as RepoPosture,
        riskClass: "behavior_candidate" as RiskClass,
        fileBucket: "src",
      };

      cache.recordSatisfied(key1, "preflight");
      expect(cache.isSatisfied(key2)).toBe(true);
      expect(cache.size).toBe(1);
    });

    test("keys with special characters in workspaceRoot work correctly", () => {
      const key = makeKey({ workspaceRoot: "/ws/with spaces/and-dashes" });
      cache.recordSatisfied(key, "preflight");
      expect(cache.isSatisfied(key)).toBe(true);
    });
  });
});

describe("guidance-cache singleton", () => {
  afterEach(() => {
    resetGuidanceCache();
  });

  test("getGuidanceCache returns same instance", () => {
    const a = getGuidanceCache();
    const b = getGuidanceCache();
    expect(a).toBe(b);
  });

  test("resetGuidanceCache creates new instance", () => {
    const first = getGuidanceCache();
    first.recordSatisfied(makeKey(), "preflight");

    resetGuidanceCache();

    const second = getGuidanceCache();
    expect(first).not.toBe(second);
    expect(second.size).toBe(0);
  });

  test("resetGuidanceCache accepts custom TTL", () => {
    resetGuidanceCache(1);
    const cache = getGuidanceCache();
    cache.recordSatisfied(makeKey(), "preflight");

    const start = Date.now();
    while (Date.now() - start < 5) {
      // busy-wait
    }

    expect(cache.isSatisfied(makeKey())).toBe(false);
  });
});
