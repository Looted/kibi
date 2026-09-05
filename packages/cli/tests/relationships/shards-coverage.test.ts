// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  appendRelationship,
  listShards,
  mergeRecords,
  pruneDangling,
  readAllShards,
  readShard,
  removeRelationshipsFromShards,
  writeShard,
} from "../../src/relationships/shards.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-shards-cov-"));
  roots.push(root);
  return root;
}

const base = {
  type: "implements",
  from: "SYM-001",
  to: "REQ-001",
  created_at: "2026-03-15T11:45:00Z",
  created_by: "agent/test",
  source: "mcp://kb_upsert",
} as const;

describe("relationship shard leftover branches", () => {
  test("readShard rejects every invalid record shape", () => {
    const root = tempRoot();
    const shard = path.join(root, "bad.yaml");
    fs.writeFileSync(shard, "relationships: not-an-array\n");
    expect(() => readShard(shard)).toThrow(/missing 'relationships' array/);

    fs.writeFileSync(shard, "relationships:\n  - just-a-string\n");
    expect(() => readShard(shard)).toThrow(/expected object/);

    const write = (body: string) => fs.writeFileSync(shard, body);
    write(`relationships:\n  - { type: implements, from: A, to: B, created_at: "t", created_by: x, source: y }\n`);
    expect(() => readShard(shard)).toThrow(/invalid 'id'/);

    write(`relationships:\n  - { id: r1, from: A, to: B, created_at: "t", created_by: x, source: y }\n`);
    expect(() => readShard(shard)).toThrow(/invalid 'type'/);

    write(`relationships:\n  - { id: r1, type: implements, to: B, created_at: "t", created_by: x, source: y }\n`);
    expect(() => readShard(shard)).toThrow(/invalid 'from'/);

    write(`relationships:\n  - { id: r1, type: implements, from: A, created_at: "t", created_by: x, source: y }\n`);
    expect(() => readShard(shard)).toThrow(/invalid 'to'/);

    write(`relationships:\n  - { id: r1, type: implements, from: A, to: B, created_by: x, source: y }\n`);
    expect(() => readShard(shard)).toThrow(/invalid 'created_at'/);

    write(`relationships:\n  - { id: r1, type: implements, from: A, to: B, created_at: "t", source: y }\n`);
    expect(() => readShard(shard)).toThrow(/invalid 'created_by'/);

    write(`relationships:\n  - { id: r1, type: implements, from: A, to: B, created_at: "t", created_by: x }\n`);
    expect(() => readShard(shard)).toThrow(/invalid 'source'/);

    write(`relationships:\n  - { id: r1, type: implements, from: A, to: B, created_at: "t", created_by: x, source: y, confidence: "high" }\n`);
    expect(() => readShard(shard)).toThrow(/Invalid 'confidence'/);

    write(`relationships:\n  - created_at: 2026-03-15T11:45:00.000Z\n    id: r1\n    type: implements\n    from: A\n    to: B\n    created_by: x\n    source: y\n`);
    const dated = readShard(shard);
    expect(dated[0]?.created_at).toMatch(/2026-03-15T11:45:00/);
  });

  test("writeShard dedupes, appendRelationship patches, and remove walks shards", () => {
    const kb = tempRoot();
    const first = appendRelationship(kb, { ...base });
    expect(first.recordId.startsWith("rel-")).toBe(true);
    const again = appendRelationship(kb, { ...base });
    expect(again.recordId).toBe(first.recordId);

    const extra = appendRelationship(kb, {
      ...base,
      to: "REQ-002",
      created_at: "2026-03-16T00:00:00Z",
      confidence: 0.5,
    });
    expect(extra.recordId).not.toBe(first.recordId);

    writeShard(first.shardPath, [
      { ...base, id: "rel-old", to: "REQ-001" },
      { ...base, id: "rel-dup", to: "REQ-001" },
      {
        ...base,
        id: "rel-new",
        from: "SYM-002",
        to: "REQ-003",
        confidence: 0.2,
      },
    ]);

    const removed = removeRelationshipsFromShards(kb, [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
      { type: "implements", from: "missing", to: "missing" },
    ]);
    expect(removed[0]?.removed).toBe(true);
    expect(removed[1]?.removed).toBe(false);

    expect(listShards(path.join(kb, "empty"))).toEqual([]);
    expect(readAllShards(kb).length).toBeGreaterThan(0);
    expect(
      pruneDangling(readAllShards(kb), new Set(["SYM-002", "REQ-003"])).every(
        (record) => record.from === "SYM-002",
      ),
    ).toBe(true);

    const merged = mergeRecords(
      [
        { ...base, id: "old", created_at: "2020-01-01T00:00:00Z" },
        { ...base, id: "keep", from: "SYM-X", to: "REQ-X" },
      ],
      [
        { ...base, id: "newer", created_at: "2026-01-01T00:00:00Z" },
        { ...base, id: "older", created_at: "2019-01-01T00:00:00Z" },
        { ...base, id: "fresh", from: "SYM-Y", to: "REQ-Y" },
      ],
    );
    const key = merged.find((record) => record.to === "REQ-001");
    expect(key?.id).toBe("newer");
    expect(merged.some((record) => record.id === "fresh")).toBe(true);
    expect(merged.some((record) => record.id === "keep")).toBe(true);
  });

  test("appendRelationship rejects a shard missing the relationships sequence", () => {
    const kb = tempRoot();
    const created = appendRelationship(kb, { ...base });
    fs.writeFileSync(created.shardPath, "notes: true\n");
    expect(() =>
      appendRelationship(kb, { ...base, to: "REQ-009" }),
    ).toThrow(/missing 'relationships' array/);
  });
});
