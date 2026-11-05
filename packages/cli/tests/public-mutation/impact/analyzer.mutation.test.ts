import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { analyzeChangedFileImpact } from "../../../src/public/impact/analyzer.js";
import type { ChangedFileImpactOptions } from "../../../src/public/impact/types.js";
import { expectGolden } from "../helpers/golden.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const requirement = (id: string, title: string, status = "open") =>
  `---\nid: ${id}\ntitle: ${title}\nstatus: ${status}\n---\n${title}.\n`;

const symbol = (
  id: string,
  title: string,
  sourceFile: string,
  relationships: readonly (readonly [string, string])[],
) =>
  [
    `  - id: ${id}`,
    `    title: ${title}`,
    `    sourceFile: ${sourceFile}`,
    "    status: active",
    ...(relationships.length === 0 ? [] : ["    relationships:"]),
    ...relationships.flatMap(([type, target]) => [
      `      - type: ${type}`,
      `        target: ${target}`,
    ]),
  ].join("\n");

const BASE: Record<string, string> = {
  ".kb/requirements/REQ-upload.md": requirement(
    "REQ-upload",
    "Uploads keep their name",
  ),
  ".kb/requirements/REQ-edited.md": requirement(
    "REQ-edited",
    "Edited statements are reviewed",
  ),
  ".kb/requirements/REQ-old.md": requirement(
    "REQ-old",
    "Old behavior",
    "deprecated",
  ),
  ".kb/requirements/REQ-extra.md": requirement("REQ-extra", "Extra rule"),
  ".kb/requirements/REQ-more.md": requirement("REQ-more", "More rules"),
  ".kb/tests/TEST-upload.md":
    "---\nid: TEST-upload\ntitle: Upload test\nstatus: passing\n---\nUpload test.\n",
  ".kb/symbols.yaml": [
    "symbols:",
    symbol("SYM-upload", "upload", "src/upload.ts", [
      ["implements", "REQ-upload"],
    ]),
    symbol("SYM-edit", "edit", "src/edit.ts", [["implements", "REQ-edited"]]),
    symbol("SYM-loose", "loose", "src/loose.ts", []),
    symbol("SYM-elsewhere", "ElsewhereService", "src/elsewhere.ts", [
      ["implements", "REQ-upload"],
      ["implements", "REQ-edited"],
      ["implements", "REQ-extra"],
      ["implements", "REQ-old"],
      ["implements", "REQ-more"],
    ]),
    symbol("SYM-store", "Store", "src/store.ts", [["implements", "REQ-extra"]]),
    symbol("SYM-vanished", "vanished", "src/store.ts", [
      ["implements", "REQ-extra"],
    ]),
    symbol("SYM-stable", "stableAnchor", "src/edit.ts", [
      ["implements", "REQ-edited"],
    ]),
    "",
  ].join("\n"),
  "src/upload.ts": "export function upload(): string {\n  return 'a';\n}\n",
  "src/edit.ts":
    "export function stableAnchor(): number {\n  return 1;\n}\n\nexport function edit(): string {\n  return 'a';\n}\n",
  "src/store.ts":
    "export class Store {\n  save(): number {\n    return 1;\n  }\n\n  load(): number {\n    return 1;\n  }\n}\n",
  "src/mode.ts": "export function mode(): number {\n  return 1;\n}\n",
  "src/moved.ts":
    "export function first(): number {\n  return 1;\n}\n\nexport function second(): number {\n  return 1;\n}\n\nexport function third(): number {\n  return 1;\n}\n",
  "src/loose.ts": "export function loose(): string {\n  return 'a';\n}\n",
  "src/elsewhere.ts": "export function elsewhere(): number {\n  return 1;\n}\n",
  "src/gone.ts": "export function gone(): number {\n  return 1;\n}\n",
  "notes.txt": "first\n",
};

function repo(files: Record<string, string> = BASE) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "kibi-analyzer-")));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  const write = (file: string, content: string | Buffer) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  };
  git("init", "-q");
  git("config", "user.name", "Kibi test");
  git("config", "user.email", "kibi-test@example.invalid");
  git("config", "commit.gpgsign", "false");
  for (const [file, content] of Object.entries(files)) write(file, content);
  git("add", ".");
  git("commit", "-q", "-m", "baseline");
  return { root, git, write };
}

/** The result with the workspace path replaced, for a golden file. */
const portable = (root: string, value: unknown) =>
  JSON.parse(JSON.stringify(value).replaceAll(root, "<root>"));

