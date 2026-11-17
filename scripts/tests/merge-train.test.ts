import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type Action,
  type Config,
  META_VERSION,
  MergeTrain,
  type Pull,
  type Runner,
  type Settings,
  type Train,
  type TrainMeta,
  aggregate,
  main,
  plan,
  processRunner,
  readMeta,
  refusal,
  settingsFromEnv,
  trainBody,
} from "../../actions/merge-train/merge-train.mts";

/**
 * actions/merge-train: the planner's decisions as pure data, then the whole
 * step against scratch git repositories and an in-memory GitHub.
 */

// biome-ignore lint/suspicious/noExplicitAny: loose JSON and YAML in test fakes
type Loose = Record<string, any>;

const config: Config = { label: "train", max: 3 };
const BASE = "b".repeat(40);

function pull(number: number, extra: Partial<Pull> = {}): Pull {
  return {
    number,
    branch: `feature/${number}`,
    headSha: String(number).repeat(40).slice(0, 40),
    draft: false,
    sameRepo: true,
    labels: ["train"],
    checks: "success",
    ...extra,
  };
}

function train(
  number: number,
  prs: number[],
  extra: Partial<Train> = {},
  meta: Partial<TrainMeta> = {},
): Train {
  const head = "h".repeat(40);
  return {
    number,
    branch: `merge-train/${number}`,
    headSha: head,
    checks: "pending",
    meta: {
      version: META_VERSION,
      prs,
      base: BASE,
      head,
      rerun: false,
      ...meta,
    },
    ...extra,
  };
}

const kinds = (actions: Action[]) =>
  actions.map((action) =>
    action.kind === "assemble"
      ? `assemble ${action.prs.join(",")}`
      : action.kind,
  );

describe("admission", () => {
  test("a pull request boards only with the label, not a draft, same repository, checks passed", () => {
    expect(refusal(pull(1), config)).toBeNull();
    expect(refusal(undefined, config)).toBe("it is no longer open");
    expect(refusal(pull(1, { labels: [] }), config)).toBe(
      "it does not carry the train label",
    );
    expect(refusal(pull(1, { draft: true }), config)).toBe("it is a draft");
    expect(refusal(pull(1, { sameRepo: false }), config)).toBe(
      "it comes from another repository",
    );
    for (const checks of ["pending", "failure"] as const)
      expect(refusal(pull(1, { checks }), config)).toBe(
        "its required checks have not all passed on its current head",
      );
  });
});

