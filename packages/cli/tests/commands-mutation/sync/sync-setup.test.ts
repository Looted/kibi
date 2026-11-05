import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SyncError } from "../../../src/commands/sync.js";
import { SYNC_COMPILER_FINGERPRINT } from "../../../src/commands/sync/cache.js";
import { engineSocketPath } from "../../../src/engine.js";
import { branchStorePath } from "../../../src/utils/branch-store-locator.js";
import { git } from "../../helpers/in-process-workspace.js";
import { type SyncHarness, emptyCache, syncHarness } from "./sync-harness.js";

let h: SyncHarness;
const sockets: string[] = [];
beforeEach(() => {
  h = syncHarness();
});
afterEach(() => {
  for (const socket of sockets.splice(0)) rmSync(socket, { force: true });
  h.restore();
});

const NO_CHANGES = "✓ Imported 0 entities, 0 relationships (no changes)";

function socket(): string {
  const file = engineSocketPath(h.world.root, "main");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, "");
  sockets.push(file);
  return file;
}

describe("a sync with nothing to compile", () => {
  test("it attaches the branch, checkpoints and passes", async () => {
    const before = Date.now();
    const result = await h.run();
    const root = h.world.root;
    const live = branchStorePath(root, "main");
    expect(result).toMatchObject({
      branch: "main",
      entityCounts: {},
      relationshipCount: 0,
      success: true,
      published: false,
      failures: [],
      exitCode: 0,
    });
    expect("commit" in result).toBe(false);
    expect(Date.parse(result.timestamp)).toBeGreaterThanOrEqual(before - 1);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeLessThan(60_000);
    expect(h.calls.acquireSymbolCompilerLock).toEqual([[root]]);
    expect(h.calls.resolveBranchAttachment).toEqual([[root]]);
    expect(h.calls.ensureBranchStoreManifest).toEqual([[root, "main"]]);
    expect(h.calls.ensureJournaledBranchStoreAsync).toEqual([[live]]);
    expect(h.calls.adoptUpsertOnlySymbolManifest?.[0]?.[0]).toBe(root);
    expect(h.calls.discoverSourceFiles).toEqual([
      [root, { trackedOnly: true, recoverMissingPendingSources: false }],
    ]);
    expect(h.calls.readSyncCache).toEqual([
      [
        path.join(live, "sync-cache.json"),
        undefined,
        { compilerFingerprint: SYNC_COMPILER_FINGERPRINT },
      ],
    ]);
    expect(h.calls["engine.start"]?.[0]?.[0]).toEqual({
      timeout: 120_000,
      branch: "main",
      workspaceRoot: root,
      allowPublicationLock: false,
    });
    expect(h.calls["engine.checkpoint"]).toHaveLength(1);
    expect(h.calls.acquireEnginePublicationLease).toBeUndefined();
    expect(h.logs).toEqual([NO_CHANGES]);
    expect(h.calls.releaseSymbolCompilerLock).toEqual([
      [{ lock: "held" }, undefined],
    ]);
  });

  test("the store check is relative to a resolved root", async () => {
    const relativeRoot = path.relative(process.cwd(), h.world.root);
    await h.run({ workspaceRoot: relativeRoot });
    expect(h.calls.resolveBranchAttachment).toEqual([[h.world.root]]);
  });

  test("a committed workspace reports its commit", async () => {
    git(h.world.root, "init -q -b main --template=");
    git(
      h.world.root,
      "-c user.name=t -c user.email=t@t commit -q --allow-empty --no-verify -m c",
    );
    const head = git(h.world.root, "rev-parse HEAD").trim();
    expect((await h.run()).commit).toBe(head);
  });

  test("a quiet sync prints nothing", async () => {
    await h.run({ quiet: true });
    expect(h.logs).toEqual([]);
  });

  test("validation takes no lock and changes no store", async () => {
    await h.run({ validateOnly: true });
    expect(h.calls.acquireSymbolCompilerLock).toBeUndefined();
    expect(h.calls.ensureBranchStoreManifest).toBeUndefined();
    expect(h.calls.ensureJournaledBranchStoreAsync).toBeUndefined();
    expect(h.calls.adoptUpsertOnlySymbolManifest).toBeUndefined();
    expect(h.calls.releaseSymbolCompilerLock).toEqual([[undefined, undefined]]);
  });

  test.each([
    ["compileOnly", { compileOnly: true }, {}],
    ["an injected runtime", {}, { createProlog: () => ({}) as never }],
  ])("%s adopts no manifest", async (_label, options, runtime) => {
    await h.run(options, runtime);
    expect(h.calls.adoptUpsertOnlySymbolManifest).toBeUndefined();
    expect(h.calls.ensureBranchStoreManifest).toHaveLength(1);
  });

  test("adoption asks the store for the manifest's entities", async () => {
    let held: boolean | undefined;
    h.set("adoptUpsertOnlySymbolManifest", async (_root, holds) => {
      held = await holds(["SYM-1"]);
    });
    h.set("queryEntities", async () => ({ count: 1, entities: [] }));
    await h.run();
    expect(held).toBe(true);
    expect(h.calls["engine.queryEntities"]?.[0]).toEqual([
      { id: "SYM-1", limit: 1, offset: 0 },
    ]);
  });
});

