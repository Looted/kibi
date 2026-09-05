// implements REQ-vscode-sidebar-kb-tree
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

resetVscodeMock();
mock.module("vscode", () => getVscodeMockModule());

const { KibiTreeDataProvider } = await import("../src/treeProvider.ts");

type ProviderInternals = {
  getCurrentBranch: () => Promise<string>;
  getKbRdfPath: () => Promise<string | null>;
  loadEntities: () => Promise<void>;
  parseRdf: (content: string) => Array<{
    id: string;
    type: string;
    title: string;
    localPath?: string;
    source?: string;
    status?: string;
    tags?: string;
  }>;
  parseFrontmatter: (content: string) => Record<string, unknown>;
  parseDocumentationEntity: (
    filePath: string,
    type: string,
  ) => Promise<unknown>;
  mergeEntities: (
    ...collections: Array<Array<Record<string, unknown>>>
  ) => Array<Record<string, unknown>>;
  mergeRelationships: (
    ...collections: Array<
      Array<{ relType: string; fromId: string; toId: string }>
    >
  ) => Array<{ relType: string; fromId: string; toId: string }>;
  entityToTreeItem: (
    entity: Record<string, unknown>,
    index: Map<string, Record<string, unknown>>,
  ) => { tooltip?: string; description?: string; iconPath?: string };
  formatLocationDescription: (filePath: string, line?: number) => string;
  getFallbackSymbolEntity: (symbol: {
    id: string;
    title: string;
    sourceFile?: string;
    sourceLine?: number;
  }) => { source: string; localPath?: string };
  getDocumentationPathForEntity: (
    id: string,
    type?: string,
  ) => string | undefined;
  inferEntityTypeFromId: (id: string) => string | undefined;
  entities: Array<Record<string, unknown>>;
  relationships: Array<{ relType: string; fromId: string; toId: string }>;
  symbolIndex: {
    byId: Map<
      string,
      { id: string; title: string; sourceFile?: string; sourceLine?: number }
    >;
  } | null;
};

function writeFile(filePath: string, content = ""): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function initGitRepo(root: string, branch: string): void {
  execSync(`git init -b ${branch}`, { cwd: root, stdio: "ignore" });
  execSync("git config user.email test@example.com", {
    cwd: root,
    stdio: "ignore",
  });
  execSync("git config user.name test", { cwd: root, stdio: "ignore" });
}

