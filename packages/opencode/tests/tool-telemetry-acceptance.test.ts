/// <reference types="bun-types" />
// implements REQ-claude-hook-usage-telemetry-v2, REQ-kibi-telemetry-acceptance-gate-v2
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import kibiOpencodePlugin from "../src/index";

/**
 * End to end: the OpenCode plugin's `tool.execute.after` hook writes the
 * opt-in usage rows, and the built `kibi usage-metrics` reads exactly those
 * rows for the lookup_before_first_edit acceptance metric. No row is a
 * fixture.
 */

const KIBI_CLI = path.resolve(import.meta.dir, "../../cli/bin/kibi");
const LOG = ".kb/usage.log";
const REQUIREMENT = "REQ-checkout-total";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    runKibi(root, ["engine", "stop"]);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/** Host Kibi identity, paths and telemetry opt-ins never reach the sandbox. */
function sandboxEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("KIBI_") || key === "KB_PATH") {
      Reflect.deleteProperty(env, key);
    }
  }
  return { ...env, ...overrides };
}

function runKibi(
  root: string,
  args: readonly string[],
  options: Readonly<{ input?: string; env?: NodeJS.ProcessEnv }> = {},
) {
  return spawnSync(KIBI_CLI, args, {
    cwd: root,
    encoding: "utf8",
    input: options.input,
    env: sandboxEnv(options.env),
    timeout: 120_000,
  });
}

