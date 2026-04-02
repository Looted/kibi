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
} from "../../src/relationships/shards.js";

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
    const id1 = relationshipIdFor("depends_on", "A", "B");
    const id2 = relationshipIdFor("depends_on", "A", "B");
    expect(id1).toBe(id2);
  });

  test("generates different IDs for different relationships", () => {
    const id1 = relationshipIdFor("depends_on", "A", "B");
    const id2 = relationshipIdFor("relates_to", "A", "B");
    expect(id1).not.toBe(id2);
  });

  test("generates different IDs for different entities", () => {
    const id1 = relationshipIdFor("depends_on", "A", "B");
    const id2 = relationshipIdFor("depends_on", "A", "C");
    expect(id1).not.toBe(id2);
  });

  test("returns string ID", () => {
    const id = relationshipIdFor("depends_on", "REQ-001", "REQ-002");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  test("handles special characters in entity IDs", () => {
    const id = relationshipIdFor("relates_to", "file:///a.md", "file:///b.md");
    expect(typeof id).toBe("string");
  });
});

describe("mergeRecords", () => {
  test("merges two empty record arrays", () => {
    const result = mergeRecords([], []);
    expect(result).toEqual([]);
  });

  test("merges record with empty", () => {
    const record = {
      id: "rel-001",
      type: "depends_on",
      from: "REQ-001",
      to: "REQ-002",
      created_at: "2024-01-01T00:00:00Z",
      created_by: "test",
      source: "test.md",
    };
    const result = mergeRecords([record], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rel-001");
  });

  test("merges two non-conflicting records", () => {
    const record1 = {
      id: "rel-001",
      type: "depends_on",
      from: "REQ-001",
      to: "REQ-002",
      created_at: "2024-01-01T00:00:00Z",
      created_by: "test",
      source: "test.md",
    };
    const record2 = {
      id: "rel-002",
      type: "depends_on",
      from: "REQ-003",
      to: "REQ-004",
      created_at: "2024-01-01T00:00:00Z",
      created_by: "test",
      source: "test.md",
    };
    const result = mergeRecords([record1], [record2]);
    expect(result).toHaveLength(2);
  });
});
