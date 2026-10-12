import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  UNIT_TEST_RESULTS_VERSION,
  gitIdentity,
  isCleanFileResult,
  mergeShardTestResults,
  parseJunitFileResults,
  shardTestResults,
} from "../unit-test-results";

const COMMIT = "c".repeat(40);
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("parseJunitFileResults", () => {
  test("reads one result per file from Bun's top-level suites", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="6" failures="1" skipped="1">
  <testsuite name="a.test.ts" file="a.test.ts" tests="3" failures="0" skipped="0">
    <testsuite name="nested" file="a.test.ts" tests="9" failures="9" skipped="9">
      <testcase name="x" file="a.test.ts" />
    </testsuite>
    <testsuite name="empty-describe" file="a.test.ts" tests="0" failures="0" skipped="0" />
  </testsuite>
  <testsuite name="b.test.ts" file="./b.test.ts" tests="2" failures="1" skipped="0" />
  <testsuite name="c.test.ts" file="c.test.ts" tests="1" failures="0" errors="1" skipped="1">
  </testsuite>
  <testsuite name="d.test.ts" file="d.test.ts" tests="many" failures="0" skipped="0" />
</testsuites>`;
    expect(Object.fromEntries(parseJunitFileResults(xml))).toEqual({
      "a.test.ts": { tests: 3, failures: 0, skipped: 0 },
      "b.test.ts": { tests: 2, failures: 1, skipped: 0 },
      "c.test.ts": { tests: 1, failures: 1, skipped: 1 },
      "d.test.ts": { tests: 0, failures: 1, skipped: 0 },
    });
  });

  test("only a file that ran tests and all passed is clean", () => {
    expect(isCleanFileResult({ tests: 1, failures: 0, skipped: 0 })).toBe(true);
    expect(isCleanFileResult({ tests: 0, failures: 0, skipped: 0 })).toBe(
      false,
    );
    expect(isCleanFileResult({ tests: 2, failures: 1, skipped: 0 })).toBe(
      false,
    );
    expect(isCleanFileResult({ tests: 2, failures: 0, skipped: 1 })).toBe(
      false,
    );
    expect(isCleanFileResult(undefined)).toBe(false);
  });
});

describe("mergeShardTestResults", () => {
  const clean = { commit: COMMIT, dirty: false };
  const one = shardTestResults(
    "one",
    clean,
    new Map([
      ["z.test.ts", { tests: 1, failures: 0, skipped: 0 }],
      ["a.test.ts", { tests: 2, failures: 0, skipped: 0 }],
    ]),
  );
  const two = shardTestResults(
    "two",
    clean,
    new Map([["a.test.ts", { tests: 1, failures: 1, skipped: 0 }]]),
  );

  test("binds the ledger to the commit every clean shard ran on", () => {
    expect(Object.keys(one.files)).toEqual(["a.test.ts", "z.test.ts"]);
    expect(mergeShardTestResults([two, one])).toEqual({
      version: UNIT_TEST_RESULTS_VERSION,
      commit: COMMIT,
      shards: ["one", "two"],
      files: {
        "a.test.ts": { tests: 3, failures: 1, skipped: 0 },
        "z.test.ts": { tests: 1, failures: 0, skipped: 0 },
      },
    });
  });

  test("names no commit when shards disagree, are dirty or malformed", () => {
    const other = { ...two, commit: "d".repeat(40) };
    expect(mergeShardTestResults([one, other]).commit).toBeNull();
    expect(mergeShardTestResults([one, { ...two, dirty: true }]).commit).toBe(
      null,
    );
    const broken = mergeShardTestResults([one, null, { version: "v0" }]);
    expect(broken.commit).toBeNull();
    expect(broken.shards).toEqual(["one"]);
    expect(mergeShardTestResults([]).commit).toBeNull();
    const badFile = mergeShardTestResults([
      { ...one, files: { "a.test.ts": { tests: -1 } } },
    ]);
    expect(badFile.files["a.test.ts"]).toEqual({
      tests: 0,
      failures: 1,
      skipped: 0,
    });
  });
});

describe("gitIdentity", () => {
  test("reports the checkout's commit and unknown outside git", () => {
    expect(gitIdentity().commit).toMatch(/^[a-f0-9]{40}$/);
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-no-git-"));
    roots.push(root);
    expect(gitIdentity(root)).toEqual({ commit: null, dirty: true });
  });
});
