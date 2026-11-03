import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import {
  type CacheKey,
  GuidanceCache,
  getGuidanceCache,
  resetGuidanceCache,
} from "../src/guidance-cache";

const T0 = new Date("2026-01-01T00:00:00.000Z").getTime();

function at(ms: number): void {
  setSystemTime(new Date(T0 + ms));
}

const KEY: CacheKey = {
  workspaceRoot: "/w",
  branch: "main",
  posture: "root_active",
  riskClass: "behavior_candidate",
  fileBucket: "src",
};

beforeEach(() => at(0));
afterEach(() => {
  setSystemTime();
  resetGuidanceCache();
});

describe("GuidanceCache", () => {
  test("different keys do not share an entry", () => {
    const cache = new GuidanceCache();
    cache.recordSatisfied(KEY, "preflight");
    expect(cache.isSatisfied({ ...KEY, fileBucket: "other" })).toBe(false);
    expect(cache.isSatisfied({ ...KEY, scopeKey: "s" })).toBe(false);
    expect(cache.isSatisfied(KEY)).toBe(true);
  });

  test("an entry is satisfied up to and including the TTL", () => {
    const cache = new GuidanceCache(100);
    cache.recordSatisfied(KEY, "preflight");
    at(100);
    expect(cache.isSatisfied(KEY)).toBe(true);
    at(101);
    expect(cache.isSatisfied(KEY)).toBe(false);
  });

  test("setTtlMs and setIdleResetMs take effect", () => {
    const cache = new GuidanceCache(1000);
    cache.setTtlMs(10);
    cache.recordSatisfied(KEY, "preflight");
    at(11);
    expect(cache.isSatisfied(KEY)).toBe(false);
    cache.setIdleResetMs(5);
    cache.recordSatisfied(KEY, "preflight");
    at(17);
    expect(cache.size).toBe(1);
    cache.invalidateForBranch("other");
    expect(cache.size).toBe(0);
  });

  describe("idle reset", () => {
    function idleCache(): GuidanceCache {
      const cache = new GuidanceCache(1_000_000, 50);
      cache.recordSatisfied(KEY, "preflight");
      return cache;
    }

    test("is not triggered at exactly the idle limit", () => {
      const cache = idleCache();
      at(50);
      expect(cache.isSatisfied(KEY)).toBe(true);
    });

    test("isSatisfied clears an idle cache", () => {
      const cache = idleCache();
      at(51);
      expect(cache.isSatisfied(KEY)).toBe(false);
    });

    test("recordSatisfied clears an idle cache first", () => {
      const cache = idleCache();
      at(51);
      cache.recordSatisfied({ ...KEY, branch: "dev" }, "preflight");
      expect(cache.size).toBe(1);
    });

    test.each([
      [
        "invalidateForPosture",
        (c: GuidanceCache) => c.invalidateForPosture("vendored_only"),
      ],
      [
        "invalidateForBranch",
        (c: GuidanceCache) => c.invalidateForBranch("dev"),
      ],
      [
        "invalidateForWorkspace",
        (c: GuidanceCache) => c.invalidateForWorkspace("/x"),
      ],
    ] as const)("%s clears an idle cache", (_name, invalidate) => {
      const cache = idleCache();
      at(51);
      invalidate(cache);
      expect(cache.size).toBe(0);
    });
  });
});

describe("getGuidanceCache", () => {
  test("applies only the settings it is given", () => {
    resetGuidanceCache(10, 1000);
    const cache = getGuidanceCache();
    cache.recordSatisfied(KEY, "preflight");
    at(11);
    expect(cache.isSatisfied(KEY)).toBe(false);
    at(1012);
    cache.recordSatisfied({ ...KEY, branch: "a" }, "x");
    cache.recordSatisfied({ ...KEY, branch: "b" }, "x");
    expect(cache.size).toBe(2);
    expect(getGuidanceCache(1000, 5)).toBe(cache);
    cache.recordSatisfied(KEY, "preflight");
    at(1012 + 990);
    expect(cache.size).toBe(3);
    expect(cache.isSatisfied(KEY)).toBe(false);
  });

  test("updates the TTL of the shared cache", () => {
    resetGuidanceCache(10);
    const cache = getGuidanceCache(1000);
    cache.recordSatisfied(KEY, "preflight");
    at(500);
    expect(cache.isSatisfied(KEY)).toBe(true);
  });
});
