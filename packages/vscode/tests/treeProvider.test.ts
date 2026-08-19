import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };

class ThemeIcon {
  constructor(public id: string) {}
}

class TreeItem {
  description?: string;
  iconPath?: ThemeIcon;
  contextValue?: string;
  tooltip?: string;
  command?: {
    command: string;
    title: string;
    arguments: unknown[];
  };
  resourceUri?: { fsPath: string };

  constructor(
    public label: string,
    public collapsibleState: number,
  ) {}
}

class EventEmitter<T> {
  fireCount = 0;
  lastValue: T | undefined;
  event = () => ({ dispose() {} });

  fire(value: T) {
    this.fireCount++;
    this.lastValue = value;
  }
}

const window = { showInformationMessage: mock(() => {}) };
const Uri = {
  file: (filePath: string) => ({
    fsPath: filePath,
    path: filePath,
    scheme: "file",
  }),
};

function configureVscodeMock() {
  resetVscodeMock({
    TreeItemCollapsibleState,
    ThemeIcon,
    TreeItem,
    EventEmitter,
    window,
    Uri,
  });
}

configureVscodeMock();

mock.module("vscode", () => getVscodeMockModule());

const { KibiTreeDataProvider } = await import("../src/treeProvider");

let tmpDir: string;

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeFile(filePath: string, content = "") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeSymbolsManifest(
  workspaceRoot: string,
  symbols: Array<{
    id: string;
    title: string;
    sourceFile?: string;
    sourceLine?: number;
    links?: string[];
  }>,
) {
  const lines = ["symbols:"];
  for (const symbol of symbols) {
    lines.push(`  - id: ${symbol.id}`);
    lines.push(`    title: ${symbol.title}`);
    if (symbol.sourceFile) lines.push(`    sourceFile: ${symbol.sourceFile}`);
    if (typeof symbol.sourceLine === "number") {
      lines.push(`    sourceLine: ${symbol.sourceLine}`);
    }
    lines.push("    links:");
    for (const link of symbol.links ?? []) {
      lines.push(`      - ${link}`);
    }
  }

  writeFile(
    path.join(workspaceRoot, ".kb", "symbols.yaml"),
    `${lines.join("\n")}\n`,
  );
}

function makeProvider(
  workspaceRoot = tmpDir,
  output?: { appendLine: (value: string) => void },
) {
  return new KibiTreeDataProvider(workspaceRoot, output as never);
}

type RefreshInternals = {
  loaded: boolean;
  entities: Array<{ id: string }>;
  relationships: Array<{ fromId: string }>;
  symbolIndex: object | null;
  documentationEntityDirs: object | null;
  _onDidChangeTreeData: EventEmitter<undefined>;
};

type ParseRdfInternals = {
  parseRdf: (content: string) => Array<{ id: string; localPath?: string }>;
  parseRdfRelationships: (content: string) => Array<{
    relType: string;
    fromId: string;
    toId: string;
  }>;
};

type DocumentationDirsInternals = {
  documentationEntityDirs: Record<string, string> | null;
  getDocumentationEntityDirs: () => Record<string, string>;
  resolveConfiguredPath: (configuredPath: string) => string;
};

type TypeInferenceInternals = {
  inferEntityTypeFromId: (id: string) => string | undefined;
  getDocumentationPathForEntity: (
    id: string,
    type?: string,
  ) => string | undefined;
};

type NavigationInternals = {
  entities: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    tags: string;
    source: string;
    localPath?: string;
    sourceLine?: number;
  }>;
  symbolIndex: {
    byId: Map<string, { sourceFile?: string; sourceLine?: number }>;
  } | null;
  relationships: Array<{ relType: string; fromId: string; toId: string }>;
  buildRelationshipChildren: (
    entityId: string,
    entityIndex: Map<
      string,
      {
        id: string;
        type: string;
        title: string;
        status: string;
        tags: string;
        source: string;
        localPath?: string;
        sourceLine?: number;
      }
    >,
  ) => Array<{
    label: string;
    iconPath: string;
    contextValue: string;
    collapsibleState: number;
    tooltip?: string;
    localPath?: string;
    sourceLine?: number;
    targetId?: string;
  }>;
};

