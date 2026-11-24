/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { execFile } from "node:child_process";
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { readMeta } from "../actions/merge-train/merge-train.mts";

const execFileAsync = promisify(execFile);

/** Attestation a workflow writes after it has actually tested a tree. */
export const CHECK_ATTESTATION_VERSION = "kibi.ci-check-attestation.v1";
export const CHECK_DECISION_VERSION = "kibi.ci-check-decision.v1";

const SHA = /^[a-f0-9]{40}$/;
/** The merge commit the train action creates for one boarded pull request. */
const TRAIN_MERGE_SUBJECT = /^Merge pull request #(\d+) from \S+$/;

export type CheckRunInfo = Readonly<{
  id: number;
  run_attempt: number;
  head_sha: string;
  head_branch: string;
  event: string;
  status: string;
  conclusion: string | null;
  path: string;
  html_url: string;
  head_repository?: { full_name?: string } | null;
}>;

export type RequiredCheckInfo = Readonly<{
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
}>;

export type TrainReuseMeta = Readonly<{
  version: string;
  prs: readonly number[];
  base: string;
  head: string;
}>;

/**
 * Facts the decision may use. Anything absent, ambiguous or inconsistent
 * means the workflow runs in full. A reused success is a success of the
 * required check, so a wrong `reused` is a false pass.
 */
export type CheckReuseInput = Readonly<{
  repository: string;
  event: string;
  baseRef: string;
  headRepository: string;
  headBranch: string;
  trainHeadSha: string;
  trainParents: readonly string[];
  trainTree: string;
  trainSubject: string;
  pullBaseSha: string;
  checkoutSha: string;
  checkoutParents: readonly string[];
  checkoutTree: string;
  meta: TrainReuseMeta | null;
  memberTree: string;
  runs: readonly CheckRunInfo[];
  /** False when the run listing was paginated or malformed. */
  listingComplete: boolean;
  attestation: unknown;
  requiredCheck: RequiredCheckInfo | null;
  /** Null when the workflow has no single aggregate check (release pack). */
  requiredCheckName: string | null;
  workflowPath: string;
  artifactName: string;
  attestationVersion: string;
}>;

export type CheckReuseDecision = Readonly<{
  version: typeof CHECK_DECISION_VERSION;
  mode: "reused" | "execute";
  reason: string;
  tree?: string;
  sourceRun?: string;
  sourceRunId?: number;
}>;

