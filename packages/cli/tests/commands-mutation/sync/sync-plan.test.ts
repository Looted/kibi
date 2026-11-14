import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import path from "node:path";
import { SyncError, normalizedEntityHash } from "../../../src/commands/sync.js";
import {
  SYNC_CACHE_TTL_MS,
  SYNC_CACHE_VERSION,
  SYNC_COMPILER_FINGERPRINT,
} from "../../../src/commands/sync/cache.js";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import { branchStorePath } from "../../../src/utils/branch-store-locator.js";
import { type SyncHarness, emptyCache, syncHarness } from "./sync-harness.js";

let h: SyncHarness;
beforeEach(() => {
  h = syncHarness();
});
afterEach(() => h.restore());

const A = "docs/a.md";
const B = "docs/b.md";
const M = ".kb/symbols.yaml";

function result(
  id: string,
  source: string,
  extra: Record<string, unknown> = {},
): ExtractionResult {
  return {
    entity: { id, type: "scenario", title: id, source, ...extra },
    relationships: [],
  } as unknown as ExtractionResult;
}

function sources(markdown: string[], manifests: string[] = []) {
  h.world.discovery.markdownFiles = markdown.map((file) => h.path(file));
  h.world.discovery.manifestFiles = manifests.map((file) => h.path(file));
  for (const file of [...markdown, ...manifests])
    h.world.hashes[file] ??= `hash-${file}`;
}

function extracted(results: ExtractionResult[], extra = {}) {
  h.set("processExtractions", async () => ({
    results,
    failures: [],
    failedCacheKeys: new Set<string>(),
    errors: [],
    ...extra,
  }));
}

function changedFiles() {
  const [markdown, manifests, validateOnly, root] = h.calls
    .processExtractions?.[0] as [string[], string[], boolean, string];
  expect(root).toBe(h.world.root);
  return {
    markdown: markdown.map((file) => path.relative(h.world.root, file)),
    manifests: manifests.map((file) => path.relative(h.world.root, file)),
    validateOnly,
  };
}

const recent = () => new Date().toISOString();

describe("explicit coordinate refresh", () => {
  test("a missing analyzer refuses the refresh", async () => {
    sources([], [M]);
    h.set("sourceAnalyzerInstallProblems", () => [
      { problem: "ts missing", fix: "Install ts." },
      { problem: "py old", fix: "Update py." },
    ]);
    const failure = await h
      .run({ refreshSymbolCoordinates: true })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(SyncError);
    expect((failure as SyncError).message).toBe(
      "Symbol coordinate refresh refused: ts missing; py old. Install ts. Update py. The stored coordinates were kept.",
    );
    expect((failure as { code?: string }).code).toBe(
      "SOURCE_ANALYZER_UNAVAILABLE",
    );
    expect(h.calls.sourceAnalyzerInstallProblems).toEqual([[h.world.root]]);
    expect(h.calls.refreshManifestCoordinates).toBeUndefined();
  });

  test("refreshed manifests recompile even when unchanged", async () => {
    sources([A], [M]);
    const now = recent();
    h.world.cache = emptyCache({
      hashes: { [A]: `hash-${A}`, [M]: `m:hash-${M}` },
      seenAt: { [A]: now, [M]: now },
      entityHashes: {},
      sourceEntityIds: {},
    });
    const symbol = result("SYM-1", M, { type: "symbol" });
    h.world.cache.entityHashes = { "SYM-1": normalizedEntityHash(symbol) };
    h.world.cache.sourceEntityIds = { [M]: ["SYM-1"] };
    extracted([symbol]);
    await h.run({ refreshSymbolCoordinates: true });
    expect(h.calls.refreshManifestCoordinates).toEqual([
      [h.path(M), h.world.root, { refreshSymbolCoordinates: true }],
    ]);
    expect(changedFiles()).toEqual({
      markdown: [],
      manifests: [M],
      validateOnly: false,
    });
    expect(h.calls.persistEntities?.[0]?.[1]).toEqual([symbol]);
  });

  test("a validation refreshes nothing", async () => {
    sources([], [M]);
    await h.run(
      { refreshSymbolCoordinates: true, validateOnly: true },
      { createProlog: () => h.fakeProlog() },
    );
    expect(h.calls.sourceAnalyzerInstallProblems).toBeUndefined();
  });
});

