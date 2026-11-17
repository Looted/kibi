/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * Kibi merge train: land labelled pull requests in batches, each batch proven
 * once as one pull request.
 *
 * Every run reads the open pull requests into the base branch and takes one
 * step per train (a pull request from a `merge-train/` branch):
 *
 *   - its required checks passed on the exact head it assembled, on the
 *     current base tip: merge it (a merge commit, so the base's tree is the
 *     proven tree);
 *   - they failed: re-run the failed jobs once, then split the train into two
 *     halves that are proven separately; a train of one pull request that
 *     fails twice ejects that pull request, which is the only way a failed
 *     proof removes one;
 *   - the base moved, the train branch moved, or a member left: close it and
 *     assemble the same pull requests again on the new base;
 *   - otherwise wait.
 *
 * With no train open it assembles one from the admitted pull requests: the
 * train label, not a draft, from this repository, and every required check
 * passed on the current head. A train lands only when the required checks and
 * the train checks passed on its head, so a check that is too slow to run on
 * every pull request runs once per train. Assembly merges each head into the base tip in
 * pull request order with `kibi merge-driver`, runs `kibi sync` and the check
 * after each merge, and ejects a pull request that conflicts or fails the
 * check before anything expensive runs.
 *
 * Configuration comes from the environment (the action sets it):
 *   MERGE_TRAIN_BASE    base branch (required)
 *   MERGE_TRAIN_CHECKS  required check names, comma or newline separated
 *   MERGE_TRAIN_TRAIN_CHECKS  check names a train must also pass before it
 *                       lands, but a pull request needs not to board, such as
 *                       a slow proof that runs only on trains
 *   MERGE_TRAIN_KIBI    command that runs the base branch's Kibi
 *   MERGE_TRAIN_CHECK   shell command run after each merge; "" runs none
 *   MERGE_TRAIN_LABEL   boarding label (default "train")
 *   MERGE_TRAIN_MAX     most pull requests in one train (default 8)
 *   MERGE_TRAIN_PREFIX  train branch prefix (default "merge-train/")
 *   MERGE_TRAIN_REMOTE  remote to fetch from and push to (default origin)
 *   MERGE_TRAIN_COMMITTER_NAME, MERGE_TRAIN_COMMITTER_EMAIL  merge identity
 *   GH_REPO             owner/name; gh uses GH_TOKEN
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type Checks = "success" | "pending" | "failure";

export type Pull = Readonly<{
  number: number;
  branch: string;
  headSha: string;
  draft: boolean;
  sameRepo: boolean;
  labels: readonly string[];
  checks: Checks;
}>;

export const META_VERSION = "kibi.merge-train.v1";

export type TrainMeta = Readonly<{
  version: typeof META_VERSION;
  prs: readonly number[];
  base: string;
  head: string;
  rerun: boolean;
}>;

export type Train = Readonly<{
  number: number;
  branch: string;
  headSha: string;
  meta: TrainMeta;
  checks: Checks;
}>;

export type Config = Readonly<{ label: string; max: number }>;

export type Action =
  | { kind: "land"; train: number; sha: string }
  | { kind: "rerun"; train: number }
  | { kind: "close"; train: number; reason: string }
  | { kind: "eject"; pull: number; reason: string }
  | { kind: "assemble"; prs: number[]; reason: string }
  | { kind: "wait"; train: number };

/** Why a pull request may not board a train, or null when it may. */
export function refusal(pull: Pull | undefined, config: Config): string | null {
  if (pull === undefined) return "it is no longer open";
  if (!pull.labels.includes(config.label))
    return `it does not carry the ${config.label} label`;
  if (pull.draft) return "it is a draft";
  if (!pull.sameRepo) return "it comes from another repository";
  if (pull.checks !== "success")
    return "its required checks have not all passed on its current head";
  return null;
}