describe("plan", () => {
  test("assembles the oldest admitted pull requests, up to the cap, when no train is open", () => {
    const actions = plan({
      base: BASE,
      trains: [],
      pulls: [
        pull(9),
        pull(4),
        pull(5, { draft: true }),
        pull(2),
        pull(7),
        pull(3, { checks: "pending" }),
      ],
      config,
    });
    expect(actions).toEqual([
      { kind: "assemble", prs: [2, 4, 7], reason: "new train" },
    ]);
    expect(
      plan({
        base: BASE,
        trains: [],
        pulls: [pull(1, { labels: [] })],
        config,
      }),
    ).toEqual([]);
  });

  test("lands a train only when its checks passed on the assembled head and base", () => {
    expect(
      plan({
        base: BASE,
        trains: [train(10, [1], { checks: "success" })],
        pulls: [pull(1), pull(2)],
        config,
      }),
    ).toEqual([{ kind: "land", train: 10, sha: "h".repeat(40) }]);
    expect(
      kinds(
        plan({
          base: BASE,
          trains: [train(10, [1])],
          pulls: [pull(1), pull(2)],
          config,
        }),
      ),
    ).toEqual(["wait"]);
  });

  test("closes and reassembles a train whose base or branch moved, or that lost a member", () => {
    const moved = plan({
      base: "c".repeat(40),
      trains: [train(10, [1, 2], { checks: "success" })],
      pulls: [pull(1), pull(2)],
      config,
    });
    expect(kinds(moved)).toEqual(["close", "assemble 1,2"]);
    expect(moved[0]).toMatchObject({
      reason: expect.stringContaining("base branch moved"),
    });
    const pushed = plan({
      base: BASE,
      trains: [train(10, [1], { headSha: "x".repeat(40), checks: "success" })],
      pulls: [pull(1)],
      config,
    });
    expect(kinds(pushed)).toEqual(["close", "assemble 1"]);
    expect(pushed[0]).toMatchObject({
      reason: "its branch moved after it was assembled",
    });
    const left = plan({
      base: BASE,
      trains: [train(10, [1, 2, 3], { checks: "success" })],
      pulls: [pull(1), pull(2, { labels: [] }), pull(3)],
      config,
    });
    expect(kinds(left)).toEqual(["close", "assemble 1,3"]);
    expect(left[0]).toMatchObject({
      reason: "#2 left the train: it does not carry the train label",
    });
    expect(
      kinds(plan({ base: BASE, trains: [train(10, [2])], pulls: [], config })),
    ).toEqual(["close"]);
  });

  test("after landing one train, the others go stale and are reassembled after it", () => {
    const actions = plan({
      base: BASE,
      trains: [train(12, [3]), train(11, [1, 2], { checks: "success" })],
      pulls: [pull(1), pull(2), pull(3), pull(4)],
      config,
    });
    expect(kinds(actions)).toEqual(["land", "close", "assemble 3"]);
  });

  test("a failed train re-runs its failed jobs once, then proves each half", () => {
    const failed = { checks: "failure" as const };
    expect(
      kinds(
        plan({
          base: BASE,
          trains: [train(10, [1, 2, 3], failed)],
          pulls: [pull(1), pull(2), pull(3)],
          config,
        }),
      ),
    ).toEqual(["rerun"]);
    const split = plan({
      base: BASE,
      trains: [train(10, [1, 2, 3], failed, { rerun: true })],
      pulls: [pull(1), pull(2), pull(3)],
      config,
    });
    expect(kinds(split)).toEqual(["close", "assemble 1,2", "assemble 3"]);
    expect(
      split.slice(1).map((action) => (action as { reason: string }).reason),
    ).toEqual([
      "first half of failed train #10",
      "second half of failed train #10",
    ]);
  });

  test("only a train of one that failed twice ejects its pull request", () => {
    const actions = plan({
      base: BASE,
      trains: [train(10, [7], { checks: "failure" }, { rerun: true })],
      pulls: [pull(7)],
      config,
    });
    expect(actions).toEqual([
      {
        kind: "eject",
        pull: 7,
        reason:
          "its required checks failed twice in train #10, which held only this pull request",
      },
      {
        kind: "close",
        train: 10,
        reason: "its required checks failed twice; #7 was ejected",
      },
    ]);
  });
});

describe("metadata and checks", () => {
  const meta: TrainMeta = {
    version: META_VERSION,
    prs: [1, 2],
    base: BASE,
    head: "h".repeat(40),
    rerun: false,
  };

  test("the train body carries its metadata", () => {
    const body = trainBody(meta, "new train");
    expect(body).toStartWith("Merge train (new train): #1, #2.");
    expect(readMeta(body)).toEqual(meta);
    for (const bad of [
      null,
      "no metadata",
      "<!-- kibi-merge-train {nope} -->",
      `<!-- kibi-merge-train ${JSON.stringify({ ...meta, version: "v0" })} -->`,
      `<!-- kibi-merge-train ${JSON.stringify({ ...meta, prs: ["1"] })} -->`,
      `<!-- kibi-merge-train ${JSON.stringify({ ...meta, rerun: "no" })} -->`,
    ])
      expect(readMeta(bad)).toBeNull();
  });

  test("aggregate reads the latest run of each required check", () => {
    const run = (
      id: number,
      name: string,
      status: string,
      conclusion: string | null,
    ) => ({
      id,
      name,
      status,
      conclusion,
    });
    const names = ["ci-required", "proof-required"];
    expect(aggregate([], [])).toBe("pending");
    expect(
      aggregate([run(1, "ci-required", "completed", "success")], names),
    ).toBe("pending");
    expect(
      aggregate(
        [
          run(1, "ci-required", "completed", "failure"),
          run(2, "ci-required", "completed", "success"),
          run(3, "proof-required", "completed", "success"),
          run(4, "other", "completed", "failure"),
        ],
        names,
      ),
    ).toBe("success");
    expect(
      aggregate(
        [
          run(1, "ci-required", "in_progress", null),
          run(2, "proof-required", "completed", "cancelled"),
        ],
        names,
      ),
    ).toBe("failure");
  });
});

