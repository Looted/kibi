import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";

import { RESULT_BUDGET_CHARS } from "../../src/public/operations/result-budget.js";
import {
  type ParityWorkspace,
  createParityWorkspace,
  normalizeParityValue,
} from "./helpers.js";
import { compareResults, runCliJsonRoute, runMCPAdapter } from "./runner.js";

const REPOSITORY_ROOT = path.resolve(import.meta.dir, "../../../..");
const REQUIREMENTS = 120;

async function buildCli(): Promise<void> {
  const child = Bun.spawn(["bun", "run", "build:cli"], {
    cwd: REPOSITORY_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await child.exited;
  expect(exitCode, await new Response(child.stderr).text()).toBe(0);
}

/** Requirements whose full rows together pass the size budget several times. */
function requirementDocuments() {
  return Array.from({ length: REQUIREMENTS }, (_, index) => {
    const id = `REQ-BUDGET-${String(index).padStart(3, "0")}`;
    return {
      path: `.kb/requirements/${id}.md`,
      body: `---
id: ${id}
type: req
title: Budget requirement ${index} keeps a long statement
status: open
source: .kb/requirements/${id}.md
tags: [budget]
---

# Budget requirement ${index}

${"The result of this requirement is long enough to fill the budget. ".repeat(8)}
`,
    };
  });
}

type Envelope = {
  data?: {
    entities?: readonly { id?: string }[];
    count?: number;
    truncated?: boolean;
    truncation?: { returned?: number; nextOffset?: number; total?: number };
  };
  diagnostics?: readonly { code?: string }[];
  nextActions?: readonly { operation?: string; input?: { offset?: number } }[];
};

describe("a result cut to the size budget", () => {
  let workspace: ParityWorkspace;

  beforeAll(async () => {
    await buildCli();
    workspace = await createParityWorkspace(requirementDocuments());
  }, 120_000);

  afterAll(async () => {
    await workspace?.cleanup();
  });

  test("carries the same data over MCP and the CLI JSON route", async () => {
    const input = {
      type: "req",
      tags: ["budget"],
      fields: "full",
      limit: 100,
      offset: 0,
    };
    const [cli, mcp] = await Promise.all([
      runCliJsonRoute(workspace.root, "query", input),
      runMCPAdapter(workspace.root, "kb_query", input),
    ]);
    const comparison = compareResults(cli, mcp, (value) =>
      normalizeParityValue(value, [workspace.root]),
    );
    expect(comparison.parity, comparison.diff).toBe(true);
    expect(cli.exitCode).toBe(0);

    const envelope = JSON.parse(cli.stdout) as Envelope;
    const data = envelope.data ?? {};
    expect(JSON.stringify(data).length).toBeLessThanOrEqual(
      RESULT_BUDGET_CHARS,
    );
    expect(data.truncated).toBe(true);
    expect(data.count).toBe(REQUIREMENTS);
    const returned = data.entities?.length ?? 0;
    expect(returned).toBeGreaterThan(0);
    expect(returned).toBeLessThan(100);
    expect(data.truncation).toMatchObject({
      returned,
      total: REQUIREMENTS,
      nextOffset: returned,
    });
    expect(envelope.diagnostics?.map((d) => d.code)).toContain(
      "RESULT_TRUNCATED",
    );
    expect(
      envelope.nextActions?.find((action) => action.operation === "kb_query")
        ?.input?.offset,
    ).toBe(returned);
  }, 120_000);
});
