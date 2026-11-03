import { afterEach, describe, expect, mock, test } from "bun:test";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  DefaultThemeIcon,
  type VscodeMockOverrides,
  getVscodeMockModule,
  resetVscodeMock as resetState,
} from "./shared/vscode-mock";

function resetVscodeMock(overrides: VscodeMockOverrides = {}): void {
  resetState(overrides);
  mock.module("vscode", () => getVscodeMockModule());
}

resetVscodeMock();

const { KibiTreeDataProvider } = await import("../src/treeProvider");

type Item = {
  label: string;
  description?: string;
  iconPath?: string;
  contextValue?: string;
  collapsibleState: number;
  children?: Item[];
  tooltip?: string;
  localPath?: string;
  sourceLine?: number;
  targetId?: string;
};

type Internals = {
  entities: unknown[];
  relationships: unknown[];
  parseRdf(content: string): unknown[];
};

const roots: string[] = [];
const realCwd = process.cwd();

afterEach(() => {
  process.chdir(realCwd);
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  resetVscodeMock();
});

function tempRoot(): string {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-vsc-tree-mut-")),
  );
  roots.push(root);
  return root;
}

function write(root: string, rel: string, content = ""): string {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

function rdf(...blocks: string[]): string {
  return `<rdf:RDF>\n${blocks.join("\n")}\n</rdf:RDF>`;
}

function description(id: string, body: string): string {
  return `<rdf:Description rdf:about="kb:entity/${id}">${body}</rdf:Description>`;
}

function outputChannel() {
  const lines: string[] = [];
  return { lines, appendLine: (line: string) => lines.push(line) };
}

async function rootItems(root: string, output?: unknown): Promise<Item[]> {
  const provider = new KibiTreeDataProvider(root, output as never);
  return (await provider.getChildren()) as Item[];
}

function category(items: Item[], label: string): Item {
  const found = items.find((item) => item.label.startsWith(label));
  if (!found) throw new Error(`no ${label} category`);
  return found;
}

function only(item: Item): Item {
  expect(item.children).toHaveLength(1);
  return item.children?.[0] as Item;
}

describe("root items", () => {
  test("every category has its name, icon, context and count", async () => {
    const root = tempRoot();
    write(root, ".kb/requirements/REQ-1.md", "---\ntitle: R\n---\n");
    write(root, ".kb/scenarios/SCEN-1.md");
    write(root, ".kb/tests/TEST-1.md");
    write(root, ".kb/adr/ADR-1.md");
    write(root, ".kb/flags/FLAG-1.md");
    write(root, ".kb/events/EVT-1.md");
    write(root, ".kb/facts/FACT-1.md");
    const items = await rootItems(root);
    expect(
      items.map((item) => [
        item.label,
        item.iconPath,
        item.contextValue,
        item.collapsibleState,
        item.children?.length,
      ]),
    ).toEqual([
      ["Requirements (1)", "list-ordered", "kibi-req", 1, 1],
      ["Scenarios (1)", "file-text", "kibi-scenario", 1, 1],
      ["Tests (1)", "check", "kibi-test", 1, 1],
      ["ADRs (1)", "book", "kibi-adr", 1, 1],
      ["Flags (1)", "flag", "kibi-flag", 1, 1],
      ["Events (1)", "calendar", "kibi-event", 1, 1],
      ["Symbols (0)", "symbol-class", "kibi-symbol", 0, 0],
    ]);
  });
});

describe("documentation entities", () => {
  test("frontmatter fields, defaults and the tooltip", async () => {
    const root = tempRoot();
    const full = write(
      root,
      ".kb/requirements/REQ-1.md",
      "---\nid: REQ-1\ntitle: First\nstatus: draft\ntags: [a, b]\nsource: https://example.test/r\n---\nbody\n",
    );
    const bare = write(root, ".kb/requirements/REQ-2.md", "no frontmatter\n");
    write(root, ".kb/requirements/REQ-3.md", "---\n\n---\n");
    write(root, ".kb/requirements/REQ-4.md", "---\n: : :\n---\n");
    write(root, ".kb/requirements/REQ-5.md", "x\n---\nid: REQ-LATE\n---\n");
    write(root, ".kb/requirements/REQ-6.md", "---\ntags: '[x]y'\n---\n");
    write(root, ".kb/requirements/notes.txt", "---\nid: REQ-TXT\n---\n");
    fs.mkdirSync(path.join(root, ".kb", "requirements", "dir.md"));
    const reqs = category(await rootItems(root), "Requirements");
    expect(reqs.children?.map((item) => item.label).sort()).toEqual([
      "REQ-1: First",
      "REQ-2: REQ-2",
      "REQ-3: REQ-3",
      "REQ-4: REQ-4",
      "REQ-5: REQ-5",
      "REQ-6: REQ-6",
    ]);
    const first = reqs.children?.find((item) => item.label === "REQ-1: First");
    expect(first).toStrictEqual({
      label: "REQ-1: First",
      description: undefined,
      iconPath: "list-ordered",
      contextValue: "kibi-entity-req",
      collapsibleState: 0,
      tooltip:
        "ID: REQ-1\nSource: https://example.test/r\nStatus: draft\nTags: a, b",
      localPath: full,
      sourceLine: undefined,
      children: [],
    });
    expect(
      reqs.children?.find((item) => item.label === "REQ-2: REQ-2")?.tooltip,
    ).toBe("ID: REQ-2\nSource: .kb/requirements/REQ-2.md\nStatus: active");
    expect(
      reqs.children?.find((item) => item.label === "REQ-2: REQ-2")?.localPath,
    ).toBe(bare);
    expect(
      reqs.children?.find((item) => item.label === "REQ-6: REQ-6")?.tooltip,
    ).toBe(
      "ID: REQ-6\nSource: .kb/requirements/REQ-6.md\nStatus: active\nTags: x]y",
    );
  });

  test("tags lose only their outer brackets", async () => {
    const root = tempRoot();
    write(root, ".kb/adr/ADR-1.md", "---\ntags: 'a[b'\n---\n");
    write(root, ".kb/adr/ADR-2.md", "---\ntags: 'a]b'\n---\n");
    const adrs = category(await rootItems(root), "ADRs");
    expect(
      adrs.children?.map((item) => item.tooltip?.split("\n").at(-1)),
    ).toEqual(expect.arrayContaining(["Tags: a[b", "Tags: a]b"]));
  });

  test("backslashes in relative paths become slashes", async () => {
    const root = tempRoot();
    write(root, ".kb/tests/TEST-a\\b.md");
    const tests = category(await rootItems(root), "Tests");
    expect(only(tests).tooltip).toBe(
      "ID: TEST-a\\b\nSource: .kb/tests/TEST-a/b.md\nStatus: active",
    );
  });
});

describe("relationship children", () => {
  test("outgoing and incoming links read with their labels", async () => {
    const root = tempRoot();
    const types = [
      "depends_on",
      "specified_by",
      "verified_by",
      "covered_by",
      "executable_for",
      "constrained_by",
      "guards",
    ];
    write(
      root,
      ".kb/requirements/REQ-1.md",
      `---\ntitle: One\nlinks:\n${types
        .map((type, i) => `  - type: ${type}\n    target: TEST-${i}`)
        .join(
          "\n",
        )}\n  - SCEN-1\n  - null\n  - 5\n  - target: ""\n  - to: ADR-1\n---\n`,
    );
    const test0 = write(root, ".kb/tests/TEST-0.md", "---\ntitle: Zero\n---\n");
    write(root, ".kb/scenarios/SCEN-2.md", "---\nlinks: [REQ-9]\n---\n");
    const items = await rootItems(root);
    const one = only(category(items, "Requirements"));
    expect(one.collapsibleState).toBe(1);
    expect(one.children?.map((child) => child.label)).toEqual([
      "→ depends on: TEST-0: Zero",
      "→ specified by: TEST-1",
      "→ verified by: TEST-2",
      "→ covered by: TEST-3",
      "→ executable for: TEST-4",
      "→ constrained by: TEST-5",
      "→ guards: TEST-6",
      "→ relates to: SCEN-1",
      "→ relates to: ADR-1",
    ]);
    expect(one.children?.[0]).toStrictEqual({
      label: "→ depends on: TEST-0: Zero",
      iconPath: "arrow-right",
      contextValue: "kibi-relationship",
      collapsibleState: 0,
      tooltip: "REQ-1 -[depends_on]-> TEST-0",
      localPath: test0,
      sourceLine: undefined,
      targetId: "TEST-0",
    });
    const zero = category(items, "Tests").children?.find(
      (item) => item.label === "TEST-0: Zero",
    );
    expect(
      zero?.children?.map((child) => [child.label, child.targetId]),
    ).toEqual([["← depends on: REQ-1: One", "REQ-1"]]);
  });
});

describe("symbols", () => {
  test("symbol entities show their code location", async () => {
    const root = tempRoot();
    write(root, "src/a.ts", "export const a = 1;\n");
    write(
      root,
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-1",
        "    title: alpha",
        "    sourceFile: src/a.ts",
        "    sourceLine: 3",
        "    links:",
        "      - REQ-1",
        "  - id: SYM-2",
        "    title: beta",
        "    sourceFile: src/a.ts",
        "  - id: SYM-3",
        "    title: gone",
        "    sourceFile: src/missing.ts",
        "",
      ].join("\n"),
    );
    const symbols = category(await rootItems(root), "Symbols");
    const [one, two, three] = symbols.children as Item[];
    expect(one).toStrictEqual({
      label: "SYM-1: alpha",
      description: "src/a.ts:3",
      iconPath: "symbol-class",
      contextValue: "kibi-symbol",
      collapsibleState: 1,
      tooltip: [
        "ID: SYM-1",
        "Source: src/a.ts",
        "Status: active",
        "Code: src/a.ts:3",
        "Click to open source code. Expand to browse linked entities.",
      ].join("\n"),
      localPath: path.join(root, "src", "a.ts"),
      sourceLine: 3,
      children: [
        {
          label: "→ relates to: REQ-1",
          iconPath: "arrow-right",
          contextValue: "kibi-relationship",
          collapsibleState: 0,
          tooltip: "SYM-1 -[relates_to]-> REQ-1",
          localPath: undefined,
          sourceLine: undefined,
          targetId: "REQ-1",
        },
      ],
    });
    expect(two?.description).toBe("src/a.ts");
    expect(three?.description).toBeUndefined();
    expect(three?.tooltip).toBe(
      [
        "ID: SYM-3",
        "Source: .kb/symbols.yaml",
        "Status: active",
        "(Source is a URL — cannot open directly)",
      ].join("\n"),
    );
  });

  test("the fallback entity for a symbol", () => {
    const root = tempRoot();
    const existing = write(root, "src/a.ts");
    const provider = new KibiTreeDataProvider(root);
    expect(
      provider.getFallbackSymbolEntity({
        id: "SYM-1",
        title: "alpha",
        sourceFile: existing,
        sourceLine: 2,
      }),
    ).toStrictEqual({
      id: "SYM-1",
      type: "symbol",
      title: "alpha",
      status: "active",
      tags: "",
      source: "src/a.ts",
      localPath: existing,
      sourceLine: 2,
    });
    expect(
      provider.getFallbackSymbolEntity({
        id: "SYM-2",
        title: "beta",
        sourceFile: path.join(root, "src", "b.ts"),
      }),
    ).toStrictEqual({
      id: "SYM-2",
      type: "symbol",
      title: "beta",
      status: "active",
      tags: "",
      source: "src/b.ts",
      localPath: undefined,
      sourceLine: undefined,
    });
    expect(
      provider.getFallbackSymbolEntity({ id: "SYM-3", title: "gamma" }).source,
    ).toBe(".kb/symbols.yaml");
  });
});

