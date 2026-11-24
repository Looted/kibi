import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

type Job = {
  name?: string;
  if?: string;
  needs?: string[];
  steps?: Array<{ name?: string; env?: Record<string, string>; run?: string }>;
};
type Workflow = { jobs: Record<string, Job> };

function workflow(name: string): Workflow {
  return Bun.YAML.parse(
    readFileSync(join(ROOT, ".github", "workflows", name), "utf8"),
  ) as Workflow;
}

describe("one required check per workflow", () => {
  for (const [file, aggregate, exempt] of [
    ["ci.yml", "ci-required", []],
    ["proof.yml", "proof-required", ["deploy"]],
  ] as const) {
    test(`${aggregate} needs every other ${file} job and passes only when all succeed`, () => {
      const jobs = workflow(file).jobs;
      const job = jobs[aggregate];
      expect(job?.name).toBe(aggregate);
      // It must report even when a needed job fails or is skipped, or a
      // ruleset requiring it would wait forever instead of failing.
      expect(job?.if).toContain("always()");
      const others = Object.keys(jobs).filter(
        (id) => id !== aggregate && !(exempt as readonly string[]).includes(id),
      );
      expect([...(job?.needs ?? [])].sort()).toEqual(others.sort());
      const step = job?.steps?.[0];
      expect(step?.env?.RESULTS).toBe("${{ toJSON(needs) }}");
      expect(step?.run).toContain('select(.value.result != "success")');
      expect(step?.run).toContain("exit 1");
    });
  }

  test("the aggregate fails on a skipped, failed or cancelled job and passes when all succeed", () => {
    const run = String(workflow("ci.yml").jobs["ci-required"]?.steps?.[0]?.run);
    const check = (results: Record<string, string>) =>
      Bun.spawnSync(["bash", "-c", run], {
        env: {
          ...process.env,
          RESULTS: JSON.stringify(
            Object.fromEntries(
              Object.entries(results).map(([id, result]) => [id, { result }]),
            ),
          ),
        },
      }).exitCode;
    expect(check({ a: "success", b: "success" })).toBe(0);
    for (const bad of ["failure", "skipped", "cancelled"])
      expect(check({ a: "success", b: bad })).toBe(1);
  });
});

describe("proof fails fast on KB-only gates", () => {
  test("the kb_search gold-set gates run on their own job, after the KB sync and off the prove shards", () => {
    const jobs = workflow("proof.yml").jobs;
    const steps = (jobs["search-gates"]?.steps ?? []).map((step) => step.name);
    const at = (name: string) => {
      const index = steps.indexOf(name);
      expect(index, name).toBeGreaterThanOrEqual(0);
      return index;
    };
    const sync = at("Sync and validate integrity of the proof snapshot");
    const answers = at("Gate kb_search answers on the repository gold set");
    const hints = at("Gate kb_search hints on reworded questions");
    const floor = at("Reject evidence-floor regressions before executing contracts");
    expect(answers).toBeGreaterThan(sync);
    expect(hints).toBeGreaterThan(answers);
    expect(floor).toBeGreaterThan(hints);
    // A prove shard must not run them: they used to sit in front of shard 1.
    const shardSteps = (jobs.prove?.steps ?? []).map((step) => step.name);
    expect(shardSteps).not.toContain(
      "Gate kb_search answers on the repository gold set",
    );
    expect(shardSteps).not.toContain(
      "Gate kb_search hints on reworded questions",
    );
    expect(jobs["search-gates"]?.needs).toEqual(["swipl-bundle", "reuse"]);
    expect(jobs["proof-required"]?.needs).toContain("search-gates");
    // No prove step shares the runner, so the latency thresholds measure search.
    expect(steps.some((name) => name?.includes("Prove"))).toBe(false);
    const cancel = jobs["search-gates"]?.steps?.find(
      (step) => step.name === "Cancel the proof run after a failed gate",
    );
    expect(cancel?.run).toContain('gh run cancel "${GITHUB_RUN_ID}"');
    expect(cancel?.if).toContain("failure()");
    expect(cancel?.["continue-on-error"]).toBe(true);
    expect(floor).toBeLessThan(steps.indexOf(cancel?.name));
  });
});
