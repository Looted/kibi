import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  isolatedPackedSandboxEnv,
  packAll,
  run,
} from "./helpers.js";

type McpServerConfig = {
  command?: string;
  args?: string[];
  cwd?: string;
  enabled?: boolean;
  startup_timeout_sec?: number;
  tool_timeout_sec?: number;
  default_tools_approval_mode?: string;
};

type CodexMcpConfig = {
  mcpServers?: Record<string, McpServerConfig>;
};

/**
 * Drive the packed launcher exactly like the Codex host does: spawn
 * `node -e <inline source>` from the session workspace, write JSON-RPC lines
 * to stdin, and collect the responses until the process exits.
 */
function runLauncherMcp(
  inlineSource: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  requests: unknown[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", inlineSource], {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString("utf8");
    });
    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString("utf8");
    });
    child.on("error", reject);
    for (const request of requests) {
      child.stdin?.write(`${JSON.stringify(request)}\n`);
    }
    child.stdin?.end();
    child.on("close", (code) => {
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
  });
}

describe("packed Codex plugin workspace opt-in", { concurrency: false }, () => {
  let tarballs: Tarballs;
  const tempRoots: string[] = [];
  let pluginRoot: string;
  let inlineLauncherSource: string;

  before(async () => {
    tarballs = await packAll();
    const fixtureRoot = mkdtempSync(join(tmpdir(), "kibi-codex-packed-"));
    tempRoots.push(fixtureRoot);
    pluginRoot = join(fixtureRoot, "plugin-cache", "kibi-codex");
    mkdirSync(pluginRoot, { recursive: true });
    const extracted = await run(
      "tar",
      ["-xzf", tarballs.codex, "--strip-components=1", "-C", pluginRoot],
      { cwd: pluginRoot, env: isolatedPackedSandboxEnv() },
    );
    assert.equal(extracted.exitCode, 0, extracted.stderr);
    const config = JSON.parse(
      readFileSync(join(pluginRoot, ".mcp.json"), "utf8"),
    ) as CodexMcpConfig;
    inlineLauncherSource = config.mcpServers?.kibi?.args?.[1] ?? "";
  });

  after(async () => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function launcherEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return isolatedPackedSandboxEnv(overrides);
  }

  it(
    "packs executable hook assets and the inline launcher config",
    { timeout: 30_000 },
    () => {
      // The hook commands invoke node against dist/hook-runner.js; plugin
      // installs that miss the built assets break every lifecycle hook.
      assert.equal(
        existsSync(join(pluginRoot, "dist", "hook-runner.js")),
        true,
        "packed plugin is missing dist/hook-runner.js",
      );
      assert.equal(
        existsSync(join(pluginRoot, "dist", "hook-input.js")),
        true,
        "packed plugin is missing compiled hook modules",
      );
      assert.equal(existsSync(join(pluginRoot, "hooks", "hooks.json")), true);
      assert.equal(
        existsSync(join(pluginRoot, ".codex-plugin", "plugin.json")),
        true,
      );
      assert.equal(
        existsSync(join(pluginRoot, "skills", "kibi-usage", "SKILL.md")),
        true,
      );

      const config = JSON.parse(
        readFileSync(join(pluginRoot, ".mcp.json"), "utf8"),
      ) as CodexMcpConfig;
      const server = config.mcpServers?.kibi;
      assert.ok(server, "packed plugin omitted mcpServers.kibi");
      assert.equal(server.cwd, undefined);
      assert.equal(server.enabled, true);
      assert.equal(server.startup_timeout_sec, 30);
      assert.equal(server.tool_timeout_sec, 60);
      assert.equal(server.default_tools_approval_mode, "prompt");
      assert.equal(server.command, "node");
      assert.deepEqual(server.args?.slice(0, 1), ["-e"]);

      const source = inlineLauncherSource;
      assert.ok(source.length > 0, "inline launcher source is empty");
      assert.ok(
        source.trimEnd().endsWith("main();"),
        "inline launcher never invokes its entrypoint",
      );
      assert.match(source, /require\.main === module/);
      assert.match(source, /\.kb\/manifest\.json/);
      assert.match(source, /"--no-install"/);
      assert.match(source, /KIBI_WORKSPACE/);
    },
  );

  it(
    "starts cleanly with zero tools in unconfigured workspaces",
    { timeout: 30_000 },
    async () => {
      const workspace = mkdtempSync(join(tmpdir(), "kibi-codex-plain-"));
      tempRoots.push(workspace);

      const result = await runLauncherMcp(
        inlineLauncherSource,
        workspace,
        launcherEnv(),
        [
          {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-06-18",
              clientInfo: { name: "codex" },
            },
          },
          { jsonrpc: "2.0", method: "notifications/initialized" },
          { jsonrpc: "2.0", id: 2, method: "tools/list" },
        ],
      );

      assert.equal(result.exitCode, 0, result.stderr);
      assert.equal(result.stderr, "");
      const lines = result.stdout
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as Record<string, unknown>);
      const initialize = lines.find((message) => message.id === 1) as {
        result?: { serverInfo?: { name?: string }; instructions?: string };
      };
      assert.equal(initialize?.result?.serverInfo?.name, "kibi-codex-launcher");
      assert.equal(initialize?.result?.instructions, undefined);
      const tools = lines.find((message) => message.id === 2) as {
        result?: { tools?: unknown[] };
      };
      assert.deepEqual(tools?.result?.tools, []);
    },
  );

  it(
    "proxies the project-local kibi-mcp from configured workspaces and subdirectories",
    { timeout: 30_000 },
    async () => {
      const fixtureRoot = mkdtempSync(join(tmpdir(), "kibi-codex-configured-"));
      tempRoots.push(fixtureRoot);
      const workspace = join(fixtureRoot, "workspace");
      const subdir = join(workspace, "packages", "app");
      mkdirSync(join(workspace, ".kb"), { recursive: true });
      mkdirSync(subdir, { recursive: true });
      writeFileSync(join(workspace, ".kb", "manifest.json"), "{}\n");

      const fakeBin = join(fixtureRoot, "fakebin");
      mkdirSync(fakeBin, { recursive: true });
      // Stub npx: the resolution probe succeeds, then the "server" relays a
      // stub tool catalog and records how the launcher spawned it.
      const stubPath = join(fakeBin, "npx");
      writeFileSync(
        stubPath,
        `#!/usr/bin/env node
const fs = require("node:fs");
const log = ${JSON.stringify(join(fixtureRoot, "npx-invocations.jsonl"))};
fs.appendFileSync(log, JSON.stringify({
  argv: process.argv.slice(1),
  cwd: process.cwd(),
  kibiWorkspace: process.env.KIBI_WORKSPACE ?? null,
}) + "\\n");
const args = process.argv.slice(2);
if (args.includes("--print-resolution")) {
  process.stdout.write(JSON.stringify({ ok: true }));
  process.exit(0);
}
process.stdin.setEncoding("utf8");
let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  for (;;) {
    const index = buffer.indexOf("\\n");
    if (index < 0) break;
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    if (message.method === "initialize") {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: message.id,
        result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "stub-kibi-mcp", version: "0.0.0" } },
      }) + "\\n");
    } else if (message.method === "tools/list") {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: message.id,
        result: { tools: [{ name: "stub_tool" }] },
      }) + "\\n");
    }
  }
});
`,
      );
      chmodSync(stubPath, 0o755);

      const result = await runLauncherMcp(
        inlineLauncherSource,
        subdir,
        launcherEnv({
          // Keep node reachable for the stub's `env node` shebang.
          PATH: `${fakeBin}:${dirname(process.execPath)}`,
        }),
        [
          {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: { protocolVersion: "2025-06-18" },
          },
          { jsonrpc: "2.0", id: 2, method: "tools/list" },
        ],
      );

      assert.equal(result.exitCode, 0, result.stderr);
      assert.match(result.stdout, /stub-kibi-mcp/);
      assert.match(result.stdout, /stub_tool/);
      assert.doesNotMatch(result.stdout, /kibi-codex-launcher/);

      const invocations = readFileSync(
        join(fixtureRoot, "npx-invocations.jsonl"),
        "utf8",
      )
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map(
          (line) =>
            JSON.parse(line) as {
              argv: string[];
              cwd: string;
              kibiWorkspace: string | null;
            },
        );
      const serverInvocation = invocations.find(
        (entry) => !entry.argv.includes("--print-resolution"),
      );
      assert.ok(serverInvocation, "launcher never started the real server");
      // The stub records process.argv.slice(1): its own path first.
      assert.deepEqual(serverInvocation.argv.slice(1), [
        "--no-install",
        "kibi-mcp",
      ]);
      assert.equal(serverInvocation.cwd, workspace);
      assert.equal(serverInvocation.kibiWorkspace, workspace);
    },
  );

  it(
    "starts cleanly with guidance when the configured workspace lacks kibi-mcp",
    { timeout: 30_000 },
    async () => {
      const fixtureRoot = mkdtempSync(join(tmpdir(), "kibi-codex-missing-"));
      tempRoots.push(fixtureRoot);
      const workspace = join(fixtureRoot, "workspace");
      mkdirSync(join(workspace, ".kb"), { recursive: true });
      writeFileSync(join(workspace, ".kb", "manifest.json"), "{}\n");

      const result = await runLauncherMcp(
        inlineLauncherSource,
        workspace,
        // No npx anywhere on PATH: the launcher must not fail the handshake.
        launcherEnv({ PATH: join(fixtureRoot, "empty-bin") }),
        [
          {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: { protocolVersion: "2025-06-18" },
          },
          { jsonrpc: "2.0", id: 2, method: "tools/list" },
        ],
      );

      assert.equal(result.exitCode, 0, result.stderr);
      assert.equal(result.stderr, "");
      const lines = result.stdout
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as Record<string, unknown>);
      const initialize = lines.find((message) => message.id === 1) as {
        result?: { instructions?: string; serverInfo?: { name?: string } };
      };
      assert.equal(initialize?.result?.serverInfo?.name, "kibi-codex-launcher");
      assert.match(initialize?.result?.instructions ?? "", /kibi-mcp/);
      const tools = lines.find((message) => message.id === 2) as {
        result?: { tools?: unknown[] };
      };
      assert.deepEqual(tools?.result?.tools, []);
    },
  );
});
