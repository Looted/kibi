import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type RelationshipRecord,
  appendRelationship,
  computeShardPath,
  getRelationshipsDir,
  listShards,
  mergeRecords,
  parseShardText,
  parsedShardMemoSize,
  planRelationshipShardRemovals,
  pruneDangling,
  readAllShards,
  readShard,
  relationshipIdFor,
  removeRelationshipsFromShards,
  renderShardWithRelationship,
  renderShardWithout,
  shardForFromId,
  writeShard,
} from "../../src/relationships/shards.js";

const base = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-shards-mut-"));
afterAll(() => fs.rmSync(base, { recursive: true, force: true }));
let counter = 0;
const fresh = (): string => {
  const dir = path.join(base, `kb${counter++}`);
  fs.mkdirSync(dir);
  return dir;
};
const spies: Array<{ mockRestore(): void }> = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

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

const yamlRecord = (fields: Record<string, string>): string =>
  `  - ${Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n    ")}\n`;

const VALID: Record<string, string> = {
  id: "rel-1",
  type: "implements",
  from: "SYM-1",
  to: "REQ-1",
  created_at: '"2024-01-01T00:00:00Z"',
  created_by: "me",
  source: "s.ts",
};

const shardText = (...records: Record<string, string>[]): string =>
  `relationships:\n${records.map(yamlRecord).join("")}`;

describe("shard locations", () => {
  test("shards live under relationships/ named by the source hash prefix", () => {
    expect(getRelationshipsDir("/kb")).toBe("/kb/relationships");
    expect(shardForFromId("SYM-1")).toBe("81");
    expect(shardForFromId("SYM-2")).toBe("ea");
    expect(computeShardPath("/kb", "SYM-3")).toBe("/kb/relationships/c1.yaml");
  });

  test("relationship ids hash type, from and to", () => {
    expect(relationshipIdFor("implements", "SYM-1", "REQ-1")).toBe(
      "rel-c83ee83badbd",
    );
    expect(relationshipIdFor("covers", "SYM-1", "REQ-2")).toBe(
      "rel-b16b85da1041",
    );
  });

  test("listShards keeps only yaml files and tolerates a missing directory", () => {
    const kb = fresh();
    expect(listShards(kb)).toEqual([]);
    const dir = getRelationshipsDir(kb);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "aa.yaml"), "relationships: []\n");
    fs.writeFileSync(path.join(dir, "notes.txt"), "x");
    fs.writeFileSync(path.join(dir, "bb.yml"), "x");
    expect(listShards(kb)).toEqual([path.join(dir, "aa.yaml")]);
  });

  test("listShards returns shards in name order whatever readdir returns", () => {
    const kb = fresh();
    const dir = getRelationshipsDir(kb);
    fs.mkdirSync(dir);
    const readdir = spyOn(fs, "readdirSync").mockReturnValue([
      "cc.yaml",
      "aa.yaml",
      "bb.yaml",
    ] as unknown as ReturnType<typeof fs.readdirSync>);
    try {
      expect(listShards(kb)).toEqual([
        path.join(dir, "aa.yaml"),
        path.join(dir, "bb.yaml"),
        path.join(dir, "cc.yaml"),
      ]);
    } finally {
      readdir.mockRestore();
    }
  });
});

