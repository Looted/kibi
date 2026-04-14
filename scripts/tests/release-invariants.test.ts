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
 * These tests codify the desired release decisions BEFORE the workflow
 * and helper are updated. They exercise `determineReleaseAction` from
 * `scripts/release-state.ts` against fixture contexts representing
 * real CI scenarios.
 *
 * Expected test status:
 * - PASS: no-op, fresh release, already-published skip
 * - FAIL: recursion guard, partial rerun (these expose invariant gaps
 *   in the current pre-fix implementation)
 */

import { describe, expect, test } from "bun:test";
import {
  RELEASE_COMMIT_MARKER,
  determineReleaseAction,
  type ReleaseContext,
} from "../release-state.ts";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const ALL_PACKAGES = {
  core: { name: "kibi-core", version: "0.5.0" },
  cli: { name: "kibi-cli", version: "0.6.0" },
  mcp: { name: "kibi-mcp", version: "0.7.0" },
  opencode: { name: "kibi-opencode", version: "0.7.0" },
};

/** Human-authored merge commit from develop → master */
const SOURCE_COMMIT_MSG =
  "Merge branch 'develop' into master\n\nIntegration of new schema features.";

/** CI-authored release commit (includes the stable marker) */
const CI_RELEASE_COMMIT_MSG = `chore(release): version packages ${RELEASE_COMMIT_MARKER}

kibi-core@0.5.0
kibi-cli@0.6.0
kibi-mcp@0.7.0
kibi-opencode@0.7.0

Release-source-sha: abc123def456`;

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
      expect(dirs).toEqual(["cli", "core", "mcp", "opencode"]);
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
  // 3. Recursion guard for CI-authored release commits on master
  // -------------------------------------------------------------------------
  describe("recursion guard (CI release commit must not re-prepare)", () => {
    test("DESIRED: CI release commit returns SKIP_RELEASE_COMMIT, not PREPARE_RELEASE", () => {
      const ctx = makeContext({
        commitMessage: CI_RELEASE_COMMIT_MSG,
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      // The CI release commit contains the [kibi-release] marker.
      // The desired behavior is to NOT re-run version-packages.
      // CURRENT BUG: returns PREPARE_RELEASE instead of SKIP_RELEASE_COMMIT.
      expect(decision.action).toBe("SKIP_RELEASE_COMMIT");
    });

    test("DESIRED: CI release commit with no changesets also skips", () => {
      const ctx = makeContext({
        commitMessage: CI_RELEASE_COMMIT_MSG,
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      // Even without changesets, a CI release commit should not
      // trigger PREPARE_RELEASE — it should indicate publish-only
      // or skip.
      expect(decision.action).not.toBe("PREPARE_RELEASE");
    });

    test("release commit marker is present in CI commit fixture", () => {
      expect(CI_RELEASE_COMMIT_MSG).toContain(RELEASE_COMMIT_MARKER);
    });

    test("source commit does NOT contain release marker", () => {
      expect(SOURCE_COMMIT_MSG).not.toContain(RELEASE_COMMIT_MARKER);
    });

    test("DESIRED: helper detects release marker in commit message", () => {
      // This tests that the helper should parse the commit message
      // for the release marker. Currently it does not.
      const ctx = makeContext({
        commitMessage: CI_RELEASE_COMMIT_MSG,
        changesetFiles: FRESH_CHANGESETS,
      });

      const decision = determineReleaseAction(ctx);

      // If the helper respected the marker, it would NOT say PREPARE_RELEASE
      // for a CI-authored commit. This assertion codifies the gap.
      const isReleaseCommit = ctx.commitMessage.includes(RELEASE_COMMIT_MARKER);
      expect(isReleaseCommit).toBe(true);

      // The decision should reflect awareness of the marker:
      expect(decision.action).not.toBe("PREPARE_RELEASE");
    });
  });

  // -------------------------------------------------------------------------
  // 4. Already-published package skip
  // -------------------------------------------------------------------------
  describe("already-published package skip", () => {
    test("excludes already-published packages from publish set", () => {
      const published = new Set(["kibi-core@0.5.0", "kibi-cli@0.6.0"]);
      const ctx = makeContext({
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      const unpublishedDirs = decision.packages
        .filter((p) => !p.alreadyPublished)
        .map((p) => p.dir)
        .sort();
      expect(unpublishedDirs).toEqual(["mcp", "opencode"]);
    });

    test("marks already-published packages correctly", () => {
      const published = new Set(["kibi-core@0.5.0"]);
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
  // 5. Partial rerun recovery
  // -------------------------------------------------------------------------
  describe("partial rerun (some packages published, some not)", () => {
    test("DESIRED: CI release commit rerun returns PUBLISH_ONLY_RERUN for missing packages", () => {
      // Simulate: CI release commit was pushed, but only core and cli
      // were published before the job was interrupted. mcp and opencode
      // still need publishing.
      const published = new Set(["kibi-core@0.5.0", "kibi-cli@0.6.0"]);
      const ctx = makeContext({
        commitMessage: CI_RELEASE_COMMIT_MSG,
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      // DESIRED: should return PUBLISH_ONLY_RERUN (not PREPARE_RELEASE)
      // because this is a rerun of a CI release commit.
      expect(decision.action).toBe("PUBLISH_ONLY_RERUN");

      const toPublish = decision.packages
        .filter((p) => !p.alreadyPublished)
        .map((p) => p.dir)
        .sort();
      expect(toPublish).toEqual(["mcp", "opencode"]);
    });

    test("DESIRED: CI release commit rerun with all published returns ALREADY_PUBLISHED_NOOP", () => {
      const ctx = makeContext({
        commitMessage: CI_RELEASE_COMMIT_MSG,
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: everythingPublished,
      });

      const decision = determineReleaseAction(ctx);

      // All packages already published on a CI release commit rerun
      // should be a clean no-op.
      expect(decision.action).toBe("ALREADY_PUBLISHED_NOOP");
    });

    test("DESIRED: source commit with partially published packages still returns PREPARE_RELEASE", () => {
      // A human merge commit where some packages were published in a
      // previous partial run should still trigger PREPARE_RELEASE because
      // it's a source commit, not a CI commit.
      const published = new Set(["kibi-core@0.5.0"]);
      const ctx = makeContext({
        commitMessage: SOURCE_COMMIT_MSG,
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      // Source commit: should prepare release even if some packages
      // are already on npm. The publish step will skip them.
      expect(decision.action).toBe("PREPARE_RELEASE");

      const toPublish = decision.packages
        .filter((p) => !p.alreadyPublished)
        .map((p) => p.dir)
        .sort();
      expect(toPublish).toEqual(["cli", "mcp", "opencode"]);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Fixture integrity checks
  // -------------------------------------------------------------------------
  describe("fixture integrity", () => {
    test("release-source SHA is explicit in every context", () => {
      const sha = "a1b2c3d4e5f6";
      const ctx = makeContext({ sourceSha: sha });

      const decision = determineReleaseAction(ctx);

      expect(decision.sourceSha).toBe(sha);
    });

    test("CI release commit fixture contains release-source-sha trailer", () => {
      expect(CI_RELEASE_COMMIT_MSG).toContain("Release-source-sha:");
    });

    test("RELEASE_COMMIT_MARKER does not appear in source commit fixture", () => {
      expect(SOURCE_COMMIT_MSG).not.toContain(RELEASE_COMMIT_MARKER);
    });

    test("all four publishable package dirs are represented", () => {
      const ctx = makeContext({});
      const dirs = Object.keys(ctx.packages).sort();
      expect(dirs).toEqual(["cli", "core", "mcp", "opencode"]);
    });

    test("changeset fixtures are valid .md filenames", () => {
      for (const f of FRESH_CHANGESETS) {
        expect(f.endsWith(".md")).toBe(true);
        expect(f).not.toBe("README.md");
      }
    });
  });
});
