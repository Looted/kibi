import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  type RoutingDecision,
  WORKSPACE_ROOT_ARGUMENT,
  WorkspaceRouter,
  defaultIsRoutable,
  defaultResolveChildCommand,
  gitCommonDirectory,
  kibiWorkspaceFor,
  withWorkspaceRootSchema,
} from "../../src/server/workspace-router.js";

const dirs: string[] = [];
const routers: WorkspaceRouter[] = [];
const spies: { mockRestore: () => void }[] = [];

afterEach(async () => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const router of routers.splice(0)) await router.shutdown();
  for (const dir of dirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir(prefix = "kibi-rl-"): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  dirs.push(dir);
  return dir;
}

function kibiWorkspace(): string {
  const root = tempDir("kibi-rl-ws-");
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, ".kb"));
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}\n");
  return root;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A stand-in kibi-mcp. Every call answers with its workspace, pid, tool,
 * arguments, a few environment values and the client that connected;
 * kb_slow answers late, kb_exit exits after answering, kb_null answers with
 * null data, and an async kb_check hands out a job id.
 */
const FAKE_CHILD = `
const readline = require("node:readline");
const send = (m) => process.stdout.write(JSON.stringify(m) + "\\n");
let client = null;
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const m = JSON.parse(line);
  if (m.id === undefined || m.id === null) return;
  if (m.method === "initialize") {
    client = m.params.clientInfo;
    send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "fake", version: "1" } } });
    return;
  }
  if (m.method === "tools/call") {
    const args = m.params.arguments ?? {};
    const tool = m.params.name;
    const data = tool === "kb_null" ? null : { workspace: process.env.KIBI_WORKSPACE, pid: process.pid, tool, args, keep: process.env.KEEP, drop: typeof process.env.DROP, client };
    if (data && tool === "kb_check" && args.async === true) data.jobId = "job-" + process.pid;
    const envelope = { kibiProtocol: 1, status: "success", data, diagnostics: [], effects: [], nextActions: [] };
    const answer = () => send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: "ok" }], structuredContent: envelope } });
    if (tool === "kb_slow") setTimeout(answer, 150);
    else answer();
    if (tool === "kb_exit") setTimeout(() => process.exit(0), 20);
    return;
  }
  send({ jsonrpc: "2.0", id: m.id, result: {} });
});
`;

let childScript: string | undefined;
function childCommand() {
  if (!childScript || !fs.existsSync(childScript)) {
    const dir = tempDir("kibi-rl-child-");
    childScript = path.join(dir, "child.cjs");
    fs.writeFileSync(childScript, FAKE_CHILD);
  }
  return { command: process.execPath, args: [childScript] };
}

type ChildLike = {
  root: string;
  closed: boolean;
  idleTimer: unknown;
  transport: { onclose?: () => void };
  client: { close: () => Promise<void> };
};
type Internals = {
  children: Map<string, ChildLike>;
  jobOwners: Map<string, string>;
  retire: (child: ChildLike) => Promise<void>;
};
const internals = (router: WorkspaceRouter) => router as unknown as Internals;

function fakeServer(
  capabilities?: Record<string, unknown>,
  listRoots: () => Promise<unknown> = async () => ({ roots: [] }),
): McpServer {
  return {
    server: {
      getClientCapabilities: () => capabilities,
      listRoots,
      setNotificationHandler: () => {},
    },
  } as unknown as McpServer;
}

function router(
  attached: string,
  options: Partial<ConstructorParameters<typeof WorkspaceRouter>[0]> = {},
): WorkspaceRouter {
  const instance = new WorkspaceRouter({
    server: fakeServer(),
    workspaceRoot: attached,
    env: { PATH: process.env.PATH ?? "" },
    isRoutable: () => true,
    resolveChildCommand: () => childCommand(),
    log: () => {},
    connectTimeoutMs: 20000,
    ...options,
  });
  routers.push(instance);
  return instance;
}

function data(decision: RoutingDecision): Record<string, unknown> {
  if (decision.kind !== "remote") throw new Error("expected remote");
  return (
    decision.result as unknown as {
      structuredContent: { data: Record<string, unknown> };
    }
  ).structuredContent.data;
}

const call = (
  r: WorkspaceRouter,
  root: string,
  tool = "kb_query",
  extra = {},
) => r.route(tool, { [WORKSPACE_ROOT_ARGUMENT]: root, ...extra });

