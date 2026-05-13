/// <reference types="bun-types" />

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const importMetaDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(importMetaDir, "../../..");
const runnerPath = path.join(repoRoot, "scripts", "run-prolog-coverage.pl");
const tempDirs: string[] = [];

type CoverageSummary = {
  tests: {
    passed: boolean;
  };
  threshold: {
    ok: boolean;
    targetPercent: number;
  };
  coverage: {
    percent: number;
    uncoveredClauses: Array<{
      predicate: string;
      line: number;
    }>;
  };
  artifacts: {
    annotatedFiles: string[];
  };
};

type Fixture = {
  rootDir: string;
  srcDir: string;
  testsDir: string;
  testFile: string;
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createFixture(name: string, source: string, testSuite: string): Fixture {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), `kibi-${name}-`));
  const srcDir = path.join(rootDir, "src");
  const testsDir = path.join(rootDir, "tests");
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(testsDir, { recursive: true });

  const moduleName = `${name}.pl`;
  const testName = `${name}.plt`;

  writeFileSync(path.join(srcDir, moduleName), source, "utf8");
  writeFileSync(path.join(testsDir, testName), testSuite, "utf8");

  tempDirs.push(rootDir);

  return {
    rootDir,
    srcDir,
    testsDir,
    testFile: path.join(testsDir, testName),
  };
}

function runCoverage(args: string[]) {
  return spawnSync("swipl", ["-q", "-s", runnerPath, "--", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function readSummary(summaryPath: string): CoverageSummary {
  return JSON.parse(readFileSync(summaryPath, "utf8")) as CoverageSummary;
}

describe("run-prolog-coverage.pl", () => {
  test("fails below the clause threshold and writes artifacts", () => {
    const fixture = createFixture(
      "sample_partial",
      `:- module(sample_partial, [covered/1, uncovered/1]).

covered(ok).
uncovered(missed).
`,
      `:- use_module('../src/sample_partial.pl').
:- use_module(library(plunit)).

:- begin_tests(sample_partial).

test(covered_ok) :-
    covered(ok).

:- end_tests(sample_partial).
`,
    );

    const outputDir = path.join(fixture.rootDir, "coverage");
    const summaryJson = path.join(outputDir, "summary.json");
    const summaryText = path.join(outputDir, "summary.txt");

    const result = runCoverage([
      "--source-root",
      fixture.srcDir,
      "--test",
      fixture.testFile,
      "--output-dir",
      outputDir,
      "--summary-json",
      summaryJson,
      "--summary-text",
      summaryText,
      "--fail-under",
      "100",
    ]);

    expect(result.status).toBe(1);
    expect(existsSync(summaryJson)).toBe(true);
    expect(existsSync(summaryText)).toBe(true);

    const summary = readSummary(summaryJson);
    expect(summary.tests.passed).toBe(true);
    expect(summary.threshold.ok).toBe(false);
    expect(summary.coverage.percent).toBeLessThan(100);
    expect(summary.coverage.uncoveredClauses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ predicate: "sample_partial:uncovered/1" }),
      ]),
    );
    expect(summary.artifacts.annotatedFiles.length).toBeGreaterThan(0);
    expect(readFileSync(summaryText, "utf8")).toContain(
      "Coverage threshold not met",
    );
  });

  test("passes when every clause is covered", () => {
    const fixture = createFixture(
      "sample_full",
      `:- module(sample_full, [alpha/1, beta/1]).

alpha(ok).
beta(done).
`,
      `:- use_module('../src/sample_full.pl').
:- use_module(library(plunit)).

:- begin_tests(sample_full).

test(alpha_ok) :-
    alpha(ok).

test(beta_done) :-
    beta(done).

:- end_tests(sample_full).
`,
    );

    const outputDir = path.join(fixture.rootDir, "coverage");
    const summaryJson = path.join(outputDir, "summary.json");
    const summaryText = path.join(outputDir, "summary.txt");

    const result = runCoverage([
      "--source-root",
      fixture.srcDir,
      "--test",
      fixture.testFile,
      "--output-dir",
      outputDir,
      "--summary-json",
      summaryJson,
      "--summary-text",
      summaryText,
      "--fail-under",
      "100",
    ]);

    expect(result.status).toBe(0);

    const summary = readSummary(summaryJson);
    expect(summary.tests.passed).toBe(true);
    expect(summary.threshold.ok).toBe(true);
    expect(summary.coverage.percent).toBe(100);
    expect(summary.coverage.uncoveredClauses).toHaveLength(0);
    expect(summary.artifacts.annotatedFiles.length).toBeGreaterThan(0);
    expect(readFileSync(summaryText, "utf8")).toContain("Coverage threshold met");
  });
});
