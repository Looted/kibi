import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { errorWasReported } from "../../../src/cli-command.js";
import { SyncError } from "../../../src/commands/sync.js";
import { formatSyncSummary } from "../../../src/diagnostics.js";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import {
  branchStoreManifestPath,
  branchStorePath,
  expectedBranchStoreManifest,
} from "../../../src/utils/branch-store-locator.js";
import { git } from "../../helpers/in-process-workspace.js";
import { type SyncHarness, emptyCache, syncHarness } from "./sync-harness.js";

let h: SyncHarness;
let live: string;
let staging: string;
beforeEach(() => {
  h = syncHarness();
  live = branchStorePath(h.world.root, "main");
  staging = h.path("staging");
});
afterEach(() => h.restore());

const A = "docs/a.md";
const B = "docs/b.md";
const rel = (type: string, from: string, to: string) => ({ type, from, to });
const staged = () => ({ createProlog: () => h.fakeProlog() });

function result(id: string, source: string, type = "req"): ExtractionResult {
  return {
    entity: { id, type, title: id, source },
    relationships: [],
  } as unknown as ExtractionResult;
}

function sources(markdown: string[]) {
  h.world.discovery.markdownFiles = markdown.map((file) => h.path(file));
  for (const file of markdown) h.world.hashes[file] ??= `hash-${file}`;
}

function extracted(extra: Record<string, unknown>) {
  h.set("processExtractions", async () => ({
    results: [],
    failures: [],
    failedCacheKeys: new Set<string>(),
    errors: [],
    ...extra,
  }));
}

function answers(map: Record<string, { success: boolean; error?: string }>) {
  h.world.prolog.query = (goal: string) => ({
    bindings: {},
    ...(map[goal] ?? { success: true }),
  });
}

function goals(): string[] {
  return (h.calls["prolog.query"] ?? []).map((call) => call[0] as string);
}

