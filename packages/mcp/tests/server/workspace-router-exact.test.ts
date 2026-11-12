import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type RoutingDecision,
  WORKSPACE_ROOT_ARGUMENT,
  WORKSPACE_ROOT_SCHEMA,
  type WorkspaceMismatchDiagnostic,
  WorkspaceRouter,
  getWorkspaceRouter,
  setWorkspaceRouter,
  withWorkspaceRootSchema,
  workspaceFromRoots,
} from "../../src/server/workspace-router.js";

const tempDirs: string[] = [];
const routers: WorkspaceRouter[] = [];

afterEach(async () => {
  for (const router of routers.splice(0)) await router.shutdown();
  for (const dir of tempDirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir(prefix: string): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  tempDirs.push(dir);
  return dir;
}

function kibiWorkspace(prefix: string): string {
  const root = tempDir(prefix);
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, ".kb"));
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}\n");
  return root;
}

/** A stand-in kibi-mcp; see workspace-router.test.ts. */
const FAKE_CHILD = `
const readline = require("node:readline");
const send = (m) => process.stdout.write(JSON.stringify(m) + "\\n");
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const m = JSON.parse(line);
  if (m.id === undefined || m.id === null) return;
  if (m.method === "initialize") {
    send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "fake", version: "1" } } });
    return;
  }
  if (m.method === "tools/call") {
    const args = m.params.arguments ?? {};
    const data = { workspace: process.env.KIBI_WORKSPACE, routed: process.env.KIBI_MCP_ROUTED, tool: m.params.name, args, pid: process.pid };
    if (args.async === true) data.jobId = "job-" + process.pid;
    if (args.slow === true) { setTimeout(() => send({ jsonrpc: "2.0", id: m.id, result: { content: [], structuredContent: { data } } }), 300); return; }
    send({ jsonrpc: "2.0", id: m.id, result: { content: [], structuredContent: { data } } });
    return;
  }
  send({ jsonrpc: "2.0", id: m.id, result: {} });
});
process.stderr.write("line one\\n\\n  \\nline two\\n");
`;

function fakeChildCommand(script = FAKE_CHILD): {
  command: string;
  args: string[];
} {
  const dir = tempDir("kibi-router-exact-child-");
  const file = path.join(dir, "fake.cjs");
  fs.writeFileSync(file, script);
  return { command: process.execPath, args: [file] };
}

type FakeOptions = {
  capabilities?: Record<string, unknown> | undefined;
  listRoots?: () => Promise<{ roots: Array<{ uri: string }> }>;
};

function fakeServer(options: FakeOptions) {
  const handlers: Array<() => Promise<void>> = [];
  let requests = 0;
  let roots: string[] = [];
  const inner = {
    getClientCapabilities: () => options.capabilities,
    listRoots:
      options.listRoots ??
      (async () => {
        requests += 1;
        return { roots: roots.map((dir) => ({ uri: `file://${dir}` })) };
      }),
    setNotificationHandler: (
      _schema: unknown,
      handler: () => Promise<void>,
    ) => {
      handlers.push(handler);
    },
  };
  return {
    server: { server: inner } as unknown as McpServer,
    setRoots: (next: string[]) => {
      roots = next;
    },
    requests: () => requests,
    handlers,
  };
}

function router(
  attached: string,
  options: Partial<ConstructorParameters<typeof WorkspaceRouter>[0]> &
    FakeOptions = {},
) {
  const { capabilities, listRoots, ...rest } = options;
  const fake = fakeServer({ capabilities, listRoots });
  const logs: string[] = [];
  const child = fakeChildCommand();
  const instance = new WorkspaceRouter({
    server: fake.server,
    workspaceRoot: attached,
    env: { PATH: process.env.PATH ?? "" },
    isRoutable: () => true,
    resolveChildCommand: () => child,
    log: (text) => logs.push(text),
    connectTimeoutMs: 20000,
    ...rest,
  });
  routers.push(instance);
  return { router: instance, fake, logs };
}

function remote(decision: RoutingDecision): Record<string, unknown> {
  if (decision.kind !== "remote") throw new Error("expected remote");
  return (
    decision.result as unknown as {
      structuredContent: { data: Record<string, unknown> };
    }
  ).structuredContent.data;
}

const why = {
  pinned:
    "this server is pinned to its workspace by KIBI_WORKSPACE (or an alias) and does not route calls",
  not_a_kibi_workspace:
    "no Kibi workspace (.kb/manifest.json) owns that directory",
  not_routable:
    "that workspace is neither a worktree of this server's repository nor under the client's MCP roots or KIBI_MCP_ROUTABLE_ROOTS",
};

