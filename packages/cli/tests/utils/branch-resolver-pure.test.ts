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
  getBranchDiagnostic,
  getVolatileArtifactPatterns,
  isValidBranchName,
} from "../../src/utils/branch-resolver.js";

describe("isValidBranchName", () => {
  test("accepts valid branch names", () => {
    expect(isValidBranchName("main")).toBe(true);
    expect(isValidBranchName("feature/new-feature")).toBe(true);
    expect(isValidBranchName("bugfix/issue-123")).toBe(true);
    expect(isValidBranchName("hotfix/v1.0.1")).toBe(true);
    expect(isValidBranchName("release/1.0.0")).toBe(true);
    expect(isValidBranchName("test_branch")).toBe(true);
    expect(isValidBranchName("branch-with-dashes")).toBe(true);
    expect(isValidBranchName("branch.with.dots")).toBe(true);
  });

  test("rejects empty branch names", () => {
    expect(isValidBranchName("")).toBe(false);
  });

  test("rejects branch names that are too long", () => {
    const longName = "a".repeat(256);
    expect(isValidBranchName(longName)).toBe(false);
  });

  test("rejects branch names with path traversal", () => {
    expect(isValidBranchName("../etc/passwd")).toBe(false);
    expect(isValidBranchName("feature/../main")).toBe(false);
  });

  test("rejects absolute paths", () => {
    expect(isValidBranchName("/etc/passwd")).toBe(false);
    expect(isValidBranchName("/main")).toBe(false);
  });

  test("rejects branch names with double slashes", () => {
    expect(isValidBranchName("feature//branch")).toBe(false);
  });

  test("rejects branch names ending with slash", () => {
    expect(isValidBranchName("feature/")).toBe(false);
  });

  test("rejects branch names ending with dot", () => {
    expect(isValidBranchName("feature.")).toBe(false);
  });

  test("rejects branch names with backslash", () => {
    expect(isValidBranchName("feature\\branch")).toBe(false);
  });

  test("rejects branch names starting with dash", () => {
    expect(isValidBranchName("-feature")).toBe(false);
  });

  test("rejects branch names with invalid characters", () => {
    expect(isValidBranchName("feature@branch")).toBe(false);
    expect(isValidBranchName("feature#branch")).toBe(false);
    expect(isValidBranchName("feature branch")).toBe(false);
    expect(isValidBranchName("feature:branch")).toBe(false);
    expect(isValidBranchName("feature*branch")).toBe(false);
    expect(isValidBranchName("feature?branch")).toBe(false);
    expect(isValidBranchName("feature<branch>")).toBe(false);
  });

  test("accepts branch names up to 255 characters", () => {
    const name = "a".repeat(255);
    expect(isValidBranchName(name)).toBe(true);
  });
});

describe("getBranchDiagnostic", () => {
  test("includes error message in output", () => {
    const result = getBranchDiagnostic(undefined, "Test error");
    expect(result).toContain("Branch Resolution Failed");
    expect(result).toContain("Reason: Test error");
  });

  test("includes branch name when provided", () => {
    const result = getBranchDiagnostic("feature/test", "Error");
    expect(result).toContain("Detected branch: feature/test");
  });

  test("includes resolution options", () => {
    const result = getBranchDiagnostic(undefined, "Error");
    expect(result).toContain("Resolution options:");
    expect(result).toContain("KIBI_BRANCH");
    expect(result).toContain("git checkout -b");
  });

  test("handles detached HEAD message", () => {
    const result = getBranchDiagnostic(
      undefined,
      "Git is in detached HEAD state",
    );
    expect(result).toContain("detached HEAD");
  });
});

describe("getVolatileArtifactPatterns", () => {
  test("returns array of patterns", () => {
    const patterns = getVolatileArtifactPatterns();
    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.length).toBeGreaterThan(0);
  });

  test("includes specific file names", () => {
    const patterns = getVolatileArtifactPatterns();
    expect(patterns).toContain("sync-cache.json");
    expect(patterns).toContain("journal.log");
    expect(patterns).toContain("audit.log");
    expect(patterns).toContain("lock");
    expect(patterns).toContain("lockfile");
    expect(patterns).toContain(".lock");
  });

  test("includes file extensions", () => {
    const patterns = getVolatileArtifactPatterns();
    expect(patterns).toContain("*.lock");
    expect(patterns).toContain("*.tmp");
    expect(patterns).toContain("*.temp");
    expect(patterns).toContain("*.pid");
  });

  test("includes journal pattern", () => {
    const patterns = getVolatileArtifactPatterns();
    expect(patterns).toContain("journal-*.log");
  });
});
