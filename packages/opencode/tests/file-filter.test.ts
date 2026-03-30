import { describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import { shouldHandleFile, stripToRoot, getKbExistenceTargets } from "../src/file-filter";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// implements REQ-opencode-kibi-plugin-v1

describe("file-filter shouldHandleFile", () => {
  it("matches documentation markdown under configured directories", () => {
    const ok = shouldHandleFile(
      "documentation/requirements/REQ-001.md",
      process.cwd(),
    );
    assert.equal(ok, true);
  });

  it("ignores node_modules files", () => {
    const ok = shouldHandleFile(
      "node_modules/something/index.js",
      process.cwd(),
    );
    assert.equal(ok, false);
  });

  it("matches symbols manifest path", () => {
    const ok = shouldHandleFile("documentation/symbols.yaml", process.cwd());
    assert.equal(ok, true);
  });

  it("does not match unrelated src files", () => {
    const ok = shouldHandleFile("src/app/main.ts", process.cwd());
    assert.equal(ok, false);
  });
});

// implements REQ-opencode-kibi-plugin-v1
describe("stripToRoot", () => {
  it("strips /** glob patterns", () => {
    assert.equal(stripToRoot("kibi-docs/**/*.md"), "kibi-docs");
  });

  it("strips /* glob patterns", () => {
    assert.equal(stripToRoot("kibi-docs/*.md"), "kibi-docs");
  });

  it("returns '.' for bare *", () => {
    assert.equal(stripToRoot("*"), ".");
  });

  it("returns '.' for **", () => {
    assert.equal(stripToRoot("**"), ".");
  });

  it("returns '.' for *.md", () => {
    assert.equal(stripToRoot("*.md"), ".");
  });

  it("returns '.' for /*.md at root", () => {
    assert.equal(stripToRoot("/*.md"), ".");
  });

  it("preserves plain directory paths", () => {
    assert.equal(stripToRoot("requirements"), "requirements");
  });

  it("strips nested glob patterns", () => {
    assert.equal(stripToRoot("kibi-docs/requirements/**/*.md"), "kibi-docs/requirements");
  });

  it("handles path without glob", () => {
    assert.equal(stripToRoot("data/symbols.yaml"), "data/symbols.yaml");
  });
});

// implements REQ-opencode-kibi-plugin-v1
describe("getKbExistenceTargets normalization contract", () => {
  let tmpDir: string;
  let origDir: string;

  // Helpers for creating temp config
  const makeConfig = (paths: Record<string, string>) => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({ paths }),
    );
  };

  it("strips glob patterns from configured paths", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-norm-1-"));
    makeConfig({
      requirements: "kibi-docs/requirements/**/*.md",
      symbols: "kibi-docs/symbols.yaml",
    });
    const targets = getKbExistenceTargets(tmpDir);
    const req = targets.find((t) => t.key === "requirements");
    assert.ok(req, "requirements target should exist");
    assert.equal(req!.relativePath, "kibi-docs/requirements");
    assert.equal(req!.kind, "dir");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("normalizes trailing slashes before stripping", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-norm-2-"));
    makeConfig({
      requirements: "kibi-docs/requirements/",
      symbols: "kibi-docs/symbols.yaml",
    });
    const targets = getKbExistenceTargets(tmpDir);
    const req = targets.find((t) => t.key === "requirements");
    assert.ok(req, "requirements target should exist");
    assert.equal(req!.relativePath, "kibi-docs/requirements");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("resolves bare glob * to cwd root", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-norm-3-"));
    makeConfig({
      requirements: "*",
      symbols: "symbols.yaml",
    });
    const targets = getKbExistenceTargets(tmpDir);
    const req = targets.find((t) => t.key === "requirements");
    assert.ok(req, "requirements target should exist");
    assert.equal(req!.relativePath, ".");
    assert.equal(req!.kind, "dir");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("keeps .yaml targets as file kind", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-norm-4-"));
    makeConfig({
      requirements: "requirements/**/*.md",
      symbols: "data/symbols.yaml",
    });
    const targets = getKbExistenceTargets(tmpDir);
    const sym = targets.find((t) => t.key === "symbols");
    assert.ok(sym, "symbols target should exist");
    assert.equal(sym!.relativePath, "data/symbols.yaml");
    assert.equal(sym!.kind, "file");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("strips /*.md patterns", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-norm-5-"));
    makeConfig({
      requirements: "docs/*.md",
      symbols: "docs/symbols.yaml",
    });
    const targets = getKbExistenceTargets(tmpDir);
    const req = targets.find((t) => t.key === "requirements");
    assert.ok(req, "requirements target should exist");
    assert.equal(req!.relativePath, "docs");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