function notice(
  attached: string,
  requested: string,
  resolved: string | null,
  reason: WorkspaceMismatchDiagnostic["detail"]["reason"],
  text: string,
  error?: string,
): WorkspaceMismatchDiagnostic {
  return {
    code: "workspace_mismatch",
    severity: "warning",
    message: `Answered from ${attached}, not from the requested workspace ${requested}: ${text}. Run the Kibi CLI from that directory if you need its knowledge base.`,
    detail: {
      requested,
      resolved,
      answeredFrom: attached,
      reason,
      ...(error ? { error } : {}),
    },
  };
}

describe("enabled", () => {
  test("pins, switches and routed children turn routing off", () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const env = (extra: Record<string, string>) =>
      router(attached, { env: { PATH: "", ...extra } }).router.enabled;
    expect(env({})).toBe(true);
    for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"]) {
      expect(env({ [key]: attached })).toBe(false);
      expect(env({ [key]: "  " })).toBe(true);
    }
    expect(env({ KIBI_MCP_ROUTING: " 0 " })).toBe(false);
    expect(env({ KIBI_MCP_ROUTING: "1" })).toBe(true);
    expect(env({ KIBI_MCP_ROUTED: " 1 " })).toBe(false);
    expect(env({ KIBI_MCP_ROUTED: "0" })).toBe(true);
  });

  test("shutdown turns routing off", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const { router: r } = router(attached);
    await r.shutdown();
    expect(r.enabled).toBe(false);
  });
});

describe("route without a workspace argument", () => {
  test("a disabled router hands back the very same arguments", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const { router: r, fake } = router(attached, {
      env: { PATH: "", KIBI_MCP_ROUTING: "0" },
      capabilities: { roots: {} },
    });
    const args = { q: 1 };
    const decision = await r.route("kb_search", args);
    expect(decision).toStrictEqual({ kind: "local", args });
    expect((decision as { args: unknown }).args).toBe(args);
    expect(fake.requests()).toBe(0);
  });

  test("without roots the same arguments answer locally", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const { router: r } = router(attached);
    const args = { q: 1 };
    const decision = await r.route("kb_search", args);
    expect((decision as { args: unknown }).args).toBe(args);
    expect(decision).toStrictEqual({ kind: "local", args: { q: 1 } });
  });

  test("a job poll without a known owner stays local", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const { router: r } = router(attached, { capabilities: { roots: {} } });
    expect(await r.route("kb_job_status", { jobId: 5 })).toStrictEqual({
      kind: "local",
      args: { jobId: 5 },
    });
  });

  test("roots route to the first root's workspace", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const plain = tempDir("kibi-rx-plain-");
    fs.mkdirSync(path.join(plain, ".git"));
    const seen: Array<[string, readonly string[]]> = [];
    const { router: r, fake } = router(attached, {
      capabilities: { roots: { listChanged: false } },
      isRoutable: (target, roots) => {
        seen.push([target, roots]);
        return true;
      },
    });
    fake.setRoots([plain, other]);
    const data = remote(await r.route("kb_search", { q: 1 }));
    expect(data.workspace).toBe(other);
    expect(data.args).toStrictEqual({ q: 1 });
    expect(seen).toStrictEqual([[other, [plain, other]]]);
  });
});