describe("kb.rdf entities", () => {
  test("titles, statuses, tags and sources are read from each block", async () => {
    const root = tempRoot();
    const local = write(root, "docs/local.md");
    write(
      root,
      ".kb/branches/develop/kb.rdf",
      rdf(
        description(
          "REQ-1",
          `<kb:type>req</kb:type><kb:title>  Spaced  </kb:title><kb:status rdf:resource="http://kibi.dev/kb/status/active"/><kb:tags>[t1]</kb:tags><kb:source>file://${local}</kb:source>`,
        ),
        description(
          "REQ-2",
          `<kb:type>req</kb:type><kb:title>Abs</kb:title><kb:source>${local}</kb:source>`,
        ),
        description(
          "REQ-3",
          "<kb:type>req</kb:type><kb:title>Web</kb:title><kb:source>https://example.test/x</kb:source>",
        ),
        description(
          "REQ-4",
          "<kb:type>req</kb:type><kb:title>Missing</kb:title><kb:source>/no/such/file.md</kb:source>",
        ),
        description(
          "REQ-5",
          "<kb:type>req</kb:type><kb:title>Bad URI</kb:title><kb:source>file://host:99999/x</kb:source>",
        ),
        description("REQ-6", "<kb:title>No type</kb:title>"),
        description("REQ-7", "<kb:type>req</kb:type>"),
      ),
    );
    const reqs = category(await rootItems(root), "Requirements");
    expect(
      reqs.children?.map((item) => [item.label, item.localPath, item.tooltip]),
    ).toEqual([
      [
        "REQ-1: Spaced",
        local,
        `ID: REQ-1\nSource: file://${local}\nStatus: active\nTags: t1`,
      ],
      ["REQ-2: Abs", local, `ID: REQ-2\nSource: ${local}`],
      [
        "REQ-3: Web",
        undefined,
        "ID: REQ-3\nSource: https://example.test/x\n(Source is a URL — cannot open directly)",
      ],
      [
        "REQ-4: Missing",
        undefined,
        "ID: REQ-4\nSource: /no/such/file.md\n(Source is a URL — cannot open directly)",
      ],
      [
        "REQ-5: Bad URI",
        undefined,
        "ID: REQ-5\nSource: file://host:99999/x\n(Source is a URL — cannot open directly)",
      ],
    ]);
  });

  test("only drive-letter paths at the start count as Windows paths", async () => {
    const root = tempRoot();
    write(root, "xC:/doc.md");
    write(
      root,
      ".kb/branches/develop/kb.rdf",
      rdf(
        description(
          "REQ-1",
          "<kb:type>req</kb:type><kb:title>W</kb:title><kb:source>xC:/doc.md</kb:source>",
        ),
      ),
    );
    process.chdir(root);
    const reqs = category(await rootItems(root), "Requirements");
    expect(only(reqs).localPath).toBeUndefined();
  });

  test("symbol blocks use the symbol index; other types do not", async () => {
    const root = tempRoot();
    const source = write(root, "src/a.ts");
    write(
      root,
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-1\n    title: s\n    sourceFile: src/a.ts\n    sourceLine: 4\n  - id: REQ-1\n    title: odd\n    sourceFile: src/a.ts\n    sourceLine: 9\n",
    );
    write(
      root,
      ".kb/branches/develop/kb.rdf",
      rdf(
        description("SYM-1", "<kb:type>symbol</kb:type><kb:title>s</kb:title>"),
        description("REQ-1", "<kb:type>req</kb:type><kb:title>r</kb:title>"),
      ),
    );
    const provider = new KibiTreeDataProvider(root);
    await provider.getChildren();
    expect(provider.getEntityById("SYM-1")?.localPath).toBe(source);
    expect(provider.getEntityById("SYM-1")?.sourceLine).toBe(4);
    // The symbol index fallback adds REQ-1 as a symbol; the RDF block keeps
    // its own type and gets no symbol line.
    expect(provider.getEntityById("REQ-1")).toStrictEqual({
      id: "REQ-1",
      type: "req",
      title: "r",
      status: "active",
      tags: "",
      source: "src/a.ts",
      localPath: source,
      sourceLine: 9,
    });
  });

  test("RDF values merge over documentation values", async () => {
    const root = tempRoot();
    const doc = write(
      root,
      ".kb/requirements/REQ-1.md",
      "---\ntitle: Doc\ntags: [d]\nstatus: draft\n---\n",
    );
    write(
      root,
      ".kb/branches/develop/kb.rdf",
      rdf(
        description("REQ-1", "<kb:type>req</kb:type><kb:title>Rdf</kb:title>"),
      ),
    );
    const provider = new KibiTreeDataProvider(root);
    await provider.getChildren();
    expect(provider.getEntityById("REQ-1")).toStrictEqual({
      id: "REQ-1",
      type: "req",
      title: "Rdf",
      status: "draft",
      tags: "[d]",
      source: ".kb/requirements/REQ-1.md",
      localPath: doc,
      sourceLine: undefined,
    });
    expect((provider as unknown as Internals).relationships).toEqual([]);
  });

  test("the branch file is used, with develop for master and as fallback", async () => {
    for (const [branch, file] of [
      ["feature", "develop"],
      ["master", "develop"],
      ["feature", "feature"],
    ] as const) {
      const root = tempRoot();
      execSync(`git init -q -b ${branch}`, { cwd: root });
      write(
        root,
        `.kb/branches/${file}/kb.rdf`,
        rdf(
          description(
            "REQ-1",
            `<kb:type>req</kb:type><kb:title>${file}</kb:title>`,
          ),
        ),
      );
      const provider = new KibiTreeDataProvider(root);
      await provider.getChildren();
      expect(provider.getEntityById("REQ-1")?.title).toBe(file);
    }
  });

  test("statuses come only from kb:status; no source means no source line", async () => {
    const root = tempRoot();
    write(
      root,
      ".kb/branches/develop/kb.rdf",
      rdf(
        description(
          "REQ-1",
          '<kb:type>req</kb:type><kb:title>T</kb:title><kb:owner rdf:resource="http://kibi.dev/kb/owner/bob"/>',
        ),
      ),
    );
    const reqs = category(await rootItems(root), "Requirements");
    expect(only(reqs).tooltip).toBe("ID: REQ-1");
  });

  test("a requirement known to the symbol index keeps its document", async () => {
    const root = tempRoot();
    write(root, "src/a.ts");
    const doc = write(
      root,
      ".kb/requirements/REQ-1.md",
      "---\ntitle: D\n---\n",
    );
    write(
      root,
      ".kb/symbols.yaml",
      "symbols:\n  - id: REQ-1\n    title: odd\n    sourceFile: src/a.ts\n",
    );
    write(
      root,
      ".kb/branches/develop/kb.rdf",
      rdf(description("REQ-1", "<kb:type>req</kb:type><kb:title>r</kb:title>")),
    );
    const provider = new KibiTreeDataProvider(root);
    await provider.getChildren();
    expect(provider.getEntityById("REQ-1")?.localPath).toBe(doc);
  });

  test("parsing before any load has no symbol index to consult", () => {
    const internals = new KibiTreeDataProvider(
      tempRoot(),
    ) as unknown as Internals;
    expect(internals.parseRdf("")).toEqual([]);
    expect(
      internals.parseRdf(
        description("SYM-1", "<kb:type>symbol</kb:type><kb:title>s</kb:title>"),
      ),
    ).toEqual([
      {
        id: "SYM-1",
        type: "symbol",
        title: "s",
        status: "",
        tags: "",
        source: "",
        localPath: undefined,
        sourceLine: undefined,
      },
    ]);
  });

  test("without a kb.rdf only the fallback entities load", async () => {
    const root = tempRoot();
    const doc = write(
      root,
      ".kb/requirements/REQ-1.md",
      "---\nlinks:\n  - ~\n  - 5\n  - REQ-2\n---\n",
    );
    const provider = new KibiTreeDataProvider(root);
    await provider.getChildren();
    const internals = provider as unknown as Internals;
    expect(internals.entities).toEqual([
      {
        id: "REQ-1",
        type: "req",
        title: "REQ-1",
        status: "active",
        tags: "",
        source: ".kb/requirements/REQ-1.md",
        localPath: doc,
      },
    ]);
    expect(internals.relationships).toEqual([
      { relType: "relates_to", fromId: "REQ-1", toId: "REQ-2" },
    ]);
  });
});