const changeSources = (f: ReturnType<typeof repo>) => {
  f.write(
    "src/upload.ts",
    "export function upload(): string {\n  return 'b';\n}\n\n// implements REQ-missing\nexport function extra(): number {\n  return 2;\n}\n",
  );
  f.write(
    "src/edit.ts",
    "export function stableAnchor(): number {\n  return 1;\n}\n\nexport function edit(): string {\n  return 'b';\n}\n",
  );
  f.write(
    "src/store.ts",
    "export class Store {\n  save(): number {\n    return 2;\n  }\n\n  load(): number {\n    return 1;\n  }\n}\n",
  );
  f.write(
    "src/loose.ts",
    "export function loose(): string {\n  return 'b';\n}\n",
  );
  f.write(
    ".kb/requirements/REQ-edited.md",
    requirement("REQ-edited", "Edited statements are reviewed again"),
  );
};

describe("staged impact", () => {
  const staged = () => {
    const f = repo();
    changeSources(f);
    f.write("notes.txt", "second\n");
    f.write("blob.bin", Buffer.from([0, 1, 2, 0]));
    symlinkSync("src/upload.ts", join(f.root, "link.ts"));
    f.git("rm", "-q", "src/gone.ts");
    chmodSync(join(f.root, "src/mode.ts"), 0o755);
    f.git("mv", "src/moved.ts", "src/renamed.ts");
    f.write(
      "src/renamed.ts",
      "export function first(): number {\n  return 1;\n}\n\nexport function second(): number {\n  return 2;\n}\n\nexport function third(): number {\n  return 1;\n}\n",
    );
    f.git("add", "-A");
    return f;
  };
  const run = (
    f: ReturnType<typeof repo>,
    extra: Partial<ChangedFileImpactOptions> = {},
  ) =>
    analyzeChangedFileImpact({ workspaceRoot: f.root, staged: true, ...extra });

  test("reads every changed path of the captured snapshot", async () => {
    const f = staged();
    // The working tree no longer matches what was staged.
    f.write("src/upload.ts", "export function tampered() {}\n");
    const result = await run(f);
    expectGolden("analyzer-staged", portable(f.root, result));
    expect(result.sourceFiles).toEqual([
      "blob.bin",
      "link.ts",
      "notes.txt",
      "src/edit.ts",
      "src/gone.ts",
      "src/loose.ts",
      "src/mode.ts",
      "src/renamed.ts",
      "src/store.ts",
      "src/upload.ts",
    ]);
  });

  test("keeps to the named files", async () => {
    const f = staged();
    const result = await run(f, {
      sourceFiles: ["src/loose.ts", join(f.root, "notes.txt")],
    });
    expectGolden("analyzer-staged-scoped", portable(f.root, result));
    expect(result.sourceFiles).toEqual(["notes.txt", "src/loose.ts"]);
  });

  test("caps and drops diagnostics", async () => {
    const f = staged();
    const all = await run(f);
    expect(all.impactDiagnostics.length).toBeGreaterThan(1);
    expect(await run(f, { maxDiagnostics: -1 })).toEqual(all);
    expect((await run(f, { maxDiagnostics: 0 })).impactDiagnostics).toEqual([]);
    const capped = await run(f, { maxDiagnostics: 1 });
    expect(capped.impactDiagnostics).toEqual(all.impactDiagnostics.slice(0, 1));
    const none = await run(f, { includeImpactDiagnostics: false });
    expect(none.impactDiagnostics).toEqual([]);
    expect(none.extractedSymbols).toEqual(all.extractedSymbols);
  });

  test("blocks a source the snapshot cannot analyze", async () => {
    const f = repo();
    f.write("src/bad.ts", "export function broken( {\n");
    f.git("add", "-A");
    await expect(run(f)).rejects.toThrow(
      /^Source analysis partial for src\/bad\.ts: /,
    );
  });
});

describe("working-tree impact", () => {
  test("reads changed files and the requirement documents beside them", async () => {
    const f = repo();
    changeSources(f);
    const result = await analyzeChangedFileImpact({
      workspaceRoot: f.root,
      includeWorkingTreeDiff: true,
    });
    expectGolden("analyzer-working-tree", portable(f.root, result));
  });

  test("names unlinked files that were asked about", async () => {
    const f = repo();
    f.write(
      "src/fresh.ts",
      "export function fresh(): number {\n  return 1;\n}\n",
    );
    const result = await analyzeChangedFileImpact({
      workspaceRoot: f.root,
      sourceFiles: ["src/fresh.ts", "src/loose.ts", "src/upload.ts"],
    });
    expectGolden("analyzer-working-tree-named", portable(f.root, result));
  });
});
