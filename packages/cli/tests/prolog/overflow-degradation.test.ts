import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  PrologProcess,
  PrologProcessTerminatedError,
} from "../../src/prolog.js";
import { runOperationJsonQuery } from "../../src/public/operations/prolog-json.js";
import type {
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";
import { perContractTestBindings } from "../../src/public/operations/specs/reporting.js";

// Regression coverage for Looted/kibi#285: an interactive Prolog session lost
// to an output overflow must never silently degrade into isolated one-shot
// processes (which lose the attached KB and every loaded module).

const processes: PrologProcess[] = [];
const roots: string[] = [];
const envRestores: Array<() => void> = [];

function setEnv(key: string, value: string | undefined): void {
  const previous = process.env[key];
  envRestores.push(() => {
    if (previous === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = previous;
  });
  if (value === undefined) Reflect.deleteProperty(process.env, key);
  else process.env[key] = value;
}

function tempKb(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-overflow-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  for (const prolog of processes.splice(0)) {
    await prolog.terminate().catch(() => undefined);
  }
  for (const restore of envRestores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const COVERAGE_GOAL =
  "discovery:coverage_report_json('req', [], false, true, 10, 0, unknown, '2026-09-26T00:00:00Z', 604800, JsonString)";

describe("PrologProcess after an output overflow", () => {
  test("fails loudly instead of falling back to one-shot execution", async () => {
    const prolog = new PrologProcess({
      oneShot: false,
      timeout: 30_000,
      maxOutputBytes: 64 * 1024,
    });
    processes.push(prolog);
    await prolog.start();
    expect(prolog.oneShotMode).toBe(false);
    const attached = await prolog.query(`kb_attach('${tempKb()}')`);
    expect(attached.success).toBe(true);

    const overflow = await prolog.query(
      "findall(X, between(1, 200000, X), Numbers)",
    );
    expect(overflow.success).toBe(false);
    expect(overflow.error).toContain("ENOBUFS");
    expect(prolog.needsRestart()).toBe(true);

    // A one-shot fallback would answer `true` from a fresh, unattached SWI.
    const next = prolog.query("kb_attached(Path)");
    await expect(next).rejects.toBeInstanceOf(PrologProcessTerminatedError);
    await expect(prolog.query("true")).rejects.toThrow(
      /no longer running \(output overflow \(ENOBUFS\)/,
    );
  }, 60_000);

  test("start() restores a usable interactive session", async () => {
    const prolog = new PrologProcess({
      oneShot: false,
      timeout: 30_000,
      maxOutputBytes: 64 * 1024,
    });
    processes.push(prolog);
    await prolog.start();
    await prolog.query("findall(X, between(1, 200000, X), Numbers)");
    expect(prolog.needsRestart()).toBe(true);
    await prolog.start();
    expect(prolog.needsRestart()).toBe(false);
    const result = await prolog.query("X = 1");
    expect(result).toMatchObject({ success: true, bindings: { X: "1" } });
  }, 60_000);
});

describe("PrologProcess after its child dies mid-write", () => {
  test("an asynchronous stdin EPIPE is contained instead of crashing the host", async () => {
    const prolog = new PrologProcess({ oneShot: false, timeout: 30_000 });
    processes.push(prolog);
    await prolog.start();
    const child = (
      prolog as unknown as {
        process: import("node:child_process").ChildProcess;
      }
    ).process;
    const epipe = Object.assign(new Error("write EPIPE"), { code: "EPIPE" });
    // Without a listener, emitting 'error' throws synchronously.
    expect(() => child.stdin?.emit("error", epipe)).not.toThrow();
    process.kill(child.pid ?? 0, "SIGKILL");
    const deadline = Date.now() + 5_000;
    while (prolog.isRunning() && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(prolog.needsRestart()).toBe(true);
    await expect(prolog.query("true")).rejects.toThrow(/stdin EPIPE/);
  }, 30_000);
});

describe("runOperationJsonQuery against isolated one-shot ports", () => {
  test("sends the combined goal so the module load and call share one process", async () => {
    // Production mode: no Bun one-shot heuristic; the port itself must
    // report that its queries do not share state.
    setEnv("NODE_ENV", "production");
    const prolog = new PrologProcess({ oneShot: true, timeout: 30_000 });
    processes.push(prolog);
    expect(prolog.oneShotMode).toBe(true);
    const attached = await prolog.query(`kb_attach('${tempKb()}')`);
    expect(attached.success).toBe(true);
    const goals: string[] = [];
    const query = prolog.query.bind(prolog);
    prolog.query = async (goal) => {
      goals.push(Array.isArray(goal) ? goal.join(", ") : goal);
      return query(goal);
    };
    const payload = await runOperationJsonQuery<{ rows: unknown[] }>(
      prolog as unknown as PrologPort,
      "discovery.pl",
      COVERAGE_GOAL,
      "Coverage execution",
    );
    expect(Array.isArray(payload.rows)).toBe(true);
    expect(goals).toHaveLength(1);
    expect(goals[0]).toContain("use_module(");
  }, 60_000);

  test("preserves an explicit interactive mode under the Bun test environment", async () => {
    setEnv("NODE_ENV", "test");
    const prolog = new PrologProcess({ oneShot: false, timeout: 30_000 });
    processes.push(prolog);
    await prolog.start();
    const attached = await prolog.query(`kb_attach('${tempKb()}')`);
    expect(attached.success).toBe(true);

    const goals: string[] = [];
    const query = prolog.query.bind(prolog);
    prolog.query = async (goal) => {
      goals.push(Array.isArray(goal) ? goal.join(", ") : goal);
      return query(goal);
    };
    const payload = await runOperationJsonQuery<{ rows: unknown[] }>(
      prolog as unknown as PrologPort,
      "discovery.pl",
      COVERAGE_GOAL,
      "Coverage execution",
    );

    expect(Array.isArray(payload.rows)).toBe(true);
    expect(goals).toHaveLength(2);
    expect(goals[0]).toContain("use_module(");
    expect(goals[1]).toContain("discovery:coverage_report_json");
    expect(goals[1]).not.toContain("use_module(");
  }, 60_000);

  test("retains the Bun test heuristic when one-shot mode is unspecified", async () => {
    setEnv("NODE_ENV", "test");
    const goals: string[] = [];
    const payload = await runOperationJsonQuery<{ rows: unknown[] }>(
      {
        query: async (goal: string) => {
          goals.push(goal);
          return {
            success: true,
            bindings: { JsonString: JSON.stringify({ rows: [] }) },
          };
        },
      } as unknown as PrologPort,
      "discovery.pl",
      COVERAGE_GOAL,
      "Coverage execution",
    );

    expect(payload.rows).toEqual([]);
    expect(goals).toHaveLength(1);
    expect(goals[0]).toContain("use_module(");
  });

  test("an unstarted non-engine port is treated as one-shot", async () => {
    setEnv("NODE_ENV", "production");
    const prolog = new PrologProcess({ oneShot: false, timeout: 30_000 });
    processes.push(prolog);
    expect(prolog.oneShotMode).toBe(true);
    const payload = await runOperationJsonQuery<{ rows: unknown[] }>(
      prolog as unknown as PrologPort,
      "discovery.pl",
      "discovery:coverage_report_json('req', [], false, true, 10, 0, JsonString)",
      "Coverage execution",
    ).catch((error: unknown) => error);
    // Without an attached KB the report may fail, but never because the
    // module load and the predicate call ran in different processes.
    expect(String(payload)).not.toMatch(
      /existence_error|Predicate or file not found/,
    );
  }, 60_000);
});

describe("perContractTestBindings", () => {
  function contextWith(prolog: Pick<PrologPort, "query">): OperationContext {
    return {
      workspaceRoot: tempKb(),
      signal: new AbortController().signal,
      clock: () => new Date("2026-09-26T00:00:00.000Z"),
      prolog: prolog as PrologPort,
    } as OperationContext;
  }

  test("propagates engine failures instead of silently returning null", async () => {
    setEnv("KIBI_PROOF_BINDING_MODE", undefined);
    const prolog = {
      query: async () => ({
        success: false,
        bindings: {},
        error:
          "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size",
      }),
    };
    await expect(perContractTestBindings(contextWith(prolog))).rejects.toThrow(
      /ENOBUFS/,
    );
  });

  test("reads the bounded contract projection, never full receipt histories", async () => {
    setEnv("KIBI_PROOF_BINDING_MODE", undefined);
    const goals: string[] = [];
    const prolog = {
      query: async (goal: string) => {
        goals.push(goal);
        return { success: true, bindings: { Results: "[]" } };
      },
    };
    expect(await perContractTestBindings(contextWith(prolog))).toBeNull();
    expect(goals).toEqual(["kb_query_proof_contracts(none,100,0,Results)"]);
  });

  test("returns null only when per-contract binding is not applicable", async () => {
    setEnv("KIBI_PROOF_BINDING_MODE", "strict-snapshot");
    const prolog = {
      query: async () => {
        throw new Error("must not query in strict-snapshot mode");
      },
    };
    expect(await perContractTestBindings(contextWith(prolog))).toBeNull();
  });
});
