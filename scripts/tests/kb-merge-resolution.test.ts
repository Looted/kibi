// implements REQ-ci-kb-merge-resolution
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dir, "..", "..");

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

  test("runs the proof gate before pushing, with no shared baseline to reconcile", () => {
    const commit = indexOf(steps, /git commit/);
    const gate = indexOf(steps, /scripts\/proof-gate\.sh/);
    const push = indexOf(steps, /git push/);
    expect(commit).toBeLessThan(gate);
    expect(gate).toBeLessThan(push);
    expect(push).toBe(steps.length - 1);
    expect(steps[push]?.run).not.toContain("git commit");
    expect(steps[gate]?.run).not.toContain("--fresh-evidence");
    expect(
      steps.some((step) => /baseline/.test(`${step.name}\n${step.run}`)),
    ).toBe(false);
    expect(existsSync(path.join(ROOT, "proof", "baseline.json"))).toBe(false);
    for (const index of [commit, gate, push]) {
      expect(steps[index]?.["working-directory"]).toBe("pr");
    }
  });
});
