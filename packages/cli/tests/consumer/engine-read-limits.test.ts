// implements REQ-core-engine-read-limits
import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { isolatedCliSandboxEnv } from "../helpers/isolated-env.js";
import {
  type CliRun,
  type ConsumerWorkspace,
  type Json,
  KIBI_CLI,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Consumer view of opt-in engine read limits: a read run with
 * KIBI_ENGINE_READ_INFERENCE_LIMIT stops at that limit with the structured
 * QUERY_LIMIT_EXCEEDED outcome instead of an answer, and the same engine
 * keeps serving every other client.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const LIMIT_ENV = "KIBI_ENGINE_READ_INFERENCE_LIMIT";
const REQUIREMENTS = 12;

function seed(ws: ConsumerWorkspace): void {
  for (let index = 0; index < REQUIREMENTS; index++) {
    const id = `REQ-checkout-limit-${String(index).padStart(2, "0")}`;
    ws.write(
      `.kb/requirements/${id}.md`,
      doc(
        `
id: ${id}
title: Checkout rule ${index} for cart totals
type: req
status: open
`,
        `Checkout rule ${index} for cart totals.`,
      ),
    );
  }
  ws.sync();
}

function parse(run: CliRun): Json {
  return JSON.parse(run.stdout) as Json;
}

/** The PID of the workspace engine that `kibi engine status` reports. */
function enginePid(ws: ConsumerWorkspace): number {
  const status = JSON.parse(ws.kibi(["engine", "status"]).stdout) as {
    pid: number;
    running: boolean;
  };
  expect(status.running).toBe(true);
  expect(status.pid).toBeGreaterThan(0);
  return status.pid;
}

function expectLimitExceeded(run: CliRun, operation: string): void {
  expect(run.status).toBe(1);
  const envelope = parse(run);
  expect(envelope).toMatchObject({
    operation,
    status: "error",
    data: null,
    effects: [
      { kind: "kb-read", status: "failed", errorCode: "QUERY_LIMIT_EXCEEDED" },
    ],
    error: {
      code: "QUERY_LIMIT_EXCEEDED",
      retryable: false,
      details: { limitExceeded: { kind: "inferences", limit: 1 } },
    },
  });
  const message = (envelope.error as { message: string }).message;
  expect(message).toContain(
    `read stopped at its inference limit of 1 (${LIMIT_ENV}) before computing an answer`,
  );
  expect(run.stderr).toContain("QUERY_LIMIT_EXCEEDED");
}

/** Spawn the CLI without waiting, so two clients share the engine queue. */
function spawnKibi(
  root: string,
  args: readonly string[],
  input: Json,
  env: NodeJS.ProcessEnv = {},
): Promise<CliRun> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [KIBI_CLI, ...args, "--input", "-"], {
      cwd: root,
      env: isolatedCliSandboxEnv(env),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, stdout, stderr }));
    child.stdin.end(`${JSON.stringify(input)}\n`);
  });
}

describe("engine read limits through the kibi CLI", () => {
  test("a read over its configured limit fails with QUERY_LIMIT_EXCEEDED and the engine keeps serving the next client", async () => {
    const ws = createConsumerWorkspace("kibi-read-limits-");
    workspace = ws;
    seed(ws);

    const everything = { type: "req", limit: 100 };
    const unbounded = ws.json(["query"], everything);
    expect(unbounded.status).toBe("success");
    expect((unbounded.data as Json).count).toBe(REQUIREMENTS);
    const pid = enginePid(ws);

    // A bounded client: its query and search stop at the limit and return
    // no partial answer.
    const limited = { [LIMIT_ENV]: "1" };
    expectLimitExceeded(
      ws.kibi(["query"], { input: everything, env: limited }),
      "kb_query",
    );
    expectLimitExceeded(
      ws.kibi(["search"], {
        input: { query: "checkout cart totals" },
        env: limited,
      }),
      "kb_search",
    );

    // The next client is served in full by the same engine process.
    expect(ws.json(["query"], everything)).toEqual(unbounded);
    expect(enginePid(ws)).toBe(pid);

    // Queued together on the one engine, the bounded read stops at its
    // limit and the unbounded read still gets its whole answer.
    const [stopped, served] = await Promise.all([
      spawnKibi(ws.root, ["query"], everything, limited),
      spawnKibi(ws.root, ["query"], everything),
    ]);
    expectLimitExceeded(stopped, "kb_query");
    expect(served.status).toBe(0);
    expect(parse(served)).toEqual(unbounded);
    expect(enginePid(ws)).toBe(pid);

    // A limit the read fits in returns the same complete answer, and the
    // limits stay opt-in: a value that is not a positive integer bounds
    // nothing.
    expect(
      ws.json(["query"], everything, { [LIMIT_ENV]: "100000000" }),
    ).toEqual(unbounded);
    expect(ws.json(["query"], everything, { [LIMIT_ENV]: "0" })).toEqual(
      unbounded,
    );
    expect(enginePid(ws)).toBe(pid);
  }, 300_000);
});