function execute(
  reason: string,
  extra?: Partial<CheckReuseDecision>,
): CheckReuseDecision {
  return { version: CHECK_DECISION_VERSION, mode: "execute", reason, ...extra };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameRepo(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function workflowPathMatches(actual: string, expected: string): boolean {
  return actual === expected || actual.startsWith(`${expected}@`);
}

/**
 * Whether a merge-train pull request may report this workflow's required
 * check without running it. Reuse is allowed only for a train of one pull
 * request whose assembled tree, the tree this checkout would test, and the
 * tree a successful run of this workflow attested are the same git tree.
 */
export function assessMemberCheckReuse(
  input: CheckReuseInput,
): CheckReuseDecision {
  const tree = input.checkoutTree;
  if (input.event !== "pull_request")
    return execute("not a pull request", { tree });
  if (input.baseRef !== "develop")
    return execute("pull request does not target develop", { tree });
  if (!sameRepo(input.headRepository, input.repository))
    return execute("pull request head is not in this repository", { tree });
  if (!input.headBranch.startsWith("merge-train/"))
    return execute("head is not a merge train", { tree });
  const meta = input.meta;
  if (meta === null)
    return execute("train body has no merge-train record", { tree });
  if (meta.prs.length !== 1)
    return execute("train does not hold exactly one pull request", { tree });
  const only = meta.prs[0];
  if (only === undefined || !Number.isSafeInteger(only) || only <= 0)
    return execute("train member number is invalid", { tree });
  if (meta.head !== input.trainHeadSha)
    return execute("train body does not name this head", { tree });
  if (
    input.trainParents.length !== 2 ||
    !SHA.test(input.trainParents[0] ?? "") ||
    !SHA.test(input.trainParents[1] ?? "") ||
    !SHA.test(input.trainHeadSha) ||
    !SHA.test(input.pullBaseSha) ||
    !SHA.test(input.checkoutSha)
  )
    return execute("train commit is not a two-parent merge", { tree });
  const memberSha = input.trainParents[1] as string;
  if (input.trainParents[0] !== meta.base)
    return execute("train was not assembled on the base named in its body", {
      tree,
    });
  const subject = TRAIN_MERGE_SUBJECT.exec(input.trainSubject);
  if (subject === null || Number(subject[1]) !== only)
    return execute(
      "train commit is not the merge of the single boarded pull request",
      { tree },
    );
  if (
    !SHA.test(input.trainTree) ||
    !SHA.test(input.memberTree) ||
    !SHA.test(input.checkoutTree)
  )
    return execute("a git tree oid is missing or invalid", { tree });
  if (
    input.trainTree !== input.memberTree ||
    input.checkoutTree !== input.memberTree
  )
    return execute(
      "the train tree differs from the member tree that would have been tested",
      { tree: input.checkoutTree },
    );
  if (
    input.checkoutParents.length !== 2 ||
    input.checkoutParents[0] !== input.pullBaseSha ||
    input.checkoutParents[1] !== input.trainHeadSha
  )
    return execute("checkout is not the pull request's merge of this train", {
      tree,
    });
  if (!input.listingComplete)
    return execute("workflow run listing is incomplete", { tree });

  const runs = input.runs.filter(
    (run) =>
      isRecord(run) &&
      run.head_sha === memberSha &&
      run.event === "pull_request" &&
      workflowPathMatches(String(run.path), input.workflowPath) &&
      sameRepo(run.head_repository?.full_name ?? "", input.repository),
  );
  const latest = [...runs].sort((a, b) => b.id - a.id)[0];
  if (latest === undefined)
    return execute("member has no completed run of this workflow", { tree });
  if (
    !Number.isSafeInteger(latest.id) ||
    latest.id <= 0 ||
    !Number.isSafeInteger(latest.run_attempt) ||
    latest.run_attempt <= 0 ||
    latest.status !== "completed" ||
    latest.conclusion !== "success" ||
    latest.head_branch.startsWith("merge-train/") ||
    latest.html_url !==
      `https://github.com/${input.repository}/actions/runs/${latest.id}`
  )
    return execute(
      "the member's latest run of this workflow did not pass on that commit",
      { tree },
    );
  if (input.requiredCheckName !== null) {
    const check = input.requiredCheck;
    if (
      check === null ||
      check.name !== input.requiredCheckName ||
      !Number.isSafeInteger(check.id) ||
      check.id <= 0 ||
      check.status !== "completed" ||
      check.conclusion !== "success"
    )
      return execute(
        `${input.requiredCheckName} is not a completed success on the member`,
        { tree },
      );
  }

  const value = input.attestation;
  if (
    !isRecord(value) ||
    !isRecord(value.source) ||
    !isRecord(value.run) ||
    typeof value.source.repository !== "string" ||
    typeof value.source.branch !== "string" ||
    typeof value.source.sha !== "string" ||
    typeof value.tree !== "string"
  )
    return execute("member attestation is missing or malformed", { tree });
  if (
    value.version !== input.attestationVersion ||
    value.outcome !== "passed" ||
    value.tree !== input.checkoutTree ||
    !sameRepo(value.source.repository, input.repository) ||
    value.source.branch !== latest.head_branch ||
    value.source.branch.startsWith("merge-train/") ||
    value.source.sha !== memberSha ||
    value.source.event !== "pull_request" ||
    value.run.id !== latest.id ||
    value.run.attempt !== latest.run_attempt ||
    value.run.workflow !== input.workflowPath ||
    value.run.url !== latest.html_url ||
    value.artifact !== input.artifactName
  )
    return execute(
      "member attestation does not describe this tree and the passing run",
      { tree, sourceRun: latest.html_url },
    );
  return {
    version: CHECK_DECISION_VERSION,
    mode: "reused",
    reason:
      "the train checkout is the same git tree the member's passing run attested",
    tree,
    sourceRun: latest.html_url,
    sourceRunId: latest.id,
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function git(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: process.cwd() });
  return stdout.trim();
}

async function ghApi(endpoint: string): Promise<unknown> {
  const { stdout } = await execFileAsync("gh", ["api", endpoint], {
    env: process.env,
    maxBuffer: 8 * 1024 * 1024,
    timeout: 30000,
  });
  return JSON.parse(stdout);
}

async function ensureCommit(sha: string): Promise<void> {
  try {
    await git("cat-file", "-e", `${sha}^{commit}`);
  } catch {
    await git("fetch", "--no-tags", "--depth=1", "origin", sha);
  }
}

function runsFromResponse(response: unknown, label: string): CheckRunInfo[] {
  if (
    !isRecord(response) ||
    !Array.isArray(response.workflow_runs) ||
    response.total_count !== response.workflow_runs.length
  )
    throw new Error(`${label} run listing is incomplete or malformed`);
  return response.workflow_runs as CheckRunInfo[];
}

async function downloadAttestation(
  repository: string,
  runId: number,
  artifactName: string,
): Promise<unknown> {
  const response = await ghApi(
    `repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`,
  );
  if (
    !isRecord(response) ||
    !Array.isArray(response.artifacts) ||
    response.total_count !== response.artifacts.length
  )
    throw new Error("attestation artifact listing is incomplete or malformed");
  const matches = response.artifacts.filter(
    (artifact) =>
      isRecord(artifact) &&
      artifact.name === artifactName &&
      artifact.expired === false,
  );
  if (matches.length !== 1)
    throw new Error("attestation artifact is missing or ambiguous");
  const artifact = matches[0];
  if (
    !isRecord(artifact) ||
    typeof artifact.size_in_bytes !== "number" ||
    !Number.isSafeInteger(artifact.size_in_bytes) ||
    artifact.size_in_bytes <= 0 ||
    artifact.size_in_bytes > 65536
  )
    throw new Error("attestation artifact size is invalid");
  const directory = await mkdtemp(path.join(os.tmpdir(), "kibi-check-attest-"));
  try {
    await execFileAsync(
      "gh",
      [
        "run",
        "download",
        String(runId),
        "--repo",
        repository,
        "--name",
        artifactName,
        "--dir",
        directory,
      ],
      { env: process.env, timeout: 30000, maxBuffer: 1024 * 1024 },
    );
    const content = await readFile(
      path.join(directory, "attestation.json"),
      "utf8",
    );
    if (content.length > 65536) throw new Error("attestation is too large");
    return JSON.parse(content);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function latestRequiredCheck(
  repository: string,
  sha: string,
  name: string,
): Promise<RequiredCheckInfo | null> {
  const response = await ghApi(
    `repos/${repository}/commits/${sha}/check-runs?per_page=100`,
  );
  if (
    !isRecord(response) ||
    !Array.isArray(response.check_runs) ||
    response.total_count !== response.check_runs.length
  )
    throw new Error("check run listing is incomplete or malformed");
  const matches = (response.check_runs as RequiredCheckInfo[])
    .filter((run) => isRecord(run) && run.name === name)
    .sort((a, b) => b.id - a.id);
  return matches[0] ?? null;
}

async function eventPayload(): Promise<Record<string, unknown>> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return {};
  const parsed = JSON.parse(await readFile(eventPath, "utf8"));
  return isRecord(parsed) ? parsed : {};
}

function metaFromBody(body: unknown): TrainReuseMeta | null {
  if (typeof body !== "string") return null;
  const meta = readMeta(body);
  if (meta === null) return null;
  return {
    version: meta.version,
    prs: meta.prs,
    base: meta.base,
    head: meta.head,
  };
}

export async function collectMemberReuseInput(): Promise<CheckReuseInput> {
  const repository = requiredEnv("GITHUB_REPOSITORY");
  const workflowPath = requiredEnv("KIBI_REUSE_WORKFLOW");
  const artifactName = requiredEnv("KIBI_REUSE_ARTIFACT");
  const attestationVersion =
    process.env.KIBI_REUSE_ATTESTATION_VERSION ?? CHECK_ATTESTATION_VERSION;
  const requiredCheckName = process.env.KIBI_REUSE_CHECK?.trim() || null;
  const event = await eventPayload();
  const pull = isRecord(event.pull_request) ? event.pull_request : {};
  const head = isRecord(pull.head) ? pull.head : {};
  const base = isRecord(pull.base) ? pull.base : {};
  const headRepo = isRecord(head.repo) ? head.repo : {};
  const trainHeadSha =
    typeof head.sha === "string" ? head.sha : requiredEnv("PR_HEAD_SHA");
  await ensureCommit(trainHeadSha);
  const trainParents = (await git("show", "-s", "--format=%P", trainHeadSha))
    .split(" ")
    .filter(Boolean);
  const trainTree = await git("rev-parse", `${trainHeadSha}^{tree}`);
  const trainSubject = await git("log", "-1", "--format=%s", trainHeadSha);
  const memberSha = trainParents[1];
  let memberTree = "";
  if (memberSha !== undefined && SHA.test(memberSha)) {
    await ensureCommit(memberSha);
    memberTree = await git("rev-parse", `${memberSha}^{tree}`);
  }
  const checkoutSha = await git("rev-parse", "HEAD");
  const checkoutTree = await git("rev-parse", "HEAD^{tree}");
  const checkoutParents = (await git("show", "-s", "--format=%P", "HEAD"))
    .split(" ")
    .filter(Boolean);
  let runs: CheckRunInfo[] = [];
  let listingComplete = false;
  let attestation: unknown = null;
  let requiredCheck: RequiredCheckInfo | null = null;
  if (memberSha !== undefined && SHA.test(memberSha)) {
    const query = new URLSearchParams({
      event: "pull_request",
      head_sha: memberSha,
      per_page: "100",
    });
    const workflow = workflowPath.replace(/^\.github\/workflows\//, "");
    const response = await ghApi(
      `repos/${repository}/actions/workflows/${workflow}/runs?${query}`,
    );
    runs = runsFromResponse(response, workflow);
    listingComplete = true;
    const latest = [...runs].sort((a, b) => b.id - a.id)[0];
    if (
      latest &&
      latest.status === "completed" &&
      latest.conclusion === "success"
    )
      attestation = await downloadAttestation(
        repository,
        latest.id,
        artifactName,
      );
    if (requiredCheckName !== null)
      requiredCheck = await latestRequiredCheck(
        repository,
        memberSha,
        requiredCheckName,
      );
  }
  return {
    repository,
    event: requiredEnv("GITHUB_EVENT_NAME"),
    baseRef:
      typeof base.ref === "string" ? base.ref : (process.env.PR_BASE_REF ?? ""),
    headRepository:
      typeof headRepo.full_name === "string"
        ? headRepo.full_name
        : (process.env.PR_HEAD_REPOSITORY ?? ""),
    headBranch:
      typeof head.ref === "string"
        ? head.ref
        : (process.env.PR_HEAD_BRANCH ?? ""),
    trainHeadSha,
    trainParents,
    trainTree,
    trainSubject,
    pullBaseSha:
      typeof base.sha === "string" ? base.sha : (process.env.PR_BASE_SHA ?? ""),
    checkoutSha,
    checkoutParents,
    checkoutTree,
    meta: metaFromBody(pull.body),
    memberTree,
    runs,
    listingComplete,
    attestation,
    requiredCheck,
    requiredCheckName,
    workflowPath,
    artifactName,
    attestationVersion,
  };
}

async function writeDecision(
  outputPath: string,
  decision: CheckReuseDecision,
): Promise<void> {
  await writeFile(outputPath, `${JSON.stringify(decision, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `reuse=${decision.mode === "reused"}\nsource_run_id=${decision.sourceRunId ?? ""}\nsource_run_url=${decision.sourceRun ?? ""}\n`,
    );
  const detail = [
    "Kibi check reuse:",
    `  tree: ${decision.tree ?? "unavailable"}`,
    `  result: ${decision.reason}`,
    decision.mode === "reused"
      ? `  checks reused from ${decision.sourceRun}`
      : "  running this workflow",
  ].join("\n");
  console.log(detail);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `\n### Kibi check reuse\n\n\`\`\`text\n${detail}\n\`\`\`\n`,
    );
}

async function decide(outputPath: string): Promise<void> {
  let decision: CheckReuseDecision;
  try {
    decision = assessMemberCheckReuse(await collectMemberReuseInput());
  } catch (error) {
    decision = execute(
      `reuse lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  await writeDecision(outputPath, decision);
}

async function attest(outputDirectory: string): Promise<void> {
  const event = requiredEnv("GITHUB_EVENT_NAME");
  const repository = requiredEnv("GITHUB_REPOSITORY");
  const sha = requiredEnv("GITHUB_SHA");
  const workflowPath = requiredEnv("KIBI_REUSE_WORKFLOW");
  const artifactName = requiredEnv("KIBI_REUSE_ARTIFACT");
  if ((await git("rev-parse", "HEAD")) !== sha)
    throw new Error("checkout does not match the attested commit");
  const tree = await git("rev-parse", "HEAD^{tree}");
  if (!SHA.test(sha) || !SHA.test(tree))
    throw new Error("attested commit or tree is invalid");
  const pull = event === "pull_request";
  const develop =
    event === "push" && requiredEnv("GITHUB_REF") === "refs/heads/develop";
  if (pull) {
    const headRepository = requiredEnv("PR_HEAD_REPOSITORY");
    if (!sameRepo(headRepository, repository))
      throw new Error("a fork pull request cannot attest this repository");
  } else if (!develop) {
    throw new Error(
      "only a pull request or a develop push may attest the tested tree",
    );
  }
  const runId = Number(requiredEnv("GITHUB_RUN_ID"));
  const attempt = Number(requiredEnv("GITHUB_RUN_ATTEMPT"));
  if (
    !Number.isSafeInteger(runId) ||
    runId <= 0 ||
    !Number.isSafeInteger(attempt) ||
    attempt <= 0
  )
    throw new Error("GitHub run identity is invalid");
  const source = pull
    ? {
        repository,
        branch: requiredEnv("PR_HEAD_BRANCH"),
        sha: requiredEnv("PR_HEAD_SHA"),
        event: "pull_request" as const,
      }
    : {
        repository,
        branch: "develop" as const,
        sha,
        event: "push" as const,
      };
  if (pull && !SHA.test(source.sha))
    throw new Error("pull request head SHA is invalid");
  const attestation = {
    version: CHECK_ATTESTATION_VERSION,
    outcome: "passed",
    tree,
    source,
    run: {
      id: runId,
      attempt,
      workflow: workflowPath,
      url: `https://github.com/${repository}/actions/runs/${runId}`,
    },
    artifact: artifactName,
  };
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, "attestation.json"),
    `${JSON.stringify(attestation, null, 2)}\n`,
  );
  console.log(
    `Tested tree attested: ${tree} as ${source.sha} by run ${runId}/${attempt}`,
  );
}

export async function main(argv: readonly string[]): Promise<void> {
  const [command, output] = argv;
  if (!output || (command !== "attest" && command !== "decide"))
    throw new Error(
      "usage: bun scripts/ci-check-reuse.ts attest|decide <output-path>",
    );
  if (command === "attest") await attest(output);
  else await decide(output);
}

if (import.meta.main) await main(process.argv.slice(2));
