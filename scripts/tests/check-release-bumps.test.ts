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
  type BumpInputs,
  findMissingBumps,
  isShippedPath,
  parseChangesetPackages,
} from "../check-release-bumps.ts";

const core = { dir: "core", npmName: "kibi-core" };
const cli = { dir: "cli", npmName: "kibi-cli" };

function inputs(overrides: Partial<BumpInputs>): BumpInputs {
  return {
    packages: [core, cli],
    changedFiles: [],
    baseVersions: new Map([
      ["kibi-core", "0.28.0"],
      ["kibi-cli", "2.39.0"],
    ]),
    headVersions: new Map([
      ["kibi-core", "0.28.0"],
      ["kibi-cli", "2.39.0"],
    ]),
    changesetPackages: new Set(),
    ...overrides,
  };
}

describe("release bump guard", () => {
  test("flags a changed package with no bump and no changeset", () => {
    const missing = findMissingBumps(
      inputs({
        changedFiles: [
          "packages/core/src/rule_registry.pl",
          "packages/cli/src/index.ts",
        ],
        changesetPackages: new Set(["kibi-cli"]),
      }),
    );
    expect(missing).toEqual([
      {
        npmName: "kibi-core",
        version: "0.28.0",
        files: ["packages/core/src/rule_registry.pl"],
      },
    ]);
  });

  test("accepts a version bump without a changeset", () => {
    const missing = findMissingBumps(
      inputs({
        changedFiles: ["packages/core/src/rule_registry.pl"],
        headVersions: new Map([
          ["kibi-core", "0.29.0"],
          ["kibi-cli", "2.39.0"],
        ]),
      }),
    );
    expect(missing).toEqual([]);
  });

  test("skips new packages and test-only changes", () => {
    const missing = findMissingBumps(
      inputs({
        changedFiles: [
          "packages/core/tests/registry.test.ts",
          "packages/core/CHANGELOG.md",
          "packages/cli/src/foo.test.ts",
        ],
        baseVersions: new Map([["kibi-core", "0.28.0"]]),
      }),
    );
    expect(missing).toEqual([]);
  });

  test("classifies shipped paths", () => {
    expect(isShippedPath("src/rule_registry.pl")).toBe(true);
    expect(isShippedPath("schema/rule-registry.json")).toBe(true);
    expect(isShippedPath("tests/a.ts")).toBe(false);
    expect(isShippedPath("src/__tests__/a.ts")).toBe(false);
    expect(isShippedPath("src/a.spec.mjs")).toBe(false);
    expect(isShippedPath("tsconfig.build.json")).toBe(false);
  });

  test("reads package names from changeset front matter", () => {
    const md = `---\n"kibi-core": minor\n'kibi-cli': patch\nkibi-mcp: major\n---\n\nBody "kibi-x": patch\n`;
    expect(parseChangesetPackages(md)).toEqual([
      "kibi-core",
      "kibi-cli",
      "kibi-mcp",
    ]);
    expect(parseChangesetPackages("no front matter")).toEqual([]);
  });
});
