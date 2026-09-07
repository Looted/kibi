/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import process from "node:process";

/**
 * Process-local background jobs for long-running MCP operations.
 *
 * `kb_check` on a large KB can exceed the 90s tool timeout. Supported tools
 * accept `async: true`: the handler starts the operation in a detached job
 * and returns a `kibi.job.v1` receipt immediately. Agents poll
 * `kb_job_status` with the returned id until the job reaches a terminal
 * state.
 *
 * Jobs live in the MCP server process memory only — they are not persisted,
 * not shared across transports, and dropped on server restart. The registry
 * keeps a bounded history of finished jobs (oldest evicted first); running
 * jobs are never evicted.
 */

type JobState = "running" | "succeeded" | "failed";

export interface JobRecord {
  // implements REQ-002
  readonly jobId: string;
  readonly tool: string;
  readonly startedAt: string;
  status: JobState;
  finishedAt?: string;
  result?: Readonly<Record<string, unknown>>;
  error?: string;
}

const MAX_FINISHED_JOBS = 32;

const jobs = new Map<string, JobRecord>();
let jobCounter = 0;

function nextJobId(tool: string): string {
  jobCounter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `job-${tool}-${jobCounter.toString(36)}-${random}`;
}

function evictOldestFinished(): void {
  for (const [id, record] of jobs) {
    if (jobs.size <= MAX_FINISHED_JOBS) break;
    if (record.status !== "running") {
      jobs.delete(id);
    }
  }
}

/**
 * Start a background job for `tool`. The factory's promise runs detached;
 * callers return the `kibi.job.v1` receipt immediately so the MCP request is
 * never held open for the duration of the operation.
 */
// implements REQ-002
export function startJob(
  tool: string,
  factory: () => Promise<unknown>,
): Readonly<Record<string, unknown>> {
  const jobId = nextJobId(tool);
  const record: JobRecord = {
    jobId,
    tool,
    startedAt: new Date().toISOString(),
    status: "running",
  };
  jobs.set(jobId, record);
  void (async () => {
    try {
      const result = await factory();
      record.status = "succeeded";
      record.finishedAt = new Date().toISOString();
      record.result =
        result !== null && typeof result === "object"
          ? (result as Readonly<Record<string, unknown>>)
          : { value: result };
    } catch (error) {
      record.status = "failed";
      record.finishedAt = new Date().toISOString();
      record.error = error instanceof Error ? error.message : String(error);
    } finally {
      evictOldestFinished();
    }
  })().catch((error) => {
    // Defensive: the internal bookkeeping above must never crash the server
    // process via an unhandled rejection.
    process.stderr.write(
      `[kibi-mcp] job bookkeeping error for ${jobId}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  });
  return {
    kibiProtocol: 1,
    jobVersion: "kibi.job.v1",
    jobId,
    tool,
    status: "running",
    pollWith: "kb_job_status",
  };
}

// implements REQ-002
export function getJob(jobId: string): JobRecord | undefined {
  return jobs.get(jobId);
}

/** Public JSON shape for kb_job_status responses. */
// implements REQ-002
export function jobSnapshot(job: JobRecord): Readonly<Record<string, unknown>> {
  return {
    kibiProtocol: 1,
    jobVersion: "kibi.job.v1",
    jobId: job.jobId,
    tool: job.tool,
    status: job.status,
    startedAt: job.startedAt,
    ...(job.finishedAt === undefined ? {} : { finishedAt: job.finishedAt }),
    ...(job.result === undefined ? {} : { result: job.result }),
    ...(job.error === undefined ? {} : { error: job.error }),
  };
}

/** Test seam: drop all job state. */
// implements REQ-002
export function resetJobsForTests(): void {
  jobs.clear();
  jobCounter = 0;
}