describe("a staged compile", () => {
  beforeEach(() => {
    sources([A]);
    extracted({ results: [result("REQ-1", A)] });
  });

  test("attaches, saves and publishes the staging store", async () => {
    const contexts: unknown[] = [];
    const out = await h.run(
      {},
      {
        ...staged(),
        afterAttach: (context) => {
          contexts.push(["afterAttach", context]);
        },
        beforeSave: (context) => {
          contexts.push(["beforeSave", context]);
        },
      },
    );
    const context = {
      currentBranch: "main",
      livePath: live,
      rebuild: false,
      stagingPath: staging,
      validateOnly: false,
    };
    expect(contexts).toEqual([
      ["afterAttach", context],
      ["beforeSave", { ...context, kbModified: true }],
    ]);
    expect(h.calls.prepareStagingEnvironment).toEqual([[staging, live, false]]);
    const manifest = branchStoreManifestPath(staging);
    expect(readFileSync(manifest, "utf8")).toBe(
      `${JSON.stringify(expectedBranchStoreManifest("main"), null, 2)}\n`,
    );
    expect(statSync(manifest).mode & 0o777).toBe(0o600);
    expect(goals()).toEqual([
      `kb_attach('${staging}')`,
      "kb_save",
      "kb_detach",
    ]);
    expect(h.events).toContain("prolog.invalidateCache");
    expect(h.events.indexOf("prolog.terminate")).toBeLessThan(
      h.events.indexOf("atomicPublish"),
    );
    expect(h.calls.atomicPublish).toEqual([[staging, live]]);
    expect(h.calls.atomicPublishGeneration).toBeUndefined();
    expect(h.calls.fsyncJournaledBranchStore).toEqual([[live]]);
    expect(h.calls.cleanupStaging).toEqual([[staging]]);
    expect(h.calls.clearRecoveredPendingSourceReceipts).toBeUndefined();
    expect(h.calls.writeSyncCache?.[0]?.[0]).toBe(
      path.join(live, "sync-cache.json"),
    );
    expect(h.logs).toContain("✓ Imported 1 entities, 0 relationships");
    const { exitCode: _exit, ...plain } = out;
    expect(h.logs.at(-1)).toBe(formatSyncSummary(plain));
    expect(out).toMatchObject({
      branch: "main",
      entityCounts: { req: 1 },
      relationshipCount: 0,
      success: true,
      published: true,
      failures: [expect.objectContaining({ category: "KB_MISSING" })],
      exitCode: 0,
    });
    expect(out).not.toHaveProperty("storeTotals");
    expect(out).not.toHaveProperty("commit");
    expect(out.durationMs).toBeLessThan(60_000);
    expect(h.written()[0]?.hashes).toEqual({ [A]: `hash-${A}` });
    expect(h.warnings).toEqual([]);
  });

  test("an unchanged store skips the cache invalidation", async () => {
    h.set("persistEntities", async () => ({
      entityCount: 1,
      kbModified: false,
    }));
    let modified: boolean | undefined;
    await h.run(
      {},
      {
        ...staged(),
        beforeSave: ({ kbModified }) => {
          modified = kbModified;
        },
      },
    );
    expect(modified).toBe(false);
    expect(h.events).not.toContain("prolog.invalidateCache");
  });

  test("a relationship change alone still invalidates the cache", async () => {
    h.set("persistEntities", async () => ({
      entityCount: 1,
      kbModified: false,
    }));
    h.set("persistRelationships", async () => ({
      relationshipCount: 2,
      kbModified: true,
      retrySources: [h.path(A)],
    }));
    await h.run({}, staged());
    expect(h.events).toContain("prolog.invalidateCache");
    expect(h.logs).toContain("✓ Imported 1 entities, 2 relationships");
    expect(h.written()[0]?.hashes).toEqual({});
  });

  test("an existing staging manifest is kept", async () => {
    h.set("prepareStagingEnvironment", async (stagingPath: string) => {
      mkdirSync(stagingPath, { recursive: true });
      writeFileSync(branchStoreManifestPath(stagingPath), "kept");
    });
    await h.run({}, staged());
    expect(readFileSync(branchStoreManifestPath(staging), "utf8")).toBe("kept");
  });

  test("store totals and the commit join the summary", async () => {
    git(h.world.root, "init -q -b main --template=");
    git(h.world.root, "config user.email 'test@test.com'");
    git(h.world.root, "config user.name 'Kibi Test'");
    git(h.world.root, "commit -q --allow-empty --no-verify -m base");
    const head = git(h.world.root, "rev-parse HEAD").trim();
    h.set("queryStoreTotals", async () => ({
      entities: { req: 3 },
      relationships: 1,
    }));
    const out = await h.run({}, staged());
    expect(out.storeTotals).toEqual({ entities: { req: 3 }, relationships: 1 });
    expect(out.commit).toBe(head);
  });

  test("a refused attach terminates and cleans up", async () => {
    answers({ [`kb_attach('${staging}')`]: { success: false, error: "busy" } });
    await expect(h.run({}, staged())).rejects.toThrow(
      new SyncError("Failed to attach to staging KB: busy"),
    );
    expect(h.events).toContain("prolog.terminate");
    expect(h.calls.cleanupStaging).toEqual([[staging]]);
    expect(h.calls.persistEntities).toBeUndefined();
    expect(h.errors).toEqual(["Error: Failed to attach to staging KB: busy"]);
  });

  test("a refused attach without a reason says so", async () => {
    answers({ [`kb_attach('${staging}')`]: { success: false } });
    await expect(h.run({}, staged())).rejects.toThrow(
      "Failed to attach to staging KB: Unknown error",
    );
  });

  test("a failed save publishes nothing", async () => {
    answers({ kb_save: { success: false, error: "disk full" } });
    await expect(h.run({}, staged())).rejects.toThrow(
      new SyncError("Failed to save staging KB: disk full"),
    );
    expect(h.calls.atomicPublish).toBeUndefined();
    expect(goals()).not.toContain("kb_detach");
    expect(h.calls.cleanupStaging).toEqual([[staging]]);
  });

  test("a failed save without a reason says so", async () => {
    answers({ kb_save: { success: false } });
    await expect(h.run({}, staged())).rejects.toThrow(
      "Failed to save staging KB: Unknown error",
    );
  });

  test("without an injected Prolog a real one is started", async () => {
    await expect(h.run({ rebuild: true })).rejects.toThrow(
      "a real Prolog process was started",
    );
    expect(h.calls["prolog.real"]).toEqual([[120000]]);
  });

  test("an injected Prolog gets the staging timeout", async () => {
    const timeouts: number[] = [];
    await h.run(
      {},
      {
        createProlog: ({ timeout }) => {
          timeouts.push(timeout);
          return h.fakeProlog();
        },
      },
    );
    expect(timeouts).toEqual([120000]);
  });

  test("entities of one type are counted together", async () => {
    extracted({ results: [result("REQ-1", A), result("REQ-2", A)] });
    const out = await h.run({}, staged());
    expect(out.entityCounts).toEqual({ req: 2 });
  });

  test("a full reindex with too few entities is diagnosed", async () => {
    h.set("persistEntities", async () => ({
      entityCount: 0,
      kbModified: true,
    }));
    const out = await h.run({}, staged());
    expect(out.failures.map((d) => d.category)).toEqual([
      "KB_MISSING",
      "DOCS_NOT_INDEXED",
    ]);
  });

  test("a failure before staging cleans nothing and is marked reported", async () => {
    const failure = new Error("extraction broke");
    h.set("processExtractions", async () => {
      throw failure;
    });
    await expect(h.run({}, staged())).rejects.toBe(failure);
    expect(h.calls.cleanupStaging).toBeUndefined();
    expect(errorWasReported(failure)).toBe(true);
  });

  test("diagnostics are listed when the compile fails", async () => {
    h.set("persistEntities", async () => {
      throw "plain failure";
    });
    await expect(h.run({}, staged())).rejects.toBe("plain failure");
    expect(h.errors).toEqual(["Error: plain failure"]);
    expect(h.logs.slice(-2)).toEqual([
      "\nDiagnostics:",
      "  [KB_MISSING] warning: Branch KB does not exist for 'main'",
    ]);
  });

  test("a failure without diagnostics lists none", async () => {
    mkdirSync(live, { recursive: true });
    h.set("persistEntities", async () => {
      throw new Error("boom");
    });
    await expect(h.run({}, staged())).rejects.toThrow("boom");
    expect(h.errors).toEqual(["Error: boom"]);
    expect(h.logs).not.toContain("\nDiagnostics:");
  });
});

