import { describe, expect, test } from "bun:test";
import type { GitChangeSnapshot } from "../../src/traceability/git-change-snapshot.js";
import {
  type EntityRow,
  entityRows,
  entityRowsWithRelationships,
  rawKnowledgeFingerprint,
  requirementScope,
  semanticKnowledgeFingerprint,
} from "../../src/traceability/impact-knowledge.js";
import {
  fingerprint,
  fingerprintBytes,
} from "../../src/traceability/impact-review.js";

// implements REQ-impact-policy-stage-e-content-bound-review

type Entry = {
  path: string;
  content?: string | Buffer;
  mode?: string;
  type?: string;
};

const oidOf = (index: number) => `${index + 1}`.padStart(40, "0");

function snapshot(entries: Entry[]): GitChangeSnapshot {
  const byOid = new Map<string, Buffer>();
  const rows = entries.map((entry, index) => {
    const oid = oidOf(index);
    if (entry.content !== undefined) byOid.set(oid, Buffer.from(entry.content));
    return { ...entry, oid };
  });
  const listing = (filter: (path: string) => boolean) =>
    Buffer.from(
      rows
        .filter((row) => filter(row.path))
        .map(
          (row) =>
            `${row.mode ?? "100644"} ${row.type ?? "blob"} ${row.oid}\t${row.path}\0`,
        )
        .join(""),
    );
  return {
    readGit: (args: readonly string[]) => {
      if (args[0] === "ls-tree")
        return args.includes("--")
          ? listing((path) => path.startsWith(".kb/"))
          : listing(() => true);
      const bytes = byOid.get(args[2] as string);
      if (!bytes) throw new Error(`no blob ${args[2]}`);
      return bytes;
    },
    readBlobs: (oids: readonly string[]) =>
      new Map(
        oids.flatMap((oid) => {
          const bytes = byOid.get(oid);
          return bytes ? [[oid, bytes] as const] : [];
        }),
      ),
  } as unknown as GitChangeSnapshot;
}

const EMPTY = snapshot([]);

type Knowledge = NonNullable<Parameters<typeof entityRows>[2]>;

function knowledge(
  entity: Record<string, unknown>,
  relationships: Record<string, unknown>[] = [],
  sourceFile?: string,
): Knowledge[number] {
  return {
    entity,
    relationships,
    ...(sourceFile ? { sourceFile } : {}),
  } as unknown as Knowledge[number];
}

const fingerprintOf = (entity: Record<string, unknown>) =>
  entityRows(EMPTY, "T", [knowledge(entity)]).get(entity.id as string)
    ?.fingerprint;

const REQ_KEYS = [
  "semantic_clauses",
  "logic_claims",
  "proof_exempt",
  "proof_exempt_reason",
  "required_evidence",
  "approved_by",
  "approval_ref",
  "failure_side_waiver",
  "failure_side_waiver_approved_by",
  "exempts_claims",
  "proof_contract",
  "proof_bindings",
];
const SEMANTIC_TYPES = [
  "constrains",
  "depends_on",
  "requires_predicate",
  "requires_property",
  "requires_rule",
  "specified_by",
  "supersedes",
  "validates",
  "verified_by",
];

