// implements REQ-cli-status-pre-first-sync
import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { isolatedMcpSandboxEnv } from "../helpers/isolated-env.js";

/**
 * The MCP twin of packages/cli/tests/consumer/fresh-branch-store.test.ts.
 * A branch created without the post-checkout hook has no store. Before the
 * fix kb_check over MCP dropped the runtime's branch attachment, so it
 * reported one source-relationship-parity violation per authored
 * relationship instead of one branch-store-not-compiled, and kb_status
 * reported syncState "unknown" for the missing store.
 */

const REPO_ROOT = path.resolve(import.meta.dir, "../../../..");
const KIBI_CLI = path.join(REPO_ROOT, "packages/cli/bin/kibi");
const KIBI_MCP = path.join(REPO_ROOT, "packages/mcp/bin/kibi-mcp");

type Json = Record<string, unknown>;
type PlanAction = { id: string; code: string };
type MigrationPlan = Json & { planHash: string; actions: PlanAction[] };

const workspaces: string[] = [];
const clients: Client[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) await client.close();
  for (const dir of workspaces.splice(0)) {
    try {
      execFileSync("node", [KIBI_CLI, "engine", "stop"], {
        cwd: dir,
        env: sandboxEnv(),
        stdio: "pipe",
        timeout: 60_000,
      });
    } catch {
      // Best effort: the temp tree is removed regardless.
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

function sandboxEnv(): Record<string, string> {
  const env = isolatedMcpSandboxEnv();
  for (const key of Object.keys(env)) {
    if (
      key.startsWith("KIBI_PROOF_") ||
      key === "KIBI_WORKSPACE" ||
      key === "KIBI_PROJECT_ROOT" ||
      key === "KIBI_ROOT" ||
      key === "KIBI_DIAGNOSTIC_MODE" ||
      key === "KIBI_MCP_OPTIONAL_TOOLS"
    ) {
      Reflect.deleteProperty(env, key);
    }
  }
  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function write(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function doc(frontMatter: string, body: string): string {
  return `---\n${frontMatter.trim()}\n---\n${body}\n`;
}

/** A committed main branch with a linked requirement, then a hook-less feature branch. */
function freshBranchWorkspace(): string {
  const dir = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-fresh-branch-")),
  );
  workspaces.push(dir);
  const run = (command: string, args: string[]) =>
    execFileSync(command, args, {
      cwd: dir,
      env: sandboxEnv(),
      stdio: "pipe",
      timeout: 120_000,
    });
  // No hooks run (core.hooksPath=/dev/null): nothing compiles the branch.
  const git = (...args: string[]) =>
    run("git", [
      "-c",
      "user.email=consumer@example.com",
      "-c",
      "user.name=Kibi Consumer",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      ...args,
    ]);
  git("init", "-q", "-b", "main");
  run("node", [KIBI_CLI, "init"]);
  write(
    dir,
    ".kb/scenarios/SCEN-demo-login.md",
    doc(
      "id: SCEN-demo-login\ntitle: User logs in\nstatus: active",
      "## Context\n\nA user signs in with a password.\n",
    ),
  );
  write(
    dir,
    ".kb/requirements/REQ-demo-login.md",
    doc(
      "id: REQ-demo-login\ntitle: Users can log in\nstatus: open\nlinks:\n  - type: specified_by\n    target: SCEN-demo-login",
      "## Context\n\nUsers must be able to log in.\n",
    ),
  );
  git("add", ".kb");
  run("node", [KIBI_CLI, "sync"]);
  git("add", "-A");
  git("commit", "-qm", "kb");
  git("checkout", "-q", "-b", "feature/login");
  return dir;
}

async function connect(cwd: string): Promise<Client> {
  const client = new Client({ name: "kibi-consumer", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: "node",
      args: [KIBI_MCP],
      cwd,
      env: sandboxEnv(),
      stderr: "pipe",
    }),
  );
  clients.push(client);
  return client;
}

async function call(client: Client, name: string, args: Json): Promise<Json> {
  const result = await client.callTool({ name, arguments: args });
  expect(result.isError ?? false).toBe(false);
  const envelope = result.structuredContent as Json;
  return (envelope.data ?? envelope) as Json;
}

type StatusData = {
  syncState: string;
  staleReasons: Array<{ code: string }>;
  migrationPlan: MigrationPlan;
};
type CheckData = { violations: Array<{ rule: string; suggestion: string }> };

describe("kibi-mcp on a new branch whose store was never compiled", () => {
  test("kb_status is stale, kb_check reports one branch-store-not-compiled, and kb_apply_plan compiles the store", async () => {
    const workspace = freshBranchWorkspace();
    const client = await connect(workspace);

    const before = (await call(client, "kb_status", {})) as StatusData;
    expect(before.staleReasons.map((row) => row.code)).toContain(
      "branch_store_not_compiled",
    );
    expect(before.syncState).toBe("stale");

    const check = (await call(client, "kb_check", {})) as CheckData;
    expect(check.violations.map((violation) => violation.rule)).toEqual([
      "branch-store-not-compiled",
    ]);
    expect(check.violations[0]?.suggestion).toContain("Run kibi sync");

    const plan = ((await call(client, "kb_status", {})) as StatusData)
      .migrationPlan;
    const actionIds = plan.actions
      .filter((action) => action.id.startsWith("branch-store-"))
      .map((action) => action.id);
    expect(actionIds).toContain("branch-store-compile");
    const applied = await call(client, "kb_apply_plan", {
      plan,
      approvedPlanHash: plan.planHash,
      approvedActionIds: actionIds,
    });
    expect(applied.outcome).toBe("applied");

    const after = (await call(client, "kb_check", {})) as CheckData;
    expect(after.violations.map((violation) => violation.rule)).not.toContain(
      "branch-store-not-compiled",
    );
    expect(
      ((await call(client, "kb_status", {})) as StatusData).staleReasons.map(
        (row) => row.code,
      ),
    ).not.toContain("branch_store_not_compiled");

    // kb_search also receives the attachment: its answer names the branch.
    const search = (await call(client, "kb_search", {
      query: "Can users log in?",
    })) as { answer?: { scope?: { branch: string | null } } };
    expect(search.answer?.scope?.branch).toBe("feature/login");
  }, 240_000);
});
