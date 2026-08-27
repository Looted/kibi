import { rm } from "node:fs/promises";
import {
  isAlive,
  readChildPid,
  request,
  spawnMcpTestServer,
  stopServer,
  waitForExit,
  waitUntilReaped,
} from "./node-mcp-driver-helpers.mjs";

async function runOverflow() {
  const { child, workspace } = await spawnMcpTestServer({
    entityCount: 70_000,
    delaySeconds: 0,
  });
  try {
    const response = await request(child, 2, "tools/call", {
      name: "kb_search",
      arguments: { query: "skillopt", limit: 20, offset: 0 },
    });
    const serialized = JSON.stringify(response);
    const bounded =
      serialized.includes("bounded Prolog output capacity") &&
      serialized.includes("ENOBUFS");
    process.stdout.write(
      `${JSON.stringify({ mode: "overflow", bounded, mcpPid: child.pid, response })}\n`,
    );
    process.exitCode = bounded ? 0 : 1;
  } finally {
    await stopServer(child);
    await rm(workspace, { recursive: true, force: true });
  }
}

async function runStderrOverflow() {
  const { child, workspace } = await spawnMcpTestServer({
    entityCount: 1,
    delaySeconds: 0,
    stderrBytes: 9 * 1024 * 1024,
  });
  try {
    const parentPid = child.pid;
    if (!parentPid) throw new Error("MCP process has no pid");
    const responsePromise = request(child, 2, "tools/call", {
      name: "kb_search",
      arguments: { query: "skillopt", limit: 20, offset: 0 },
    });
    const prologPid = await readChildPid(parentPid);
    const response = await responsePromise;
    const serialized = JSON.stringify(response);
    const bounded =
      serialized.includes("bounded Prolog output capacity") &&
      serialized.includes("ENOBUFS");
    const childReaped = await waitUntilReaped(prologPid);
    process.stdout.write(
      `${JSON.stringify({ mode: "stderr-overflow", bounded, parentPid, prologPid, childReaped, response })}\n`,
    );
    process.exitCode = bounded && childReaped ? 0 : 1;
  } finally {
    await stopServer(child);
    await rm(workspace, { recursive: true, force: true });
  }
}

async function runSearch() {
  const { child, workspace } = await spawnMcpTestServer({
    entityCount: 1,
    delaySeconds: 0,
  });
  try {
    const response = await request(child, 2, "tools/call", {
      name: "kb_search",
      arguments: { query: "skillopt", limit: 20, offset: 0 },
    });
    const serialized = JSON.stringify(response);
    const ranked =
      serialized.includes('"count":1') && serialized.includes("REQ-skillopt-1");
    process.stdout.write(
      `${JSON.stringify({ mode: "search", ranked, mcpPid: child.pid, response })}\n`,
    );
    process.exitCode = ranked ? 0 : 1;
  } finally {
    await stopServer(child);
    await rm(workspace, { recursive: true, force: true });
  }
}

async function runQuery() {
  const { child, workspace } = await spawnMcpTestServer({
    entityCount: 1,
    delaySeconds: 0,
  });
  try {
    const response = await request(child, 2, "tools/call", {
      name: "kb_query",
      arguments: { id: "REQ-skillopt-1", limit: 20, offset: 0 },
    });
    const serialized = JSON.stringify(response);
    const exact =
      serialized.includes('"count":1') && serialized.includes("REQ-skillopt-1");
    process.stdout.write(
      `${JSON.stringify({ mode: "query", exact, mcpPid: child.pid, response })}\n`,
    );
    process.exitCode = exact ? 0 : 1;
  } finally {
    await stopServer(child);
    await rm(workspace, { recursive: true, force: true });
  }
}

async function runGraph() {
  const { child, workspace } = await spawnMcpTestServer({
    entityCount: 1,
    delaySeconds: 0,
  });
  try {
    const response = await request(child, 2, "tools/call", {
      name: "kb_graph",
      arguments: { seedIds: ["REQ-skillopt-1"], depth: 1 },
    });
    const serialized = JSON.stringify(response);
    const traversed =
      serialized.includes('"truncated":false') &&
      serialized.includes("REQ-skillopt-1");
    process.stdout.write(
      `${JSON.stringify({ mode: "graph", traversed, mcpPid: child.pid, response })}\n`,
    );
    process.exitCode = traversed ? 0 : 1;
  } finally {
    await stopServer(child);
    await rm(workspace, { recursive: true, force: true });
  }
}

async function runStatus() {
  const { child, workspace } = await spawnMcpTestServer({
    entityCount: 1,
    delaySeconds: 0,
  });
  try {
    const response = await request(child, 2, "tools/call", {
      name: "kb_status",
      arguments: {},
    });
    const serialized = JSON.stringify(response);
    const reported =
      serialized.includes('"branch":"develop"') &&
      serialized.includes('"syncState":"fresh"');
    process.stdout.write(
      `${JSON.stringify({ mode: "status", reported, mcpPid: child.pid, response })}\n`,
    );
    process.exitCode = reported ? 0 : 1;
  } finally {
    await stopServer(child);
    await rm(workspace, { recursive: true, force: true });
  }
}

async function runSignal(signal) {
  const { child, workspace } = await spawnMcpTestServer({
    entityCount: 1,
    delaySeconds: 30,
  });
  let forcedCleanup = false;
  let prologPid = 0;
  try {
    child.stdin?.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "kb_search",
          arguments: { query: "skillopt", limit: 20, offset: 0 },
        },
      })}\n`,
    );
    const parentPid = child.pid;
    if (!parentPid) throw new Error("MCP process has no pid");
    prologPid = await readChildPid(parentPid);
    const startedAt = Date.now();
    child.kill(signal);
    let exit;
    try {
      exit = await waitForExit(child, 5_000);
    } catch {
      forcedCleanup = true;
      child.kill("SIGKILL");
      exit = await waitForExit(child, 2_000);
    }
    const childReaped = await waitUntilReaped(prologPid);
    if (!childReaped) {
      forcedCleanup = true;
      process.kill(prologPid, "SIGKILL");
      await waitUntilReaped(prologPid);
    }
    const receipt = {
      mode: "signal",
      signal,
      parentPid,
      prologPid,
      elapsedMs: Date.now() - startedAt,
      exit,
      childReaped,
      forcedCleanup,
    };
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    process.exitCode = exit.code === 0 && childReaped && !forcedCleanup ? 0 : 1;
  } finally {
    await stopServer(child);
    if (prologPid > 0 && isAlive(prologPid)) process.kill(prologPid, "SIGKILL");
    await rm(workspace, { recursive: true, force: true });
  }
}

const [mode, argument] = process.argv.slice(2);
if (mode === "overflow") {
  await runOverflow();
} else if (mode === "stderr-overflow") {
  await runStderrOverflow();
} else if (mode === "search") {
  await runSearch();
} else if (mode === "query") {
  await runQuery();
} else if (mode === "graph") {
  await runGraph();
} else if (mode === "status") {
  await runStatus();
} else if (
  mode === "signal" &&
  (argument === "SIGINT" || argument === "SIGTERM")
) {
  await runSignal(argument);
} else {
  throw new Error(
    "usage: search-transport-node.mjs search|query|graph|status|overflow|stderr-overflow|signal SIGINT|SIGTERM",
  );
}