describe("branch resolution", () => {
  test("unresolved conflicts stop the sync first", async () => {
    const root = h.world.root;
    git(root, "init -q -b main --template=");
    git(root, "config user.email 'test@test.com'");
    git(root, "config user.name 'Kibi Test'");
    const commit = (content: string) => {
      writeFileSync(path.join(root, "a.md"), content);
      git(root, "add -A");
      git(root, `commit -q --no-verify -m ${content.trim()}`);
    };
    commit("base\n");
    git(root, "checkout -q -b other");
    commit("other\n");
    git(root, "checkout -q main");
    commit("main\n");
    try {
      git(root, "merge -q other");
    } catch {
      // The conflict is the point.
    }
    await expect(h.run()).rejects.toThrow("Unresolved Git conflicts");
    expect(h.calls.resolveBranchAttachment).toBeUndefined();
  });

  test("only a detached snapshot attachment can be given", async () => {
    await expect(
      h.run({ detachedSnapshot: { kind: "branch" } as never }),
    ).rejects.toThrow(
      new SyncError(
        "Only a detached HEAD snapshot attachment can be compiled explicitly",
      ),
    );
    expect(h.errors).toEqual([
      "Error: Only a detached HEAD snapshot attachment can be compiled explicitly",
    ]);
    const [lock, failure] = h.calls.releaseSymbolCompilerLock?.[0] as [
      unknown,
      { error: Error },
    ];
    expect(lock).toEqual({ lock: "held" });
    expect(failure.error.message).toContain("Only a detached HEAD");
  });

  test("a detached snapshot is compiled in place of the branch", async () => {
    const result = await h.run({
      detachedSnapshot: {
        kind: "detached_snapshot",
        kbBranch: "snap",
        migrationRequired: false,
      } as never,
    });
    expect(result.branch).toBe("snap");
    expect(h.calls.resolveBranchAttachment).toBeUndefined();
    expect(h.calls.adoptUpsertOnlySymbolManifest).toBeUndefined();
  });

  test("a resolution error is reported with its diagnostic", async () => {
    h.world.attachment = { error: "no branch", code: "NO_BRANCH" };
    await expect(h.run()).rejects.toThrow(
      new SyncError("Failed to resolve active branch: no branch"),
    );
    expect(h.errors).toEqual([
      "Failed to resolve active branch: no branch",
      "Error: Failed to resolve active branch: no branch",
    ]);
    expect(h.logs).toEqual([
      "\nDiagnostics:",
      "  [BRANCH_RESOLUTION_FAILURE] error: Failed to resolve active branch: no branch",
    ]);
  });

  test("a quiet failure prints no diagnostics", async () => {
    h.world.attachment = { error: "no branch", code: "NO_BRANCH" };
    await expect(h.run({ quiet: true })).rejects.toThrow("no branch");
    expect(h.logs).toEqual([]);
  });

  test("a detached head names the way out", async () => {
    h.world.attachment = { error: "detached", code: "DETACHED_HEAD" };
    await expect(h.run()).rejects.toThrow(
      "Failed to resolve active branch: kibi sync",
    );
  });

  test("a legacy attachment blocks a compile but not a validation", async () => {
    h.world.attachment = {
      kind: "branch",
      kbBranch: "feature-x",
      gitBranch: "feature/x",
      migrationRequired: true,
    };
    await expect(h.run()).rejects.toThrow(
      new SyncError(
        "Sync blocked: KB is attached through legacy branch storage for 'feature/x'. Run 'kibi branch migrate --from feature-x --to feature/x --apply' first.",
      ),
    );
    expect((await h.run({ validateOnly: true })).success).toBe(true);
  });

  test("debug output names the branch and inputs", async () => {
    h.set("isCliDebugEnabled", () => true);
    h.world.discovery.markdownFiles = [h.path("docs/a.md")];
    h.world.hashes["docs/a.md"] = "ha";
    await h.run({ validateOnly: true }, { createProlog: () => h.fakeProlog() });
    expect(h.logs.slice(0, 3)).toEqual([
      "[kibi-debug] currentBranch: main",
      "[kibi-debug] markdownFiles: 1",
      "[kibi-debug] manifestFiles: 0",
    ]);
  });
});

