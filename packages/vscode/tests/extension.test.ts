/**
 * Tests for KibiTreeDataProvider from src/treeProvider.ts.
 *
 * Exercises the real implementation (not an in-test mock) by:
 *  1. Mocking the `vscode` module (unavailable outside VS Code runtime)
 *  2. Writing a real kb.rdf fixture to a temp directory
 *  3. Calling the public getChildren() API and asserting correct tree structure
 *
 * This ensures that changes to RDF parsing or root-item grouping are caught.
 */

import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

mock.module("vscode", () => getVscodeMockModule());

// ---------------------------------------------------------------------------
// Fixture RDF — two entities: one req, one scenario
// ---------------------------------------------------------------------------
const FIXTURE_RDF = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:kb="http://kibi.dev/kb/">
  <rdf:Description rdf:about="urn:kibi:entity/REQ-001">
    <kb:id>REQ-001</kb:id>
    <kb:type>req</kb:type>
    <kb:title>Test Requirement</kb:title>
    <kb:status rdf:resource="http://kibi.dev/kb/status/open"/>
    <kb:tags></kb:tags>
    <kb:source>documentation/requirements/REQ-001.md</kb:source>
  </rdf:Description>
  <rdf:Description rdf:about="urn:kibi:entity/SCEN-001">
    <kb:id>SCEN-001</kb:id>
    <kb:type>scenario</kb:type>
    <kb:title>Test Scenario</kb:title>
    <kb:status rdf:resource="http://kibi.dev/kb/status/draft"/>
    <kb:tags></kb:tags>
    <kb:source>documentation/scenarios/SCEN-001.md</kb:source>
  </rdf:Description>
  <rdf:Description rdf:about="urn:kibi:entity/SYM-001">
    <kb:id>SYM-001</kb:id>
    <kb:type>symbol</kb:type>
    <kb:title>testSymbol</kb:title>
    <kb:status rdf:resource="http://kibi.dev/kb/status/active"/>
    <kb:tags></kb:tags>
    <kb:source>documentation/symbols.yaml</kb:source>
    <kb:implements rdf:resource="http://kibi.dev/kb/entity/REQ-001"/>
  </rdf:Description>
