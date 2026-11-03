import {
  afterEach,
  describe,
  expect,
  setSystemTime,
  spyOn,
  test,
} from "bun:test";
import {
  getJob,
  jobSnapshot,
  resetJobsForTests,
  startJob,
} from "../../src/server/jobs.js";

afterEach(() => {
  setSystemTime();
  resetJobsForTests();
});

const settle = () => Bun.sleep(5);

describe("mcp background jobs, exact shapes", () => {
  test("the receipt and the running snapshot carry exactly the job fields", () => {
    resetJobsForTests();
    setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
    const random = spyOn(Math, "random").mockReturnValue(0.5);
    try {
      const receipt = startJob("kb_check", () => new Promise(() => undefined));
      const jobId = `job-kb_check-1-${(0.5).toString(36).slice(2, 10)}`;
      expect(receipt).toStrictEqual({
        kibiProtocol: 1,
        jobVersion: "kibi.job.v1",
        jobId,
        tool: "kb_check",
        status: "running",
        pollWith: "kb_job_status",
      });
      const job = getJob(jobId);
      expect(job).toStrictEqual({
        jobId,
        tool: "kb_check",
        startedAt: "2026-01-02T03:04:05.000Z",
        status: "running",
      });
      expect(jobSnapshot(job as never)).toStrictEqual({
        kibiProtocol: 1,
        jobVersion: "kibi.job.v1",
        jobId,
        tool: "kb_check",
        status: "running",
        startedAt: "2026-01-02T03:04:05.000Z",
      });
    } finally {
      random.mockRestore();
    }
  });

  test("job ids count up in base 36 and keep eight random characters", () => {
    resetJobsForTests();
    const ids: string[] = [];
    for (let index = 0; index < 11; index++)
      ids.push(
        String(startJob("kb_x", () => new Promise(() => undefined)).jobId),
      );
    expect(ids[0]).toMatch(/^job-kb_x-1-[0-9a-z]{1,8}$/);
    expect(ids[10]).toMatch(/^job-kb_x-b-[0-9a-z]{1,8}$/);
    const random = spyOn(Math, "random").mockReturnValue(0.123456789123);
    try {
      const id = String(startJob("kb_x", async () => ({})).jobId);
      expect(id).toBe(
        `job-kb_x-c-${(0.123456789123).toString(36).slice(2, 10)}`,
      );
      expect(id.split("-").at(-1)).toHaveLength(8);
    } finally {
      random.mockRestore();
    }
    resetJobsForTests();
    expect(String(startJob("kb_x", async () => ({})).jobId)).toStartWith(
      "job-kb_x-1-",
    );
  });

  test("a succeeded job snapshot carries the finish time and result", async () => {
    resetJobsForTests();
    setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
    const receipt = startJob("kb_check", async () => {
      setSystemTime(new Date("2026-01-02T03:04:09.000Z"));
      return { count: 1 };
    });
    await settle();
    const job = getJob(String(receipt.jobId));
    expect(jobSnapshot(job as never)).toStrictEqual({
      kibiProtocol: 1,
      jobVersion: "kibi.job.v1",
      jobId: receipt.jobId,
      tool: "kb_check",
      status: "succeeded",
      startedAt: "2026-01-02T03:04:05.000Z",
      finishedAt: "2026-01-02T03:04:09.000Z",
      result: { count: 1 },
    });
  });

  test("null and primitive results are wrapped; arrays stay as they are", async () => {
    resetJobsForTests();
    const nullJob = startJob("kb_a", async () => null);
    const textJob = startJob("kb_b", async () => "done");
    const list = [1, 2];
    const listJob = startJob("kb_c", async () => list);
    await settle();
    expect(getJob(String(nullJob.jobId))?.result).toStrictEqual({
      value: null,
    });
    expect(getJob(String(textJob.jobId))?.result).toStrictEqual({
      value: "done",
    });
    expect(getJob(String(listJob.jobId))?.result).toBe(list as never);
  });

  test("a failed job records the finish time and the error text", async () => {
    resetJobsForTests();
    setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
    const thrown = startJob("kb_check", async () => {
      throw "plain failure";
    });
    await settle();
    const job = getJob(String(thrown.jobId));
    expect(jobSnapshot(job as never)).toStrictEqual({
      kibiProtocol: 1,
      jobVersion: "kibi.job.v1",
      jobId: thrown.jobId,
      tool: "kb_check",
      status: "failed",
      startedAt: "2026-01-02T03:04:05.000Z",
      finishedAt: "2026-01-02T03:04:05.000Z",
      error: "plain failure",
    });
  });

  test("a failure that cannot be described is reported on stderr instead of crashing", async () => {
    resetJobsForTests();
    const write = spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      const receipt = startJob("kb_check", async () => {
        throw Object.create(null);
      });
      await settle();
      expect(getJob(String(receipt.jobId))?.status).toBe("failed");
      expect(write).toHaveBeenCalledTimes(1);
      let reason = "";
      try {
        String(Object.create(null));
      } catch (error) {
        reason = (error as Error).message;
      }
      expect(reason).not.toBe("");
      expect(write.mock.calls[0]?.[0]).toBe(
        `[kibi-mcp] job bookkeeping error for ${receipt.jobId}: ${reason}\n`,
      );
    } finally {
      write.mockRestore();
    }
  });

  test("a non-Error bookkeeping failure is reported as text", async () => {
    resetJobsForTests();
    const write = spyOn(process.stderr, "write").mockImplementation(() => true);
    const original = Date.prototype.toISOString;
    let calls = 0;
    Date.prototype.toISOString = function (this: Date) {
      calls += 1;
      if (calls === 2) throw "clock broke";
      if (calls === 3) throw "clock broke again";
      return original.call(this);
    };
    try {
      const receipt = startJob("kb_check", async () => ({}));
      await settle();
      expect(write.mock.calls[0]?.[0]).toBe(
        `[kibi-mcp] job bookkeeping error for ${receipt.jobId}: clock broke again\n`,
      );
    } finally {
      Date.prototype.toISOString = original;
      write.mockRestore();
    }
  });

  test("eviction keeps 32 jobs, skips running ones and drops the oldest finished", async () => {
    resetJobsForTests();
    const running = String(
      startJob("kb_run", () => new Promise(() => undefined)).jobId,
    );
    const finished: string[] = [];
    for (let index = 0; index < 32; index++) {
      finished.push(String(startJob("kb_done", async () => ({})).jobId));
      await settle();
    }
    // 33 jobs: the running one survives, the oldest finished one goes.
    expect(getJob(running)?.status).toBe("running");
    expect(getJob(finished[0] as string)).toBeUndefined();
    for (const id of finished.slice(1))
      expect(getJob(id)?.status).toBe("succeeded");
  });

  test("exactly 32 jobs are all kept", async () => {
    resetJobsForTests();
    const ids: string[] = [];
    for (let index = 0; index < 32; index++) {
      ids.push(String(startJob("kb_done", async () => ({})).jobId));
      await settle();
    }
    for (const id of ids) expect(getJob(id)).toBeDefined();
  });
});