describe("changed sources", () => {
  test("a first sync extracts every source", async () => {
    sources([B, A], [M]);
    await h.run();
    expect(changedFiles()).toEqual({
      markdown: [A, B],
      manifests: [M],
      validateOnly: false,
    });
  });

  test("only changed or expired sources are extracted from a v2 cache", async () => {
    const files = [
      "docs/same.md",
      "docs/edit.md",
      "docs/old.md",
      "docs/bad.md",
    ];
    sources(files, [M, ".kb/other.yaml"]);
    h.world.hashes["docs/edit.md"] = "new";
    const now = recent();
    const old = new Date(Date.now() - SYNC_CACHE_TTL_MS - 60_000).toISOString();
    h.world.cache = emptyCache({
      hashes: {
        "docs/same.md": "hash-docs/same.md",
        "docs/edit.md": "old",
        "docs/old.md": "hash-docs/old.md",
        "docs/bad.md": "hash-docs/bad.md",
        [M]: `m:hash-${M}`,
        ".kb/other.yaml": "m:stale",
      },
      seenAt: {
        "docs/same.md": now,
        "docs/edit.md": now,
        "docs/old.md": old,
        "docs/bad.md": "soon",
        [M]: now,
        ".kb/other.yaml": now,
      },
      entityHashes: {},
      sourceEntityIds: {},
    });
    await h.run();
    expect(changedFiles()).toEqual({
      markdown: ["docs/bad.md", "docs/edit.md", "docs/old.md"],
      manifests: [".kb/other.yaml"],
      validateOnly: false,
    });
  });

  test("a source without a sighting is expired", async () => {
    sources([A]);
    h.world.cache = emptyCache({
      hashes: { [A]: `hash-${A}` },
      entityHashes: {},
      sourceEntityIds: {},
    });
    await h.run();
    expect(changedFiles().markdown).toEqual([A]);
  });

  test("a sighting exactly at the time limit is still fresh", async () => {
    sources([A, B]);
    const realNow = Date.now;
    const fixed = realNow();
    Date.now = () => fixed;
    try {
      h.world.cache = emptyCache({
        hashes: { [A]: `hash-${A}`, [B]: "old" },
        seenAt: {
          [A]: new Date(fixed - SYNC_CACHE_TTL_MS).toISOString(),
          [B]: new Date(fixed).toISOString(),
        },
        entityHashes: {},
        sourceEntityIds: {},
      });
      await h.run();
    } finally {
      Date.now = realNow;
    }
    expect(changedFiles().markdown).toEqual([B]);
  });

  test("a validation or rebuild extracts every source", async () => {
    sources([A]);
    const now = recent();
    const cache = () =>
      emptyCache({
        hashes: { [A]: `hash-${A}` },
        seenAt: { [A]: now },
        entityHashes: {},
        sourceEntityIds: {},
      });
    h.world.cache = cache();
    await h.run({ validateOnly: true }, { createProlog: () => h.fakeProlog() });
    expect(changedFiles()).toMatchObject({ markdown: [A], validateOnly: true });
    h.calls.processExtractions = [];
    h.world.cache = cache();
    await h.run({ rebuild: true }, { createProlog: () => h.fakeProlog() });
    expect(changedFiles().markdown).toEqual([A]);
  });

  test("a removed source's entities are retracted", async () => {
    sources([A]);
    const now = recent();
    h.world.cache = emptyCache({
      hashes: { [A]: `hash-${A}`, [B]: "gone" },
      seenAt: { [A]: now, [B]: now },
      entityHashes: { "SC-A": "x", "SC-B1": "y", "SC-B2": "z" },
      sourceEntityIds: { [A]: ["SC-A"], [B]: ["SC-B1", "SC-B2"] },
    });
    await h.run();
    expect(h.calls.retractEntitiesById?.[0]?.[1]).toEqual(["SC-B1", "SC-B2"]);
    const [written] = h.written();
    expect(written?.entityHashes).toEqual({ "SC-A": "x" });
    expect(written?.sourceEntityIds).toEqual({ [A]: ["SC-A"] });
    expect(written?.hashes).toEqual({ [A]: `hash-${A}` });
  });
});

