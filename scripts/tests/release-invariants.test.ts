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
 * Release invariant tests for the develop-to-master publish model.
 *
 * These tests exercise `determineReleaseAction` from
 * `scripts/release-state.ts` against fixture contexts representing
 * real CI scenarios.
 *
 * Covered scenarios:
 * - No-op: no changesets, all published, non-master branch
 * - Fresh release: unpublished packages, no prior publishes
 * - Already-published skip: changesets present but all on npm
 * - Partial rerun: some already published, some not → PUBLISH_ONLY_RERUN
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PUBLISHABLE_DIRS,
  type ReleaseContext,
  determineReleaseAction,
} from "../release-state.ts";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function loadPackageManifest(dir: string): { name: string; version: string } {
  const manifestPath = join(
    import.meta.dir,
    `../../packages/${dir}/package.json`,
  );
  const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  return { name: raw.name, version: raw.version };
}

// Derive package metadata from actual package.json files so tests stay
// future-proof across version bumps.
const ALL_PACKAGES: Record<string, { name: string; version: string }> = {};
for (const dir of PUBLISHABLE_DIRS) {
  ALL_PACKAGES[dir] = loadPackageManifest(dir);
}

/** Human-authored merge commit from develop → master */
const SOURCE_COMMIT_MSG =
  "Merge branch 'develop' into master\n\nIntegration of new schema features.";

/** A changeset file representing a minor bump for all four packages */
const FRESH_CHANGESETS = ["spotty-llamas-fly.md", "brave-tables-dance.md"];

/** No changeset files (only README.md remains in .changeset/) */
const NO_CHANGESETS: string[] = [];

/** Registry check where nothing is published yet */
const nothingPublished = (_name: string, _ver: string) => false;

/** Registry check where everything is already published */
const everythingPublished = (_name: string, _ver: string) => true;

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

// ===========================================================================
// Test suite
// ===========================================================================