</rdf:RDF>`;

let tmpDir: string;

beforeEach(() => {
  resetVscodeMock();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-vscode-test-"));
  // Create the branch KB directory structure
  const branchDir = path.join(tmpDir, ".kb", "branches", "develop");
  fs.mkdirSync(branchDir, { recursive: true });
  fs.writeFileSync(path.join(branchDir, "kb.rdf"), FIXTURE_RDF);
  fs.writeFileSync(
    path.join(tmpDir, ".kb", "config.json"),
    JSON.stringify(
      { paths: { symbols: "documentation/symbols.yaml" } },
      null,
      2,
    ),
  );
  fs.mkdirSync(path.join(tmpDir, "documentation"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, "documentation", "symbols.yaml"),
    [
      "symbols:",
      "  - id: SYM-001",
      "    title: testSymbol",
      "    sourceFile: src/test.ts",
      "    sourceLine: 3",
      "    links:",
      "      - REQ-001",
      "",
    ].join("\n"),
  );
  fs.mkdirSync(path.join(tmpDir, "documentation", "requirements"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(tmpDir, "documentation", "scenarios"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
    "---\nid: REQ-001\ntitle: Test Requirement\nstatus: open\nsource: documentation/requirements/REQ-001.md\n---\n",
  );
  fs.writeFileSync(
    path.join(tmpDir, "documentation", "scenarios", "SCEN-001.md"),
    "---\nid: SCEN-001\ntitle: Test Scenario\nstatus: draft\nsource: documentation/scenarios/SCEN-001.md\n---\n",
  );
  fs.writeFileSync(
    path.join(tmpDir, "src", "test.ts"),
    "// line 1\n// line 2\nexport function testSymbol() {}\n",
  );
});

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

afterAll(() => {
  resetVscodeMock();
  mock.restore();
});

test("KibiTreeDataProvider.getChildren returns 7 entity-type root items", async () => {
  const { KibiTreeDataProvider } = await import("../src/treeProvider");
  const provider = new KibiTreeDataProvider(tmpDir);
  const roots = await provider.getChildren();

  // Must have exactly one group per entity type defined in ENTITY_TYPE_META
  expect(roots).toHaveLength(7);

  const labels = roots.map((r) => r.label);
  expect(labels.some((l) => l.startsWith("Requirements"))).toBe(true);
  expect(labels.some((l) => l.startsWith("Scenarios"))).toBe(true);
  expect(labels.some((l) => l.startsWith("Tests"))).toBe(true);
  expect(labels.some((l) => l.startsWith("ADRs"))).toBe(true);
  expect(labels.some((l) => l.startsWith("Flags"))).toBe(true);
  expect(labels.some((l) => l.startsWith("Events"))).toBe(true);
  expect(labels.some((l) => l.startsWith("Symbols"))).toBe(true);
});

test("KibiTreeDataProvider correctly counts parsed entities per type", async () => {
  const { KibiTreeDataProvider } = await import("../src/treeProvider");
  const provider = new KibiTreeDataProvider(tmpDir);
  const roots = await provider.getChildren();

  const reqGroup = roots.find((r) => r.label.startsWith("Requirements"));
  const scenGroup = roots.find((r) => r.label.startsWith("Scenarios"));
  const testGroup = roots.find((r) => r.label.startsWith("Tests"));

  // Fixture has 1 req and 1 scenario, 0 tests
  expect(reqGroup?.label).toBe("Requirements (1)");
  expect(scenGroup?.label).toBe("Scenarios (1)");
  expect(testGroup?.label).toBe("Tests (0)");
});

test("KibiTreeDataProvider entity children have correct id and title", async () => {
  const { KibiTreeDataProvider } = await import("../src/treeProvider");
  const provider = new KibiTreeDataProvider(tmpDir);
  const roots = await provider.getChildren();

  const reqGroup = roots.find((r) => r.label.startsWith("Requirements"));
  expect(reqGroup?.children).toBeDefined();

  const reqItem = reqGroup?.children?.[0];
  expect(reqItem?.label).toBe("REQ-001: Test Requirement");
  expect(reqItem?.contextValue).toBe("kibi-entity-req");
  expect(reqItem?.localPath).toBe(
    path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
  );
});

test("documentation entities open their markdown file when present locally", async () => {
  const { KibiTreeDataProvider } = await import("../src/treeProvider");
  const provider = new KibiTreeDataProvider(tmpDir);
  const roots = await provider.getChildren();

  const reqGroup = roots.find((r) => r.label.startsWith("Requirements"));
  const reqItem = reqGroup?.children?.[0];

  expect(reqItem).toBeDefined();
  if (!reqItem) throw new Error("reqItem is undefined");

  const treeItem = provider.getTreeItem(reqItem);
  expect(treeItem.command).toBeDefined();
  expect(treeItem.command?.command).toBe("kibi.openEntity");
  expect(treeItem.command?.arguments).toEqual([
    path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
    undefined,
  ]);
});

test("symbol tree items open code and stay expandable for linked entities", async () => {
  const { KibiTreeDataProvider } = await import("../src/treeProvider");
  const provider = new KibiTreeDataProvider(tmpDir);
  const roots = await provider.getChildren();

  const symbolGroup = roots.find((r) => r.label.startsWith("Symbols"));
  const symbolItem = symbolGroup?.children?.[0];

  expect(symbolItem?.label).toBe("SYM-001: testSymbol");
  expect(symbolItem?.contextValue).toBe("kibi-symbol");
  expect(symbolItem?.description).toBe("src/test.ts:3");
  expect(symbolItem?.localPath).toBe(path.join(tmpDir, "src", "test.ts"));
  expect(symbolItem?.sourceLine).toBe(3);
  expect(symbolItem?.children?.[0]?.label).toContain("REQ-001");

  expect(symbolItem).toBeDefined();
  if (!symbolItem) throw new Error("symbolItem is undefined");

  const treeItem = provider.getTreeItem(symbolItem);
  expect(treeItem.command).toBeDefined();
  expect(treeItem.command?.command).toBe("kibi.openEntity");
  expect(treeItem.command?.arguments).toEqual([
    path.join(tmpDir, "src", "test.ts"),
    3,
  ]);
});

test("KibiTreeDataProvider returns empty groups when no kb.rdf exists", async () => {
  // Remove the kb.rdf file
  fs.rmSync(path.join(tmpDir, ".kb"), { recursive: true, force: true });

  const { KibiTreeDataProvider } = await import("../src/treeProvider");
  const provider = new KibiTreeDataProvider(tmpDir);
  const roots = await provider.getChildren();

  // Fallback still surfaces documentation + symbol manifest entities
  expect(roots).toHaveLength(7);
  expect(
    roots.find((root) => root.label.startsWith("Requirements"))?.label,
  ).toBe("Requirements (1)");
  expect(roots.find((root) => root.label.startsWith("Scenarios"))?.label).toBe(
    "Scenarios (1)",
  );
  expect(roots.find((root) => root.label.startsWith("Symbols"))?.label).toBe(
    "Symbols (1)",
  );
  expect(roots.find((root) => root.label.startsWith("Tests"))?.label).toBe(
    "Tests (0)",
  );
});

test("KibiTreeDataProvider falls back to documentation entities when kb.rdf is symbol-only", async () => {
  const symbolOnlyRdf = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:kb="http://kibi.dev/kb/">
  <rdf:Description rdf:about="urn:kibi:entity/SYM-001">
    <kb:id>SYM-001</kb:id>
    <kb:type>symbol</kb:type>
    <kb:title>testSymbol</kb:title>
    <kb:status rdf:resource="http://kibi.dev/kb/status/active"/>
    <kb:tags></kb:tags>
    <kb:source>documentation/symbols.yaml</kb:source>
  </rdf:Description>
</rdf:RDF>`;

  fs.writeFileSync(
    path.join(tmpDir, ".kb", "branches", "develop", "kb.rdf"),
    symbolOnlyRdf,
  );

  const { KibiTreeDataProvider } = await import("../src/treeProvider");
  const provider = new KibiTreeDataProvider(tmpDir);
  const roots = await provider.getChildren();

  const reqGroup = roots.find((r) => r.label.startsWith("Requirements"));
  const scenGroup = roots.find((r) => r.label.startsWith("Scenarios"));
  const symbolGroup = roots.find((r) => r.label.startsWith("Symbols"));

  expect(reqGroup?.label).toBe("Requirements (1)");
  expect(scenGroup?.label).toBe("Scenarios (1)");
  expect(symbolGroup?.label).toBe("Symbols (1)");
});

test("KibiTreeDataProvider.getChildren returns empty array for empty workspaceRoot", async () => {
  const { KibiTreeDataProvider } = await import("../src/treeProvider");
  const provider = new KibiTreeDataProvider("");
  const roots = await provider.getChildren();

  expect(roots).toHaveLength(0);
});
