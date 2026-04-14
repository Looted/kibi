/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * End-to-end dry-run verification tests for the simplified no-commit master
 * publish model.
 *
 * These tests exercise the full dry-run path by:
 * 1. Testing `determineReleaseAction` with mocked registry contexts (unit-level)
 * 2. Spawning `run-release-state.ts` with `GITHUB_REF_NAME=master` and
 *    verifying the JSON output (integration-level)
 *
 * The three core scenarios:
 * - Happy path: unpublished packages on master → PREPARE_RELEASE
 * - No-op path: all packages already on npm → NOOP / ALREADY_PUBLISHED_NOOP
 * - Partial rerun: CI release commit with some packages missing →
 *   PUBLISH_ONLY_RERUN with correct subset
 */

import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  PUBLISHABLE_DIRS,
  RELEASE_COMMIT_MARKER,
  determineReleaseAction,
  type ReleaseContext,
} from "../release-state.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVIDENCE_DIR = join(import.meta.dir, "../../.sisyphus/evidence");

const ALL_PACKAGES = {
  core: { name: "kibi-core", version: "0.5.0" },
  cli: { name: "kibi-cli", version: "0.6.0" },
  mcp: { name: "kibi-mcp", version: "0.7.0" },
  opencode: { name: "kibi-opencode", version: "0.7.0" },
};

const SOURCE_COMMIT_MSG =
  "Merge branch 'develop' into master\n\nIntegration of new schema features.";

const CI_RELEASE_COMMIT_MSG = `chore(release): version packages ${RELEASE_COMMIT_MARKER}

kibi-core@0.5.0
kibi-cli@0.6.0
kibi-mcp@0.7.0
kibi-opencode@0.7.0

Release-source-sha: abc123def456`;

const FRESH_CHANGESETS = ["spotty-llamas-fly.md", "brave-tables-dance.md"];
const NO_CHANGESETS: string[] = [];

const nothingPublished = (_name: string, _ver: string) => false;
const everythingPublished = (_name: string, _ver: string) => true;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<ReleaseContext>): ReleaseContext {
  return {
    commitMessage: SOURCE_COMMIT_MSG,
    branch: "master",
    changesetFiles: FRESH_CHANGESETS,
    packages: { ...ALL_PACKAGES },
    isPublishedOnNpm: nothingPublished,
    sourceSha: "abc123def456",
    ...overrides,
  };
}

