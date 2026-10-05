// implements REQ-mcp-workspace-routing
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type RoutingDecision,
  WORKSPACE_ROOT_ARGUMENT,
  WorkspaceRouter,
  defaultIsRoutable,
  kibiWorkspaceFor,
  withWorkspaceRootSchema,
  workspaceFromRoots,
} from "../../src/server/workspace-router.js";

const tempDirs: string[] = [];
const routers: WorkspaceRouter[] = [];

afterEach(async () => {
  for (const router of routers.splice(0)) await router.shutdown();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

/** A directory that owns a Kibi manifest and a git boundary. */
function kibiWorkspace(prefix: string): string {
  const root = tempDir(prefix);
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, ".kb"));
  fs.writeFileSync(
    path.join(root, ".kb", "manifest.json"),
    '{"manifestVersion":1}\n',
  );
  return root;
}

/**
 * A stand-in kibi-mcp: answers tools/call with the workspace it serves and
 * the arguments it received, hands out a job receipt for async kb_check, and
 * answers kb_job_status with its own workspace.
 */
const FAKE_CHILD = `
const readline = require("node:readline");
const send = (m) => process.stdout.write(JSON.stringify(m) + "\\n");
const text = (value) => ({ type: "text", text: JSON.stringify(value) });
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const m = JSON.parse(line);
  if (m.id === undefined || m.id === null) return;
  if (m.method === "initialize") {
    send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "fake-kibi-mcp", version: "1" } } });
    return;
  }
  if (m.method === "tools/list") {
    send({ jsonrpc: "2.0", id: m.id, result: { tools: [] } });
    return;
  }
  if (m.method === "tools/call") {
    const args = m.params.arguments ?? {};
    const data = { workspace: process.env.KIBI_WORKSPACE, routed: process.env.KIBI_MCP_ROUTED, tool: m.params.name, args, pid: process.pid };
    if (m.params.name === "kb_check" && args.async === true) data.jobId = "job-" + process.pid;
    const envelope = { kibiProtocol: 1, status: "success", data, diagnostics: [], effects: [], nextActions: [] };
    send({ jsonrpc: "2.0", id: m.id, result: { content: [text(envelope)], structuredContent: envelope } });
    return;
  }
  send({ jsonrpc: "2.0", id: m.id, result: {} });
});
process.stderr.write("fake child up\\n");
`;

function fakeChildCommand(): { command: string; args: string[] } {
  const dir = tempDir("kibi-router-child-");
  const script = path.join(dir, "fake-kibi-mcp.cjs");
  fs.writeFileSync(script, FAKE_CHILD);
  return { command: process.execPath, args: [script] };
}

type FakeServer = {
  server: McpServer;
  setRoots: (roots: string[]) => void;
  rootsRequests: () => number;
  notifyRootsChanged: () => Promise<void>;
};

function fakeServer(
  capabilities: Record<string, unknown> | undefined,
): FakeServer {
  let roots: string[] = [];
  let requests = 0;
  const handlers: Array<() => Promise<void>> = [];
  const inner = {
    getClientCapabilities: () => capabilities,
    listRoots: async () => {
      requests += 1;
      return {
        roots: roots.map((dir) => ({ uri: `file://${dir}` })),
      };
    },
    setNotificationHandler: (
      _schema: unknown,
      handler: () => Promise<void>,
    ) => {
      handlers.push(handler);
    },
  };
  return {
    server: { server: inner } as unknown as McpServer,
    setRoots: (next) => {
      roots = next;
    },
    rootsRequests: () => requests,
    notifyRootsChanged: async () => {
      for (const handler of handlers) await handler();
    },
  };
}

function router(
  attached: string,
  options: Partial<ConstructorParameters<typeof WorkspaceRouter>[0]> & {
    capabilities?: Record<string, unknown> | undefined;
  } = {},
): { router: WorkspaceRouter; fake: FakeServer; logs: string[] } {
  const { capabilities, ...rest } = options;
  const fake = fakeServer(capabilities);
  const logs: string[] = [];
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "" };
  const child = fakeChildCommand();
  const instance = new WorkspaceRouter({
    server: fake.server,
    workspaceRoot: attached,
    env,
    isRoutable: () => true,
    resolveChildCommand: () => child,
    log: (text) => logs.push(text),
    connectTimeoutMs: 20000,
    ...rest,
  });
  routers.push(instance);
  return { router: instance, fake, logs };
}

function remoteData(decision: RoutingDecision): Record<string, unknown> {
  if (decision.kind !== "remote") throw new Error("expected remote, got local");
  const structured = (decision.result as { structuredContent?: unknown })
    .structuredContent as { data: Record<string, unknown> };
  return structured.data;
}

