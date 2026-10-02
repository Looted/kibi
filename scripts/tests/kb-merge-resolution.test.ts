// implements REQ-ci-kb-merge-resolution
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { deriveBaselineSummary } from "../lib/proof-baseline-diff.mjs";

const ROOT = path.join(import.meta.dir, "..", "..");
const RECONCILE = path.join(ROOT, "scripts", "reconcile-proof-baseline.mjs");

type Step = {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  "working-directory"?: string;
};

function resolveSteps(file: string): Step[] {
  const workflow = Bun.YAML.parse(
    readFileSync(path.join(ROOT, file), "utf8"),
  ) as {
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
  const prCheckout = steps.findIndex((step) => step.with?.path === "pr");

  test("builds Kibi from develop and only then checks out the PR branch", () => {
    expect(steps[0]?.with?.ref).toBe("${{ github.sha }}");
    expect(steps[0]?.with?.path).toBeUndefined();
    const build = indexOf(steps, /Build Kibi from develop/);
    expect(build).toBeLessThan(prCheckout);
    const merge = indexOf(steps, /git merge --no-ff/);
    expect(prCheckout).toBeLessThan(merge);
    expect(steps[merge]?.run).toContain(
      'merge.kibi.driver "node $GITHUB_WORKSPACE/packages/cli/bin/kibi merge-driver',
    );
    // The PR tree is never installed or built: develop's build does the work.
    for (const step of steps.filter(
      (candidate) => candidate["working-directory"] === "pr",
    )) {
      expect(step.run ?? "").not.toMatch(/bun (install|run build)/);
    }
  });

  test("reconciles the baseline and checks it before pushing", () => {
    const reconcile = indexOf(steps, /reconcile-proof-baseline\.mjs/);
    const commit = indexOf(steps, /git commit/);
    const gate = indexOf(steps, /check-proof-baseline\.mjs --semantic-only/);
    const push = indexOf(steps, /git push/);
    expect(reconcile).toBeLessThan(commit);
    expect(commit).toBeLessThan(gate);
    expect(gate).toBeLessThan(push);
    expect(push).toBe(steps.length - 1);
    expect(steps[push]?.run).not.toContain("git commit");
    for (const index of [reconcile, commit, gate, push]) {
      expect(steps[index]?.["working-directory"]).toBe("pr");
    }
  });
});