describe("exclusive publication", () => {
  test("a rebuild takes the publication lease and stops a running engine", async () => {
    socket();
    h.world.engine.running = true;
    await h.run({ rebuild: true }, { createProlog: () => h.fakeProlog() });
    expect(h.calls.acquireEnginePublicationLease).toEqual([
      [h.world.root, "main"],
    ]);
    expect(h.calls["engine.start"]?.[0]).toEqual([
      {
        timeout: 2_000,
        branch: "main",
        workspaceRoot: h.world.root,
        allowPublicationLock: true,
      },
      false,
    ]);
    expect(h.calls["engine.stop"]).toEqual([[false]]);
    expect(h.events).toContain("lease released");
    expect(h.events.indexOf("engine.terminate")).toBeLessThan(
      h.events.indexOf("discoverSourceFiles"),
    );
  });

  test("a socket that appears under the lease is still stopped", async () => {
    h.set("acquireEnginePublicationLease", () => {
      socket();
      return { release: () => {} };
    });
    h.world.engine.running = true;
    await h.run({ rebuild: true }, { createProlog: () => h.fakeProlog() });
    expect(h.calls["engine.start"]?.[0]?.[1]).toBe(false);
    expect(h.calls["engine.stop"]).toEqual([[false]]);
  });

  test("an unreachable socket refuses the rebuild", async () => {
    const file = socket();
    await expect(
      h.run({ rebuild: true }, { createProlog: () => h.fakeProlog() }),
    ).rejects.toThrow(
      new SyncError(
        `Kibi engine socket remains present but is not reachable: ${file}`,
      ),
    );
    expect(h.events).toContain("engine.terminate");
    expect(h.events).toContain("lease released");
  });

  test("a socket that appears late and is unreachable refuses too", async () => {
    h.set("acquireEnginePublicationLease", () => {
      socket();
      return { release: () => {} };
    });
    await expect(
      h.run({ rebuild: true }, { createProlog: () => h.fakeProlog() }),
    ).rejects.toThrow("socket remains present");
  });

  test("without a socket no engine is attached", async () => {
    await h.run({ rebuild: true }, { createProlog: () => h.fakeProlog() });
    expect(h.calls["engine.start"]).toBeUndefined();
    expect(h.calls["engine.stop"]).toBeUndefined();
    expect(h.calls["engine.terminate"]).toHaveLength(1);
  });

  test("a recovery takes the lease and leaves the live store alone", async () => {
    await h
      .run(
        { recoveryBackupPath: h.path("backup") },
        { createProlog: () => h.fakeProlog() },
      )
      .catch(() => undefined);
    expect(h.calls.acquireEnginePublicationLease).toHaveLength(1);
    expect(h.calls.ensureBranchStoreManifest).toBeUndefined();
    expect(h.calls.adoptUpsertOnlySymbolManifest).toBeUndefined();
    expect(h.calls.discoverSourceFiles?.[0]?.[1]).toEqual({
      trackedOnly: true,
      recoverMissingPendingSources: true,
    });
  });

  test("a recovery adopts no manifest", async () => {
    await h.run({ recoveryBackupPath: h.path("backup") });
    expect(h.calls.adoptUpsertOnlySymbolManifest).toBeUndefined();
  });

  test("a validation never takes the lease", async () => {
    await h.run(
      { validateOnly: true, rebuild: true },
      { createProlog: () => h.fakeProlog() },
    );
    expect(h.calls.acquireEnginePublicationLease).toBeUndefined();
  });
});

