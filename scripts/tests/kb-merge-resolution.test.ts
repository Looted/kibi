import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Fixture, ROOT, manifestConflict } from "./kb-merge-fixture.ts";

type Step = {
  name?: string;
  if?: string;
  id?: string;
  uses?: string;
  run?: string;
  with?: Record<string, string>;
  env?: Record<string, string>;
  "working-directory"?: string;
};

type Job = {
  if?: string;
  needs?: string[];
  permissions?: Record<string, string>;
  steps: Step[];
};

const workflow = Bun.YAML.parse(
  readFileSync(path.join(ROOT, ".github/workflows/kb-merge.yml"), "utf8"),
) as {
  on: { push: { branches: string[] } };
  concurrency: { group: string; "cancel-in-progress": string };
  jobs: { "find-conflicts": Job; resolve: Job };
};
const find = workflow.jobs["find-conflicts"].steps;
const resolve = workflow.jobs.resolve.steps;

function index(steps: Step[], match: (step: Step) => boolean): number {
  const at = steps.findIndex(match);
  expect(at, "no matching step").toBeGreaterThanOrEqual(0);
  return at;
}

const isAction = (step: Step) => step.uses === "./actions/kb-merge";

describe("KB merge workflow", () => {
  test("builds Kibi from develop and merges with develop's build through the published action", () => {
    expect(resolve[0]?.uses).toMatch(/^actions\/checkout@/);
    expect(resolve[0]?.with?.ref).toBe("develop");
    expect(resolve[0]?.with?.path).toBeUndefined();
    expect(resolve[0]?.with?.token).toBe(
      "${{ secrets.KIBI_MERGE_TOKEN || github.token }}",
    );
    const build = index(resolve, (step) =>
      /bun run build:cli-stack/.test(step.run ?? ""),
    );
    const merge = index(resolve, isAction);
    expect(build).toBeLessThan(merge);
    expect(resolve[merge]?.with?.kibi).toBe(
      "node ${{ github.workspace }}/packages/cli/bin/kibi",
    );
    expect(resolve[merge]?.with?.branches).toBe(
      "${{ needs.find-conflicts.outputs.branches }}",
    );
    // Only develop is checked out and installed: the PR branches are merged
    // in worktrees by the action and never installed or built.
    expect(
      resolve.filter((step) => step.uses?.startsWith("actions/checkout")),
    ).toHaveLength(1);
    for (const step of resolve) {
      expect(step["working-directory"]).toBeUndefined();
    }
  });

  test("leaves PRs boarded on the merge train to the train", () => {
    // The train merges manifests itself; a push to a boarded PR would
    // restart its checks under the train. Both the listing and the merge
    // skip the train label, so a train-labelled PR never gets a swipl build.
    expect(find[index(find, isAction)]?.with?.["skip-label"]).toBe("train");
    expect(resolve[index(resolve, isAction)]?.with?.["skip-label"]).toBe(
      "train",
    );
  });

  test("runs the proof gate as the check the action passes before pushing", () => {
    const merge = index(resolve, isAction);
    expect(resolve[merge]?.with?.check).toBe("sh scripts/proof-gate.sh");
    expect(resolve[merge]?.env?.KIBI_CLI).toBe(
      "${{ github.workspace }}/packages/cli/bin/kibi",
    );
    expect(merge).toBe(resolve.length - 1);
    // Nothing in the workflow pushes by itself: only the action does, after
    // the check.
    for (const step of [...find, ...resolve]) {
      expect(step.run ?? "").not.toContain("git push");
    }
    expect(existsSync(path.join(ROOT, "proof", "baseline.json"))).toBe(false);
  });

  test("checks every PR when develop moves and only the pushed branch's PR otherwise", () => {
    expect(workflow.on.push.branches).toEqual(["**"]);
    const list = find[index(find, isAction)] as Step;
    expect(list.with?.["list-only"]).toBe("true");
    // Until develop has the action, the list step is skipped and nothing runs.
    expect(list.if).toBe("${{ steps.ready.outputs.present == 'true' }}");
    expect(list.with?.base).toBe("develop");
    expect(list.with?.branches).toBe(
      "${{ github.event_name == 'push' && github.ref_name != 'develop' && github.ref_name || '' }}",
    );
    expect(workflow.concurrency.group).toBe(
      "kibi-kb-merge-${{ github.ref_name }}",
    );
    expect(workflow.concurrency["cancel-in-progress"]).toBe(
      "${{ github.ref_name != 'develop' }}",
    );
    expect(workflow.jobs.resolve.if).toBe(
      "${{ needs.find-conflicts.outputs.branches != '[]' && needs.find-conflicts.outputs.branches != '' }}",
    );
  });

  // Runs the action the way the resolve job configures it, with Kibi's real
  // proof gate script as the check and a fake Kibi whose `status` decides the
  // gate, against a scratch remote.
  function runWithProofGate(syncState: "fresh" | "stale") {
    const fx = new Fixture();
    manifestConflict(fx);
    // The gate is the merged tree's own scripts/proof-gate.sh.
    addProofGate(fx);
    const before = fx.tip("feature/one");
    const merge = resolve[index(resolve, isAction)] as Step;
    const run = fx.run({
      KB_MERGE_CHECK: merge.with?.check ?? "",
      KIBI_CLI: fx.kibi,
      FAKE_SYNC_STATE: syncState,
    });
    return { run, pushed: fx.tip("feature/one") !== before };
  }

  function addProofGate(fx: Fixture): void {
    fx.commit("develop", {
      "scripts/proof-gate.sh": readFileSync(
        path.join(ROOT, "scripts", "proof-gate.sh"),
        "utf8",
      ),
    });
  }

  test("a merge that fails the proof gate is never pushed", () => {
    const failing = runWithProofGate("stale");
    expect(failing.run.status).not.toBe(0);
    expect(failing.run.stderr).toContain(
      "The proof gate needs a fresh Kibi store",
    );
    expect(failing.run.outputs.failed).toEqual(["feature/one"]);
    expect(failing.pushed).toBe(false);

    // Control: with a passing gate the same run does push, so the refusal
    // above comes from the gate and not from a broken harness.
    const passing = runWithProofGate("fresh");
    expect(passing.run.status, passing.run.stderr).toBe(0);
    expect(passing.pushed).toBe(true);
  });
});
