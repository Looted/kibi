import { afterEach, describe, expect, spyOn, test } from "bun:test";
import path from "node:path";
import * as syncCache from "../../../src/commands/sync/cache.js";
import * as engine from "../../../src/engine.js";
import * as activation from "../../../src/operations/bootstrap/activation.js";
import * as schema6 from "../../../src/operations/migration/schema6.js";
import { SwiplResolutionError } from "../../../src/prolog/swipl-resolver.js";
import { executeStatus } from "../../../src/public/operations/discovery-executors.js";
import * as plans from "../../../src/public/operations/migration-plan.js";
import * as prologJson from "../../../src/public/operations/prolog-json.js";
import * as snapshots from "../../../src/public/operations/workspace-snapshot.js";
import * as resolver from "../../../src/utils/branch-resolver.js";
import * as branchStore from "../../../src/utils/branch-store.js";
import * as freshness from "../../../src/utils/content-freshness.js";
import { expectGolden } from "../helpers/golden.js";

// biome-ignore lint/suspicious/noExplicitAny: fakes stand in for wide types
type Loose = any;

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

// biome-ignore lint/suspicious/noExplicitAny: see Loose
function spy(module: any, name: string): Loose {
  const created = spyOn(module, name);
  spies.push(created);
  return created;
}

function undefinedKeys(value: unknown, at = "$"): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) =>
      undefinedKeys(item, `${at}[${index}]`),
    );
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) =>
    item === undefined ? [`${at}.${key}`] : undefinedKeys(item, `${at}.${key}`),
  );
}

const SIGNAL = new AbortController().signal;
const PROLOG = { query: async () => ({ success: true, bindings: {} }) };
const ATTACHMENT = {
  gitBranch: "main",
  kbBranch: "kb-main",
  kind: "exact",
  migrationRequired: false,
};
const STORE = { state: "healthy", path: "/ws/.kb/branches/kb-main" };
const PAYLOAD = {
  branch: "compiled-key",
  snapshotId: "snap-1",
  syncedAt: "2026-01-01",
  dirty: false,
  syncState: "fresh",
  staleReasons: [],
};

function context(extra: Record<string, unknown> = {}): Loose {
  return {
    workspaceRoot: "/ws",
    signal: SIGNAL,
    clock: () => new Date(0),
    prolog: PROLOG,
    branchAttachment: ATTACHMENT,
    ...extra,
  };
}

function harness() {
  return {
    resolve: spy(resolver, "resolveBranchAttachment").mockReturnValue(
      ATTACHMENT,
    ),
    inspect: spy(branchStore, "inspectBranchStore").mockReturnValue(STORE),
    run: spy(prologJson, "runOperationJsonQuery").mockResolvedValue(PAYLOAD),
    snapshot: spy(snapshots, "readWorkspaceSnapshot").mockResolvedValue({
      available: true,
      snapshot: {
        hash: "ws-hash",
        dirty: true,
        fileCount: 3,
        version: "v1",
        changes: [{ path: "a" }],
        changeCount: 1,
        changesTruncated: true,
      },
    }),
    confirm: spy(freshness, "confirmSourceNewerReasons").mockImplementation(
      (_root: unknown, _store: unknown, reasons: unknown[]) => ({
        kept: reasons,
        dropped: [],
      }),
    ),
    uncompiled: spy(branchStore, "uncompiledBranchStoreReason").mockReturnValue(
      null,
    ),
    storeReason: spy(branchStore, "branchStoreReason").mockReturnValue(null),
    lock: spy(branchStore, "storeLockJournalReason").mockReturnValue(null),
    takeover: spy(branchStore, "storeLockTakeoverReason").mockReturnValue(null),
    compiler: spy(syncCache, "compilerFingerprintReason").mockReturnValue(null),
    extraction: spy(
      syncCache,
      "sourceExtractionFailureReasons",
    ).mockReturnValue([]),
    config: spy(plans, "readMigrationConfigStatus").mockReturnValue({
      needsMigration: false,
    }),
    plan: spy(plans, "buildActionsFromStatus").mockImplementation(
      (input: unknown) => ({ planFrom: input }),
    ),
    fragment: spy(schema6, "buildSchema6MigrationFragment").mockReturnValue(
      "FRAGMENT",
    ),
    activation: spy(activation, "classifyActivation").mockResolvedValue({
      activationState: "root_active",
      activationMode: "full",
      applyBlocked: false,
      reason: "ready",
    }),
  };
}