/** The step each open train takes, and a new train when none is open. */
export function plan(
  state: Readonly<{
    base: string;
    trains: readonly Train[];
    pulls: readonly Pull[];
    config: Config;
  }>,
): Action[] {
  const { base, config } = state;
  const byNumber = new Map(state.pulls.map((pull) => [pull.number, pull]));
  const boarded = new Set<number>();
  const actions: Action[] = [];
  const again = (prs: readonly number[], reason: string) => {
    const admitted = prs.filter(
      (pr) => refusal(byNumber.get(pr), config) === null,
    );
    if (admitted.length > 0)
      actions.push({ kind: "assemble", prs: admitted, reason });
  };
  let landed = false;
  for (const train of [...state.trains].sort((a, b) => a.number - b.number)) {
    const prs = train.meta.prs;
    for (const pr of prs) boarded.add(pr);
    const left = prs
      .map((pr) => [pr, refusal(byNumber.get(pr), config)] as const)
      .find(([, why]) => why !== null);
    if (left !== undefined) {
      actions.push({
        kind: "close",
        train: train.number,
        reason: `#${left[0]} left the train: ${left[1]}`,
      });
      again(prs, `the rest of train #${train.number}`);
      continue;
    }
    if (train.headSha !== train.meta.head) {
      actions.push({
        kind: "close",
        train: train.number,
        reason: "its branch moved after it was assembled",
      });
      again(prs, `train #${train.number} again`);
      continue;
    }
    if (landed || train.meta.base !== base) {
      actions.push({
        kind: "close",
        train: train.number,
        reason:
          "the base branch moved since it was assembled, so its checks no longer cover what would merge",
      });
      again(prs, `train #${train.number} on the new base`);
      continue;
    }
    if (train.checks === "pending") {
      actions.push({ kind: "wait", train: train.number });
    } else if (train.checks === "success") {
      actions.push({ kind: "land", train: train.number, sha: train.headSha });
      landed = true;
    } else if (!train.meta.rerun) {
      actions.push({ kind: "rerun", train: train.number });
    } else if (prs.length === 1) {
      const only = prs[0] as number;
      actions.push({
        kind: "eject",
        pull: only,
        reason: `its required checks failed twice in train #${train.number}, which held only this pull request`,
      });
      actions.push({
        kind: "close",
        train: train.number,
        reason: `its required checks failed twice; #${only} was ejected`,
      });
    } else {
      const half = Math.ceil(prs.length / 2);
      actions.push({
        kind: "close",
        train: train.number,
        reason:
          "its required checks failed twice; each half is proven separately",
      });
      again(prs.slice(0, half), `first half of failed train #${train.number}`);
      again(prs.slice(half), `second half of failed train #${train.number}`);
    }
  }
  if (state.trains.length === 0) {
    const queue = state.pulls
      .filter(
        (pull) => !boarded.has(pull.number) && refusal(pull, config) === null,
      )
      .map((pull) => pull.number)
      .sort((a, b) => a - b)
      .slice(0, config.max);
    if (queue.length > 0)
      actions.push({ kind: "assemble", prs: queue, reason: "new train" });
  }
  const order = ["land", "rerun", "eject", "close", "wait", "assemble"];
  return actions
    .map((action, index) => ({ action, index }))
    .sort(
      (a, b) =>
        order.indexOf(a.action.kind) - order.indexOf(b.action.kind) ||
        a.index - b.index,
    )
    .map(({ action }) => action);
}

const META = /<!-- kibi-merge-train (\{.*?\}) -->/s;

export function readMeta(body: string | null | undefined): TrainMeta | null {
  const match = META.exec(body ?? "");
  if (!match) return null;
  let value: unknown;
  try {
    value = JSON.parse(match[1] as string);
  } catch {
    return null;
  }
  const meta = value as Partial<TrainMeta>;
  return meta?.version === META_VERSION &&
    Array.isArray(meta.prs) &&
    meta.prs.every((pr) => Number.isSafeInteger(pr)) &&
    typeof meta.base === "string" &&
    typeof meta.head === "string" &&
    typeof meta.rerun === "boolean"
    ? (meta as TrainMeta)
    : null;
}