function git(root: string, ...args: string[]): void {
  const result = spawnSync(
    "git",
    [
      "-c",
      "user.email=consumer@example.com",
      "-c",
      "user.name=Kibi Consumer",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      ...args,
    ],
    { cwd: root, encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
}

function write(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function usageLines(root: string): string[] {
  const logPath = path.join(root, LOG);
  if (!fs.existsSync(logPath)) return [];
  return fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
}

/**
 * A synced Kibi workspace whose checkout code implements a requirement, with
 * one real diagnostic-mode Kibi operation row in its usage log.
 */
function kibiWorkspace(): string {
  const root = fs.realpathSync.native(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-telemetry-")),
  );
  roots.push(root);
  git(root, "init", "-q", "-b", "main");
  git(root, "commit", "-q", "--allow-empty", "-m", "init");
  const init = runKibi(root, ["init", "--no-hooks"]);
  expect(init.status, `${init.stdout}\n${init.stderr}`).toBe(0);
  write(
    root,
    `.kb/requirements/${REQUIREMENT}.md`,
    [
      "---",
      `id: ${REQUIREMENT}`,
      "title: Checkout totals round to cents",
      "type: req",
      "status: open",
      "---",
      "Checkout totals round to cents.",
      "",
    ].join("\n"),
  );
  write(
    root,
    "src/checkout.ts",
    "export function computeTotal(cents: number): number {\n  return Math.round(cents);\n}\n",
  );
  write(
    root,
    ".kb/symbols.yaml",
    [
      "symbols:",
      "  - id: SYM-computeTotal",
      "    title: computeTotal",
      "    sourceFile: src/checkout.ts",
      "    relationships:",
      "      - type: implements",
      `        target: ${REQUIREMENT}`,
      "",
    ].join("\n"),
  );
  git(root, "add", "--all");
  const sync = runKibi(root, ["sync"]);
  expect(sync.status, `${sync.stdout}\n${sync.stderr}`).toBe(0);
  const search = runKibi(root, ["search", "--input", "-"], {
    input: JSON.stringify({ query: "checkout total" }),
    env: { KIBI_CLI_DIAGNOSTIC_MODE: "1" },
  });
  expect(search.status, search.stderr).toBe(0);
  expect(usageLines(root).map((line) => JSON.parse(line).tool)).toEqual([
    "kb_search",
  ]);
  return root;
}

type ToolCall = Readonly<{
  tool: string;
  sessionID: string;
  args: Record<string, unknown>;
}>;

/** Load the plugin for the workspace and replay tool calls through its hook. */
async function replay(
  root: string,
  calls: readonly ToolCall[],
  diagnosticMode: string | undefined,
): Promise<void> {
  const previous = process.env.KIBI_DIAGNOSTIC_MODE;
  if (diagnosticMode === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_DIAGNOSTIC_MODE");
  } else {
    process.env.KIBI_DIAGNOSTIC_MODE = diagnosticMode;
  }
  try {
    const hooks = await kibiOpencodePlugin({
      directory: root,
      worktree: root,
      client: { app: { log: async () => {} } },
    });
    const afterTool = hooks["tool.execute.after"];
    if (afterTool === undefined) {
      throw new Error("the plugin registers no tool.execute.after hook");
    }
    for (const call of calls) await afterTool(call);
  } finally {
    if (previous === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_DIAGNOSTIC_MODE");
    } else {
      process.env.KIBI_DIAGNOSTIC_MODE = previous;
    }
  }
}

function sessionCalls(root: string): ToolCall[] {
  const checkout = path.join(root, "src/checkout.ts");
  return [
    // One session looks the change up, then edits linked code.
    {
      tool: "kibi_kb_search",
      sessionID: "ses-lookup-first",
      args: { query: "checkout rounding" },
    },
    {
      tool: "edit",
      sessionID: "ses-lookup-first",
      args: { filePath: checkout },
    },
    // The other edits linked code first and only then queries.
    {
      tool: "write",
      sessionID: "ses-edit-first",
      args: { filePath: checkout },
    },
    {
      tool: "kibi_kb_query",
      sessionID: "ses-edit-first",
      args: { sourceFile: "src/checkout.ts" },
    },
  ];
}

type Metric = Readonly<{
  id: string;
  status: string;
  numerator: number;
  denominator: number;
  message: string;
  evidence?: { unguidedEditPaths?: string[] };
}>;

describe("OpenCode tool telemetry through kibi usage-metrics (end to end)", () => {
  test("the plugin's tool hook logs lookups and requirement-linked edits, and the acceptance metric reads only those rows for lookup before first edit", async () => {
    const root = kibiWorkspace();
    const [operation] = usageLines(root);

    await replay(root, sessionCalls(root), "1");

    const lines = usageLines(root);
    expect(lines[0]).toBe(operation);
    const hookRows = lines
      .slice(1)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(
      hookRows.map((row) => [
        row.session_id,
        row.hook_action,
        row.kb_operation,
        row.path,
        row.requirement_ids,
      ]),
    ).toEqual([
      ["ses-lookup-first", "kb_usage", "kb_search", null, []],
      ["ses-lookup-first", "edited", null, "src/checkout.ts", [REQUIREMENT]],
      ["ses-edit-first", "edited", null, "src/checkout.ts", [REQUIREMENT]],
      ["ses-edit-first", "kb_usage", "kb_query", null, []],
    ]);
    for (const row of hookRows) {
      expect(row).toMatchObject({
        interface: "hook",
        host: "opencode",
        hook_event: "tool.execute.after",
        workspace_root: root,
      });
    }

    const run = runKibi(root, ["usage-metrics", "--format", "json"]);
    expect(run.status, run.stderr).toBe(0);
    const report = JSON.parse(run.stdout) as {
      rowCount: number;
      acceptance: { metrics: Metric[] };
    };
    // Hook rows are not Kibi operations: only the CLI search row counts.
    expect(report.rowCount).toBe(1);
    expect(
      report.acceptance.metrics.find(
        (metric) => metric.id === "lookup_before_first_edit",
      ),
    ).toMatchObject({
      status: "failed",
      numerator: 1,
      denominator: 2,
      message:
        "1/2 sessions ran kb_search or kb_query before their first edit of a requirement-linked file.",
      evidence: { unguidedEditPaths: ["src/checkout.ts"] },
    });
  }, 300_000);

  test("without KIBI_DIAGNOSTIC_MODE the plugin's tool hook writes no row", async () => {
    const root = kibiWorkspace();
    const before = usageLines(root);

    await replay(root, sessionCalls(root), undefined);

    expect(usageLines(root)).toEqual(before);
  }, 300_000);
});