async function status(ctx: Loose = context()): Promise<Loose> {
  const result = await executeStatus({}, ctx);
  expect(undefinedKeys(result)).toEqual([]);
  return result;
}

describe("executeStatus engine answer", () => {
  test("reports a healthy store through the session engine", async () => {
    const calls = harness();
    const result = await status();
    expect(calls.resolve).not.toHaveBeenCalled();
    expect(calls.inspect).toHaveBeenCalledWith("/ws", "kb-main");
    expect(calls.run).toHaveBeenCalledWith(
      PROLOG,
      "status.pl",
      "status:kb_status_json(JsonString)",
      "Status execution",
      SIGNAL,
    );
    expect(calls.confirm).toHaveBeenCalledWith("/ws", STORE.path, []);
    expect(calls.uncompiled).toHaveBeenCalledWith("/ws", STORE, "kb-main");
    expect(calls.storeReason).toHaveBeenCalledWith(STORE);
    expect(calls.lock).toHaveBeenCalledWith(STORE.path);
    expect(calls.takeover).toHaveBeenCalledWith(STORE.path);
    expect(calls.compiler).toHaveBeenCalledWith(STORE.path);
    expect(calls.extraction).toHaveBeenCalledWith("/ws", STORE.path);
    expect(calls.config).toHaveBeenCalledWith("/ws");
    expect(calls.fragment).not.toHaveBeenCalled();
    expect(calls.activation).toHaveBeenCalledWith(expect.anything(), []);
    expectGolden("discovery-status-healthy", result);
  });

  test("resolves the branch when the context has none", async () => {
    const calls = harness();
    await status(context({ branchAttachment: undefined }));
    expect(calls.resolve).toHaveBeenCalledWith("/ws");
    calls.resolve.mockReturnValue({ error: "detached HEAD" });
    await expect(
      executeStatus({}, context({ branchAttachment: undefined })),
    ).rejects.toThrow(
      /^Status execution failed: Failed to resolve active branch: detached HEAD$/,
    );
    calls.resolve.mockImplementation(() => {
      throw "thrown text";
    });
    await expect(
      executeStatus({}, context({ branchAttachment: undefined })),
    ).rejects.toThrow(/^Status execution failed: thrown text$/);
  });

  test("starts an engine only without a session", async () => {
    const calls = harness();
    const ensured = { query: PROLOG.query };
    let asked = 0;
    await status(
      context({
        prolog: undefined,
        ensureProlog: async () => {
          asked += 1;
          return ensured;
        },
      }),
    );
    expect(asked).toBe(1);
    expect(calls.run.mock.calls[0][0]).toBe(ensured);
    await status(
      context({
        ensureProlog: async () => {
          asked += 1;
          return ensured;
        },
      }),
    );
    expect(asked).toBe(1);
    const created: unknown[] = [];
    let terminated = 0;
    const owned = spy(engine, "EngineClient").mockImplementation(function (
      this: unknown,
      options: unknown,
    ) {
      created.push(options);
      return {
        query: PROLOG.query,
        terminate: async () => {
          terminated += 1;
        },
      };
    });
    await status(context({ prolog: undefined }));
    expect(created).toEqual([
      { workspaceRoot: "/ws", branch: "kb-main", timeout: 15_000 },
    ]);
    expect(terminated).toBe(1);
    calls.run.mockRejectedValue(new Error("down"));
    await status(
      context({ prolog: undefined, ensureProlog: async () => undefined }),
    );
    expect(terminated).toBe(2);
    expect(owned).toHaveBeenCalledTimes(2);
  });

  test("reports an engine that gives no valid status", async () => {
    const calls = harness();
    const unavailable = async (failure: unknown) => {
      calls.run.mockImplementation(async () => {
        if (failure instanceof Error || typeof failure === "string")
          throw failure;
        return failure;
      });
      return (await status()).structuredContent;
    };
    const invalid = [
      null,
      42,
      { ...PAYLOAD, branch: 1 },
      { ...PAYLOAD, snapshotId: 1 },
      { ...PAYLOAD, syncedAt: 1 },
      { ...PAYLOAD, dirty: "no" },
      { ...PAYLOAD, syncState: 1 },
    ];
    for (const payload of invalid) {
      const content = await unavailable(payload);
      expect(content.engineStatus).toStrictEqual({
        state: "unavailable",
        errorCode: "engine_status_unavailable",
        detail: "Status execution query returned an invalid payload",
        recoveryRequired: false,
      });
      expect(content.snapshotId).toBe("unavailable");
    }
    const nullSync = await unavailable({ ...PAYLOAD, syncedAt: null });
    expect(Object.hasOwn(nullSync, "engineStatus")).toBe(false);
    expect(nullSync.branch).toBe("kb-main");
    const decode = Object.assign(
      Object.create(prologJson.OperationJsonDecodeError.prototype),
      { message: "bad json", code: "engine_result_invalid_json" },
    );
    const swipl = new SwiplResolutionError(
      "swipl_not_found" as never,
      "no swipl",
      "linux",
      undefined,
    );
    const decoded = await unavailable(decode);
    expect(decoded.engineStatus.errorCode).toBe("engine_result_invalid_json");
    const resolved = await unavailable(swipl);
    expect(resolved.engineStatus.errorCode).toBe("swipl_not_found");
    expectGolden("discovery-status-swipl", resolved);
    expect((await unavailable("plain")).engineStatus).toStrictEqual({
      state: "unavailable",
      errorCode: "engine_status_unavailable",
      detail: "plain",
      recoveryRequired: false,
    });
  });

  test("never starts an engine on a store that is not healthy", async () => {
    const calls = harness();
    for (const state of ["missing", "corrupt"]) {
      calls.inspect.mockReturnValue({ state, path: "/ws/s" });
      const content = (await status()).structuredContent;
      expect(content).toMatchObject({
        branch: "kb-main",
        snapshotId: state === "missing" ? "missing" : "unavailable",
        syncedAt: null,
        dirty: true,
        syncState: "unknown",
        kbPath: "/ws/s",
        lastSyncSource: "unavailable",
        staleReasonCount: 0,
        staleReasonsTruncated: false,
      });
    }
    expect(calls.run).not.toHaveBeenCalled();
    expect(calls.extraction).not.toHaveBeenCalled();
  });
});