describe("workspace resolution", () => {
  test("finds the owning Kibi workspace without crossing a git boundary", () => {
    const root = kibiWorkspace("kibi-router-ws-");
    fs.mkdirSync(path.join(root, "src", "deep"), { recursive: true });
    expect(kibiWorkspaceFor(path.join(root, "src", "deep"))).toBe(root);
    const plain = tempDir("kibi-router-plain-");
    fs.mkdirSync(path.join(plain, ".git"));
    expect(kibiWorkspaceFor(plain)).toBeNull();
    expect(workspaceFromRoots([plain, root])).toBe(root);
  });

  test("adds workspaceRoot to every tool schema", () => {
    const [tool] = withWorkspaceRootSchema([
      { name: "kb_x", inputSchema: { type: "object", properties: { q: {} } } },
    ]);
    const properties = tool?.inputSchema.properties as Record<string, unknown>;
    expect(Object.keys(properties)).toEqual(["q", WORKSPACE_ROOT_ARGUMENT]);
  });
});

describe("explicit workspaceRoot", () => {
  test("routes to the named workspace and strips the argument", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const other = kibiWorkspace("kibi-router-other-");
    const { router: r } = router(attached);
    const decision = await r.route("kb_search", {
      query: "x",
      _diagnostic_telemetry: { reasoning: "t" },
      [WORKSPACE_ROOT_ARGUMENT]: path.join(other, "src"),
    });
    const data = remoteData(decision);
    expect(data.workspace).toBe(other);
    expect(data.routed).toBe("1");
    // The telemetry rides along; the routing argument does not.
    expect(data.args).toEqual({
      query: "x",
      _diagnostic_telemetry: { reasoning: "t" },
    });
  });

  test("answers locally, without the argument, for the attached workspace", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const { router: r } = router(attached);
    const decision = await r.route("kb_query", {
      id: "REQ-a",
      [WORKSPACE_ROOT_ARGUMENT]: path.join(attached, "packages"),
    });
    expect(decision).toEqual({ kind: "local", args: { id: "REQ-a" } });
  });

  test("reports a directory that no Kibi workspace owns", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const plain = tempDir("kibi-router-plain-");
    fs.mkdirSync(path.join(plain, ".git"));
    const { router: r } = router(attached);
    const decision = await r.route("kb_search", {
      query: "x",
      [WORKSPACE_ROOT_ARGUMENT]: plain,
    });
    expect(decision.kind).toBe("local");
    if (decision.kind !== "local") return;
    expect(decision.args).toEqual({ query: "x" });
    expect(decision.notice).toMatchObject({
      code: "workspace_mismatch",
      detail: { requested: plain, reason: "not_a_kibi_workspace" },
    });
    // kb_check keeps its older meaning for a plain directory.
    const check = await r.route("kb_check", {
      [WORKSPACE_ROOT_ARGUMENT]: plain,
    });
    expect(check).toEqual({
      kind: "local",
      args: { [WORKSPACE_ROOT_ARGUMENT]: plain },
    });
  });

  test("refuses workspaces outside the routing boundary", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const other = kibiWorkspace("kibi-router-other-");
    const { router: r } = router(attached, { isRoutable: () => false });
    const decision = await r.route("kb_search", {
      query: "x",
      [WORKSPACE_ROOT_ARGUMENT]: other,
    });
    expect(decision.kind).toBe("local");
    if (decision.kind !== "local") return;
    expect(decision.notice?.detail.reason).toBe("not_routable");
    expect(decision.notice?.message).toContain(attached);
  });

  test("falls back with a notice when no kibi-mcp can start there", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const other = kibiWorkspace("kibi-router-other-");
    const { router: r } = router(attached, {
      resolveChildCommand: () => null,
    });
    const decision = await r.route("kb_search", {
      [WORKSPACE_ROOT_ARGUMENT]: other,
    });
    expect(decision.kind).toBe("local");
    if (decision.kind !== "local") return;
    expect(decision.notice?.detail.reason).toBe("unavailable");
  });

  test("a pinned server never routes and says so", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const other = kibiWorkspace("kibi-router-other-");
    const { router: r } = router(attached, {
      env: { PATH: process.env.PATH ?? "", KIBI_WORKSPACE: attached },
    });
    expect(r.enabled).toBe(false);
    const decision = await r.route("kb_search", {
      [WORKSPACE_ROOT_ARGUMENT]: other,
    });
    expect(decision.kind).toBe("local");
    if (decision.kind !== "local") return;
    expect(decision.args).toEqual({});
    expect(decision.notice?.detail.reason).toBe("pinned");
  });

  test("a host launcher's attach root does not pin the server", () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const { router: r } = router(attached, {
      env: { PATH: process.env.PATH ?? "", KIBI_MCP_ATTACH_ROOT: attached },
    });
    expect(r.enabled).toBe(true);
  });

  test("a routed child never routes further", () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const { router: r } = router(attached, {
      env: { PATH: process.env.PATH ?? "", KIBI_MCP_ROUTED: "1" },
    });
    expect(r.enabled).toBe(false);
  });
});

