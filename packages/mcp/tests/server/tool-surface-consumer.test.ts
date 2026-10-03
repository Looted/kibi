// implements REQ-kibi-mcp-tool-consolidation
import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { isolatedMcpSandboxEnv } from "../helpers/isolated-env.js";

/**
 * Consumer view of the consolidated MCP surface: the shipped kibi-mcp binary
 * is started over stdio in a fresh `kibi init` workspace and driven by a
 * standard MCP client, exactly as a host would.
 */

const REPO_ROOT = path.resolve(import.meta.dir, "../../../..");
const KIBI_CLI = path.join(REPO_ROOT, "packages/cli/bin/kibi");
const KIBI_MCP = path.join(REPO_ROOT, "packages/mcp/bin/kibi-mcp");

const AGENT_FACING_TOOLS = [
  "kb_query",
  "kb_search",
  "kb_status",
  "kb_skills",
  "kb_find_gaps",
  "kb_coverage",
  "kb_graph",
  "kb_model",
  "kb_upsert",
  "kb_delete",
  "kb_check",
  "kb_prepare_impact_review",
  "kb_plan_bootstrap",
  "kb_compile_intent",
  "kb_apply_plan",
  "kb_ingest_proof",
];

type Json = Record<string, unknown>;

const workspaces: string[] = [];
const clients: Client[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) await client.close();
  for (const dir of workspaces.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function sandboxEnv(
  extra: Record<string, string> = {},
): Record<string, string> {
  const env = isolatedMcpSandboxEnv(extra);
  for (const key of Object.keys(env)) {
    if (
      key.startsWith("KIBI_PROOF_") ||
      key === "KIBI_WORKSPACE" ||
      key === "KIBI_PROJECT_ROOT" ||
      key === "KIBI_ROOT" ||
      key === "KIBI_DIAGNOSTIC_MODE" ||
      (key === "KIBI_MCP_OPTIONAL_TOOLS" && extra[key] === undefined)
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

function kibi(cwd: string, args: string[], input?: Json): Json {
  const stdout = execFileSync(
    "node",
    [KIBI_CLI, ...args, ...(input ? ["--input", "-"] : [])],
    {
      cwd,
      env: sandboxEnv(),
      encoding: "utf8",
      input: input ? `${JSON.stringify(input)}\n` : undefined,
      timeout: 120_000,
    },
  );
  return JSON.parse(stdout) as Json;
}

function initWorkspace(): string {
  const dir = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-surface-")),
  );
  workspaces.push(dir);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: dir, env: sandboxEnv(), stdio: "pipe" });
  git("init", "-q", "-b", "main");
  execFileSync("node", [KIBI_CLI, "init"], {
    cwd: dir,
    env: sandboxEnv(),
    stdio: "pipe",
    timeout: 120_000,
  });
  execFileSync("node", [KIBI_CLI, "sync"], {
    cwd: dir,
    env: sandboxEnv(),
    stdio: "pipe",
    timeout: 120_000,
  });
  return dir;
}

async function connect(cwd: string, extra: Record<string, string> = {}) {
  const client = new Client({ name: "kibi-consumer", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: "node",
      args: [KIBI_MCP],
      cwd,
      env: sandboxEnv(extra),
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

function requirementFiles(workspace: string): string[] {
  const dir = path.join(workspace, ".kb", "requirements");
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}

describe("kibi-mcp consolidated tool surface", () => {
  test("lists 16 tools, routes composites to the CLI operation payload, and dry-run upserts write nothing", async () => {
    const workspace = initWorkspace();
    const client = await connect(workspace);

    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);
    expect(names).toEqual(AGENT_FACING_TOOLS);
    expect(names).not.toContain("kb_sparql_remote");
    expect(names).not.toContain("kb_job_status");

    // Composite kb_skills returns the routed kb_skills_list payload plus
    // the selector; the narrower operation stays on the CLI.
    const skills = await call(client, "kb_skills", { action: "list" });
    const cliSkills = kibi(workspace, ["skills-list"], {});
    expect(skills).toEqual({
      action: "list",
      ...(cliSkills.data as Json),
    });

    // Composite kb_model mode:analyze returns the semantic advisor receipt.
    const text = "Every client call must carry an API key.";
    const model = await call(client, "kb_model", { mode: "analyze", text });
    const cliAdvisor = kibi(workspace, ["semantic-advisor"], { text });
    expect(model).toEqual({ mode: "analyze", ...(cliAdvisor.data as Json) });

    // kb_upsert with dryRun validates and writes nothing.
    const before = requirementFiles(workspace);
    const dryRun = await call(client, "kb_upsert", {
      dryRun: true,
      type: "req",
      id: "REQ-consumer-dry-run",
      properties: {
        title: "Consumer dry run",
        status: "open",
        priority: "should",
      },
    });
    expect(dryRun.dryRun).toBe(true);
    expect(dryRun.skippedEffects).toEqual(["kb-write", "workspace-write"]);
    expect(requirementFiles(workspace)).toEqual(before);
    const query = await call(client, "kb_query", {
      id: "REQ-consumer-dry-run",
    });
    expect(query.entities).toEqual([]);
  }, 180_000);

  test("registers optional tools only when KIBI_MCP_OPTIONAL_TOOLS names them", async () => {
    const workspace = initWorkspace();
    const jobOnly = await connect(workspace, {
      KIBI_MCP_OPTIONAL_TOOLS: "kb_job_status",
    });
    const jobNames = (await jobOnly.listTools()).tools.map((t) => t.name);
    expect(jobNames).toEqual([...AGENT_FACING_TOOLS, "kb_job_status"]);

    const all = await connect(workspace, { KIBI_MCP_OPTIONAL_TOOLS: "all" });
    const allNames = (await all.listTools()).tools.map((t) => t.name);
    expect(allNames.sort()).toEqual(
      [...AGENT_FACING_TOOLS, "kb_job_status", "kb_sparql_remote"].sort(),
    );
  }, 180_000);
});
