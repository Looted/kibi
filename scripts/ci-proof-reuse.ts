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

import { nodeGit } from "../packages/cli/src/public/operations/node-ports.js";
import {
  type CheckReuseDecision,
  assessMemberCheckReuse,
  collectMemberReuseInput,
} from "./ci-check-reuse.js";

const execFileAsync = promisify(execFile);
const ATTESTATION_VERSION = "kibi.ci-proof-attestation.v1";
const DECISION_VERSION = "kibi.ci-proof-decision.v1";
const ARTIFACT_NAME = "kibi-proof-attestation";
const REPORT_ARTIFACT_NAME = "kibi-requirement-proof";
const WORKFLOW_PATH = ".github/workflows/proof.yml";
const SHA = /^[a-f0-9]{40}$/;
/** Branches the merge train assembles; their pull request proof runs attest. */
export const TRAIN_PREFIX = "merge-train/";
const HASH = /^[a-f0-9]{64}$/;

type Snapshot = { version: string; hash: string; dirty: boolean };
type ProofRun = {
  id: number;
  run_attempt: number;
  head_sha: string;
  head_branch: string;
  event: string;
  status: string;
  conclusion: string;
  path: string;
  html_url: string;
  head_repository?: { full_name?: string } | null;
};
type Attestation = {
  version: string;
  outcome: string;
  snapshot: { version: string; hash: string };
  source: {
    repository: string;
    branch: string;
    sha: string;
    event: string;
    /** A train attestation: the base commit the train was assembled on. */
    base?: string;
  };
  run: { id: number; attempt: number; workflow: string; url: string };
  artifact: string;
  /** Git tree oid of the checkout that was proved. Required for member reuse. */
  tree?: string;
  /** A develop attestation that reused a train's proof: that run's URL. */
  derived_from?: string;
};
type ReuseInput = {
  repository: string;
  /**
   * The PR's base branch. A master PR from develop reuses develop's proof of
   * its head; a develop PR reuses develop's proof of its base when the merge
   * changes nothing the proof snapshot covers (for example only docs/).
   */
  baseRef?: string;
  headRepository: string;
  headBranch: string;
  headSha: string;
  baseSha: string;
  mergeSha: string;
  checkoutSha: string;
  mergeParents: string[];
  developHeadBefore: string;
  developHeadAfter: string;
  snapshot: Snapshot;
  runs: ProofRun[];
  attestation: unknown;
};
export type ReuseDecision = {
  version: typeof DECISION_VERSION;
  mode: "reused" | "execute";
  reason: string;
  mergeSnapshot?: string;
  developSnapshot?: string;
  sourceRun?: string;
};

