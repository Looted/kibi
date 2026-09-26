// executable_for TEST-source-analysis-v2-contract
import { afterEach, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { enrichSymbolCoordinates } from "../../src/extractors/symbols-coordinator.js";
import { APPROVED_SOURCE_ANALYZERS } from "../../src/plugins/approved-source-analyzers.js";
import { createMaintenanceSourceAnalysisService } from "../../src/plugins/maintenance-source-analysis.js";
import { analyzeChangedFileImpact } from "../../src/public/impact/analyzer.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function consumer() {
  const root = mkdtempSync(join(tmpdir(), "kibi-approved-consumer-"));
  roots.push(root);
  const packageRoot = resolve(import.meta.dir, "../../../plugin-treesitter");
  const approval = APPROVED_SOURCE_ANALYZERS.find(
    (entry) => entry.packageName === "kibi-plugin-treesitter",
  );
  if (!approval) throw new Error("Missing qualified Tree-sitter approval");
  const installed = join(root, "node_modules/kibi-plugin-treesitter");
  for (const file of Object.keys(approval.files)) {
    mkdirSync(dirname(join(installed, file)), { recursive: true });
    copyFileSync(join(packageRoot, file), join(installed, file));
  }
  const runtime = dirname(
    createRequire(join(packageRoot, "package.json")).resolve("web-tree-sitter"),
  );
  symlinkSync(runtime, join(root, "node_modules/web-tree-sitter"), "dir");
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "source-consumer",
      private: true,
      dependencies: { "kibi-plugin-treesitter": approval.version },
      kibi: {
        plugins: [
          {
            package: "kibi-plugin-treesitter",
            capabilities: { "kibi.symbol-extractor.v2": { mode: "augment" } },
          },
        ],
      },
    }),
  );
  return { root, installed };
}

test("an approved relocated source package analyzes Python, Go and Rust through the maintenance host", async () => {
  const { root } = consumer();
  const service = createMaintenanceSourceAnalysisService(root);
  for (const [file, content, name] of [
    ["sample.py", "def execute():\n    return 1\n", "execute"],
    ["sample.go", "package sample\nfunc Execute() {}\n", "Execute"],
    ["sample.rs", "pub fn execute() {}\n", "execute"],
  ]) {
    if (!file || !content) throw new Error("Invalid fixture");
    const result = await service.analyzeTextV2(file, content);
    expect(result.status).toBe("ok");
    expect(result.symbols.map((symbol) => symbol.qualifiedName)).toEqual([
      name,
    ]);
    expect(result.providerFingerprint).toMatch(/^[a-f0-9]{64}$/);
  }
}, 15000);

test("known package names cannot execute modified code before approval validation", async () => {
  const { root, installed } = consumer();
  const marker = join(root, "executed.txt");
  writeFileSync(
    join(installed, "dist/index.js"),
    `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "executed"); export const kibiPlugin = {};`,
  );
  const result = await createMaintenanceSourceAnalysisService(
    root,
  ).analyzeTextV2("sample.py", "pass");
  expect(result.status).toBe("failed");
  expect(result.diagnostics[0]?.message).toContain("integrity mismatch");
  expect(existsSync(marker)).toBe(false);
});

test("staged Python impact preserves authored identity and ignores unstaged content", async () => {
  const { root } = consumer();
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  git("init", "-q");
  mkdirSync(join(root, ".kb/requirements"), { recursive: true });
  writeFileSync(
    join(root, ".kb/requirements/REQ-execute.md"),
    "---\nid: REQ-execute\ntitle: Execute the requested operation\nstatus: open\n---\nExecute the requested operation.\n",
  );
  writeFileSync(
    join(root, ".kb/symbols.yaml"),
    "symbols:\n  - id: SYM-authored\n    title: Service.execute\n    sourceFile: service.py\n    relationships:\n      - type: implements\n        target: REQ-execute\n",
  );
  writeFileSync(
    join(root, "service.py"),
    "class Service:\n    def execute(self):\n        return 1\n",
  );
  git("add", "package.json", ".kb", "service.py");
  writeFileSync(join(root, "service.py"), "this is invalid python !!!");
  const result = await analyzeChangedFileImpact({
    workspaceRoot: root,
    staged: true,
  });
  expect(result.extractedSymbols).toContainEqual(
    expect.objectContaining({
      id: "SYM-authored",
      name: "Service.execute",
      linkedEntityIds: ["REQ-execute"],
    }),
  );
  expect(readFileSync(join(root, "service.py"), "utf8")).toContain(
    "invalid python",
  );
}, 15000);

test("coordinate refresh uses the approved parser and retains authored symbol IDs", async () => {
  const { root } = consumer();
  writeFileSync(
    join(root, "service.py"),
    "class Service:\n    def execute(self):\n        return 1\n",
  );
  const entries = [
    { id: "SYM-authored", title: "Service.execute", sourceFile: "service.py" },
  ];
  const refreshed = await enrichSymbolCoordinates(entries, root);
  expect(refreshed).toEqual([
    expect.objectContaining({
      id: "SYM-authored",
      title: "Service.execute",
      sourceLine: 2,
      sourceColumn: 4,
      sourceEndLine: 3,
      sourceEndColumn: 16,
    }),
  ]);
}, 15000);