describe("semantic entity fingerprints", () => {
  test("a non-requirement keeps every authored field and every relationship", () => {
    const rows = entityRows(EMPTY, "T", [
      knowledge(
        {
          id: "ADR-1",
          type: "adr",
          status: "accepted",
          links: ["x"],
          semantic_source_field: "title",
          source: "s",
          created_at: "c",
          updated_at: "u",
          title: "t",
          proof_receipts: ["r"],
          origin: "o",
        },
        [
          { type: "relates_to", from: "ADR-1", to: "Z", id: "REL-1" },
          { type: "implements", from: "ADR-1", to: "A" },
        ],
      ),
    ]);
    expect(rows.get("ADR-1")?.fingerprint).toBe(
      fingerprint({
        entity: {
          id: "ADR-1",
          type: "adr",
          status: "accepted",
          links: ["x"],
          semantic_source_field: "title",
        },
        relationships: [
          { type: "implements", from: "ADR-1", to: "A" },
          { type: "relates_to", from: "ADR-1", to: "Z" },
        ],
      }),
    );
  });

  test("a requirement keys on its semantic source field, checked fields and semantic relationships", () => {
    const checked = Object.fromEntries(
      REQ_KEYS.map((key) => [key, `v-${key}`]),
    );
    const relationships = [
      ...SEMANTIC_TYPES.map((type) => ({
        type,
        from: "REQ-1",
        to: `T-${type}`,
      })),
      { type: "implements", from: "REQ-1", to: "X" },
      { type: "relates_to", from: "REQ-1", to: "Y" },
    ].reverse();
    const base = {
      id: "REQ-1",
      type: "req",
      status: "open",
      rationale: "why",
      title: "The title",
      text_ref: "docs/x.md#a",
      semantic_text: "Meaning",
      ...checked,
    };
    const expectedRelationships = SEMANTIC_TYPES.map((type) => ({
      type,
      from: "REQ-1",
      to: `T-${type}`,
    }));
    const row = (entity: Record<string, unknown>) =>
      entityRows(EMPTY, "T", [knowledge(entity, relationships)]).get("REQ-1")
        ?.fingerprint;
    expect(row({ ...base, semantic_source_field: "title" })).toBe(
      fingerprint({
        entity: { id: "REQ-1", type: "req", title: "The title", ...checked },
        relationships: expectedRelationships,
      }),
    );
    expect(row({ ...base, semantic_source_field: "text_ref" })).toBe(
      fingerprint({
        entity: {
          id: "REQ-1",
          type: "req",
          text_ref: "docs/x.md#a",
          ...checked,
        },
        relationships: expectedRelationships,
      }),
    );
    expect(row({ ...base, semantic_source_field: "other" })).toBe(
      fingerprint({
        entity: {
          id: "REQ-1",
          type: "req",
          semantic_text: "Meaning",
          ...checked,
        },
        relationships: expectedRelationships,
      }),
    );
  });

  test("a requirement's semantic inventory is projected and ordered", () => {
    expect(
      fingerprintOf({
        id: "REQ-2",
        type: "req",
        semantic_text: "M",
        semantic_inventory: [
          {
            claim_key: "b",
            claim_text: "x",
            role: "r",
            semantic_key: "k",
            extra: 1,
          },
          { claim_key: "a" },
        ],
      }),
    ).toBe(
      fingerprint({
        entity: {
          id: "REQ-2",
          type: "req",
          semantic_text: "M",
          semantic_inventory: [
            { claim_key: "a" },
            { claim_key: "b", claim_text: "x", role: "r", semantic_key: "k" },
          ],
        },
        relationships: [],
      }),
    );
    expect(
      fingerprintOf({
        id: "REQ-3",
        type: "req",
        semantic_text: "M",
        semantic_inventory: "not a list",
      }),
    ).toBe(
      fingerprint({
        entity: { id: "REQ-3", type: "req", semantic_text: "M" },
        relationships: [],
      }),
    );
  });

  test("a requirement without text in its source field binds no text", () => {
    for (const semantic_source_field of [undefined, "text_ref"])
      expect(
        fingerprintOf({
          id: "REQ-5",
          type: "req",
          title: "Only a title",
          ...(semantic_source_field ? { semantic_source_field } : {}),
        }),
      ).toBe(
        fingerprint({
          entity: { id: "REQ-5", type: "req" },
          relationships: [],
        }),
      );
  });

  test("refuses a semantic inventory row that is not an object", () => {
    for (const row of [null, "row", ["a"]])
      expect(() =>
        fingerprintOf({
          id: "REQ-4",
          type: "req",
          semantic_text: "M",
          semantic_inventory: [row],
        }),
      ).toThrow(new Error("Requirement semantic inventory row is invalid"));
  });
});

const md = (id: string) => `---\nid: ${id}\n---\nBody\n`;