function execute(
  reason: string,
  input?: Partial<ReuseDecision>,
): ReuseDecision {
  return { version: DECISION_VERSION, mode: "execute", reason, ...input };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The complete trust decision. SHA identifies provenance; only the snapshot identifies proof. */
export function assessProofReuse(input: ReuseInput): ReuseDecision {
  const mergeSnapshot = input.snapshot.hash;
  const intoDevelop = input.baseRef === "develop";
  if (input.headRepository.toLowerCase() !== input.repository.toLowerCase())
    return execute("PR source is not this repository", { mergeSnapshot });
  if (!intoDevelop && input.headBranch !== "develop")
    return execute("PR source is not this repository's develop branch", {
      mergeSnapshot,
    });
  // The develop commit whose successful proof this PR may reuse.
  const provenSha = intoDevelop ? input.baseSha : input.headSha;
  if (
    ![input.headSha, input.baseSha, input.mergeSha, input.checkoutSha].every(
      (sha) => SHA.test(sha),
    )
  )
    return execute("PR or checkout SHA is invalid", { mergeSnapshot });
  if (
    input.checkoutSha !== input.mergeSha ||
    input.mergeParents.length !== 2 ||
    input.mergeParents[0] !== input.baseSha ||
    input.mergeParents[1] !== input.headSha
  )
    return execute("checkout is not the expected PR merge commit", {
      mergeSnapshot,
    });
  if (
    !intoDevelop &&
    (input.developHeadBefore !== input.headSha ||
      input.developHeadAfter !== input.headSha)
  )
    return execute("develop moved or no longer matches the PR head", {
      mergeSnapshot,
    });
  if (
    input.snapshot.version !== "kibi.workspace-snapshot.v2" ||
    !HASH.test(mergeSnapshot) ||
    input.snapshot.dirty
  )
    return execute(
      "merge workspace snapshot is unavailable, incompatible, or dirty",
      { mergeSnapshot },
    );
  if (input.runs.length !== 1)
    return execute(
      "no unique successful develop proof run for this exact head",
      { mergeSnapshot },
    );

  const run = input.runs[0];
  if (
    !run ||
    !isRecord(run) ||
    !Number.isSafeInteger(run.id) ||
    run.id <= 0 ||
    !Number.isSafeInteger(run.run_attempt) ||
    run.run_attempt <= 0 ||
    run.head_sha !== provenSha ||
    run.head_branch !== "develop" ||
    run.event !== "push" ||
    run.status !== "completed" ||
    run.conclusion !== "success" ||
    typeof run.path !== "string" ||
    (run.path !== WORKFLOW_PATH &&
      run.path !== `${WORKFLOW_PATH}@refs/heads/develop`) ||
    run.html_url !==
      `https://github.com/${input.repository}/actions/runs/${run.id}`
  )
    return execute("develop proof run provenance is invalid", {
      mergeSnapshot,
    });

  const value = input.attestation;
  if (
    !isRecord(value) ||
    !isRecord(value.snapshot) ||
    !isRecord(value.source) ||
    !isRecord(value.run) ||
    typeof value.source.repository !== "string"
  )
    return execute("develop proof attestation is missing or malformed", {
      mergeSnapshot,
    });
  const attestation = value as Attestation;
  if (
    attestation.version !== ATTESTATION_VERSION ||
    attestation.outcome !== "passed" ||
    attestation.snapshot.version !== input.snapshot.version ||
    !HASH.test(attestation.snapshot.hash) ||
    attestation.source.repository.toLowerCase() !==
      input.repository.toLowerCase() ||
    attestation.source.branch !== "develop" ||
    attestation.source.sha !== provenSha ||
    attestation.source.event !== "push" ||
    attestation.run.id !== run.id ||
    attestation.run.attempt !== run.run_attempt ||
    attestation.run.workflow !== WORKFLOW_PATH ||
    attestation.run.url !== run.html_url ||
    attestation.artifact !== ARTIFACT_NAME
  )
    return execute(
      "develop proof attestation does not match the successful run",
      {
        mergeSnapshot,
        developSnapshot: attestation.snapshot.hash,
      },
    );
  if (attestation.snapshot.hash !== mergeSnapshot)
    return execute("canonical Kibi snapshots differ", {
      mergeSnapshot,
      developSnapshot: attestation.snapshot.hash,
      sourceRun: run.html_url,
    });
  return {
    version: DECISION_VERSION,
    mode: "reused",
    reason: "identical canonical Kibi workspace snapshot",
    mergeSnapshot,
    developSnapshot: attestation.snapshot.hash,
    sourceRun: run.html_url,
  };
}

type TrainReuseInput = {
  repository: string;
  mergeSha: string;
  checkoutSha: string;
  /** Parents of the develop commit: the develop tip before, then the train head. */
  parents: string[];
  snapshot: Snapshot;
  runs: ProofRun[];
  attestation: unknown;
};

/**
 * The workflow run ID that holds `kibi-requirement-proof` for a reused train
 * attestation. When a single-PR merge train reused its member PR's proof, its
 * attestation carries `derived_from` pointing at that member run (the train
 * run skipped the `proof` job and uploaded no report); otherwise the train run
 * itself uploaded the report.
 */
export function reportRunIdFromAttestation(
  repository: string,
  trainRunId: number,
  attestation: unknown,
): number {
  if (!isRecord(attestation) || typeof attestation.derived_from !== "string")
    return trainRunId;
  const prefix = `https://github.com/${repository.toLowerCase()}/actions/runs/`;
  const normalized = attestation.derived_from.trim();
  if (!normalized.toLowerCase().startsWith(prefix)) return trainRunId;
  const suffix = normalized.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) return trainRunId;
  const derivedId = Number(suffix);
  return Number.isSafeInteger(derivedId) && derivedId > 0
    ? derivedId
    : trainRunId;
}

async function hasProofReportArtifact(
  repository: string,
  runId: number,
): Promise<boolean> {
  const payload = await ghApi(
    `/repos/${repository}/actions/runs/${runId}/artifacts`,
  );
  const artifacts =
    isRecord(payload) && Array.isArray(payload.artifacts)
      ? payload.artifacts
      : [];
  return artifacts.some(
    (entry) =>
      isRecord(entry) &&
      entry.name === REPORT_ARTIFACT_NAME &&
      entry.expired !== true,
  );
}