export function trainBody(meta: TrainMeta, reason: string): string {
  return [
    `Merge train (${reason}): ${meta.prs.map((pr) => `#${pr}`).join(", ")}.`,
    "",
    "Each pull request is merged into the base in this order. The train merges only when its required checks pass on this exact head; do not push to this branch.",
    "",
    `<!-- kibi-merge-train ${JSON.stringify(meta)} -->`,
  ].join("\n");
}

/** One aggregate state for the named checks on a commit's check runs. */
export function aggregate(
  runs: ReadonlyArray<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
  }>,
  names: readonly string[],
): Checks {
  if (names.length === 0) return "pending";
  let state: Checks = "success";
  for (const name of names) {
    const latest = runs
      .filter((run) => run.name === name)
      .sort((a, b) => b.id - a.id)[0];
    if (latest === undefined || latest.status !== "completed")
      state = "pending";
    else if (latest.conclusion !== "success") return "failure";
  }
  return state;
}

export type Runner = Readonly<{
  /** Runs gh with the arguments; stdin is `input` when given. Throws on failure. */
  gh(args: readonly string[], input?: string): string;
  /** Runs a command; never throws. */
  exec(
    command: string,
    args: readonly string[],
    options?: { cwd?: string; env?: Record<string, string> },
  ): { status: number; stdout: string; stderr: string };
  now(): number;
  log(line: string): void;
}>;

export type Settings = Readonly<{
  repo: string;
  base: string;
  checks: readonly string[];
  /** Checks only a train must pass; a pull request boards without them. */
  trainChecks: readonly string[];
  kibi: string;
  check: string;
  label: string;
  max: number;
  prefix: string;
  remote: string;
  workDir: string;
  /** The base branch checkout git runs in. */
  cwd: string;
  committerName: string;
  committerEmail: string;
}>;

type ApiPull = {
  number: number;
  draft: boolean;
  body: string | null;
  head: { ref: string; sha: string; repo: { full_name: string } | null };
  labels: Array<{ name: string }>;
};

export class MergeTrain {
  readonly summary: string[] = [];
  readonly settings: Settings;
  readonly run: Runner;

  // No parameter properties: Node runs this file by stripping types only.
  constructor(settings: Settings, run: Runner) {
    this.settings = settings;
    this.run = run;
  }

  private api(path: string, method = "GET", body?: unknown): unknown {
    const args = ["api", "--method", method, path];
    const out =
      body === undefined
        ? this.run.gh(args)
        : this.run.gh([...args, "--input", "-"], JSON.stringify(body));
    return out.trim() === "" ? null : JSON.parse(out);
  }

  private note(line: string): void {
    this.summary.push(line);
    this.run.log(line);
  }

  private git(args: readonly string[], cwd?: string) {
    return this.run.exec("git", ["-c", "core.hooksPath=/dev/null", ...args], {
      cwd: cwd ?? this.settings.cwd,
    });
  }

  private mustGit(args: readonly string[], cwd?: string): string {
    const result = this.git(args, cwd);
    if (result.status !== 0)
      throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
    return result.stdout.trim();
  }

  checksOf(sha: string, checks = this.settings.checks): Checks {
    const { repo } = this.settings;
    const response = this.api(
      `repos/${repo}/commits/${sha}/check-runs?per_page=100`,
    ) as {
      check_runs: Array<{
        id: number;
        name: string;
        status: string;
        conclusion: string | null;
      }>;
    };
    return aggregate(response.check_runs, checks);
  }

