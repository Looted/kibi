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
 * kb_check changed:true over MCP with a staged-file diagnostic in the gate's
 * answer. The gate names such a diagnostic by id and path; the envelope's
 * diagnostic schema allows neither, so the result must carry them as code
 * and file, with the gate's other fields (blocks among them) under detail,
 * instead of failing the tool's output schema.
 */

const REPO_ROOT = path.resolve(import.meta.dir, "../../../..");
const KIBI_CLI = path.join(REPO_ROOT, "packages/cli/bin/kibi");
const KIBI_MCP = path.join(REPO_ROOT, "packages/mcp/bin/kibi-mcp");

type Json = Record<string, unknown>;

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

/** A committed, initialized repository with one new, unowned text file. */
function workspaceWithUnownedTextFile(): string {
  const dir = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-changed-diagnostics-")),
  );
  workspaces.push(dir);
  const run = (command: string, args: string[]) =>
    execFileSync(command, args, {
      cwd: dir,
      env: sandboxEnv(),
      stdio: "pipe",
      timeout: 120_000,
    });
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
  git("add", "-A");
  git("commit", "-qm", "init");
  mkdirSync(path.join(dir, "src"), { recursive: true });
  writeFileSync(path.join(dir, "src/notes.txt"), "hello\n");
  return dir;
}

describe("kb_check changed:true over MCP", () => {
  test("returns a staged-file diagnostic in the envelope's diagnostic shape", async () => {
    const workspace = workspaceWithUnownedTextFile();
    const client = new Client({ name: "kibi-consumer", version: "1.0.0" });
    await client.connect(
      new StdioClientTransport({
        command: "node",
        args: [KIBI_MCP],
        cwd: workspace,
        env: sandboxEnv(),
        stderr: "pipe",
      }),
    );
    clients.push(client);

    const result = await client.callTool({
      name: "kb_check",
      arguments: { changed: true, sourceFiles: ["src/notes.txt"] },
    });
    expect(result.isError ?? false).toBe(false);
    const envelope = result.structuredContent as Json & {
      status: string;
      diagnostics: Json[];
    };
    expect(envelope.status).toBe("success");
    const ownership = envelope.diagnostics.find(
      (row) => row.code === "staged_file_ownership_missing",
    );
    expect(ownership).toBeDefined();
    expect(ownership).toMatchObject({
      severity: "warning",
      file: "src/notes.txt",
      detail: { blocking: false, blocks: "none" },
    });
    expect(ownership).not.toHaveProperty("id");
    expect(ownership).not.toHaveProperty("path");
  }, 240_000);
});