describe("route with a workspace argument", () => {
  test("blank or non-text values mean no preference", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const { router: r } = router(attached);
    for (const value of ["", "   ", 7, null])
      expect(
        await r.route("kb_search", { q: 1, [WORKSPACE_ROOT_ARGUMENT]: value }),
      ).toStrictEqual({ kind: "local", args: { q: 1 } });
  });

  test("blank values fall back to roots", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const { router: r, fake } = router(attached, {
      capabilities: { roots: {} },
    });
    fake.setRoots([other]);
    const data = remote(
      await r.route("kb_search", { q: 1, [WORKSPACE_ROOT_ARGUMENT]: " " }),
    );
    expect(data.workspace).toBe(other);
    expect(data.args).toStrictEqual({ q: 1 });
  });

  test("a disabled router strips the argument and says why it did not route", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const plain = tempDir("kibi-rx-plain-");
    fs.mkdirSync(path.join(plain, ".git"));
    const { router: r } = router(attached, {
      env: { PATH: "", KIBI_ROOT: attached },
    });
    expect(
      await r.route("kb_search", { q: 1, [WORKSPACE_ROOT_ARGUMENT]: "" }),
    ).toStrictEqual({ kind: "local", args: { q: 1 } });
    const keep = { [WORKSPACE_ROOT_ARGUMENT]: other };
    const check = await r.route("kb_check", keep);
    expect((check as { args: unknown }).args).toBe(keep);
    expect(
      await r.route("kb_search", {
        q: 1,
        [WORKSPACE_ROOT_ARGUMENT]: ` ${path.join(attached, "x")} `,
      }),
    ).toStrictEqual({ kind: "local", args: { q: 1 } });
    expect(
      await r.route("kb_search", { q: 1, [WORKSPACE_ROOT_ARGUMENT]: other }),
    ).toStrictEqual({
      kind: "local",
      args: { q: 1 },
      notice: notice(attached, other, other, "pinned", why.pinned),
    });
    expect(
      await r.route("kb_search", { [WORKSPACE_ROOT_ARGUMENT]: plain }),
    ).toStrictEqual({
      kind: "local",
      args: {},
      notice: notice(attached, plain, null, "pinned", why.pinned),
    });
  });

  test("a directory no workspace owns gets a notice, except for kb_check", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const plain = tempDir("kibi-rx-plain-");
    fs.mkdirSync(path.join(plain, ".git"));
    const { router: r } = router(attached);
    expect(
      await r.route("kb_search", { q: 1, [WORKSPACE_ROOT_ARGUMENT]: plain }),
    ).toStrictEqual({
      kind: "local",
      args: { q: 1 },
      notice: notice(
        attached,
        plain,
        null,
        "not_a_kibi_workspace",
        why.not_a_kibi_workspace,
      ),
    });
    const keep = { [WORKSPACE_ROOT_ARGUMENT]: plain };
    expect((await r.route("kb_check", keep)) as unknown).toStrictEqual({
      kind: "local",
      args: keep,
    });
  });

  test("an unroutable workspace gets a notice naming the boundary", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const { router: r } = router(attached, { isRoutable: () => false });
    expect(
      await r.route("kb_search", {
        [WORKSPACE_ROOT_ARGUMENT]: path.join(other, "sub"),
      }),
    ).toStrictEqual({
      kind: "local",
      args: {},
      notice: notice(
        attached,
        path.join(other, "sub"),
        other,
        "not_routable",
        why.not_routable,
      ),
    });
  });

  test("a child that cannot be resolved or started is reported", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const none = router(attached, { resolveChildCommand: () => null }).router;
    expect(
      await none.route("kb_search", { [WORKSPACE_ROOT_ARGUMENT]: other }),
    ).toStrictEqual({
      kind: "local",
      args: {},
      notice: notice(
        attached,
        other,
        other,
        "unavailable",
        "kibi-mcp could not be started there: no kibi-mcp entry resolves for that workspace",
        "no kibi-mcp entry resolves for that workspace",
      ),
    });
    const broken = router(attached, {
      resolveChildCommand: () => {
        throw new Error("spawn refused");
      },
    }).router;
    expect(
      await broken.route("kb_search", { [WORKSPACE_ROOT_ARGUMENT]: other }),
    ).toStrictEqual({
      kind: "local",
      args: {},
      notice: notice(
        attached,
        other,
        other,
        "unavailable",
        "kibi-mcp could not be started there: spawn refused",
        "spawn refused",
      ),
    });
    const text = router(attached, {
      resolveChildCommand: () => {
        throw "plain refusal";
      },
    }).router;
    const decision = await text.route("kb_search", {
      [WORKSPACE_ROOT_ARGUMENT]: other,
    });
    expect(
      (decision as { notice: { detail: { error: string } } }).notice.detail
        .error,
    ).toBe("plain refusal");
  });

  test("a child that never answers initialize times out", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const silent = fakeChildCommand("setInterval(() => {}, 1000);");
    const { router: r } = router(attached, {
      resolveChildCommand: () => silent,
      connectTimeoutMs: 200,
    });
    const decision = await r.route("kb_search", {
      [WORKSPACE_ROOT_ARGUMENT]: other,
    });
    expect(
      (decision as { notice: { detail: { error: string } } }).notice.detail
        .error,
    ).toBe(`kibi-mcp for ${other} initialize timed out after 200ms`);
  });
});