/** The trust decision for a develop push that merged a merge train. The train
 * pull request's proof run proved the train head merged into the commit the
 * train was assembled on; a develop merge commit with exactly those parents
 * and the attested snapshot holds that proven tree, so it reuses the proof.
 */
export function assessTrainProofReuse(input: TrainReuseInput): ReuseDecision {
  const mergeSnapshot = input.snapshot.hash;
  const [base, head] = input.parents;
  if (
    input.parents.length !== 2 ||
    !SHA.test(String(base)) ||
    !SHA.test(String(head)) ||
    !SHA.test(input.mergeSha) ||
    input.checkoutSha !== input.mergeSha
  )
    return execute("develop commit is not a merge of a train", {
      mergeSnapshot,
    });
  if (
    input.snapshot.version !== "kibi.workspace-snapshot.v2" ||
    !HASH.test(mergeSnapshot) ||
    input.snapshot.dirty
  )
    return execute(
      "develop workspace snapshot is unavailable, incompatible, or dirty",
      { mergeSnapshot },
    );
  const runs = input.runs.filter(
    (run) =>
      isRecord(run) &&
      typeof run.head_branch === "string" &&
      run.head_branch.startsWith(TRAIN_PREFIX),
  );
  const run = runs[0];
  if (runs.length !== 1 || !run)
    return execute("no unique successful train proof run for the merged head", {
      mergeSnapshot,
    });
  if (
    !Number.isSafeInteger(run.id) ||
    run.id <= 0 ||
    !Number.isSafeInteger(run.run_attempt) ||
    run.run_attempt <= 0 ||
    run.head_sha !== head ||
    run.event !== "pull_request" ||
    run.status !== "completed" ||
    run.conclusion !== "success" ||
    run.path !== WORKFLOW_PATH ||
    run.head_repository?.full_name?.toLowerCase() !==
      input.repository.toLowerCase() ||
    run.html_url !==
      `https://github.com/${input.repository}/actions/runs/${run.id}`
  )
    return execute("train proof run provenance is invalid", { mergeSnapshot });
  const value = input.attestation;
  if (
    !isRecord(value) ||
    !isRecord(value.snapshot) ||
    !isRecord(value.source) ||
    !isRecord(value.run) ||
    typeof value.source.repository !== "string"
  )
    return execute("train proof attestation is missing or malformed", {
      mergeSnapshot,
    });
  const attestation = value as Attestation;
  if (
    attestation.version !== ATTESTATION_VERSION ||
    attestation.outcome !== "passed" ||
    attestation.snapshot.version !== input.snapshot.version ||
    attestation.source.repository.toLowerCase() !==
      input.repository.toLowerCase() ||
    attestation.source.branch !== run.head_branch ||
    attestation.source.sha !== head ||
    attestation.source.event !== "pull_request" ||
    attestation.source.base !== base ||
    attestation.run.id !== run.id ||
    attestation.run.attempt !== run.run_attempt ||
    attestation.run.workflow !== WORKFLOW_PATH ||
    attestation.run.url !== run.html_url ||
    attestation.artifact !== ARTIFACT_NAME
  )
    return execute("train proof attestation does not match the merged train", {
      mergeSnapshot,
      developSnapshot: attestation.snapshot.hash,
    });
  if (attestation.snapshot.hash !== mergeSnapshot)
    return execute("canonical Kibi snapshots differ", {
      mergeSnapshot,
      developSnapshot: attestation.snapshot.hash,
      sourceRun: run.html_url,
    });
  return {
    version: DECISION_VERSION,
    mode: "reused",
    reason: "the develop commit has the proven tree of the merged train",
    mergeSnapshot,
    developSnapshot: attestation.snapshot.hash,
    sourceRun: run.html_url,
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function currentSnapshot(root = process.cwd()): Promise<Snapshot> {
  const snapshot = await nodeGit.workspaceSnapshot?.(root);
  if (!snapshot)
    throw new Error("canonical Kibi workspace snapshot is unavailable");
  return snapshot;
}

async function git(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: process.cwd() });
  return stdout.trim();
}

async function ghApi(endpoint: string): Promise<unknown> {
  const { stdout } = await execFileAsync("gh", ["api", endpoint], {
    env: process.env,
    maxBuffer: 1024 * 1024,
    timeout: 30000,
  });
  return JSON.parse(stdout);
}

