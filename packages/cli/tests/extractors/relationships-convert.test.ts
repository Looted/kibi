import { afterAll, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  convertRecordToRelationship,
  extractFromRelationshipShards,
  extractRelationshipShard,
  flattenRelationships,
  getRelationshipsDir,
  validateRelationships,
} from "../../src/extractors/relationships.js";
import type { RelationshipRecord } from "../../src/relationships/shards.js";

const base = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-rel-extract-"));
afterAll(() => fs.rmSync(base, { recursive: true, force: true }));

const record = (
  overrides: Partial<RelationshipRecord> = {},
): RelationshipRecord => ({
  id: "rel-1",
  type: "implements",
  from: "SYM-1",
  to: "REQ-1",
  created_at: "2024-01-01T00:00:00Z",
  created_by: "me",
  source: "s.ts",
  ...overrides,
});

const TYPES = [
  "depends_on",
  "executable_for",
  "specified_by",
  "verified_by",
  "validates",
  "implements",
  "covered_by",
  "constrained_by",
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
  "guards",
  "publishes",
  "consumes",
  "supersedes",
  "restates",
  "assumes",
  "exempts",
  "relates_to",
];

describe("convertRecordToRelationship", () => {
  test("every schema relationship type converts with its provenance", () => {
    for (const type of TYPES) {
      expect(convertRecordToRelationship(record({ type }))).toStrictEqual({
        type,
        from: "SYM-1",
        to: "REQ-1",
        metadata: {
          created_at: "2024-01-01T00:00:00Z",
          created_by: "me",
          source: "s.ts",
        },
      });
    }
  });

  test("a confidence is carried in the metadata", () => {
    expect(
      convertRecordToRelationship(record({ confidence: 0 }))?.metadata,
    ).toStrictEqual({
      created_at: "2024-01-01T00:00:00Z",
      created_by: "me",
      source: "s.ts",
      confidence: 0,
    });
  });

  test("metadata carries only the provenance fields a record has", () => {
    const bare = {
      id: "rel-1",
      type: "implements",
      from: "SYM-1",
      to: "REQ-1",
    } as unknown as RelationshipRecord;
    const edge = { type: "implements", from: "SYM-1", to: "REQ-1" };
    expect(convertRecordToRelationship(bare)).toStrictEqual(edge);
    expect(
      convertRecordToRelationship({ ...bare, created_at: "" }),
    ).toStrictEqual(edge);
    for (const [field, value] of [
      ["created_at", "t"],
      ["created_by", "me"],
      ["source", "s.ts"],
      ["confidence", 0],
    ] as const) {
      expect(
        convertRecordToRelationship({ ...bare, [field]: value }),
      ).toStrictEqual({ ...edge, metadata: { [field]: value } });
    }
    expect(
      convertRecordToRelationship({ ...bare, created_by: "", source: "s" }),
    ).toStrictEqual({ ...edge, metadata: { created_by: "", source: "s" } });
  });

  test("an unknown type or an empty endpoint is rejected", () => {
    for (const type of ["", "Implements", "implemented_by"]) {
      expect(() => convertRecordToRelationship(record({ type }))).toThrow(
        `Invalid relationship type "${type}" in record rel-1`,
      );
    }
    for (const endpoints of [{ from: "" }, { to: "" }]) {
      expect(() => convertRecordToRelationship(record(endpoints))).toThrow(
        "Missing from or to in relationship record rel-1",
      );
    }
  });
});

describe("shard extraction", () => {
  const shard = (dir: string, name: string, body: string) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
    return path.join(dir, name);
  };
  const text = (...lines: string[]) =>
    `relationships:\n${lines
      .map(
        (line) =>
          `  - id: r\n    type: ${line}\n    from: A\n    to: B\n    created_at: "t"\n    created_by: me\n    source: s\n`,
      )
      .join("")}`;

  test("reads every yaml and yml shard file, skipping other entries", () => {
    const dir = getRelationshipsDir(path.join(base, "kb"));
    expect(dir).toBe(path.join(base, "kb", "relationships"));
    expect(extractFromRelationshipShards(dir)).toEqual([]);
    const a = shard(dir, "a.yaml", text("implements"));
    const b = shard(dir, "b.yml", text("covered_by", "guards"));
    shard(dir, "notes.txt", "x");
    fs.mkdirSync(path.join(dir, "nested.yaml"));
    const results = extractFromRelationshipShards(dir).sort((x, y) =>
      x.shardPath.localeCompare(y.shardPath),
    );
    const edge = (type: string) => ({
      type,
      from: "A",
      to: "B",
      metadata: { created_at: "t", created_by: "me", source: "s" },
    });
    expect(results).toStrictEqual([
      { shardPath: a, relationships: [edge("implements")] },
      { shardPath: b, relationships: [edge("covered_by"), edge("guards")] },
    ]);
    expect(flattenRelationships(results)).toStrictEqual([
      edge("implements"),
      edge("covered_by"),
      edge("guards"),
    ]);
  });

  test("a non-Error read failure is named by its string form", () => {
    const dir = path.join(base, "unreadable");
    const file = shard(dir, "x.yaml", text("implements"));
    const read = spyOn(fs, "readFileSync").mockImplementation(() => {
      throw "read-failed";
    });
    try {
      expect(() => extractRelationshipShard(file)).toThrow(
        `Failed to extract relationships from ${file}: read-failed`,
      );
    } finally {
      read.mockRestore();
    }
  });

  test("a shard failure names the shard", () => {
    const dir = path.join(base, "bad");
    const bad = shard(dir, "x.yaml", text("bogus"));
    expect(() => extractRelationshipShard(bad)).toThrow(
      `Failed to extract relationships from ${bad}: Invalid relationship type "bogus" in record r`,
    );
  });
});

describe("validateRelationships", () => {
  test("reports each missing endpoint", () => {
    const both = { type: "implements", from: "X", to: "Y" };
    const ok = { type: "implements", from: "A", to: "B" };
    const to = { type: "implements", from: "A", to: "Y" };
    expect(validateRelationships([ok, both, to], new Set(["A", "B"]))).toEqual([
      { relationship: both, error: "missing_from" },
      { relationship: both, error: "missing_to" },
      { relationship: to, error: "missing_to" },
    ]);
  });
});
