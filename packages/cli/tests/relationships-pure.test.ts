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
  relationshipIdFor,
} from "../src/relationships/shards.js";

describe("getRelationshipsDir", () => {
  test("returns relationships directory path", () => {
    const result = getRelationshipsDir("/kb/root");
    expect(result).toContain("relationships");
  });

  test("handles paths without trailing slash", () => {
    const result = getRelationshipsDir("/kb");
    expect(result).toBe("/kb/relationships");
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

  test("returns string ID", () => {
    const id = relationshipIdFor("REQ-001", "REQ-002", "depends_on");
    expect(typeof id).toBe("string");
  });
});