describe("parseShardText", () => {
  test("blank text holds no records", () => {
    expect(parseShardText("", "p")).toEqual([]);
    expect(parseShardText("  \n\t\n", "p")).toEqual([]);
  });

  test("a document without a relationships array is rejected", () => {
    for (const text of ["notes: true\n", "relationships: 5\n", "- a\n", "x"]) {
      expect(() => parseShardText(text, "s.yaml")).toThrow(
        "Invalid shard file: missing 'relationships' array at s.yaml",
      );
    }
    expect(() => parseShardText("~\n", "s.yaml")).toThrow(
      "Invalid shard file: missing 'relationships' array at s.yaml",
    );
  });

  test("a record that is not an object is rejected by index", () => {
    expect(() =>
      parseShardText(`${shardText(VALID)}  - just text\n`, "s.yaml"),
    ).toThrow("Invalid record at s.yaml[1]: expected object");
    expect(() => parseShardText("relationships:\n  - ~\n", "s.yaml")).toThrow(
      "Invalid record at s.yaml[0]: expected object",
    );
  });

  test("every required field must be a non-empty string", () => {
    for (const name of [
      "id",
      "type",
      "from",
      "to",
      "created_at",
      "created_by",
      "source",
    ]) {
      for (const bad of [undefined, "5", '""']) {
        const fields = { ...VALID };
        if (bad === undefined) delete fields[name];
        else fields[name] = bad;
        expect(() =>
          parseShardText(shardText(VALID, fields), "s.yaml"),
        ).toThrow(`Missing or invalid '${name}' at s.yaml[1]`);
      }
    }
  });

  test("records keep their fields, normalizing YAML timestamps", () => {
    const text = shardText(
      VALID,
      { ...VALID, id: "rel-2", created_at: "2024-02-03T04:05:06Z" },
      { ...VALID, id: "rel-3", created_at: "2024-02-03T04:05:06.789Z" },
      { ...VALID, id: "rel-4", confidence: "0.25" },
      { ...VALID, id: "rel-5", confidence: "0" },
    );
    expect(parseShardText(text, "s.yaml")).toStrictEqual([
      record(),
      record({ id: "rel-2", created_at: "2024-02-03T04:05:06Z" }),
      record({ id: "rel-3", created_at: "2024-02-03T04:05:06.789Z" }),
      record({ id: "rel-4", confidence: 0.25 }),
      record({ id: "rel-5", confidence: 0 }),
    ]);
  });

  test("a non-numeric confidence is rejected", () => {
    expect(() =>
      parseShardText(shardText({ ...VALID, confidence: "high" }), "s.yaml"),
    ).toThrow("Invalid 'confidence' at s.yaml[0]: expected number");
  });
});

describe("readShard", () => {
  test("a missing shard holds no records", () => {
    expect(readShard(path.join(fresh(), "none.yaml"))).toEqual([]);
  });

  test("callers get their own copies of memoized records", () => {
    const file = path.join(fresh(), "a.yaml");
    fs.writeFileSync(file, shardText({ ...VALID, id: "rel-copy" }));
    const first = readShard(file);
    expect(first).toStrictEqual([record({ id: "rel-copy" })]);
    (first[0] as RelationshipRecord).id = "changed";
    const second = readShard(file);
    expect(second).toStrictEqual([record({ id: "rel-copy" })]);
    (second[0] as RelationshipRecord).id = "changed again";
    expect(readShard(file)).toStrictEqual([record({ id: "rel-copy" })]);
  });

  test("the parse memo holds at most 1024 shard texts", () => {
    const file = path.join(fresh(), "a.yaml");
    const sizes: number[] = [];
    for (let index = 0; index < 1100; index += 1) {
      fs.writeFileSync(file, shardText({ ...VALID, id: `rel-memo-${index}` }));
      readShard(file);
      sizes.push(parsedShardMemoSize());
    }
    expect(Math.max(...sizes)).toBe(1024);
    const peak = sizes.indexOf(1024);
    expect(sizes[peak + 1]).toBe(1);
    readShard(file);
    expect(parsedShardMemoSize()).toBe(sizes.at(-1) as number);
  });

  test("readAllShards concatenates every shard", () => {
    const kb = fresh();
    expect(readAllShards(kb)).toEqual([]);
    const dir = getRelationshipsDir(kb);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "aa.yaml"), shardText(VALID));
    fs.writeFileSync(
      path.join(dir, "bb.yaml"),
      shardText({ ...VALID, id: "rel-2" }, { ...VALID, id: "rel-3" }),
    );
    expect(readAllShards(kb)).toStrictEqual([
      record(),
      record({ id: "rel-2" }),
      record({ id: "rel-3" }),
    ]);
  });
});

