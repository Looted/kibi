import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { PrologPort } from "kibi-runtime";
import {
  createGitWorkspace,
  git,
  isolateKibiEnv,
  removeTempDir,
} from "../../../cli/tests/helpers/in-process-workspace.js";
import {
  type McpSession,
  createMcpRuntime,
} from "../../src/runtime/mcp-runtime.js";

const roots: string[] = [];
const originalWarn = console.warn;
let restoreEnv: (() => void) | undefined;

beforeEach(() => {
  restoreEnv = isolateKibiEnv();
});

afterEach(() => {
  restoreEnv?.();
  console.warn = originalWarn;
  for (const root of roots.splice(0)) removeTempDir(root);
});

function port(): PrologPort {
  return {
    query: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
}

function session(
  workspaceRoot: string,
  extra: Partial<McpSession> = {},
): McpSession {
  return {
    workspaceRoot,
    attachedBranchKbPath: () => null,
    ensureProlog: async () => port(),
    adaptProlog: (value) => value,
    refreshAttachedBranchStamp: async () => undefined,
    ...extra,
  };
}

/** A checkout whose HEAD is detached on a commit no local branch names. */
function detachedWorkspace(): string {
  const root = createGitWorkspace();
  roots.push(root);
  git(root, "checkout -q --detach HEAD");
  git(root, "branch -q -D main");
  git(root, "commit --allow-empty --no-verify -q -m detached");
  return root;
}

const spec = (
  name: string,
  effects: readonly string[],
  requiresProlog = false,
) =>
  ({
    name,
    effects,
    requiresProlog,
    execute: async () => ({}),
  }) as never;

describe("createMcpRuntime on a detached HEAD", () => {
  test("refuses a write with the way out", async () => {
    const root = detachedWorkspace();
    const head = git(root, "rev-parse HEAD").trim();
    const runtime = createMcpRuntime(session(root));
    await expect(runtime.open(spec("kb_upsert", ["kb-write"]))).rejects.toThrow(
      `kb_upsert writes the branch KB, but HEAD is detached at ${head.slice(0, 12)} and no local branch points at it. Check out a branch first: 'git switch -c <branch>', or set KIBI_BRANCH to name the branch explicitly. Read-only operations (search, query, status, check, coverage, graph) keep working on a detached HEAD from a read-only snapshot of the checkout.`,
    );
    await expect(
      runtime.open(spec("kb_init", ["workspace-write"])),
    ).rejects.toThrow("kb_init writes the branch KB");
  });

  test("an operation that does not read the KB gets no attachment", async () => {
    const root = detachedWorkspace();
    const runtime = createMcpRuntime(session(root));
    const context = await runtime.open(spec("kb_skills", ["local-read"]));
    expect(context.workspaceRoot).toBe(root);
    expect("branchAttachment" in context).toBe(false);
  });

  test("a KB read attaches the read-only snapshot of the checkout", async () => {
    const root = detachedWorkspace();
    const head = git(root, "rev-parse HEAD").trim();
    const runtime = createMcpRuntime(session(root));
    const context = await runtime.open(spec("kb_status", ["kb-read"]));
    expect(context.branchAttachment?.kind).toBe("detached_snapshot");
    expect(context.branchAttachment?.readOnly?.head).toBe(head);
  });

  test("a snapshot that fails to compile warns for a status-style read", async () => {
    const root = detachedWorkspace();
    mkdirSync(path.join(root, ".kb"));
    writeFileSync(path.join(root, ".kb", "branches"), "not a directory\n");
    const warn = mock();
    console.warn = warn as typeof console.warn;
    const runtime = createMcpRuntime(session(root));
    const context = await runtime.open(spec("kb_status", ["kb-read"]));
    expect("branchAttachment" in context).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toStartWith(
      "[KIBI-MCP] Failed to compile the read-only snapshot for this detached HEAD: ",
    );
  });

  test("a snapshot that fails to compile fails an engine-backed read", async () => {
    const root = detachedWorkspace();
    mkdirSync(path.join(root, ".kb"));
    writeFileSync(path.join(root, ".kb", "branches"), "not a directory\n");
    const warn = mock();
    console.warn = warn as typeof console.warn;
    const runtime = createMcpRuntime(session(root));
    await expect(
      runtime.open(spec("kb_query", ["kb-read"], true)),
    ).rejects.toThrow(
      "Failed to compile the read-only snapshot for this detached HEAD: ",
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("createMcpRuntime context", () => {
  test("injected plugins, as a registry or a factory, are what ensurePlugins answers", async () => {
    const registry = { id: "registry" } as never;
    const fromObject = await createMcpRuntime(
      session("/workspace", { plugins: registry }),
    ).open(spec("kb_skills", ["local-read"]));
    expect(await fromObject.ensurePlugins?.()).toBe(registry);
    expect(fromObject.plugins).toBe(registry);

    const factory = async () => registry;
    const fromFactory = await createMcpRuntime(session("/workspace")).open(
      spec("kb_skills", ["local-read"]),
      { plugins: factory },
    );
    expect(await fromFactory.ensurePlugins?.()).toBe(registry);
    expect(fromFactory.plugins).toBe(factory);
  });

  test("without injected plugins the registry is cached per runtime", async () => {
    const runtime = createMcpRuntime(session("/workspace"));
    const first = await runtime.open(spec("kb_skills", ["local-read"]));
    const second = await runtime.open(spec("kb_skills", ["local-read"]));
    expect("plugins" in first).toBe(false);
    const registry = await first.ensurePlugins?.();
    expect(registry).toBeDefined();
    expect(await second.ensurePlugins?.()).toBe(registry);
    const other = await createMcpRuntime(session("/workspace")).open(
      spec("kb_skills", ["local-read"]),
    );
    expect(await other.ensurePlugins?.()).not.toBe(registry);
  });

  test("ports, signal, clock and progress come from options before the session", async () => {
    const sessionFs = { name: "session-fs" } as never;
    const sessionGit = { name: "session-git" } as never;
    const sessionNet = { name: "session-net" } as never;
    const sessionSignal = new AbortController().signal;
    const sessionClock = () => new Date(1);
    const runtime = createMcpRuntime(
      session("/workspace", {
        fs: sessionFs,
        git: sessionGit,
        net: sessionNet,
        signal: sessionSignal,
        clock: sessionClock,
      }),
    );
    const fromSession = await runtime.open(spec("kb_skills", ["local-read"]));
    expect(fromSession.fs).toBe(sessionFs);
    expect(fromSession.sourceFirst).toBe(true);
    expect(fromSession.git).toBe(sessionGit);
    expect(fromSession.net).toBe(sessionNet);
    expect(fromSession.signal).toBe(sessionSignal);
    expect(fromSession.clock).toBe(sessionClock);
    expect("onProgress" in fromSession).toBe(false);

    const fs = { name: "fs" } as never;
    const gitPort = { name: "git" } as never;
    const net = { name: "net" } as never;
    const signal = new AbortController().signal;
    const clock = () => new Date(2);
    const onProgress = () => undefined;
    const fromOptions = await runtime.open(spec("kb_skills", ["local-read"]), {
      fs,
      git: gitPort,
      net,
      signal,
      clock,
      onProgress,
      workspaceRoot: "/other",
    });
    expect(fromOptions.fs).toBe(fs);
    expect(fromOptions.git).toBe(gitPort);
    expect(fromOptions.net).toBe(net);
    expect(fromOptions.signal).toBe(signal);
    expect(fromOptions.clock).toBe(clock);
    expect(fromOptions.onProgress).toBe(onProgress);
    expect(fromOptions.workspaceRoot).toBe("/other");
  });

  test("defaults give a live signal, a wall clock and no ports", async () => {
    const context = await createMcpRuntime(session("/workspace")).open(
      spec("kb_skills", ["local-read"]),
    );
    expect(context.signal.aborted).toBe(false);
    const before = Date.now();
    const now = context.clock().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
    for (const key of ["fs", "sourceFirst", "git", "net", "plugins", "prolog"])
      expect(key in context).toBe(false);
  });

  test("an operation without Prolog keeps an injected port and never starts the session engine", async () => {
    const provided = port();
    const ensure = mock(async () => port());
    const runtime = createMcpRuntime(
      session("/workspace", { ensureProlog: ensure }),
    );
    const context = await runtime.open(spec("kb_status", ["local-read"]), {
      prolog: provided,
    });
    expect(context.prolog).toBe(provided);
    expect(await context.ensureProlog?.()).toBe(provided);
    expect(ensure).not.toHaveBeenCalled();
    expect(runtime.sessionProlog(context)).toBeUndefined();
  });

  test("a lazily started engine is adapted and remembered for the context", async () => {
    const raw = port();
    const adapted = port();
    const adapt = mock(() => adapted);
    const runtime = createMcpRuntime(
      session("/workspace", {
        ensureProlog: async () => raw,
        adaptProlog: adapt,
      }),
    );
    const context = await runtime.open(spec("kb_status", ["local-read"]));
    expect(runtime.sessionProlog(context)).toBeUndefined();
    expect(await context.ensureProlog?.()).toBe(adapted);
    expect(runtime.sessionProlog(context)).toBe(raw);
    expect(await context.ensureProlog?.()).toBe(adapted);
    expect(adapt).toHaveBeenCalledTimes(2);
    expect((adapt.mock.calls as unknown[][])[1]?.[0]).toBe(raw);
    await runtime.close(context, { status: "success" } as never);
    expect(runtime.sessionProlog(context)).toBeUndefined();
  });

  test("an engine-backed operation gets the adapted session engine", async () => {
    const raw = port();
    const adapted = port();
    const runtime = createMcpRuntime(
      session("/workspace", {
        ensureProlog: async () => raw,
        adaptProlog: () => adapted,
      }),
    );
    const context = await runtime.open(spec("kb_query", ["kb-read"], true));
    expect(context.prolog).toBe(adapted);
    expect(runtime.sessionProlog(context)).toBe(raw);
  });

  test("the branch stamp is refreshed only after a write on an attached branch", async () => {
    const refresh = mock(async () => undefined);
    let kbPath: string | null = null;
    const runtime = createMcpRuntime(
      session("/workspace", {
        attachedBranchKbPath: () => kbPath,
        refreshAttachedBranchStamp: refresh,
      }),
    );
    const context = {} as never;
    await runtime.afterSuccess(spec("kb_upsert", ["kb-write"]), context);
    expect(refresh).not.toHaveBeenCalled();
    kbPath = "/workspace/.kb/branches/main";
    await runtime.afterSuccess(spec("kb_query", ["kb-read"]), context);
    expect(refresh).not.toHaveBeenCalled();
    await runtime.afterSuccess(spec("kb_upsert", ["kb-write"]), context);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test("close works without a cleanup hook and passes the outcome to one", async () => {
    await createMcpRuntime(session("/workspace")).close(
      {} as never,
      {
        status: "error",
      } as never,
    );
    const cleanup = mock(async () => undefined);
    const context = {} as never;
    await createMcpRuntime(
      session("/workspace", { requestCleanup: cleanup }),
    ).close(context, { status: "error" } as never);
    expect((cleanup.mock.calls as unknown[][])[0]).toStrictEqual([
      context,
      { status: "error" },
    ]);
  });
});