describe("staged retraction and relationships", () => {
  test("only successfully extracted sources are retracted", async () => {
    sources([A, B]);
    extracted({
      results: [result("REQ-1", A)],
      failures: [{ file: h.path(B), message: "bad" }],
      failedCacheKeys: new Set([B]),
    });
    await h.run({}, staged());
    expect(h.calls.retractEntitiesForSources?.[0]?.[1]).toEqual([h.path(A)]);
  });

  test("a changed shard clears stored relationships first", async () => {
    sources([A]);
    extracted({ results: [result("REQ-1", A)] });
    h.world.cache = emptyCache({
      shardRelationships: { ".kb/relationships/gone.yaml": ["x\0A\0B"] },
    });
    await h.run({}, staged());
    expect(goals()[1]).toBe("kb_retract_all_relationships");
  });

  test("a failed relationship clear aborts", async () => {
    sources([A]);
    extracted({ results: [result("REQ-1", A)] });
    h.world.cache = emptyCache({
      shardRelationships: { ".kb/relationships/gone.yaml": ["x\0A\0B"] },
    });
    answers({ kb_retract_all_relationships: { success: false, error: "no" } });
    await expect(h.run({}, staged())).rejects.toThrow(
      "Failed to clear changed relationship shards: no",
    );
    expect(h.calls.persistEntities).toBeUndefined();
  });

  test("dangling relationships are dropped before persisting", async () => {
    sources([A]);
    extracted({ results: [result("REQ-1", A)] });
    const shard = h.path(".kb/relationships/a.yaml");
    mkdirSync(path.dirname(shard), { recursive: true });
    writeFileSync(shard, "x\n");
    git(h.world.root, "init -q -b main --template=");
    git(h.world.root, "add .kb/relationships/a.yaml");
    h.world.hashes[".kb/relationships/a.yaml"] = "ha";
    h.set("extractRelationshipShard", () => ({
      relationships: [
        rel("relates_to", "REQ-1", "NOPE"),
        rel("relates_to", "REQ-1", "REQ-1"),
      ],
    }));
    h.set("validateRelationships", (relationships: unknown[]) => [
      { relationship: relationships[0], error: "missing_to" },
    ]);
    await h.run({}, staged());
    expect(h.warnings[0]).toBe("Warning: 1 dangling relationship(s) found");
    expect(h.calls.validateRelationships?.[0]?.[1]).toEqual(new Set());
    expect(h.calls.persistRelationships?.[0]?.slice(2)).toEqual([
      [rel("relates_to", "REQ-1", "REQ-1")],
      { workspaceRoot: h.world.root },
    ]);
  });
});