type FallbackSymbolInternals = {
  getFallbackSymbolEntity: (symbol: {
    id: string;
    title: string;
    sourceFile?: string;
    sourceLine?: number;
  }) => {
    source: string;
    localPath?: string;
    sourceLine?: number;
  };
};

type FrontmatterInternals = {
  parseFrontmatter: (content: string) => Record<string, unknown>;
  normalizeTags: (tags: unknown) => string;
  parseFrontmatterLinks: (
    fromId: string,
    links: unknown,
  ) => Array<{ relType: string; fromId: string; toId: string }>;
};

beforeEach(() => {
  configureVscodeMock();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-tree-provider-"));
  window.showInformationMessage.mockReset();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("refresh clears cached data and fires tree update", () => {
  const provider = makeProvider();
  const internals = provider as unknown as RefreshInternals;

  internals.loaded = true;
  internals.entities = [{ id: "REQ-001" }];
  internals.relationships = [{ fromId: "REQ-001" }];
  internals.symbolIndex = { byId: new Map() };
  internals.documentationEntityDirs = { req: "/tmp/docs" };

  provider.refresh();

  expect(internals.loaded).toBe(false);
  expect(internals.entities).toEqual([]);
  expect(internals.relationships).toEqual([]);
  expect(internals.symbolIndex).toBeNull();
  expect(internals.documentationEntityDirs).toBeNull();
  expect(internals._onDidChangeTreeData.fireCount).toBe(1);
});

test("getTreeItem maps file-backed and relationship-backed nodes to commands", () => {
  const provider = makeProvider();

  const fileTreeItem = provider.getTreeItem({
    label: "REQ-001: Test",
    description: ".kb/requirements/REQ-001.md",
    iconPath: "list-ordered",
    contextValue: "kibi-entity-req",
    collapsibleState: TreeItemCollapsibleState.Collapsed,
    tooltip: "tooltip",
    localPath: "/tmp/REQ-001.md",
    sourceLine: 4,
  });

  expect(fileTreeItem.description).toBe(".kb/requirements/REQ-001.md");
  expect((fileTreeItem.iconPath as ThemeIcon).id).toBe("list-ordered");
  expect(fileTreeItem.contextValue).toBe("kibi-entity-req");
  expect(fileTreeItem.tooltip).toBe("tooltip");
  expect(fileTreeItem.command).toEqual({
    command: "kibi.openEntity",
    title: "Open Entity File",
    arguments: ["/tmp/REQ-001.md", 4],
  });
  expect(fileTreeItem.resourceUri).toMatchObject({ fsPath: "/tmp/REQ-001.md" });

  const relationshipTreeItem = provider.getTreeItem({
    label: "→ relates to: REQ-002",
    collapsibleState: TreeItemCollapsibleState.None,
    targetId: "REQ-002",
  });

  expect(relationshipTreeItem.command).toEqual({
    command: "kibi.openEntityById",
    title: "Open Related Entity",
    arguments: ["REQ-002"],
  });
});

test("getChildren returns nested children directly and handles missing workspace", async () => {
  const provider = makeProvider("");
  expect(await provider.getChildren()).toEqual([]);
  expect(window.showInformationMessage).toHaveBeenCalledWith(
    "No workspace folder open",
  );

  const child = {
    label: "child",
    collapsibleState: TreeItemCollapsibleState.None,
  };
  expect(
    await makeProvider().getChildren({
      label: "parent",
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      children: [child],
    }),
  ).toEqual([child]);
});

test("parseRdf resolves absolute, file URI, relative, windows, and invalid local sources", () => {
  const provider = makeProvider();
  const internals = provider as unknown as ParseRdfInternals;
  const absoluteFile = path.join(tmpDir, "absolute.md");
  const relativeFile = path.join(tmpDir, ".kb", "requirements", "REQ-REL.md");
  writeFile(absoluteFile, "absolute");
  writeFile(relativeFile, "relative");

  const rdf = `
    <rdf:Description rdf:about="urn:kibi:entity/REQ-ABS">
      <kb:type>req</kb:type>
      <kb:title>Absolute</kb:title>
      <kb:status rdf:resource="http://kibi.dev/kb/status/open"/>
      <kb:tags></kb:tags>
      <kb:source>${absoluteFile}</kb:source>
    </rdf:Description>
    <rdf:Description rdf:about="urn:kibi:entity/REQ-FILE">
      <kb:type>req</kb:type>
      <kb:title>File Uri</kb:title>
      <kb:status rdf:resource="http://kibi.dev/kb/status/open"/>
      <kb:tags></kb:tags>
      <kb:source>${new URL(`file://${absoluteFile}`).toString()}</kb:source>
    </rdf:Description>
    <rdf:Description rdf:about="urn:kibi:entity/REQ-BAD-URI">
      <kb:type>req</kb:type>
      <kb:title>Bad Uri</kb:title>
      <kb:status rdf:resource="http://kibi.dev/kb/status/open"/>
      <kb:tags></kb:tags>
      <kb:source>file://%</kb:source>
    </rdf:Description>
    <rdf:Description rdf:about="urn:kibi:entity/REQ-REL">
      <kb:type>req</kb:type>
      <kb:title>Relative</kb:title>
      <kb:status rdf:resource="http://kibi.dev/kb/status/open"/>
      <kb:tags></kb:tags>
      <kb:source>.kb/requirements/REQ-REL.md</kb:source>
    </rdf:Description>
    <rdf:Description rdf:about="urn:kibi:entity/REQ-WIN">
      <kb:type>req</kb:type>
      <kb:title>Windows</kb:title>
      <kb:status rdf:resource="http://kibi.dev/kb/status/open"/>
      <kb:tags></kb:tags>
      <kb:source>C:\\missing\\REQ-WIN.md</kb:source>
    </rdf:Description>
    <rdf:Description rdf:about="urn:kibi:entity/REQ-URL">
      <kb:type>req</kb:type>
      <kb:title>Remote</kb:title>
      <kb:status rdf:resource="http://kibi.dev/kb/status/open"/>
      <kb:tags></kb:tags>
      <kb:source>https://example.com/REQ-URL</kb:source>
    </rdf:Description>
  `;

  const entities = internals.parseRdf(rdf);
  const byId = new Map<string, { id: string; localPath?: string }>(
    entities.map((entity: { id: string; localPath?: string }) => [
      entity.id,
      entity,
    ]),
  );

  expect(byId.get("REQ-ABS")?.localPath).toBe(absoluteFile);
  expect(byId.get("REQ-FILE")?.localPath).toBe(absoluteFile);
  expect(byId.get("REQ-BAD-URI")?.localPath).toBeUndefined();
  expect(byId.get("REQ-REL")?.localPath).toBe(relativeFile);
  expect(byId.get("REQ-WIN")?.localPath).toBeUndefined();
  expect(byId.get("REQ-URL")?.localPath).toBeUndefined();
});

test("parseRdfRelationships extracts outgoing relationships from RDF blocks", () => {
  const provider = makeProvider();
  const internals = provider as unknown as ParseRdfInternals;

  const rdf = `
    <rdf:Description rdf:about="urn:kibi:entity/REQ-001">
      <kb:depends_on rdf:resource="http://kibi.dev/kb/entity/REQ-002"/>
      <kb:specified_by rdf:resource="kb:entity/SCEN-001"/>
      <kb:verified_by rdf:resource="http://kibi.dev/kb/entity/TEST-001"/>
      <kb:validates rdf:resource="kb:entity/SCEN-002"/>
      <kb:implements rdf:resource="kb:entity/REQ-010"/>
      <kb:covered_by rdf:resource="http://kibi.dev/kb/entity/TEST-002"/>
      <kb:executable_for rdf:resource="kb:entity/TEST-003"/>
      <kb:constrained_by rdf:resource="kb:entity/ADR-001"/>
      <kb:guards rdf:resource="http://kibi.dev/kb/entity/FLAG-001"/>
      <kb:publishes rdf:resource="kb:entity/EVT-001"/>
      <kb:consumes rdf:resource="http://kibi.dev/kb/entity/EVT-002"/>
      <kb:relates_to rdf:resource="kb:entity/FACT-001"/>
    </rdf:Description>
  `;

  expect(internals.parseRdfRelationships(rdf)).toEqual([
    { relType: "depends_on", fromId: "REQ-001", toId: "REQ-002" },
    { relType: "specified_by", fromId: "REQ-001", toId: "SCEN-001" },
    { relType: "verified_by", fromId: "REQ-001", toId: "TEST-001" },
    { relType: "validates", fromId: "REQ-001", toId: "SCEN-002" },
    { relType: "implements", fromId: "REQ-001", toId: "REQ-010" },
    { relType: "covered_by", fromId: "REQ-001", toId: "TEST-002" },
    { relType: "executable_for", fromId: "REQ-001", toId: "TEST-003" },
    { relType: "constrained_by", fromId: "REQ-001", toId: "ADR-001" },
    { relType: "guards", fromId: "REQ-001", toId: "FLAG-001" },
    { relType: "publishes", fromId: "REQ-001", toId: "EVT-001" },
    { relType: "consumes", fromId: "REQ-001", toId: "EVT-002" },
    { relType: "relates_to", fromId: "REQ-001", toId: "FACT-001" },
  ]);
});

test("relationship children use executable_for label", () => {
  const provider = makeProvider();
  const internals = provider as unknown as NavigationInternals;

  internals.entities = [
    {
      id: "SYM-TEST-001",
      type: "symbol",
      title: "test handler",
      status: "active",
      tags: "",
      source: "src/test-handler.ts",
    },
    {
      id: "TEST-001",
      type: "test",
      title: "identity spec",
      status: "passing",
      tags: "",
      source: ".kb/tests/TEST-001.md",
    },
  ];
  internals.relationships = [
    {
      relType: "executable_for",
      fromId: "SYM-TEST-001",
      toId: "TEST-001",
    },
  ];
  internals.symbolIndex = null;

  const entityIndex = new Map(
    internals.entities.map((entity) => [entity.id, entity]),
  );

  expect(
    internals.buildRelationshipChildren("SYM-TEST-001", entityIndex),
  ).toEqual([
    {
      label: "→ executable for: TEST-001: identity spec",
      iconPath: "arrow-right",
      contextValue: "kibi-relationship",
      collapsibleState: TreeItemCollapsibleState.None,
      tooltip: "SYM-TEST-001 -[executable_for]-> TEST-001",
      localPath: undefined,
      sourceLine: undefined,
      targetId: "TEST-001",
    },
  ]);
});

test("relationship children render scenario verified_by and test validates labels", () => {
  const provider = makeProvider();
  const internals = provider as unknown as NavigationInternals;

  internals.entities = [
    {
      id: "SCEN-SCENARIO-001",
      type: "scenario",
      title: "login flow",
      status: "active",
      tags: "",
      source: ".kb/scenarios/SCEN-SCENARIO-001.md",
    },
    {
      id: "TEST-VALIDATES-001",
      type: "test",
      title: "login spec",
      status: "passing",
      tags: "",
      source: ".kb/tests/TEST-VALIDATES-001.md",
    },
    {
      id: "TEST-VERIFIED-001",
      type: "test",
      title: "login verified spec",
      status: "passing",
      tags: "",
      source: ".kb/tests/TEST-VERIFIED-001.md",
    },
  ];
  internals.relationships = [
    {
      relType: "verified_by",
      fromId: "SCEN-SCENARIO-001",
      toId: "TEST-VERIFIED-001",
    },
    {
      relType: "validates",
      fromId: "TEST-VALIDATES-001",
      toId: "SCEN-SCENARIO-001",
    },
  ];
  internals.symbolIndex = null;

  const entityIndex = new Map(
    internals.entities.map((entity) => [entity.id, entity]),
  );

  const scenarioChildren = internals.buildRelationshipChildren(
    "SCEN-SCENARIO-001",
    entityIndex,
  );

  // Outgoing: scenario --verified_by--> test
  expect(scenarioChildren).toContainEqual({
    label: "→ verified by: TEST-VERIFIED-001: login verified spec",
    iconPath: "arrow-right",
    contextValue: "kibi-relationship",
    collapsibleState: TreeItemCollapsibleState.None,
    tooltip: "SCEN-SCENARIO-001 -[verified_by]-> TEST-VERIFIED-001",
    localPath: undefined,
    sourceLine: undefined,
    targetId: "TEST-VERIFIED-001",
  });

  // Incoming: test --validates--> scenario
  expect(scenarioChildren).toContainEqual({
    label: "← validates: TEST-VALIDATES-001: login spec",
    iconPath: "arrow-right",
    contextValue: "kibi-relationship",
    collapsibleState: TreeItemCollapsibleState.None,
    tooltip: "TEST-VALIDATES-001 -[validates]-> SCEN-SCENARIO-001",
    localPath: undefined,
    sourceLine: undefined,
    targetId: "TEST-VALIDATES-001",
  });
});

test("frontmatter helpers normalize tags and links from YAML content", () => {
  const provider = makeProvider();
  const internals = provider as unknown as FrontmatterInternals;

  expect(
    internals.parseFrontmatter(
      "---\nid: REQ-123\ntags:\n  - alpha\n  - 2\n---\nbody",
    ),
  ).toEqual({
    id: "REQ-123",
    tags: ["alpha", 2],
  });
  expect(internals.parseFrontmatter("not-frontmatter")).toEqual({});
  expect(internals.normalizeTags(["alpha", 2])).toBe("[alpha, 2]");
  expect(internals.normalizeTags("alpha")).toBe("alpha");
  expect(internals.normalizeTags({})).toBe("");
  expect(
    internals.parseFrontmatterLinks("REQ-123", [
      "REQ-124",
      { type: "verified_by", target: "TEST-123" },
      { to: "SCEN-123" },
      null,
      { type: "depends_on" },
    ]),
  ).toEqual([
    { relType: "relates_to", fromId: "REQ-123", toId: "REQ-124" },
    { relType: "verified_by", fromId: "REQ-123", toId: "TEST-123" },
    { relType: "relates_to", fromId: "REQ-123", toId: "SCEN-123" },
  ]);
});

test("documentation directory resolution uses canonical .kb/ lanes and ignores leftover config", () => {
  const provider = makeProvider();
  const internals = provider as unknown as DocumentationDirsInternals;

  writeFile(path.join(tmpDir, ".kb", "requirements", ".gitkeep"));
  writeFile(path.join(tmpDir, "documentation", "tests", ".gitkeep"));
  writeJson(path.join(tmpDir, ".kb", "config.json"), {
    paths: { requirements: "docs/requirements" },
  });
  writeFile(path.join(tmpDir, "docs", "requirements", ".gitkeep"));

  expect(internals.resolveConfiguredPath("docs/requirements")).toBe(
    path.join(tmpDir, "docs", "requirements"),
  );
  expect(internals.resolveConfiguredPath("/tmp/absolute-docs")).toBe(
    "/tmp/absolute-docs",
  );

  const first = internals.getDocumentationEntityDirs();
  const second = internals.getDocumentationEntityDirs();
  expect(first).toBe(second);
  expect(first.req).toBe(path.join(tmpDir, ".kb", "requirements"));
  expect(first.test).toBeUndefined();

  internals.documentationEntityDirs = null;
  fs.rmSync(path.join(tmpDir, ".kb", "requirements"), {
    recursive: true,
    force: true,
  });
  writeFile(path.join(tmpDir, "documentation", "requirements", ".gitkeep"));

  const fallback = internals.getDocumentationEntityDirs();
  expect(fallback.req).toBeUndefined();
});

test("type inference and documentation path lookup cover prefixes and symbol exclusion", () => {
  const provider = makeProvider();
  const internals = provider as unknown as TypeInferenceInternals;
  const requirementPath = path.join(
    tmpDir,
    ".kb",
    "requirements",
    "REQ-777.md",
  );
  writeFile(requirementPath, "---\nid: REQ-777\n---\n");

  expect(internals.inferEntityTypeFromId("EVENT-001")).toBe("event");
  expect(internals.inferEntityTypeFromId("SYM-001")).toBe("symbol");
  expect(internals.inferEntityTypeFromId("UNKNOWN-001")).toBeUndefined();

  expect(internals.getDocumentationPathForEntity("REQ-777")).toBe(
    requirementPath,
  );
  expect(
    internals.getDocumentationPathForEntity("REQ-777", "symbol"),
  ).toBeUndefined();
  expect(
    internals.getDocumentationPathForEntity("REQ-404", "req"),
  ).toBeUndefined();
});

test("navigation helpers prefer entity paths, then symbol sources, then documentation files", () => {
  const output = { appendLine: mock(() => {}) };
  const provider = makeProvider(tmpDir, output);
  const internals = provider as unknown as NavigationInternals;

  const existingSymbolSource = path.join(tmpDir, "src", "symbol.ts");
  const docPath = path.join(tmpDir, ".kb", "requirements", "REQ-DOC.md");
  writeFile(existingSymbolSource, "export const symbol = 1;\n");
  writeFile(docPath, "---\nid: REQ-DOC\n---\n");

  internals.entities = [
    {
      id: "REQ-MISSING",
      type: "req",
      title: "Missing File",
      status: "open",
      tags: "",
      source: ".kb/requirements/REQ-MISSING.md",
      localPath: path.join(tmpDir, ".kb", "requirements", "REQ-MISSING.md"),
    },
    {
      id: "REQ-LOCAL",
      type: "req",
      title: "Local File",
      status: "open",
      tags: "",
      source: ".kb/requirements/REQ-LOCAL.md",
      localPath: docPath,
      sourceLine: 9,
    },
  ];
  internals.symbolIndex = {
    byId: new Map([
      ["SYM-123", { sourceFile: existingSymbolSource, sourceLine: 7 }],
      [
        "SYM-MISSING",
        { sourceFile: path.join(tmpDir, "src", "missing.ts"), sourceLine: 2 },
      ],
    ]),
  };

  expect(provider.getNavigationTargetForEntity("REQ-MISSING")).toBeUndefined();
  expect(output.appendLine).toHaveBeenCalledWith(
    expect.stringContaining("REQ-MISSING has localPath"),
  );

  expect(provider.getNavigationTargetForEntity("REQ-LOCAL")).toEqual({
    localPath: docPath,
    line: 9,
  });
  expect(provider.getNavigationTargetForEntity("SYM-123")).toEqual({
    localPath: existingSymbolSource,
    line: 7,
  });
  expect(provider.getNavigationTargetForEntity("REQ-DOC")).toEqual({
    localPath: docPath,
  });
  expect(provider.getNavigationTargetForEntity("SYM-MISSING")).toBeUndefined();
  expect(provider.getNavigationTargetForEntity("UNKNOWN")).toBeUndefined();
  expect(provider.getLocalPathForEntity("REQ-DOC")).toBe(docPath);
  expect(provider.getLocalPathForEntity("UNKNOWN")).toBeUndefined();
});

test("entity helpers and symbol fallbacks expose counts, lookup, and manifest-relative sources", async () => {
  writeJson(path.join(tmpDir, ".kb", "config.json"), {});
  writeFile(
    path.join(tmpDir, ".kb", "requirements", "REQ-001.md"),
    "---\nid: REQ-001\n---\n",
  );
  writeFile(path.join(tmpDir, "src", "one.ts"), "export const one = 1;\n");
  writeSymbolsManifest(tmpDir, [
    {
      id: "SYM-001",
      title: "one",
      sourceFile: "src/one.ts",
      sourceLine: 5,
      links: ["REQ-001"],
    },
    {
      id: "SYM-002",
      title: "two",
      sourceFile: "src/missing.ts",
      sourceLine: 8,
    },
  ]);

  const provider = makeProvider();
  const internals = provider as unknown as FallbackSymbolInternals;

  await provider.getChildren();

  expect(provider.getEntityCount("symbol")).toBe(2);
  expect(provider.getEntityCount("req")).toBe(1);
  expect(provider.getEntityById("REQ-001")?.title).toBe("REQ-001");
  expect(provider.getEntityById("UNKNOWN")).toBeUndefined();

  expect(
    internals.getFallbackSymbolEntity({
      id: "SYM-EXISTING",
      title: "existing",
      sourceFile: path.join(tmpDir, "src", "one.ts"),
      sourceLine: 11,
    }),
  ).toMatchObject({
    source: "src/one.ts",
    localPath: path.join(tmpDir, "src", "one.ts"),
    sourceLine: 11,
  });

  expect(
    internals.getFallbackSymbolEntity({
      id: "SYM-MANIFEST",
      title: "manifest-only",
      sourceFile: path.join(tmpDir, "src", "missing.ts"),
      sourceLine: 3,
    }),
  ).toMatchObject({
    source: "src/missing.ts",
    localPath: undefined,
    sourceLine: 3,
  });
});

afterAll(() => {
  mock.restore();
});
