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
  /** True when the package has no prior versions on npm at all (first publish). */
  isNewPackage?: boolean;
  /** True when npm's `latest` dist-tag already points to `version`. */
  latestPublished?: boolean;
}

export interface StagedPublishPlan {
  /** Unpublished packages to upload under `--tag staging` (brand-new packages first, then existing, preserving catalog order in each group). */
  toUpload: PackageInfo[];
  /** Packages whose target version is not yet on npm's `latest` dist-tag, in canonical dependency order. */
  toPromote: PackageInfo[];
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
  /** Callback: returns true if pkgName@version exists on npm (any dist-tag) */
  isPublishedOnNpm: (pkgName: string, version: string) => boolean;
  /** Optional callback: returns true if pkgName already has at least one version on npm */
  isPackageOnNpm?: (pkgName: string) => boolean;
  /** Optional callback: returns true if npm's `latest` dist-tag already points to pkgName@version. Defaults to `alreadyPublished`. */
  isLatestOnNpm?: (pkgName: string, version: string) => boolean;
  /** The SHA of the triggering commit */
  sourceSha: string;
}

// --- Constants --------------------------------------------------------------

/** Canonical publishable package directories */
import { PUBLISHABLE_DIRS } from "./package-catalog";
export { PUBLISHABLE_DIRS };

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
  const needsWork = allPackages.filter(
    (p) => !p.alreadyPublished || !(p.latestPublished ?? p.alreadyPublished),
  );
  const anyPublished = allPackages.filter((p) => p.alreadyPublished);

  // Detect pending changeset files
  const pendingChangesets = ctx.changesetFiles.filter(
    (f) => f.endsWith(".md") && f !== "README.md",
  );

  // No changesets and all published on latest → true no-op
  if (pendingChangesets.length === 0 && needsWork.length === 0) {
    return {
      action: "NOOP",
      packages: [],
      sourceSha: ctx.sourceSha,
      reason: "No pending changesets and all packages already published",
    };
  }

  // No changesets but unpublished or unpromoted packages exist
  if (pendingChangesets.length === 0) {
    // Some packages already published (on latest or staging) → partial rerun
    if (anyPublished.length > 0) {
      return {
        action: "PUBLISH_ONLY_RERUN",
        packages: needsWork,
        sourceSha: ctx.sourceSha,
        reason: `Partial rerun: ${anyPublished.length} already published, ${needsWork.length} remaining`,
      };
    }
    // Fresh: nothing published yet and no changesets (consumed on develop)
    return {
      action: "PREPARE_RELEASE",
      packages: needsWork,
      sourceSha: ctx.sourceSha,
      reason: "Unpublished packages detected without pending changesets",
    };
  }

  // Have pending changesets — all published on latest already?
  if (needsWork.length === 0) {
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
    reason: `${pendingChangesets.length} pending changeset(s), ${needsWork.length} unpublished package(s)`,
  };
}

/**
 * Plan a two-phase staged npm publish so a failure on a brand-new package name
 * or mid-release upload never leaves `latest` half-updated:
 *
 * 1. `toUpload`: unpublished tarballs, with brand-new packages (never published
 *    on npm before) placed FIRST so spam-filter or permission errors fail before
 *    any existing package is touched, preserving canonical dependency order
 *    within each group.
 * 2. `toPromote`: every package whose target version is not yet on `latest`
 *    (including tarballs uploaded in an earlier interrupted staging run), in
 *    canonical dependency order.
 */
export function planStagedPublish(
  packages: readonly PackageInfo[],
): StagedPublishPlan {
  const unpublished = packages.filter((p) => !p.alreadyPublished);
  const newFirst = unpublished.filter((p) => p.isNewPackage === true);
  const existing = unpublished.filter((p) => p.isNewPackage !== true);
  const toPromote = packages.filter(
    (p) => !(p.latestPublished ?? p.alreadyPublished),
  );
  return {
    toUpload: [...newFirst, ...existing],
    toPromote,
  };
}

// --- Helpers ----------------------------------------------------------------

function collectPackages(ctx: ReleaseContext): PackageInfo[] {
  const result: PackageInfo[] = [];

  for (const dir of PUBLISHABLE_DIRS) {
    const pkg = ctx.packages[dir];
    if (!pkg) continue;

    const alreadyPublished = ctx.isPublishedOnNpm(pkg.name, pkg.version);
    const isNewPackage =
      !alreadyPublished && ctx.isPackageOnNpm
        ? !ctx.isPackageOnNpm(pkg.name)
        : false;
    const latestPublished = alreadyPublished
      ? (ctx.isLatestOnNpm?.(pkg.name, pkg.version) ?? true)
      : false;

    result.push({
      name: pkg.name,
      dir,
      version: pkg.version,
      alreadyPublished,
      isNewPackage,
      latestPublished,
    });
  }

  return result;
}
