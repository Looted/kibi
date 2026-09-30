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

const execFileAsync = promisify(execFile);
const ATTESTATION_VERSION = "kibi.ci-proof-attestation.v1";
const DECISION_VERSION = "kibi.ci-proof-decision.v1";
const ARTIFACT_NAME = "kibi-proof-attestation";
const WORKFLOW_PATH = ".github/workflows/proof.yml";
const SHA = /^[a-f0-9]{40}$/;
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
};
type Attestation = {
  version: string;
  outcome: string;
  snapshot: { version: string; hash: string };
  source: { repository: string; branch: string; sha: string; event: string };
  run: { id: number; attempt: number; workflow: string; url: string };
  artifact: string;
};
type ReuseInput = {
  repository: string;
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
// implements REQ-kibi-verification-evidence-contract
export function assessProofReuse(input: ReuseInput): ReuseDecision {
  const mergeSnapshot = input.snapshot.hash;
  if (
    input.headBranch !== "develop" ||
    input.headRepository.toLowerCase() !== input.repository.toLowerCase()
  )
    return execute("PR source is not this repository's develop branch", {
      mergeSnapshot,
    });
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
    input.developHeadBefore !== input.headSha ||
    input.developHeadAfter !== input.headSha
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
    run.head_sha !== input.headSha ||
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
    attestation.source.sha !== input.headSha ||
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

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function currentSnapshot(): Promise<Snapshot> {
  const snapshot = await nodeGit.workspaceSnapshot?.(process.cwd());
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

async function attest(outputDirectory: string): Promise<void> {
  if (
    requiredEnv("GITHUB_EVENT_NAME") !== "push" ||
    requiredEnv("GITHUB_REF") !== "refs/heads/develop"
  )
    throw new Error(
      "only a successful develop push may emit a proof attestation",
    );
  const repository = requiredEnv("GITHUB_REPOSITORY");
  const sha = requiredEnv("GITHUB_SHA");
  if (!SHA.test(sha) || (await git("rev-parse", "HEAD")) !== sha)
    throw new Error("develop checkout does not match the attested commit");
  const snapshot = await currentSnapshot();
  if (
    snapshot.version !== "kibi.workspace-snapshot.v2" ||
    !HASH.test(snapshot.hash) ||
    snapshot.dirty
  )
    throw new Error("develop proof snapshot is incompatible or dirty");
  const runId = Number(requiredEnv("GITHUB_RUN_ID"));
  const attempt = Number(requiredEnv("GITHUB_RUN_ATTEMPT"));
  if (
    !Number.isSafeInteger(runId) ||
    runId <= 0 ||
    !Number.isSafeInteger(attempt) ||
    attempt <= 0
  )
    throw new Error("GitHub proof run identity is invalid");
  const attestation: Attestation = {
    version: ATTESTATION_VERSION,
    outcome: "passed",
    snapshot: { version: snapshot.version, hash: snapshot.hash },
    source: { repository, branch: "develop", sha, event: "push" },
    run: {
      id: runId,
      attempt,
      workflow: WORKFLOW_PATH,
      url: `https://github.com/${repository}/actions/runs/${runId}`,
    },
    artifact: ARTIFACT_NAME,
  };
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, "attestation.json"),
    `${JSON.stringify(attestation, null, 2)}\n`,
  );
  console.log(
    `Kibi full proof attested: ${snapshot.version} ${snapshot.hash}; run ${runId}/${attempt}`,
  );
}

async function decide(outputPath: string): Promise<void> {
  let decision: ReuseDecision;
  try {
    const repository = requiredEnv("GITHUB_REPOSITORY");
    const headSha = requiredEnv("PR_HEAD_SHA");
    const snapshot = await currentSnapshot();
    const checkoutSha = await git("rev-parse", "HEAD");
    const mergeParents = (await git("show", "-s", "--format=%P", "HEAD"))
      .split(" ")
      .filter(Boolean);
    const developHeadBefore = await developHead(repository);
    const runs = await findProofRun(repository, headSha);
    const onlyRun = runs.length === 1 ? runs[0] : undefined;
    const attestation = onlyRun
      ? await downloadAttestation(repository, onlyRun)
      : null;
    const developHeadAfter = await developHead(repository);
    decision = assessProofReuse({
      repository,
      headRepository: requiredEnv("PR_HEAD_REPOSITORY"),
      headBranch: requiredEnv("PR_HEAD_BRANCH"),
      headSha,
      baseSha: requiredEnv("PR_BASE_SHA"),
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
    decision = execute(
      `reuse lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  await writeFile(outputPath, `${JSON.stringify(decision, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `reuse=${decision.mode === "reused"}\n`,
    );
  const detail = [
    "Kibi proof reuse:",
    `  develop proof snapshot: ${decision.developSnapshot ?? "unavailable"}`,
    `  master merge snapshot:  ${decision.mergeSnapshot ?? "unavailable"}`,
    `  result: ${decision.reason}`,
    decision.mode === "reused"
      ? `  full proof skipped; reusing successful develop proof ${decision.sourceRun}`
      : "  running full proof",
  ].join("\n");
  console.log(detail);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `\n### Kibi proof reuse\n\n\`\`\`text\n${detail}\n\`\`\`\n`,
    );
}

if (import.meta.main) {
  const [command, output] = process.argv.slice(2);
  if (!output || (command !== "attest" && command !== "decide"))
    throw new Error(
      "usage: bun scripts/ci-proof-reuse.ts attest|decide <output-path>",
    );
  if (command === "attest") await attest(output);
  else await decide(output);
}