async function developHead(repository: string): Promise<string> {
  const response = await ghApi(`repos/${repository}/branches/develop`);
  if (
    !isRecord(response) ||
    !isRecord(response.commit) ||
    typeof response.commit.sha !== "string"
  )
    throw new Error("develop branch response is malformed");
  return response.commit.sha;
}

async function findProofRun(
  repository: string,
  sha: string,
): Promise<ProofRun[]> {
  const query = new URLSearchParams({
    branch: "develop",
    event: "push",
    head_sha: sha,
    status: "success",
    per_page: "100",
  });
  const response = await ghApi(
    `repos/${repository}/actions/workflows/proof.yml/runs?${query}`,
  );
  if (
    !isRecord(response) ||
    !Array.isArray(response.workflow_runs) ||
    response.total_count !== response.workflow_runs.length
  )
    throw new Error("develop proof run lookup is incomplete or malformed");
  return response.workflow_runs as ProofRun[];
}

/**
 * A develop push and the master PR it updates start their proof runs within
 * seconds of each other, so the reuse check usually looks before develop's
 * proof has finished. Returns the develop push runs for `sha` that are still
 * queued or running; the caller waits on them instead of re-proving.
 */
export function pendingDevelopProofRuns(
  response: unknown,
  sha: string,
): ProofRun[] {
  if (
    !isRecord(response) ||
    !Array.isArray(response.workflow_runs) ||
    response.total_count !== response.workflow_runs.length
  )
    throw new Error("develop proof run lookup is incomplete or malformed");
  return (response.workflow_runs as ProofRun[]).filter(
    (run) =>
      isRecord(run) &&
      run.head_sha === sha &&
      run.head_branch === "develop" &&
      run.event === "push" &&
      run.status !== "completed",
  );
}

function secondsFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${name} must be a non-negative number of seconds`);
  return value;
}

/** Wait (bounded) for develop's own proof of `sha` to finish before deciding. */
async function waitForDevelopProof(
  repository: string,
  sha: string,
): Promise<void> {
  const maxWait = secondsFromEnv("KIBI_PROOF_REUSE_WAIT_SECONDS", 3600);
  // A push run is normally created before the PR run; allow a short grace for
  // it to appear, but never wait the full budget on a run that does not exist.
  const appearGrace = Math.min(maxWait, 300);
  const poll = secondsFromEnv("KIBI_PROOF_REUSE_POLL_SECONDS", 30);
  const started = Date.now();
  const query = new URLSearchParams({
    branch: "develop",
    event: "push",
    head_sha: sha,
    per_page: "100",
  });
  for (;;) {
    const response = await ghApi(
      `repos/${repository}/actions/workflows/proof.yml/runs?${query}`,
    );
    const pending = pendingDevelopProofRuns(response, sha);
    // pendingDevelopProofRuns has already rejected a malformed listing.
    const seen = (response as { workflow_runs: unknown[] }).workflow_runs
      .length;
    const waited = (Date.now() - started) / 1000;
    if (pending.length === 0 && seen > 0) return;
    if (waited >= (seen === 0 ? appearGrace : maxWait)) return;
    console.log(
      seen === 0
        ? `Waiting for the develop proof run of ${sha} to appear (${Math.round(waited)}s)`
        : `Waiting for develop proof ${pending.map((run) => run.html_url).join(", ")} to finish (${Math.round(waited)}s)`,
    );
    await new Promise((resolve) => setTimeout(resolve, poll * 1000));
  }
}

async function downloadAttestation(
  repository: string,
  run: ProofRun,
): Promise<unknown> {
  const response = await ghApi(
    `repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`,
  );
  if (
    !isRecord(response) ||
    !Array.isArray(response.artifacts) ||
    response.total_count !== response.artifacts.length
  )
    throw new Error("proof artifact lookup is incomplete or malformed");
  const matches = response.artifacts.filter(
    (artifact) =>
      isRecord(artifact) &&
      artifact.name === ARTIFACT_NAME &&
      artifact.expired === false,
  );
  if (matches.length !== 1)
    throw new Error("proof attestation artifact is missing or ambiguous");
  const artifact = matches[0];
  if (
    !isRecord(artifact) ||
    typeof artifact.size_in_bytes !== "number" ||
    !Number.isSafeInteger(artifact.size_in_bytes) ||
    artifact.size_in_bytes <= 0 ||
    artifact.size_in_bytes > 65536
  )
    throw new Error("proof attestation artifact size is invalid");
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "kibi-proof-attestation-"),
  );
  try {
    await execFileAsync(
      "gh",
      [
        "run",
        "download",
        String(run.id),
        "--repo",
        repository,
        "--name",
        ARTIFACT_NAME,
        "--dir",
        directory,
      ],
      {
        env: process.env,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      },
    );
    const content = await readFile(
      path.join(directory, "attestation.json"),
      "utf8",
    );
    if (content.length > 65536)
      throw new Error("proof attestation artifact is too large");
    return JSON.parse(content);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** The source of a train attestation: the train head merged into its base. */
function trainSource(
  repository: string,
  branch: string,
): Attestation["source"] {
  const sha = requiredEnv("PR_HEAD_SHA");
  const base = requiredEnv("PR_BASE_SHA");
  if (!SHA.test(sha) || !SHA.test(base))
    throw new Error("merge train head or base SHA is invalid");
  return { repository, branch, sha, event: "pull_request", base };
}

async function attest(outputDirectory: string): Promise<void> {
  const event = requiredEnv("GITHUB_EVENT_NAME");
  const develop =
    event === "push" && requiredEnv("GITHUB_REF") === "refs/heads/develop";
  const trainBranch = process.env.PR_HEAD_BRANCH ?? "";
  const sameRepository =
    (process.env.PR_HEAD_REPOSITORY ?? "").toLowerCase() ===
    requiredEnv("GITHUB_REPOSITORY").toLowerCase();
  const train =
    event === "pull_request" &&
    trainBranch.startsWith(TRAIN_PREFIX) &&
    sameRepository;
  const memberPull =
    event === "pull_request" &&
    process.env.PR_BASE_REF === "develop" &&
    sameRepository;
  if (!develop && !memberPull)
    throw new Error(
      "only a develop push or a same-repository pull request into develop may emit a proof attestation",
    );
  const repository = requiredEnv("GITHUB_REPOSITORY");
  const sha = requiredEnv("GITHUB_SHA");
  const tree = await git("rev-parse", "HEAD^{tree}");
  if (
    !SHA.test(sha) ||
    !SHA.test(tree) ||
    (await git("rev-parse", "HEAD")) !== sha
  )
    throw new Error("checkout does not match the attested commit");
  const snapshot = await currentSnapshot();
  if (
    snapshot.version !== "kibi.workspace-snapshot.v2" ||
    !HASH.test(snapshot.hash) ||
    snapshot.dirty
  )
    throw new Error("proof snapshot is incompatible or dirty");
  const runId = Number(requiredEnv("GITHUB_RUN_ID"));
  const attempt = Number(requiredEnv("GITHUB_RUN_ATTEMPT"));
  if (
    !Number.isSafeInteger(runId) ||
    runId <= 0 ||
    !Number.isSafeInteger(attempt) ||
    attempt <= 0
  )
    throw new Error("GitHub proof run identity is invalid");
  if (!develop && !train && !SHA.test(requiredEnv("PR_HEAD_SHA")))
    throw new Error("pull request head SHA is invalid");
  const attestation: Attestation = {
    version: ATTESTATION_VERSION,
    outcome: "passed",
    snapshot: { version: snapshot.version, hash: snapshot.hash },
    tree,
    source: develop
      ? { repository, branch: "develop", sha, event: "push" }
      : train
        ? trainSource(repository, trainBranch)
        : {
            repository,
            branch: trainBranch,
            sha: requiredEnv("PR_HEAD_SHA"),
            event: "pull_request",
          },
    run: {
      id: runId,
      attempt,
      workflow: WORKFLOW_PATH,
      url: `https://github.com/${repository}/actions/runs/${runId}`,
    },
    artifact: ARTIFACT_NAME,
  };
  const derived = process.env.KIBI_PROOF_DERIVED_FROM ?? "";
  if ((develop || train) && derived !== "") {
    if (!derived.startsWith(`https://github.com/${repository}/actions/runs/`))
      throw new Error(
        "KIBI_PROOF_DERIVED_FROM is not a run of this repository",
      );
    attestation.derived_from = derived;
  }
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, "attestation.json"),
    `${JSON.stringify(attestation, null, 2)}\n`,
  );
  console.log(
    `Kibi full proof attested: ${snapshot.version} ${snapshot.hash}; run ${runId}/${attempt}`,
  );
}

/** Make `sha` readable in a shallow checkout (actions/checkout fetches one commit). */
async function ensureCommit(sha: string): Promise<void> {
  try {
    await git("cat-file", "-e", `${sha}^{commit}`);
  } catch {
    await git("fetch", "--no-tags", "--depth=1", "origin", sha);
  }
}