describe("settings", () => {
  test("settingsFromEnv reads the action's configuration", () => {
    const settings = settingsFromEnv({
      MERGE_TRAIN_BASE: "develop",
      GH_REPO: "o/r",
      MERGE_TRAIN_CHECKS: "ci-required,\nproof-required",
      MERGE_TRAIN_KIBI: " kibi ",
      MERGE_TRAIN_CHECK: "make gate",
      RUNNER_TEMP: "/tmp/x",
    });
    expect(settings).toMatchObject({
      repo: "o/r",
      base: "develop",
      checks: ["ci-required", "proof-required"],
      kibi: "kibi",
      check: "make gate",
      label: "train",
      max: 8,
      prefix: "merge-train/",
      remote: "origin",
      workDir: "/tmp/x",
      committerName: "github-actions[bot]",
    });
    const custom = settingsFromEnv({
      MERGE_TRAIN_BASE: "main",
      GH_REPO: "o/r",
      MERGE_TRAIN_CHECKS: "all",
      MERGE_TRAIN_LABEL: "ship",
      MERGE_TRAIN_MAX: "2",
      MERGE_TRAIN_PREFIX: "trains/",
      MERGE_TRAIN_REMOTE: "up",
      MERGE_TRAIN_COMMITTER_NAME: "bot",
      MERGE_TRAIN_COMMITTER_EMAIL: "bot@example.com",
    });
    expect(custom).toMatchObject({
      kibi: "",
      check: "",
      label: "ship",
      max: 2,
      prefix: "trains/",
      remote: "up",
      committerEmail: "bot@example.com",
    });
    expect(custom.workDir).toBe(os.tmpdir());
    for (const [env, message] of [
      [{}, "MERGE_TRAIN_BASE names the base branch"],
      [
        { MERGE_TRAIN_BASE: "d", GH_REPO: "bad" },
        "GH_REPO names the repository as owner/name",
      ],
      [
        { MERGE_TRAIN_BASE: "d", GH_REPO: "o/r" },
        "MERGE_TRAIN_CHECKS names at least one required check",
      ],
      [
        {
          MERGE_TRAIN_BASE: "d",
          GH_REPO: "o/r",
          MERGE_TRAIN_CHECKS: "c",
          MERGE_TRAIN_MAX: "0",
        },
        "MERGE_TRAIN_MAX must be a positive integer",
      ],
    ] as const)
      expect(() => settingsFromEnv(env)).toThrow(message);
  });
});

// --- The whole step against real git and an in-memory GitHub ----------------

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

function write(file: string, content: string, mode?: number): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  if (mode !== undefined) chmodSync(file, mode);
}

// Union merge driver for .kb/symbols.yaml; sync logs and can fail on demand.
const FAKE_KIBI = `#!/usr/bin/env node
const fs = require("node:fs");
const [cmd, ...args] = process.argv.slice(2);
if (cmd === "merge-driver") {
  const [base, ours, theirs] = args.map((f) => fs.readFileSync(f, "utf8").split("\\n").filter(Boolean));
  fs.writeFileSync(args[1], [...ours, ...theirs.filter((l) => !ours.includes(l) && !base.includes(l))].join("\\n") + "\\n");
  process.exit(0);
}
if (cmd === "sync") {
  fs.appendFileSync(process.env.FAKE_LOG, "sync " + process.env.KIBI_BRANCH + "\\n");
  if (fs.existsSync("SYNC_FAILS")) process.exit(1);
  if (fs.existsSync("SYNC_REWRITES")) fs.appendFileSync("README.md", "rewritten\\n");
  process.exit(0);
}
process.exit(3);
`;

type FakePull = {
  number: number;
  draft: boolean;
  body: string | null;
  state: "open" | "closed" | "merged";
  head: { ref: string; sha: string; repo: { full_name: string } | null };
  labels: Array<{ name: string }>;
};

