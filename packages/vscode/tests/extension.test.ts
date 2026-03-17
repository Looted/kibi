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

import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Minimal vscode mock — only the APIs used by KibiTreeDataProvider
// ---------------------------------------------------------------------------
const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };

class ThemeIcon {
  constructor(public id: string) {}
}
class TreeItem {
  constructor(
    public label: string,
    public collapsibleState: number,
  ) {}
  iconPath?: ThemeIcon;
  contextValue?: string;
  tooltip?: string;
  command?: unknown;
  resourceUri?: unknown;
}
class EventEmitter {
  event = () => {};
  fire() {}
}
const window = { showInformationMessage: mock(() => {}) };
const Uri = { file: (p: string) => ({ fsPath: p }) };

mock.module("vscode", () => ({
  TreeItemCollapsibleState,
  ThemeIcon,
  TreeItem,
  EventEmitter,
  window,
  Uri,
}));

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
</rdf:RDF>`;

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-vscode-test-"));
  // Create the branch KB directory structure
  const branchDir = path.join(tmpDir, ".kb", "branches", "develop");
  fs.mkdirSync(branchDir, { recursive: true });
  fs.writeFileSync(path.join(branchDir, "kb.rdf"), FIXTURE_RDF);
  // Stub git so getCurrentBranch returns "develop"
  const binDir = path.join(tmpDir, "bin");
  fs.mkdirSync(binDir);
  const fakeGit = path.join(binDir, "git");
  fs.writeFileSync(fakeGit, "#!/bin/sh\necho develop\n");
  fs.chmodSync(fakeGit, 0o755);
});

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
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
});

test("KibiTreeDataProvider returns empty groups when no kb.rdf exists", async () => {
  // Remove the kb.rdf file
  fs.rmSync(path.join(tmpDir, ".kb"), { recursive: true, force: true });

  const { KibiTreeDataProvider } = await import("../src/treeProvider");
  const provider = new KibiTreeDataProvider(tmpDir);
  const roots = await provider.getChildren();

  // Still returns 7 groups (one per type), all with count 0
  expect(roots).toHaveLength(7);
  for (const root of roots) {
    expect(root.label).toMatch(/\(0\)$/);
  }
});

test("KibiTreeDataProvider.getChildren returns empty array for empty workspaceRoot", async () => {
  const { KibiTreeDataProvider } = await import("../src/treeProvider");
  const provider = new KibiTreeDataProvider("");
  const roots = await provider.getChildren();

  expect(roots).toHaveLength(0);
});
