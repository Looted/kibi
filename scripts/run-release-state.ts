#!/usr/bin/env bun
/**
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * CLI wrapper around the release-state decision helper.
 *
 * Constructs a ReleaseContext from the current git tree and npm registry,
 * invokes determineReleaseAction, and prints the JSON decision to stdout.
 * Intended for use in CI: `bun run scripts/run-release-state.ts`
 */

import { execFileSync, execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { resolveNpmFixture } from "./release-runner-fixture";
import {
  PUBLISHABLE_DIRS,
  determineReleaseAction,
  planStagedPublish,
} from "./release-state";

const rootDir = join(import.meta.dir, "..");

const commitMessage = execSync("git log -1 --pretty=%B", {
  encoding: "utf8",
}).trim();
const branch =
  process.env.GITHUB_REF_NAME ||
  execSync("git branch --show-current", { encoding: "utf8" }).trim();
const sourceSha =
  process.env.GITHUB_SHA ||
  execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

// Collect changeset files
// KIBI_RELEASE_MOCK_CHANGESETS env contract:
// - undefined: read real .changeset directory
// - defined (including empty string): fixture mode from comma-list of filenames
const mockChangesets = process.env.KIBI_RELEASE_MOCK_CHANGESETS;
let changesetFiles: string[] = [];
if (mockChangesets !== undefined) {
  changesetFiles = mockChangesets
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
} else {
  const changesetDir = join(rootDir, ".changeset");
  try {
    changesetFiles = readdirSync(changesetDir).filter(
      (f) => f.endsWith(".md") && f !== "README.md",
    );
  } catch {
    changesetFiles = [];
  }
}

// Collect package info
const packages: Record<string, { name: string; version: string }> = {};
for (const dir of PUBLISHABLE_DIRS) {
  try {
    const pkgJson = JSON.parse(
      readFileSync(join(rootDir, "packages", dir, "package.json"), "utf8"),
    );
    packages[dir] = { name: pkgJson.name, version: pkgJson.version };
  } catch {
    // skip missing packages
  }
}

// KIBI_RELEASE_MOCK_NPM env contract: env presence (including "") activates fixture mode;
// env absence activates live npm mode (queries the real registry).
const fixture = resolveNpmFixture(process.env.KIBI_RELEASE_MOCK_NPM);
const mockStaged = new Set(
  (process.env.KIBI_RELEASE_MOCK_NPM_STAGED ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0),
);
const mockNewPackages = new Set(
  (process.env.KIBI_RELEASE_MOCK_NPM_NEW ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0),
);
const isPublishedOnNpm = (pkgName: string, version: string): boolean => {
  if (fixture.mode === "fixture") {
    const key = `${pkgName}@${version}`;
    return fixture.published.has(key) || mockStaged.has(key);
  }
  try {
    execFileSync("npm", ["view", `${pkgName}@${version}`, "version"], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
};
const isPackageOnNpm = (pkgName: string): boolean => {
  if (fixture.mode === "fixture") {
    return !mockNewPackages.has(pkgName);
  }
  try {
    execFileSync("npm", ["view", pkgName, "name"], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
};
const isLatestOnNpm = (pkgName: string, version: string): boolean => {
  if (fixture.mode === "fixture") {
    const key = `${pkgName}@${version}`;
    return fixture.published.has(key) && !mockStaged.has(key);
  }
  try {
    const latest = execFileSync("npm", ["view", pkgName, "dist-tags.latest"], {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    return latest === version;
  } catch {
    return false;
  }
};

const decision = determineReleaseAction({
  commitMessage,
  branch,
  changesetFiles,
  packages,
  isPublishedOnNpm,
  isPackageOnNpm,
  isLatestOnNpm,
  sourceSha,
});

// Build workflow-compatible staged publish arrays:
// - toUpload: tarballs not yet on npm (brand-new packages first, `--tag staging`)
// - toPromote: packages whose target version is not yet on `latest` (dependency order)
// - toPublish: canonical dir=name list for promotion, MCP Registry, and GitHub releases
const stagedPlan = planStagedPublish(decision.packages);
const toPublish = stagedPlan.toPromote.map((p) => `${p.dir}=${p.name}`);
const toUpload = stagedPlan.toUpload.map((p) => `${p.dir}=${p.name}`);
const toPromote = stagedPlan.toPromote.map(
  (p) => `${p.dir}=${p.name}@${p.version}`,
);

console.log(
  JSON.stringify(
    {
      ...decision,
      toPublish,
      toUpload,
      toPromote,
    },
    null,
    2,
  ),
);