describe("getTreeItem", () => {
  test("copies the fields and opens files or related entities", () => {
    const provider = new KibiTreeDataProvider(tempRoot());
    const file = provider.getTreeItem({
      label: "L",
      description: "d",
      iconPath: "book",
      contextValue: "c",
      collapsibleState: 1,
      tooltip: "t",
      localPath: "/w/a.md",
      sourceLine: 3,
    });
    expect(file).toMatchObject({
      label: "L",
      collapsibleState: 1,
      description: "d",
      contextValue: "c",
      tooltip: "t",
      command: {
        command: "kibi.openEntity",
        title: "Open Entity File",
        arguments: ["/w/a.md", 3],
      },
      resourceUri: { fsPath: "/w/a.md", path: "/w/a.md", scheme: "file" },
    });
    expect(file.iconPath).toEqual(new DefaultThemeIcon("book"));

    const related = provider.getTreeItem({
      label: "R",
      collapsibleState: 0,
      targetId: "REQ-9",
    });
    expect(related.command).toEqual({
      command: "kibi.openEntityById",
      title: "Open Related Entity",
      arguments: ["REQ-9"],
    });
    expect(related.iconPath).toBeUndefined();
    expect(related.resourceUri).toBeUndefined();

    const plain = provider.getTreeItem({
      label: "P",
      description: "",
      collapsibleState: 0,
    });
    expect(plain.command).toBeUndefined();
    expect(plain.description).toBeUndefined();
  });
});

