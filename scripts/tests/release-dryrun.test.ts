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
 * End-to-end dry-run verification tests for the no-commit master publish
 * model.
 *
 * These tests exercise the full dry-run path by:
 * 1. Testing `determineReleaseAction` with mocked registry contexts (unit-level)
 * 2. Spawning `run-release-state.ts` with `GITHUB_REF_NAME=master` and
 *    verifying the JSON output (integration-level)
 *
 * The core scenarios:
 * - Happy path: unpublished packages on master → PREPARE_RELEASE
 * - No-op path: all packages already on npm → NOOP / ALREADY_PUBLISHED_NOOP
 * - Partial rerun: some packages already published → PUBLISH_ONLY_RERUN
 */

import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  PUBLISHABLE_DIRS,
  type ReleaseContext,
  determineReleaseAction,
} from "../release-state.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVIDENCE_DIR = join(import.meta.dir, "../../.sisyphus/evidence");

// Derive package metadata from actual package.json files so tests stay
// future-proof across version bumps.
function loadPackageManifest(dir: string): { name: string; version: string } {
  const manifestPath = join(
    import.meta.dir,
    `../../packages/${dir}/package.json`,
  );
  const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  return { name: raw.name, version: raw.version };
}

// Derived from the canonical constant to avoid drift when packages are added/removed.
const PUBLISHABLE_DIRS_LIST = PUBLISHABLE_DIRS;

const ALL_PACKAGES: Record<string, { name: string; version: string }> = {};
for (const dir of PUBLISHABLE_DIRS_LIST) {
  ALL_PACKAGES[dir] = loadPackageManifest(dir);
}