let tmpDir: string;

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe("treeProvider remaining runtime branches", () => {
  test("loads RDF on the current branch, merges fallback docs, and builds typed roots", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-tree-cov-"));
    initGitRepo(tmpDir, "feature-tree");
    const sourceFile = path.join(tmpDir, "src", "alpha.ts");
    writeFile(sourceFile, "export function alpha() {}\n");
    writeFile(
      path.join(tmpDir, ".kb", "symbols.yaml"),
      [
        "symbols:",
        "  - id: SYM-ALPHA",
        "    title: alpha",
        `    sourceFile: ${sourceFile}`,
        "    sourceLine: 1",
        "    links:",
        "      - REQ-DOC",
      ].join("\n"),
    );
    writeFile(
      path.join(tmpDir, ".kb", "requirements", "REQ-DOC.md"),
      [
        "---",
        "id: REQ-DOC",
        "title: Documented",
        "status: open",
        "tags:",
        "  - tree",
        "links:",
        "  - SCEN-DOC",
        "---",
        "body",
      ].join("\n"),
    );
    writeFile(
      path.join(tmpDir, ".kb", "scenarios", "SCEN-DOC.md"),
      "---\nid: SCEN-DOC\ntitle: Scenario\n---\n",
    );
    writeFile(
      path.join(tmpDir, ".kb", "tests", "TEST-DOC.md"),
      "---\nid: TEST-DOC\n---\n",
    );
    writeFile(path.join(tmpDir, ".kb", "adr", "ADR-DOC.md"), "no-frontmatter\n");
    writeFile(
      path.join(tmpDir, ".kb", "flags", "FLAG-DOC.md"),
      "---\nid: FLAG-DOC\ntitle: Flag\n---\n",
    );
    writeFile(
      path.join(tmpDir, ".kb", "events", "EVT-DOC.md"),
      "---\nid: EVT-DOC\ntitle: Event\n---\n",
    );
    writeFile(
      path.join(tmpDir, ".kb", "facts", "FACT-DOC.md"),
      "---\nid: FACT-DOC\ntitle: Fact\n---\n",
    );
    writeFile(
      path.join(tmpDir, ".kb", "branches", "feature-tree", "kb.rdf"),
      `
      <rdf:Description rdf:about="kb:entity/REQ-DOC">
        <kb:type>req</kb:type>
        <kb:title></kb:title>
        <kb:status rdf:resource="http://kibi.dev/kb/status/"/>
        <kb:tags></kb:tags>
        <kb:source></kb:source>
      </rdf:Description>
      <rdf:Description rdf:about="urn:kibi:entity/SYM-ALPHA">
        <kb:type>symbol</kb:type>
        <kb:title>alpha</kb:title>
        <kb:source>https://example.com/alpha</kb:source>
      </rdf:Description>
      <rdf:Description rdf:about="urn:kibi:entity/REQ-URL">
        <kb:type>req</kb:type>
        <kb:title>Remote</kb:title>
        <kb:source>https://example.com/REQ-URL</kb:source>
      </rdf:Description>
      <rdf:Description rdf:about="urn:kibi:entity/SKIP">
        <kb:title>Missing type</kb:title>
      </rdf:Description>
      `,
    );

    const provider = new KibiTreeDataProvider(tmpDir);
    const roots = await provider.getChildren();
    expect(roots.some((item) => item.label.startsWith("Requirements"))).toBe(
      true,
    );
    const reqRoot = roots.find((item) => item.contextValue === "kibi-req");
    expect(reqRoot?.children?.length).toBeGreaterThan(0);
    const symbolRoot = roots.find((item) => item.contextValue === "kibi-symbol");
    expect(symbolRoot?.children?.[0]?.description).toContain("src/alpha.ts");

    const internals = provider as unknown as ProviderInternals;
    expect(await internals.getCurrentBranch()).toBe("feature-tree");
    expect(await internals.getKbRdfPath()).toContain("feature-tree");

    const emptyParent = await provider.getChildren({
      label: "empty",
      collapsibleState: 0,
    });
    expect(emptyParent).toEqual([]);

    expect(provider.getEntityById("REQ-URL")?.source).toBe(
      "https://example.com/REQ-URL",
    );
    const urlItem = internals.entityToTreeItem(
      {
        id: "REQ-URL",
        type: "req",
        title: "Remote",
        status: "",
        tags: "",
        source: "https://example.com/REQ-URL",
      },
      new Map(),
    );
    expect(urlItem.tooltip).toContain("cannot open directly");

    const unknownType = internals.entityToTreeItem(
      {
        id: "ZZZ-1",
        type: "unknown",
        title: "Other",
        status: "open",
        tags: "[alpha]",
        source: "",
      },
      new Map(),
    );
    expect(unknownType.iconPath).toBe("circle-outline");
  });

  test("git master and missing git remap to develop, and develop RDF is the fallback", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-tree-master-"));
    initGitRepo(tmpDir, "master");
    writeFile(
      path.join(tmpDir, ".kb", "branches", "develop", "kb.rdf"),
      `
      <rdf:Description rdf:about="kb:entity/REQ-DEV">
        <kb:type>req</kb:type>
        <kb:title>Develop</kb:title>
      </rdf:Description>
      `,
    );
    const provider = new KibiTreeDataProvider(tmpDir);
    const internals = provider as unknown as ProviderInternals;
    expect(await internals.getCurrentBranch()).toBe("develop");
    expect(await internals.getKbRdfPath()).toContain(
      path.join(".kb", "branches", "develop", "kb.rdf"),
    );

    const orphan = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-tree-nogit-"));
    try {
      const noGit = new KibiTreeDataProvider(orphan);
      const noGitInternals = noGit as unknown as ProviderInternals;
      expect(await noGitInternals.getCurrentBranch()).toBe("develop");
      expect(await noGitInternals.getKbRdfPath()).toBeNull();
    } finally {
      fs.rmSync(orphan, { recursive: true, force: true });
    }
  });

  test("RDF read failures, unreadable docs, and frontmatter edge cases stay resilient", async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-tree-rdf-fail-"));
    initGitRepo(tmpDir, "develop");
    const rdfPath = path.join(tmpDir, ".kb", "branches", "develop", "kb.rdf");
    fs.mkdirSync(rdfPath, { recursive: true });
    writeFile(
      path.join(tmpDir, ".kb", "requirements", "BAD.md"),
      "---\nid: REQ-BAD\n---\n",
    );
    writeFile(
      path.join(tmpDir, ".kb", "requirements", "SCALAR.md"),
      "---\n42\n---\n",
    );
    writeFile(
      path.join(tmpDir, ".kb", "requirements", "BROKEN.md"),
      "---\n: : :\n---\n",
    );

    const originalRead = fs.promises.readFile.bind(fs.promises);
    const readSpy = spyOn(fs.promises, "readFile").mockImplementation(
      ((filePath: fs.PathLike | fs.promises.FileHandle, options?: unknown) => {
        if (String(filePath).endsWith("BAD.md")) {
          return Promise.reject(new Error("unreadable"));
        }
        return originalRead(filePath, options as never);
      }) as typeof fs.promises.readFile,
    );

    const provider = new KibiTreeDataProvider(tmpDir);
    await provider.getChildren();
    readSpy.mockRestore();

    expect(provider.getEntityById("REQ-BAD")).toBeUndefined();
    expect(provider.getEntityById("SCALAR")?.title).toBe("SCALAR");

    const internals = provider as unknown as ProviderInternals;
    expect(internals.parseFrontmatter("---\nnull\n---\n")).toEqual({});
    expect(internals.parseFrontmatter("not yaml")).toEqual({});
    expect(
      await internals.parseDocumentationEntity(
        path.join(tmpDir, "missing.md"),
        "req",
      ),
    ).toBeNull();
  });

  test("parseRdf resolves symbol sources, windows paths, and missing files", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-tree-rdf-"));
    const existing = path.join(tmpDir, "src", "exists.ts");
    writeFile(existing, "export const x = 1;\n");
    const provider = new KibiTreeDataProvider(tmpDir);
    const internals = provider as unknown as ProviderInternals;
    internals.symbolIndex = {
      byId: new Map([
        [
          "SYM-OK",
          { id: "SYM-OK", title: "ok", sourceFile: existing, sourceLine: 2 },
        ],
        [
          "SYM-MISS",
          {
            id: "SYM-MISS",
            title: "miss",
            sourceFile: path.join(tmpDir, "src", "missing.ts"),
            sourceLine: 3,
          },
        ],
      ]),
    };

    const originalExists = fs.existsSync.bind(fs);
    const existsSpy = spyOn(fs, "existsSync").mockImplementation((filePath) => {
      const value = String(filePath);
      if (value.startsWith("C:")) return true;
      return originalExists(filePath);
    });
    try {
      const entities = internals.parseRdf(`
        <rdf:Description rdf:about="kb:entity/SYM-OK">
          <kb:type>symbol</kb:type>
          <kb:title>ok</kb:title>
        </rdf:Description>
        <rdf:Description rdf:about="kb:entity/SYM-MISS">
          <kb:type>symbol</kb:type>
          <kb:title>miss</kb:title>
        </rdf:Description>
        <rdf:Description rdf:about="kb:entity/REQ-WIN">
          <kb:type>req</kb:type>
          <kb:title>Windows</kb:title>
          <kb:source>C:\\docs\\REQ-WIN.md</kb:source>
        </rdf:Description>
        <rdf:Description rdf:about="kb:entity/REQ-ABS-MISS">
          <kb:type>req</kb:type>
          <kb:title>Missing abs</kb:title>
          <kb:source>/definitely/missing/REQ.md</kb:source>
        </rdf:Description>
      `);
      const byId = new Map(entities.map((entity) => [entity.id, entity]));
      expect(byId.get("SYM-OK")?.localPath).toBe(existing);
      expect(byId.get("SYM-MISS")?.localPath).toBeUndefined();
      expect(byId.get("REQ-WIN")?.localPath).toBe("C:\\docs\\REQ-WIN.md");
      expect(byId.get("REQ-ABS-MISS")?.localPath).toBeUndefined();
    } finally {
      existsSpy.mockRestore();
    }
  });

  test("merge helpers, prefixes, fallbacks, and location formatting cover remaining lanes", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-tree-merge-"));
    writeFile(path.join(tmpDir, ".kb", "symbols.yaml"), "symbols: []\n");
    const provider = new KibiTreeDataProvider(tmpDir);
    const internals = provider as unknown as ProviderInternals;

    expect(
      internals.mergeEntities(
        [
          {
            id: "REQ-1",
            type: "",
            title: "",
            status: "",
            tags: "",
            source: "",
            localPath: undefined,
            sourceLine: undefined,
          },
        ],
        [
          {
            id: "REQ-1",
            type: "req",
            title: "Title",
            status: "open",
            tags: "a",
            source: "src",
            localPath: "/tmp/a.md",
            sourceLine: 4,
          },
        ],
      ),
    ).toEqual([
      {
        id: "REQ-1",
        type: "req",
        title: "Title",
        status: "open",
        tags: "a",
        source: "src",
        localPath: "/tmp/a.md",
        sourceLine: 4,
      },
    ]);
    expect(
      internals.mergeRelationships(
        [{ relType: "relates_to", fromId: "A", toId: "B" }],
        [{ relType: "relates_to", fromId: "A", toId: "B" }],
        [{ relType: "custom", fromId: "A", toId: "C" }],
      ),
    ).toHaveLength(2);

    expect(internals.inferEntityTypeFromId("REQ-1")).toBe("req");
    expect(internals.inferEntityTypeFromId("SCEN-1")).toBe("scenario");
    expect(internals.inferEntityTypeFromId("TEST-1")).toBe("test");
    expect(internals.inferEntityTypeFromId("ADR-1")).toBe("adr");
    expect(internals.inferEntityTypeFromId("FLAG-1")).toBe("flag");
    expect(internals.inferEntityTypeFromId("EVT-1")).toBe("event");
    expect(internals.inferEntityTypeFromId("FACT-1")).toBe("fact");
    expect(internals.getDocumentationPathForEntity("SYM-1", "symbol")).toBeUndefined();
    expect(internals.getDocumentationPathForEntity("NOPE")).toBeUndefined();

    expect(
      internals.getFallbackSymbolEntity({
        id: "SYM-NONE",
        title: "none",
      }).source,
    ).toBe(".kb/symbols.yaml");
    expect(internals.formatLocationDescription(path.join(tmpDir, "a.ts"))).toBe(
      "a.ts",
    );
    expect(
      internals.formatLocationDescription(path.join(tmpDir, "a.ts"), 9),
    ).toBe("a.ts:9");

    internals.relationships = [
      { relType: "custom_rel", fromId: "REQ-1", toId: "MISSING" },
    ];
    const relItem = internals.entityToTreeItem(
      {
        id: "REQ-1",
        type: "req",
        title: "Req",
        status: "open",
        tags: "",
        source: ".kb/requirements/REQ-1.md",
      },
      new Map(),
    );
    expect(relItem.tooltip).toContain("REQ-1");
  });
});