  read(): { base: string; trains: Train[]; pulls: Pull[] } {
    const { repo, base, prefix, label } = this.settings;
    const pulls: Pull[] = [];
    const trains: Train[] = [];
    const listed = this.api(
      `repos/${repo}/pulls?state=open&base=${encodeURIComponent(base)}&per_page=100`,
    ) as ApiPull[];
    for (const pr of listed) {
      const sameRepo = pr.head.repo?.full_name === repo;
      if (pr.head.ref.startsWith(prefix) && sameRepo) {
        const meta = readMeta(pr.body);
        if (meta === null) continue;
        trains.push({
          number: pr.number,
          branch: pr.head.ref,
          headSha: pr.head.sha,
          meta,
          checks: this.checksOf(pr.head.sha, [
            ...this.settings.checks,
            ...this.settings.trainChecks,
          ]),
        });
        continue;
      }
      const labels = pr.labels.map((entry) => entry.name);
      const candidate = labels.includes(label) && !pr.draft && sameRepo;
      pulls.push({
        number: pr.number,
        branch: pr.head.ref,
        headSha: pr.head.sha,
        draft: pr.draft,
        sameRepo,
        labels,
        checks: candidate ? this.checksOf(pr.head.sha) : "pending",
      });
    }
    this.mustGit([
      "fetch",
      "--quiet",
      "--no-tags",
      this.settings.remote,
      `+refs/heads/${base}:refs/remotes/${this.settings.remote}/${base}`,
    ]);
    return {
      base: this.mustGit(["rev-parse", `${this.settings.remote}/${base}`]),
      trains,
      pulls,
    };
  }

  private comment(number: number, body: string): void {
    this.api(`repos/${this.settings.repo}/issues/${number}/comments`, "POST", {
      body,
    });
  }

  private deleteBranch(branch: string): void {
    try {
      this.api(
        `repos/${this.settings.repo}/git/refs/heads/${branch}`,
        "DELETE",
      );
    } catch {
      // Already gone, or GitHub deleted it on merge.
    }
  }

  eject(pull: number, reason: string): void {
    const { repo, label } = this.settings;
    this.comment(
      pull,
      `Removed from the merge train: ${reason}. Fix it and add the \`${label}\` label again to board the next train.`,
    );
    try {
      this.api(
        `repos/${repo}/issues/${pull}/labels/${encodeURIComponent(label)}`,
        "DELETE",
      );
    } catch {
      // The label was already removed.
    }
    this.note(`#${pull}: ejected, ${reason}`);
  }

  execute(actions: readonly Action[], trains: readonly Train[]): void {
    const { repo } = this.settings;
    const byNumber = new Map(trains.map((train) => [train.number, train]));
    for (const action of actions) {
      const train = "train" in action ? byNumber.get(action.train) : undefined;
      switch (action.kind) {
        case "wait":
          this.note(`train #${action.train}: waiting for its required checks`);
          break;
        case "land":
          this.api(`repos/${repo}/pulls/${action.train}/merge`, "PUT", {
            merge_method: "merge",
            sha: action.sha,
            commit_title: `Merge train #${action.train}: ${train?.meta.prs.map((pr) => `#${pr}`).join(", ")}`,
          });
          if (train) this.deleteBranch(train.branch);
          this.note(
            `train #${action.train}: merged ${action.sha.slice(0, 12)}`,
          );
          break;
        case "rerun": {
          const sha = train?.headSha as string;
          const runs = this.api(
            `repos/${repo}/actions/runs?head_sha=${sha}&per_page=100`,
          ) as {
            workflow_runs: Array<{ id: number; conclusion: string | null }>;
          };
          for (const failed of runs.workflow_runs.filter((r) =>
            ["failure", "cancelled", "timed_out"].includes(
              String(r.conclusion),
            ),
          ))
            this.api(
              `repos/${repo}/actions/runs/${failed.id}/rerun-failed-jobs`,
              "POST",
            );
          const meta = { ...(train as Train).meta, rerun: true };
          this.api(`repos/${repo}/pulls/${action.train}`, "PATCH", {
            body: trainBody(meta, "re-running its failed jobs once"),
          });
          this.note(`train #${action.train}: re-running its failed jobs once`);
          break;
        }
        case "eject":
          this.eject(action.pull, action.reason);
          break;
        case "close":
          this.comment(action.train, `Closed: ${action.reason}.`);
          this.api(`repos/${repo}/pulls/${action.train}`, "PATCH", {
            state: "closed",
          });
          if (train) this.deleteBranch(train.branch);
          this.note(`train #${action.train}: closed, ${action.reason}`);
          break;
        case "assemble":
          this.assemble(action.prs, action.reason);
          break;
      }
    }
  }