const SOURCE_COMMIT_MSG =
  "Merge branch 'develop' into master\n\nIntegration of new schema features.";

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
      expect(decision.packages.length).toBe(PUBLISHABLE_DIRS_LIST.length);
      expect(decision.reason).toContain("pending changeset");
    });

    test("source commit without changesets + unpublished packages → PREPARE_RELEASE", () => {
      const ctx = makeContext({
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("PREPARE_RELEASE");
      expect(decision.packages).toHaveLength(PUBLISHABLE_DIRS_LIST.length);
      expect(decision.reason).toContain("Unpublished packages detected");
    });

    test("all publishable packages are included with correct versions", () => {
      const ctx = makeContext({
        changesetFiles: NO_CHANGESETS,
        isPublishedOnNpm: nothingPublished,
      });

      const decision = determineReleaseAction(ctx);

      const pkgMap = Object.fromEntries(
        decision.packages.map((p) => [p.dir, p]),
      );

      expect(pkgMap.core.version).toBe(ALL_PACKAGES.core.version);
      expect(pkgMap.cli.version).toBe(ALL_PACKAGES.cli.version);
      expect(pkgMap.mcp.version).toBe(ALL_PACKAGES.mcp.version);
      expect(pkgMap.opencode.version).toBe(ALL_PACKAGES.opencode.version);
      expect(pkgMap.codex.version).toBe(ALL_PACKAGES.codex.version);

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
  });

  // -------------------------------------------------------------------------
  // 3. Partial rerun: some published, some not
  // -------------------------------------------------------------------------
  describe("partial rerun — subset of packages published", () => {
    test("partial publish + no changesets → PUBLISH_ONLY_RERUN with missing packages", () => {
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
      expect(decision.reason).toContain("already published");

      expect(decision.packages).toHaveLength(3);
      const dirs = decision.packages.map((p) => p.dir).sort();
      expect(dirs).toEqual(["codex", "mcp", "opencode"]);

      for (const pkg of decision.packages) {
        expect(pkg.alreadyPublished).toBe(false);
      }
    });

    test("source commit + partial publish + changesets → PREPARE_RELEASE with unpublished subset", () => {
      const published = new Set([
        `${ALL_PACKAGES.core.name}@${ALL_PACKAGES.core.version}`,
      ]);
      const ctx = makeContext({
        changesetFiles: FRESH_CHANGESETS,
        isPublishedOnNpm: (name, ver) => published.has(`${name}@${ver}`),
      });

      const decision = determineReleaseAction(ctx);

      expect(decision.action).toBe("PREPARE_RELEASE");

      const toPublish = decision.packages
        .filter((p) => !p.alreadyPublished)
        .map((p) => p.dir)
        .sort();
      expect(toPublish).toEqual(["cli", "codex", "mcp", "opencode"]);
    });

    test("only mcp unpublished → rerun targets mcp alone", () => {
      const published = new Set([
        `${ALL_PACKAGES.core.name}@${ALL_PACKAGES.core.version}`,
        `${ALL_PACKAGES.cli.name}@${ALL_PACKAGES.cli.version}`,
        `${ALL_PACKAGES.opencode.name}@${ALL_PACKAGES.opencode.version}`,
        `${ALL_PACKAGES.codex.name}@${ALL_PACKAGES.codex.version}`,
      ]);
      const ctx = makeContext({
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
      // Fixture contract: KIBI_RELEASE_MOCK_NPM="" means the runner
      // treats it as a mock-npm mode where nothing is published.
      // On master, this should produce PREPARE_RELEASE with all
      // publishable packages in toPublish.
      //
      // Regression sentinel: if the runner treats empty string as
      // falsy (falling through to real npm checks), this test fails
      // with action=NOOP instead of PREPARE_RELEASE.
      const raw = execSync("bun run scripts/run-release-state.ts", {
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_REF_NAME: "master",
          GITHUB_SHA: "test-sha-integration",
          KIBI_RELEASE_MOCK_NPM: "",
        },
      });

      const decision = JSON.parse(raw) as ReturnType<
        typeof determineReleaseAction
      > & { toPublish: string[] };

      // --- Core action assertion ---
      expect(decision.action).toBe("PREPARE_RELEASE");

      // --- Package count matches PUBLISHABLE_DIRS ---
      expect(decision.packages.length).toBe(PUBLISHABLE_DIRS_LIST.length);

      // --- Source SHA forwarded from env ---
      expect(decision.sourceSha).toBe("test-sha-integration");

      // --- Every package dir is present and sorted ---
      const dirs = decision.packages.map((p: { dir: string }) => p.dir).sort();
      expect(dirs).toEqual([...PUBLISHABLE_DIRS_LIST].sort());

      // --- Nothing published: empty-string mock means zero published ---
      for (const pkg of decision.packages) {
        expect(pkg.alreadyPublished).toBe(false);
      }

      // --- Every package carries the correct name from disk ---
      for (const pkg of decision.packages) {
        const expected = ALL_PACKAGES[pkg.dir];
        expect(expected).toBeDefined();
        expect(pkg.name).toBe(expected.name);
        expect(pkg.version).toBe(expected.version);
      }

      // --- toPublish: non-empty, each entry matches dir=name ---
      expect(Array.isArray(decision.toPublish)).toBe(true);
      const toPublish = decision.toPublish as string[];
      expect(toPublish.length).toBe(PUBLISHABLE_DIRS_LIST.length);
      for (const entry of toPublish) {
        const [dir, name] = entry.split("=");
        expect(dir).toBeTruthy();
        expect(name).toBeTruthy();
        // dir must match a known publishable dir
        const knownDir = PUBLISHABLE_DIRS_LIST.find(
          (candidate) => candidate === dir,
        );
        expect(knownDir).toBeDefined();
        if (!knownDir) continue;
        // name must match the package.json name for that dir
        expect(name).toBe(ALL_PACKAGES[knownDir].name);
      }

      writeEvidence(
        "task-7-release-dryrun-happy.txt",
        `Release Dry-Run Happy Path Evidence
=====================================
Date: ${new Date().toISOString()}
Branch override: GITHUB_REF_NAME=master
Fixture: KIBI_RELEASE_MOCK_NPM="" (empty-string → nothing published)

Raw JSON output:
${raw}

Summary:
- Action: ${decision.action}
- Packages: ${decision.packages.map((p: { name: string; version: string }) => `${p.name}@${p.version}`).join(", ")}
- All unpublished: ${decision.packages.every((p: { alreadyPublished: boolean }) => !p.alreadyPublished)}
- Reason: ${decision.reason}
`,
      );
    }, 15_000);

    test("script produces valid JSON when run as non-master branch (NOOP)", () => {
      const raw = execSync("bun run scripts/run-release-state.ts", {
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_REF_NAME: "develop",
          KIBI_RELEASE_MOCK_NPM: "",
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

Source commit with core+cli published, codex+mcp+opencode unpublished:
Expected action: PUBLISH_ONLY_RERUN
Unpublished dirs: codex, mcp, opencode

Source commit with only core published:
Expected action: PREPARE_RELEASE
Unpublished dirs: cli, mcp, opencode

Source commit + changesets + all published:
Expected action: ALREADY_PUBLISHED_NOOP

Source commit + no changesets + all published:
Expected action: NOOP
`,
      );
    });

    test("partial rerun: comma-list fixture with core+cli published → PUBLISH_ONLY_RERUN with codex+mcp+opencode", () => {
      // Build comma-separated list from current core and cli package manifests.
      // This simulates a partial rerun where core and cli are already on npm,
      // so only codex, mcp, and opencode remain to be published.
      const { name: coreName, version: coreVersion } = ALL_PACKAGES.core;
      const { name: cliName, version: cliVersion } = ALL_PACKAGES.cli;
      const mockNpm = `${coreName}@${coreVersion},${cliName}@${cliVersion}`;

      const raw = execSync("bun run scripts/run-release-state.ts", {
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_REF_NAME: "master",
          GITHUB_SHA: "test-sha-partial-rerun",
          KIBI_RELEASE_MOCK_NPM: mockNpm,
          KIBI_RELEASE_MOCK_CHANGESETS: "",
        },
      });

      const decision = JSON.parse(raw) as ReturnType<
        typeof determineReleaseAction
      > & { toPublish: string[] };

      // --- Core action assertion ---
      expect(decision.action).toBe("PUBLISH_ONLY_RERUN");

      // --- toPublish contains only codex, mcp, and opencode ---
      expect(Array.isArray(decision.toPublish)).toBe(true);
      const toPublishDirs = decision.toPublish
        .map((entry: string) => entry.split("=")[0])
        .sort();
      expect(toPublishDirs).toEqual(["codex", "mcp", "opencode"]);

      // --- PUBLISH_ONLY_RERUN only includes unpublished packages ---
      // The runner omits already-published packages from decision.packages.
      expect(decision.packages).toHaveLength(3);
      const pkgDirs = decision.packages
        .map((p: { dir: string }) => p.dir)
        .sort();
      expect(pkgDirs).toEqual(["codex", "mcp", "opencode"]);

      // --- None of the returned packages are already published ---
      for (const pkg of decision.packages) {
        expect(pkg.alreadyPublished).toBe(false);
      }

      writeEvidence(
        "task-4-release-dryrun-partial-rerun.txt",
        `Release Dry-Run Partial Rerun Evidence
==========================================
Date: ${new Date().toISOString()}
Branch override: GITHUB_REF_NAME=master
Fixture: KIBI_RELEASE_MOCK_NPM="${mockNpm}" (core+cli already published)

Raw JSON output:
${raw}

Summary:
- Action: ${decision.action}
- toPublish dirs: ${toPublishDirs.join(", ")}
- Packages in output: ${pkgDirs.join(", ")}
- Reason: ${decision.reason}
`,
      );
    }, 15_000);
  });

  // -------------------------------------------------------------------------
  // 5. Package directory constant consistency
  // -------------------------------------------------------------------------
  describe("package directory constants", () => {
    test("PUBLISHABLE_DIRS contains exactly the expected npm package directories", () => {
      expect([...PUBLISHABLE_DIRS].sort()).toEqual([
        "cli",
        "codex",
        "core",
        "mcp",
        "opencode",
      ]);
    });
  });
});
