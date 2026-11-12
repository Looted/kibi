import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as discovery from "../../../src/commands/sync/discovery.js";
import * as extraction from "../../../src/commands/sync/extraction.js";
import type {
  PrologPort,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import {
  collectSourceRelationshipParityViolations,
  compareRelationshipParity,
  parseCompiledRelationshipRows,
} from "../../../src/public/operations/source-relationship-parity.js";
import {
  createGitWorkspace,
  createTempDir,
  git,
  isolateKibiEnv,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";
import { expectGolden } from "../helpers/golden.js";

const UPDATE_GOLDEN = process.env.KIBI_UPDATE_GOLDEN;
const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
const restores: (() => void)[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function gitWorkspace(
  tracked: Record<string, string>,
  untracked: Record<string, string> = {},
): string {
  restores.push(isolateKibiEnv());
  // The isolation clears every Kibi setting, the golden refresh switch too.
  if (UPDATE_GOLDEN !== undefined)
    process.env.KIBI_UPDATE_GOLDEN = UPDATE_GOLDEN;
  const root = realpathSync(createGitWorkspace());
  roots.push(root);
  const write = (files: Record<string, string>) => {
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), content);
    }
  };
  write(tracked);
  if (Object.keys(tracked).length > 0) {
    git(root, "add -A");
    git(root, "commit --no-verify -q -m tracked");
  }
  write(untracked);
  return root;
}

