import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";

import {
  type ParityWorkspace,
  createParityWorkspace,
  normalizeParityValue,
} from "./helpers.js";
import { compareResults, runCliJsonRoute, runMCPAdapter } from "./runner.js";

const REPOSITORY_ROOT = path.resolve(import.meta.dir, "../../../..");

async function buildCli(): Promise<void> {
  const child = Bun.spawn(["bun", "run", "build:cli"], {
    cwd: REPOSITORY_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await child.exited;
  expect(exitCode, await new Response(child.stderr).text()).toBe(0);
}

type Envelope = {
  data?: { notes?: readonly string[]; count?: number };
  nextActions?: readonly {
    operation?: string;
    input?: unknown;
    required?: boolean;
  }[];
};

describe("the next steps of a kb_search answer", () => {
  let workspace: ParityWorkspace;

  beforeAll(async () => {
    await buildCli();
    workspace = await createParityWorkspace();
  }, 120_000);

  afterAll(async () => {
    await workspace?.cleanup();
  });

  async function both(input: Record<string, unknown>) {
    const [cli, mcp] = await Promise.all([
      runCliJsonRoute(workspace.root, "search", input),
      runMCPAdapter(workspace.root, "kb_search", input),
    ]);
    const comparison = compareResults(cli, mcp, (value) =>
      normalizeParityValue(value, [workspace.root]),
    );
    expect(comparison.parity, comparison.diff).toBe(true);
    expect(cli.exitCode).toBe(0);
    return JSON.parse(cli.stdout) as Envelope;
  }

  test("an abstained search names the title listing and carries the note over MCP and the CLI JSON route", async () => {
    const envelope = await both({
      query: "zzqxv wibblefrotz plonk",
      hints: false,
    });
    expect(envelope.data?.count).toBe(0);
    expect(envelope.data).not.toHaveProperty("nextActions");
    expect(envelope.data?.notes).toHaveLength(1);
    expect(envelope.nextActions as unknown).toStrictEqual([
      {
        operation: "kb_query",
        input: { type: "req" },
        reason: expect.stringContaining(
          "not evidence that nothing is recorded",
        ),
        required: false,
      },
    ]);
  }, 120_000);

  test("a question about contradictions names the check over both routes", async () => {
    const envelope = await both({
      query: "do any requirements contradict each other",
      hints: false,
    });
    expect(
      envelope.nextActions?.find((action) => action.operation === "kb_check"),
    ).toMatchObject({
      input: { rules: ["domain-contradictions"] },
      required: false,
    });
  }, 120_000);
});
