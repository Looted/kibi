/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { execFileSync } from "node:child_process";

/**
 * Per-file results of the unit coverage run, bound to the commit they ran on.
 * The proof producer may reuse a clean file result instead of running the same
 * test file again for the same commit.
 */
// implements REQ-kibi-verification-evidence-contract
export const UNIT_TEST_RESULTS_VERSION = "kibi.unit-test-results.v1";

export type FileTestResult = Readonly<{
  tests: number;
  failures: number;
  skipped: number;
}>;

export type GitIdentity = Readonly<{ commit: string | null; dirty: boolean }>;

/** One shard's results, published next to its LCOV snapshot. */
export type ShardTestResults = Readonly<{
  version: typeof UNIT_TEST_RESULTS_VERSION;
  shard: string;
  commit: string | null;
  dirty: boolean;
  files: Readonly<Record<string, FileTestResult>>;
}>;

/** The combined ledger the proof producer reads. */
export type UnitTestResultsLedger = Readonly<{
  version: typeof UNIT_TEST_RESULTS_VERSION;
  /** Null when the shards disagree on the commit or ran on a dirty tree. */
  commit: string | null;
  shards: readonly string[];
  files: Readonly<Record<string, FileTestResult>>;
}>;

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

function count(tag: string, name: string): number {
  const value = Number(attribute(tag, name) ?? "0");
  return Number.isSafeInteger(value) && value >= 0 ? value : Number.NaN;
}

function addResult(
  into: Map<string, FileTestResult>,
  file: string,
  result: FileTestResult,
): void {
  const previous = into.get(file);
  into.set(
    file,
    previous === undefined
      ? result
      : {
          tests: previous.tests + result.tests,
          failures: previous.failures + result.failures,
          skipped: previous.skipped + result.skipped,
        },
  );
}

/**
 * Read Bun's JUnit report: one top-level `<testsuite file=...>` per test file,
 * with nested suites for describe blocks. Errors count as failures; a count
 * that is not a non-negative integer makes the file fail closed.
 */
// implements REQ-kibi-verification-evidence-contract
export function parseJunitFileResults(
  xml: string,
): Map<string, FileTestResult> {
  const results = new Map<string, FileTestResult>();
  let depth = 0;
  for (const match of xml.matchAll(/<(\/?)testsuite\b([^>]*?)(\/?)>/g)) {
    const [tag, closing, , selfClosing] = match;
    if (closing === "/") {
      depth -= 1;
      continue;
    }
    if (depth === 0) {
      const file = attribute(tag, "file");
      if (file !== undefined && file !== "") {
        const tests = count(tag, "tests");
        const failures = count(tag, "failures") + count(tag, "errors");
        const skipped = count(tag, "skipped");
        const malformed = [tests, failures, skipped].some(Number.isNaN);
        addResult(
          results,
          file.replace(/^\.\//, ""),
          malformed
            ? { tests: 0, failures: 1, skipped: 0 }
            : { tests, failures, skipped },
        );
      }
    }
    if (selfClosing !== "/") depth += 1;
  }
  return results;
}

/** A file result the proof producer may reuse: it ran tests and all passed. */
// implements REQ-kibi-verification-evidence-contract
export function isCleanFileResult(result: FileTestResult | undefined): boolean {
  return (
    result !== undefined &&
    result.tests > 0 &&
    result.failures === 0 &&
    result.skipped === 0
  );
}

/** The commit and tracked-file state of `cwd`; unknown outside a git checkout. */
export function gitIdentity(cwd = process.cwd()): GitIdentity {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const status = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=no"],
      { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return {
      commit: /^[a-f0-9]{40}$/.test(commit) ? commit : null,
      dirty: status.trim() !== "",
    };
  } catch {
    return { commit: null, dirty: true };
  }
}

export function shardTestResults(
  shard: string,
  identity: GitIdentity,
  files: ReadonlyMap<string, FileTestResult>,
): ShardTestResults {
  return {
    version: UNIT_TEST_RESULTS_VERSION,
    shard,
    commit: identity.commit,
    dirty: identity.dirty,
    files: Object.fromEntries(
      [...files].sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}

function isFileResult(value: unknown): value is FileTestResult {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return ["tests", "failures", "skipped"].every(
    (key) => Number.isSafeInteger(row[key]) && Number(row[key]) >= 0,
  );
}

/**
 * Combine shard results into one ledger. The ledger names a commit only when
 * every shard ran on that same commit with a clean tracked tree; otherwise it
 * stays unusable for reuse while still listing what ran.
 */
// implements REQ-kibi-verification-evidence-contract
export function mergeShardTestResults(
  shards: readonly unknown[],
): UnitTestResultsLedger {
  const files = new Map<string, FileTestResult>();
  const labels: string[] = [];
  const commits = new Set<string | null>();
  let dirty = false;
  for (const raw of shards) {
    const shard = raw as Partial<ShardTestResults> | null;
    if (
      shard === null ||
      typeof shard !== "object" ||
      shard.version !== UNIT_TEST_RESULTS_VERSION ||
      typeof shard.shard !== "string" ||
      typeof shard.files !== "object" ||
      shard.files === null
    ) {
      commits.add(null);
      continue;
    }
    labels.push(shard.shard);
    commits.add(typeof shard.commit === "string" ? shard.commit : null);
    if (shard.dirty !== false) dirty = true;
    for (const [file, result] of Object.entries(shard.files)) {
      addResult(
        files,
        file,
        isFileResult(result) ? result : { tests: 0, failures: 1, skipped: 0 },
      );
    }
  }
  const [only] = commits;
  return {
    version: UNIT_TEST_RESULTS_VERSION,
    commit: commits.size === 1 && !dirty && only !== undefined ? only : null,
    shards: labels.sort(),
    files: Object.fromEntries(
      [...files].sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}