/** Whether clearTimeout got this very handle (timers compare equal by value). */
function cleared(clear: { mock: { calls: unknown[][] } }, handle: unknown) {
  return clear.mock.calls.some(([value]) => value === handle);
}

function captureTimers(ms: number) {
  const handles: unknown[] = [];
  const real = globalThis.setTimeout;
  const spy = spyOn(globalThis, "setTimeout").mockImplementation(((
    handler: () => void,
    delay?: number,
  ) => {
    const handle = real(handler, delay);
    if (delay === ms) handles.push(handle);
    return handle;
  }) as never);
  spies.push(spy);
  return handles;
}

describe("starting a child", () => {
  test("a child gets the text environment values and the router's name", async () => {
    const r = router(kibiWorkspace(), {
      env: { PATH: process.env.PATH ?? "", KEEP: "1", DROP: undefined },
    });
    const answer = data(await call(r, kibiWorkspace()));
    expect(answer.keep).toBe("1");
    expect(answer.drop).toBe("undefined");
    expect(answer.client).toStrictEqual({
      name: "kibi-mcp-workspace-router",
      version: "1",
    });
  });

  test("the default idle time is ten minutes", async () => {
    const handles = captureTimers(600_000);
    const r = router(kibiWorkspace());
    await call(r, kibiWorkspace());
    expect(handles.length).toBeGreaterThan(0);
  });

  test("the routing check gets no roots before any were listed", async () => {
    const seen: unknown[][] = [];
    const r = router(kibiWorkspace(), {
      isRoutable: (...args) => {
        seen.push(args);
        return false;
      },
    });
    const other = kibiWorkspace();
    await call(r, other);
    expect(seen).toStrictEqual([[other, []]]);
  });
});

describe("idle children", () => {
  test("a slow call restarts the idle timer when it ends", async () => {
    const r = router(kibiWorkspace(), { idleRetireMs: 60 });
    await call(r, kibiWorkspace(), "kb_slow");
    expect(internals(r).children.size).toBe(1);
    for (let i = 0; i < 100 && internals(r).children.size > 0; i++)
      await sleep(20);
    expect(internals(r).children.size).toBe(0);
  });

  test("an idle timer does not retire a child that is answering", async () => {
    const r = router(kibiWorkspace(), { idleRetireMs: 60 });
    const other = kibiWorkspace();
    const first = data(await call(r, other));
    const timer = internals(r).children.get(other)?.idleTimer as {
      hasRef: () => boolean;
    };
    expect(timer.hasRef()).toBe(false);
    expect(data(await call(r, other, "kb_slow")).pid).toBe(first.pid);
    expect(internals(r).children.has(other)).toBe(true);
    expect(data(await call(r, other)).pid).toBe(first.pid);
  });

  test("a later call replaces the earlier idle timer", async () => {
    const r = router(kibiWorkspace(), { idleRetireMs: 400 });
    const other = kibiWorkspace();
    const first = data(await call(r, other));
    await sleep(250);
    await call(r, other);
    await sleep(250);
    expect(internals(r).children.size).toBe(1);
    expect(data(await call(r, other)).pid).toBe(first.pid);
  });
});