describe("staged validation", () => {
  beforeEach(() => {
    sources([A]);
  });

  test("a passing validation discards the staging store", async () => {
    extracted({ results: [result("REQ-1", A)] });
    const out = await h.run({ validateOnly: true }, staged());
    expect(goals()).toEqual([`kb_attach('${staging}')`, "kb_detach"]);
    const at = (event: string) => h.events.lastIndexOf(event);
    expect(at("prolog.query kb_detach")).toBeLessThan(at("prolog.terminate"));
    expect(at("prolog.terminate")).toBeLessThan(at("cleanupStaging"));
    expect(h.logs).toContain("OK: Validation passed (1 entities)");
    expect(h.calls.atomicPublish).toBeUndefined();
    expect(h.calls.writeSyncCache).toBeUndefined();
    expect(out).toMatchObject({
      branch: "main",
      success: true,
      published: false,
      exitCode: 0,
    });
  });

  test("a validation with errors fails after compiling", async () => {
    extracted({
      results: [result("REQ-1", A)],
      errors: [{ file: h.path(B), message: "bad yaml" }],
    });
    const out = await h.run({ validateOnly: true }, staged());
    expect(h.errors).toEqual([
      `${h.path(B)}: bad yaml`,
      "FAILED: 1 errors found",
    ]);
    expect(h.logs.some((line) => line.startsWith("OK:"))).toBe(false);
    expect(out).toMatchObject({ success: false, exitCode: 1 });
  });
});

describe("a staged rebuild", () => {
  beforeEach(() => {
    sources([A]);
    extracted({ results: [result("REQ-1", A)] });
  });

  test("a journaled live store gets a new generation", async () => {
    mkdirSync(live, { recursive: true });
    writeFileSync(path.join(live, "storage.json"), "{}");
    await h.run({ rebuild: true }, staged());
    expect(h.calls.prepareStagingEnvironment).toEqual([[staging, live, true]]);
    expect(h.calls.atomicPublishGeneration).toEqual([[staging, live]]);
    expect(h.calls.atomicPublish).toBeUndefined();
  });

  test("a legacy live store is swapped whole", async () => {
    mkdirSync(live, { recursive: true });
    await h.run({ rebuild: true }, staged());
    expect(h.calls.atomicPublish).toEqual([[staging, live]]);
    expect(h.calls.atomicPublishGeneration).toBeUndefined();
  });

  test("a journaled store without a rebuild is swapped whole", async () => {
    mkdirSync(live, { recursive: true });
    writeFileSync(path.join(live, "storage.json"), "{}");
    await h.run({}, staged());
    expect(h.calls.atomicPublish).toEqual([[staging, live]]);
  });
});