/** The canonical snapshot of a commit's tracked files, read from a scratch worktree. */
async function committedSnapshot(sha: string): Promise<string> {
  await ensureCommit(sha);
  const directory = await mkdtemp(path.join(os.tmpdir(), "kibi-proof-tree-"));
  try {
    await git("worktree", "add", "--detach", "--quiet", directory, sha);
    return (await currentSnapshot(directory)).hash;
  } finally {
    await git("worktree", "remove", "--force", directory);
    await rm(directory, { recursive: true, force: true });
  }
}

/**
 * A develop proof can be reused only when the merge snapshot equals the proven
 * one. When the committed trees of the merge and of the proven commit already
 * hash differently, no proof of that commit can match, so the caller runs the
 * full proof at once instead of waiting for develop's own run to finish.
 */
export async function provenTreeCanMatch(
  provenSha: string,
  mergeSha: string,
): Promise<boolean> {
  const [proven, merge] = [
    await committedSnapshot(provenSha),
    await committedSnapshot(mergeSha),
  ];
  return proven === merge;
}

class ProofCannotMatch extends Error {
  constructor(readonly mergeSnapshot: string) {
    super("the merge changes files the proven snapshot covers");
  }
}

async function decide(outputPath: string): Promise<void> {
  let decision: ReuseDecision;
  try {
    const repository = requiredEnv("GITHUB_REPOSITORY");
    const headSha = requiredEnv("PR_HEAD_SHA");
    const baseSha = requiredEnv("PR_BASE_SHA");
    const baseRef = process.env.PR_BASE_REF ?? "master";
    const provenSha = baseRef === "develop" ? baseSha : headSha;
    const snapshot = await currentSnapshot();
    const checkoutSha = await git("rev-parse", "HEAD");
    const mergeParents = (await git("show", "-s", "--format=%P", "HEAD"))
      .split(" ")
      .filter(Boolean);
    if (
      SHA.test(provenSha) &&
      SHA.test(checkoutSha) &&
      !(await provenTreeCanMatch(provenSha, checkoutSha))
    )
      throw new ProofCannotMatch(snapshot.hash);
    await waitForDevelopProof(repository, provenSha);
    const developHeadBefore = await developHead(repository);
    const runs = await findProofRun(repository, provenSha);
    const onlyRun = runs.length === 1 ? runs[0] : undefined;
    const attestation = onlyRun
      ? await downloadAttestation(repository, onlyRun)
      : null;
    const developHeadAfter = await developHead(repository);
    decision = assessProofReuse({
      repository,
      baseRef,
      headRepository: requiredEnv("PR_HEAD_REPOSITORY"),
      headBranch: requiredEnv("PR_HEAD_BRANCH"),
      headSha,
      baseSha,
      mergeSha: requiredEnv("GITHUB_SHA"),
      checkoutSha,
      mergeParents,
      developHeadBefore,
      developHeadAfter,
      snapshot,
      runs,
      attestation,
    });
  } catch (error) {
    decision =
      error instanceof ProofCannotMatch
        ? execute(
            "the merge changes files the proven snapshot covers; no develop proof can match",
            { mergeSnapshot: error.mergeSnapshot },
          )
        : execute(
            `reuse lookup failed: ${error instanceof Error ? error.message : String(error)}`,
          );
  }
  await report(
    outputPath,
    decision,
    "develop proof snapshot",
    "PR merge snapshot",
  );
}

/** Writes the decision file, the reuse output, the log and the step summary. */
async function report(
  outputPath: string,
  decision: ReuseDecision,
  provenLabel: string,
  currentLabel: string,
): Promise<void> {
  await writeFile(outputPath, `${JSON.stringify(decision, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `reuse=${decision.mode === "reused"}\n`,
    );
  const width = Math.max(provenLabel.length, currentLabel.length) + 1;
  const detail = [
    "Kibi proof reuse:",
    `  ${`${provenLabel}:`.padEnd(width)} ${decision.developSnapshot ?? "unavailable"}`,
    `  ${`${currentLabel}:`.padEnd(width)} ${decision.mergeSnapshot ?? "unavailable"}`,
    `  result: ${decision.reason}`,
    decision.mode === "reused"
      ? `  full proof skipped; reusing successful ${provenLabel.replace(/ snapshot$/, "")} ${decision.sourceRun}`
      : "  running full proof",
  ].join("\n");
  console.log(detail);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `\n### Kibi proof reuse\n\n\`\`\`text\n${detail}\n\`\`\`\n`,
    );
}

