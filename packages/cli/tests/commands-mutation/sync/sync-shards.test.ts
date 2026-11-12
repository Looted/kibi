import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { git } from "../../helpers/in-process-workspace.js";
import { type SyncHarness, emptyCache, syncHarness } from "./sync-harness.js";

let h: SyncHarness;
const SA = ".kb/relationships/a.yaml";
const SB = ".kb/relationships/b.yaml";
const edge = (type: string, from: string, to: string) => ({ type, from, to });
const key = (type: string, from: string, to: string) =>
  `${type}\0${from}\0${to}`;
let shardEdges: Record<
  string,
  Array<{ type: string; from: string; to: string }>
>;

beforeEach(() => {
  h = syncHarness();
  const root = h.world.root;
  git(root, "init -q -b main --template=");
  git(root, "config user.email 'test@test.com'");
  git(root, "config user.name 'Kibi Test'");
  mkdirSync(path.join(root, ".kb", "relationships"), { recursive: true });
  for (const shard of [SA, SB]) writeFileSync(path.join(root, shard), "x\n");
  git(root, "add -A");
  git(root, "commit -q --no-verify -m shards");
  h.world.hashes[SA] = "ha";
  h.world.hashes[SB] = "hb";
  shardEdges = {
    [SA]: [edge("relates_to", "B", "C"), edge("depends_on", "A", "B")],
    [SB]: [],
  };
  h.set("extractRelationshipShard", (file: string) => ({
    relationships: shardEdges[path.relative(root, file)] ?? [],
  }));
});
afterEach(() => h.restore());

/** A markdown source whose cached hash is stale, so no fast path applies. */
function staleSource() {
  h.world.discovery.markdownFiles = [h.path("docs/a.md")];
  h.world.hashes["docs/a.md"] = "md";
}

function extractedShards() {
  return (h.calls.extractRelationshipShard ?? []).map((call) =>
    path.relative(h.world.root, call[0] as string),
  );
}

describe("relationship shards", () => {
  test("a first sync reads every shard and clears stored relationships", async () => {
    await h.run();
    expect(extractedShards()).toEqual([SA, SB]);
    expect(h.calls["engine.query"]).toEqual([["kb_retract_all_relationships"]]);
    const [written] = h.written();
    expect(written?.relationshipHashes).toEqual({ [SA]: "ha", [SB]: "hb" });
    expect(written?.shardRelationships).toEqual({
      [SA]: [key("depends_on", "A", "B"), key("relates_to", "B", "C")],
      [SB]: [],
    });
    expect(h.calls.persistRelationships?.[0]?.[2]).toEqual([
      edge("depends_on", "A", "B"),
      edge("relates_to", "B", "C"),
    ]);
  });

  test("an unchanged shard is taken from the cache", async () => {
    const now = new Date().toISOString();
    h.world.discovery.markdownFiles = [h.path("docs/a.md")];
    h.world.hashes["docs/a.md"] = "md";
    h.world.cache = emptyCache({
      hashes: { "docs/a.md": "old" },
      seenAt: { "docs/a.md": now },
      entityHashes: {},
      sourceEntityIds: {},
      relationshipHashes: { [SA]: "ha", [SB]: "hb" },
      shardRelationships: { [SA]: [key("depends_on", "A", "B")], [SB]: [] },
    });
    await h.run();
    expect(extractedShards()).toEqual([]);
    expect(h.written()[0]?.shardRelationships).toEqual({
      [SA]: [key("depends_on", "A", "B")],
      [SB]: [],
    });
    expect(h.calls["engine.query"]).toBeUndefined();
  });

  test("a changed shard is diffed against its cached edges", async () => {
    h.world.cache = emptyCache({
      hashes: {},
      seenAt: {},
      entityHashes: {},
      sourceEntityIds: {},
      relationshipHashes: { [SA]: "old", [SB]: "hb" },
      shardRelationships: {
        [SA]: [key("depends_on", "A", "B"), key("relates_to", "A", "Z")],
        [SB]: [],
        ".kb/relationships/gone.yaml": [key("relates_to", "G", "H")],
      },
    });
    await h.run();
    expect(extractedShards()).toEqual([SA]);
    expect(h.calls.retractRelationships?.[0]?.[1]).toEqual([
      edge("relates_to", "A", "Z"),
      edge("relates_to", "G", "H"),
    ]);
    expect(h.calls.persistRelationships?.[0]?.[2]).toEqual([
      edge("relates_to", "B", "C"),
    ]);
  });

  test("a shard that cannot be hashed is re-read and not cached", async () => {
    staleSource();
    delete h.world.hashes[SB];
    h.world.cache = emptyCache({
      relationshipHashes: { [SA]: "ha", [SB]: "hb" },
      shardRelationships: { [SA]: [], [SB]: [key("relates_to", "X", "Y")] },
      entityHashes: {},
      sourceEntityIds: {},
    });
    shardEdges[SA] = [];
    await h.run();
    expect(h.warnings).toEqual([
      `Warning: Failed to hash relationship shard ${h.path(SB)}: unreadable ${SB}`,
    ]);
    expect(extractedShards()).toEqual([SB]);
    expect(h.written()[0]?.relationshipHashes).toEqual({ [SA]: "ha" });
    expect(h.calls.retractRelationships?.[0]?.[1]).toEqual([
      edge("relates_to", "X", "Y"),
    ]);
  });

  test("a non-error hash failure is warned as text", async () => {
    h.set("hashFile", (_root: string, file: string) => {
      if (file.endsWith("b.yaml")) throw "locked";
      return "h";
    });
    await h.run();
    expect(h.warnings).toEqual([
      `Warning: Failed to hash relationship shard ${h.path(SB)}: locked`,
    ]);
  });

  test("a cache without shard edges re-reads every shard", async () => {
    staleSource();
    h.world.cache = emptyCache({
      relationshipHashes: { [SA]: "ha", [SB]: "hb" },
      entityHashes: {},
      sourceEntityIds: {},
    });
    await h.run();
    expect(extractedShards()).toEqual([SA, SB]);
  });

  test("without a relationships folder there are no shards", async () => {
    h.world.discovery.relationshipsDir = h.path("missing");
    await h.run();
    expect(extractedShards()).toEqual([]);
  });
});

describe("shard change detection", () => {
  test("an unhashable shard the cache never hashed is re-read", async () => {
    staleSource();
    delete h.world.hashes[SB];
    h.world.cache = emptyCache({
      relationshipHashes: { [SA]: "ha" },
      shardRelationships: { [SA]: [], [SB]: [key("relates_to", "X", "Y")] },
      entityHashes: {},
      sourceEntityIds: {},
    });
    shardEdges[SA] = [];
    await h.run();
    expect(extractedShards()).toEqual([SB]);
  });

  test("a cache with shard edges but no shard hashes re-reads them", async () => {
    staleSource();
    h.world.cache = emptyCache({
      shardRelationships: { [SA]: [], [SB]: [] },
      entityHashes: {},
      sourceEntityIds: {},
    });
    await h.run();
    expect(extractedShards()).toEqual([SA, SB]);
  });
});
