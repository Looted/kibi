import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  SyncError,
  anotherBranchStoreSynced,
  assertNoUnresolvedGitConflicts,
  assertRelationshipsCleared,
  checkpointNoopSync,
  compiledSyncCache,
  compilerCacheFilesMatch,
  compilerCacheHasEntityDelta,
  compilerCacheIsFresh,
  embeddedEntityTypes,
  gitText,
  maybePushDocsNotIndexedDiagnostic,
  maybePushKbMissingDiagnostic,
  normalizedEntityHash,
  relationshipFromKey,
  relationshipKey,
  rememberChangedSourceOrWarn,
  reportDanglingRelationships,
  reportValidationErrors,
  semanticBoundaryRelationships,
  stagedNewSourceKeys,
  storeHoldsAnyEntity,
  trackedRelationshipFiles,
  warnFailedSourceHash,
} from "../../../src/commands/sync.js";
import {
  SYNC_CACHE_TTL_MS,
  SYNC_CACHE_VERSION,
  SYNC_COMPILER_FINGERPRINT,
  type SyncCache,
  hashNormalized,
} from "../../../src/commands/sync/cache.js";
import type { PendingSourceReceiptSnapshot } from "../../../src/commands/sync/discovery.js";
import {
  pendingSourceEscapesError,
  pendingSourceHashDriftError,
  pendingSourceMissingError,
} from "../../../src/commands/sync/errors.js";
import * as untracked from "../../../src/commands/sync/untracked-targets.js";
import type { Diagnostic } from "../../../src/diagnostics.js";
import {
  createDocsNotIndexedDiagnostic,
  createKbMissingDiagnostic,
} from "../../../src/diagnostics.js";
import { EngineClient } from "../../../src/engine.js";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import {
  createGitWorkspace,
  createTempDir,
  git,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const roots: string[] = [];
const spies: Array<{ mockRestore(): void }> = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function tempDir(): string {
  const dir = createTempDir("kibi-sync-helpers-");
  roots.push(dir);
  return dir;
}

function gitRepo(): string {
  const dir = createGitWorkspace();
  roots.push(dir);
  return dir;
}

function write(root: string, file: string, content: string): string {
  const absolute = path.join(root, file);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

function captureWarnings(): string[] {
  const warnings: string[] = [];
  const spy = spyOn(console, "warn").mockImplementation((message: unknown) => {
    warnings.push(String(message));
  });
  spies.push(spy);
  return warnings;
}

describe("git output", () => {
  test("git runs in the given folder and returns text", () => {
    const repo = gitRepo();
    expect(gitText(repo, "git rev-parse --show-toplevel").trim()).toBe(
      git(repo, "rev-parse --show-toplevel").trim(),
    );
    expect(() => gitText(tempDir(), "git rev-parse HEAD")).toThrow();
  });

  test("conflicted files block compilation", () => {
    const repo = gitRepo();
    write(repo, "a.md", "base\n");
    write(repo, "b.md", "base\n");
    git(repo, "add -A");
    git(repo, "commit --no-verify -m base");
    git(repo, "checkout -b other");
    write(repo, "a.md", "other\n");
    write(repo, "b.md", "other\n");
    git(repo, "commit --no-verify -am other");
    git(repo, "checkout main");
    expect(() => assertNoUnresolvedGitConflicts(repo)).not.toThrow();
    write(repo, "a.md", "main\n");
    write(repo, "b.md", "main\n");
    git(repo, "commit --no-verify -am main");
    try {
      git(repo, "merge other");
    } catch {
      // The merge stops on the conflicts this test needs.
    }
    expect(() => assertNoUnresolvedGitConflicts(repo)).toThrow(
      new SyncError(
        "Unresolved Git conflicts block Kibi compilation; resolve these authored files first: a.md, b.md",
      ),
    );
  });

  test("a folder outside git has no conflicts to report", () => {
    expect(() => assertNoUnresolvedGitConflicts(tempDir())).not.toThrow();
  });

  test("staged additions and renames are new source keys", () => {
    const repo = gitRepo();
    write(repo, "docs/old.md", "old\n");
    write(repo, "docs/kept.md", "kept\n");
    git(repo, "add -A");
    git(repo, "commit --no-verify -m base");
    git(repo, "mv docs/old.md docs/renamed.md");
    write(repo, "docs/new file.md", "new\n");
    write(repo, "docs/back\\slash.md", "new\n");
    write(repo, "docs/kept.md", "changed\n");
    git(repo, "add -A");
    expect([...stagedNewSourceKeys(repo)].sort()).toEqual([
      "docs/back\\slash.md",
      "docs/new file.md",
      "docs/renamed.md",
    ]);
    expect(stagedNewSourceKeys(path.join(repo, "docs"))).toEqual(
      new Set(["back\\slash.md", "new file.md", "renamed.md"]),
    );
  });

  test("without git there are no new source keys", () => {
    expect(stagedNewSourceKeys(tempDir())).toEqual(new Set());
  });
});

describe("relationship keys", () => {
  test("a key round-trips", () => {
    const relationship = { type: "depends_on", from: "REQ-1", to: "REQ-2" };
    expect(relationshipKey(relationship)).toBe("depends_on\0REQ-1\0REQ-2");
    expect(relationshipFromKey(relationshipKey(relationship))).toEqual(
      relationship,
    );
  });

  test.each(["", "a", "a\0b"])("key %p is invalid", (key) => {
    expect(() => relationshipFromKey(key)).toThrow(
      new SyncError(`Invalid cached relationship key: ${key}`),
    );
  });

  test("parts after the third are ignored", () => {
    expect(relationshipFromKey("a\0b\0c\0d")).toEqual({
      type: "a",
      from: "b",
      to: "c",
    });
  });

  test("a key with an empty part is still read", () => {
    expect(relationshipFromKey("a\0\0")).toEqual({
      type: "a",
      from: "",
      to: "",
    });
  });
});

function extraction(
  relationships: ExtractionResult["relationships"],
  entity: Record<string, unknown> = {},
): ExtractionResult {
  return {
    entity: { id: "REQ-1", type: "req", title: "One", ...entity },
    relationships,
    sourceFile: "docs/one.md",
  } as unknown as ExtractionResult;
}

describe("entity hashes", () => {
  const a = { type: "depends_on", from: "REQ-1", to: "REQ-2" };
  const b = { type: "depends_on", from: "REQ-1", to: "REQ-3" };

  test("timestamps and relationship order do not change the hash", () => {
    const base = normalizedEntityHash(extraction([a, b]));
    expect(
      normalizedEntityHash(
        extraction([b, a], {
          created_at: "2020-01-01",
          updated_at: "2021-01-01",
        }),
      ),
    ).toBe(base);
    expect(base).toBe(
      hashNormalized({
        entity: {
          id: "REQ-1",
          type: "req",
          title: "One",
          created_at: undefined,
          updated_at: undefined,
        },
        sourceFile: "docs/one.md",
        relationships: [relationshipKey(a), relationshipKey(b)],
      }),
    );
  });

  test("content, source and relationships change the hash", () => {
    const base = normalizedEntityHash(extraction([a]));
    expect(normalizedEntityHash(extraction([a], { title: "Two" }))).not.toBe(
      base,
    );
    expect(normalizedEntityHash(extraction([b]))).not.toBe(base);
    expect(
      normalizedEntityHash({ ...extraction([a]), sourceFile: "docs/two.md" }),
    ).not.toBe(base);
  });

  test("the entity itself is left untouched", () => {
    const result = extraction([], { created_at: "2020-01-01" });
    normalizedEntityHash(result);
    expect(result.entity).toMatchObject({ created_at: "2020-01-01" });
  });

  test("boundary relationships are the entity's own, once each", () => {
    const own = { type: "relates_to", from: "REQ-1", to: "ADR-1" };
    const other = { type: "relates_to", from: "REQ-9", to: "REQ-1" };
    const shard = { type: "depends_on", from: "REQ-1", to: "REQ-4" };
    expect(
      semanticBoundaryRelationships(extraction([own, other]), [
        { ...own },
        shard,
        other,
      ]),
    ).toEqual([own, shard]);
  });
});

describe("other branch stores", () => {
  function store(root: string, name: string, cache?: string): string {
    const dir = path.join(root, ".kb", "branches", name);
    mkdirSync(dir, { recursive: true });
    if (cache !== undefined)
      writeFileSync(path.join(dir, "sync-cache.json"), cache);
    return dir;
  }

  test("no store folder means nothing synced", () => {
    const root = tempDir();
    expect(anotherBranchStoreSynced(root, path.join(root, "live"))).toBe(false);
  });

  test("only another store with hashes counts", () => {
    const root = tempDir();
    const live = store(root, "live", '{"hashes":{"a":"1"}}');
    store(root, "empty", '{"hashes":{}}');
    store(root, "nulls", '{"hashes":null}');
    store(root, "text", '{"hashes":"abc"}');
    store(root, "broken", "{");
    store(root, "none");
    expect(anotherBranchStoreSynced(root, live)).toBe(false);
    expect(anotherBranchStoreSynced(root, `${live}/../live`)).toBe(false);
    store(root, "synced", '{"hashes":{"b":"2"}}');
    expect(anotherBranchStoreSynced(root, live)).toBe(true);
  });
});

describe("compiler cache", () => {
  function cache(extra: Partial<SyncCache> = {}): SyncCache {
    return {
      version: 1,
      hashes: {},
      seenAt: {},
      semanticHashes: {},
      semanticContracts: {},
      ...extra,
    } as SyncCache;
  }

  test("an entity delta needs both indexes", () => {
    expect(compilerCacheHasEntityDelta(cache())).toBe(false);
    expect(compilerCacheHasEntityDelta(cache({ entityHashes: {} }))).toBe(
      false,
    );
    expect(compilerCacheHasEntityDelta(cache({ sourceEntityIds: {} }))).toBe(
      false,
    );
    expect(
      compilerCacheHasEntityDelta(
        cache({ entityHashes: {}, sourceEntityIds: {} }),
      ),
    ).toBe(true);
  });

  describe("freshness", () => {
    const root = "/w";
    const now = Date.parse("2026-01-31T00:00:00.000Z");
    const recent = new Date(now - 1000).toISOString();
    const edge = new Date(now - SYNC_CACHE_TTL_MS).toISOString();
    const stale = new Date(now - SYNC_CACHE_TTL_MS - 1).toISOString();

    test("every source seen recently is fresh", () => {
      expect(
        compilerCacheIsFresh(
          cache({
            hashes: { "a.md": "h1", "b.md": "h2" },
            seenAt: { "a.md": recent, "b.md": edge },
          }),
          root,
          ["/w/a.md", "/w/b.md"],
          now,
        ),
      ).toBe(true);
      expect(compilerCacheIsFresh(cache(), root, [], now)).toBe(true);
    });

    test.each([
      ["a removed source", { "a.md": "h", "gone.md": "h" }, { "a.md": recent }],
      ["a missing hash", {}, { "a.md": recent }],
      ["a non-text hash", { "a.md": 1 }, { "a.md": recent }],
      ["no sighting", { "a.md": "h" }, {}],
      ["an empty sighting", { "a.md": "h" }, { "a.md": "" }],
      ["an unreadable sighting", { "a.md": "h" }, { "a.md": "soon" }],
      ["an old sighting", { "a.md": "h" }, { "a.md": stale }],
    ])("%s is not fresh", (_label, hashes, seenAt) => {
      expect(
        compilerCacheIsFresh(
          cache({
            hashes: hashes as Record<string, string>,
            seenAt: seenAt as Record<string, string>,
          }),
          root,
          ["/w/a.md"],
          now,
        ),
      ).toBe(false);
    });
  });

  describe("file match", () => {
    function setup() {
      const root = tempDir();
      const shard = write(root, ".kb/relationships/a.yaml", "rels\n");
      const shardHash = createHash("sha256").update("rels\n").digest("hex");
      return { root, shard, shardHash };
    }
    const sourceHash = (file: string) => `hash:${path.basename(file)}`;

    test("matching sources and shards match", () => {
      const { root, shard, shardHash } = setup();
      expect(
        compilerCacheFilesMatch(
          cache({
            hashes: { "a.md": "hash:a.md" },
            relationshipHashes: { ".kb/relationships/a.yaml": shardHash },
          }),
          root,
          [path.join(root, "a.md")],
          [shard],
          sourceHash,
        ),
      ).toBe(true);
      expect(compilerCacheFilesMatch(cache(), root, [], [], sourceHash)).toBe(
        true,
      );
    });

    test("a changed source does not match", () => {
      const { root } = setup();
      expect(
        compilerCacheFilesMatch(
          cache({ hashes: { "a.md": "old", "b.md": "hash:b.md" } }),
          root,
          [path.join(root, "b.md"), path.join(root, "a.md")],
          [],
          sourceHash,
        ),
      ).toBe(false);
    });

    test("a removed shard does not match", () => {
      const { root } = setup();
      expect(
        compilerCacheFilesMatch(
          cache({ relationshipHashes: { ".kb/relationships/gone.yaml": "h" } }),
          root,
          [],
          [],
          sourceHash,
        ),
      ).toBe(false);
    });

    test("a changed or unknown shard does not match", () => {
      const { root, shard } = setup();
      for (const relationshipHashes of [
        { ".kb/relationships/a.yaml": "old" },
        undefined,
      ]) {
        expect(
          compilerCacheFilesMatch(
            cache(relationshipHashes ? { relationshipHashes } : {}),
            root,
            [],
            [shard],
            sourceHash,
          ),
        ).toBe(false);
      }
    });
  });
});

describe("dangling relationship report", () => {
  test("each dangling endpoint is named, with untracked files", () => {
    const warnings = captureWarnings();
    const lookups: unknown[][] = [];
    spies.push(
      spyOn(untracked, "findUntrackedDocumentMatches").mockImplementation(
        (root, ids) => {
          lookups.push([root, [...ids]]);
          return new Map([
            ["REQ-9", "docs/b.md"],
            ["REQ-7", "docs/a.md"],
            ["REQ-8", "docs/b.md"],
          ]);
        },
      ),
    );
    reportDanglingRelationships("/w", [
      {
        relationship: { type: "depends_on", from: "REQ-1", to: "REQ-9" },
        error: "missing_to",
      },
      {
        relationship: { type: "relates_to", from: "REQ-7", to: "REQ-1" },
        error: "missing_from",
      },
      {
        relationship: { type: "relates_to", from: "REQ-8", to: "REQ-9" },
        error: "missing_to",
      },
      {
        relationship: { type: "depends_on", from: "REQ-8", to: "REQ-2" },
        error: "missing_from",
      },
    ] as never);
    expect(lookups).toEqual([["/w", ["REQ-9", "REQ-7", "REQ-8"]]]);
    expect(warnings).toEqual([
      "Warning: 4 dangling relationship(s) found",
      "  - missing_to: depends_on REQ-1 -> REQ-9 (REQ-9 is not in this branch's sources)",
      "  - missing_from: relates_to REQ-7 -> REQ-1 (REQ-7 is not in this branch's sources)",
      "  - missing_to: relates_to REQ-8 -> REQ-9 (REQ-9 is not in this branch's sources)",
      "  - missing_from: depends_on REQ-8 -> REQ-2 (REQ-8 is not in this branch's sources)",
      "  Note: REQ-8, REQ-9 are declared in docs/b.md, which Git does not track and no pending-source receipt covers, so sync ignores it. Run `git add docs/b.md` (staging is enough) or rewrite the entity with kb_upsert, then sync again.",
      "  Note: REQ-7 is declared in docs/a.md, which Git does not track and no pending-source receipt covers, so sync ignores it. Run `git add docs/a.md` (staging is enough) or rewrite the entity with kb_upsert, then sync again.",
    ]);
  });
});

describe("source hash warnings", () => {
  test("a failed hash is warned with its message", () => {
    const warnings = captureWarnings();
    warnFailedSourceHash("a.md", new Error("denied"));
    warnFailedSourceHash("b.md", "plain");
    expect(warnings).toEqual([
      "Warning: Failed to hash a.md: denied",
      "Warning: Failed to hash b.md: plain",
    ]);
  });

  test("a failing change is warned and a passing one is not", () => {
    const warnings = captureWarnings();
    let applied = 0;
    rememberChangedSourceOrWarn("ok.md", () => {
      applied += 1;
    });
    rememberChangedSourceOrWarn("bad.md", () => {
      throw new Error("gone");
    });
    expect(applied).toBe(1);
    expect(warnings).toEqual(["Warning: Failed to hash bad.md: gone"]);
  });
});

describe("sync diagnostics", () => {
  test("a missing store is reported unless rebuilt", () => {
    const diagnostics: Diagnostic[] = [];
    maybePushKbMissingDiagnostic(diagnostics, true, false, "main", "/s");
    maybePushKbMissingDiagnostic(diagnostics, false, true, "main", "/s");
    maybePushKbMissingDiagnostic(diagnostics, true, true, "main", "/s");
    expect(diagnostics).toEqual([]);
    maybePushKbMissingDiagnostic(diagnostics, false, false, "main", "/s");
    expect(diagnostics).toEqual([createKbMissingDiagnostic("main", "/s")]);
  });

  test("unindexed documents are reported after a full reindex", () => {
    const diagnostics: Diagnostic[] = [];
    maybePushDocsNotIndexedDiagnostic(diagnostics, false, 3, 1);
    maybePushDocsNotIndexedDiagnostic(diagnostics, true, 0, 0);
    maybePushDocsNotIndexedDiagnostic(diagnostics, true, 3, 3);
    maybePushDocsNotIndexedDiagnostic(diagnostics, true, 3, 4);
    expect(diagnostics).toEqual([]);
    maybePushDocsNotIndexedDiagnostic(diagnostics, true, 3, 2);
    expect(diagnostics).toEqual([createDocsNotIndexedDiagnostic(3, 2)]);
  });

  test("a failed relationship clear throws", () => {
    expect(() => assertRelationshipsCleared({ success: true })).not.toThrow();
    expect(() =>
      assertRelationshipsCleared({ success: false, error: "locked" }),
    ).toThrow(
      new SyncError("Failed to clear changed relationship shards: locked"),
    );
    expect(() =>
      assertRelationshipsCleared({ success: false, error: "" }),
    ).toThrow(
      new SyncError(
        "Failed to clear changed relationship shards: Unknown error",
      ),
    );
  });
});

describe("engine helpers", () => {
  function fakeEngine(options: {
    checkpoint?: { success: boolean; error?: string };
    entities?: (id: string) => { count: number; entities: unknown[] };
    startError?: Error;
  }) {
    const events: string[] = [];
    spies.push(
      spyOn(EngineClient.prototype, "start").mockImplementation(async function (
        this: EngineClient,
      ) {
        const { timeout } = this as unknown as { timeout: number };
        events.push(`start ${timeout} ${JSON.stringify(this)}`);
        if (options.startError) throw options.startError;
      }),
      spyOn(EngineClient.prototype, "terminate").mockImplementation(
        async () => {
          events.push("terminate");
        },
      ),
      spyOn(EngineClient.prototype, "checkpoint").mockImplementation(
        async () => {
          events.push("checkpoint");
          return (options.checkpoint ?? { success: true }) as never;
        },
      ),
      spyOn(EngineClient.prototype, "queryEntities").mockImplementation(
        async (request) => {
          events.push(`entities ${JSON.stringify(request)}`);
          return (options.entities?.(String(request.id)) ?? {
            count: 0,
            entities: [],
          }) as never;
        },
      ),
    );
    return events;
  }

  test("a no-op sync publishes a checkpoint", async () => {
    const events = fakeEngine({});
    await checkpointNoopSync("/w", "topic");
    expect(events[0]).toStartWith("start 120000 ");
    expect(events[0]).toContain('"topic"');
    expect(events.slice(1)).toEqual(["checkpoint", "terminate"]);
  });

  test("a failed checkpoint is an error and still terminates", async () => {
    const events = fakeEngine({ checkpoint: { success: false, error: "x" } });
    await expect(checkpointNoopSync("/w", "main")).rejects.toThrow(
      new SyncError("Failed to publish the no-op sync checkpoint: x"),
    );
    expect(events.at(-1)).toBe("terminate");
    fakeEngine({ checkpoint: { success: false } });
    await expect(checkpointNoopSync("/w", "main")).rejects.toThrow(
      "Failed to publish the no-op sync checkpoint: Unknown error",
    );
  });

  test("a store holds an entity found by count or by list", async () => {
    const events = fakeEngine({
      entities: (id) =>
        id === "B"
          ? { count: 1, entities: [] }
          : id === "C"
            ? { count: 0, entities: [{}] }
            : { count: 0, entities: [] },
    });
    expect(await storeHoldsAnyEntity("/w", "main", ["A", "B", "C"])).toBe(true);
    expect(events.slice(1)).toEqual([
      'entities {"id":"A","limit":1,"offset":0}',
      'entities {"id":"B","limit":1,"offset":0}',
      "terminate",
    ]);
    expect(events[0]).toStartWith("start 120000 ");
    expect(await storeHoldsAnyEntity("/w", "main", ["C"])).toBe(true);
    expect(await storeHoldsAnyEntity("/w", "main", ["A"])).toBe(false);
    expect(await storeHoldsAnyEntity("/w", "main", [])).toBe(false);
  });

  test("an unreadable store holds nothing", async () => {
    const events = fakeEngine({ startError: new Error("down") });
    expect(await storeHoldsAnyEntity("/w", "main", ["A"])).toBe(false);
    expect(events.at(-1)).toBe("terminate");
  });
});

describe("tracked relationship files", () => {
  const sha = (text: string) => createHash("sha256").update(text).digest("hex");

  function repoWithShards() {
    const repo = gitRepo();
    const dir = path.join(repo, ".kb", "relationships");
    write(repo, ".kb/relationships/b.yaml", "b\n");
    write(repo, ".kb/relationships/a.yml", "a\n");
    write(repo, ".kb/relationships/notes.txt", "n\n");
    git(repo, "add -A");
    git(repo, "commit --no-verify -m shards");
    write(repo, ".kb/relationships/untracked.yaml", "u\n");
    return { repo, dir };
  }

  function receipt(repo: string, name: string, body: unknown): string {
    return write(
      repo,
      `.kb/recovery/pending-sources/${name}`,
      typeof body === "string" ? body : JSON.stringify(body),
    );
  }

  test("only tracked yaml shards are inputs, sorted", () => {
    const { repo, dir } = repoWithShards();
    expect(trackedRelationshipFiles(repo, dir)).toEqual([
      path.join(dir, "a.yml"),
      path.join(dir, "b.yaml"),
    ]);
  });

  test("outside git or without the folder there are none", () => {
    const root = tempDir();
    write(root, ".kb/relationships/a.yaml", "a\n");
    expect(
      trackedRelationshipFiles(root, path.join(root, ".kb/relationships")),
    ).toEqual([]);
    const { repo } = repoWithShards();
    expect(trackedRelationshipFiles(repo, path.join(repo, "missing"))).toEqual(
      [],
    );
  });

  test("a staged shard is tracked", () => {
    const { repo, dir } = repoWithShards();
    git(repo, "add .kb/relationships/untracked.yaml");
    expect(trackedRelationshipFiles(repo, dir)).toContain(
      path.join(dir, "untracked.yaml"),
    );
  });

  test("a pending receipt adds its untracked shard", () => {
    const { repo, dir } = repoWithShards();
    receipt(repo, "notes.txt", {
      path: ".kb/relationships/untracked.yaml",
      afterHash: sha("u\n"),
    });
    receipt(repo, "broken.json", "{");
    receipt(repo, "nopath.json", { afterHash: sha("u\n") });
    receipt(repo, "nohash.json", { path: ".kb/relationships/untracked.yaml" });
    receipt(repo, "numhash.json", {
      path: ".kb/relationships/untracked.yaml",
      afterHash: 1,
    });
    receipt(repo, "elsewhere.json", { path: "docs/x.md", afterHash: "h" });
    expect(trackedRelationshipFiles(repo, dir)).not.toContain(
      path.join(dir, "untracked.yaml"),
    );
    receipt(repo, "good.json", {
      path: ".kb\\relationships\\untracked.yaml",
      afterHash: sha("u\n"),
    });
    expect(trackedRelationshipFiles(repo, dir)).toEqual([
      path.join(dir, "a.yml"),
      path.join(dir, "b.yaml"),
      path.join(dir, "untracked.yaml"),
    ]);
  });

  test("a receipt outside the workspace is refused", () => {
    const { repo, dir } = repoWithShards();
    const outside = ".kb/relationships/../../../outside.yaml";
    receipt(repo, "escape.json", { path: outside, afterHash: "h" });
    expect(() => trackedRelationshipFiles(repo, dir)).toThrow(
      pendingSourceEscapesError(outside).message,
    );
  });

  test("a receipt for a shard that drifted is refused", () => {
    const { repo, dir } = repoWithShards();
    const shard = ".kb/relationships/untracked.yaml";
    receipt(repo, "drift.json", { path: shard, afterHash: "old" });
    expect(() => trackedRelationshipFiles(repo, dir)).toThrow(
      pendingSourceHashDriftError(shard, "old", sha("u\n")).message,
    );
  });

  test("a receipt for a missing shard is refused or recovered", () => {
    const { repo, dir } = repoWithShards();
    const shard = ".kb/relationships/gone.yaml";
    const body = JSON.stringify({ path: shard, afterHash: "h" });
    const receiptPath = receipt(repo, "gone.json", body);
    expect(() => trackedRelationshipFiles(repo, dir)).toThrow(
      pendingSourceMissingError(shard).message,
    );
    const earlier = {
      receiptPath: path.join(repo, "other.json"),
      path: ".kb/relationships/other.yaml",
      afterHash: "o",
      rawHash: "r",
    };
    const recovered: PendingSourceReceiptSnapshot[] = [earlier];
    expect(trackedRelationshipFiles(repo, dir, true, recovered)).toEqual([
      path.join(dir, "a.yml"),
      path.join(dir, "b.yaml"),
    ]);
    const snapshot = {
      receiptPath,
      path: shard,
      afterHash: "h",
      rawHash: sha(body),
    };
    expect(recovered).toEqual([earlier, snapshot]);
    trackedRelationshipFiles(repo, dir, true, recovered);
    expect(recovered).toEqual([earlier, snapshot]);
    expect(trackedRelationshipFiles(repo, dir, true)).toHaveLength(2);
  });
});

describe("authoring error classes", () => {
  test.each([
    ["scenario and test embedded", ["scenario", "test"]],
    ["a test embedded", ["test"]],
    ["a scenario embedded", ["scenario"]],
    ["Embedded Entity Violation: x", ["entity"]],
    ["bad yaml", null],
  ])("%s", (message, types) => {
    expect(embeddedEntityTypes(message)).toEqual(types);
  });

  test("validation errors are listed and counted", () => {
    const errors: string[] = [];
    const spy = spyOn(console, "error").mockImplementation((line: unknown) => {
      errors.push(String(line));
    });
    spies.push(spy);
    reportValidationErrors([
      { file: "a.md", message: "one" },
      { file: "b.md", message: "two" },
    ]);
    expect(errors).toEqual([
      "a.md: one",
      "b.md: two",
      "FAILED: 2 errors found",
    ]);
  });
});

describe("compiled cache", () => {
  const next = {
    hashes: { "a.md": "ha", "b.md": "hb", "c.md": "hc", "d.md": "hd" },
    seenAt: { "a.md": "t-a", "c.md": "t-c", "d.md": "t-d" },
    semanticHashes: { "a.md": "sa", "b.md": "sb", "d.md": "sd" },
    semanticContracts: { "a.md": true, "b.md": false },
    relationshipHashes: { r: "1" },
    entityHashes: { E: "e" },
    sourceEntityIds: { "a.md": ["E"] },
    shardRelationships: { r: ["k"] },
    extractionFailures: { "x.md": { hash: "h", message: "m" } },
    nowIso: "now",
  };

  test("skipped sources are left out and the rest carried over", () => {
    expect(compiledSyncCache(next, (key) => key === "c.md")).toEqual({
      version: SYNC_CACHE_VERSION,
      hashes: { "a.md": "ha", "b.md": "hb", "d.md": "hd" },
      relationshipHashes: { r: "1" },
      entityHashes: { E: "e" },
      sourceEntityIds: { "a.md": ["E"] },
      shardRelationships: { r: ["k"] },
      seenAt: { "a.md": "t-a", "b.md": "now", "d.md": "t-d" },
      semanticHashes: { "a.md": "sa", "b.md": "sb", "d.md": "sd" },
      semanticContracts: { "a.md": true, "b.md": false, "d.md": false },
      compilerFingerprint: SYNC_COMPILER_FINGERPRINT,
      extractionFailures: { "x.md": { hash: "h", message: "m" } },
    });
  });

  test("a source without a semantic hash records no semantics", () => {
    const cache = compiledSyncCache(
      { ...next, hashes: { "e.md": "he" } },
      () => false,
    );
    expect(cache.semanticHashes).toStrictEqual({});
    expect(cache.semanticContracts).toStrictEqual({});
  });

  test("without skips every source is kept", () => {
    expect(Object.keys(compiledSyncCache(next, () => false).hashes)).toEqual([
      "a.md",
      "b.md",
      "c.md",
      "d.md",
    ]);
  });
});
