import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { normalizedEntityHash } from "../../../src/commands/sync.js";
import { formatSyncSummary } from "../../../src/diagnostics.js";
import { ENGINE_READ_TIME_LIMIT_ENV } from "../../../src/engine-limits.js";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import { branchStorePath } from "../../../src/utils/branch-store-locator.js";
import { git } from "../../helpers/in-process-workspace.js";
import { type SyncHarness, emptyCache, syncHarness } from "./sync-harness.js";

let h: SyncHarness;
let live: string;
beforeEach(() => {
  h = syncHarness();
  live = branchStorePath(h.world.root, "main");
  mkdirSync(live, { recursive: true });
});
afterEach(() => h.restore());

const A = "docs/a.md";
const B = "docs/b.md";
const rel = (type: string, from: string, to: string) => ({ type, from, to });

function result(
  id: string,
  source: string,
  type = "scenario",
  extra: Record<string, unknown> = {},
): ExtractionResult {
  return {
    entity: { id, type, title: id, source, ...extra },
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

/** A v2 cache in which `changed` sources are stale. */
function deltaCache(
  all: string[],
  changed: string[],
  extra: Record<string, unknown> = {},
) {
  const now = new Date().toISOString();
  h.world.cache = emptyCache({
    hashes: Object.fromEntries(
      all.map((file) => [
        file,
        changed.includes(file) ? "old" : `hash-${file}`,
      ]),
    ),
    seenAt: Object.fromEntries(all.map((file) => [file, now])),
    entityHashes: {},
    sourceEntityIds: {},
    ...extra,
  });
}

describe("full compile on the journaled engine", () => {
  test("every changed source is compiled and published", async () => {
    sources([A, B]);
    const a = result("SC-A", A);
    const b = result("REQ-B", B, "req");
    const a2 = result("SC-A2", A);
    extracted({ results: [a, b, a2] });
    h.set("queryStoreTotals", async () => ({ entities: 3 }));
    const before = process.env[ENGINE_READ_TIME_LIMIT_ENV];
    process.env[ENGINE_READ_TIME_LIMIT_ENV] = "5000";
    let summary: Record<string, unknown>;
    try {
      summary = (await h.run()) as unknown as Record<string, unknown>;
    } finally {
      if (before === undefined) delete process.env[ENGINE_READ_TIME_LIMIT_ENV];
      else process.env[ENGINE_READ_TIME_LIMIT_ENV] = before;
    }
    expect(h.calls["engine.start"]?.[0]?.[0]).toMatchObject({
      timeout: 120_000,
      branch: "main",
      workspaceRoot: h.world.root,
      readLimits: undefined,
    });
    expect(h.calls.retractEntitiesForSources?.[0]?.[1]).toEqual([
      h.path(A),
      h.path(B),
    ]);
    expect(h.calls.persistEntities?.[0]?.[1]).toEqual([a, b, a2]);
    expect(h.calls.persistEntities?.[0]?.[3]).toEqual({
      loadExistingEntityIds: true,
    });
    expect(h.calls.persistRelationships?.[0]?.[3]).toEqual({
      workspaceRoot: h.world.root,
    });
    expect(h.calls["engine.invalidateCache"]).toHaveLength(1);
    expect(h.calls["engine.save"]).toHaveLength(1);
    expect(h.calls.writeSyncCache?.[0]?.[0]).toBe(
      path.join(live, "sync-cache.json"),
    );
    expect(h.events.indexOf("engine.save")).toBeLessThan(
      h.events.indexOf("writeSyncCache"),
    );
    expect(h.events.at(-1)).toBe("releaseSymbolCompilerLock");
    expect(h.events).toContain("engine.terminate");
    expect(summary).toMatchObject({
      branch: "main",
      entityCounts: { scenario: 2, req: 1 },
      storeTotals: { entities: 3 },
      relationshipCount: 0,
      success: true,
      published: true,
      failures: [],
      exitCode: 0,
    });
    const { exitCode: _exit, ...plain } = summary;
    expect(h.logs).toEqual([
      "✓ Imported 3 entities, 0 relationships (removed 0 entities)",
      formatSyncSummary(plain as never),
    ]);
  });

  test("a missing store and unindexed documents are diagnosed", async () => {
    h.world.root && mkdirSync(live, { recursive: true });
    sources([A, B]);
    extracted({ results: [result("SC-A", A)] });
    const result1 = await h.run();
    expect(result1.failures.map((d) => d.category)).toEqual([
      "DOCS_NOT_INDEXED",
    ]);
    expect("storeTotals" in result1).toBe(false);
  });

  test("an absent store is reported missing", async () => {
    const empty = syncHarness();
    try {
      empty.world.discovery.markdownFiles = [empty.path(A)];
      empty.world.hashes[A] = "h";
      empty.set("processExtractions", async () => ({
        results: [result("SC-A", A)],
        failures: [],
        failedCacheKeys: new Set(),
        errors: [],
      }));
      const outcome = await empty.run();
      expect(outcome.failures.map((d) => d.category)).toEqual(["KB_MISSING"]);
    } finally {
      empty.restore();
    }
  });

  test("failed and retried sources stay out of the cache", async () => {
    sources([A, B, "docs/c.md"]);
    extracted({
      results: [result("SC-B", B), result("SC-C", "docs/c.md")],
      failures: [{ file: h.path(A), message: "bad" }],
      failedCacheKeys: new Set([A]),
    });
    h.set("persistRelationships", async () => ({
      relationshipCount: 2,
      kbModified: false,
      retrySources: [h.path("docs/c.md")],
    }));
    const outcome = await h.run();
    expect(h.calls.retractEntitiesForSources?.[0]?.[1]).toEqual([
      h.path(B),
      h.path("docs/c.md"),
    ]);
    expect(Object.keys(h.written()[0]?.hashes ?? {})).toEqual([B]);
    expect(outcome.relationshipCount).toBe(2);
  });

  test("an unchanged store is saved without invalidating reads", async () => {
    sources([A]);
    extracted({ results: [result("SC-A", A)] });
    h.set("persistEntities", async () => ({
      entityCount: 1,
      kbModified: false,
    }));
    await h.run();
    expect(h.calls["engine.invalidateCache"]).toBeUndefined();
    expect(h.calls["engine.save"]).toHaveLength(1);
  });

  test.each([
    ["removed entities", { removed: 1 }],
    ["relationship edits", { relationships: true }],
    ["changed relationships", { relModified: true }],
  ])("%s invalidate reads", async (_label, change) => {
    sources([A]);
    extracted({ results: [result("SC-A", A)] });
    h.set("persistEntities", async () => ({
      entityCount: 1,
      kbModified: false,
    }));
    if ("removed" in change)
      h.set("retractEntitiesForSources", async () => change.removed);
    if ("relModified" in change)
      h.set("persistRelationships", async () => ({
        relationshipCount: 0,
        kbModified: true,
        retrySources: [],
      }));
    if ("relationships" in change) {
      h.world.cache = emptyCache({
        shardRelationships: {
          ".kb/relationships/gone.yaml": ["relates_to\0X\0Y"],
        },
      });
    }
    await h.run();
    expect(h.calls["engine.invalidateCache"]).toHaveLength(1);
  });

  test("dangling relationships are reported and not persisted", async () => {
    sources([A]);
    extracted({ results: [result("SC-A", A)] });
    const shard = h.path(".kb/relationships/a.yaml");
    mkdirSync(path.dirname(shard), { recursive: true });
    writeFileSync(shard, "x\n");
    git(h.world.root, "init -q -b main --template=");
    git(h.world.root, "add .kb/relationships/a.yaml");
    h.world.hashes[".kb/relationships/a.yaml"] = "ha";
    h.set("extractRelationshipShard", () => ({
      relationships: [rel("relates_to", "SC-A", "NOPE")],
    }));
    h.set("validateRelationships", (relationships: unknown[]) =>
      relationships.length === 0
        ? []
        : [
            {
              relationship: rel("relates_to", "SC-A", "NOPE"),
              error: "missing_to",
            },
          ],
    );
    await h.run();
    expect(h.warnings).toContain("Warning: 1 dangling relationship(s) found");
    expect(h.calls.persistRelationships?.[0]?.[2]).toEqual([]);
  });
});

describe("relationship clearing", () => {
  beforeEach(() => {
    sources([A]);
    extracted({ results: [result("SC-A", A)] });
    h.world.cache = emptyCache({
      shardRelationships: {
        ".kb/relationships/gone.yaml": ["relates_to\0X\0Y"],
      },
    });
  });

  test("a failed clear is retried once on a restarted engine", async () => {
    let attempts = 0;
    h.world.engine.query = () => {
      attempts += 1;
      return attempts === 1
        ? { success: false, bindings: {}, error: "busy" }
        : { success: true, bindings: {} };
    };
    h.set("stop", async () => {
      throw new Error("stop failed");
    });
    await h.run();
    expect(attempts).toBe(2);
    expect(h.calls["engine.stop"]).toEqual([[]]);
    expect(h.calls["engine.start"]).toHaveLength(2);
  });

  test("a clear that fails twice names the attachment", async () => {
    h.world.engine.query = () => ({ success: false, bindings: {} });
    await expect(h.run()).rejects.toThrow(
      "Failed to clear changed relationship shards: Unknown error; mismatch after kb_retract_all_relationships",
    );
    expect(h.calls.readEngineAttachmentIdentity?.[0]).toEqual([live]);
    expect(h.calls.parseEngineAttachmentIdentity?.[0]).toEqual(["{status}"]);
    expect(h.calls.formatEngineAttachmentMismatch?.[0]).toEqual([
      "kb_retract_all_relationships",
      { id: "live" },
      { parsed: "{status}" },
    ]);
  });

  test("an unreadable engine status names no attachment", async () => {
    h.world.engine.query = () => ({
      success: false,
      bindings: {},
      error: "locked",
    });
    h.set("queryStatusJson", async () => {
      throw new Error("down");
    });
    await expect(h.run()).rejects.toMatchObject({
      message: expect.stringContaining(
        "Failed to clear changed relationship shards: locked; mismatch",
      ),
      code: "RELATIONSHIP_SHARD_CLEAR_FAILED",
    });
    expect(h.calls.formatEngineAttachmentMismatch?.[0]).toEqual([
      "kb_retract_all_relationships",
      { id: "live" },
      null,
    ]);
  });
});

describe("saving", () => {
  test("a failed save names the attachment and keeps the cache", async () => {
    sources([A]);
    h.world.engine.save = () => ({ success: false, bindings: {}, error: "io" });
    extracted({ results: [result("SC-A", A)] });
    await expect(h.run()).rejects.toMatchObject({
      message: expect.stringContaining(
        "Failed to save journaled KB: io; mismatch after kb_save",
      ),
      code: "KB_SAVE_FAILED",
    });
    expect(h.calls.writeSyncCache).toBeUndefined();
    expect(h.events).toContain("engine.terminate");
  });

  test("a save failure without a message says so", async () => {
    sources([A]);
    h.world.engine.save = () => ({ success: false, bindings: {} });
    extracted({ results: [result("SC-A", A)] });
    await expect(h.run()).rejects.toThrow(
      "Failed to save journaled KB: Unknown error",
    );
  });
});

describe("entity-delta compile", () => {
  test("changed entities replace their relationships and edges", async () => {
    sources([A, B]);
    const keep = result("SC-KEEP", B);
    const edited = result("SC-EDIT", A, "scenario", { title: "new" });
    deltaCache([A, B], [A], {
      entityHashes: {
        "SC-EDIT": "old",
        "SC-GONE": "g",
        "SC-KEEP": normalizedEntityHash(keep),
      },
      sourceEntityIds: { [A]: ["SC-EDIT", "SC-GONE"], [B]: ["SC-KEEP"] },
      relationshipHashes: {},
      shardRelationships: {
        ".kb/relationships/gone.yaml": [
          "relates_to\0SC-KEEP\0SC-X",
          "relates_to\0SC-GONE\0SC-KEEP",
          "relates_to\0SC-KEEP\0SC-GONE",
          "relates_to\0SC-EDIT\0SC-KEEP",
        ],
      },
    });
    extracted({ results: [edited] });
    await h.run();
    expect(h.calls.retractEntitiesById?.[0]?.[1]).toEqual(["SC-GONE"]);
    expect(h.calls.retractEntityRelationshipsById?.[0]?.[1]).toEqual([
      "SC-EDIT",
    ]);
    expect(h.calls.retractRelationships?.[0]?.[1]).toEqual([
      rel("relates_to", "SC-KEEP", "SC-X"),
    ]);
    expect(h.calls.validateRelationships).toBeUndefined();
    expect(h.calls.retractEntitiesForSources).toBeUndefined();
  });

  test("a relationship-only change persists just its edges", async () => {
    sources([A]);
    deltaCache([A], [], {
      entityHashes: { "SC-A": "a" },
      sourceEntityIds: { [A]: ["SC-A"] },
      relationshipHashes: { ".kb/relationships/gone.yaml": "x" },
      shardRelationships: {
        ".kb/relationships/gone.yaml": ["relates_to\0SC-A\0SC-B"],
      },
    });
    await h.run();
    expect(h.calls.processExtractions?.[0]?.[0]).toEqual([]);
    expect(h.calls.retractRelationships?.[0]?.[1]).toEqual([
      rel("relates_to", "SC-A", "SC-B"),
    ]);
    expect(h.calls.persistRelationships?.[0]?.[2]).toEqual([]);
    expect(h.calls["engine.query"]).toBeUndefined();
  });
});

describe("entity-delta relationship candidates", () => {
  const SA = ".kb/relationships/a.yaml";
  const SB = ".kb/relationships/b.yaml";
  const M = ".kb/symbols.yaml";
  const kept = rel("relates_to", "SC-KEEP", "SC-X");
  const added = rel("relates_to", "SC-NEW", "SC-X");

  /** Track two shards: a.yaml unchanged with `kept`, b.yaml adding `added`. */
  function shards(bChanged: boolean) {
    for (const shard of [SA, SB]) {
      mkdirSync(path.dirname(h.path(shard)), { recursive: true });
      writeFileSync(h.path(shard), "x\n");
      h.world.hashes[shard] = `h-${shard}`;
    }
    git(h.world.root, "init -q -b main --template=");
    git(h.world.root, `add ${SA} ${SB}`);
    h.set("extractRelationshipShard", (file: string) => ({
      relationships: file.endsWith("a.yaml") ? [kept] : [added],
    }));
    return {
      relationshipHashes: {
        [SA]: `h-${SA}`,
        [SB]: bChanged ? "old" : `h-${SB}`,
      },
      shardRelationships: {
        [SA]: ["relates_to\0SC-KEEP\0SC-X"],
        [SB]: bChanged ? [] : ["relates_to\0SC-NEW\0SC-X"],
      },
    };
  }

  test("a changed markdown source re-persists every shard edge", async () => {
    sources([A]);
    deltaCache([A], [A], {
      ...shards(false),
      entityHashes: { "SC-A": "old" },
      sourceEntityIds: { [A]: ["SC-A"] },
    });
    extracted({ results: [result("SC-A", A)] });
    const out = await h.run();
    expect(h.calls.persistRelationships?.[0]?.[2]).toEqual([kept, added]);
    expect(out.durationMs).toBeLessThan(60_000);
  });

  test("a changed manifest re-persists every shard edge", async () => {
    h.world.discovery.manifestFiles = [h.path(M)];
    h.world.hashes[M] = "hm";
    deltaCache([M], [M], {
      ...shards(false),
      entityHashes: { "SYM-1": "old" },
      sourceEntityIds: { [M]: ["SYM-1"] },
    });
    extracted({ results: [result("SYM-1", M, "symbol")] });
    await h.run();
    expect(h.calls.persistRelationships?.[0]?.[2]).toEqual([kept, added]);
  });

  test("a shard-only change persists only the added edges", async () => {
    sources([A]);
    deltaCache([A], [], {
      ...shards(true),
      entityHashes: { "SC-A": "a" },
      sourceEntityIds: { [A]: ["SC-A"] },
    });
    await h.run();
    expect(h.calls.persistRelationships?.[0]?.[2]).toEqual([added]);
  });
});
