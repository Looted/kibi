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
import { toCacheKey } from "../src/commands/sync/cache.js";

describe("toCacheKey", () => {
  const workspaceRoot = "/workspace";

  test("generates consistent key for same path", () => {
    const key1 = toCacheKey(workspaceRoot, "/workspace/path/to/file.md");
    const key2 = toCacheKey(workspaceRoot, "/workspace/path/to/file.md");
    expect(key1).toBe(key2);
  });

  test("generates different keys for different paths", () => {
    const key1 = toCacheKey(workspaceRoot, "/workspace/path/a.md");
    const key2 = toCacheKey(workspaceRoot, "/workspace/path/b.md");
    expect(key1).not.toBe(key2);
  });

  test("returns string key", () => {
    const key = toCacheKey(workspaceRoot, "test.md");
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  test("handles relative paths", () => {
    const key = toCacheKey(workspaceRoot, "./relative/path.md");
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  test("handles paths with special characters", () => {
    const key = toCacheKey(workspaceRoot, "/workspace/with spaces/file.md");
    expect(typeof key).toBe("string");
  });
});
