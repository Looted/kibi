#!/usr/bin/env node
// launch-kibi-mcp.mjs — stdio entrypoint for the `kibi` MCP server.
//
// Hosts do not always spawn the server with the session folder as cwd (Vibe
// Desktop on Windows spawns it from its own directory), so resolveWorkspace
// honors KIBI_WORKSPACE/KIBI_PROJECT_ROOT/KIBI_ROOT, the cwd walk bounded by
// .git, and a kibi-workspace.txt pointer next to this file. The pointer names
// one workspace for every session that reaches it, so it is a single-project
// last resort. This launcher does not read the client's MCP roots/list: it
// starts kibi-mcp as a child that owns stdio, so the workspace is fixed here,
// at spawn time (a direct-mode kibi-mcp still answers each call from the Kibi
// workspace under the roots the client declares). The runtime plan picks a
// direct spawn or a WSL wrap automatically (see kibi-runtime.mjs).
//
// Outside Kibi workspaces this serves a silent zero-tool MCP server and exits
// 0, so the host never reports "MCP failed to connect". The same silent
// server (with an instructions hint and a stderr message) is served when a
// configured workspace's kibi-mcp cannot be started.
import {
  debugLaunch,
  isKibiWorkspace,
  planRuntime,
  resolveWorkspace,
  serveEmptyMcpServer,
  spawnKibiMcp,
} from "./kibi-runtime.mjs";

const env = process.env;
const workspace = resolveWorkspace(process.cwd(), env);
debugLaunch(
  {
    kind: "mcp-launch",
    workspace,
    platform: process.platform,
    node: process.version,
  },
  env,
);

if (!isKibiWorkspace(workspace.root)) {
  await serveEmptyMcpServer({
    instructions:
      "Kibi is not configured for this workspace, so no KB tools are available. " +
      "Initialize project memory explicitly with `kibi init` or the kibi-bootstrap skill if you want Kibi here.",
  });
  process.exit(0);
}

let child;
try {
  const plan = planRuntime(workspace.root, env);
  debugLaunch({ kind: "mcp-plan", plan }, env);
  child = spawnKibiMcp(plan, { env });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  debugLaunch({ kind: "mcp-spawn-error", message }, env);
  process.stderr.write(
    `[kibi-vibe] Failed to start kibi-mcp for ${workspace.root}: ${message}\n`,
  );
  await serveEmptyMcpServer({
    instructions: `This workspace is configured for Kibi (.kb/manifest.json found), but starting kibi-mcp failed. No KB tools are exposed in this session. Launch failure: ${message}`,
  });
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  if (process.platform === "win32" && signal !== "SIGBREAK") continue;
  process.once(signal, () => {
    if (!child.killed) child.kill(/** @type {NodeJS.Signals} */ (signal));
  });
}

child.once("error", (error) => {
  debugLaunch({ kind: "mcp-child-error", message: error.message }, env);
  process.stderr.write(
    `[kibi-vibe] Failed to start kibi-mcp: ${error.message}\n`,
  );
  process.exit(1);
});

child.once("close", (code, signal) => {
  debugLaunch({ kind: "mcp-child-close", code, signal }, env);
  process.exit(signal ? 1 : (code ?? 1));
});
