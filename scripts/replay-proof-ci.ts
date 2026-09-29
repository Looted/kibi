#!/usr/bin/env bun
/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk
 */

/**
 * Replay the CI proof gate locally against a clean clone of the committed HEAD.
 *
 * Local checkouts diverge from CI in ways that hide proof failures: nested
 * worktrees resolve the parent checkout's node_modules and git hooks, stale
 * receipts mask semantic regressions, and gates such as `check-generated
 * --staged` never run on commit. This script reads the proof job from
 * `.github/workflows/proof.yml` and runs the same `run:` steps, in order, in a
 * fresh clone outside the repository tree, so the steps cannot drift from CI.
 *
 * Usage: bun scripts/replay-proof-ci.ts [--dry-run] [--keep]
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PROOF_WORKFLOW_PATH = ".github/workflows/proof.yml";

/** The last step of the proof gate; later steps publish reports and artifacts. */
const FINAL_GATE_STEP = "Enforce proof baseline and clean snapshot";

/**
 * Steps that provision the CI host (apt packages, the SWI-Prolog build, global
 * npm and curl installs) or decide master-PR reuse. They change the machine,
 * not the repository, so a local replay checks for their tools instead.
 */
const HOST_PROVISIONING_STEPS = Object.freeze([
  "Check whether master PR can reuse develop proof",
  "Bootstrap Ubuntu packages",
  "Install SWI-Prolog",
  "Provision strict-proof host prerequisites",
]);

/** Host tools the skipped provisioning steps would have installed. */
const REQUIRED_HOST_TOOLS = Object.freeze([
  "git",
  "bun",
  "node",
  "swipl",
  "uv",
  "codex",
  "bwrap",
]);

type ReplayStep = { readonly name: string; readonly run: string };

type WorkflowStep = { name?: unknown; run?: unknown; uses?: unknown };

/**
 * Repository-local lines of the host provisioning step (`uv sync`, `uv run`).
 * They prepare the checkout's own Python environment, which a fresh clone lacks.
 */
function repositoryLocalProvisioning(run: string): string | undefined {
  const lines = run
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^uv (sync|run) /.test(line));
  return lines.length > 0 ? lines.join("\n") : undefined;
}

/** The proof job's `run:` steps, in order, up to and including the baseline gate. */
export function replaySteps(workflowText: string): ReplayStep[] {
  const workflow = Bun.YAML.parse(workflowText) as {
    jobs?: { proof?: { steps?: WorkflowStep[] } };
  };
  const steps = workflow.jobs?.proof?.steps ?? [];
  const names = steps.map((step) => String(step.name ?? ""));
  if (!names.includes(FINAL_GATE_STEP)) {
    throw new Error(`${PROOF_WORKFLOW_PATH} has no "${FINAL_GATE_STEP}" step`);
  }
  for (const name of HOST_PROVISIONING_STEPS) {
    if (!names.includes(name)) {
      throw new Error(
        `${PROOF_WORKFLOW_PATH} has no "${name}" step; update HOST_PROVISIONING_STEPS`,
      );
    }
  }
  const replay: ReplayStep[] = [];
  for (const step of steps) {
    const name = String(step.name ?? "");
    if (typeof step.run === "string") {
      if (HOST_PROVISIONING_STEPS.includes(name)) {
        const local = repositoryLocalProvisioning(step.run);
        if (local !== undefined)
          replay.push({ name: `${name} (repository-local part)`, run: local });
      } else {
        replay.push({ name, run: step.run });
      }
    }
    if (name === FINAL_GATE_STEP) break;
  }
  return replay;
}

function run(
  command: string,
  args: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; capture?: boolean } = {},
): { status: number; stdout: string } {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) throw result.error;
  return { status: result.status ?? 1, stdout: `${result.stdout ?? ""}` };
}

function missingHostTools(): string[] {
  return REQUIRED_HOST_TOOLS.filter(
    (tool) =>
      run("sh", ["-c", `command -v ${tool}`], { capture: true }).status !== 0,
  );
}

function git(args: readonly string[]): string {
  const result = run("git", args, { capture: true });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
  return result.stdout.trim();
}

function main(argv: readonly string[]): number {
  const dryRun = argv.includes("--dry-run");
  const keep = argv.includes("--keep");
  const root = git(["rev-parse", "--show-toplevel"]);
  const steps = replaySteps(
    readFileSync(path.join(root, PROOF_WORKFLOW_PATH), "utf8"),
  );
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch === "HEAD") {
    console.error(
      "Proof replay needs a checked-out branch: CI attaches the KB to the branch name, and a detached HEAD has none.",
    );
    return 1;
  }
  const head = git(["rev-parse", "HEAD"]);

  console.log(`Replaying ${PROOF_WORKFLOW_PATH} for ${branch} @ ${head}`);
  for (const step of steps) console.log(`  - ${step.name}`);
  console.log(
    `Skipped host provisioning: ${HOST_PROVISIONING_STEPS.join("; ")}`,
  );
  if (dryRun) return 0;

  const missing = missingHostTools();
  if (missing.length > 0) {
    console.error(
      `Missing host tools the CI provisioning steps install: ${missing.join(", ")}`,
    );
    return 1;
  }
  if (git(["status", "--porcelain"]) !== "") {
    console.warn(
      "Working tree has uncommitted changes; the replay proves the committed HEAD only.",
    );
  }

  // A clone outside the repository tree has no parent node_modules to leak
  // into module resolution and no git hooks, exactly like the CI checkout.
  const workspace = mkdtempSync(path.join(tmpdir(), "kibi-proof-replay-"));
  try {
    const clone = run("git", [
      "clone",
      "--quiet",
      "--no-local",
      "--branch",
      branch,
      root,
      workspace,
    ]);
    if (clone.status !== 0) throw new Error("git clone failed");
    const env = {
      ...process.env,
      KIBI_CLI: "./packages/cli/bin/kibi",
      KIBI_BRANCH: branch,
    };
    for (const step of steps) {
      console.log(`\n==> ${step.name}`);
      const result = run("bash", ["-e", "-c", step.run], {
        cwd: workspace,
        env,
      });
      if (result.status !== 0) {
        console.error(
          `\nProof replay failed at "${step.name}" (exit ${result.status}).`,
        );
        return result.status;
      }
    }
    console.log("\nProof replay passed every CI proof gate step.");
    return 0;
  } finally {
    if (keep) console.log(`Replay workspace kept at ${workspace}`);
    else rmSync(workspace, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
