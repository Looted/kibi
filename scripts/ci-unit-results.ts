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
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const UNIT_RESULTS_ARTIFACT = "unit-test-results";
const WORKFLOW = "ci.yml";
const SHA = /^[a-f0-9]{40}$/;
const MAX_LEDGER_BYTES = 8 * 1024 * 1024;

type CiRun = {
  id: number;
  head_sha: string;
  event: string;
  status: string;
  conclusion: string | null;
};
type Artifact = {
  id: number;
  name: string;
  expired: boolean;
  size_in_bytes: number;
};

export type FetchInput = Readonly<{
  repository: string;
  /** The PR's source repository; artifacts from a fork's code are never trusted. */
  headRepository: string;
  sha: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Why CI unit results must not be fetched for this run, or null to fetch. */
// implements REQ-kibi-verification-evidence-contract
export function fetchRefusal(input: FetchInput): string | null {
  if (!/^[\w.-]+\/[\w.-]+$/.test(input.repository))
    return "repository is unknown";
  if (input.headRepository.toLowerCase() !== input.repository.toLowerCase())
    return "the change comes from another repository";
  if (!SHA.test(input.sha)) return "commit SHA is invalid";
  return null;
}

/** The newest CI run of this repository for `sha`, from a runs response. */
// implements REQ-kibi-verification-evidence-contract
export function latestCiRun(response: unknown, sha: string): CiRun | null {
  if (!isRecord(response) || !Array.isArray(response.workflow_runs))
    throw new Error("CI run lookup is malformed");
  const runs = (response.workflow_runs as unknown[]).filter(
    (run): run is CiRun =>
      isRecord(run) &&
      Number.isSafeInteger(run.id) &&
      run.head_sha === sha &&
      (run.event === "push" || run.event === "pull_request"),
  );
  return runs.sort((a, b) => b.id - a.id)[0] ?? null;
}

/** The single unexpired results artifact of a run, from an artifacts response. */
// implements REQ-kibi-verification-evidence-contract
export function resultsArtifact(response: unknown): Artifact | null {
  if (!isRecord(response) || !Array.isArray(response.artifacts))
    throw new Error("CI artifact lookup is malformed");
  const matches = (response.artifacts as unknown[]).filter(
    (artifact): artifact is Artifact =>
      isRecord(artifact) &&
      artifact.name === UNIT_RESULTS_ARTIFACT &&
      artifact.expired === false,
  );
  if (matches.length > 1)
    throw new Error("CI unit results artifact is ambiguous");
  const artifact = matches[0];
  if (artifact === undefined) return null;
  if (
    !Number.isSafeInteger(artifact.size_in_bytes) ||
    artifact.size_in_bytes <= 0 ||
    artifact.size_in_bytes > MAX_LEDGER_BYTES
  )
    throw new Error("CI unit results artifact size is invalid");
  return artifact;
}

async function ghApi(endpoint: string): Promise<unknown> {
  const { stdout } = await execFileAsync("gh", ["api", endpoint], {
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
    timeout: 30000,
  });
  return JSON.parse(stdout);
}

async function downloadLedger(
  repository: string,
  runId: number,
): Promise<unknown> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kibi-unit-results-"));
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
        UNIT_RESULTS_ARTIFACT,
        "--dir",
        directory,
      ],
      { env: process.env, timeout: 60000, maxBuffer: 1024 * 1024 },
    );
    const content = await readFile(
      path.join(directory, "test-results.json"),
      "utf8",
    );
    if (content.length > MAX_LEDGER_BYTES)
      throw new Error("CI unit results are too large");
    return JSON.parse(content);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** Write atomically so the proof producer never reads a partial file. */
async function writeOutput(out: string, value: unknown): Promise<void> {
  const temporary = `${out}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, "utf8");
  await rename(temporary, out);
}

function secondsFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${name} must be a non-negative number of seconds`);
  return value;
}

/**
 * Wait (bounded) for the CI run of this commit to publish its unit test
 * results, then write them to `out`; otherwise write `{ unavailable }` so the
 * proof producer stops waiting and runs every step itself.
 */
// implements REQ-kibi-verification-evidence-contract
export async function fetchUnitResults(
  out: string,
  input: FetchInput,
): Promise<string> {
  const refusal = fetchRefusal(input);
  if (refusal !== null) return refusal;
  const maxWait = secondsFromEnv("KIBI_UNIT_RESULTS_WAIT_SECONDS", 1800);
  const appearGrace = Math.min(maxWait, 300);
  const poll = secondsFromEnv("KIBI_UNIT_RESULTS_POLL_SECONDS", 20);
  const started = Date.now();
  const query = new URLSearchParams({ head_sha: input.sha, per_page: "100" });
  for (;;) {
    const run = latestCiRun(
      await ghApi(
        `repos/${input.repository}/actions/workflows/${WORKFLOW}/runs?${query}`,
      ),
      input.sha,
    );
    if (run !== null) {
      const artifact = resultsArtifact(
        await ghApi(
          `repos/${input.repository}/actions/runs/${run.id}/artifacts?per_page=100`,
        ),
      );
      if (artifact !== null) {
        await writeOutput(out, await downloadLedger(input.repository, run.id));
        return `downloaded from CI run ${run.id}`;
      }
      if (run.status === "completed")
        return `CI run ${run.id} finished (${run.conclusion}) without unit test results`;
    }
    const waited = (Date.now() - started) / 1000;
    if (waited >= (run === null ? appearGrace : maxWait))
      return run === null
        ? "no CI run for this commit"
        : `CI run ${run.id} published no unit test results within ${maxWait}s`;
    await new Promise((resolve) => setTimeout(resolve, poll * 1000));
  }
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const [command, out] = argv;
  if (command !== "fetch" || out === undefined) {
    console.error("usage: ci-unit-results.ts fetch <output.json>");
    return 2;
  }
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  let outcome: string;
  try {
    outcome = await fetchUnitResults(out, {
      repository,
      headRepository: process.env.PR_HEAD_REPOSITORY || repository,
      sha: process.env.CI_HEAD_SHA ?? "",
    });
  } catch (error) {
    outcome = error instanceof Error ? error.message : String(error);
  }
  if (!outcome.startsWith("downloaded")) {
    await writeOutput(out, { unavailable: outcome });
  }
  console.log(`Unit test results: ${outcome}`);
  return 0;
}

if (import.meta.main) process.exitCode = await main();