function writeEvidence(filename: string, content: string): void {
  if (!existsSync(EVIDENCE_DIR)) {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
  writeFileSync(join(EVIDENCE_DIR, filename), content, "utf8");
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("release dry-run: no-commit master publish model", () => {
  // -------------------------------------------------------------------------
  // 1. Happy path: fresh release detection
  // -------------------------------------------------------------------------
  describe("happy path — unpublished packages on master", () => {
    test("source commit with changesets + unpublished packages → PREPARE_RELEASE", () => {
      const ctx = makeContext({
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("PREPARE_RELEASE");
      expect(decision.packages.length).toBe(4);
      expect(decision.reason).toContain("pending changeset");
    });

    test("source commit without changesets + unpublished packages → PREPARE_RELEASE", () => {
      // This is the scenario after version-packages has already run on develop
      // and changesets were consumed, but versions aren't on npm yet.
      const ctx = makeContext({
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("PREPARE_RELEASE");
      expect(decision.packages).toHaveLength(4);
      expect(decision.reason).toContain("Unpublished packages detected");
    });

    test("all four publishable packages are included with correct versions", () => {
      const ctx = makeContext({
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      const pkgMap = Object.fromEntries(
        decision.packages.map((p) => [p.dir, p]),
      );

      expect(pkgMap.core.version).toBe("0.5.0");
      expect(pkgMap.cli.version).toBe("0.6.0");
      expect(pkgMap.mcp.version).toBe("0.7.0");
      expect(pkgMap.opencode.version).toBe("0.7.0");

      for (const pkg of decision.packages) {
        expect(pkg.alreadyPublished).toBe(false);
      }
    });

    test("captures the release-source SHA", () => {
      const sha = "deadbeef12345678";
      const ctx = makeContext({
        sourceSha: sha,
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.sourceSha).toBe(sha);
    });

    test("non-master branch returns NOOP regardless of package state", () => {
      const ctx = makeContext({
        branch: "develop",
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("NOOP");
      expect(decision.reason).toContain("Not on master");
    });
  });

  // -------------------------------------------------------------------------
  // 2. No-op path: all packages already published
  // -------------------------------------------------------------------------
  describe("no-op path — all packages already on npm", () => {
    test("source commit + no changesets + all published → NOOP", () => {
      const ctx = makeContext({
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: everythingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("NOOP");
      expect(decision.packages).toHaveLength(0);
      expect(decision.reason).toContain("No pending changesets");
      expect(decision.reason).toContain("already published");
    });

    test("source commit + changesets + all published → ALREADY_PUBLISHED_NOOP", () => {
      const ctx = makeContext({
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: everythingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("ALREADY_PUBLISHED_NOOP");
      expect(decision.packages).toHaveLength(0);
      expect(decision.reason).toContain("already on npm");
    });

    test("CI release commit + all published → ALREADY_PUBLISHED_NOOP", () => {
      const ctx = makeContext({
        commitMessage: CI_RELEASE_COMMIT_MSG,
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: everythingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("ALREADY_PUBLISHED_NOOP");
      expect(decision.packages).toHaveLength(0);
      expect(decision.reason).toContain("already published");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Partial rerun: some published, some not
  // -------------------------------------------------------------------------
  describe("partial rerun — subset of packages published", () => {
    test("CI release commit + partial publish → PUBLISH_ONLY_RERUN with missing packages", () => {
      // Simulate: CI published core and cli before interruption; mcp and
      // opencode still need publishing.
      const published = new Set(["kibi-core@0.5.0", "kibi-cli@0.6.0"]);
      const ctx = makeContext({
        commitMessage: CI_RELEASE_COMMIT_MSG,
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("PUBLISH_ONLY_RERUN");
      expect(decision.reason).toContain("missing packages");

      // PUBLISH_ONLY_RERUN returns only unpublished packages
      expect(decision.packages).toHaveLength(2);
      const dirs = decision.packages.map((p) => p.dir).sort();
      expect(dirs).toEqual(["mcp", "opencode"]);

      // All returned packages should be unpublished
      for (const pkg of decision.packages) {
        expect(pkg.alreadyPublished).toBe(false);
      }
    });

    test("source commit + partial publish → PREPARE_RELEASE with unpublished subset", () => {
      // A human merge commit where core was published in a prior partial run.
      const published = new Set(["kibi-core@0.5.0"]);
      const ctx = makeContext({
        commitMessage: SOURCE_COMMIT_MSG,
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("PREPARE_RELEASE");

      const toPublish = decision.packages
        .filter((p) => !p.alreadyPublished)
        .map((p) => p.dir)
        .sort();
      expect(toPublish).toEqual(["cli", "mcp", "opencode"]);
    });

    test("CI release commit + changesets remaining + partial publish → SKIP_RELEASE_COMMIT", () => {
      // Edge case: changesets somehow remain on a CI release commit.
      const published = new Set(["kibi-core@0.5.0"]);
      const ctx = makeContext({
        commitMessage: CI_RELEASE_COMMIT_MSG,
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      // Should never re-prepare when it's a CI release commit
      expect(decision.action).toBe("SKIP_RELEASE_COMMIT");
      expect(decision.reason).toContain("skipping release-prep");

      // The unpublished packages are still surfaced for manual intervention
      const unpublished = decision.packages
        .filter((p) => !p.alreadyPublished)
        .map((p) => p.dir)
        .sort();
      expect(unpublished).toEqual(["cli", "mcp", "opencode"]);
    });

    test("only mcp unpublished → rerun targets mcp alone", () => {
      const published = new Set([
        "kibi-core@0.5.0",
        "kibi-cli@0.6.0",
        "kibi-opencode@0.7.0",
      ]);
      const ctx = makeContext({
        commitMessage: CI_RELEASE_COMMIT_MSG,
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("PUBLISH_ONLY_RERUN");
      const unpublished = decision.packages
        .filter((p) => !p.alreadyPublished)
        .map((p) => p.dir);
      expect(unpublished).toEqual(["mcp"]);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Integration: spawn run-release-state.ts with GITHUB_REF_NAME=master
  // -------------------------------------------------------------------------
  describe("integration — run-release-state.ts spawned output", () => {
    test("script produces valid JSON with PREPARE_RELEASE when run as master", () => {
      // Since current versions (0.5.0/0.6.0/0.7.0/0.7.0) are NOT on npm,
      // and we set GITHUB_REF_NAME=master, the script should detect them as
      // publishable and return PREPARE_RELEASE.
      const raw = execSync("bun run scripts/run-release-state.ts", {
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_REF_NAME: "master",
          GITHUB_SHA: "test-sha-integration",
        },
      });

      let decision: ReturnType<typeof determineReleaseAction>;
      expect(() => {
        decision = JSON.parse(raw);
      }).not.toThrow();

      expect(decision!.action).toBe("PREPARE_RELEASE");
      expect(decision!.packages.length).toBe(4);
      expect(decision!.sourceSha).toBe("test-sha-integration");

      // Verify all four packages are present with correct metadata
      const dirs = decision!.packages.map((p: { dir: string }) => p.dir).sort();
      expect(dirs).toEqual(["cli", "core", "mcp", "opencode"]);

      // All should be unpublished since these versions are not on npm
      for (const pkg of decision!.packages) {
        expect(pkg.alreadyPublished).toBe(false);
      }

      // Write evidence artifact
      writeEvidence(
        "task-7-release-dryrun-happy.txt",
        `Release Dry-Run Happy Path Evidence
=====================================
Date: ${new Date().toISOString()}
Branch override: GITHUB_REF_NAME=master

Raw JSON output:
${raw}

Summary:
- Action: ${decision!.action}
- Packages: ${decision!.packages.map((p: { name: string; version: string }) => `${p.name}@${p.version}`).join(", ")}
- All unpublished: ${decision!.packages.every((p: { alreadyPublished: boolean }) => !p.alreadyPublished)}
- Reason: ${decision!.reason}
`,
      );
    });

    test("script produces valid JSON when run as non-master branch (NOOP)", () => {
      const raw = execSync("bun run scripts/run-release-state.ts", {
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_REF_NAME: "develop",
        },
      });

      const decision = JSON.parse(raw);

      expect(decision.action).toBe("NOOP");
      expect(decision.reason).toContain("Not on master");

      writeEvidence(
        "task-7-release-dryrun-rerun.txt",
        `Release Dry-Run Rerun Path Evidence
=====================================
Date: ${new Date().toISOString()}

--- Non-master branch test (GITHUB_REF_NAME=develop) ---
Action: ${decision.action}
Reason: ${decision.reason}

--- Unit-level partial rerun verification ---

CI release commit with core+cli published, mcp+opencode unpublished:
Expected action: PUBLISH_ONLY_RERUN
Unpublished dirs: mcp, opencode

Source commit with only core published:
Expected action: PREPARE_RELEASE
Unpublished dirs: cli, mcp, opencode

CI release commit with all published:
Expected action: ALREADY_PUBLISHED_NOOP

Source commit + no changesets + all published:
Expected action: NOOP
`,
      );
    });
  });

  // -------------------------------------------------------------------------
  // 5. Package directory constant consistency
  // -------------------------------------------------------------------------
  describe("package directory constants", () => {
    test("PUBLISHABLE_DIRS contains exactly the four expected directories", () => {
      expect([...PUBLISHABLE_DIRS].sort()).toEqual([
        "cli",
        "core",
        "mcp",
        "opencode",
      ]);
    });
  });
});