describe("children", () => {
  test("a routed child is pinned, named in the log and its stderr is labelled", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const writes: string[] = [];
    const stderr = spyOn(process.stderr, "write").mockImplementation(((
      chunk: string,
    ) => {
      writes.push(String(chunk));
      return true;
    }) as never);
    try {
      const { router: r, logs } = router(attached, {
        env: { PATH: process.env.PATH ?? "", EXTRA_FLAG: "x" },
      });
      const data = remote(
        await r.route("kb_status", {
          [WORKSPACE_ROOT_ARGUMENT]: other,
          async: true,
        }),
      );
      expect(data.workspace).toBe(other);
      expect(data.routed).toBe("1");
      expect(logs).toStrictEqual([`Serving ${other} through its own kibi-mcp`]);
      for (let i = 0; i < 50 && writes.length < 2; i++) await Bun.sleep(20);
      const label = `[kibi-mcp ${path.basename(other)}]`;
      expect(writes).toStrictEqual([
        `${label} line one\n`,
        `${label} line two\n`,
      ]);
      // The job it started is polled in the same child.
      const polled = remote(
        await r.route("kb_job_status", { jobId: data.jobId }),
      );
      expect(polled.pid).toBe(data.pid);
      await r.shutdown();
      expect(
        await r.route("kb_job_status", { jobId: data.jobId }),
      ).toStrictEqual({ kind: "local", args: { jobId: data.jobId } });
    } finally {
      stderr.mockRestore();
    }
  });

  test("concurrent calls for one workspace share one child start", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const { router: r, logs } = router(attached);
    const [a, b] = await Promise.all([
      r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: other }),
      r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: other }),
    ]);
    expect(remote(a).pid).toBe(remote(b).pid);
    expect(logs).toHaveLength(1);
  });

  test("an idle child is retired, a busy one is not", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const { router: r } = router(attached, { idleRetireMs: 100 });
    const busy = remote(
      await r.route("kb_status", {
        [WORKSPACE_ROOT_ARGUMENT]: other,
        slow: true,
      }),
    );
    const again = remote(
      await r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: other }),
    );
    expect(again.pid).toBe(busy.pid);
    await Bun.sleep(400);
    const fresh = remote(
      await r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: other }),
    );
    expect(fresh.pid).not.toBe(busy.pid);
  });

  test("a child whose client fails to close is still retired", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const { router: r } = router(attached);
    remote(await r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: other }));
    const original = Client.prototype.close;
    const close = spyOn(Client.prototype, "close").mockImplementation(
      async function (this: Client) {
        await original.call(this);
        throw new Error("already closed");
      },
    );
    try {
      await r.shutdown();
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      close.mockRestore();
    }
  });

  test("a workspace path that does not exist is compared as written", async () => {
    const missing = path.join(os.tmpdir(), "kibi-rx-missing-root", "ws");
    const { router: r } = router(`${missing}/.`, {
      resolveWorkspace: () => missing,
      env: { PATH: process.env.PATH ?? "", KIBI_WORKSPACE: missing },
    });
    expect(
      await r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: "/elsewhere" }),
    ).toStrictEqual({ kind: "local", args: {} });
  });

  test("a full pool of busy children is not evicted", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const a = kibiWorkspace("kibi-rx-a-");
    const b = kibiWorkspace("kibi-rx-b-");
    let clock = 0;
    const { router: r } = router(attached, {
      maxChildren: 1,
      now: () => clock++,
    });
    const slow = r.route("kb_status", {
      [WORKSPACE_ROOT_ARGUMENT]: a,
      slow: true,
    });
    await Bun.sleep(150);
    const second = remote(
      await r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: b }),
    );
    const first = remote(await slow);
    expect(second.workspace).toBe(b);
    expect(first.workspace).toBe(a);
    // Both children survive: the busy one was never evicted.
    const againA = remote(
      await r.route("kb_status", { [WORKSPACE_ROOT_ARGUMENT]: a }),
    );
    expect(againA.pid).toBe(first.pid);
  });
});