describe("writeShard", () => {
  test("writes sorted, deduplicated canonical YAML, creating directories", () => {
    const file = path.join(fresh(), "deep", "er", "x.yaml");
    writeShard(file, [
      record({ id: "r5", from: "B", type: "a", to: "a" }),
      record({ id: "r4", from: "A", type: "b", to: "a" }),
      record({ id: "r3", from: "A", type: "a", to: "b" }),
      record({ id: "r2", from: "A", type: "a", to: "a", confidence: 0.5 }),
      record({ id: "dup", from: "A", type: "a", to: "a" }),
    ]);
    const entry = (id: string, from: string, type: string, to: string) =>
      [
        `  - id: ${id}`,
        `    type: ${type}`,
        `    from: ${from}`,
        `    to: ${to}`,
        '    created_at: "2024-01-01T00:00:00Z"',
        "    created_by: me",
        "    source: s.ts",
      ].join("\n");
    expect(fs.readFileSync(file).toString()).toBe(
      `${[
        "relationships:",
        entry("r2", "A", "a", "a"),
        "    confidence: 0.5",
        entry("r3", "A", "a", "b"),
        entry("r4", "A", "b", "a"),
        entry("r5", "B", "a", "a"),
      ].join("\n")}\n`,
    );
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(path.dirname(file))).toEqual(["x.yaml"]);
  });

  test("an empty record list writes an empty relationships list header", () => {
    const file = path.join(fresh(), "x.yaml");
    writeShard(file, []);
    expect(fs.readFileSync(file).toString()).toBe("relationships:\n");
  });

  test("a failed rename removes the temporary and rethrows", () => {
    const file = path.join(fresh(), "x.yaml");
    const targets: string[] = [];
    spies.push(
      spyOn(fs, "renameSync").mockImplementation((from) => {
        targets.push(String(from));
        throw new Error("rename denied");
      }),
    );
    expect(() => writeShard(file, [record()])).toThrow("rename denied");
    expect(targets).toHaveLength(1);
    expect(targets[0]).toStartWith(`${file}.kibi-write-${process.pid}-`);
    expect(fs.readdirSync(path.dirname(file))).toEqual([]);
  });

  test("a failed write rethrows the write error, not the cleanup error", () => {
    const file = path.join(fresh(), "x.yaml");
    spies.push(
      spyOn(fs, "writeFileSync").mockImplementation(() => {
        throw new Error("disk full");
      }),
    );
    expect(() => writeShard(file, [record()])).toThrow("disk full");
    expect(fs.readdirSync(path.dirname(file))).toEqual([]);
  });
});

describe("renderShardWithout", () => {
  const text = [
    "# shard header",
    "relationships:",
    "  # first",
    "  - type: implements",
    "    from: SYM-1",
    "    to: REQ-1",
    "  - just a note",
    "  # second",
    "  - type: implements",
    "    from: SYM-1",
    "    to: REQ-2",
    "  - type: covers",
    "    from: SYM-1",
    "    to: REQ-1",
    "  - type: implements",
    "    from: SYM-2",
    "    to: REQ-1",
    "",
  ].join("\n");

  test("removes exactly the selected records and keeps the rest", () => {
    expect(
      renderShardWithout(
        text,
        [
          { type: "implements", from: "SYM-1", to: "REQ-1" },
          { type: "implements", from: "SYM-2", to: "REQ-1" },
        ],
        "s.yaml",
      ),
    ).toBe(
      [
        "# shard header",
        "relationships:",
        "  # first",
        "  - just a note",
        "  # second",
        "  - type: implements",
        "    from: SYM-1",
        "    to: REQ-2",
        "  - type: covers",
        "    from: SYM-1",
        "    to: REQ-1",
        "",
      ].join("\n"),
    );
  });

  test("no selectors leave the text as it was", () => {
    expect(renderShardWithout(text, [], "s.yaml")).toBe(text);
  });

  test("a shard without a relationships sequence is rejected", () => {
    for (const bad of [
      "notes: true\n",
      "relationships:\n  type: implements\n",
      "relationships: 5\n",
    ]) {
      expect(() =>
        renderShardWithout(
          bad,
          [{ type: "implements", from: "SYM-1", to: "REQ-1" }],
          "s.yaml",
        ),
      ).toThrow("Invalid shard file: missing 'relationships' array at s.yaml");
    }
  });
});