class World {
  readonly root = mkdtempSync(path.join(os.tmpdir(), "kibi-merge-train-"));
  readonly remote = path.join(this.root, "remote.git");
  readonly seed = path.join(this.root, "seed");
  readonly ws = path.join(this.root, "ws");
  readonly kibi = path.join(this.root, "kibi.cjs");
  readonly log = path.join(this.root, "log");
  pulls: FakePull[] = [];
  checks = new Map<
    string,
    Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
    }>
  >();
  runs = new Map<string, Array<{ id: number; conclusion: string | null }>>();
  calls: string[] = [];
  comments: Array<[number, string]> = [];
  next = 100;
  clock = 1000;

  constructor() {
    roots.push(this.root);
    git(this.root, "init", "--bare", "-q", "-b", "develop", this.remote);
    git(this.root, "clone", "-q", this.remote, this.seed);
    this.identity(this.seed);
    write(
      path.join(this.seed, ".gitattributes"),
      ".kb/symbols.yaml merge=kibi\n",
    );
    write(path.join(this.seed, ".kb", "symbols.yaml"), "- SYM-a\n");
    write(path.join(this.seed, "README.md"), "base\n");
    git(this.seed, "add", "-A");
    git(this.seed, "commit", "-q", "-m", "base");
    git(this.seed, "push", "-q", "origin", "HEAD:refs/heads/develop");
    write(this.kibi, FAKE_KIBI, 0o755);
    writeFileSync(this.log, "");
    git(this.root, "clone", "-q", "-b", "develop", this.remote, this.ws);
  }

  identity(cwd: string): void {
    git(cwd, "config", "user.email", "dev@example.com");
    git(cwd, "config", "user.name", "Dev");
  }

  commit(branch: string, files: Record<string, string>): string {
    git(this.seed, "fetch", "-q", "origin");
    const exists =
      spawnSync(
        "git",
        ["rev-parse", "-q", "--verify", `refs/remotes/origin/${branch}`],
        { cwd: this.seed },
      ).status === 0;
    git(
      this.seed,
      "checkout",
      "-q",
      "-B",
      branch,
      `origin/${exists ? branch : "develop"}`,
    );
    for (const [file, content] of Object.entries(files))
      write(path.join(this.seed, file), content);
    git(this.seed, "add", "-A");
    git(this.seed, "commit", "-q", "-m", `change ${branch}`);
    git(this.seed, "push", "-q", "origin", `HEAD:refs/heads/${branch}`);
    return git(this.seed, "rev-parse", "HEAD");
  }

  /** Opens a labelled pull request with passing checks. */
  open(
    number: number,
    files: Record<string, string>,
    extra: Partial<FakePull> = {},
  ): FakePull {
    const branch = `feature/${number}`;
    const sha = this.commit(branch, files);
    const pr: FakePull = {
      number,
      draft: false,
      body: null,
      state: "open",
      head: { ref: branch, sha, repo: { full_name: "o/r" } },
      labels: [{ name: "train" }],
      ...extra,
    };
    this.pulls.push(pr);
    this.pass(sha);
    return pr;
  }

  pass(sha: string, conclusion = "success"): void {
    this.checks.set(sha, [
      { id: this.next++, name: "ci-required", status: "completed", conclusion },
      {
        id: this.next++,
        name: "proof-required",
        status: "completed",
        conclusion: "success",
      },
    ]);
  }

  tip(branch: string): string {
    return git(this.remote, "rev-parse", `refs/heads/${branch}`);
  }

  trainPull(): FakePull {
    const found = this.pulls.find(
      (pr) => pr.head.ref.startsWith("merge-train/") && pr.state === "open",
    );
    if (!found) throw new Error("no open train");
    return found;
  }

  private find(number: number): FakePull {
    const pr = this.pulls.find((candidate) => candidate.number === number);
    if (!pr) throw new Error(`HTTP 404: no pull ${number}`);
    return pr;
  }

  gh(args: readonly string[], input?: string): string {
    const method = args[2] as string;
    const url = args[3] as string;
    const body = input === undefined ? {} : JSON.parse(input);
    this.calls.push(`${method} ${url.replace(/\?.*$/, "")}`);
    for (const [verb, pattern, handle] of this.routes()) {
      const match = pattern.exec(url);
      if (match && (verb === "*" || verb === method)) {
        const result = handle(match, body);
        return result === undefined ? "" : JSON.stringify(result);
      }
    }
    throw new Error(`unexpected gh ${method} ${url}`);
  }

  private routes(): Array<
    [string, RegExp, (match: RegExpExecArray, body: Loose) => unknown]
  > {
    return [
      [
        "GET",
        /^repos\/o\/r\/pulls\?/,
        () => this.pulls.filter((pr) => pr.state === "open"),
      ],
      [
        "GET",
        /^repos\/o\/r\/commits\/(\w+)\/check-runs/,
        (m) => ({ check_runs: this.checks.get(m[1] as string) ?? [] }),
      ],
      [
        "POST",
        /^repos\/o\/r\/issues\/(\d+)\/comments$/,
        (m, body) => {
          this.comments.push([Number(m[1]), body.body]);
          return {};
        },
      ],
      [
        "DELETE",
        /^repos\/o\/r\/issues\/(\d+)\/labels\/(.+)$/,
        (m) => {
          const pr = this.find(Number(m[1]));
          const before = pr.labels.length;
          const name = decodeURIComponent(m[2] as string);
          pr.labels = pr.labels.filter((label) => label.name !== name);
          if (pr.labels.length === before) throw new Error("HTTP 404: label");
        },
      ],
      [
        "DELETE",
        /^repos\/o\/r\/git\/refs\/heads\/(.+)$/,
        (m) => {
          git(this.remote, "rev-parse", "--verify", `refs/heads/${m[1]}`);
          git(this.remote, "update-ref", "-d", `refs/heads/${m[1]}`);
        },
      ],
      [
        "PUT",
        /^repos\/o\/r\/pulls\/(\d+)\/merge$/,
        (m, body) => {
          const pr = this.find(Number(m[1]));
          if (pr.head.sha !== body.sha) throw new Error("HTTP 409: head moved");
          git(this.seed, "fetch", "-q", "origin");
          git(this.seed, "checkout", "-q", "-B", "develop", "origin/develop");
          git(
            this.seed,
            "merge",
            "-q",
            "--no-ff",
            "-m",
            body.commit_title,
            `origin/${pr.head.ref}`,
          );
          git(this.seed, "push", "-q", "origin", "HEAD:refs/heads/develop");
          pr.state = "merged";
          return { merged: true };
        },
      ],
      [
        "PATCH",
        /^repos\/o\/r\/pulls\/(\d+)$/,
        (m, body) => {
          const pr = this.find(Number(m[1]));
          if (body.state === "closed") pr.state = "closed";
          if (body.body !== undefined) pr.body = body.body;
          return pr;
        },
      ],
      [
        "POST",
        /^repos\/o\/r\/pulls$/,
        (_m, body) => {
          const pr: FakePull = {
            number: this.next++,
            draft: false,
            body: body.body,
            state: "open",
            head: {
              ref: body.head,
              sha: this.tip(body.head),
              repo: { full_name: "o/r" },
            },
            labels: [],
          };
          this.pulls.push(pr);
          return pr;
        },
      ],
      [
        "GET",
        /^repos\/o\/r\/actions\/runs\?head_sha=(\w+)/,
        (m) => ({ workflow_runs: this.runs.get(m[1] as string) ?? [] }),
      ],
      [
        "POST",
        /^repos\/o\/r\/actions\/runs\/\d+\/rerun-failed-jobs$/,
        () => undefined,
      ],
    ];
  }

  runner(): Runner {
    return {
      gh: (args, input) => this.gh(args, input),
      exec: (command, args, options) =>
        processRunner.exec(command, args, {
          ...options,
          env: {
            ...options?.env,
            FAKE_LOG: this.log,
            GIT_CONFIG_NOSYSTEM: "1",
            HOME: this.root,
          },
        }),
      now: () => this.clock++,
      log: () => undefined,
    };
  }

  settings(extra: Partial<Settings> = {}): Settings {
    return {
      repo: "o/r",
      base: "develop",
      checks: ["ci-required", "proof-required"],
      kibi: this.kibi,
      check: "test -f README.md && ! test -f CHECK_FAILS",
      label: "train",
      max: 8,
      prefix: "merge-train/",
      remote: "origin",
      workDir: this.root,
      cwd: this.ws,
      committerName: "bot",
      committerEmail: "bot@example.com",
      ...extra,
    };
  }

  step(extra: Partial<Settings> = {}): {
    train: MergeTrain;
    actions: Action[];
  } {
    const train = new MergeTrain(this.settings(extra), this.runner());
    return { train, actions: train.step() };
  }
}

