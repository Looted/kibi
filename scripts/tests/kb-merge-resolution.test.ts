// implements REQ-ci-kb-merge-resolution
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { deriveBaselineSummary } from "../lib/proof-baseline-diff.mjs";

const ROOT = path.join(import.meta.dir, "..", "..");
const RECONCILE = path.join(ROOT, "scripts", "reconcile-proof-baseline.mjs");

type Step = { name?: string; uses?: string; run?: string };

function resolveSteps(file: string): Step[] {
  const workflow = parse(readFileSync(path.join(ROOT, file), "utf8")) as {
    jobs: { resolve: { steps: Step[] } };
  };
  return workflow.jobs.resolve.steps;
}

function indexOf(steps: Step[], pattern: RegExp): number {
  const index = steps.findIndex((step) =>
    pattern.test(`${step.name ?? ""}\n${step.run ?? ""}`),
  );
  expect(index, `no step matches ${pattern}`).toBeGreaterThanOrEqual(0);
  return index;
}

describe("proof baseline summary reconciliation", () => {
  const proven = { proofStatus: "proven", gaps: [], uncoveredSymbols: [] };

  test("derives counts and gap totals from the entries", () => {
    expect(
      deriveBaselineSummary({
        "REQ-A": proven,
        "REQ-B": {
          proofStatus: "missing",
          gaps: ["missing_passing_e2e"],
          uncoveredSymbols: [],
        },
        "REQ-C": {
          proofStatus: "unresolved",
          gaps: ["stale_proof_receipt", "missing_passing_e2e"],
          uncoveredSymbols: [],
        },
      }),
    ).toEqual({
      currentRequirements: 3,
      proofProven: 1,
      currentUnproven: 2,
      trackedGaps: { missing_passing_e2e: 2, stale_proof_receipt: 1 },
    });
  });

  test("repairs the count a line merge keeps when two branches each add a requirement", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "kibi-baseline-"));
    try {
      const file = path.join(directory, "baseline.json");
      // Both branches raised 140 -> 141; Git kept one increment for two entries.
      const merged = {
        version: "kibi.proof-baseline.v2",
        mode: "equality",
        currentRequirements: 1,
        proofProven: 1,
        currentUnproven: 0,
        trackedGaps: {},
        requirements: { "REQ-from-base": proven, "REQ-from-branch": proven },
      };
      writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`);

      const first = spawnSync(process.execPath, [RECONCILE, file], {
        encoding: "utf8",
      });
      expect(first.status).toBe(0);
      expect(first.stdout).toContain("reconciled");
      const repaired = JSON.parse(readFileSync(file, "utf8"));
      expect(Object.keys(repaired)).toEqual(Object.keys(merged));
      expect(repaired).toMatchObject({
        currentRequirements: 2,
        proofProven: 2,
        currentUnproven: 0,
        trackedGaps: {},
        requirements: merged.requirements,
      });

      const second = spawnSync(process.execPath, [RECONCILE, file], {
        encoding: "utf8",
      });
      expect(second.stdout).toContain("already match");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("the committed baseline already matches its entries", () => {
    const baseline = JSON.parse(
      readFileSync(path.join(ROOT, "proof", "baseline.json"), "utf8"),
    );
    expect(baseline).toMatchObject(
      deriveBaselineSummary(baseline.requirements),
    );
  });
});

describe("KB merge workflow", () => {
  const steps = resolveSteps(".github/workflows/kb-merge.yml");

  test("builds the merge driver from the base branch before merging", () => {
    const build = indexOf(steps, /Build the merge driver/);
    expect(steps[build]?.run).toContain(
      'git worktree add --detach "$driver_root" "origin/$BASE"',
    );
    expect(steps[build]?.run).toContain("KIBI_MERGE_DRIVER=");
    const merge = indexOf(steps, /git merge --no-ff/);
    expect(build).toBeLessThan(merge);
    expect(steps[merge]?.run).toContain(
      'merge.kibi.driver "$KIBI_MERGE_DRIVER',
    );
    // No PR-branch install or build may run before the merge.
    for (const step of steps.slice(0, merge)) {
      if (step === steps[build]) continue;
      expect(step.run ?? "").not.toMatch(/bun (install|run build)/);
    }
  });

  test("refreshes a stale lockfile as part of the merge", () => {
    const rebuild = indexOf(steps, /Rebuild the merged tree/);
    expect(steps[rebuild]?.run).toContain("if ! bun install --frozen-lockfile");
    expect(steps[rebuild]?.run).toContain("git add bun.lock");
  });

  test("reconciles the baseline and passes the pre-push gate before pushing", () => {
    const reconcile = indexOf(steps, /reconcile-proof-baseline\.mjs/);
    const commit = indexOf(steps, /git commit/);
    const gate = indexOf(steps, /scripts\/proof-prepush\.sh/);
    const push = indexOf(steps, /git push/);
    expect(reconcile).toBeLessThan(commit);
    expect(commit).toBeLessThan(gate);
    expect(gate).toBeLessThan(push);
    expect(push).toBe(steps.length - 1);
  });

  test("the reusable example installs the driver from the default branch", () => {
    const example = resolveSteps("docs/examples/github/kibi-kb-merge.yml");
    const install = indexOf(example, /Install the merge driver/);
    const merge = indexOf(example, /git merge --no-ff/);
    expect(install).toBeLessThan(merge);
    expect(example[merge]?.run).toContain(
      'merge.kibi.driver "$KIBI_MERGE_DRIVER',
    );
    expect(example[indexOf(example, /Install the merged tree/)]?.run).toContain(
      "git add package-lock.json",
    );
  });
});