describe("executeStatus stale reasons", () => {
  test("confirms newer sources by content", async () => {
    const calls = harness();
    const reasons = [{ code: "source_newer", path: "b" }];
    const fresh = async (payload: Record<string, unknown>, kept: unknown[]) => {
      calls.run.mockResolvedValue({ ...PAYLOAD, ...payload });
      calls.confirm.mockReturnValue({ kept, dropped: reasons });
      return (await status()).structuredContent;
    };
    const stale = { syncState: "stale", dirty: true, staleReasons: reasons };
    expect(await fresh(stale, [])).toMatchObject({
      syncState: "fresh",
      dirty: false,
    });
    expect(
      await fresh({ ...stale, staleReasonsTruncated: true }, []),
    ).toMatchObject({ syncState: "stale", dirty: true });
    expect(await fresh({ ...stale, syncState: "unknown" }, [])).toMatchObject({
      syncState: "unknown",
    });
    expect(await fresh(stale, [{ code: "kept", path: "a" }])).toMatchObject({
      syncState: "stale",
      staleReasons: [{ code: "kept", path: "a" }],
    });
    calls.confirm.mockReturnValue({ kept: [], dropped: [] });
    calls.run.mockResolvedValue({ ...PAYLOAD, ...stale });
    expect((await status()).structuredContent.syncState).toBe("stale");
    calls.run.mockResolvedValue({ ...PAYLOAD, staleReasons: undefined });
    await status();
    expect(calls.confirm).toHaveBeenLastCalledWith("/ws", STORE.path, []);
  });

  test("collects every store reason in path order", async () => {
    const calls = harness();
    calls.run.mockResolvedValue({
      ...PAYLOAD,
      staleReasons: [{ code: "kept", path: "m" }],
    });
    calls.storeReason.mockReturnValue({ code: "store_x", path: "z" });
    calls.lock.mockReturnValue({ code: "lock", path: "c" });
    calls.compiler.mockReturnValue({ code: "compiler", path: "b" });
    calls.extraction.mockReturnValue([
      { code: "extract", path: "a" },
      { code: "nopath" },
    ]);
    calls.takeover.mockReturnValue({ code: "takeover", detail: "took over" });
    calls.run.mockResolvedValueOnce({
      ...PAYLOAD,
      staleReasons: [{ code: "kept-nopath" }, { code: "kept", path: "m" }],
    });
    const result = await status();
    expect(
      result.structuredContent.staleReasons.map((row: Loose) => row.code),
    ).toEqual([
      "kept-nopath",
      "nopath",
      "extract",
      "compiler",
      "lock",
      "kept",
      "store_x",
    ]);
    expect(result.structuredContent).toMatchObject({
      syncState: "stale",
      dirty: true,
      staleReasonCount: 7,
      notices: [{ code: "takeover", detail: "took over" }],
    });
    expect(result.content[0].text).toBe(
      "Branch kb-main is stale (snapshot snap-1, dirty=true, proofSnapshot=ws-hash). Note: took over",
    );
    for (const only of ["compiler", "extraction"] as const) {
      const fresh = harness();
      if (only === "compiler")
        fresh.compiler.mockReturnValue({ code: "c", path: "p" });
      else fresh.extraction.mockReturnValue([{ code: "e", path: "p" }]);
      expect((await status()).structuredContent).toMatchObject({
        syncState: "stale",
        dirty: true,
      });
    }
    const plain = harness();
    plain.storeReason.mockReturnValue({ code: "store_x", path: "z" });
    expect((await status()).structuredContent).toMatchObject({
      syncState: "fresh",
      dirty: false,
    });
  });

  test("blocks on a store that was never compiled", async () => {
    const calls = harness();
    calls.uncompiled.mockReturnValue({
      code: branchStore.BRANCH_STORE_NOT_COMPILED,
      path: "s",
      detail: "Never compiled.",
    });
    const result = await status();
    expect(calls.storeReason).not.toHaveBeenCalled();
    expect(result.structuredContent).toMatchObject({
      syncState: "stale",
      dirty: true,
    });
    expect(result.content[0].text).toBe(
      "Branch kb-main is stale (snapshot snap-1, dirty=true, proofSnapshot=ws-hash). Blocking: Never compiled. Run kibi sync.",
    );
    calls.uncompiled.mockReturnValue({ code: "other", path: "s", detail: "x" });
    const other = await status();
    expect(other.structuredContent.syncState).toBe("fresh");
    expect(other.content[0].text).toBe(
      "Branch kb-main is fresh (snapshot snap-1, dirty=false, proofSnapshot=ws-hash)",
    );
  });

  test("points an unusable SWI-Prolog at the doctor", async () => {
    const calls = harness();
    const fail = async (error: unknown) => {
      calls.run.mockRejectedValue(error);
      return (await status()).structuredContent.staleReasons.at(-1);
    };
    expect(
      await fail(
        new SwiplResolutionError("swipl_x" as never, "m", "p", undefined),
      ),
    ).toStrictEqual({
      code: "swipl_x",
      path: STORE.path,
      entityIds: [],
      detail: "m",
      remediation: { command_argv: ["kibi", "doctor"], applyRequired: false },
    });
    expect(
      (await fail(new Error("engine gone"))).remediation.command_argv,
    ).toEqual(["kibi", "engine", "stop"]);
  });
});