describe("the pool", () => {
  test("the least recently used idle child is evicted", async () => {
    let clock = 0;
    const r = router(kibiWorkspace(), { maxChildren: 2, now: () => ++clock });
    const [a, b, c] = [kibiWorkspace(), kibiWorkspace(), kibiWorkspace()];
    await call(r, a);
    await call(r, b);
    await call(r, b);
    await call(r, c);
    expect([...internals(r).children.keys()].sort()).toStrictEqual(
      [b, c].sort(),
    );
  });

  test("the oldest child is found wherever it is in the pool", async () => {
    let clock = 0;
    const r = router(kibiWorkspace(), { maxChildren: 2, now: () => ++clock });
    const [a, b, c] = [kibiWorkspace(), kibiWorkspace(), kibiWorkspace()];
    await call(r, a);
    await call(r, b);
    await call(r, a);
    await call(r, c);
    expect([...internals(r).children.keys()].sort()).toStrictEqual(
      [a, c].sort(),
    );
  });

  test("among equally idle children the first started is evicted", async () => {
    const r = router(kibiWorkspace(), { maxChildren: 2, now: () => 0 });
    const [a, b, c] = [kibiWorkspace(), kibiWorkspace(), kibiWorkspace()];
    await call(r, a);
    await call(r, b);
    await call(r, c);
    expect([...internals(r).children.keys()].sort()).toStrictEqual(
      [b, c].sort(),
    );
  });

  test("a child that exits on its own leaves the pool", async () => {
    const r = router(kibiWorkspace());
    const other = kibiWorkspace();
    const first = data(await call(r, other, "kb_exit"));
    const child = internals(r).children.get(other) as ChildLike;
    for (let i = 0; i < 100 && !child.closed; i++) await sleep(20);
    expect(child.closed).toBe(true);
    expect(internals(r).children.has(other)).toBe(false);
    expect(data(await call(r, other)).pid).not.toBe(first.pid);
  });

  test("a closing child leaves its replacement in the pool", async () => {
    const r = router(kibiWorkspace());
    const other = kibiWorkspace();
    await call(r, other);
    const pool = internals(r).children;
    const child = pool.get(other) as ChildLike;
    const replacement = { ...child };
    pool.set(other, replacement);
    const clear = spyOn(globalThis, "clearTimeout");
    spies.push(clear);
    child.transport.onclose?.();
    expect(pool.get(other)).toBe(replacement);
    expect(child.closed).toBe(true);
    expect(cleared(clear, child.idleTimer)).toBe(true);
    pool.set(other, child);
  });

  test("retiring a child forgets only its jobs and its timer", async () => {
    const r = router(kibiWorkspace());
    const [a, b] = [kibiWorkspace(), kibiWorkspace()];
    const jobA = data(await call(r, a, "kb_check", { async: true })).jobId;
    const jobB = data(await call(r, b, "kb_check", { async: true })).jobId;
    const { children, jobOwners, retire } = internals(r);
    expect([...jobOwners.keys()].sort()).toStrictEqual(
      ([jobA, jobB] as string[]).sort(),
    );
    const child = children.get(a) as ChildLike;
    const clear = spyOn(globalThis, "clearTimeout");
    spies.push(clear);
    const retiring = retire.call(r, child);
    // Cleared before the client closes, not only by the close handler.
    expect(cleared(clear, child.idleTimer)).toBe(true);
    await retiring;
    expect(children.has(a)).toBe(false);
    expect([...jobOwners.keys()]).toStrictEqual([jobB as string]);
  });

  test("a job poll naming any workspace goes to the job's child", async () => {
    const r = router(kibiWorkspace());
    const owner = kibiWorkspace();
    const job = data(await call(r, owner, "kb_check", { async: true }));
    const polled = data(
      await call(r, tempDir(), "kb_job_status", { jobId: job.jobId }),
    );
    expect(polled.tool).toBe("kb_job_status");
    expect(polled.pid).toBe(job.pid);
    expect(polled.args).toStrictEqual({ jobId: job.jobId });
  });

  test("an answer with null data records no job", async () => {
    const r = router(kibiWorkspace());
    const decision = await call(r, kibiWorkspace(), "kb_null");
    expect(decision.kind).toBe("remote");
    expect(internals(r).jobOwners.size).toBe(0);
  });
});

describe("roots requests", () => {
  test("the roots timer is cleared when the client answers or fails", async () => {
    const handles = captureTimers(4321);
    const clear = spyOn(globalThis, "clearTimeout");
    spies.push(clear);
    for (const listRoots of [
      async () => ({ roots: [] }),
      async () => {
        throw new Error("nope");
      },
    ]) {
      const r = router(kibiWorkspace(), {
        server: fakeServer({ roots: {} }, listRoots),
        rootsTimeoutMs: 4321,
      });
      await r.route("kb_query", {});
      expect(cleared(clear, handles.at(-1))).toBe(true);
    }
    expect(handles).toHaveLength(2);
  });

  test("a disabled router answers a blank workspace locally", async () => {
    const r = router(kibiWorkspace(), {
      env: { KIBI_MCP_ROUTING: " 0 " },
    });
    expect(
      await r.route("kb_query", { [WORKSPACE_ROOT_ARGUMENT]: " ", q: 1 }),
    ).toStrictEqual({ kind: "local", args: { q: 1 } });
    expect(
      await r.route("kb_check", { [WORKSPACE_ROOT_ARGUMENT]: "/x", q: 1 }),
    ).toStrictEqual({
      kind: "local",
      args: { [WORKSPACE_ROOT_ARGUMENT]: "/x", q: 1 },
    });
  });
});

