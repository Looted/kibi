// implements REQ-014
import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { writeCoverageManifestAudit } from "../coverage-manifest";
import { mergeLcovContentsWithDiagnostics } from "../merge-lcov";

const workspace = resolve(import.meta.dir, "../..");
const roots: string[] = [];
afterEach(() => {
  while (roots.length) {
    const root = roots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "kibi-parser-coverage-fixture-"));
  roots.push(root);
  const packageRoot = join(root, "packages/plugin-treesitter");
  mkdirSync(packageRoot, { recursive: true });
  for (const directory of ["src", "assets", "tests", "dist"]) {
    cpSync(
      join(workspace, "packages/plugin-treesitter", directory),
      join(packageRoot, directory),
      { recursive: true },
    );
  }
  for (const file of ["package.json", "tsconfig.json", "catalog.json"]) {
    cpSync(
      join(workspace, "packages/plugin-treesitter", file),
      join(packageRoot, file),
    );
  }
  cpSync(join(workspace, "tsconfig.json"), join(root, "tsconfig.json"));
  writeFileSync(join(root, "package.json"), '{"private":true}\n');
  symlinkSync(
    join(workspace, "node_modules"),
    join(root, "node_modules"),
    "junction",
  );
  symlinkSync(
    join(workspace, "packages/plugin-treesitter/node_modules"),
    join(packageRoot, "node_modules"),
    "junction",
  );
  return { root, packageRoot, output: join(root, "coverage") };
}

function run(root: string, output: string) {
  return spawnSync(
    "node",
    [join(workspace, "scripts/parser-unit-coverage.mjs"), root, output],
    { encoding: "utf8", timeout: 120_000 },
  );
}

function distDigest(packageRoot: string) {
  const hash = createHash("sha256");
  for (const file of readdirSync(join(packageRoot, "dist")).sort())
    hash.update(file).update(readFileSync(join(packageRoot, "dist", file)));
  return hash.digest("hex");
}

test("maps real parser workers to every TS source and closes the manifest through the existing merger", () => {
  const { root, packageRoot, output } = fixture();
  mkdirSync(output);
  const missingBefore = writeCoverageManifestAudit(root, output, "");
  expect(missingBefore).toHaveLength(4);
  const originalDist = distDigest(packageRoot);
  const result = run(root, output);
  expect(`${result.stdout}${result.stderr}`).toBe("");
  expect(result.status).toBe(0);
  expect(distDigest(packageRoot)).toBe(originalDist);
  const evidence = JSON.parse(
    readFileSync(join(output, "evidence.json"), "utf8"),
  );
  expect(evidence.workerRecords).toBeGreaterThan(0);
  expect(
    evidence.sourceFiles.map((file: { path: string }) => file.path).sort(),
  ).toEqual(missingBefore);
  const raw = readdirSync(join(output, "v8")).map((file) =>
    JSON.parse(readFileSync(join(output, "v8", file), "utf8")),
  );
  expect(
    raw.some((record) =>
      record.result.some((entry: { url: string }) =>
        entry.url.endsWith("/dist/analysis-worker.js"),
      ),
    ),
  ).toBe(true);
  const lcov = readFileSync(join(output, "lcov.info"), "utf8");
  expect(lcov).toMatch(/^BRDA:/m);
  expect(lcov).toMatch(/^DA:[0-9]+,0$/m);
  const merged = mergeLcovContentsWithDiagnostics([lcov]);
  expect(merged.diagnostics).toEqual([]);
  expect(writeCoverageManifestAudit(root, output, merged.lcov)).toEqual([]);
}, 120_000);

test("rejects a conformance assertion failure instead of publishing coverage", () => {
  const { root, packageRoot, output } = fixture();
  writeFileSync(
    join(packageRoot, "tests/failed.test.js"),
    'import { test } from "node:test"; test("failed", () => { throw new Error("sentinel-conformance-failure"); });\n',
  );
  const result = run(root, output);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("sentinel-conformance-failure");
}, 120_000);

test("rejects passing tests that never execute the parser worker", () => {
  const { root, packageRoot, output } = fixture();
  rmSync(join(packageRoot, "tests"), { recursive: true });
  mkdirSync(join(packageRoot, "tests"));
  writeFileSync(
    join(packageRoot, "tests/parent-only.test.js"),
    'import { test } from "node:test"; import "../dist/index.js"; test("parent only", () => {});\n',
  );
  const result = run(root, output);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain(
    "did not record execution of packages/plugin-treesitter/src/analysis-worker.ts",
  );
}, 120_000);