describe("executeStatus snapshot and plan", () => {
  test("reports an unavailable workspace snapshot", async () => {
    const calls = harness();
    calls.snapshot.mockResolvedValue({ available: false, error: "dirty tree" });
    const content = (await status()).structuredContent;
    expect(content).toMatchObject({
      proofSnapshot: "unknown",
      proofSnapshotAvailable: false,
      proofSnapshotError: "dirty tree",
    });
    expect(Object.hasOwn(content, "proofSnapshotDirty")).toBe(false);
    expect(content.migrationPlan.planFrom).toMatchObject({
      proofSnapshotAvailable: false,
      workspaceSnapshot: null,
    });
    expect(
      Object.hasOwn(content.migrationPlan.planFrom, "proofSnapshotDirty"),
    ).toBe(false);
    calls.snapshot.mockResolvedValue({
      available: true,
      snapshot: { hash: "h", dirty: false, fileCount: 0, version: "v" },
    });
    expect((await status()).structuredContent).toMatchObject({
      proofSnapshotChanges: [],
      proofSnapshotChangeCount: 0,
      proofSnapshotChangesTruncated: false,
    });
  });

  test("plans the schema upgrade sources when one is due", async () => {
    const calls = harness();
    calls.config.mockReturnValue({ needsMigration: true });
    const content = (await status()).structuredContent;
    const plan = content.migrationPlan.planFrom;
    expect(plan.planSchemaUpgradeSources(5)).toBe("FRAGMENT");
    expect(calls.fragment).toHaveBeenCalledWith({
      workspaceRoot: "/ws",
      currentSchemaVersion: 5,
    });
    expect(content.schemaStatus).toEqual({ needsMigration: true });
  });
});