describe("merge train step", () => {
  test("assembles a train with the merge driver, lands it when green, and develop gets the proven tree", () => {
    const w = new World();
    w.open(1, { ".kb/symbols.yaml": "- SYM-a\n- SYM-one\n", "one.txt": "1\n" });
    w.open(2, { ".kb/symbols.yaml": "- SYM-a\n- SYM-two\n", "two.txt": "2\n" });
    w.open(3, { "three.txt": "3\n" }, { draft: true });
    const develop = w.tip("develop");

    expect(kinds(w.step().actions)).toEqual(["assemble 1,2"]);
    const trainPr = w.trainPull();
    const meta = readMeta(trainPr.body) as TrainMeta;
    expect(meta).toMatchObject({
      prs: [1, 2],
      base: develop,
      head: trainPr.head.sha,
      rerun: false,
    });
    expect(git(w.remote, "show", `${trainPr.head.sha}:.kb/symbols.yaml`)).toBe(
      "- SYM-a\n- SYM-one\n- SYM-two",
    );
    expect(
      git(
        w.remote,
        "log",
        "--format=%s",
        "--first-parent",
        `${develop}..${trainPr.head.sha}`,
      ).split("\n"),
    ).toEqual([
      "Merge pull request #2 from o/r:feature/2",
      "Merge pull request #1 from o/r:feature/1",
    ]);
    expect(readFileSync(w.log, "utf8")).toBe(
      "sync feature/1\nsync feature/2\n",
    );

    // Checks still running: wait.
    expect(kinds(w.step().actions)).toEqual(["wait"]);
    w.pass(trainPr.head.sha);
    expect(kinds(w.step().actions)).toEqual(["land"]);
    expect(trainPr.state).toBe("merged");
    const merged = w.tip("develop");
    expect(git(w.remote, "rev-parse", `${merged}^{tree}`)).toBe(
      git(w.remote, "rev-parse", `${trainPr.head.sha}^{tree}`),
    );
    expect(
      spawnSync(
        "git",
        ["rev-parse", "-q", "--verify", `refs/heads/${trainPr.head.ref}`],
        { cwd: w.remote },
      ).status,
    ).not.toBe(0);
  });

  test("ejects a pull request that conflicts or fails the check while assembling, and keeps the rest", () => {
    const w = new World();
    w.open(1, { "README.md": "one\n" });
    w.open(2, { "README.md": "two\n" });
    w.open(3, { CHECK_FAILS: "x\n" });
    w.open(4, { SYNC_REWRITES: "x\n" });
    w.open(5, { "five.txt": "5\n" });
    expect(kinds(w.step().actions)).toEqual(["assemble 1,2,3,4,5"]);
    expect(readMeta(w.trainPull().body)?.prs).toEqual([1, 5]);
    const ejected = new Map(w.comments);
    expect(ejected.get(2)).toContain(
      "it conflicts with develop or an earlier pull request in the train (README.md)",
    );
    expect(ejected.get(3)).toContain(
      "the check failed after merging it into the train",
    );
    expect(ejected.get(4)).toContain(
      "kibi sync changed tracked files after merging it into the train",
    );
    for (const pr of [2, 3, 4])
      expect(w.pulls.find((p) => p.number === pr)?.labels).toEqual([]);
  });

  test("a failing sync ejects, and nothing is opened when no pull request merged", () => {
    const w = new World();
    w.open(1, { SYNC_FAILS: "x\n" });
    const { train, actions } = w.step();
    expect(kinds(actions)).toEqual(["assemble 1"]);
    expect(
      w.pulls.filter((pr) => pr.head.ref.startsWith("merge-train/")),
    ).toEqual([]);
    expect(train.summary).toContain(
      "no train assembled for new train: no pull request merged",
    );
    expect(w.comments[0]?.[1]).toContain(
      "kibi sync failed after merging it into the train",
    );
  });

  test("without kibi or a check it only merges", () => {
    const w = new World();
    w.open(1, { "one.txt": "1\n" });
    w.step({ kibi: "", check: "" });
    expect(readMeta(w.trainPull().body)?.prs).toEqual([1]);
    expect(readFileSync(w.log, "utf8")).toBe("");
  });

  test("a failed train re-runs failed jobs once, then splits, then ejects only a lone failing pull request", () => {
    const w = new World();
    w.open(1, { "one.txt": "1\n" });
    w.open(2, { "two.txt": "2\n" });
    w.step();
    const first = w.trainPull();
    w.pass(first.head.sha, "failure");
    w.runs.set(first.head.sha, [
      { id: 7, conclusion: "failure" },
      { id: 8, conclusion: "success" },
    ]);
    expect(kinds(w.step().actions)).toEqual(["rerun"]);
    expect(w.calls).toContain(
      "POST repos/o/r/actions/runs/7/rerun-failed-jobs",
    );
    expect(w.calls).not.toContain(
      "POST repos/o/r/actions/runs/8/rerun-failed-jobs",
    );
    expect(readMeta(first.body)?.rerun).toBe(true);

    expect(kinds(w.step().actions)).toEqual([
      "close",
      "assemble 1",
      "assemble 2",
    ]);
    expect(first.state).toBe("closed");
    const halves = w.pulls.filter(
      (pr) => pr.head.ref.startsWith("merge-train/") && pr.state === "open",
    );
    expect(halves.map((pr) => readMeta(pr.body)?.prs)).toEqual([[1], [2]]);
    const [one, two] = halves as [FakePull, FakePull];

    // #1 alone passes and lands, so #2's half is stale and is proven again
    // on the new develop; there it fails twice and only then is ejected.
    w.pass(two.head.sha, "failure");
    w.pass(one.head.sha);
    expect(kinds(w.step().actions)).toEqual(["land", "close", "assemble 2"]);
    expect(two.state).toBe("closed");
    const alone = w.trainPull();
    expect(readMeta(alone.body)).toMatchObject({
      prs: [2],
      base: w.tip("develop"),
    });
    w.pass(alone.head.sha, "failure");
    expect(kinds(w.step().actions)).toEqual(["rerun"]);
    expect(kinds(w.step().actions)).toEqual(["eject", "close"]);
    expect(alone.state).toBe("closed");
    expect(w.comments.find(([pr]) => pr === 2)?.[1]).toContain("failed twice");
    expect(w.pulls.find((pr) => pr.number === 2)?.labels).toEqual([]);
  });

  test("a train goes stale when develop moves and is reassembled on the new tip", () => {
    const w = new World();
    w.open(1, { "one.txt": "1\n" });
    w.step();
    const stale = w.trainPull();
    w.commit("develop", { "other.txt": "x\n" });
    w.pass(stale.head.sha);
    expect(kinds(w.step().actions)).toEqual(["close", "assemble 1"]);
    expect(stale.state).toBe("closed");
    expect(readMeta(w.trainPull().body)?.base).toBe(w.tip("develop"));
  });

  test("main runs one step, writes the summary and reports errors", () => {
    const w = new World();
    w.open(1, { "one.txt": "1\n" });
    const summary = path.join(w.root, "summary.md");
    const logs: string[] = [];
    const runner = { ...w.runner(), log: (line: string) => logs.push(line) };
    const previous = process.cwd();
    process.chdir(w.ws);
    try {
      const env = {
        MERGE_TRAIN_BASE: "develop",
        GH_REPO: "o/r",
        MERGE_TRAIN_CHECKS: "ci-required,proof-required",
        MERGE_TRAIN_KIBI: w.kibi,
        GITHUB_STEP_SUMMARY: summary,
        RUNNER_TEMP: w.root,
      };
      expect(main(env, runner)).toBe(0);
      expect(readFileSync(summary, "utf8")).toContain(
        "### Merge train into `develop`",
      );
      expect(main({ ...env, GH_REPO: "o/missing" }, runner)).toBe(1);
      expect(logs.at(-1)).toContain(
        "::error::unexpected gh GET repos/o/missing/pulls",
      );
      expect(main({}, runner)).toBe(2);
      w.trainPull().state = "closed";
      for (const pr of w.pulls) pr.labels = [];
      logs.length = 0;
      expect(main({ ...env, GITHUB_STEP_SUMMARY: "" }, runner)).toBe(0);
      expect(logs).toEqual([
        "nothing to do: no open train and no admitted pull request",
      ]);
    } finally {
      process.chdir(previous);
    }
  });

  test("edge cases: a branch already gone, a label already removed, a closed pull request, a git failure", () => {
    const w = new World();
    w.open(1, { "one.txt": "1\n" });
    w.step();
    const stale = w.trainPull();
    git(w.remote, "update-ref", "-d", `refs/heads/${stale.head.ref}`);
    w.commit("develop", { "other.txt": "x\n" });
    expect(kinds(w.step().actions)).toEqual(["close", "assemble 1"]);
    expect(stale.state).toBe("closed");

    const train = new MergeTrain(w.settings(), w.runner());
    train.eject(1, "first");
    train.eject(1, "again");
    expect(w.comments.filter(([pr]) => pr === 1)).toHaveLength(2);
    expect(train.assemble([999], "gone")).toBeNull();
    expect(train.summary).toContain("#999: skipped, no longer open");
    expect(() => w.step({ remote: "nope" })).toThrow(
      "git fetch --quiet --no-tags nope",
    );
  });

  test("the process runner reports gh failures and runs commands", () => {
    expect(() => processRunner.gh(["--definitely-not-a-flag"])).toThrow(
      "gh --definitely-not-a-flag failed",
    );
    expect(processRunner.gh(["--version"])).toContain("gh version");
    processRunner.log("merge train runner log line");
    expect(
      processRunner.exec("sh", ["-c", "echo $X"], { env: { X: "ok" } }),
    ).toEqual({ status: 0, stdout: "ok\n", stderr: "" });
    expect(processRunner.exec("/nonexistent/command", []).status).toBe(1);
    expect(processRunner.now()).toBeGreaterThan(0);
  });
});