describe("release invariants: develop-to-master model", () => {
  // -------------------------------------------------------------------------
  // 1. No-op on master with no pending changesets
  // -------------------------------------------------------------------------
  describe("no-op release", () => {
    test("returns NOOP when no changesets and all packages published", () => {
      const ctx = makeContext({
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: everythingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("NOOP");
      expect(decision.packages).toHaveLength(0);
      expect(decision.reason).toContain("No pending changesets");
    });

    test("returns NOOP when no changesets and no package info", () => {
      const ctx = makeContext({
        changesetFiles: NO_CHANGESETS,
        packages: {},
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("NOOP");
      expect(decision.packages).toHaveLength(0);
    });

    test("returns NOOP on non-master branch even with changesets", () => {
      const ctx = makeContext({ branch: "develop" });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("NOOP");
      expect(decision.reason).toContain("Not on master");
    });

    test("returns NOOP on feature branch", () => {
      const ctx = makeContext({ branch: "feature/cool-thing" });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("NOOP");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Fresh release for changesets authored on develop
  // -------------------------------------------------------------------------
  describe("fresh release (source commit + pending changesets)", () => {
    test("returns PREPARE_RELEASE for source commit with changesets", () => {
      const ctx = makeContext({
        commitMessage: SOURCE_COMMIT_MSG,
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("PREPARE_RELEASE");
      expect(decision.packages.length).toBeGreaterThan(0);
    });

    test("includes all four publishable packages", () => {
      const ctx = makeContext({
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      const dirs = decision.packages.map((p) => p.dir).sort();
      expect(dirs).toEqual(["cli", "codex", "core", "cursor", "mcp", "opencode"]);
    });

    test("captures the release-source SHA", () => {
      const sha = "deadbeef1234";
      const ctx = makeContext({
        sourceSha: sha,
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.sourceSha).toBe(sha);
    });

    test("marks all packages as unpublished when nothing is on npm", () => {
      const ctx = makeContext({
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      for (const pkg of decision.packages) {
        expect(pkg.alreadyPublished).toBe(false);
      }
    });

    test("reason mentions pending changesets", () => {
      const ctx = makeContext({
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.reason).toContain("pending changeset");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Already-published package skip
  // -------------------------------------------------------------------------
  describe("already-published package skip", () => {
    test("excludes already-published packages from publish set", () => {
      const published = new Set([
        `${ALL_PACKAGES.core.name}@${ALL_PACKAGES.core.version}`,
        `${ALL_PACKAGES.cli.name}@${ALL_PACKAGES.cli.version}`,
      ]);
      const ctx = makeContext({
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      const unpublishedDirs = decision.packages
        .filter((p) => !p.alreadyPublished)
        .map((p) => p.dir)
        .sort();
      expect(unpublishedDirs).toEqual(["codex", "cursor", "mcp", "opencode"]);
    });

    test("marks already-published packages correctly", () => {
      const published = new Set([
        `${ALL_PACKAGES.core.name}@${ALL_PACKAGES.core.version}`,
      ]);
      const ctx = makeContext({
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      const core = decision.packages.find((p) => p.dir === "core");
      expect(core?.alreadyPublished).toBe(true);

      const cli = decision.packages.find((p) => p.dir === "cli");
      expect(cli?.alreadyPublished).toBe(false);
    });

    test("returns ALREADY_PUBLISHED_NOOP when all packages are published", () => {
      const ctx = makeContext({
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: everythingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("ALREADY_PUBLISHED_NOOP");
      expect(decision.packages).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Partial rerun recovery
  // -------------------------------------------------------------------------
  describe("partial rerun (some packages published, some not)", () => {
    test("returns PUBLISH_ONLY_RERUN for partially published packages on source commit", () => {
      // Simulate: CI ran and published core+cli but codex+mcp+opencode failed.
      // Re-running the same source commit detects partial state.
      const published = new Set([
        `${ALL_PACKAGES.core.name}@${ALL_PACKAGES.core.version}`,
        `${ALL_PACKAGES.cli.name}@${ALL_PACKAGES.cli.version}`,
      ]);
      const ctx = makeContext({
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("PUBLISH_ONLY_RERUN");

      const toPublish = decision.packages
        .filter((p) => !p.alreadyPublished)
        .map((p) => p.dir)
        .sort();
      expect(toPublish).toEqual(["codex", "cursor", "mcp", "opencode"]);
    });

    test("returns PUBLISH_ONLY_RERUN when all published → ALREADY_PUBLISHED_NOOP", () => {
      const ctx = makeContext({
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: everythingPublished,
      });

      const decision = determineReleaseAction(ctx);

      // No changesets + all published = NOOP (not PUBLISH_ONLY_RERUN)
      expect(decision.action).toBe("NOOP");
    });

    test("source commit with changesets + partial publish returns PREPARE_RELEASE", () => {
      const published = new Set([
        `${ALL_PACKAGES.core.name}@${ALL_PACKAGES.core.version}`,
      ]);
      const ctx = makeContext({
        commitMessage: SOURCE_COMMIT_MSG,
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("PREPARE_RELEASE");

      const toPublish = decision.packages
        .filter((p) => !p.alreadyPublished)
        .map((p) => p.dir)
        .sort();
      expect(toPublish).toEqual(["cli", "codex", "cursor", "mcp", "opencode"]);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Fixture integrity checks
  // -------------------------------------------------------------------------
  describe("fixture integrity", () => {
    test("release-source SHA is explicit in every context", () => {
      const sha = "a1b2c3d4e5f6";
      const ctx = makeContext({ sourceSha: sha });

      const decision = determineReleaseAction(ctx);

      expect(decision.sourceSha).toBe(sha);
    });

    test("all four publishable package dirs are represented", () => {
      const ctx = makeContext({});
      const dirs = Object.keys(ctx.packages).sort();
      expect(dirs).toEqual(["cli", "codex", "core", "cursor", "mcp", "opencode"]);
    });

    test("changeset fixtures are valid .md filenames", () => {
      for (const f of FRESH_CHANGESETS) {
        expect(f.endsWith(".md")).toBe(true);
        expect(f).not.toBe("README.md");
      }
    });
  });
});