  /** Merges `prs` into the base tip one by one and opens the train. */
  assemble(prs: readonly number[], reason: string): number | null {
    const { repo, base, remote, kibi, check, prefix } = this.settings;
    const pulls = new Map(
      (
        this.api(
          `repos/${repo}/pulls?state=open&base=${encodeURIComponent(base)}&per_page=100`,
        ) as ApiPull[]
      ).map((pr) => [pr.number, pr]),
    );
    const refs = [`+refs/heads/${base}:refs/remotes/${remote}/${base}`];
    for (const pr of prs) {
      const branch = pulls.get(pr)?.head.ref;
      if (branch)
        refs.push(`+refs/heads/${branch}:refs/remotes/${remote}/${branch}`);
    }
    this.mustGit(["fetch", "--quiet", "--no-tags", remote, ...refs]);
    const baseSha = this.mustGit(["rev-parse", `${remote}/${base}`]);
    const tree = mkdtempSync(path.join(this.settings.workDir, "merge-train-"));
    rmSync(tree, { recursive: true, force: true });
    this.mustGit(["worktree", "add", "--quiet", "--detach", tree, baseSha]);
    const merged: number[] = [];
    try {
      for (const pr of prs) {
        const head = pulls.get(pr);
        if (head === undefined) {
          this.note(`#${pr}: skipped, no longer open`);
          continue;
        }
        const result = this.git(
          [
            "-c",
            `merge.kibi.driver=${kibi} merge-driver %O %A %B`,
            "-c",
            `user.name=${this.settings.committerName}`,
            "-c",
            `user.email=${this.settings.committerEmail}`,
            "merge",
            "--no-ff",
            "-m",
            `Merge pull request #${pr} from ${repo}:${head.head.ref}`,
            head.head.sha,
          ],
          tree,
        );
        if (result.status !== 0) {
          const unmerged = this.git(
            ["diff", "--name-only", "--diff-filter=U"],
            tree,
          )
            .stdout.trim()
            .split("\n")
            .filter(Boolean);
          this.git(["merge", "--abort"], tree);
          this.eject(
            pr,
            `it conflicts with ${base} or an earlier pull request in the train${unmerged.length > 0 ? ` (${unmerged.join(", ")})` : ""}`,
          );
          continue;
        }
        const failure = this.verify(tree, head.head.ref, kibi, check);
        if (failure !== null) {
          this.mustGit(["reset", "--quiet", "--hard", "HEAD^"], tree);
          this.eject(pr, failure);
          continue;
        }
        merged.push(pr);
      }
      if (merged.length === 0) {
        this.note(`no train assembled for ${reason}: no pull request merged`);
        return null;
      }
      const head = this.mustGit(["rev-parse", "HEAD"], tree);
      const branch = `${prefix}${this.run.now()}`;
      this.mustGit(
        ["push", "--quiet", remote, `HEAD:refs/heads/${branch}`],
        tree,
      );
      const meta: TrainMeta = {
        version: META_VERSION,
        prs: merged,
        base: baseSha,
        head,
        rerun: false,
      };
      const opened = this.api(`repos/${repo}/pulls`, "POST", {
        title: `Merge train: ${merged.map((pr) => `#${pr}`).join(", ")}`,
        head: branch,
        base,
        body: trainBody(meta, reason),
      }) as { number: number };
      this.note(
        `train #${opened.number}: assembled ${merged.map((pr) => `#${pr}`).join(", ")} (${reason})`,
      );
      return opened.number;
    } finally {
      this.git(["worktree", "remove", "--force", tree]);
    }
  }

  /** Runs kibi sync and the check in the merged tree; the reason it failed, or null. */
  private verify(
    tree: string,
    branch: string,
    kibi: string,
    check: string,
  ): string | null {
    const env = { KIBI: kibi, KIBI_BRANCH: branch };
    if (
      kibi !== "" &&
      this.run.exec("bash", ["-c", `${kibi} sync`], { cwd: tree, env })
        .status !== 0
    )
      return "kibi sync failed after merging it into the train";
    if (this.git(["diff", "--quiet", "HEAD"], tree).status !== 0)
      return "kibi sync changed tracked files after merging it into the train";
    if (
      check !== "" &&
      this.run.exec("bash", ["-c", check], { cwd: tree, env }).status !== 0
    )
      return "the check failed after merging it into the train";
    return null;
  }

