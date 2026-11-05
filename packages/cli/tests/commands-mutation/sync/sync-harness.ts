import { spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncCommand } from "../../../src/commands/sync.js";
import * as cacheModule from "../../../src/commands/sync/cache.js";
import * as discovery from "../../../src/commands/sync/discovery.js";
import * as extraction from "../../../src/commands/sync/extraction.js";
import * as manifest from "../../../src/commands/sync/manifest.js";
import * as persistence from "../../../src/commands/sync/persistence.js";
import * as staging from "../../../src/commands/sync/staging.js";
import * as untracked from "../../../src/commands/sync/untracked-targets.js";
import * as engineModule from "../../../src/engine.js";
import { EngineClient } from "../../../src/engine.js";
import * as env from "../../../src/env.js";
import * as relationships from "../../../src/extractors/relationships.js";
import * as compilerLock from "../../../src/operations/mutation/symbol-compiler-lock.js";
import * as advisor from "../../../src/operations/semantic-advisor/analyze-prose.js";
import * as boundary from "../../../src/operations/semantic-advisor/ingestion-boundary.js";
import * as installCheck from "../../../src/plugins/plugin-install-check.js";
import { PrologProcess } from "../../../src/prolog.js";
import * as resolver from "../../../src/utils/branch-resolver.js";
import * as locator from "../../../src/utils/branch-store-locator.js";

// biome-ignore lint/suspicious/noExplicitAny: the stand-ins answer any shape.
type Impl = (...args: any[]) => any;
type Answer = {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
};

/** A cache as readSyncCache returns it. */
export function emptyCache(
  extra: Partial<cacheModule.SyncCache> = {},
): cacheModule.SyncCache {
  return {
    version: 1,
    hashes: {},
    seenAt: {},
    semanticHashes: {},
    semanticContracts: {},
    ...extra,
  } as cacheModule.SyncCache;
}