describe("entity deltas", () => {
  function v2(
    entityHashes: Record<string, string>,
    ids: Record<string, string[]>,
  ) {
    const now = recent();
    h.world.cache = emptyCache({
      hashes: { [A]: "old-a", [B]: `hash-${B}` },
      seenAt: { [A]: now, [B]: now },
      entityHashes,
      sourceEntityIds: ids,
    });
  }

  test("only entities whose payload changed are persisted", async () => {
    sources([A, B]);
    const same = result("SC-SAME", A);
    const edited = result("SC-EDIT", A, { title: "new" });
    v2(
      {
        "SC-SAME": normalizedEntityHash(same),
        "SC-EDIT": "old",
        "SC-GONE": "g",
        "SC-B": "b",
      },
      { [A]: ["SC-EDIT", "SC-GONE", "SC-SAME"], [B]: ["SC-B"] },
    );
    extracted([same, edited]);
    await h.run();
    expect(h.calls.persistEntities?.[0]?.[1]).toEqual([edited]);
    expect(h.calls.persistEntities?.[0]?.[3]).toEqual({
      loadExistingEntityIds: false,
    });
    expect(h.calls.retractEntitiesById?.[0]?.[1]).toEqual(["SC-GONE"]);
    expect(h.calls.retractEntityRelationshipsById?.[0]?.[1]).toEqual([
      "SC-EDIT",
    ]);
    const [written] = h.written();
    expect(written?.entityHashes).toEqual({
      "SC-SAME": normalizedEntityHash(same),
      "SC-EDIT": normalizedEntityHash(edited),
      "SC-B": "b",
    });
    expect(written?.sourceEntityIds).toEqual({
      [A]: ["SC-EDIT", "SC-SAME"],
      [B]: ["SC-B"],
    });
  });

  test("a source that failed keeps its last entities", async () => {
    sources([A]);
    v2({ "SC-A": "a" }, { [A]: ["SC-A"] });
    extracted([], {
      failures: [{ file: h.path(A), message: "broken" }],
      failedCacheKeys: new Set([A]),
    });
    await h.run();
    expect(h.calls.retractEntitiesById?.[0]?.[1]).toEqual([]);
    const [written] = h.written();
    expect(written?.sourceEntityIds).toEqual({ [A]: ["SC-A"] });
    expect(written?.hashes).toEqual({});
  });

  test("a v1 cache recompiles everything once with all entities", async () => {
    sources([A, B], [M]);
    const now = recent();
    h.world.cache = emptyCache({
      hashes: { [A]: `hash-${A}`, [B]: `hash-${B}`, [M]: `m:hash-${M}` },
      seenAt: { [A]: now, [B]: now, [M]: now },
    });
    const a = result("SC-A", A);
    extracted([a]);
    await h.run();
    expect(changedFiles()).toMatchObject({ markdown: [A, B], manifests: [M] });
    expect(h.calls.persistEntities?.[0]?.[1]).toEqual([a]);
    expect(h.calls.persistEntities?.[0]?.[3]).toEqual({
      loadExistingEntityIds: true,
    });
    expect(h.calls.retractEntitiesForSources?.[0]?.[1]).toEqual([
      h.path(A),
      h.path(B),
      h.path(M),
    ]);
  });

  test("an expired source forces its entities through", async () => {
    sources([A]);
    const same = result("SC-SAME", A);
    h.world.cache = emptyCache({
      hashes: { [A]: `hash-${A}` },
      seenAt: {},
      entityHashes: { "SC-SAME": normalizedEntityHash(same) },
      sourceEntityIds: { [A]: ["SC-SAME"] },
    });
    extracted([same]);
    await h.run();
    expect(h.calls.persistEntities?.[0]?.[1]).toEqual([same]);
  });
});