describe("client roots", () => {
  test("a list_changed client is asked once until it reports a change", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const { router: r, fake } = router(attached, {
      capabilities: { roots: { listChanged: true } },
    });
    await r.route("kb_search", {});
    await r.route("kb_search", {});
    expect(fake.requests()).toBe(1);
    expect(fake.handlers).toHaveLength(1);
    for (const handler of fake.handlers) await handler();
    await r.route("kb_search", {});
    expect(fake.requests()).toBe(2);
    expect(fake.handlers).toHaveLength(1);
  });

  test("non-file roots are skipped", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    const { router: r } = router(attached, {
      capabilities: { roots: {} },
      listRoots: async () => ({
        roots: [{ uri: "https://example.test/x" }, { uri: `file://${other}` }],
      }),
    });
    expect(remote(await r.route("kb_search", {})).workspace).toBe(other);
  });

  test("a failing roots/list is logged and the cached roots are used", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const other = kibiWorkspace("kibi-rx-other-");
    let fail: unknown = null;
    const { router: r, logs } = router(attached, {
      capabilities: { roots: {} },
      listRoots: async () => {
        if (fail !== null) throw fail;
        return { roots: [{ uri: `file://${other}` }] };
      },
    });
    expect(remote(await r.route("kb_search", {})).workspace).toBe(other);
    fail = new Error("client gone");
    expect(remote(await r.route("kb_search", {})).workspace).toBe(other);
    fail = "text failure";
    await r.route("kb_search", {});
    expect(logs.filter((line) => line.startsWith("roots/list"))).toStrictEqual([
      `roots/list failed; answering from ${attached}: client gone`,
      `roots/list failed; answering from ${attached}: text failure`,
    ]);
  });

  test("a failing first roots/list answers locally", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const { router: r, logs } = router(attached, {
      capabilities: { roots: {} },
      rootsTimeoutMs: 50,
      listRoots: () => new Promise(() => undefined),
    });
    expect(await r.route("kb_search", { q: 1 })).toStrictEqual({
      kind: "local",
      args: { q: 1 },
    });
    expect(logs).toStrictEqual([
      `roots/list failed; answering from ${attached}: roots/list timed out after 50ms`,
    ]);
  });
});

describe("defaults and helpers", () => {
  test("the default log writes a labelled stderr line", async () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const writes: string[] = [];
    const stderr = spyOn(process.stderr, "write").mockImplementation(((
      chunk: string,
    ) => {
      writes.push(String(chunk));
      return true;
    }) as never);
    try {
      const fake = fakeServer({
        capabilities: { roots: {} },
        listRoots: async () => {
          throw new Error("nope");
        },
      });
      const r = new WorkspaceRouter({
        server: fake.server,
        workspaceRoot: attached,
        env: { PATH: "" },
      });
      routers.push(r);
      await r.route("kb_search", {});
      expect(writes).toStrictEqual([
        `[kibi-mcp] roots/list failed; answering from ${attached}: nope\n`,
      ]);
    } finally {
      stderr.mockRestore();
    }
  });

  test("the active router can be set and cleared", () => {
    const attached = kibiWorkspace("kibi-rx-main-");
    const { router: r } = router(attached);
    const previous = getWorkspaceRouter();
    try {
      setWorkspaceRouter(r);
      expect(getWorkspaceRouter()).toBe(r);
      setWorkspaceRouter(undefined);
      expect(getWorkspaceRouter()).toBeUndefined();
    } finally {
      setWorkspaceRouter(previous);
    }
  });

  test("withWorkspaceRootSchema adds the argument to any input schema", () => {
    const tools: { name: string; inputSchema: Record<string, unknown> }[] = [
      { name: "a", inputSchema: { type: "object", properties: { q: 1 } } },
      { name: "b", inputSchema: { type: "object", properties: [1] } },
      { name: "c", inputSchema: { type: "object" } },
    ];
    expect(withWorkspaceRootSchema(tools) as unknown).toStrictEqual([
      {
        name: "a",
        inputSchema: {
          type: "object",
          properties: { q: 1, workspaceRoot: WORKSPACE_ROOT_SCHEMA },
        },
      },
      {
        name: "b",
        inputSchema: {
          type: "object",
          properties: { workspaceRoot: WORKSPACE_ROOT_SCHEMA },
        },
      },
      {
        name: "c",
        inputSchema: {
          type: "object",
          properties: { workspaceRoot: WORKSPACE_ROOT_SCHEMA },
        },
      },
    ]);
    expect(WORKSPACE_ROOT_SCHEMA.type).toBe("string");
    expect(WORKSPACE_ROOT_ARGUMENT).toBe("workspaceRoot");
  });

  test("workspaceFromRoots takes the first root a workspace owns", () => {
    expect(
      workspaceFromRoots(["/a", "/b", "/c"], (dir) =>
        dir === "/a" ? null : `${dir}-ws`,
      ),
    ).toBe("/b-ws");
    expect(workspaceFromRoots(["/a"], () => null)).toBeNull();
    expect(workspaceFromRoots([], () => "/x")).toBeNull();
  });
});
