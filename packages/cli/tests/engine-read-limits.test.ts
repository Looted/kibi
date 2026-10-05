import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ENGINE_READ_INFERENCE_LIMIT_ENV,
  ENGINE_READ_TIME_LIMIT_CAP_MS,
  ENGINE_READ_TIME_LIMIT_ENV,
  EngineQueryLimitError,
  type EngineQueryLimits,
  QUERY_LIMIT_EXCEEDED_CODE,
  normalizeQueryLimits,
  queryLimitExceededOf,
  queryLimitsFromEnv,
} from "../src/engine-limits.js";
import { EngineClient } from "../src/engine.js";
import { ensureBranchStoreManifest } from "../src/utils/branch-store-locator.js";

// A read that never finishes on its own: it occupies the single engine queue
// until something inside Prolog stops it.
const RUNAWAY_READ = "findall(X, (between(1, inf, X), fail), _)";

describe("engine read limits (configuration)", () => {
  test("accepts positive integer limits and caps time below the hard query timeout", () => {
    expect(normalizeQueryLimits({ timeMs: 250, inferences: 10 })).toEqual({
      timeMs: 250,
      inferences: 10,
    });
    expect(normalizeQueryLimits({ timeMs: 10_000_000 })).toEqual({
      timeMs: ENGINE_READ_TIME_LIMIT_CAP_MS,
    });
    expect(normalizeQueryLimits({ timeMs: 0, inferences: -5 })).toBeUndefined();
    expect(normalizeQueryLimits({ timeMs: 1.5 })).toBeUndefined();
    expect(normalizeQueryLimits("fast")).toBeUndefined();
  });

  test("reads opt-in limits from the environment and ignores junk", () => {
    expect(queryLimitsFromEnv({})).toBeUndefined();
    expect(
      queryLimitsFromEnv({
        [ENGINE_READ_TIME_LIMIT_ENV]: "1500",
        [ENGINE_READ_INFERENCE_LIMIT_ENV]: "not-a-number",
      }),
    ).toEqual({ timeMs: 1500 });
  });

  test("recognizes a limit hit even after an executor rewraps the message", () => {
    const typed = new EngineQueryLimitError({ kind: "time", limit: 300 });
    expect(typed.code).toBe(QUERY_LIMIT_EXCEEDED_CODE);
    expect(queryLimitExceededOf(typed)).toEqual({ kind: "time", limit: 300 });
    const rewrapped = new Error(`Query execution failed: ${typed.message}`);
    expect(queryLimitExceededOf(rewrapped)).toEqual({
      kind: "time",
      limit: 300,
    });
    expect(queryLimitExceededOf(new Error("Query failed"))).toBeNull();
    expect(queryLimitExceededOf("QUERY_LIMIT_EXCEEDED")).toBeNull();
  });
});

describe("engine read limits (daemon)", () => {
  const roots: string[] = [];
  const owners: EngineClient[] = [];
  const previousIdle = process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS;

  afterEach(async () => {
    for (const owner of owners.splice(0)) {
      try {
        await owner.stop(false);
      } finally {
        await owner.terminate();
      }
    }
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    if (previousIdle === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_ENGINE_IDLE_TIMEOUT_MS");
    } else {
      process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = previousIdle;
    }
  });

  async function startDaemon(): Promise<{
    root: string;
    client: (readLimits: EngineQueryLimits | null) => EngineClient;
  }> {
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "60000";
    const root = mkdtempSync(path.join(tmpdir(), "kibi-read-limits-"));
    roots.push(root);
    ensureBranchStoreManifest(root, "main");
    // Start the Node daemon used by CLI/MCP, so this exercises real queue
    // limits without hosting an interactive Prolog process inside Bun.
    const owner = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 20_000,
      readLimits: null,
    });
    owners.push(owner);
    await owner.start();
    return {
      root,
      client: (readLimits) =>
        new EngineClient({
          workspaceRoot: root,
          branch: "main",
          timeout: 20_000,
          readLimits,
        }),
    };
  }

  test("a runaway read stops at its time limit and frees the queue for the next client", async () => {
    const { client } = await startDaemon();
    const bounded = client({ timeMs: 300 });
    const unbounded = client(null);
    try {
      await bounded.start(false);
      await unbounded.start(false);
      const startedAt = Date.now();
      const runaway = bounded.query(RUNAWAY_READ);
      // Queued behind the runaway read on the single engine queue.
      const next = unbounded.queryEntities({ limit: 1, offset: 0 });

      const failure = await runaway.then(
        () => null,
        (error: unknown) => error,
      );
      expect(failure).toBeInstanceOf(EngineQueryLimitError);
      expect((failure as EngineQueryLimitError).limitExceeded).toEqual({
        kind: "time",
        limit: 300,
      });
      expect((failure as Error).message).toContain(ENGINE_READ_TIME_LIMIT_ENV);
      await expect(next).resolves.toEqual({ entities: [], count: 0 });
      // Without the limit the queue stays blocked until the 120 s hard
      // timeout kills the Prolog session.
      expect(Date.now() - startedAt).toBeLessThan(15_000);

      // The session survived: it still answers, bounded or not.
      expect(
        (await bounded.query("findall(X, between(1, 3, X), Xs)")).bindings,
      ).toEqual({ Xs: "[1,2,3]" });
      expect((await unbounded.query("true")).success).toBe(true);
      await unbounded.stop(false);
    } finally {
      await bounded.terminate();
      await unbounded.terminate();
    }
  }, 60_000);

  test("an inference limit stops a read but never a write", async () => {
    const { client } = await startDaemon();
    const bounded = client({ inferences: 1_000 });
    const unbounded = client(null);
    try {
      await bounded.start(false);
      await unbounded.start(false);
      const goal = "findall(X, between(1, 100000, X), Xs), length(Xs, N)";
      await expect(bounded.query(goal)).rejects.toMatchObject({
        code: QUERY_LIMIT_EXCEEDED_CODE,
        limitExceeded: { kind: "inferences", limit: 1_000 },
      });
      const full = await unbounded.query(goal);
      expect(full.success).toBe(true);
      expect(full.bindings.N).toBe("100000");

      // Writes run to completion whatever limits the client carries.
      const written = await bounded.query(
        `kb_assert_entity(req, [id='REQ-LIMITED-WRITE', title="Limited write", status=active, created_at="2026-10-03T00:00:00Z", updated_at="2026-10-03T00:00:00Z", source="docs/limited.md"])`,
      );
      expect(written.success).toBe(true);
      const stored = await unbounded.queryEntities({
        id: "REQ-LIMITED-WRITE",
        limit: 1,
        offset: 0,
      });
      expect(stored.count).toBe(1);
      await unbounded.stop(false);
    } finally {
      await bounded.terminate();
      await unbounded.terminate();
    }
  }, 60_000);
});