describe("nothing changed", () => {
  test("the cache is refreshed after the checkpoint", async () => {
    sources([A, B]);
    const now = recent();
    h.world.cache = emptyCache({
      hashes: { [A]: `hash-${A}`, [B]: `hash-${B}` },
      seenAt: { [A]: now, [B]: now },
      semanticHashes: { [A]: "sa" },
      semanticContracts: { [A]: true },
      entityHashes: { "SC-A": "x" },
      sourceEntityIds: { [A]: ["SC-A"] },
      extractionFailures: {},
    });
    h.world.hashes[B] = "edited";
    extracted([], {
      failures: [{ file: h.path(B), message: "bad" }],
      failedCacheKeys: new Set([B]),
    });
    const result = await h.run();
    expect(result).toMatchObject({ success: true, published: false });
    expect(h.events.indexOf("engine.checkpoint")).toBeLessThan(
      h.events.indexOf("writeSyncCache"),
    );
    const [cachePath, written] = h.calls.writeSyncCache?.[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(cachePath).toBe(
      path.join(branchStorePath(h.world.root, "main"), "sync-cache.json"),
    );
    expect(written).toMatchObject({
      version: SYNC_CACHE_VERSION,
      hashes: { [A]: `hash-${A}` },
      semanticHashes: { [A]: "sa" },
      semanticContracts: { [A]: true },
      entityHashes: { "SC-A": "x" },
      sourceEntityIds: { [A]: ["SC-A"] },
      relationshipHashes: {},
      shardRelationships: {},
      compilerFingerprint: SYNC_COMPILER_FINGERPRINT,
      extractionFailures: {
        [B]: { hash: "edited", message: "bad" },
      },
    });
    expect(Object.keys(written.seenAt as object)).toEqual([A]);
    expect(h.logs).toEqual([
      "✓ Imported 0 entities, 0 relationships (no changes)",
    ]);
  });

  test("an injected runtime writes the cache without a checkpoint", async () => {
    sources([]);
    await h.run({}, { createProlog: () => h.fakeProlog() });
    expect(h.calls["engine.checkpoint"]).toBeUndefined();
    expect(h.calls.writeSyncCache).toHaveLength(1);
  });

  test("a failed checkpoint leaves the cache stale", async () => {
    sources([]);
    h.world.engine.checkpoint = () => ({
      success: false,
      bindings: {},
      error: "disk full",
    });
    await expect(h.run()).rejects.toMatchObject({
      message: "Failed to publish the no-op sync checkpoint: disk full",
      code: "SYNC_CHECKPOINT_FAILED",
    });
    expect(h.calls.writeSyncCache).toBeUndefined();
  });
});

describe("compile scope", () => {
  const M2 = "other/symbols.yaml";
  const fresh = (files: string[], stale: string[], extra = {}) =>
    emptyCache({
      hashes: Object.fromEntries(
        files.map((file) => [
          file,
          stale.includes(file)
            ? "old"
            : file.endsWith(".yaml")
              ? `m:hash-${file}`
              : `hash-${file}`,
        ]),
      ),
      seenAt: Object.fromEntries(files.map((file) => [file, recent()])),
      entityHashes: {},
      sourceEntityIds: {},
      ...extra,
    });
  const docsNotIndexed = (out: { failures: Array<{ category: string }> }) =>
    out.failures.filter((d) => d.category === "DOCS_NOT_INDEXED");

  test("a manifest is hashed with its sibling coordinates", async () => {
    sources([], [M]);
    await h.run();
    expect(h.calls.hashManifestWithCoordinates?.[0]).toEqual([
      h.world.root,
      h.path(M),
      h.path(".kb/symbol-coordinates.yaml"),
    ]);
  });

  test("a partial markdown compile is no full reindex", async () => {
    sources([A, B]);
    h.world.cache = fresh([A, B], [A]);
    extracted([result("SC-A", A)]);
    h.set("persistEntities", async () => ({
      entityCount: 0,
      kbModified: true,
    }));
    expect(docsNotIndexed(await h.run())).toEqual([]);
  });

  test("a partial manifest compile is no full reindex", async () => {
    sources([A], [M, M2]);
    h.world.cache = fresh([A, M, M2], [A, M]);
    extracted([result("SC-A", A)]);
    h.set("persistEntities", async () => ({
      entityCount: 0,
      kbModified: true,
    }));
    const out = await h.run();
    expect(changedFiles().manifests).toEqual([M]);
    expect(docsNotIndexed(out)).toEqual([]);
  });

  test("a full reindex with too few entities is diagnosed", async () => {
    sources([A]);
    h.world.cache = fresh([A], [A]);
    extracted([result("SC-A", A)]);
    h.set("persistEntities", async () => ({
      entityCount: 0,
      kbModified: true,
    }));
    expect(docsNotIndexed(await h.run())).toHaveLength(1);
  });

  test("a changed source new to the cache retracts nothing", async () => {
    sources([A]);
    h.world.cache = fresh([A], [A]);
    extracted([result("SC-A", A)]);
    await h.run();
    expect(h.calls.retractEntitiesById?.[0]?.[1]).toEqual([]);
  });

  test("an entity that left its source is retracted", async () => {
    sources([A]);
    h.world.cache = fresh([A], [A], { sourceEntityIds: { [A]: ["OLD"] } });
    extracted([]);
    await h.run();
    expect(h.calls.retractEntitiesById?.[0]?.[1]).toEqual(["OLD"]);
  });

  test("a changed markdown source of a v1 cache is retracted", async () => {
    sources([A]);
    h.world.cache = emptyCache({ hashes: { [A]: "old" } });
    extracted([]);
    await h.run();
    expect(h.calls.retractEntitiesForSources?.[0]?.[1]).toEqual([h.path(A)]);
  });

  test("a changed manifest of a v1 cache is retracted", async () => {
    sources([], [M]);
    h.world.cache = emptyCache({ hashes: { [M]: "old" } });
    extracted([]);
    await h.run();
    expect(h.calls.retractEntitiesForSources?.[0]?.[1]).toEqual([h.path(M)]);
  });

  test("a full compile without shard changes keeps stored relationships", async () => {
    sources([A]);
    h.world.cache = emptyCache({ hashes: { [A]: "old" } });
    extracted([result("SC-A", A)]);
    await h.run();
    expect(h.calls["engine.query"]).toBeUndefined();
  });

  test("an injected runtime compiles every extracted entity", async () => {
    sources([A]);
    const a = result("SC-A", A);
    h.world.cache = fresh([A], [A], {
      entityHashes: { "SC-A": normalizedEntityHash(a) },
      sourceEntityIds: { [A]: ["SC-A"] },
    });
    extracted([a]);
    await h.run({}, { createProlog: () => h.fakeProlog() });
    expect(h.calls.persistEntities?.[0]?.[1]).toEqual([a]);
  });
});