describe("a staged recovery", () => {
  let backup: string;
  beforeEach(() => {
    backup = h.path("backups/deep/old");
    sources([A]);
    extracted({ results: [result("REQ-1", A)] });
    mkdirSync(live, { recursive: true });
    writeFileSync(path.join(live, "marker"), "old");
  });

  const recover = () => h.run({ recoveryBackupPath: backup }, staged());

  test("the live store moves to the backup and staging takes its place", async () => {
    h.set("prepareStagingEnvironment", async (stagingPath: string) => {
      mkdirSync(stagingPath, { recursive: true });
      writeFileSync(path.join(stagingPath, "marker"), "new");
    });
    await recover();
    expect(readFileSync(path.join(backup, "marker"), "utf8")).toBe("old");
    expect(readFileSync(path.join(live, "marker"), "utf8")).toBe("new");
    expect(h.calls.atomicPublish).toBeUndefined();
    expect(h.calls.atomicPublishGeneration).toBeUndefined();
    expect(h.calls.fsyncJournaledBranchStore).toEqual([[live]]);
    expect(h.calls.clearRecoveredPendingSourceReceipts).toBeUndefined();
  });

  test("a vanished live store refuses", async () => {
    h.set("prepareStagingEnvironment", async (stagingPath: string) => {
      mkdirSync(stagingPath, { recursive: true });
      const { rmSync } = await import("node:fs");
      rmSync(live, { recursive: true, force: true });
    });
    await expect(recover()).rejects.toThrow(
      new SyncError(`Recovery target disappeared before publication: ${live}`),
    );
  });

  test("an occupied backup path refuses", async () => {
    mkdirSync(backup, { recursive: true });
    await expect(recover()).rejects.toThrow(
      new SyncError(`Recovery backup path already exists: ${backup}`),
    );
    expect(readFileSync(path.join(live, "marker"), "utf8")).toBe("old");
  });

  test("a failed swap puts the live store back", async () => {
    const { rmSync } = await import("node:fs");
    await expect(
      h.run(
        { recoveryBackupPath: backup },
        {
          ...staged(),
          beforeSave: () => rmSync(staging, { recursive: true, force: true }),
        },
      ),
    ).rejects.toThrow(/ENOENT/);
    expect(readFileSync(path.join(live, "marker"), "utf8")).toBe("old");
    expect(existsSync(backup)).toBe(false);
  });

  test("recovered receipts are cleared after publication", async () => {
    const receipt = { receiptPath: "r.json", path: "p", afterHash: "a" };
    h.world.discovery.recoveredPendingReceiptPaths = [receipt];
    await recover();
    expect(h.calls.clearRecoveredPendingSourceReceipts).toEqual([
      [h.world.root, [receipt]],
    ]);
    expect(
      h.events.indexOf("clearRecoveredPendingSourceReceipts"),
    ).toBeLessThan(h.events.indexOf("cleanupStaging"));
  });

  test("a failed receipt clear still cleans the staging store", async () => {
    h.world.discovery.recoveredPendingReceiptPaths = [
      { receiptPath: "r.json", path: "p", afterHash: "a" },
    ];
    h.set("clearRecoveredPendingSourceReceipts", () => {
      throw new Error("receipt raced");
    });
    await expect(recover()).rejects.toThrow("receipt raced");
    expect(h.calls.cleanupStaging).toEqual([[staging], [staging]]);
    expect(h.calls.writeSyncCache).toBeUndefined();
  });

  test("receipts of a plain compile are never cleared", async () => {
    h.world.discovery.recoveredPendingReceiptPaths = [
      { receiptPath: "r.json", path: "p", afterHash: "a" },
    ];
    await h.run({}, staged());
    expect(h.calls.clearRecoveredPendingSourceReceipts).toBeUndefined();
  });
});

describe("pending relationship shards", () => {
  function pendingMissingShard() {
    git(h.world.root, "init -q -b main --template=");
    mkdirSync(h.path(".kb/relationships"), { recursive: true });
    const receipts = h.path(".kb/recovery/pending-sources");
    mkdirSync(receipts, { recursive: true });
    writeFileSync(
      path.join(receipts, "r.json"),
      JSON.stringify({ path: ".kb/relationships/new.yaml", afterHash: "a" }),
    );
    return path.join(receipts, "r.json");
  }

  test("a recovery adopts a receipt whose shard is missing", async () => {
    const receiptPath = pendingMissingShard();
    sources([A]);
    extracted({ results: [result("REQ-1", A)] });
    mkdirSync(live, { recursive: true });
    await h.run({ recoveryBackupPath: h.path("backup") }, staged());
    expect(h.calls.clearRecoveredPendingSourceReceipts?.[0]?.[1]).toEqual([
      expect.objectContaining({
        receiptPath,
        path: ".kb/relationships/new.yaml",
      }),
    ]);
  });

  test("a compile refuses a receipt whose shard is missing", async () => {
    pendingMissingShard();
    sources([A]);
    await expect(h.run({}, staged())).rejects.toThrow("new.yaml");
  });
});
