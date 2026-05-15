import { describe, expect, test } from "bun:test";
import { RelationshipCache } from "../src/relationshipCache";

describe("RelationshipCache", () => {
  test("get() returns undefined for missing key", () => {
    const cache = new RelationshipCache();
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  test("set() stores and get() retrieves a value", () => {
    const cache = new RelationshipCache();
    const entry = {
      data: [{ type: "implements", from: "SYM-001", to: "REQ-001" }],
      timestamp: Date.now(),
    };
    cache.set("SYM-001", entry);
    expect(cache.get("SYM-001")).toEqual(entry);
  });

  test("set() overwrites existing key", () => {
    const cache = new RelationshipCache();
    const first = {
      data: [{ type: "implements", from: "SYM-001", to: "REQ-001" }],
      timestamp: 1000,
    };
    const second = {
      data: [{ type: "relates_to", from: "SYM-001", to: "REQ-002" }],
      timestamp: 2000,
    };
    cache.set("SYM-001", first);
    cache.set("SYM-001", second);
    expect(cache.get("SYM-001")).toEqual(second);
  });

  test("clear() removes all cache and inflight entries", () => {
    const cache = new RelationshipCache();
    cache.set("key1", { data: [], timestamp: 1 });
    cache.set("key2", { data: [], timestamp: 2 });
    cache.setInflight("key1", Promise.resolve([]));

    cache.clear();

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
    expect(cache.getInflight("key1")).toBeUndefined();
  });

  test("multiple set/get cycles work independently", () => {
    const cache = new RelationshipCache();
    const entryA = {
      data: [{ type: "implements", from: "SYM-A", to: "REQ-A" }],
      timestamp: 100,
    };
    const entryB = {
      data: [{ type: "implements", from: "SYM-B", to: "REQ-B" }],
      timestamp: 200,
    };

    cache.set("A", entryA);
    cache.set("B", entryB);

    expect(cache.get("A")).toEqual(entryA);
    expect(cache.get("B")).toEqual(entryB);
  });

  test("getInflight() returns undefined when no inflight request", () => {
    const cache = new RelationshipCache();
    expect(cache.getInflight("missing")).toBeUndefined();
  });

  test("setInflight() stores and getInflight() retrieves a promise", async () => {
    const cache = new RelationshipCache();
    const promise = Promise.resolve([
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ]);
    cache.setInflight("SYM-001", promise);

    const retrieved = cache.getInflight("SYM-001");
    expect(retrieved).toBeDefined();
    if (!retrieved) {
      throw new Error("Expected inflight promise to be present");
    }
    const result = await retrieved;
    expect(result).toEqual([
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ]);
  });

  test("deleteInflight() removes an inflight entry", () => {
    const cache = new RelationshipCache();
    cache.setInflight("key", Promise.resolve([]));
    expect(cache.getInflight("key")).toBeDefined();

    cache.deleteInflight("key");

    expect(cache.getInflight("key")).toBeUndefined();
  });

  test("deleteInflight() on nonexistent key does not throw", () => {
    const cache = new RelationshipCache();
    expect(() => cache.deleteInflight("nope")).not.toThrow();
  });

  test("getTTL() returns 30000", () => {
    const cache = new RelationshipCache();
    expect(cache.getTTL()).toBe(30000);
  });

  test("supports a full cache lifecycle across cache and inflight stores", async () => {
    const cache = new RelationshipCache();
    const entry = {
      data: [{ type: "implements", from: "SYM-123", to: "REQ-123" }],
      timestamp: 123,
    };
    const inflight = Promise.resolve(entry.data);

    cache.set("SYM-123", entry);
    cache.setInflight("SYM-123", inflight);

    expect(cache.get("SYM-123")).toEqual(entry);
    expect(await cache.getInflight("SYM-123")).toEqual(entry.data);

    cache.deleteInflight("SYM-123");
    expect(cache.getInflight("SYM-123")).toBeUndefined();

    cache.clear();

    expect(cache.get("SYM-123")).toBeUndefined();
    expect(cache.getInflight("SYM-123")).toBeUndefined();
  });
});

  test("set/get/clear lifecycle works with inflight management", async () => {
    const cache = new RelationshipCache();

    // Set a cache entry
    const entry = {
      data: [{ type: "implements", from: "SYM-A", to: "REQ-A" }],
      timestamp: 100,
    };
    cache.set("A", entry);
    expect(cache.get("A")).toEqual(entry);

    // Set an inflight promise that resolves
    const promise = Promise.resolve([
      { type: "implements", from: "SYM-B", to: "REQ-B" },
    ]);
    cache.setInflight("B", promise);
    expect(cache.getInflight("B")).toBe(promise);

    // Await the inflight promise
    const result = await promise;
    expect(result).toEqual([
      { type: "implements", from: "SYM-B", to: "REQ-B" },
    ]);

    // Inflight still retrievable until deleted
    expect(cache.getInflight("B")).toBe(promise);

    // Delete inflight after resolution
    cache.deleteInflight("B");
    expect(cache.getInflight("B")).toBeUndefined();

    // Cache still intact
    expect(cache.get("A")).toEqual(entry);

    // Clear everything
    cache.clear();
    expect(cache.get("A")).toBeUndefined();
    expect(cache.getInflight("B")).toBeUndefined();
  });
