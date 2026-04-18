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

import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PUBLISHABLE_DIRS, determineReleaseAction } from "./release-state";
import { resolveNpmFixture } from "./release-runner-fixture";

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
const changesetDir = join(rootDir, ".changeset");
let changesetFiles: string[] = [];
try {
  changesetFiles = readdirSync(changesetDir).filter(
    (f) => f.endsWith(".md") && f !== "README.md",
  );
} catch {
  changesetFiles = [];
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
const isPublishedOnNpm = (pkgName: string, version: string): boolean => {
  if (fixture.mode === "fixture") {
    return fixture.published.has(`${pkgName}@${version}`);
  }
  try {
    execSync(`npm view ${pkgName}@${version} version`, {
      encoding: "utf8",
      stdio: "pipe",
    });
    return true;
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
  sourceSha,
});

// Build workflow-compatible toPublish array (dir=name entries)
const toPublish = decision.packages
  .filter((p) => !p.alreadyPublished)
  .map((p) => `${p.dir}=${p.name}`);

console.log(
  JSON.stringify(
    {
      ...decision,
      toPublish,
    },
    null,
    2,
  ),
);
