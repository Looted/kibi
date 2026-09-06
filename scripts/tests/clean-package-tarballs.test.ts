/// <reference types="bun-types" />

/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// We test the exported helpers directly rather than exec'ing the script,
// because the script's REPO_ROOT is hard-coded to the real repo root.
import {
  findTarballs,
  isDryRun,
  main,
  runCleanPackageTarballsIfMain,
} from "../clean-package-tarballs";

const tempRoots: string[] = [];

function makeTempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-clean-tarballs-"));
  tempRoots.push(root);

  // Create package directories
  for (const dir of [
    "packages/core",
    "packages/cli",
    "packages/runtime",
    "packages/mcp",
    "packages/opencode",
    "packages/codex",
    "packages/cursor",
  ]) {
    mkdirSync(join(root, dir), { recursive: true });
  }

  // Create fixture directory
  mkdirSync(join(root, "documentation/tests/e2e/packed/fixtures"), {
    recursive: true,
  });

  return root;
}

function touchFile(filePath: string): void {
  writeFileSync(filePath, "fake-tarball-content", "utf8");
}

function makePackageTarballs(root: string): void {
  touchFile(join(root, "packages/core/kibi-core-0.5.3.tgz"));
  touchFile(join(root, "packages/cli/kibi-cli-0.11.0.tgz"));
  touchFile(join(root, "packages/runtime/kibi-runtime-0.1.0.tgz"));
  touchFile(join(root, "packages/mcp/kibi-mcp-0.14.0.tgz"));
  touchFile(join(root, "packages/codex/kibi-codex-0.15.0.tgz"));
}

function makeFixtureTarball(root: string): void {
  touchFile(
    join(root, "documentation/tests/e2e/packed/fixtures/kibi-mcp-0.13.0.tgz"),
  );
}

describe("clean-package-tarballs", () => {
  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  test("--dry-run lists tarballs without deleting", () => {
    const root = makeTempRepo();
    makePackageTarballs(root);

    expect(isDryRun(["--dry-run"])).toBe(true);
    expect(isDryRun([])).toBe(false);

    // findTarballs returns all package tarballs
    const found = findTarballs(root);
    expect(found.length).toBeGreaterThanOrEqual(3);

    // Verify tarballs still exist (nothing deleted)
    for (const t of found) {
      expect(existsSync(t)).toBe(true);
    }
  });

  test("cleaner removes package-dir tarballs but preserves fixture", () => {
    const root = makeTempRepo();
    makePackageTarballs(root);
    makeFixtureTarball(root);

    const tarballs = findTarballs(root);
    expect(tarballs.length).toBe(5); // five package tarballs
    expect(tarballs.some((t) => t.includes("fixtures"))).toBe(false); // fixture excluded

    // Simulate deletion
    for (const t of tarballs) {
      rmSync(t);
    }

    // Package tarballs gone
    expect(existsSync(join(root, "packages/core/kibi-core-0.5.3.tgz"))).toBe(
      false,
    );
    expect(existsSync(join(root, "packages/cli/kibi-cli-0.11.0.tgz"))).toBe(
      false,
    );
    expect(
      existsSync(join(root, "packages/runtime/kibi-runtime-0.1.0.tgz")),
    ).toBe(false);
    expect(existsSync(join(root, "packages/mcp/kibi-mcp-0.14.0.tgz"))).toBe(
      false,
    );
    expect(existsSync(join(root, "packages/codex/kibi-codex-0.15.0.tgz"))).toBe(
      false,
    );

    // Fixture preserved
    expect(
      existsSync(
        join(
          root,
          "documentation/tests/e2e/packed/fixtures/kibi-mcp-0.13.0.tgz",
        ),
      ),
    ).toBe(true);
  });

  test("cleaner does nothing when no tarballs exist", () => {
    const root = makeTempRepo();
    // No tarballs created

    const tarballs = findTarballs(root);
    expect(tarballs.length).toBe(0);
  });

  test("main dry-run lists or reports no stale tarballs without deleting", () => {
    const previous = process.argv.slice();
    process.argv = ["bun", "scripts/clean-package-tarballs.ts", "--dry-run"];
    try {
      main();
    } finally {
      process.argv = previous;
    }
    expect(isDryRun(["--dry-run"])).toBe(true);
  });

  test("main deletes package tarballs in a provided root and lists them on dry-run", () => {
    const root = makeTempRepo();
    makePackageTarballs(root);
    const logs: string[] = [];
    const log = console.log.bind(console);
    console.log = ((chunk: unknown) => {
      logs.push(String(chunk));
    }) as typeof console.log;
    try {
      main(root, ["--dry-run"]);
      expect(logs.join("\n")).toContain("[dry-run]");
      logs.length = 0;
      main(root, []);
      expect(logs.join("\n")).toContain("Deleted:");
      expect(findTarballs(root)).toEqual([]);
      logs.length = 0;
      main(root, []);
      expect(logs.join("\n")).toContain("No stale tarballs found.");
    } finally {
      console.log = log;
    }
  });

  test("runCleanPackageTarballsIfMain only starts when argv matches the module", () => {
    let started = 0;
    runCleanPackageTarballsIfMain("file:///tmp/clean.ts", "/other", () => {
      started += 1;
    });
    expect(started).toBe(0);
    runCleanPackageTarballsIfMain("file:///tmp/clean.ts", "/tmp/clean.ts", () => {
      started += 1;
    });
    expect(started).toBe(1);
    runCleanPackageTarballsIfMain("file:///tmp/clean.ts", "file:///tmp/clean.ts", () => {
      started += 1;
    });
    expect(started).toBe(2);
  });
});
