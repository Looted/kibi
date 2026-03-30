import { afterEach, beforeEach, expect, it, mock } from "bun:test";
import fs from "node:fs";
import path from "node:path";

// Mutable stub — tests will set this to change behavior per-test
let tsEnrichStub:
  | ((entries: any[], workspaceRoot: string) => Promise<any[]>)
  | null = null;

// Install a module mock for the TS exporter before importing the coordinator.
mock.module("../../src/extractors/symbols-ts.js", () => ({
  enrichSymbolCoordinatesWithTsMorph: async (
    entries: any[],
    workspaceRoot: string,
  ) => {
    if (tsEnrichStub) return tsEnrichStub(entries, workspaceRoot);
    return entries; // default no-op
  },
}));

// Dynamic import AFTER mock is set up
const { enrichSymbolCoordinates } = await import(
  "../../src/extractors/symbols-coordinator.js"
);

const tmpDir = path.join(process.cwd(), "tmp-symbols-coord-tests");
function ensureDir() {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
}
function writeFile(name: string, content: string) {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, content, "utf8");
  return p;
}

beforeEach(() => {
  // start from a clean directory for each test to avoid permission leftovers
  if (fs.existsSync(tmpDir)) {
    for (const f of fs.readdirSync(tmpDir)) {
      try {
        fs.chmodSync(path.join(tmpDir, f), 0o600);
      } catch {}
      try {
        fs.unlinkSync(path.join(tmpDir, f));
      } catch {}
    }
    try {
      fs.rmdirSync(tmpDir);
    } catch {}
  }
  ensureDir();
});

afterEach(() => {
  if (fs.existsSync(tmpDir)) {
    for (const f of fs.readdirSync(tmpDir)) {
      try {
        fs.chmodSync(path.join(tmpDir, f), 0o600);
      } catch {}
      fs.unlinkSync(path.join(tmpDir, f));
    }
    fs.rmdirSync(tmpDir);
  }
  // reset mutable mock between tests
  tsEnrichStub = null;
});

it("delegates TS/JS files to ts-morph exporter (ts and js) and resolves absolute/relative paths", async () => {
  // stub ts enrichment via mock closure
  tsEnrichStub = async (entries: any[]) =>
    entries.map((e, i) => ({
      ...e,
      sourceLine: 10 + i,
      sourceColumn: 1,
      sourceEndLine: 10 + i,
      sourceEndColumn: 5,
      coordinatesGeneratedAt: new Date().toISOString(),
    }));

  // create ts and js files so resolveSourcePath succeeds
  const tsPath = writeFile("a.ts", "export function foo() {}\n");
  const jsPath = writeFile("b.js", "export function bar() {}\n");

  const workspaceRoot = tmpDir;

  const entries = [
    { id: "e1", title: "foo", sourceFile: path.basename(tsPath) }, // relative path
    { id: "e2", title: "bar", sourceFile: jsPath }, // absolute path
  ];

  const out = await enrichSymbolCoordinates(entries, workspaceRoot);
  expect(out).toHaveLength(2);
  // Both should be enriched by our stub
  expect(out[0].sourceLine).toBe(10);
  expect(out[1].sourceLine).toBe(11);
});

it("uses regex heuristic for non-TS files and returns original when no match", async () => {
  const mdPath = writeFile(
    "doc.md",
    "first line\nmySymbol here and more\nlast\n",
  );
  const noMatchPath = writeFile("other.txt", "nothing to see here\n");

  const entries = [
    { id: "r1", title: "mySymbol", sourceFile: path.basename(mdPath) },
    { id: "r2", title: "absent", sourceFile: path.basename(noMatchPath) },
  ];

  const out = await enrichSymbolCoordinates(entries, tmpDir);
  expect(out[0].sourceLine).toBe(2);
  expect(out[0].sourceColumn).toBeGreaterThanOrEqual(0);
  // second should be unchanged (no coordinates added)
  expect(out[1].sourceLine).toBeUndefined();
});

it("returns original entry when file read throws (warns)", async () => {
  // Use a missing file so resolveSourcePath returns null and coordinator returns original
  const missing = `no-such-protected-${Date.now()}.txt`;
  const entries = [{ id: "w1", title: "myX", sourceFile: missing }];

  const out = await enrichSymbolCoordinates(entries, tmpDir);
  expect(out[0].sourceLine).toBeUndefined();
});

it("handles nonexistent sourceFile and returns original", async () => {
  const entries = [{ id: "n1", title: "nope", sourceFile: "no/such/path.txt" }];
  const out = await enrichSymbolCoordinates(entries, tmpDir);
  expect(out[0].sourceLine).toBeUndefined();
});

it("properly escapes regex metacharacters in title when searching", async () => {
  const trickyName = "funny(name).*+?^${}[]|\\";
  const content =
    "line1\nthis has funny(name).*+?^${}[]|\\inside the middle\nend";
  const p = writeFile("tricky.txt", content);

  const entries = [
    { id: "t1", title: trickyName, sourceFile: path.basename(p) },
  ];
  const out = await enrichSymbolCoordinates(entries, tmpDir);
  expect(out[0].sourceLine).toBe(2);
});

it("mixes multiple symbols with different file types", async () => {
  // stub ts enrichment again
  tsEnrichStub = async (entries: any[]) =>
    entries.map((e, i) => ({
      ...e,
      sourceLine: 100 + i,
      sourceColumn: 0,
      sourceEndLine: 100 + i,
      sourceEndColumn: 3,
      coordinatesGeneratedAt: new Date().toISOString(),
    }));

  const tsPath = writeFile("mix.ts", "export function a() {}\n");
  const mdPath = writeFile("mix.md", "alpha\nbeta\nGammaSymbol is here\n");

  const entries = [
    { id: "m1", title: "a", sourceFile: path.basename(tsPath) },
    { id: "m2", title: "GammaSymbol", sourceFile: path.basename(mdPath) },
  ];

  const out = await enrichSymbolCoordinates(entries, tmpDir);
  expect(out[0].sourceLine).toBe(100);
  expect(out[1].sourceLine).toBe(3);
});