describe("planRelationshipShardRemovals and removeRelationshipsFromShards", () => {
  const setup = () => {
    const kb = fresh();
    const dir = getRelationshipsDir(kb);
    fs.mkdirSync(dir);
    const a = path.join(dir, "aa.yaml");
    const b = path.join(dir, "bb.yaml");
    const c = path.join(dir, "cc.yaml");
    fs.writeFileSync(
      a,
      `# keep me\n${shardText(
        { ...VALID, source: "a.ts" },
        { ...VALID, id: "rel-2", to: "REQ-2", source: "a2.ts" },
      )}`,
    );
    fs.writeFileSync(b, shardText({ ...VALID, id: "rel-3", to: "REQ-3" }));
    fs.writeFileSync(c, shardText({ ...VALID, id: "rel-4", source: "c.ts" }));
    return { kb, a, b, c };
  };
  const selected = { type: "implements", from: "SYM-1", to: "REQ-1" };
  const absent = { type: "covers", from: "SYM-9", to: "REQ-9" };

  test("plans bodies only for shards holding a selected record", () => {
    const { kb, a, c } = setup();
    const plan = planRelationshipShardRemovals(kb, [selected, absent]);
    expect([...plan.bodies.keys()]).toEqual([a, c]);
    expect(plan.bodies.get(a)).toBe(
      `# keep me\n${shardText({ ...VALID, id: "rel-2", to: "REQ-2", source: "a2.ts" })}`,
    );
    expect(plan.bodies.get(c)).toBe("relationships: []\n");
    expect(plan.removals).toStrictEqual([
      {
        selector: selected,
        shardPaths: [a, c],
        sources: ["a.ts", "c.ts"],
        removed: true,
      },
      { selector: absent, shardPaths: [], sources: [], removed: false },
    ]);
  });

  test("a knowledge base without shards plans nothing", () => {
    const plan = planRelationshipShardRemovals(fresh(), [selected]);
    expect(plan.bodies.size).toBe(0);
    expect(plan.removals).toStrictEqual([
      { selector: selected, shardPaths: [], sources: [], removed: false },
    ]);
  });

  test("removal publishes every planned body and leaves other shards alone", () => {
    const { kb, a, b, c } = setup();
    const before = fs.readFileSync(b).toString();
    const plan = planRelationshipShardRemovals(kb, [selected]);
    expect(removeRelationshipsFromShards(kb, [selected])).toStrictEqual(
      plan.removals,
    );
    expect(fs.readFileSync(a).toString()).toBe(plan.bodies.get(a) as string);
    expect(fs.readFileSync(c).toString()).toBe("relationships: []\n");
    expect(fs.readFileSync(b).toString()).toBe(before);
  });
});