describe("workspace helpers", () => {
  test("a workspace needs a manifest and stops at a git boundary", () => {
    const outer = tempDir();
    fs.mkdirSync(path.join(outer, ".kb"));
    fs.writeFileSync(path.join(outer, ".kb", "manifest.json"), "{}");
    const inner = path.join(outer, "inner");
    fs.mkdirSync(path.join(inner, ".kb"), { recursive: true });
    expect(kibiWorkspaceFor(inner)).toBe(outer);
    fs.mkdirSync(path.join(inner, ".git"));
    expect(kibiWorkspaceFor(inner)).toBeNull();
    expect(kibiWorkspaceFor(tempDir())).toBeNull();
  });

  test("routing boundaries compare real paths, or paths as written", () => {
    const attached = tempDir();
    const routable = defaultIsRoutable(attached, {});
    const root = tempDir();
    expect(routable(root, [root])).toBe(true);
    expect(routable(path.join(root, "a"), [root])).toBe(true);
    expect(routable(path.join(path.dirname(root), "x"), [root])).toBe(false);
    expect(routable("/no/such/root/ws", ["/no/such/root"])).toBe(true);
    expect(routable("/no/such/other", ["/no/such/root"])).toBe(false);
  });

  test("routable roots are trimmed and empty entries ignored", () => {
    const attached = tempDir();
    const a = tempDir();
    const b = tempDir();
    const routable = defaultIsRoutable(attached, {
      KIBI_MCP_ROUTABLE_ROOTS: ` ${a} ${path.delimiter}${path.delimiter} ${b}`,
    });
    expect(routable(path.join(a, "x"), [])).toBe(true);
    expect(routable(path.join(b, "x"), [])).toBe(true);
    expect(routable(path.join(process.cwd(), "x"), [])).toBe(false);
    expect(
      defaultIsRoutable(attached, {})(
        path.join(process.cwd(), "Stryker was here!", "x"),
        [],
      ),
    ).toBe(false);
  });

  test("two workspaces outside any repository are not routable", () => {
    expect(defaultIsRoutable(tempDir(), {})(tempDir(), [])).toBe(false);
  });

  test("the attached repository is looked up once", () => {
    const repo = tempDir();
    childProcess.spawnSync("git", ["init", "-q", repo]);
    const sub = path.join(repo, "sub");
    fs.mkdirSync(sub);
    const spawn = spyOn(childProcess, "spawnSync");
    spies.push(spawn);
    const routable = defaultIsRoutable(repo, {});
    expect(routable(sub, [])).toBe(true);
    expect(routable(sub, [])).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(3);
  });

  test("a missing directory has no git directory", () => {
    expect(gitCommonDirectory(path.join(tempDir(), "missing"))).toBeNull();
  });

  test("only record properties are kept when the argument is added", () => {
    for (const properties of ["ab", null, [1]]) {
      const [tool] = withWorkspaceRootSchema([
        { inputSchema: { type: "object", properties } },
      ]);
      expect(
        Object.keys(
          (
            tool?.inputSchema as unknown as {
              properties: Record<string, unknown>;
            }
          ).properties,
        ),
      ).toStrictEqual([WORKSPACE_ROOT_ARGUMENT]);
    }
  });
});

describe("child command", () => {
  test("an install is used only when the workspace has package.json", () => {
    const root = tempDir();
    const pkg = path.join(root, "node_modules", "kibi-mcp");
    fs.mkdirSync(path.join(pkg, "bin"), { recursive: true });
    fs.writeFileSync(path.join(pkg, "bin", "kibi-mcp"), "");
    fs.writeFileSync(path.join(pkg, "index.js"), "");
    fs.writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        main: "index.js",
        bin: "bin/kibi-mcp",
      }),
    );
    const own = tempDir();
    const entry = path.join(own, "entry.js");
    fs.writeFileSync(entry, "");
    expect(defaultResolveChildCommand(root, [entry])?.args).toStrictEqual([
      entry,
    ]);
    fs.writeFileSync(path.join(root, "package.json"), "{}");
    expect(defaultResolveChildCommand(root, [entry])?.args).toStrictEqual([
      path.join(pkg, "bin", "kibi-mcp"),
    ]);
  });

  test("own entries are tried in order and must exist", () => {
    const own = tempDir();
    const entry = path.join(own, "entry.js");
    fs.writeFileSync(entry, "");
    const bare = tempDir();
    expect(
      defaultResolveChildCommand(bare, ["", undefined, "/missing", entry]),
    ).toStrictEqual({
      command: process.execPath,
      args: [entry],
    });
    expect(defaultResolveChildCommand(bare, ["/missing", ""])).toBeNull();
  });
});