describe("manifest upkeep", () => {
  beforeEach(() => {
    h.world.discovery.manifestFiles = [
      h.path(".kb/symbols.yaml"),
      h.path("other/symbols.yaml"),
    ];
    h.world.hashes[".kb/symbols.yaml"] = "s1";
    h.world.hashes["other/symbols.yaml"] = "s2";
  });

  test("flow-layout manifests are rewritten and coordinates refreshed", async () => {
    h.set("normalizeManifestLayout", (file: string) =>
      file.endsWith(".kb/symbols.yaml") ? 1 : 3,
    );
    h.set("refreshManifestCoordinates", async (file: string) => {
      if (file.includes("other")) throw new Error("no analyzer");
    });
    await h.run({ validateOnly: false });
    expect(h.logs.slice(0, 2)).toEqual([
      "✓ Rewrote .kb/symbols.yaml in block layout (1 symbol)",
      "✓ Rewrote other/symbols.yaml in block layout (3 symbols)",
    ]);
    expect(h.calls.refreshManifestCoordinates).toEqual([
      [h.path(".kb/symbols.yaml"), h.world.root, { incremental: true }],
      [h.path("other/symbols.yaml"), h.world.root, { incremental: true }],
    ]);
    expect(h.warnings).toEqual([
      "Warning: could not update symbol coordinates for other/symbols.yaml: no analyzer",
    ]);
  });

  test("a non-error coordinate failure is warned as text", async () => {
    h.set("refreshManifestCoordinates", async () => {
      throw "plain";
    });
    await h.run();
    expect(h.warnings[0]).toBe(
      "Warning: could not update symbol coordinates for .kb/symbols.yaml: plain",
    );
  });

  test("an unchanged layout is not reported", async () => {
    await h.run();
    expect(h.calls.normalizeManifestLayout).toHaveLength(2);
    expect(h.logs.some((line) => line.includes("Rewrote"))).toBe(false);
  });

  test.each([
    ["validation", { validateOnly: true }, false, false],
    ["compile-only", { compileOnly: true }, false, true],
  ])("%s rewrites no layout", async (_label, options, layout, refresh) => {
    await h.run(options, { createProlog: () => h.fakeProlog() });
    expect(h.calls.normalizeManifestLayout !== undefined).toBe(layout);
    expect(h.calls.refreshManifestCoordinates !== undefined).toBe(refresh);
  });
});

describe("no-op fast path", () => {
  const MD = "docs/a.md";
  const MANIFEST = ".kb/symbols.yaml";
  function freshCache(extra = {}) {
    const now = new Date().toISOString();
    h.world.cache = emptyCache({
      hashes: { [MD]: "ha", [MANIFEST]: "m:hs" },
      seenAt: { [MD]: now, [MANIFEST]: now },
      entityHashes: {},
      sourceEntityIds: {},
      relationshipHashes: {},
      ...extra,
    });
  }
  beforeEach(() => {
    h.world.discovery.markdownFiles = [h.path(MD)];
    h.world.discovery.manifestFiles = [h.path(MANIFEST)];
    h.world.hashes[MD] = "ha";
    h.world.hashes[MANIFEST] = "hs";
    freshCache();
  });

  test("a fresh matching cache only checkpoints", async () => {
    const result = await h.run();
    expect(result).toMatchObject({
      success: true,
      published: false,
      exitCode: 0,
      relationshipCount: 0,
    });
    expect(h.calls.processExtractions).toBeUndefined();
    expect(h.calls.writeSyncCache).toBeUndefined();
    expect(h.calls["engine.checkpoint"]).toHaveLength(1);
    expect(h.logs).toEqual([NO_CHANGES]);
    expect(h.calls.hashManifestWithCoordinates?.[0]).toEqual([
      h.world.root,
      h.path(MANIFEST),
      h.path(".kb/symbol-coordinates.yaml"),
    ]);
  });

  test.each([
    ["a rebuild", { rebuild: true }, true],
    ["a coordinate refresh", { refreshSymbolCoordinates: true }, false],
    ["an injected runtime", {}, true],
  ])("%s skips the fast path", async (_label, options, inject) => {
    await h.run(options, inject ? { createProlog: () => h.fakeProlog() } : {});
    expect(h.calls.processExtractions).toHaveLength(1);
  });

  test.each([
    ["a validation", { validateOnly: true }],
    ["a rebuild", { rebuild: true }],
  ])("%s without a runtime skips the fast path", async (_label, options) => {
    await expect(h.run(options)).rejects.toThrow("a real Prolog process");
    expect(h.calls.processExtractions).toHaveLength(1);
  });

  test("a cache without an entity delta is not trusted", async () => {
    freshCache({ entityHashes: undefined });
    await h.run();
    expect(h.calls.processExtractions).toHaveLength(1);
  });

  test("a stale cache is not trusted", async () => {
    freshCache({ seenAt: { [MD]: "2000-01-01T00:00:00.000Z" } });
    await h.run();
    expect(h.calls.processExtractions).toHaveLength(1);
  });

  test("a changed manifest is not trusted", async () => {
    h.world.hashes[MANIFEST] = "changed";
    await h.run();
    expect(h.calls.processExtractions).toHaveLength(1);
  });
});