/** Answers each relationship query with the rows named for its type. */
function engine(
  rows: Record<string, string> = {},
  failure?: PrologQueryResult,
): PrologPort & { goals: string[] } {
  const goals: string[] = [];
  return {
    goals,
    query: async (goal: string) => {
      goals.push(goal);
      if (failure !== undefined) return failure;
      const type = /kb_relationship\((\w+),/.exec(goal)?.[1] ?? "";
      return { success: true, bindings: { Rows: rows[type] ?? "[]" } };
    },
  } as unknown as PrologPort & { goals: string[] };
}

const requirement = (id: string, links: [string, string][] = []) =>
  `---\nid: ${id}\ntitle: ${id} title\nstatus: open\n${
    links.length === 0
      ? ""
      : `links:\n${links
          .map(([type, target]) => `  - type: ${type}\n    target: ${target}\n`)
          .join("")}`
  }---\n${id} body.\n`;

const shard = (records: [string, string, string][]) =>
  `relationships:\n${records
    .map(
      ([type, from, to], index) =>
        `  - id: r${index}\n    type: ${type}\n    from: ${from}\n    to: ${to}\n    created_at: "2026-01-01T00:00:00Z"\n    created_by: test\n    source: test\n`,
    )
    .join("")}`;

describe("compareRelationshipParity", () => {
  test("names each gap in both directions, ordered", () => {
    const violations = compareRelationshipParity(
      [
        { type: "verified_by", from: "REQ-b", to: "T-1", source: "docs/b.md" },
        { type: "specified_by", from: "REQ-a", to: "SCEN-1" },
        { type: "implements", from: "SYM-1", to: "REQ-a" },
        { type: "implements", from: "SYM-1", to: "REQ-a" },
      ],
      [
        { type: "implements", from: "SYM-1", to: "REQ-a" },
        { type: "relates_to", from: "REQ-z", to: "REQ-y" },
        { type: "relates_to", from: "REQ-c", to: "REQ-d", source: "s" },
        {
          type: "relates_to",
          from: "REQ-a",
          to: "REQ-e",
          ownership: "runtime",
        },
      ],
    );
    expectGolden("source-relationship-parity-compare", violations);
    expect(violations.map((row) => Object.hasOwn(row, "source"))).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });
});

describe("parseCompiledRelationshipRows", () => {
  test("keeps rows with both ends and marks protocol sources", () => {
    expect(
      parseCompiledRelationshipRows(
        "relates_to",
        "[['A'],['','B','s'],['A','B'],['A','C','docs/mcp://x'],['A','D','MCP://x']]",
      ),
    ).toEqual([
      { type: "relates_to", from: "A", to: "B", ownership: "authored" },
      {
        type: "relates_to",
        from: "A",
        to: "C",
        source: "docs/mcp://x",
        ownership: "authored",
      },
      {
        type: "relates_to",
        from: "A",
        to: "D",
        source: "MCP://x",
        ownership: "runtime",
      },
    ]);
  });
});

describe("collectSourceRelationshipParityViolations", () => {
  test("is silent outside a work tree", async () => {
    const root = createTempDir("kibi-parity-");
    roots.push(root);
    const prolog = engine();
    expect(
      await collectSourceRelationshipParityViolations(root, prolog),
    ).toEqual([]);
    expect(prolog.goals).toEqual([]);
  });

  test("finds nothing in an empty work tree and asks every type", async () => {
    const root = gitWorkspace({});
    const read = spyOn(discovery, "discoverSourceFiles");
    spies.push(read);
    const prolog = engine({ implements: "[]" });
    expect(
      await collectSourceRelationshipParityViolations(root, prolog),
    ).toEqual([]);
    expect(read).toHaveBeenCalledWith(root, {
      trackedOnly: true,
      consumeTrackedPendingReceipts: false,
    });
    expect(prolog.goals.length).toBeGreaterThan(1);
    expect(prolog.goals[0]).toBe(
      "findall([From,To,Source], (kb_relationship(depends_on, From, To), (kb_entity(From, _, Props), memberchk(source=RawSource, Props) -> normalize_term_atom(RawSource, Source) ; Source='')), Rows)",
    );
    const bare = {
      query: async () => ({ success: true, bindings: {} }),
    } as unknown as PrologPort;
    expect(await collectSourceRelationshipParityViolations(root, bare)).toEqual(
      [],
    );
  });

  test("surfaces an engine that cannot list relationships", async () => {
    const root = gitWorkspace({});
    await expect(
      collectSourceRelationshipParityViolations(
        root,
        engine({}, { success: false, bindings: {} }),
      ),
    ).rejects.toThrow(
      "Unable to inspect compiled depends_on relationships: query failed",
    );
    await expect(
      collectSourceRelationshipParityViolations(
        root,
        engine({}, { success: false, bindings: {}, error: "boom" }),
      ),
    ).rejects.toThrow(
      "Unable to inspect compiled depends_on relationships: boom",
    );
  });

  test("explains a source view that cannot be read", async () => {
    const root = gitWorkspace({});
    const read = spyOn(discovery, "discoverSourceFiles");
    spies.push(read);
    const outcomes = [];
    for (const failure of [
      new Error("Pending source hash drift: a.md"),
      new Error("Pending source is missing: b.md"),
      "plain failure",
    ]) {
      read.mockRejectedValueOnce(failure);
      outcomes.push(
        await collectSourceRelationshipParityViolations(root, engine()),
      );
    }
    expectGolden("source-relationship-parity-discovery", outcomes);
  });

  test("names each source that cannot be compiled", async () => {
    const root = gitWorkspace({});
    spies.push(
      spyOn(extraction, "processExtractions").mockResolvedValue({
        results: [],
        failedCacheKeys: new Set(),
        errors: [
          { file: join(root, ".kb/requirements/REQ-bad.md"), message: "bad" },
        ],
        failures: [],
      } as never),
    );
    expectGolden(
      "source-relationship-parity-extraction",
      await collectSourceRelationshipParityViolations(root, engine()),
    );
  });

  test("names each entity id declared more than once, before comparing links", async () => {
    const root = gitWorkspace({
      ".kb/requirements/REQ-c.md": requirement("REQ-c"),
      ".kb/requirements/REQ-c-copy.md": requirement("REQ-c"),
      ".kb/symbols.yaml": [
        "symbols:",
        "  - id: SYM-a",
        "    title: a",
        "    sourceFile: src/a.ts",
        "  - id: SYM-b",
        "    title: b",
        "  - id: SYM-a",
        "    title: A",
        "    status: deprecated",
        "",
      ].join("\n"),
    });
    const port = engine();
    const violations = await collectSourceRelationshipParityViolations(
      root,
      port,
    );
    expect(port.goals).toEqual([]);
    const suggestion = (id: string, files: string) =>
      `Keep one declaration of ${id} that carries the fields and links of every copy. When the copies differ only in their links, a kb_upsert of ${id} with its title and status merges them into one record. Otherwise edit ${files} by hand, then run kibi sync and rerun kb_check. Copies like these usually come from a merge without the Kibi merge driver; kibi doctor reports how to set it up.`;
    expect(violations).toStrictEqual([
      {
        rule: "source-relationship-parity",
        entityId: "REQ-c",
        source: ".kb/requirements/REQ-c-copy.md, .kb/requirements/REQ-c.md",
        description:
          "REQ-c is declared 2 times ('REQ-c title' in .kb/requirements/REQ-c-copy.md; 'REQ-c title' in .kb/requirements/REQ-c.md), so the KB keeps only one of the declarations and the staged gate refuses every commit until one remains",
        suggestion: suggestion(
          "REQ-c",
          ".kb/requirements/REQ-c-copy.md and .kb/requirements/REQ-c.md",
        ),
        evidence: {
          direction: "duplicate_entity",
          declarations: [
            {
              source: ".kb/requirements/REQ-c-copy.md",
              title: "REQ-c title",
              status: "open",
            },
            {
              source: ".kb/requirements/REQ-c.md",
              title: "REQ-c title",
              status: "open",
            },
          ],
        },
      },
      {
        rule: "source-relationship-parity",
        entityId: "SYM-a",
        source: ".kb/symbols.yaml",
        description:
          "SYM-a is declared 2 times ('a' in .kb/symbols.yaml; 'A' in .kb/symbols.yaml), so the KB keeps only one of the declarations and the staged gate refuses every commit until one remains",
        suggestion: suggestion("SYM-a", ".kb/symbols.yaml"),
        evidence: {
          direction: "duplicate_entity",
          declarations: [
            {
              source: ".kb/symbols.yaml",
              title: "a",
              status: "active",
              sourceFile: "src/a.ts",
            },
            { source: ".kb/symbols.yaml", title: "A", status: "deprecated" },
          ],
        },
      },
    ]);
  });

  test("normalizes the separators of an authored source", async () => {
    const root = gitWorkspace({});
    spies.push(
      spyOn(extraction, "processExtractions").mockResolvedValue({
        results: [
          {
            entity: { id: "REQ-1", source: "docs\\a.md" },
            relationships: [
              { type: "verified_by", from: "REQ-1", to: "TEST-1" },
            ],
          },
        ],
        failedCacheKeys: new Set(),
        errors: [],
        failures: [],
      } as never),
    );
    const [violation] = await collectSourceRelationshipParityViolations(
      root,
      engine(),
    );
    expect(violation?.source).toBe("docs/a.md");
  });

  test("compares authored links and shards and names untracked endpoints", async () => {
    const root = gitWorkspace(
      {
        ".kb/requirements/REQ-a.md": requirement("REQ-a", [
          ["depends_on", "REQ-u"],
          ["depends_on", "REQ-b"],
        ]),
        ".kb/requirements/REQ-b.md": requirement("REQ-b"),
        ".kb/relationships/a.yaml": shard([
          ["relates_to", "REQ-v", "REQ-u"],
          ["relates_to", "REQ-b", "REQ-a"],
        ]),
      },
      {
        ".kb/requirements/REQ-u.md": requirement("REQ-u"),
        ".kb/requirements/REQ-v.md": requirement("REQ-v"),
      },
    );
    const extract = spyOn(extraction, "processExtractions");
    spies.push(extract);
    const violations = await collectSourceRelationshipParityViolations(
      root,
      engine({
        depends_on: "[['REQ-a','REQ-b','.kb/requirements/REQ-a.md']]",
        relates_to: "[['REQ-u','REQ-x','.kb/requirements/REQ-u.md']]",
      }),
    );
    expect(extract.mock.calls[0]?.slice(2)).toEqual([true, root]);
    expectGolden(
      "source-relationship-parity-untracked",
      JSON.parse(JSON.stringify(violations).replaceAll(root, "<root>")),
    );
  });
});