async function findTrainProofRuns(
  repository: string,
  sha: string,
): Promise<ProofRun[]> {
  const query = new URLSearchParams({
    event: "pull_request",
    head_sha: sha,
    status: "success",
    per_page: "100",
  });
  const response = await ghApi(
    `repos/${repository}/actions/workflows/proof.yml/runs?${query}`,
  );
  if (
    !isRecord(response) ||
    !Array.isArray(response.workflow_runs) ||
    response.total_count !== response.workflow_runs.length
  )
    throw new Error("train proof run lookup is incomplete or malformed");
  return response.workflow_runs as ProofRun[];
}

/** A develop push decides whether it merged a train whose proof it can reuse. */
async function decideTrain(outputPath: string): Promise<void> {
  let decision: ReuseDecision;
  let sourceRunId = "";
  let reportRunId = "";
  try {
    const repository = requiredEnv("GITHUB_REPOSITORY");
    if (
      requiredEnv("GITHUB_EVENT_NAME") !== "push" ||
      requiredEnv("GITHUB_REF") !== "refs/heads/develop"
    )
      throw new Error("only a develop push reuses a train's proof");
    const snapshot = await currentSnapshot();
    const checkoutSha = await git("rev-parse", "HEAD");
    const parents = (await git("show", "-s", "--format=%P", "HEAD"))
      .split(" ")
      .filter(Boolean);
    // A depth-1 checkout grafts HEAD's parents away; a merge would then look
    // like a root commit and its train would never be recognised.
    if (
      parents.length === 0 &&
      (await git("rev-parse", "--is-shallow-repository")) === "true"
    )
      throw new Error(
        "the checkout is shallow and hides HEAD's parents; fetch at least depth 2",
      );
    const head = parents[1];
    const runs =
      parents.length === 2 && head !== undefined && SHA.test(head)
        ? await findTrainProofRuns(repository, head)
        : [];
    const trainRuns = runs.filter(
      (run) =>
        isRecord(run) &&
        typeof run.head_branch === "string" &&
        run.head_branch.startsWith(TRAIN_PREFIX),
    );
    const onlyRun = trainRuns.length === 1 ? trainRuns[0] : undefined;
    const attestation = onlyRun
      ? await downloadAttestation(repository, onlyRun)
      : null;
    decision = assessTrainProofReuse({
      repository,
      mergeSha: requiredEnv("GITHUB_SHA"),
      checkoutSha,
      parents,
      snapshot,
      runs: trainRuns,
      attestation,
    });
    if (decision.mode === "reused" && onlyRun) {
      const candidateReportRunId = reportRunIdFromAttestation(
        repository,
        onlyRun.id,
        attestation,
      );
      let resolvedReportRunId: number | null = null;
      for (const candidate of [
        ...new Set([candidateReportRunId, onlyRun.id]),
      ]) {
        if (await hasProofReportArtifact(repository, candidate)) {
          resolvedReportRunId = candidate;
          break;
        }
      }
      if (resolvedReportRunId === null) {
        decision = execute(
          "reused train proof run has no kibi-requirement-proof artifact",
          {
            mergeSnapshot: decision.mergeSnapshot,
            developSnapshot: decision.developSnapshot,
            sourceRun: decision.sourceRun,
          },
        );
      } else {
        sourceRunId = String(onlyRun.id);
        reportRunId = String(resolvedReportRunId);
      }
    }
  } catch (error) {
    decision = execute(
      `train reuse lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  await report(
    outputPath,
    decision,
    "train proof snapshot",
    "develop snapshot",
  );
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `source_run_id=${sourceRunId}\nreport_run_id=${reportRunId}\nsource_run_url=${decision.mode === "reused" ? decision.sourceRun : ""}\n`,
    );
}

type SnapshotShape = { version: string; hash: string; dirty: boolean };

/**
 * A member run may stand in for this train's proof only when the canonical
 * snapshot agrees as well as the git tree. A snapshot mismatch runs the proof.
 */
export function proofAgreesWithMember(
  decision: CheckReuseDecision,
  snapshot: SnapshotShape,
  attestation: unknown,
): CheckReuseDecision {
  if (decision.mode !== "reused") return decision;
  const refuse = (reason: string): CheckReuseDecision => ({
    version: decision.version,
    mode: "execute",
    reason,
    tree: decision.tree,
  });
  if (
    snapshot.version !== "kibi.workspace-snapshot.v2" ||
    snapshot.dirty ||
    !HASH.test(snapshot.hash)
  )
    return refuse(
      "merge workspace snapshot is unavailable, incompatible, or dirty",
    );
  if (
    !isRecord(attestation) ||
    !isRecord(attestation.snapshot) ||
    attestation.snapshot.version !== snapshot.version ||
    attestation.snapshot.hash !== snapshot.hash
  )
    return refuse("canonical Kibi snapshots differ");
  return decision;
}

/** The attestation a landed train's develop push reuses, pointing at the member run. */
async function writeReusedTrainAttestation(
  snapshot: SnapshotShape,
  input: {
    trainHeadSha: string;
    trainParents: readonly string[];
    headBranch: string;
    checkoutTree: string;
  },
  sourceRun: string,
): Promise<void> {
  const repository = requiredEnv("GITHUB_REPOSITORY");
  const runId = Number(requiredEnv("GITHUB_RUN_ID"));
  const attempt = Number(requiredEnv("GITHUB_RUN_ATTEMPT"));
  const base = input.trainParents[0];
  if (!SHA.test(input.trainHeadSha) || !SHA.test(base ?? "") || !sourceRun)
    throw new Error("reused train attestation is missing its commits");
  if (!sourceRun.startsWith(`https://github.com/${repository}/actions/runs/`))
    throw new Error("member proof run is not a run of this repository");
  const attestation: Attestation = {
    version: ATTESTATION_VERSION,
    outcome: "passed",
    snapshot: { version: snapshot.version, hash: snapshot.hash },
    tree: input.checkoutTree,
    source: {
      repository,
      branch: input.headBranch,
      sha: input.trainHeadSha,
      event: "pull_request",
      base,
    },
    run: {
      id: runId,
      attempt,
      workflow: WORKFLOW_PATH,
      url: `https://github.com/${repository}/actions/runs/${runId}`,
    },
    artifact: ARTIFACT_NAME,
    derived_from: sourceRun,
  };
  const directory = path.join(
    requiredEnv("RUNNER_TEMP"),
    "kibi-proof-attestation",
  );
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "attestation.json"),
    `${JSON.stringify(attestation, null, 2)}\n`,
  );
}

