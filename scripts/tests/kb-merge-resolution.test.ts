// implements REQ-ci-kb-merge-resolution
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.join(import.meta.dir, "..", "..");

type Step = {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  "working-directory"?: string;
  if?: unknown;
  "continue-on-error"?: unknown;
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

/**
 * The steps GitHub Actions runs when the step matching `failing` fails: the
 * job stops at the first failing step, and only a step whose `if:` asks for
 * always() or failure() still runs after it.
 */
function stepsRunWhenFailing(steps: Step[], failing: RegExp): Step[] {
  const ran: Step[] = [];
  let failed = false;
  for (const step of steps) {
    if (failed && !/\b(always|failure)\(\)/.test(String(step.if ?? ""))) continue;
    ran.push(step);
    if (pattern(step, failing)) failed = true;
  }
  return ran;
}

function pattern(step: Step, regex: RegExp): boolean {
  return regex.test(`${step.name ?? ""}\n${step.run ?? ""}`);
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

  // Runs the workflow's own gate and push steps, in order, the way a runner
  // does (bash -e, stop at the first failing step), against a scratch remote.
  // The fake Kibi only answers `status`, so the gate decides from that alone.
  function runGateAndPush(syncState: "fresh" | "stale") {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-kb-merge-gate-"));
    try {
      const git = (cwd: string, ...args: string[]) => {
        const result = spawnSync("git", args, { cwd, encoding: "utf8" });
        expect(result.status, `git ${args.join(" ")}: ${result.stderr}`).toBe(
          0,
        );
        return result.stdout.trim();
      };
      const remote = path.join(root, "remote.git");
      git(root, "init", "--bare", "-q", "-b", "develop", remote);
      const pr = path.join(root, "pr");
      git(root, "clone", "-q", remote, pr);
      git(pr, "config", "user.email", "test@example.com");
      git(pr, "config", "user.name", "Kibi Test");
      git(pr, "checkout", "-q", "-b", "feature/stale");
      writeFileSync(path.join(pr, "README.md"), "base\n");
      git(pr, "add", "README.md");
      git(pr, "commit", "-q", "-m", "base");
      git(pr, "push", "-q", "origin", "HEAD:refs/heads/feature/stale");
      const before = git(remote, "rev-parse", "refs/heads/feature/stale");
      writeFileSync(path.join(pr, "README.md"), "merged\n");
      git(pr, "commit", "-q", "-am", "Merge develop into feature/stale");

      mkdirSync(path.join(pr, "scripts"));
      copyFileSync(
        path.join(ROOT, "scripts", "proof-gate.sh"),
        path.join(pr, "scripts", "proof-gate.sh"),
      );
      const fakeKibi = path.join(root, "fake-kibi.mjs");
      writeFileSync(
        fakeKibi,
        `if (process.argv[2] === "status") {
  console.log(JSON.stringify({ syncState: ${JSON.stringify(syncState)}, dirty: false }));
} else if (process.argv[2] !== "check") {
  process.exit(3);
}
`,
      );

      const gate = indexOf(steps, /scripts\/proof-gate\.sh/);
      const ran: { name: string; status: number | null; stderr: string }[] = [];
      for (const step of steps.slice(gate)) {
        // A step after the gate that ran on failure would defeat it.
        expect(step.if).toBeUndefined();
        expect(step["continue-on-error"]).toBeUndefined();
        const result = spawnSync("bash", ["-e", "-c", step.run ?? ""], {
          cwd: pr,
          encoding: "utf8",
          env: {
            ...process.env,
            KIBI_CLI: fakeKibi,
            KIBI_BRANCH: "feature/stale",
          },
        });
        ran.push({
          name: step.name ?? "",
          status: result.status,
          stderr: result.stderr,
        });
        if (result.status !== 0) break;
      }
      const after = git(remote, "rev-parse", "refs/heads/feature/stale");
      return { ran, pushed: after !== before };
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  test("a failing proof gate stops the job before the merge is pushed", () => {
    const failing = runGateAndPush("stale");
    expect(failing.ran).toHaveLength(1);
    expect(failing.ran[0]?.status).not.toBe(0);
    expect(failing.ran[0]?.stderr).toContain(
      "The proof gate needs a fresh Kibi store",
    );
    expect(failing.pushed).toBe(false);

    // Control: with a passing gate the same steps do push, so the refusal
    // above comes from the gate and not from a broken harness.
    const passing = runGateAndPush("fresh");
    expect(passing.ran.map((step) => step.status)).toEqual([0, 0]);
    expect(passing.pushed).toBe(true);
  });

  test("a merge that fails the proof gate is never pushed, and a push ordered before the gate is refused", () => {
    const ranAfterFailedGate = stepsRunWhenFailing(
      steps,
      /scripts\/proof-gate\.sh/,
    );
    expect(
      ranAfterFailedGate.some((step) =>
        pattern(step, /scripts\/proof-gate\.sh/),
      ),
    ).toBe(true);
    expect(ranAfterFailedGate.some((step) => pattern(step, /git push/))).toBe(
      false,
    );
    // The same workflow with the push moved ahead of the gate: the failing
    // gate no longer stops the push, and the order check rejects it.
    const gate = steps.findIndex((step) =>
      pattern(step, /scripts\/proof-gate\.sh/),
    );
    const push = steps.findIndex((step) => pattern(step, /git push/));
    const reordered = steps.filter((_, index) => index !== push);
    reordered.splice(gate, 0, steps[push] as Step);
    expect(
      stepsRunWhenFailing(reordered, /scripts\/proof-gate\.sh/).some((step) =>
        pattern(step, /git push/),
      ),
    ).toBe(true);
    expect(() =>
      expect(indexOf(reordered, /scripts\/proof-gate\.sh/)).toBeLessThan(
        indexOf(reordered, /git push/),
      ),
    ).toThrow();
  });
});
