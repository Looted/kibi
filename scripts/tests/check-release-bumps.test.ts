/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  type BumpInputs,
  findMissingBumps,
  isShippedPath,
  main,
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

describe("release bump guard command", () => {
  const roots: string[] = [];
  const previousExitCode = process.exitCode;

  afterEach(() => {
    process.exitCode = previousExitCode ?? 0;
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function write(root: string, file: string, text: string): void {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }

  function git(root: string, ...args: string[]): void {
    execFileSync("git", args, { cwd: root, stdio: "ignore" });
  }

  /** A repository whose `base` tag has kibi-core 0.28.0 and kibi-cli 2.39.0. */
  function repository(): string {
    const root = mkdtempSync(join(tmpdir(), "kibi-release-bumps-"));
    roots.push(root);
    git(root, "init", "-q");
    git(root, "config", "user.email", "test@example.com");
    git(root, "config", "user.name", "Test");
    write(root, "packages/core/package.json", '{"version":"0.28.0"}');
    write(root, "packages/cli/package.json", '{"version":"2.39.0"}');
    write(root, ".changeset/README.md", "# Changesets\n");
    write(root, ".changeset/config.json", "{}");
    git(root, "add", ".");
    git(root, "commit", "-q", "-m", "base");
    git(root, "tag", "base");
    return root;
  }

  function commit(root: string): void {
    git(root, "add", ".");
    git(root, "commit", "-q", "-m", "change");
  }

  function run(root: string, argv: string[] = ["--base", "base"]) {
    const out: string[] = [];
    const err: string[] = [];
    const stdout = spyOn(process.stdout, "write").mockImplementation(
      (chunk) => {
        out.push(String(chunk));
        return true;
      },
    );
    const stderr = spyOn(process.stderr, "write").mockImplementation(
      (chunk) => {
        err.push(String(chunk));
        return true;
      },
    );
    try {
      main(argv, { cwd: root, packages: [core, cli] });
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
    return {
      stdout: out.join(""),
      stderr: err.join(""),
      exitCode: process.exitCode,
    };
  }

  test("passes when every changed package is bumped or has a changeset", () => {
    const root = repository();
    write(root, "packages/core/src/a.pl", "a.\n");
    write(root, "packages/core/package.json", '{"version":"0.28.1"}');
    write(root, "packages/cli/src/b.ts", "export {};\n");
    write(root, ".changeset/cli.md", '---\n"kibi-cli": patch\n---\n\nFix.\n');
    commit(root);
    process.exitCode = 0;
    const result = run(root);
    expect(result.stdout).toContain(
      "every changed publishable package is bumped",
    );
    expect(result.stdout).toContain("(base base)");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("lists the first ten unbumped files and fails", () => {
    const root = repository();
    for (let index = 0; index < 12; index++) {
      write(
        root,
        `packages/core/src/file-${String(index).padStart(2, "0")}.pl`,
        "a.\n",
      );
    }
    commit(root);
    const result = run(root);
    expect(result.stderr).toContain(
      "kibi-core@0.28.0 changed since base but has no version bump and no pending changeset:",
    );
    expect(result.stderr).toContain("  packages/core/src/file-00.pl\n");
    expect(result.stderr).toContain("  packages/core/src/file-09.pl\n");
    expect(result.stderr).not.toContain("file-10.pl");
    expect(result.stderr).toContain("  … and 2 more\n");
    expect(result.stderr).toContain("Add the package to a changeset");
    expect(result.exitCode).toBe(1);
  });

  test("names every unbumped file when there are ten or fewer", () => {
    const root = repository();
    write(root, "packages/cli/src/only.ts", "export {};\n");
    commit(root);
    const result = run(root);
    expect(result.stderr).toContain("kibi-cli@2.39.0 changed since base");
    expect(result.stderr).toContain("  packages/cli/src/only.ts\n");
    expect(result.stderr).not.toContain("more");
    expect(result.exitCode).toBe(1);
  });

  test("treats a package missing at the base as new", () => {
    const root = repository();
    write(root, "packages/fresh/package.json", '{"version":"1.0.0"}');
    write(root, "packages/fresh/src/index.ts", "export {};\n");
    commit(root);
    const fresh = { dir: "fresh", npmName: "kibi-fresh" };
    const out: string[] = [];
    const stdout = spyOn(process.stdout, "write").mockImplementation(
      (chunk) => {
        out.push(String(chunk));
        return true;
      },
    );
    try {
      main(["--base", "base"], { cwd: root, packages: [fresh] });
    } finally {
      stdout.mockRestore();
    }
    expect(out.join("")).toContain(
      "every changed publishable package is bumped",
    );
  });

  test("guards every publishable package of the catalog by default", () => {
    const repository = join(import.meta.dir, "..", "..");
    const out: string[] = [];
    const stdout = spyOn(process.stdout, "write").mockImplementation(
      (chunk) => {
        out.push(String(chunk));
        return true;
      },
    );
    try {
      // HEAD against itself: nothing changed, so every package passes.
      main(["--base", "HEAD"], { cwd: repository });
    } finally {
      stdout.mockRestore();
    }
    expect(out.join("")).toContain("(base HEAD)");
  });

  test("requires a ref after --base", () => {
    expect(() => main(["--base"], { cwd: tmpdir() })).toThrow(
      "--base requires a git ref",
    );
  });
});
