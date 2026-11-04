import { describe, expect, test } from "bun:test";
import { readSnapshotKnowledge } from "../../src/traceability/snapshot-knowledge.js";

// implements REQ-014

type Entry = {
  path: string;
  content?: string;
  mode?: string;
  type?: string;
  oid?: string;
};

function fake(entries: Entry[], options: { batch?: boolean } = {}) {
  const calls: (readonly string[])[] = [];
  const batches: (readonly string[])[] = [];
  const byOid = new Map<string, string>();
  const listing = entries
    .map((entry, index) => {
      const oid = entry.oid ?? `${index}`.padStart(40, "0");
      if (entry.content !== undefined) byOid.set(oid, entry.content);
      return `${entry.mode ?? "100644"} ${entry.type ?? "blob"} ${oid}\t${entry.path}\0`;
    })
    .join("");
  const readGit = (args: readonly string[]) => {
    calls.push(args);
    if (args[0] === "ls-tree") return Buffer.from(listing, "utf8");
    const content = byOid.get(args[2] as string);
    if (content === undefined) throw new Error(`no blob ${args[2]}`);
    return Buffer.from(content, "utf8");
  };
  const readBlobs = options.batch
    ? (oids: readonly string[]) => {
        batches.push(oids);
        return new Map(
          oids
            .filter((oid) => byOid.has(oid))
            .map((oid) => [oid, Buffer.from(byOid.get(oid) as string)]),
        );
      }
    : undefined;
  return { readGit, readBlobs, calls, batches };
}

const req = (id: string, extra = "") =>
  `---\nid: ${id}\ntitle: Requirement ${id}\nstatus: open\n${extra}---\nBody.\n`;
const SYMBOLS =
  "symbols:\n  - id: SYM-a\n    title: Service.execute\n    sourceFile: a.py\n    status: active\n";
const SHARD =
  "relationships:\n  - id: REL-1\n    type: implements\n    from: SYM-a\n    to: REQ-a\n";

function read(entries: Entry[], options: { batch?: boolean } = {}) {
  const f = fake(entries, options);
  return readSnapshotKnowledge(f.readGit, "TREE", f.readBlobs);
}

const ids = (entries: Entry[]) =>
  read(entries)
    .map((r) => r.entity.id)
    .sort();

