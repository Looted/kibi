import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Fixture, git, manifestConflict, write } from "./kb-merge-fixture.ts";

/**
 * Runs actions/kb-merge/kb-merge.sh against scratch repositories (see
 * kb-merge-fixture.ts): which PRs it touches, that the merge uses the Kibi
 * driver, that sync and the check run on the merged tree before the push, and
 * what happens when the branch moves meanwhile.
 */

describe("kibi KB merge action", () => {
  test("merges the base into a PR whose only conflict is a manifest, after sync and the check", () => {
    const fx = new Fixture();
    manifestConflict(fx);
    const before = fx.tip("feature/one");

    const run = fx.run();
    expect(run.status, run.stderr).toBe(0);
    expect(run.outputs.merged).toEqual(["feature/one"]);
    expect(run.outputs.failed).toEqual([]);

    const tip = fx.tip("feature/one");
    expect(tip).not.toBe(before);
    expect(git(fx.remote, "rev-parse", `${tip}^1`)).toBe(before);
    expect(git(fx.remote, "rev-parse", `${tip}^2`)).toBe(fx.tip("develop"));
    expect(git(fx.remote, "log", "-1", "--format=%s", tip)).toBe(
      "Merge develop into feature/one",
    );
    expect(fx.file("feature/one", ".kb/symbols.yaml")).toBe(
      "- SYM-a\n- SYM-feature\n- SYM-develop",
    );
    // The driver merged the manifest, then sync and the check ran on the
    // merged tree for that branch, in that order.
    expect(run.calls).toEqual([
      "merge-driver",
      "sync feature/one true",
      "check feature/one",
    ]);
    expect(run.summary).toContain(
      "| `feature/one` | merged develop and pushed",
    );
  });

  test("leaves a PR with a conflict outside the manifests for a person", () => {
    const fx = new Fixture();
    fx.commit("feature/code", { "README.md": "feature\n" });
    fx.commit("develop", { "README.md": "develop\n" });
    fx.pulls.push({ head: "feature/code" });
    const before = fx.tip("feature/code");

    const run = fx.run();
    expect(run.status, run.stderr).toBe(0);
    expect(run.outputs.blocked).toEqual(["feature/code"]);
    expect(fx.tip("feature/code")).toBe(before);
    expect(run.calls).toEqual([]);
    expect(run.stdout).toContain(
      "conflicts with develop outside Kibi manifests: README.md",
    );
  });

  test("leaves a real conflict inside a manifest for a person", () => {
    const fx = new Fixture();
    fx.commit("develop", { ".kb/symbols.yaml": "- SYM-a\nstatus: draft\n" });
    fx.commit("feature/status", {
      ".kb/symbols.yaml": "- SYM-a\nstatus: active\n",
    });
    fx.commit("develop", {
      ".kb/symbols.yaml": "- SYM-a\nstatus: deprecated\n",
    });
    fx.pulls.push({ head: "feature/status" });
    const before = fx.tip("feature/status");

    const run = fx.run();
    expect(run.status, run.stderr).toBe(0);
    expect(run.outputs.blocked).toEqual(["feature/status"]);
    expect(fx.tip("feature/status")).toBe(before);
    expect(run.calls).toEqual(["merge-driver"]);
  });

  test("never pushes a merge whose check fails, and reports it as a failure", () => {
    const fx = new Fixture();
    manifestConflict(fx);
    const before = fx.tip("feature/one");

    const run = fx.run({ KB_MERGE_CHECK: "$KIBI check && exit 7" });
    expect(run.status).not.toBe(0);
    expect(run.outputs.failed).toEqual(["feature/one"]);
    expect(run.outputs.merged).toEqual([]);
    expect(fx.tip("feature/one")).toBe(before);
    expect(run.stdout).toContain(
      "feature/one was not pushed: the check failed",
    );

    // Control: the same branch with a passing check is pushed, so the refusal
    // comes from the check and not from a broken fixture.
    const passing = fx.run();
    expect(passing.status, passing.stderr).toBe(0);
    expect(fx.tip("feature/one")).not.toBe(before);
  });

  test("never pushes a merge when kibi sync rewrites a tracked file", () => {
    const fx = new Fixture();
    manifestConflict(fx);
    const before = fx.tip("feature/one");

    const run = fx.run({ FAKE_SYNC_REWRITE: "1" });
    expect(run.status).not.toBe(0);
    expect(fx.tip("feature/one")).toBe(before);
    expect(run.stdout).toContain(
      "kibi sync changed tracked files after the merge: .kb/symbols.yaml",
    );
    expect(run.calls).not.toContain("check feature/one");
  });

  test("starts over when the branch moves while it is being merged", () => {
    const fx = new Fixture();
    manifestConflict(fx);
    // The first check pushes a new commit to the PR branch, as an author
    // would; the push of that first merge must be refused and the second
    // attempt must merge on top of the author's commit.
    const marker = path.join(fx.root, "moved");
    const mover = path.join(fx.root, "move.sh");
    write(
      mover,
      `#!/bin/sh
set -e
[ -e "${marker}" ] && exit 0
touch "${marker}"
cd "${fx.seed}"
git fetch -q origin
git checkout -q -B feature/one origin/feature/one
echo late > late.txt
git add late.txt
git commit -q -m "author pushes meanwhile"
git push -q origin HEAD:refs/heads/feature/one
`,
      0o755,
    );
    const run = fx.run({ KB_MERGE_CHECK: `sh ${mover}` });
    expect(run.status, run.stderr).toBe(0);
    expect(run.outputs.merged).toEqual(["feature/one"]);
    expect(run.stdout).toContain(
      "the branch moved while it was being merged (attempt 1 of 3)",
    );
    const tip = fx.tip("feature/one");
    expect(git(fx.remote, "log", "-1", "--format=%s", `${tip}^1`)).toBe(
      "author pushes meanwhile",
    );
    expect(fx.file("feature/one", "late.txt")).toBe("late");
  });

  test("gives up after the configured attempts when the branch keeps moving", () => {
    const fx = new Fixture();
    manifestConflict(fx);
    const counter = path.join(fx.root, "n");
    const mover = path.join(fx.root, "move.sh");
    write(
      mover,
      `#!/bin/sh
set -e
n=$(cat "${counter}" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "${counter}"
cd "${fx.seed}"
git fetch -q origin
git checkout -q -B feature/one origin/feature/one
echo $n > "late-$n.txt"
git add -A
git commit -q -m "move $n"
git push -q origin HEAD:refs/heads/feature/one
`,
      0o755,
    );
    const run = fx.run({
      KB_MERGE_CHECK: `sh ${mover}`,
      KB_MERGE_ATTEMPTS: "2",
    });
    expect(run.status).not.toBe(0);
    expect(run.outputs.failed).toEqual(["feature/one"]);
    expect(readFileSync(counter, "utf8").trim()).toBe("2");
    expect(
      git(fx.remote, "log", "-1", "--format=%s", fx.tip("feature/one")),
    ).toBe("move 2");
  });

  test("treats a branch that already contains the base as done", () => {
    const fx = new Fixture();
    manifestConflict(fx);
    // Someone merges develop by hand after the conflict was found: the
    // test-merge is clean now and nothing is pushed.
    git(fx.seed, "fetch", "-q", "origin");
    git(fx.seed, "checkout", "-q", "-B", "feature/one", "origin/feature/one");
    spawnSync("git", ["merge", "-q", "origin/develop"], { cwd: fx.seed });
    write(
      path.join(fx.seed, ".kb", "symbols.yaml"),
      "- SYM-a\n- SYM-feature\n- SYM-develop\n",
    );
    git(fx.seed, "add", "-A");
    git(fx.seed, "commit", "-q", "--no-edit");
    git(fx.seed, "push", "-q", "origin", "HEAD:refs/heads/feature/one");
    const before = fx.tip("feature/one");

    const run = fx.run();
    expect(run.status, run.stderr).toBe(0);
    expect(fx.tip("feature/one")).toBe(before);
    expect(run.outputs.merged).toEqual([]);
    expect(run.stdout).toContain("feature/one: already merges cleanly");
  });

  test("skips fork PRs and PRs not named in KB_MERGE_BRANCHES", () => {
    const fx = new Fixture();
    manifestConflict(fx, "feature/one");
    fx.commit(
      "feature/two",
      { ".kb/symbols.yaml": "- SYM-a\n- SYM-two\n" },
      "develop~1",
    );
    fx.pulls.push({ head: "feature/two" });
    fx.pulls.push({ head: "fork/branch", cross: true });
    const two = fx.tip("feature/two");

    const run = fx.run({ KB_MERGE_BRANCHES: '["feature/one","fork/branch"]' });
    expect(run.status, run.stderr).toBe(0);
    expect(run.outputs.merged).toEqual(["feature/one"]);
    expect(fx.tip("feature/two")).toBe(two);
    expect(run.stderr).toContain(
      "fork/branch: skipped, the pull request comes from a fork",
    );
  });

  test("leaves PRs with KB_MERGE_SKIP_LABEL alone", () => {
    const fx = new Fixture();
    manifestConflict(fx, "feature/one");
    fx.commit(
      "feature/two",
      { ".kb/symbols.yaml": "- SYM-a\n- SYM-two\n" },
      "develop~1",
    );
    fx.pulls.push({ head: "feature/two", labels: ["docs", "train"] });
    const two = fx.tip("feature/two");

    const run = fx.run({ KB_MERGE_SKIP_LABEL: "train" });
    expect(run.status, run.stderr).toBe(0);
    expect(run.outputs.merged).toEqual(["feature/one"]);
    expect(fx.tip("feature/two")).toBe(two);
    expect(run.stderr).toContain(
      "feature/two: skipped, the pull request has the train label",
    );

    const listed = fx.run({ KB_MERGE_LIST_ONLY: "true" });
    expect(listed.outputs.branches).toContain("feature/two");
  });

  test("list-only names the manifest-only branches and changes nothing", () => {
    const fx = new Fixture();
    manifestConflict(fx, "feature/one");
    fx.commit("feature/code", { "README.md": "feature\n" }, "develop~1");
    fx.pulls.push({ head: "feature/code" });
    fx.commit("feature/clean", { "other.txt": "x\n" });
    fx.pulls.push({ head: "feature/clean" });
    const tips = ["feature/one", "feature/code", "feature/clean"].map((b) =>
      fx.tip(b),
    );

    const run = fx.run({ KB_MERGE_LIST_ONLY: "true", KB_MERGE_KIBI: "" });
    expect(run.status, run.stderr).toBe(0);
    expect(run.outputs.branches).toEqual(["feature/one"]);
    expect(
      ["feature/one", "feature/code", "feature/clean"].map((b) => fx.tip(b)),
    ).toEqual(tips);
    expect(run.calls).toEqual([]);
  });

  test("ignores the repository's git hooks while merging and pushing", () => {
    const fx = new Fixture();
    manifestConflict(fx);
    git(fx.root, "clone", "-q", "-b", "develop", fx.remote, fx.ws);
    for (const hook of ["pre-commit", "commit-msg", "pre-push", "post-merge"]) {
      write(
        path.join(fx.ws, ".git", "hooks", hook),
        "#!/bin/sh\nexit 1\n",
        0o755,
      );
    }
    const run = fx.run();
    expect(run.status, run.stderr).toBe(0);
    expect(run.outputs.merged).toEqual(["feature/one"]);
  });

  test("refuses to run without a Kibi command or with a bad attempt count", () => {
    const fx = new Fixture();
    expect(fx.run({ KB_MERGE_KIBI: "" }).stderr).toContain(
      "KB_MERGE_KIBI must name",
    );
    const bad = fx.run({ KB_MERGE_ATTEMPTS: "0" });
    expect(bad.status).toBe(2);
    expect(bad.stderr).toContain(
      "KB_MERGE_ATTEMPTS must be a positive integer",
    );
  });
});
