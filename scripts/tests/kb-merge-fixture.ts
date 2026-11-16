import { afterEach } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Scratch repositories for actions/kb-merge/kb-merge.sh: a bare "remote", a
 * seed clone that writes history, and a workspace clone (the base branch
 * checkout the action runs in). gh and Kibi are small fakes, so tests exercise
 * the script's own decisions.
 */
export const ROOT = path.join(import.meta.dir, "..", "..");
const SCRIPT = path.join(ROOT, "actions", "kb-merge", "kb-merge.sh");

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

export function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} in ${cwd}: ${result.stderr}`);
  }
  return result.stdout.trim();
}

export function write(file: string, content: string, mode?: number): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  if (mode !== undefined) chmodSync(file, mode);
}

// A union merge driver standing in for `kibi merge-driver`: keeps every line
// of ours, appends lines only theirs added, and reports a real conflict when
// both sides set `status:` differently. Sync logs where and on which branch it
// ran, and rewrites a tracked file when FAKE_SYNC_REWRITE is set. Status
// reports FAKE_SYNC_STATE (default fresh), which is all the proof gate reads.
const FAKE_KIBI = `#!/usr/bin/env node
const fs = require("node:fs");
const [cmd, ...args] = process.argv.slice(2);
const log = (line) => fs.appendFileSync(process.env.FAKE_KIBI_LOG, line + "\\n");
if (cmd === "merge-driver") {
  const [base, ours, theirs] = args.map((f) => fs.readFileSync(f, "utf8").split("\\n").filter(Boolean));
  log("merge-driver");
  const status = (lines) => lines.find((l) => l.startsWith("status:"));
  if (status(ours) && status(theirs) && status(ours) !== status(theirs) && status(base) !== status(ours) && status(base) !== status(theirs)) {
    fs.writeFileSync(args[1], "<<<<<<< ours\\n" + ours.join("\\n") + "\\n=======\\n" + theirs.join("\\n") + "\\n>>>>>>> theirs\\n");
    process.exit(1);
  }
  const merged = [...ours, ...theirs.filter((l) => !ours.includes(l) && !base.includes(l))];
  fs.writeFileSync(args[1], merged.join("\\n") + "\\n");
  process.exit(0);
}
if (cmd === "sync") {
  log("sync " + process.env.KIBI_BRANCH + " " + fs.existsSync(".git"));
  if (process.env.FAKE_SYNC_REWRITE) fs.appendFileSync(".kb/symbols.yaml", "rewritten\\n");
  process.exit(0);
}
if (cmd === "status") {
  console.log(JSON.stringify({ syncState: process.env.FAKE_SYNC_STATE || "fresh", dirty: false }));
  process.exit(0);
}
if (cmd === "check") { log("check " + process.env.KIBI_BRANCH); process.exit(0); }
process.exit(3);
`;

type Pull = { head: string; cross?: boolean };

export class Fixture {
  readonly root = mkdtempSync(path.join(os.tmpdir(), "kibi-kb-merge-action-"));
  readonly remote = path.join(this.root, "remote.git");
  readonly seed = path.join(this.root, "seed");
  readonly ws = path.join(this.root, "ws");
  readonly bin = path.join(this.root, "bin");
  readonly kibi = path.join(this.bin, "kibi.cjs");
  readonly log = path.join(this.root, "kibi.log");
  pulls: Pull[] = [];

  constructor() {
    roots.push(this.root);
    git(this.root, "init", "--bare", "-q", "-b", "develop", this.remote);
    git(this.root, "clone", "-q", this.remote, this.seed);
    this.identity(this.seed);
    write(path.join(this.seed, ".kb", "symbols.yaml"), "- SYM-a\n");
    write(path.join(this.seed, "README.md"), "base\n");
    git(this.seed, "add", "-A");
    git(this.seed, "commit", "-q", "-m", "base");
    git(this.seed, "push", "-q", "origin", "HEAD:refs/heads/develop");
    write(this.kibi, FAKE_KIBI, 0o755);
    write(
      path.join(this.bin, "gh"),
      `#!/bin/sh\ncat "${path.join(this.root, "pulls.tsv")}"\n`,
      0o755,
    );
    writeFileSync(this.log, "");
  }

  identity(cwd: string): void {
    git(cwd, "config", "user.email", "dev@example.com");
    git(cwd, "config", "user.name", "Dev");
  }

  /** Commits `files` on `branch` (created from develop when new) and pushes. */
  commit(
    branch: string,
    files: Record<string, string>,
    from = "develop",
  ): string {
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
      `origin/${exists ? branch : from}`,
    );
    for (const [file, content] of Object.entries(files)) {
      write(path.join(this.seed, file), content);
    }
    git(this.seed, "add", "-A");
    git(this.seed, "commit", "-q", "-m", `change ${branch}`);
    git(this.seed, "push", "-q", "origin", `HEAD:refs/heads/${branch}`);
    return git(this.seed, "rev-parse", "HEAD");
  }

  tip(branch: string): string {
    return git(this.remote, "rev-parse", `refs/heads/${branch}`);
  }

  run(env: Record<string, string> = {}) {
    write(
      path.join(this.root, "pulls.tsv"),
      this.pulls
        .map((p) => `${p.head}\t${p.cross ? "true" : "false"}\n`)
        .join(""),
    );
    if (!existsSync(this.ws)) {
      git(this.root, "clone", "-q", "-b", "develop", this.remote, this.ws);
    }
    const output = path.join(this.root, "github-output");
    const summary = path.join(this.root, "step-summary");
    writeFileSync(output, "");
    writeFileSync(summary, "");
    const result = spawnSync("bash", [SCRIPT], {
      cwd: this.ws,
      encoding: "utf8",
      env: {
        PATH: `${this.bin}:${process.env.PATH}`,
        HOME: this.root,
        GIT_CONFIG_NOSYSTEM: "1",
        TMPDIR: this.root,
        FAKE_KIBI_LOG: this.log,
        GITHUB_OUTPUT: output,
        GITHUB_STEP_SUMMARY: summary,
        KB_MERGE_BASE: "develop",
        KB_MERGE_KIBI: this.kibi,
        KB_MERGE_CHECK: "$KIBI check && test -f README.md",
        ...env,
      },
    });
    const outputs: Record<string, string[]> = {};
    for (const line of readFileSync(output, "utf8").split("\n")) {
      const at = line.indexOf("=");
      if (at > 0) outputs[line.slice(0, at)] = JSON.parse(line.slice(at + 1));
    }
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      outputs,
      summary: readFileSync(summary, "utf8"),
      calls: readFileSync(this.log, "utf8").split("\n").filter(Boolean),
    };
  }

  file(branch: string, file: string): string {
    return git(this.remote, "show", `refs/heads/${branch}:${file}`);
  }
}

/** Two branches that both append to symbols.yaml: a manifest-only conflict. */
export function manifestConflict(fx: Fixture, head = "feature/one"): void {
  fx.commit(head, {
    ".kb/symbols.yaml": "- SYM-a\n- SYM-feature\n",
    "src.txt": "x\n",
  });
  fx.commit("develop", { ".kb/symbols.yaml": "- SYM-a\n- SYM-develop\n" });
  fx.pulls.push({ head });
}