describe("appendRelationship and renderShardWithRelationship", () => {
  const { id: _id, ...relationship } = record({ from: "SYM-1" });

  test("the first relationship creates the shard and its directories", () => {
    const kb = path.join(fresh(), "nested", "kb");
    const result = appendRelationship(kb, relationship);
    const shardPath = computeShardPath(kb, "SYM-1");
    expect(result).toStrictEqual({
      shardPath,
      recordId: "rel-c83ee83badbd",
    });
    expect(readShard(shardPath)).toStrictEqual([
      record({ id: "rel-c83ee83badbd" }),
    ]);
  });

  test("a further relationship is appended in place, keeping comments", () => {
    const kb = fresh();
    const { shardPath } = appendRelationship(kb, relationship);
    fs.writeFileSync(
      shardPath,
      `# head\n${fs.readFileSync(shardPath).toString()}`,
    );
    const next = {
      ...relationship,
      type: "covers",
      to: "REQ-2",
      created_at: "2024-01-02T00:00:00Z",
      source: "t.ts",
      confidence: 0.5,
    };
    expect(appendRelationship(kb, next)).toStrictEqual({
      shardPath,
      recordId: "rel-b16b85da1041",
    });
    const text = fs.readFileSync(shardPath).toString();
    expect(text).toStartWith(
      "# head\nrelationships:\n  - id: rel-c83ee83badbd",
    );
    expect(text).toEndWith(
      [
        "  - type: covers",
        "    from: SYM-1",
        "    to: REQ-2",
        "    created_at: 2024-01-02T00:00:00Z",
        "    created_by: me",
        "    source: t.ts",
        "    confidence: 0.5",
        "    id: rel-b16b85da1041",
        "",
      ].join("\n"),
    );
  });

  test("an existing relationship is not written again", () => {
    const kb = fresh();
    const first = appendRelationship(kb, relationship);
    const before = fs.readFileSync(first.shardPath).toString();
    const rename = spyOn(fs, "renameSync");
    spies.push(rename);
    expect(
      appendRelationship(kb, { ...relationship, source: "other.ts" }),
    ).toStrictEqual(first);
    expect(rename).not.toHaveBeenCalled();
    expect(fs.readFileSync(first.shardPath).toString()).toBe(before);
  });

  test("only a same type, from and to counts as already recorded", () => {
    const existing = shardText(VALID);
    expect(
      renderShardWithRelationship("s.yaml", existing, relationship),
    ).toBeNull();
    expect(
      renderShardWithRelationship(
        "s.yaml",
        shardText({ ...VALID, id: "rel-0", to: "REQ-0" }, VALID),
        relationship,
      ),
    ).toBeNull();
    for (const change of [
      { type: "covers" },
      { from: "SYM-2" },
      { to: "REQ-2" },
    ]) {
      expect(
        renderShardWithRelationship("s.yaml", existing, {
          ...relationship,
          ...change,
        }),
      ).not.toBeNull();
    }
  });

  test("a missing shard renders canonical text", () => {
    expect(renderShardWithRelationship("s.yaml", null, relationship)).toBe(
      [
        "relationships:",
        "  - id: rel-c83ee83badbd",
        "    type: implements",
        "    from: SYM-1",
        "    to: REQ-1",
        '    created_at: "2024-01-01T00:00:00Z"',
        "    created_by: me",
        "    source: s.ts",
        "",
      ].join("\n"),
    );
  });

  test("an invalid existing shard is rejected", () => {
    expect(() =>
      renderShardWithRelationship("s.yaml", "notes: true\n", relationship),
    ).toThrow("Invalid shard file: missing 'relationships' array at s.yaml");
  });
});

describe("pruneDangling and mergeRecords", () => {
  test("pruneDangling keeps records whose both ends exist", () => {
    const records = [
      record({ id: "both", from: "A", to: "B" }),
      record({ id: "no-from", from: "X", to: "B" }),
      record({ id: "no-to", from: "A", to: "Y" }),
    ];
    expect(
      pruneDangling(records, new Set(["A", "B"])).map((r) => r.id),
    ).toEqual(["both"]);
  });

  test("merging keeps the newer record per relationship, incoming on a tie", () => {
    const merged = mergeRecords(
      [
        record({ id: "old", created_at: "2024-01-01T00:00:00Z" }),
        record({ id: "keep", to: "REQ-2", created_at: "2024-05-01T00:00:00Z" }),
        record({ id: "tie", to: "REQ-3", created_at: "2024-01-01T00:00:00Z" }),
      ],
      [
        record({ id: "new", created_at: "2024-02-01T00:00:00Z" }),
        record({
          id: "stale",
          to: "REQ-2",
          created_at: "2024-04-01T00:00:00Z",
        }),
        record({
          id: "tie-in",
          to: "REQ-3",
          created_at: "2024-01-01T00:00:00Z",
        }),
        record({ id: "fresh", type: "covers" }),
      ],
    );
    expect(merged.map((r) => r.id)).toEqual(["new", "keep", "tie-in", "fresh"]);
  });
});