describe("executeStatus bootstrap", () => {
  function filesystem(journals: Record<string, string | Error>) {
    const globs: unknown[] = [];
    const reads: string[] = [];
    return {
      globs,
      reads,
      fs: {
        glob: async (patterns: string[], options: unknown) => {
          globs.push([patterns, options]);
          return patterns[0] === "bootstrap-*.json"
            ? Object.keys(journals)
            : [".kb/requirements/a.md"];
        },
        readFile: async (file: string) => {
          reads.push(file);
          const value = journals[path.basename(file)];
          if (value instanceof Error) throw value;
          if (value === undefined) throw "missing";
          return value;
        },
      },
    };
  }

  test("lists incomplete bootstrap applications", async () => {
    const calls = harness();
    const journal = (state: string, extra: Record<string, unknown> = {}) =>
      JSON.stringify({ kind: "bootstrap", state, ...extra });
    const disk = filesystem({
      "bootstrap-a.json": journal("rejected", {
        results: [
          { outcome: "applied" },
          { outcome: "failed", id: 1 },
          { outcome: "skipped" },
        ],
      }),
      "bootstrap-b.json": journal("repair_required"),
      "bootstrap-c.json": journal("applying"),
      "bootstrap-d.json": journal("applied"),
      "bootstrap-e.json": JSON.stringify({ kind: "other", state: "rejected" }),
      "bootstrap-f.json": "{broken",
      "bootstrap-g.json": new Error("denied"),
      "bootstrap-h.json": "skip",
    });
    const result = await status(context({ fs: disk.fs }));
    const recovery = path.join("/ws", ".kb", "recovery");
    expect(disk.globs).toEqual([
      [
        [
          ".kb/requirements/**/*.md",
          ".kb/scenarios/**/*.md",
          ".kb/tests/**/*.md",
          ".kb/adrs/**/*.md",
          ".kb/adr/**/*.md",
          ".kb/flags/**/*.md",
          ".kb/events/**/*.md",
          ".kb/facts/**/*.md",
        ],
        { cwd: "/ws" },
      ],
      [["bootstrap-*.json"], { cwd: recovery }],
    ]);
    expect(disk.reads[0]).toBe(path.join(recovery, "bootstrap-a.json"));
    expect(calls.activation.mock.calls[0][1]).toEqual([
      ".kb/requirements/a.md",
    ]);
    const bootstrap = result.structuredContent.bootstrap;
    expect(bootstrap.incompleteApplications.slice(0, 3)).toStrictEqual([
      {
        journalId: "bootstrap-a",
        state: "rejected",
        appliedActions: 1,
        failedActions: [{ outcome: "failed", id: 1 }],
        nextOperation: "kb_plan_bootstrap",
      },
      {
        journalId: "bootstrap-b",
        state: "repair_required",
        appliedActions: 0,
        failedActions: [],
        nextOperation: "kb_apply_plan",
      },
      {
        journalId: "bootstrap-c",
        state: "applying",
        appliedActions: 0,
        failedActions: [],
        nextOperation: "kb_apply_plan",
      },
    ]);
    expect(
      bootstrap.incompleteApplications.slice(3).map((row: Loose) => ({
        journalId: row.journalId,
        state: row.state,
        detail: typeof row.detail,
      })),
    ).toEqual([
      { journalId: "bootstrap-f", state: "unreadable", detail: "string" },
      { journalId: "bootstrap-g", state: "unreadable", detail: "string" },
      { journalId: "bootstrap-h", state: "unreadable", detail: "string" },
    ]);
    expect(bootstrap.incompleteApplications[4].detail).toBe("denied");
  });

  test("lists nothing without a filesystem glob", async () => {
    const calls = harness();
    const content = (
      await status(context({ fs: { readFile: async () => "" } }))
    ).structuredContent;
    expect(Object.hasOwn(content.bootstrap, "incompleteApplications")).toBe(
      false,
    );
    expect(calls.activation.mock.calls[0][1]).toEqual([]);
    const odd = {
      glob: async (patterns: string[]) =>
        patterns[0] === "bootstrap-*.json" ? [] : "not a list",
      readFile: async () => "",
    };
    await status(context({ fs: odd }));
    expect(calls.activation.mock.calls[1][1]).toEqual([]);
  });

  test("names the next bootstrap step of each activation state", async () => {
    const calls = harness();
    const next = async (policy: Record<string, unknown>) => {
      calls.activation.mockResolvedValue({
        activationMode: "m",
        reason: "why",
        applyBlocked: false,
        ...policy,
      });
      const bootstrap = (await status()).structuredContent.bootstrap;
      return [bootstrap.planEligible, bootstrap.nextAction];
    };
    const step = (operation: string, required = true) => ({
      operation,
      reason: "why",
      required,
    });
    expect(
      await next({ activationState: "root_active", nextOperation: "kb_x" }),
    ).toEqual([false, step("kb_x")]);
    expect(await next({ activationState: "root_uninitialized" })).toEqual([
      false,
      step("kibi init"),
    ]);
    expect(await next({ activationState: "root_partial" })).toEqual([
      false,
      step("kibi doctor"),
    ]);
    expect(await next({ activationState: "vendored_only" })).toEqual([
      false,
      step("move-to-project-root"),
    ]);
    expect(await next({ activationState: "root_active_thin" })).toEqual([
      true,
      step("kb_plan_bootstrap"),
    ]);
    expect(
      await next({ activationState: "root_active_thin", applyBlocked: true }),
    ).toEqual([false, step("kb_plan_bootstrap")]);
    expect(await next({ activationState: "root_active" })).toEqual([
      false,
      step("continue-kibi-workflow", false),
    ]);
  });
});