describe("child pool", () => {
  test("reuses one child per workspace and keeps parallel workspaces apart", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const left = kibiWorkspace("kibi-router-left-");
    const right = kibiWorkspace("kibi-router-right-");
    const { router: r, logs } = router(attached);
    const pids = new Set<unknown>();
    for (const root of [left, right, left, right]) {
      const data = remoteData(
        await r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: root }),
      );
      expect(data.workspace).toBe(root);
      pids.add(data.pid);
    }
    expect(pids.size).toBe(2);
    expect(logs.filter((line) => line.startsWith("Serving "))).toHaveLength(2);
  });

  test("evicts the least recently used child when the pool is full", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const a = kibiWorkspace("kibi-router-a-");
    const b = kibiWorkspace("kibi-router-b-");
    let clock = 1000;
    const { router: r } = router(attached, {
      maxChildren: 1,
      now: () => clock++,
    });
    const first = remoteData(
      await r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: a }),
    );
    const second = remoteData(
      await r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: b }),
    );
    const again = remoteData(
      await r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: a }),
    );
    expect(first.workspace).toBe(a);
    expect(second.workspace).toBe(b);
    expect(again.workspace).toBe(a);
    expect(again.pid).not.toBe(first.pid);
  });

  test("polls a background job in the child that started it", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const other = kibiWorkspace("kibi-router-other-");
    const { router: r } = router(attached);
    const started = remoteData(
      await r.route("kb_check", {
        async: true,
        [WORKSPACE_ROOT_ARGUMENT]: other,
      }),
    );
    const jobId = started.jobId as string;
    expect(jobId).toMatch(/^job-/);
    const polled = remoteData(await r.route("kb_job_status", { jobId }));
    expect(polled.workspace).toBe(other);
    const unknown = await r.route("kb_job_status", { jobId: "job-elsewhere" });
    expect(unknown).toEqual({
      kind: "local",
      args: { jobId: "job-elsewhere" },
    });
  });
});

describe("client roots", () => {
  test("routes by roots when the client declares them, and caches on list_changed", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const worktree = kibiWorkspace("kibi-router-wt-");
    const { router: r, fake } = router(attached, {
      capabilities: { roots: { listChanged: true } },
    });
    fake.setRoots([worktree]);
    expect(
      remoteData(await r.route("kb_search", { query: "a" })).workspace,
    ).toBe(worktree);
    expect(
      remoteData(await r.route("kb_search", { query: "b" })).workspace,
    ).toBe(worktree);
    expect(fake.rootsRequests()).toBe(1);
    fake.setRoots([attached]);
    await fake.notifyRootsChanged();
    expect(await r.route("kb_search", { query: "c" })).toEqual({
      kind: "local",
      args: { query: "c" },
    });
    expect(fake.rootsRequests()).toBe(2);
  });

  test("asks per call when the client cannot report changes", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const { router: r, fake } = router(attached, {
      capabilities: { roots: {} },
    });
    fake.setRoots([attached]);
    await r.route("kb_search", { query: "a" });
    await r.route("kb_search", { query: "b" });
    expect(fake.rootsRequests()).toBe(2);
  });

  test("never asks a client without roots", async () => {
    const attached = kibiWorkspace("kibi-router-main-");
    const { router: r, fake } = router(attached, { capabilities: {} });
    expect(await r.route("kb_search", { query: "a" })).toEqual({
      kind: "local",
      args: { query: "a" },
    });
    expect(fake.rootsRequests()).toBe(0);
  });
});

describe("default routing boundary", () => {
  test("allows worktrees of the same repository and client roots only", () => {
    const main = kibiWorkspace("kibi-router-repo-");
    fs.rmSync(path.join(main, ".git"), { recursive: true, force: true });
    const git = (args: string[], cwd = main) =>
      spawnSync("git", args, { cwd, encoding: "utf8" });
    git(["init", "-q"]);
    git([
      "-c",
      "user.email=t@t",
      "-c",
      "user.name=t",
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      "init",
    ]);
    const worktree = path.join(tempDir("kibi-router-wt-"), "wt");
    git(["worktree", "add", "-q", worktree, "-b", "wt"]);
    fs.mkdirSync(path.join(worktree, ".kb"));
    fs.writeFileSync(path.join(worktree, ".kb", "manifest.json"), "{}\n");
    const stranger = kibiWorkspace("kibi-router-stranger-");
    const routable = defaultIsRoutable(main, { PATH: process.env.PATH ?? "" });
    expect(routable(worktree, [])).toBe(true);
    expect(routable(stranger, [])).toBe(false);
    expect(routable(stranger, [path.dirname(stranger)])).toBe(true);
    const allowlisted = defaultIsRoutable(main, {
      PATH: process.env.PATH ?? "",
      KIBI_MCP_ROUTABLE_ROOTS: stranger,
    });
    expect(allowlisted(stranger, [])).toBe(true);
  });
});
