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
 * Release-state decision helper for the develop-to-master publish model.
 *
 * This module encodes the release decision logic that the CI workflow will
 * consume. The decision function takes a structured context and returns an
 * explicit action with the set of packages affected.
 *
 * DESIGN INTENT (desired model — not all invariants are implemented yet):
 * - develop authors unreleased work via changesets
 * - master CI creates a persisted release commit and publishes
 * - CI release commits are marked with a stable trailer
 * - Recursion guard: CI-authored release commits must not trigger another
 *   release-prep cycle
 * - Partial rerun: if some packages are already published on npm, only
 *   the unpublished subset is included in the publish set
 * - No master → develop back-merge
 */

// --- Types ------------------------------------------------------------------

export type ReleaseAction =
  | "NOOP"
  | "PREPARE_RELEASE"
  | "PUBLISH_ONLY_RERUN"
  | "SKIP_RELEASE_COMMIT"
  | "ALREADY_PUBLISHED_NOOP";

export interface PackageInfo {
  name: string;
  dir: string;
  version: string;
  alreadyPublished: boolean;
}

export interface ReleaseDecision {
  action: ReleaseAction;
  packages: PackageInfo[];
  /** The source (human-authored) SHA that triggered the release */
  sourceSha?: string;
  reason: string;
}

export interface ReleaseContext {
  /** Full commit message of the current HEAD */
  commitMessage: string;
  /** Current branch name */
  branch: string;
  /** Changeset .md file names (excluding README.md and config.json) */
  changesetFiles: string[];
  /** Package info keyed by directory name */
  packages: Record<string, { name: string; version: string }>;
  /** Callback: returns true if pkgName@version exists on npm */
  isPublishedOnNpm: (pkgName: string, version: string) => boolean;
  /** The SHA of the triggering commit */
  sourceSha: string;
}

// --- Constants --------------------------------------------------------------

/** Stable marker in commit messages that identifies CI-authored release commits */
export const RELEASE_COMMIT_MARKER = "[kibi-release]"; // implements REQ-020

/** Canonical publishable package directories */
export const PUBLISHABLE_DIRS = ["core", "cli", "mcp", "opencode"] as const; // implements REQ-020

// --- Current (pre-fix) implementation ---------------------------------------

/**
 * Determines the release action based on the current context.
 *
 * IMPLEMENTATION STATUS:
 * ✅ No-op when no changesets and no unpublished packages
 * ✅ PREPARE_RELEASE for fresh changesets on source commit
 * ✅ Recursion guard: detects CI release commits
 * ✅ Partial rerun: returns PUBLISH_ONLY_RERUN
 * ✅ SKIP_RELEASE_COMMIT: implemented
 */
export function determineReleaseAction(ctx: ReleaseContext): ReleaseDecision {
  // implements REQ-020
  // Only act on master
  if (ctx.branch !== "master") {
    return {
      action: "NOOP",
      packages: [],
      reason: "Not on master branch",
    };
  }

  const isReleaseCommit = ctx.commitMessage.includes(RELEASE_COMMIT_MARKER);

  // Collect publishable package info
  const allPackages = collectPackages(ctx);
  const unpublished = allPackages.filter((p) => !p.alreadyPublished);

  // Detect pending changeset files
  const pendingChangesets = ctx.changesetFiles.filter(
    (f) => f.endsWith(".md") && f !== "README.md",
  );

  if (isReleaseCommit) {
    // CI-authored release commit: never re-run version-packages
    if (unpublished.length === 0) {
      return {
        action: "ALREADY_PUBLISHED_NOOP",
        packages: [],
        sourceSha: ctx.sourceSha,
        reason: "CI release commit: all packages already published",
      };
    }
    if (pendingChangesets.length === 0) {
      return {
        action: "PUBLISH_ONLY_RERUN",
        packages: unpublished,
        sourceSha: ctx.sourceSha,
        reason: "CI release commit rerun: publishing missing packages",
      };
    }
    // If changesets somehow remain on a CI release commit, skip re-preparing
    return {
      action: "SKIP_RELEASE_COMMIT",
      packages: unpublished,
      sourceSha: ctx.sourceSha,
      reason:
        "CI release commit: skipping release-prep despite leftover changesets",
    };
  }

  // Source (human-authored) commit path
  if (pendingChangesets.length === 0 && unpublished.length === 0) {
    // True no-op: nothing to version, nothing to publish
    return {
      action: "NOOP",
      packages: [],
      sourceSha: ctx.sourceSha,
      reason: "No pending changesets and all packages already published",
    };
  }

  if (pendingChangesets.length === 0) {
    // No changesets but unpublished packages exist on source commit — prepare release
    return {
      action: "PREPARE_RELEASE",
      packages: unpublished,
      sourceSha: ctx.sourceSha,
      reason: "Unpublished packages detected without pending changesets",
    };
  }

  // Have pending changesets — prepare release
  if (unpublished.length === 0) {
    return {
      action: "ALREADY_PUBLISHED_NOOP",
      packages: [],
      sourceSha: ctx.sourceSha,
      reason: "Changesets present but all target versions already on npm",
    };
  }

  return {
    action: "PREPARE_RELEASE",
    packages: allPackages,
    sourceSha: ctx.sourceSha,
    reason: `${pendingChangesets.length} pending changeset(s), ${unpublished.length} unpublished package(s)`,
  };
}

// --- Helpers ----------------------------------------------------------------

function collectPackages(ctx: ReleaseContext): PackageInfo[] {
  const result: PackageInfo[] = [];

  for (const dir of PUBLISHABLE_DIRS) {
    const pkg = ctx.packages[dir];
    if (!pkg) continue;

    result.push({
      name: pkg.name,
      dir,
      version: pkg.version,
      alreadyPublished: ctx.isPublishedOnNpm(pkg.name, pkg.version),
    });
  }

  return result;
}
