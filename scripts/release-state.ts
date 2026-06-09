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
 * DESIGN INTENT:
 * - develop authors unreleased work via changesets
 * - develop gets version bumps via `bun run version-packages`
 * - master CI publishes only, no commits on master
 * - Partial rerun: if some packages are already published on npm, only
 *   the unpublished subset is included in the publish set
 * - No master → develop back-merge
 */

// --- Types ------------------------------------------------------------------

export type ReleaseAction =
  | "NOOP"
  | "PREPARE_RELEASE"
  | "PUBLISH_ONLY_RERUN"
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

/** Canonical publishable package directories */
export const PUBLISHABLE_DIRS = [
  "core",
  "cli",
  "mcp",
  "opencode",
  "codex",
  "cursor",
] as const; // implements REQ-020

// --- Implementation ---------------------------------------------------------

/**
 * Determines the release action based on the current context.
 *
 * Decision matrix:
 * ✅ NOOP: not on master, or no changesets + all published
 * ✅ PREPARE_RELEASE: fresh release (unpublished packages, no prior publishes)
 * ✅ PUBLISH_ONLY_RERUN: partial rerun (some already published, some not)
 * ✅ ALREADY_PUBLISHED_NOOP: changesets present but all on npm already
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

  // Collect publishable package info
  const allPackages = collectPackages(ctx);
  const unpublished = allPackages.filter((p) => !p.alreadyPublished);
  const published = allPackages.filter((p) => p.alreadyPublished);

  // Detect pending changeset files
  const pendingChangesets = ctx.changesetFiles.filter(
    (f) => f.endsWith(".md") && f !== "README.md",
  );

  // No changesets and all published → true no-op
  if (pendingChangesets.length === 0 && unpublished.length === 0) {
    return {
      action: "NOOP",
      packages: [],
      sourceSha: ctx.sourceSha,
      reason: "No pending changesets and all packages already published",
    };
  }

  // No changesets but unpublished packages exist
  if (pendingChangesets.length === 0) {
    // Some packages already published → partial rerun
    if (published.length > 0) {
      return {
        action: "PUBLISH_ONLY_RERUN",
        packages: unpublished,
        sourceSha: ctx.sourceSha,
        reason: `Partial rerun: ${published.length} already published, ${unpublished.length} remaining`,
      };
    }
    // Fresh: nothing published yet but no changesets (consumed on develop)
    return {
      action: "PREPARE_RELEASE",
      packages: unpublished,
      sourceSha: ctx.sourceSha,
      reason: "Unpublished packages detected without pending changesets",
    };
  }

  // Have pending changesets — all published already?
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