describe("entityRows", () => {
  test("binds each entity to the knowledge file that declares it", () => {
    const tree = snapshot([
      { path: ".kb/requirements/REQ-a.md", content: md("REQ-a") },
      {
        path: ".kb/adr/ADR-1.md",
        content: "---\r\nid: ADR-1\r\ntitle: x\r\n---\r\nBody\r\n",
      },
      { path: ".kb/adr/EOF.md", content: "---\nid: EOF-1\n---" },
      { path: ".kb/notes/none.md", content: "no frontmatter\n" },
      { path: ".kb/notes/empty.md", content: "---\n\n---\n" },
      { path: ".kb/notes/num.md", content: "---\nid: 5\n---\n" },
      { path: ".kb/notes/late.md", content: `intro\n${md("LATE")}` },
      { path: ".kb/notes/dash.md", content: "---\nid: DASH\n----\n" },
      { path: ".kb/notes/link.md", type: "commit" },
      { path: "docs/OUT.md", content: md("OUT") },
      { path: ".kb/notes/TXT.txt", content: md("TXT") },
      { path: ".kb/symbols.yml", content: "symbols: []\n" },
    ]);
    const ids = ["REQ-a", "ADR-1", "EOF-1", "LATE", "DASH", "OUT", "TXT", "5"];
    const rows = entityRows(tree, "T", [
      ...ids.map((id) =>
        knowledge({ id, type: "adr" }, [], id === "REQ-a" ? "src/a.ts" : ""),
      ),
      knowledge({ id: "SYM-1", type: "symbol" }, [], "src/s.ts"),
    ]);
    expect(
      [...rows.values()].map(({ fingerprint: _f, ...row }) => row),
    ).toStrictEqual([
      {
        id: "REQ-a",
        type: "adr",
        artifactPath: ".kb/requirements/REQ-a.md",
        sourcePath: "src/a.ts",
      },
      { id: "ADR-1", type: "adr", artifactPath: ".kb/adr/ADR-1.md" },
      { id: "EOF-1", type: "adr", artifactPath: ".kb/adr/EOF.md" },
      { id: "LATE", type: "adr", artifactPath: "" },
      { id: "DASH", type: "adr", artifactPath: "" },
      { id: "OUT", type: "adr", artifactPath: "" },
      { id: "TXT", type: "adr", artifactPath: "" },
      { id: "5", type: "adr", artifactPath: "" },
      {
        id: "SYM-1",
        type: "symbol",
        artifactPath: ".kb/symbols.yml",
        sourcePath: "src/s.ts",
      },
    ]);
    expect(rows.get("ADR-1")?.fingerprint).toBe(
      fingerprint({ entity: { id: "ADR-1", type: "adr" }, relationships: [] }),
    );
  });

  test("binds symbols to symbols.yaml, or to nothing without a manifest", () => {
    const symbol = [knowledge({ id: "SYM-1", type: "symbol" })];
    const path = (entries: Entry[]) =>
      entityRows(snapshot(entries), "T", symbol).get("SYM-1")?.artifactPath;
    expect(
      path([
        { path: "docs/symbols.yaml", content: "" },
        { path: ".kb/symbols.yaml", content: "symbols: []\n" },
      ]),
    ).toBe(".kb/symbols.yaml");
    expect(path([{ path: ".kb/symbols.json", content: "" }])).toBe("");
  });

  test("refuses knowledge markdown that is not UTF-8", () => {
    expect(() =>
      entityRows(
        snapshot([{ path: ".kb/bad.md", content: Buffer.from([0xff, 0xfe]) }]),
        "T",
        [],
      ),
    ).toThrow();
  });
});

describe("rawKnowledgeFingerprint", () => {
  test("binds every .kb entry, hashing markdown without its proof receipts", () => {
    const tree = snapshot([
      { path: ".kb", content: "root" },
      {
        path: ".kb/a.md",
        content: "---\nid: A\nproof_receipts:\n  - x\n---\nBody\n",
        mode: "100755",
      },
      { path: ".kb/b.yaml", content: "b: 1\n" },
      { path: ".kbx/c", content: "c" },
      { path: "src/.kb/d", content: "d" },
      { path: ".kb/sub", type: "commit" },
    ]);
    expect(rawKnowledgeFingerprint(tree, "T")).toBe(
      fingerprint([
        {
          path: ".kb",
          mode: "100644",
          type: "blob",
          objectId: oidOf(0),
          bytes: fingerprintBytes(Buffer.from("root")),
        },
        {
          path: ".kb/a.md",
          mode: "100755",
          type: "blob",
          bytes: fingerprintBytes(Buffer.from("---\nid: A\n---\nBody\n")),
        },
        {
          path: ".kb/b.yaml",
          mode: "100644",
          type: "blob",
          objectId: oidOf(2),
          bytes: fingerprintBytes(Buffer.from("b: 1\n")),
        },
        {
          path: ".kb/sub",
          mode: "100644",
          type: "commit",
          objectId: oidOf(5),
          bytes: null,
        },
      ]),
    );
  });
});