describe("readSnapshotKnowledge", () => {
  test("lists the tree's .kb and compiles every authored kind", () => {
    const f = fake([
      { path: ".kb/requirements/REQ-a.md", content: req("REQ-a") },
      { path: ".kb/symbols.yaml", content: SYMBOLS },
      { path: ".kb/relationships/aa.yaml", content: SHARD },
    ]);
    const results = readSnapshotKnowledge(f.readGit, "TREE");
    expect(f.calls[0]).toStrictEqual([
      "ls-tree",
      "-r",
      "-z",
      "TREE",
      "--",
      ".kb",
    ]);
    expect(f.calls.slice(1)).toStrictEqual([
      ["cat-file", "blob", "0".repeat(40)],
      ["cat-file", "blob", `${"0".repeat(39)}1`],
      ["cat-file", "blob", `${"0".repeat(39)}2`],
    ]);
    expect(results.map((r) => r.entity.id)).toStrictEqual(["REQ-a", "SYM-a"]);
    expect(results[1]?.relationships).toStrictEqual([
      { type: "implements", from: "SYM-a", to: "REQ-a" },
    ]);
  });

  test("reads authored blobs in one batch when a batch reader is given", () => {
    const f = fake(
      [
        { path: ".kb/requirements/REQ-a.md", content: req("REQ-a") },
        { path: "docs/x.md", content: "ignored" },
        { path: ".kb/symbols.yml", content: SYMBOLS },
      ],
      { batch: true },
    );
    const results = readSnapshotKnowledge(f.readGit, "T", f.readBlobs);
    expect(f.batches).toStrictEqual([["0".repeat(40), `${"0".repeat(39)}2`]]);
    expect(f.calls.length).toBe(1);
    expect(results.map((r) => r.entity.id)).toStrictEqual(["REQ-a", "SYM-a"]);
  });

  test("falls back to cat-file for a blob the batch did not return", () => {
    const f = fake([
      { path: ".kb/requirements/REQ-a.md", content: req("REQ-a") },
    ]);
    const results = readSnapshotKnowledge(f.readGit, "T", () => new Map());
    expect(results.map((r) => r.entity.id)).toStrictEqual(["REQ-a"]);
    expect(f.calls.length).toBe(2);
  });

  test("passes an empty id to the batch for a row without one", () => {
    const batches: (readonly string[])[] = [];
    expect(() =>
      readSnapshotKnowledge(
        () => Buffer.from("100644 blob\t.kb/symbols.yaml\0"),
        "T",
        (oids) => {
          batches.push(oids);
          return new Map();
        },
      ),
    ).toThrow(new Error("Missing snapshot object ID: .kb/symbols.yaml"));
    expect(batches).toStrictEqual([[""]]);
  });

  test("ignores files that are not authored knowledge", () => {
    expect(
      ids([
        { path: ".kb/requirements/REQ-a.md", content: req("REQ-a") },
        { path: ".kb/requirements/REQ-b.txt", type: "tree" },
        { path: "docs/requirements/REQ-c.md", type: "tree" },
        { path: ".kb/relationships/aa.json", type: "tree" },
        { path: ".kb/other/aa.yaml", type: "tree" },
        { path: ".kb/relationships/aa.yaml.bak", type: "tree" },
        { path: ".kb/symbols.json", type: "tree" },
        { path: "x.kb/symbols.yaml", type: "tree" },
      ]),
    ).toStrictEqual(["REQ-a"]);
  });

  test("reads .yml relationship shards", () => {
    const results = read([
      { path: ".kb/requirements/REQ-a.md", content: req("REQ-a") },
      { path: ".kb/symbols.yaml", content: SYMBOLS },
      { path: ".kb/relationships/aa.yml", content: SHARD },
    ]);
    expect(results[1]?.relationships.length).toBe(1);
  });

  test("an entity document without front matter is skipped", () => {
    expect(
      ids([
        { path: ".kb/requirements/REQ-a.md", content: "no front matter\n" },
        {
          path: ".kb/requirements/REQ-b.md",
          content: req("REQ-b").replaceAll("\n", "\r\n"),
        },
        { path: ".kb/requirements/REQ-c.md", content: ` ${req("REQ-c")}` },
      ]),
    ).toStrictEqual(["REQ-b"]);
  });

  test("decodes UTF-8 and refuses invalid UTF-8", () => {
    const [result] = read([
      {
        path: ".kb/requirements/REQ-a.md",
        content: req("REQ-a").replace("Requirement REQ-a", "Zażółć"),
      },
    ]);
    expect(result?.entity.title).toBe("Zażółć");
    const readGit = (args: readonly string[]) =>
      args[0] === "ls-tree"
        ? Buffer.from(`100644 blob ${"a".repeat(40)}\t.kb/symbols.yaml\0`)
        : Buffer.from([0x73, 0xff]);
    expect(() => readSnapshotKnowledge(readGit, "T")).toThrow(TypeError);
  });

  test("decodes a UTF-8 listing path", () => {
    const readGit = (args: readonly string[]) =>
      args[0] === "ls-tree"
        ? Buffer.from(`100644 blob ${"a".repeat(40)}\t.kb/requirements/Ż.md\0`)
        : Buffer.from(req("REQ-z"));
    expect(
      readSnapshotKnowledge(readGit, "T").map((r) => r.entity.source),
    ).toStrictEqual([".kb/requirements/Ż.md"]);
  });

  test("refuses knowledge that is not a regular blob", () => {
    for (const entry of [
      { mode: "120000" },
      { mode: "100600" },
      { type: "tree" },
      { mode: "100644", type: "commit" },
    ]) {
      expect(() =>
        read([{ path: ".kb/symbols.yaml", content: SYMBOLS, ...entry }]),
      ).toThrow(
        new Error(
          "Snapshot knowledge must be a regular file: .kb/symbols.yaml",
        ),
      );
    }
    expect(
      ids([{ path: ".kb/symbols.yaml", content: SYMBOLS, mode: "100755" }]),
    ).toStrictEqual(["SYM-a"]);
  });

  test("refuses a row without a mode", () => {
    expect(() =>
      readSnapshotKnowledge(() => Buffer.from("\t.kb/symbols.yaml\0"), "T"),
    ).toThrow(
      new Error("Snapshot knowledge must be a regular file: .kb/symbols.yaml"),
    );
  });

  test("refuses invalid relationship shards and rows", () => {
    for (const content of ["", "relationships: 3\n", "other: []\n"]) {
      expect(() =>
        read([{ path: ".kb/relationships/aa.yaml", content }]),
      ).toThrow(
        new Error(
          "Invalid snapshot relationship shard: .kb/relationships/aa.yaml",
        ),
      );
    }
    for (const row of [
      "null",
      "'text'",
      "{type: 1, from: a, to: b}",
      "{type: implements, from: 1, to: b}",
      "{type: implements, from: a, to: 1}",
    ]) {
      expect(() =>
        read([
          {
            path: ".kb/relationships/aa.yaml",
            content: `relationships:\n  - ${row}\n`,
          },
        ]),
      ).toThrow(
        new Error("Invalid snapshot relationship in .kb/relationships/aa.yaml"),
      );
    }
  });

  test("refuses relationship rows with a missing endpoint", () => {
    const entries = (shard: string): Entry[] => [
      { path: ".kb/requirements/REQ-a.md", content: req("REQ-a") },
      { path: ".kb/symbols.yaml", content: SYMBOLS },
      { path: ".kb/relationships/aa.yaml", content: shard },
    ];
    expect(() =>
      read(entries(SHARD.replace("to: REQ-a", "to: REQ-gone"))),
    ).toThrow(
      new Error(
        "Snapshot relationship has a missing endpoint: SYM-a -> REQ-gone",
      ),
    );
    expect(() =>
      read(entries(SHARD.replace("from: SYM-a", "from: SYM-gone"))),
    ).toThrow(
      new Error(
        "Snapshot relationship has a missing endpoint: SYM-gone -> REQ-a",
      ),
    );
  });

  test("refuses entity links with a missing endpoint", () => {
    expect(() =>
      read([
        {
          path: ".kb/requirements/REQ-a.md",
          content: req(
            "REQ-a",
            "links:\n  - type: relates_to\n    target: REQ-gone\n",
          ),
        },
      ]),
    ).toThrow(
      new Error(
        "Snapshot relationship has a missing endpoint: REQ-a -> REQ-gone",
      ),
    );
    expect(
      read([
        {
          path: ".kb/requirements/REQ-a.md",
          content: req(
            "REQ-a",
            "links:\n  - type: relates_to\n    target: REQ-b\n",
          ),
        },
        { path: ".kb/requirements/REQ-b.md", content: req("REQ-b") },
      ]).map((r) => r.entity.id),
    ).toStrictEqual(["REQ-a", "REQ-b"]);
  });

  test("names every declaration of a duplicate entity", () => {
    const twice = `${SYMBOLS}  - id: SYM-a\n    title: Other.run\n    sourceFile: b.py\n    status: deprecated\n`;
    expect(() =>
      read([
        { path: ".kb/requirements/REQ-a.md", content: req("REQ-a") },
        { path: ".kb/requirements/REQ-a-copy.md", content: req("REQ-a") },
        { path: ".kb/requirements/REQ-a-third.md", content: req("REQ-a") },
        { path: ".kb/requirements/REQ-b.md", content: req("REQ-b") },
        { path: ".kb/symbols.yaml", content: twice },
      ]),
    ).toThrow(
      new Error(
        `Duplicate snapshot entities: ${JSON.stringify([
          {
            id: "REQ-a",
            declarations: [
              ".kb/requirements/REQ-a.md",
              ".kb/requirements/REQ-a-copy.md",
              ".kb/requirements/REQ-a-third.md",
            ].map((source) => ({
              title: "Requirement REQ-a",
              status: "open",
              source,
            })),
          },
          {
            id: "SYM-a",
            declarations: [
              {
                title: "Service.execute",
                status: "active",
                source: ".kb/symbols.yaml",
                sourceFile: "a.py",
              },
              {
                title: "Other.run",
                status: "deprecated",
                source: ".kb/symbols.yaml",
                sourceFile: "b.py",
              },
            ],
          },
        ])}`,
      ),
    );
  });
});