/** A sync world whose collaborators are all stand-ins. */
export function syncHarness() {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-sync-cmd-"));
  const calls: Record<string, unknown[][]> = {};
  const events: string[] = [];
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const restores: Array<() => void> = [];
  const record = (name: string, args: unknown[]) => {
    const list = calls[name] ?? [];
    list.push(args);
    calls[name] = list;
  };
  const world = {
    root,
    attachment: {
      kind: "branch",
      kbBranch: "main",
      gitBranch: "main",
      migrationRequired: false,
    } as Record<string, unknown>,
    discovery: {
      markdownFiles: [] as string[],
      manifestFiles: [] as string[],
      relationshipsDir: path.join(root, ".kb", "relationships"),
      recoveredPendingReceiptPaths: [] as unknown[],
    },
    cache: emptyCache(),
    /** Content hash of a source, by its path relative to the root. */
    hashes: {} as Record<string, string>,
    engine: {
      query: (_goal: string): Answer => ({ success: true, bindings: {} }),
      save: (): Answer => ({ success: true, bindings: {} }),
      checkpoint: (): Answer => ({ success: true, bindings: {} }),
      running: false,
    },
    prolog: {
      query: (_goal: string): Answer => ({ success: true, bindings: {} }),
    },
  };
  const relative = (file: string) => path.relative(root, file);

  const impls: Record<string, Impl> = {
    resolveBranchAttachment: () => world.attachment,
    ensureBranchStoreManifest: () => {},
    ensureJournaledBranchStoreAsync: async () => {},
    adoptUpsertOnlySymbolManifest: async () => {},
    acquireEnginePublicationLease: () => ({
      release: () => events.push("lease released"),
    }),
    fsyncJournaledBranchStore: () => {},
    readEngineAttachmentIdentity: () => ({ id: "live" }),
    parseEngineAttachmentIdentity: (json: string) => ({ parsed: json }),
    formatEngineAttachmentMismatch: (operation: string) =>
      `mismatch after ${operation}`,
    isCliDebugEnabled: () => false,
    releaseSymbolCompilerLock: () => {},
    discoverSourceFiles: async () => world.discovery,
    clearRecoveredPendingSourceReceipts: () => {},
    readSyncCache: () => world.cache,
    writeSyncCache: () => {},
    hashFile: (_root: string, file: string) => {
      const hash = world.hashes[relative(file)];
      if (hash === undefined) throw new Error(`unreadable ${relative(file)}`);
      return hash;
    },
    hashManifestWithCoordinates: (_root: string, file: string) =>
      `m:${world.hashes[relative(file)]}`,
    failedSourceKeepsSemanticBaseline: () => false,
    normalizeManifestLayout: () => null,
    refreshManifestCoordinates: async () => {},
    sourceAnalyzerInstallProblems: () => [],
    extractRelationshipShard: () => ({ relationships: [] }),
    validateRelationships: () => [],
    processExtractions: async () => ({
      results: [],
      failures: [],
      failedCacheKeys: new Set<string>(),
      errors: [],
    }),
    normalizeExtractionSources: (results: unknown[]) => results,
    analyzeSemanticAdvisorInput: () => ({ receipt: "receipt" }),
    validateSemanticInventoryBoundary: () => ({
      sourceHash: "semantic",
      errors: [],
    }),
    persistEntities: async (_prolog: unknown, results: unknown[]) => ({
      entityCount: results.length,
      kbModified: results.length > 0,
    }),
    persistRelationships: async (
      _prolog: unknown,
      _results: unknown[],
      rels: unknown[],
    ) => ({
      relationshipCount: rels.length,
      kbModified: rels.length > 0,
      retrySources: [],
    }),
    queryStoreTotals: async () => undefined,
    retractEntitiesById: async (_prolog: unknown, ids: unknown[]) => ids.length,
    retractEntitiesForSources: async () => 0,
    retractEntityRelationshipsById: async () => {},
    retractRelationships: async () => {},
    createUniqueStagingPath: () => path.join(root, "staging"),
    prepareStagingEnvironment: async (stagingPath: string) => {
      mkdirSync(stagingPath, { recursive: true });
    },
    cleanupStaging: () => {},
    atomicPublish: () => {},
    atomicPublishGeneration: () => {},
    findUntrackedDocumentMatches: () => new Map(),
  };

  const targets: Array<[object, string]> = [
    [resolver, "resolveBranchAttachment"],
    [locator, "ensureBranchStoreManifest"],
    [engineModule, "ensureJournaledBranchStoreAsync"],
    [untracked, "adoptUpsertOnlySymbolManifest"],
    [engineModule, "acquireEnginePublicationLease"],
    [engineModule, "fsyncJournaledBranchStore"],
    [engineModule, "readEngineAttachmentIdentity"],
    [engineModule, "parseEngineAttachmentIdentity"],
    [engineModule, "formatEngineAttachmentMismatch"],
    [env, "isCliDebugEnabled"],
    [compilerLock, "releaseSymbolCompilerLock"],
    [discovery, "discoverSourceFiles"],
    [discovery, "clearRecoveredPendingSourceReceipts"],
    [cacheModule, "readSyncCache"],
    [cacheModule, "writeSyncCache"],
    [cacheModule, "hashFile"],
    [cacheModule, "hashManifestWithCoordinates"],
    [cacheModule, "failedSourceKeepsSemanticBaseline"],
    [manifest, "normalizeManifestLayout"],
    [manifest, "refreshManifestCoordinates"],
    [installCheck, "sourceAnalyzerInstallProblems"],
    [relationships, "extractRelationshipShard"],
    [relationships, "validateRelationships"],
    [extraction, "processExtractions"],
    [extraction, "normalizeExtractionSources"],
    [advisor, "analyzeSemanticAdvisorInput"],
    [boundary, "validateSemanticInventoryBoundary"],
    [persistence, "persistEntities"],
    [persistence, "persistRelationships"],
    [persistence, "queryStoreTotals"],
    [persistence, "retractEntitiesById"],
    [persistence, "retractEntitiesForSources"],
    [persistence, "retractEntityRelationshipsById"],
    [persistence, "retractRelationships"],
    [staging, "createUniqueStagingPath"],
    [staging, "prepareStagingEnvironment"],
    [staging, "cleanupStaging"],
    [staging, "atomicPublish"],
    [staging, "atomicPublishGeneration"],
    [untracked, "findUntrackedDocumentMatches"],
  ];
  for (const [module, name] of targets) {
    const spy = spyOn(module as Record<string, Impl>, name).mockImplementation(
      (...args: unknown[]) => {
        record(name, args);
        events.push(name);
        return (impls[name] as Impl)(...args);
      },
    );
    restores.push(() => spy.mockRestore());
  }

  const engineMethods: Record<string, Impl> = {
    start: async function (this: EngineClient, ...args: unknown[]) {
      const options = this as unknown as Record<string, unknown>;
      record("engine.start", [
        {
          timeout: options.timeout,
          branch: options.branch,
          workspaceRoot: options.workspaceRoot,
          allowPublicationLock: options.allowPublicationLock,
          readLimits: options.readLimits,
        },
        ...args,
      ]);
    },
    stop: async () => {},
    isRunning: () => world.engine.running,
    terminate: async () => {},
    query: async (goal: string) => world.engine.query(goal),
    queryStatusJson: async () => ({
      success: true,
      bindings: { JsonString: "{status}" },
    }),
    invalidateCache: () => {},
    save: async () => world.engine.save(),
    checkpoint: async () => world.engine.checkpoint(),
    queryEntities: async () => ({ count: 0, entities: [] }),
  };
  for (const [name, impl] of Object.entries(engineMethods)) {
    const spy = spyOn(
      EngineClient.prototype as unknown as Record<string, Impl>,
      name,
    ).mockImplementation(function (this: EngineClient, ...args: unknown[]) {
      if (name !== "start") record(`engine.${name}`, args);
      events.push(`engine.${name}`);
      return (engineMethods[name] as Impl).apply(this, args);
    });
    restores.push(() => spy.mockRestore());
  }
  // A real one-shot Prolog must never start under this harness.
  const realStart = spyOn(PrologProcess.prototype, "start").mockImplementation(
    async function (this: PrologProcess) {
      record("prolog.real", [(this as unknown as { timeout: number }).timeout]);
      throw new Error("a real Prolog process was started");
    },
  );
  restores.push(() => realStart.mockRestore());
  const capture = (
    method: "log" | "error" | "warn",
    into: string[],
  ): (() => void) => {
    const spy = spyOn(console, method).mockImplementation(
      (...args: unknown[]) => {
        into.push(args.map(String).join(" "));
      },
    );
    return () => spy.mockRestore();
  };
  restores.push(
    capture("log", logs),
    capture("error", errors),
    capture("warn", warnings),
  );

  /** A one-shot Prolog stand-in for the staging path. */
  const fakeProlog = () =>
    ({
      start: async () => {
        events.push("prolog.start");
      },
      query: async (goal: string) => {
        record("prolog.query", [goal]);
        events.push(`prolog.query ${goal}`);
        return world.prolog.query(goal);
      },
      terminate: async () => {
        events.push("prolog.terminate");
      },
      invalidateCache: () => {
        events.push("prolog.invalidateCache");
      },
    }) as unknown as PrologProcess;

  return {
    world,
    calls,
    events,
    logs,
    errors,
    warnings,
    fakeProlog,
    path: (file: string) => path.join(root, file),
    set(name: string, impl: Impl) {
      if (name in impls) impls[name] = impl;
      else if (name in engineMethods) engineMethods[name] = impl;
      else throw new Error(`unknown collaborator ${name}`);
    },
    /** Run a sync on the harness root. */
    run(
      options: Parameters<typeof syncCommand>[0] = {},
      runtime: Parameters<typeof syncCommand>[1] = {},
    ) {
      return syncCommand(
        { workspaceRoot: root, ...options },
        {
          acquireSymbolCompilerLock: (async (workspace: string) => {
            record("acquireSymbolCompilerLock", [workspace]);
            return { lock: "held" };
          }) as never,
          ...runtime,
        },
      );
    },
    /** The cache each writeSyncCache call wrote. */
    written(): cacheModule.SyncCache[] {
      return (calls.writeSyncCache ?? []).map(
        (call) => call[1] as cacheModule.SyncCache,
      );
    },
    restore() {
      for (const restore of restores.splice(0)) restore();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

export type SyncHarness = ReturnType<typeof syncHarness>;