describe("merge train workflow and action", () => {
  const root = path.join(import.meta.dir, "..", "..");
  const yaml = (...parts: string[]) =>
    Bun.YAML.parse(readFileSync(path.join(root, ...parts), "utf8")) as Loose;

  test("Kibi's own train requires the aggregate checks and runs after the workflows that report them", () => {
    const workflow = yaml(".github", "workflows", "merge-train.yml");
    expect(workflow.concurrency).toEqual({
      group: "kibi-merge-train",
      "cancel-in-progress": false,
    });
    const names = ["ci.yml", "proof.yml"].map(
      (file) => yaml(".github", "workflows", file).name,
    );
    expect(workflow.on.workflow_run.workflows).toEqual(names);
    const step = workflow.jobs.train.steps.find(
      (s: { uses?: string }) => s.uses === "./actions/merge-train",
    );
    expect(step.with.checks.trim().split("\n")).toEqual([
      "ci-required",
      "proof-required",
    ]);
    expect(step.with.check).toBe("sh scripts/proof-gate.sh");
    expect(step.with["github-token"]).toBe(
      "${{ secrets.KIBI_MERGE_TOKEN || github.token }}",
    );
    expect(Object.keys(yaml(".github", "workflows", "ci.yml").jobs)).toContain(
      "ci-required",
    );
    expect(
      Object.keys(yaml(".github", "workflows", "proof.yml").jobs),
    ).toContain("proof-required");
  });

  test("the action runs the TypeScript source on Node, and the example uses it", () => {
    const action = yaml("actions", "merge-train", "action.yml");
    const run = action.runs.steps[0].run as string;
    expect(run).toContain(
      'node --experimental-strip-types --no-warnings "$GITHUB_ACTION_PATH/merge-train.mts"',
    );
    expect(action.inputs.checks.required).toBe(true);
    const example = yaml("docs", "examples", "github", "kibi-merge-train.yml");
    expect(example.jobs.train.steps.at(-1).uses).toBe(
      "Looted/kibi/actions/merge-train@master",
    );
  });
});
