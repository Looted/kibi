import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as sync from "../../src/commands/sync.js";
import { EngineClient } from "../../src/engine.js";
import { CapabilityRegistry } from "../../src/plugins/registry.js";
import * as storeLock from "../../src/prolog/store-lock.js";
import {
  nodeFilesystem,
  nodeGit,
  nodeNetwork,
} from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
  RuntimeOptions,
} from "../../src/public/operations/runtime-types.js";
import {
  attachmentFailureMessage,
  createCliRuntime,
} from "../../src/runtime/cli-runtime.js";
import * as autoCompile from "../../src/utils/auto-compile.js";
import {
  type BranchResolverDeps,
  _setBranchResolverDepsForTests,
  resolveReadBranchAttachment,
} from "../../src/utils/branch-resolver.js";
import {
  branchStorePath,
  legacyBranchStorePath,
} from "../../src/utils/branch-store-locator.js";

const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), "kibi-rt-open-")));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let counter = 0;
const fresh = (name = "w") => {
  const dir = path.join(base, `${name}${counter++}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const SHOW = "git branch --show-current";
const POINTS = "git branch --points-at HEAD --format=%(refname:short)";
const VERIFY = "git rev-parse --verify HEAD";
function git(answers: Record<string, string>): void {
  const answer = (command: string) => {
    if (command.startsWith("git check-ref-format --branch")) return "";
    const value = answers[command];
    if (value === undefined) throw new Error(`unexpected ${command}`);
    return value;
  };
  _setBranchResolverDepsForTests({
    execSync: ((command: string) =>
      answer(command)) as BranchResolverDeps["execSync"],
    execFileSync: ((file: string, args: string[]) =>
      answer([file, ...args].join(" "))) as BranchResolverDeps["execFileSync"],
  });
}
const onBranch = () =>
  git({ [SHOW]: "main", [POINTS]: "main\n", [VERIFY]: HEAD });
const detached = () =>
  git({ [SHOW]: "", [POINTS]: "a\nb\n", [VERIFY]: `${HEAD}\n` });
const badBranch = () =>
  git({ [SHOW]: "bad name", [POINTS]: "", [VERIFY]: HEAD });

type Call = [string, ...unknown[]];
const OK: PrologQueryResult = { success: true, bindings: {} };

/** A Prolog port that records each call with its arguments. */
function fakePort(
  options: {
    attach?: PrologQueryResult;
    entities?: boolean;
    lifecycle?: boolean;
    execute?: "execute" | "command";
  } = {},
) {
  const calls: Call[] = [];
  const port: Record<string, unknown> = {
    extra: "passthrough",
    query: async (goal: string, signal?: AbortSignal) => {
      calls.push(["query", goal, signal]);
      return options.attach ?? OK;
    },
    nextSolution: async () => null,
    save: async (signal?: AbortSignal) => {
      calls.push(["save", signal]);
      return OK;
    },
  };
  if (options.entities) {
    port.queryEntities = async (input: unknown, signal?: AbortSignal) => {
      calls.push(["queryEntities", input, signal]);
      return { entities: [], count: 0 };
    };
    port.searchEntities = async (input: unknown, signal?: AbortSignal) => {
      calls.push(["searchEntities", input, signal]);
      return { entities: [], count: 1 };
    };
  }
  if (options.lifecycle) {
    port.start = async () => {
      calls.push(["start"]);
    };
    port.terminate = async () => {
      calls.push(["terminate"]);
    };
  }
  if (options.execute) {
    port[options.execute] = async function (
      this: unknown,
      command: unknown,
      signal?: AbortSignal,
    ) {
      calls.push([options.execute as string, command, signal, this === port]);
      return "ran";
    };
  }
  return { port: port as unknown as PrologPort, calls };
}

const readSpec = (effects: string[] = ["kb-read"], requiresProlog = true) =>
  ({ name: "probe", effects, requiresProlog }) as unknown as Parameters<
    ReturnType<typeof createCliRuntime>["open"]
  >[0];

let saved: Record<string, string | undefined>;
const ENV = ["KIBI_BRANCH", "KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"];
let syncSpy: ReturnType<typeof spyOn<typeof sync, "syncCommand">>;
let warn: ReturnType<typeof spyOn<Console, "warn">>;
const engineCalls: Call[] = [];
const restores: Array<{ mockRestore(): void }> = [];
beforeEach(() => {
  saved = Object.fromEntries(ENV.map((name) => [name, process.env[name]]));
  for (const name of ENV) delete process.env[name];
  syncSpy = spyOn(sync, "syncCommand").mockResolvedValue(
    undefined as unknown as Awaited<ReturnType<typeof sync.syncCommand>>,
  );
  warn = spyOn(console, "warn").mockImplementation(() => undefined);
  engineCalls.length = 0;
  restores.push(
    spyOn(EngineClient.prototype, "start").mockImplementation(async function (
      this: EngineClient,
    ) {
      engineCalls.push(["start", this]);
    }),
    spyOn(EngineClient.prototype, "terminate").mockImplementation(
      async function (this: EngineClient) {
        engineCalls.push(["terminate", this]);
      },
    ),
  );
});
afterEach(() => {
  syncSpy.mockRestore();
  warn.mockRestore();
  for (const restore of restores.splice(0)) restore.mockRestore();
  _setBranchResolverDepsForTests({});
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

const warnings = () => warn.mock.calls.map((call) => String(call[0]));

describe("attachmentFailureMessage", () => {
  test("outside Git names KIBI_BRANCH, otherwise the resolution error", () => {
    for (const code of ["NOT_A_GIT_REPO", "GIT_NOT_AVAILABLE"] as const) {
      expect(attachmentFailureMessage({ error: "x", code })).toBe(
        "Kibi requires an active Git branch outside a repository; set KIBI_BRANCH explicitly for a standalone workspace.",
      );
    }
    expect(
      attachmentFailureMessage({ error: "detached", code: "DETACHED_HEAD" }),
    ).toBe("Failed to resolve active branch: detached");
  });
});

describe("context basics", () => {
  test("the workspace root comes from options, then the environment, then cwd", async () => {
    const root = fresh();
    onBranch();
    const runtime = createCliRuntime();
    const open = (options: RuntimeOptions = {}) =>
      runtime.open(readSpec(["workspace-read"], false), options);
    expect((await open()).workspaceRoot).toBe(process.cwd());
    process.env.KIBI_ROOT = path.join(root, "r");
    expect((await open()).workspaceRoot).toBe(path.join(root, "r"));
    process.env.KIBI_PROJECT_ROOT = path.join(root, "p");
    expect((await open()).workspaceRoot).toBe(path.join(root, "p"));
    process.env.KIBI_WORKSPACE = path.join(root, "w");
    expect((await open()).workspaceRoot).toBe(path.join(root, "w"));
    expect((await open({ workspaceRoot: "rel" })).workspaceRoot).toBe(
      path.resolve("rel"),
    );
    expect(
      (
        await createCliRuntime({ workspaceRoot: root }).open(
          readSpec(["workspace-read"], false),
        )
      ).workspaceRoot,
    ).toBe(root);
  });

  test("defaults the signal, clock and ports; keeps supplied ones", async () => {
    const root = fresh();
    const runtime = createCliRuntime({ workspaceRoot: root });
    const context = await runtime.open(readSpec(["workspace-read"], false));
    expect(context.signal).toBeInstanceOf(AbortSignal);
    expect(context.signal.aborted).toBe(false);
    expect(context.clock()).toBeInstanceOf(Date);
    expect(context.git).toBe(nodeGit);
    expect(context.fs).toBe(nodeFilesystem);
    expect(context.net).toBe(nodeNetwork);
    expect("plugins" in context).toBe(false);
    expect("prolog" in context).toBe(false);
    expect("engine" in context).toBe(false);
    expect("branchAttachment" in context).toBe(false);

    const signal = new AbortController().signal;
    const clock = () => new Date(0);
    const ports = {
      git: {} as typeof nodeGit,
      fs: {} as typeof nodeFilesystem,
      net: {} as typeof nodeNetwork,
    };
    const supplied = await runtime.open(readSpec(["workspace-read"], false), {
      signal,
      clock,
      ...ports,
    });
    expect(supplied.signal).toBe(signal);
    expect(supplied.clock).toBe(clock);
    expect(supplied.git).toBe(ports.git);
    expect(supplied.fs).toBe(ports.fs);
    expect(supplied.net).toBe(ports.net);
    expect(await runtime.afterSuccess(readSpec(), supplied)).toBeUndefined();
  });

  test("plugins are injected as a registry or a factory, or loaded per runtime", async () => {
    const root = fresh();
    const registry = { id: "injected" } as unknown as CapabilityRegistry;
    const runtime = createCliRuntime({ workspaceRoot: root });
    const spec = readSpec(["workspace-read"], false);
    const direct = await runtime.open(spec, { plugins: registry });
    expect(direct.plugins).toBe(registry);
    expect(await direct.ensurePlugins?.()).toBe(registry);
    const factory = mock(async () => registry);
    const lazy = await runtime.open(spec, { plugins: factory });
    expect(lazy.plugins).toBe(factory);
    expect(factory).not.toHaveBeenCalled();
    expect(await lazy.ensurePlugins?.()).toBe(registry);
    expect(factory).toHaveBeenCalledTimes(1);
    const loaded = await runtime.open(spec);
    const first = await loaded.ensurePlugins?.();
    expect(first).toBeInstanceOf(CapabilityRegistry);
    expect(await (await runtime.open(spec)).ensurePlugins?.()).toBe(
      first as CapabilityRegistry,
    );
    const other = await createCliRuntime({ workspaceRoot: root }).open(spec);
    expect(await other.ensurePlugins?.()).not.toBe(first as CapabilityRegistry);
  });
});

describe("the injected Prolog port", () => {
  test("binds the operation signal to every query and save", async () => {
    const root = fresh();
    onBranch();
    const { port, calls } = fakePort({ entities: true });
    const signal = new AbortController().signal;
    const context = await createCliRuntime({ workspaceRoot: root }).open(
      readSpec(["workspace-read"], false),
      { prolog: port, signal },
    );
    const prolog = context.prolog as PrologPort;
    const page = { limit: 1, offset: 0 };
    const search = { query: "q", limit: 1, offset: 0 };
    await prolog.query("goal");
    await prolog.queryEntities?.(page);
    await prolog.searchEntities?.(search);
    await prolog.save();
    expect(calls).toEqual([
      ["query", "goal", signal],
      ["queryEntities", page, signal],
      ["searchEntities", search, signal],
      ["save", signal],
    ]);
    expect((prolog as unknown as { extra: string }).extra).toBe("passthrough");
    expect(await context.ensureProlog?.()).not.toBe(port);
    await (await (context.ensureProlog as () => Promise<PrologPort>)()).query(
      "again",
    );
    expect(calls.at(-1)).toEqual(["query", "again", signal]);
    expect(engineCalls).toEqual([]);
  });

  test("optional page and search queries stay optional", async () => {
    const root = fresh();
    const { port } = fakePort();
    const context = await createCliRuntime({ workspaceRoot: root }).open(
      readSpec(["workspace-read"], false),
      { prolog: port },
    );
    const prolog = context.prolog as PrologPort;
    expect(
      await prolog.queryEntities?.({ limit: 1, offset: 0 }),
    ).toBeUndefined();
    expect(
      await prolog.searchEntities?.({ query: "q", limit: 1, offset: 0 }),
    ).toBeUndefined();
  });

  test("an engine port wraps execute, or command, with the signal", async () => {
    const root = fresh();
    const signal = new AbortController().signal;
    const own = new AbortController().signal;
    const command = { version: 1, kind: "status" } as const;
    for (const kind of ["execute", "command"] as const) {
      const { port, calls } = fakePort({ execute: kind });
      const context = await createCliRuntime({ workspaceRoot: root }).open(
        readSpec(["workspace-read"], false),
        { prolog: port, signal },
      );
      expect<unknown>(await context.engine?.execute(command)).toBe("ran");
      expect<unknown>(await context.engine?.execute(command, own)).toBe("ran");
      expect(calls).toEqual([
        [kind, command, signal, true],
        [kind, command, own, true],
      ]);
    }
  });
});

describe("operations that may run without Prolog", () => {
  test("a detached KB read compiles the snapshot and reports its attachment", async () => {
    const root = fresh();
    detached();
    const context = await createCliRuntime({ workspaceRoot: root }).open(
      readSpec(["kb-read"], false),
    );
    const attachment = resolveReadBranchAttachment(root);
    expect<unknown>(context.branchAttachment).toStrictEqual(attachment);
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(warnings()).toEqual([
      `[KIBI] ${"readOnly" in attachment ? attachment.readOnly?.notice : ""}`,
    ]);
  });

  test("a failed snapshot compile is reported, not fatal", async () => {
    const root = fresh();
    detached();
    const runtime = createCliRuntime({ workspaceRoot: root });
    syncSpy.mockRejectedValueOnce(new Error("locked"));
    const context = await runtime.open(readSpec(["kb-read"], false));
    expect(context.branchAttachment?.kind).toBe("detached_snapshot");
    expect(warnings()[1]).toBe(
      "[KIBI] Failed to compile the read-only snapshot for this detached HEAD: locked",
    );
  });

  test("no snapshot for writes, workspace reads, branches or resolution errors", async () => {
    const root = fresh();
    const runtime = createCliRuntime({ workspaceRoot: root });
    detached();
    for (const effects of [["kb-read", "kb-write"], ["workspace-read"]]) {
      const context = await runtime.open(readSpec(effects, false));
      expect("branchAttachment" in context).toBe(false);
    }
    onBranch();
    expect(
      "branchAttachment" in (await runtime.open(readSpec(["kb-read"], false))),
    ).toBe(false);
    badBranch();
    expect(
      "branchAttachment" in (await runtime.open(readSpec(["kb-read"], false))),
    ).toBe(false);
    expect(syncSpy).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  test("the engine starts on first use, once, on the attached branch", async () => {
    const root = fresh();
    onBranch();
    const runtime = createCliRuntime({ workspaceRoot: root });
    const context = await runtime.open(readSpec(["workspace-read"], false));
    expect(engineCalls).toEqual([]);
    const first = await context.ensureProlog?.();
    const engine = engineCalls[0]?.[1] as EngineClient;
    expect(engineCalls).toEqual([["start", engine]]);
    expect(engine).toBeInstanceOf(EngineClient);
    expect((first as unknown as { branch: string }).branch).toBe("main");
    expect(
      (engine as unknown as { workspaceRoot: string; timeout: number }).timeout,
    ).toBe(120_000);
    expect((engine as unknown as { workspaceRoot: string }).workspaceRoot).toBe(
      root,
    );
    await context.ensureProlog?.();
    expect(engineCalls).toHaveLength(1);
    await runtime.close(context, { status: "success", result: null });
    expect(engineCalls).toEqual([
      ["start", engine],
      ["terminate", engine],
    ]);
    await runtime.close(context, { status: "success", result: null });
    expect(engineCalls).toHaveLength(2);
  });

  test("a detached read starts the engine on the snapshot store", async () => {
    const root = fresh();
    detached();
    const context = await createCliRuntime({ workspaceRoot: root }).open(
      readSpec(["kb-read"], false),
    );
    _setBranchResolverDepsForTests({});
    badBranch();
    const prolog = await context.ensureProlog?.();
    expect((prolog as unknown as { branch: string }).branch).toBe(
      context.branchAttachment?.kbBranch as string,
    );
  });

  test("first use fails when no branch resolves", async () => {
    const root = fresh();
    badBranch();
    const context = await createCliRuntime({ workspaceRoot: root }).open(
      readSpec(["workspace-read"], false),
    );
    await expect(
      context.ensureProlog?.() as Promise<PrologPort>,
    ).rejects.toThrow(
      "Failed to resolve active branch: Invalid branch name detected: 'bad name'",
    );
    expect(engineCalls).toEqual([]);
  });
});

describe("operations that require Prolog", () => {
  test("an injected port attaches the branch store by its quoted path", async () => {
    const root = fresh("it's-");
    onBranch();
    const record = mock(() => undefined);
    restores.push(
      spyOn(storeLock, "noteDeadHolderBeforeAttach").mockReturnValue(record),
    );
    const { port, calls } = fakePort({ lifecycle: true, execute: "execute" });
    const signal = new AbortController().signal;
    const runtime = createCliRuntime({ workspaceRoot: root });
    const context = await runtime.open(readSpec(), { prolog: port, signal });
    const storePath = branchStorePath(root, "main");
    expect(calls.slice(0, 2)).toEqual([
      ["start"],
      ["query", `kb_attach('${storePath.replaceAll("'", "''")}')`, signal],
    ]);
    expect(record).toHaveBeenCalledTimes(1);
    expect(context.branchAttachment).toMatchObject({ kbBranch: "main" });
    expect(context.engine).toBeDefined();
    expect(warn).not.toHaveBeenCalled();
    await runtime.close(context, { status: "success", result: null });
    expect(calls.at(-1)).toEqual(["terminate"]);
    expect(engineCalls).toEqual([]);
  });

  test("a port without lifecycle hooks or an engine still opens and closes", async () => {
    const root = fresh();
    onBranch();
    const { port } = fakePort();
    const runtime = createCliRuntime({ workspaceRoot: root });
    const context = await runtime.open(readSpec(), { prolog: port });
    expect("engine" in context).toBe(false);
    await runtime.close(context, { status: "success", result: null });
    await runtime.close({} as OperationContext, {
      status: "success",
      result: null,
    });
  });

  test("a failed attach retries after a stale lock, or fails and terminates", async () => {
    const root = fresh();
    onBranch();
    const record = mock(() => undefined);
    restores.push(
      spyOn(storeLock, "noteDeadHolderBeforeAttach").mockReturnValue(record),
    );
    const failed = { success: false, bindings: {}, error: "locked" };
    const retry = spyOn(
      storeLock,
      "retryAttachAfterBreakingStaleLock",
    ).mockResolvedValueOnce(OK);
    restores.push(retry);
    const runtime = createCliRuntime({ workspaceRoot: root });
    const first = fakePort({ attach: failed });
    await runtime.open(readSpec(), { prolog: first.port });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(retry.mock.calls[0]?.[1]).toBe(branchStorePath(root, "main"));
    expect(retry.mock.calls[0]?.[2]).toBe(failed);
    expect(record).not.toHaveBeenCalled();

    retry.mockImplementation(async (_prolog, _path, result) => result);
    const second = fakePort({ attach: failed, lifecycle: true });
    await expect(
      runtime.open(readSpec(), { prolog: second.port }),
    ).rejects.toThrow("locked");
    expect(second.calls.at(-1)).toEqual(["terminate"]);
    const third = fakePort({ attach: { success: false, bindings: {} } });
    await expect(
      runtime.open(readSpec(), { prolog: third.port }),
    ).rejects.toThrow("Failed to attach branch KB");
  });

  test("the default engine is started without an explicit attach", async () => {
    const root = fresh();
    onBranch();
    const runtime = createCliRuntime({ workspaceRoot: root });
    const context = await runtime.open(readSpec());
    const engine = engineCalls[0]?.[1] as EngineClient;
    expect(engineCalls).toEqual([["start", engine]]);
    expect((context.prolog as unknown as { branch: string }).branch).toBe(
      "main",
    );
    await runtime.close(context, { status: "success", result: null });
    expect(engineCalls.at(-1)).toEqual(["terminate", engine]);
  });

  test("only the default engine compiles a never-compiled branch store", async () => {
    const root = fresh();
    onBranch();
    const compiled: unknown[] = [];
    restores.push(
      spyOn(autoCompile, "ensureBranchStoreCompiled").mockImplementation(
        async (workspaceRoot, attachment, spec) => {
          compiled.push([workspaceRoot, attachment.kbBranch, spec.name]);
          return "not-needed";
        },
      ),
    );
    const runtime = createCliRuntime({ workspaceRoot: root });
    await runtime.open(readSpec(), { prolog: fakePort().port });
    expect(compiled).toStrictEqual([]);
    const context = await runtime.open(readSpec());
    expect(compiled).toStrictEqual([[root, "main", "probe"]]);
    await runtime.close(context, { status: "success", result: null });
  });

  test("a failed engine start terminates it and rethrows", async () => {
    const root = fresh();
    onBranch();
    restores.push(
      spyOn(EngineClient.prototype, "start").mockRejectedValue(
        new Error("spawn failed"),
      ),
    );
    await expect(
      createCliRuntime({ workspaceRoot: root }).open(readSpec()),
    ).rejects.toThrow("spawn failed");
    expect(engineCalls.map(([name]) => name)).toEqual(["terminate"]);
    const { port } = fakePort({ attach: { success: false, bindings: {} } });
    await expect(
      createCliRuntime({ workspaceRoot: root }).open(readSpec(), {
        prolog: port,
      }),
    ).rejects.toThrow("Failed to attach branch KB");
  });

  test("an unresolved branch terminates the injected port", async () => {
    const root = fresh();
    badBranch();
    const runtime = createCliRuntime({ workspaceRoot: root });
    const { port, calls } = fakePort({ lifecycle: true });
    await expect(runtime.open(readSpec(), { prolog: port })).rejects.toThrow(
      "Failed to resolve active branch: Invalid branch name detected: 'bad name'",
    );
    expect(calls).toEqual([["terminate"]]);
    await expect(runtime.open(readSpec())).rejects.toThrow(
      "Failed to resolve active branch",
    );
    await expect(
      runtime.open(readSpec(), { prolog: fakePort().port }),
    ).rejects.toThrow("Failed to resolve active branch");
  });

  test("a failed snapshot compile terminates the injected port", async () => {
    const root = fresh();
    detached();
    syncSpy.mockRejectedValue(new Error("locked"));
    const runtime = createCliRuntime({ workspaceRoot: root });
    const { port, calls } = fakePort({ lifecycle: true });
    await expect(runtime.open(readSpec(), { prolog: port })).rejects.toThrow(
      "Failed to compile the read-only snapshot for this detached HEAD: locked",
    );
    expect(calls).toEqual([["terminate"]]);
    await expect(runtime.open(readSpec())).rejects.toThrow("locked");
    await expect(
      runtime.open(readSpec(), { prolog: fakePort().port }),
    ).rejects.toThrow("locked");
  });

  test("a detached read warns that answers come from the snapshot", async () => {
    const root = fresh();
    detached();
    const { port } = fakePort();
    const context = await createCliRuntime({ workspaceRoot: root }).open(
      readSpec(),
      { prolog: port },
    );
    expect(warnings()).toEqual([
      `[KIBI] ${context.branchAttachment?.readOnly?.notice}`,
    ]);
  });

  test("a legacy attachment warns how to migrate", async () => {
    const root = fresh();
    git({ [SHOW]: "main", [POINTS]: "main\n", [VERIFY]: HEAD });
    mkdirSync(legacyBranchStorePath(root, "main"), { recursive: true });
    const { port } = fakePort();
    const context = await createCliRuntime({ workspaceRoot: root }).open(
      readSpec(),
      { prolog: port },
    );
    expect(context.branchAttachment?.migrationRequired).toBe(true);
    expect(warnings()).toEqual([
      "[KIBI] Legacy branch attachment: Git 'main' is reading KB 'main'. Migrate with 'kibi branch migrate --from main --to main --apply'; writes are blocked until then.",
    ]);
  });
});