describe("loading and navigation", () => {
  test("loads once until refreshed, which notifies listeners", async () => {
    const root = tempRoot();
    write(root, ".kb/requirements/REQ-1.md");
    const provider = new KibiTreeDataProvider(root);
    const internals = provider as unknown as Internals;
    expect(internals.entities).toEqual([]);
    expect(internals.relationships).toEqual([]);
    expect(provider.getEntityCount("req")).toBe(0);
    await provider.getChildren();
    write(root, ".kb/requirements/REQ-2.md");
    await provider.getChildren();
    expect(provider.getEntityCount("req")).toBe(1);
    const fired: unknown[] = [];
    provider.onDidChangeTreeData((value: unknown) => fired.push(value));
    provider.refresh();
    expect(fired).toEqual([undefined]);
    expect(internals.entities).toEqual([]);
    await provider.getChildren();
    expect(provider.getEntityCount("req")).toBe(2);
    expect(internals.relationships).toEqual([]);
  });

  test("children of an item are its own children", async () => {
    const provider = new KibiTreeDataProvider(tempRoot());
    const child = { label: "c", collapsibleState: 0 };
    expect(
      await provider.getChildren({
        label: "p",
        collapsibleState: 1,
        children: [child],
      }),
    ).toEqual([child]);
    expect(
      await provider.getChildren({ label: "p", collapsibleState: 0 }),
    ).toEqual([]);
  });

  test("navigation works before loading and without an output channel", async () => {
    const root = tempRoot();
    const fact = write(root, ".kb/facts/FACT-1.md");
    const provider = new KibiTreeDataProvider(root);
    expect(provider.getNavigationTargetForEntity("FACT-1")).toEqual({
      localPath: fact,
    });
    expect(provider.getNavigationTargetForEntity("SYM-1")).toBeUndefined();
    expect(
      provider.getNavigationTargetForEntity("constructor"),
    ).toBeUndefined();

    write(root, ".kb/adr/ADR-1.md");
    // The documentation directories are cached until a refresh.
    expect(provider.getNavigationTargetForEntity("ADR-1")).toBeUndefined();
    provider.refresh();
    expect(provider.getNavigationTargetForEntity("ADR-1")?.localPath).toBe(
      path.join(root, ".kb", "adr", "ADR-1.md"),
    );

    await provider.getChildren();
    fs.rmSync(fact);
    expect(provider.getNavigationTargetForEntity("FACT-1")).toBeUndefined();
  });

  test("a missing entity file is logged", async () => {
    const root = tempRoot();
    const doc = write(root, ".kb/requirements/REQ-1.md");
    const output = outputChannel();
    const provider = new KibiTreeDataProvider(root, output as never);
    await provider.getChildren();
    fs.rmSync(doc);
    expect(provider.getLocalPathForEntity("REQ-1")).toBeUndefined();
    expect(output.lines).toEqual([
      `getNavigationTargetForEntity: Entity REQ-1 has localPath ${doc} but file does not exist.`,
    ]);
  });
});