async function decideMember(outputPath: string): Promise<void> {
  process.env.KIBI_REUSE_WORKFLOW = WORKFLOW_PATH;
  process.env.KIBI_REUSE_ARTIFACT = ARTIFACT_NAME;
  process.env.KIBI_REUSE_ATTESTATION_VERSION = ATTESTATION_VERSION;
  process.env.KIBI_REUSE_CHECK = "proof-required";
  let decision: ReuseDecision;
  let sourceRunId = "";
  try {
    const input = await collectMemberReuseInput();
    const snapshot = await currentSnapshot();
    const agreed = proofAgreesWithMember(
      assessMemberCheckReuse(input),
      snapshot,
      input.attestation,
    );
    const attested =
      isRecord(input.attestation) && isRecord(input.attestation.snapshot)
        ? input.attestation.snapshot.hash
        : undefined;
    decision = {
      version: DECISION_VERSION,
      mode: agreed.mode,
      reason: agreed.reason,
      mergeSnapshot: HASH.test(snapshot.hash) ? snapshot.hash : undefined,
      developSnapshot: typeof attested === "string" ? attested : undefined,
      sourceRun: agreed.mode === "reused" ? agreed.sourceRun : undefined,
    };
    if (agreed.mode === "reused" && agreed.sourceRun) {
      await writeReusedTrainAttestation(snapshot, input, agreed.sourceRun);
      sourceRunId = String(agreed.sourceRunId ?? "");
    }
  } catch (error) {
    decision = execute(
      `member reuse lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  await report(
    outputPath,
    decision,
    "member proof snapshot",
    "train checkout snapshot",
  );
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `source_run_id=${sourceRunId}\nsource_run_url=${decision.mode === "reused" ? (decision.sourceRun ?? "") : ""}\n`,
    );
}

export async function main(argv: readonly string[]): Promise<void> {
  const [command, output] = argv;
  if (
    !output ||
    (command !== "attest" &&
      command !== "decide" &&
      command !== "decide-train" &&
      command !== "decide-member")
  )
    throw new Error(
      "usage: bun scripts/ci-proof-reuse.ts attest|decide|decide-train|decide-member <output-path>",
    );
  if (command === "attest") await attest(output);
  else if (command === "decide") await decide(output);
  else if (command === "decide-member") await decideMember(output);
  else await decideTrain(output);
}

if (import.meta.main) await main(process.argv.slice(2));
