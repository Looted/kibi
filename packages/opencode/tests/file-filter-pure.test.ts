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
  getKbExistenceTargets,
  loadKbSyncPaths,
  shouldHandleFile,
  stripToRoot,
} from "../src/file-filter.js";

describe("stripToRoot", () => {
  test("returns root directory from glob pattern", () => {
    expect(stripToRoot("docs/**/*.md")).toBe("docs");
  });

  test("returns root from nested glob", () => {
    expect(stripToRoot("src/components/**/*.tsx")).toBe("src/components");
  });

  test("handles single star glob", () => {
    expect(stripToRoot("*.md")).toBe(".");
  });

  test("handles multiple glob segments", () => {
    expect(stripToRoot("a/b/c/**/*.md")).toBe("a/b/c");
  });

  test("returns path without glob unchanged", () => {
    expect(stripToRoot("docs/readme.md")).toBe("docs/readme.md");
  });

  test("handles question mark glob", () => {
    expect(stripToRoot("docs/file?.md")).toBe("docs");
  });

  test("handles bracket glob", () => {
    expect(stripToRoot("docs/[abc].md")).toBe("docs");
  });

  test("handles empty string", () => {
    expect(stripToRoot("")).toBe(".");
  });

  test("handles dot", () => {
    expect(stripToRoot(".")).toBe(".");
  });
});

describe("loadKbSyncPaths", () => {
  test("returns default paths when no config exists", () => {
    const paths = loadKbSyncPaths("/nonexistent");
    expect(paths.requirements).toBe("documentation/requirements/**/*.md");
    expect(paths.scenarios).toBe("documentation/scenarios/**/*.md");
    expect(paths.tests).toBe("documentation/tests/**/*.md");
    expect(paths.adr).toBe("documentation/adr/**/*.md");
    expect(paths.flags).toBe("documentation/flags/**/*.md");
    expect(paths.events).toBe("documentation/events/**/*.md");
    expect(paths.facts).toBe("documentation/facts/**/*.md");
    expect(paths.symbols).toBe("documentation/symbols.yaml");
  });
});

describe("getKbExistenceTargets", () => {
  test("returns targets for default paths", () => {
    const targets = getKbExistenceTargets("/nonexistent");

    // Check that we get targets for all expected keys
    const keys = targets.map((t) => t.key);
    expect(keys).toContain("requirements");
    expect(keys).toContain("scenarios");
    expect(keys).toContain("tests");
    expect(keys).toContain("adr");
    expect(keys).toContain("flags");
    expect(keys).toContain("events");
    expect(keys).toContain("facts");
    expect(keys).toContain("symbols");
  });

  test("symbols target is a file", () => {
    const targets = getKbExistenceTargets("/nonexistent");
    const symbols = targets.find((t) => t.key === "symbols");
    expect(symbols).toBeDefined();
    expect(symbols?.kind).toBe("file");
    expect(symbols?.relativePath).toBe("documentation/symbols.yaml");
  });

  test("requirements target is a directory", () => {
    const targets = getKbExistenceTargets("/nonexistent");
    const reqs = targets.find((t) => t.key === "requirements");
    expect(reqs).toBeDefined();
    expect(reqs?.kind).toBe("dir");
    expect(reqs?.relativePath).toBe("documentation/requirements");
  });

  test("all directory targets have dir kind", () => {
    const targets = getKbExistenceTargets("/nonexistent");
    const dirTargets = targets.filter((t) => t.kind === "dir");
    expect(dirTargets.length).toBeGreaterThan(0);

    for (const target of dirTargets) {
      expect(target.relativePath).not.toContain("*");
      expect(target.relativePath).not.toContain("?");
    }
  });
});

describe("shouldHandleFile", () => {
  test("returns true for requirements markdown files", () => {
    expect(shouldHandleFile("documentation/requirements/REQ-001.md")).toBe(
      true,
    );
  });

  test("returns true for scenarios markdown files", () => {
    expect(shouldHandleFile("documentation/scenarios/SCEN-001.md")).toBe(true);
  });

  test("returns true for tests markdown files", () => {
    expect(shouldHandleFile("documentation/tests/TEST-001.md")).toBe(true);
  });

  test("returns true for ADR markdown files", () => {
    expect(shouldHandleFile("documentation/adr/ADR-001.md")).toBe(true);
  });

  test("returns true for symbols yaml file", () => {
    expect(shouldHandleFile("documentation/symbols.yaml")).toBe(true);
  });

  test("returns false for files in .kb directory", () => {
    expect(shouldHandleFile(".kb/config.json")).toBe(false);
  });

  test("returns false for files in .git directory", () => {
    expect(shouldHandleFile(".git/config")).toBe(false);
  });

  test("returns false for node_modules", () => {
    expect(shouldHandleFile("node_modules/lodash/index.js")).toBe(false);
  });

  test("returns false for dist directory", () => {
    expect(shouldHandleFile("dist/index.js")).toBe(false);
  });

  test("returns false for coverage directory", () => {
    expect(shouldHandleFile("coverage/lcov.info")).toBe(false);
  });

  test("returns false for backup files", () => {
    expect(shouldHandleFile("file.md~")).toBe(false);
    expect(shouldHandleFile("~file.md")).toBe(false);
  });

  test("returns false for swap files", () => {
    expect(shouldHandleFile(".file.md.swp")).toBe(false);
    expect(shouldHandleFile("file.swo")).toBe(false);
  });

  test("returns false for DS_Store", () => {
    expect(shouldHandleFile(".DS_Store")).toBe(false);
  });

  test("returns false for non-markdown files", () => {
    expect(shouldHandleFile("src/index.ts")).toBe(false);
  });

  test("handles absolute paths", () => {
    const absPath = "/home/user/project/documentation/requirements/REQ-001.md";
    expect(shouldHandleFile(absPath, "/home/user/project")).toBe(true);
  });

});
