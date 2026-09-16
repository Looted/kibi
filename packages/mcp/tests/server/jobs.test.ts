import { describe, expect, test } from "bun:test";
import {
  getJob,
  jobSnapshot,
  resetJobsForTests,
  startJob,
} from "../../src/server/jobs.js";

describe("mcp background jobs", () => {
  test("startJob returns a running receipt and resolves to succeeded with the result", async () => {
    resetJobsForTests();
    let resolveFactory: (value: unknown) => void = () => undefined;
    const receipt = startJob("kb_check", () => {
      return new Promise((resolve) => {
        resolveFactory = resolve;
      });
    });

    expect(receipt.jobVersion).toBe("kibi.job.v1");
    expect(receipt.tool).toBe("kb_check");
    expect(receipt.status).toBe("running");
    expect(receipt.pollWith).toBe("kb_job_status");

    const jobId = String(receipt.jobId);
    expect(getJob(jobId)?.status).toBe("running");

    resolveFactory({ violations: [], count: 0 });
    await Bun.sleep(10);
    const job = getJob(jobId);
    expect(job?.status).toBe("succeeded");
    expect(job?.result).toMatchObject({ count: 0 });

    const snapshot = job === undefined ? undefined : jobSnapshot(job);
    expect(snapshot?.status).toBe("succeeded");
    expect(snapshot?.finishedAt).toBeString();
  });

  test("a failing factory records status failed with the error message", async () => {
    resetJobsForTests();
    const receipt = startJob("kb_check", async () => {
      throw new Error("Prolog engine exploded");
    });
    await Bun.sleep(10);
    const job = getJob(String(receipt.jobId));
    expect(job?.status).toBe("failed");
    expect(job?.error).toBe("Prolog engine exploded");
    const snapshot = job === undefined ? undefined : jobSnapshot(job);
    expect(snapshot?.error).toBe("Prolog engine exploded");
  });

  test("non-object results are wrapped so snapshots stay structured", async () => {
    resetJobsForTests();
    const receipt = startJob("kb_check", async () => 42);
    await Bun.sleep(10);
    expect(getJob(String(receipt.jobId))?.result).toMatchObject({ value: 42 });
  });

  test("getJob returns undefined for unknown ids", () => {
    resetJobsForTests();
    expect(getJob("job-nope")).toBeUndefined();
  });

  test("finished jobs are evicted oldest-first beyond the bounded history", async () => {
    resetJobsForTests();
    // Fill beyond the cap with immediately-finished jobs; none of the early
    // ids may survive.
    const firstId = String(startJob("kb_check", async () => ({})).jobId);
    for (let i = 0; i < 40; i++) {
      startJob("kb_check", async () => ({}));
      await Bun.sleep(1);
    }
    expect(getJob(firstId)).toBeUndefined();
  });
});
