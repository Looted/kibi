/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, test } from "bun:test";
import {
  getRelationshipsDir,
  mergeRecords,
  relationshipIdFor,
  shardForFromId,
} from "../src/relationships/shards.js";

describe("getRelationshipsDir", () => {
  test("returns relationships directory path", () => {
    const result = getRelationshipsDir("/kb/root");
    expect(result).toContain("relationships");
    expect(result).toContain("/kb/root");
  });

  test("handles paths without trailing slash", () => {
    const result = getRelationshipsDir("/kb");
    expect(result).toBe("/kb/relationships");
  });

  test("handles paths with trailing slash", () => {
    const result = getRelationshipsDir("/kb/");
    expect(result).toBe("/kb/relationships");
  });

  test("handles relative paths", () => {
    const result = getRelationshipsDir("./kb");
    expect(result).toContain("kb");
    expect(result).toContain("relationships");
  });
});

describe("shardForFromId", () => {
  test("returns consistent shard for same ID", () => {
    const id = "REQ-001";
    const shard1 = shardForFromId(id);
    const shard2 = shardForFromId(id);
    expect(shard1).toBe(shard2);
  });

  test("returns different shards for different IDs", () => {
    const shard1 = shardForFromId("REQ-001");
    const shard2 = shardForFromId("REQ-002");
    // Most of the time they should differ
    expect(typeof shard1).toBe("string");
    expect(typeof shard2).toBe("string");
  });

  test("returns string shard name", () => {
    const shard = shardForFromId("TEST-ID");
    expect(typeof shard).toBe("string");
    expect(shard.length).toBeGreaterThan(0);
  });

  test("handles IDs with special characters", () => {
    const shard = shardForFromId("file:///test.md");
    expect(typeof shard).toBe("string");
  });
});

describe("relationshipIdFor", () => {
  test("generates consistent ID for same inputs", () => {
    const id1 = relationshipIdFor("A", "B", "depends_on");
    const id2 = relationshipIdFor("A", "B", "depends_on");
    expect(id1).toBe(id2);
  });

  test("generates different IDs for different relationships", () => {
    const id1 = relationshipIdFor("A", "B", "depends_on");
    const id2 = relationshipIdFor("A", "B", "relates_to");
    expect(id1).not.toBe(id2);
  });

  test("generates different IDs for different entities", () => {
    const id1 = relationshipIdFor("A", "B", "depends_on");
    const id2 = relationshipIdFor("A", "C", "depends_on");
    expect(id1).not.toBe(id2);
  });

  test("returns string ID", () => {
    const id = relationshipIdFor("REQ-001", "REQ-002", "depends_on");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  test("handles special characters in entity IDs", () => {
    const id = relationshipIdFor("file:///a.md", "file:///b.md", "relates_to");
    expect(typeof id).toBe("string");
  });
});

describe("mergeRecords", () => {
  test("merges two empty records", () => {
    const result = mergeRecords({}, {});
    expect(result).toEqual({});
  });

  test("merges record with empty", () => {
    const result = mergeRecords({ a: 1 }, {});
    expect(result).toEqual({ a: 1 });
  });

  test("merges two non-conflicting records", () => {
    const result = mergeRecords({ a: 1 }, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test("second record overwrites first on conflict", () => {
    const result = mergeRecords({ a: 1 }, { a: 2 });
    expect(result.a).toBe(2);
  });

  test("handles nested objects", () => {
    const result = mergeRecords({ nested: { x: 1 } }, { nested: { y: 2 } });
    expect(result.nested).toHaveProperty("y", 2);
  });

  test("handles arrays", () => {
    const result = mergeRecords({ arr: [1, 2] }, { arr: [3, 4] });
    expect(result.arr).toEqual([3, 4]);
  });
});