  step(): Action[] {
    const state = this.read();
    const actions = plan({
      ...state,
      config: { label: this.settings.label, max: this.settings.max },
    });
    this.execute(actions, state.trains);
    if (actions.length === 0)
      this.note("nothing to do: no open train and no admitted pull request");
    return actions;
  }
}

export function settingsFromEnv(env: NodeJS.ProcessEnv): Settings {
  const base = env.MERGE_TRAIN_BASE?.trim();
  const repo = env.GH_REPO?.trim();
  if (!base) throw new Error("MERGE_TRAIN_BASE names the base branch");
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo))
    throw new Error("GH_REPO names the repository as owner/name");
  const names = (value: string | undefined) =>
    (value ?? "")
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter(Boolean);
  const checks = names(env.MERGE_TRAIN_CHECKS);
  if (checks.length === 0)
    throw new Error("MERGE_TRAIN_CHECKS names at least one required check");
  const max = Number(env.MERGE_TRAIN_MAX || "8");
  if (!Number.isSafeInteger(max) || max < 1)
    throw new Error("MERGE_TRAIN_MAX must be a positive integer");
  return {
    repo,
    base,
    checks,
    trainChecks: names(env.MERGE_TRAIN_TRAIN_CHECKS).filter(
      (name) => !checks.includes(name),
    ),
    kibi: env.MERGE_TRAIN_KIBI?.trim() ?? "",
    check: env.MERGE_TRAIN_CHECK ?? "",
    label: env.MERGE_TRAIN_LABEL?.trim() || "train",
    max,
    prefix: env.MERGE_TRAIN_PREFIX?.trim() || "merge-train/",
    remote: env.MERGE_TRAIN_REMOTE?.trim() || "origin",
    workDir: env.RUNNER_TEMP || os.tmpdir(),
    cwd: process.cwd(),
    committerName:
      env.MERGE_TRAIN_COMMITTER_NAME?.trim() || "github-actions[bot]",
    committerEmail:
      env.MERGE_TRAIN_COMMITTER_EMAIL?.trim() ||
      "41898282+github-actions[bot]@users.noreply.github.com",
  };
}

export const processRunner: Runner = {
  gh(args, input) {
    const result = spawnSync("gh", args, {
      encoding: "utf8",
      input,
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status !== 0)
      throw new Error(`gh ${args.join(" ")} failed: ${result.stderr.trim()}`);
    return result.stdout;
  },
  exec(command, args, options = {}) {
    const result = spawnSync(command, args, {
      encoding: "utf8",
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      maxBuffer: 64 * 1024 * 1024,
    });
    return {
      status: result.status ?? 1,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  },
  now: () => Date.now(),
  log: (line) => process.stdout.write(`${line}\n`),
};

export function main(
  env: NodeJS.ProcessEnv,
  runner: Runner = processRunner,
): number {
  let train: MergeTrain;
  try {
    train = new MergeTrain(settingsFromEnv(env), runner);
  } catch (error) {
    runner.log(`::error::${(error as Error).message}`);
    return 2;
  }
  try {
    train.step();
    return 0;
  } catch (error) {
    runner.log(`::error::${(error as Error).message}`);
    return 1;
  } finally {
    if (env.GITHUB_STEP_SUMMARY && train.summary.length > 0)
      appendFileSync(
        env.GITHUB_STEP_SUMMARY,
        `### Merge train into \`${train.settings.base}\`\n\n${train.summary.map((line) => `- ${line}`).join("\n")}\n`,
      );
  }
}

// biome-ignore format: one line, so the entry point is a covered line.
if (import.meta.main ?? process.argv[1] === new URL(import.meta.url).pathname) process.exitCode = main(process.env);