describe("semanticKnowledgeFingerprint", () => {
  test("hashes the rows ordered by id with an explicit missing source path", () => {
    const rows = new Map<string, EntityRow>([
      [
        "B",
        {
          id: "B",
          type: "symbol",
          fingerprint: "sha256:b",
          artifactPath: "p",
          sourcePath: "s",
        },
      ],
      [
        "A",
        { id: "A", type: "req", fingerprint: "sha256:a", artifactPath: "" },
      ],
    ]);
    expect(semanticKnowledgeFingerprint(rows)).toBe(
      fingerprint([
        {
          id: "A",
          type: "req",
          fingerprint: "sha256:a",
          artifactPath: "",
          sourcePath: null,
        },
        {
          id: "B",
          type: "symbol",
          fingerprint: "sha256:b",
          artifactPath: "p",
          sourcePath: "s",
        },
      ]),
    );
  });
});

const req = (id: string) => `---\nid: ${id}\ntitle: ${id}\nstatus: open\n---\n`;

describe("requirementScope", () => {
  const tree = snapshot([
    { path: ".kb/requirements/REQ-c.md", content: req("REQ-c") },
    { path: ".kb/requirements/REQ-a.md", content: req("REQ-a") },
    { path: ".kb/requirements/REQ-b.md", content: req("REQ-b") },
    {
      path: ".kb/adr/ADR-1.md",
      content: "---\nid: ADR-1\ntitle: ADR\nstatus: accepted\n---\n",
    },
    {
      path: ".kb/symbols.yaml",
      content: [
        "symbols:",
        "  - id: SYM-a",
        "    title: a",
        "    sourceFile: a.py",
        "    status: active",
        "  - id: SYM-b",
        "    title: b",
        "    sourceFile: b.py",
        "    status: active",
        "",
      ].join("\n"),
    },
    {
      path: ".kb/relationships/aa.yaml",
      content: [
        "relationships:",
        ...[
          ["implements", "SYM-a", "REQ-a"],
          ["implements", "SYM-a", "ADR-1"],
          ["verified_by", "SYM-a", "REQ-c"],
          ["implements", "SYM-b", "REQ-b"],
          ["implements", "REQ-c", "REQ-a"],
        ].flatMap(([type, from, to]) => [
          `  - type: ${type}`,
          `    from: ${from}`,
          `    to: ${to}`,
        ]),
        "",
      ].join("\n"),
    },
  ]);

  test("collects requirements a changed path declares or a changed symbol implements", () => {
    const rows = entityRowsWithRelationships(tree, "T");
    expect(requirementScope(rows, ["a.py"])).toStrictEqual(["REQ-a"]);
    expect(requirementScope(rows, [".kb/requirements/REQ-c.md"])).toStrictEqual(
      ["REQ-c"],
    );
    expect(requirementScope(rows, [".kb/symbols.yaml"])).toStrictEqual([
      "REQ-a",
      "REQ-b",
    ]);
    expect(
      requirementScope(rows, [".kb/requirements/REQ-c.md", "b.py"]),
    ).toStrictEqual(["REQ-b", "REQ-c"]);
    expect(requirementScope(rows, [".kb/adr/ADR-1.md"])).toStrictEqual([]);
  });

  test("finds no implemented requirements without captured relationships", () => {
    const rows = entityRowsWithRelationships(tree, "T");
    rows.set("SYM-n", {
      id: "SYM-n",
      type: "symbol",
      fingerprint: "sha256:n",
      artifactPath: "",
      sourcePath: "n.py",
    });
    expect(requirementScope(rows, ["n.py"])).toStrictEqual([]);
    expect(requirementScope(new Map(rows), ["a.py"])).toStrictEqual([]);
    rows.delete("ADR-1");
    expect(requirementScope(rows, ["a.py"])).toStrictEqual(["REQ-a"]);
  });
});
