// executable_for TEST-source-analysis-v2-contract
import { afterEach, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { analyzeChangedFileImpact } from "../../../src/public/impact/analyzer.js";
import { collectSourceChanges } from "../../../src/public/impact/source-changes.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "kibi-public-snapshot-"));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  const write = (file: string, content: string) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  git("init", "-q");
  write("service.ts", "export function execute() { return 1; }\n");
  write(
    ".kb/requirements/REQ-source.md",
    "---\nid: REQ-source\ntitle: Retain source ownership\nstatus: open\n---\nRetain source ownership.\n",
  );
  write(
    ".kb/symbols.yaml",
    "symbols:\n  - id: SYM-authored\n    title: execute\n    sourceFile: service.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-source\n",
  );
  git("add", ".");
  return { root, git, write };
}

test("public staged impact uses captured source and authored identity despite working-tree tampering", async () => {
  const f = fixture();
  f.write("service.ts", "export function unrelated() {}\n");
  f.write(".kb/symbols.yaml", "symbols: [broken");
  const result = await analyzeChangedFileImpact({
    workspaceRoot: f.root,
    staged: true,
  });
  expect(result.extractedSymbols).toEqual([
    expect.objectContaining({
      id: "SYM-authored",
      name: "execute",
      linkedEntityIds: ["REQ-source"],
    }),
  ]);
});

test("public staged impact rejects a missing captured ownership endpoint", async () => {
  const f = fixture();
  f.git("rm", "--cached", ".kb/requirements/REQ-source.md");
  await expect(
    analyzeChangedFileImpact({ workspaceRoot: f.root, staged: true }),
  ).rejects.toThrow("missing endpoint");
});

test("public staged impact scopes deleted source analysis to selected paths", async () => {
  const f = fixture();
  f.write("good.ts", "export function selected() { return 2; }\n");
  f.write("bad.ts", "export function broken( {\n");
  f.git("add", "good.ts", "bad.ts");
  f.git("config", "user.name", "Kibi test");
  f.git("config", "user.email", "kibi-test@example.invalid");
  f.git("commit", "-m", "baseline sources");
  f.write("good.ts", "export function selected() { return 3; }\n");
  f.git("add", "good.ts");
  f.git("rm", "bad.ts");

  const result = await analyzeChangedFileImpact({
    workspaceRoot: f.root,
    staged: true,
    sourceFiles: ["good.ts"],
  });
  expect(result.sourceFiles).toEqual(["good.ts"]);
  expect(result.extractedSymbols.map((symbol) => symbol.name)).toEqual([
    "selected",
  ]);

  await expect(
    analyzeChangedFileImpact({ workspaceRoot: f.root, staged: true }),
  ).rejects.toThrow("Incomplete source analysis for bad.ts");
});

test("public staged impact scopes malformed added source analysis to selected paths", async () => {
  const f = fixture();
  f.write("good.ts", "export function selected() { return 2; }\n");
  f.write("bad.ts", "export function broken( {\n");
  f.git("add", "good.ts", "bad.ts");

  const result = await analyzeChangedFileImpact({
    workspaceRoot: f.root,
    staged: true,
    sourceFiles: ["good.ts"],
  });
  expect(result.sourceFiles).toEqual(["good.ts"]);
  expect(result.extractedSymbols.map((symbol) => symbol.name)).toEqual([
    "selected",
  ]);

  await expect(
    analyzeChangedFileImpact({ workspaceRoot: f.root, staged: true }),
  ).rejects.toThrow("Incomplete source analysis for bad.ts");
});

test("public staged impact analyzes the previous side of a selected deletion", async () => {
  const f = fixture();
  f.write("bad.ts", "export function broken( {\n");
  f.git("add", "bad.ts");
  f.git("config", "user.name", "Kibi test");
  f.git("config", "user.email", "kibi-test@example.invalid");
  f.git("commit", "-m", "malformed source baseline");
  f.git("rm", "bad.ts");

  await expect(
    analyzeChangedFileImpact({
      workspaceRoot: f.root,
      staged: true,
      sourceFiles: ["bad.ts"],
    }),
  ).rejects.toThrow("Incomplete source analysis for bad.ts");
});

test("Python indentation changes remain source changes and shell syntax in filenames stays literal", () => {
  const f = fixture();
  const file = "$(untrusted command).py";
  f.write(file, "def execute():\n    return 1\n");
  f.git("add", file);
  f.write(file, "def execute():\n        return 1\n");
  const changes = collectSourceChanges({
    workspaceRoot: f.root,
    includeWorkingTreeDiff: true,
    sourceFiles: [file],
  });
  expect(changes).toHaveLength(1);
  expect(changes[0]?.content).toBe("def execute():\n        return 1\n");
});
