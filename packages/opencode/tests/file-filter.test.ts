import { describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getKbExistenceTargets,
  shouldHandleFile,
  stripToRoot,
} from "../src/file-filter";
// implements REQ-opencode-kibi-plugin-v1

describe("file-filter shouldHandleFile", () => {
  it("matches documentation markdown under configured directories", () => {
    const ok = shouldHandleFile(".kb/requirements/REQ-001.md", process.cwd());
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
    const ok = shouldHandleFile(".kb/symbols.yaml", process.cwd());
    assert.equal(ok, true);
  });

  it("does not match unrelated src files", () => {
    const ok = shouldHandleFile("src/app/main.ts", process.cwd());
    assert.equal(ok, false);
  });

  it("ignores .sisyphus drafts by default", () => {
    const ok = shouldHandleFile(
      ".sisyphus/drafts/kibi-kb-quality-audit.md",
      process.cwd(),
    );
    assert.equal(ok, false);
  });

  it("respects root .gitignore entries when present", () => {
    // Create a temp dir with a .gitignore that ignores docs/secret.md and run shouldHandleFile
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-gi-"));
    try {
      fs.writeFileSync(path.join(tmp, ".gitignore"), "docs/secret.md\n");
      // file path that would otherwise match sync patterns
      const p = path.join(tmp, "docs", "secret.md");
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, "secret");
      const rel = path.relative(process.cwd(), p).split(path.sep).join("/");
      const ok = shouldHandleFile(rel, tmp);
      assert.equal(ok, false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("respects nested .gitignore entries and .git/info/exclude", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-gi-nested-"));
    try {
      // nested .gitignore inside docs
      const docsDir = path.join(tmp, "docs");
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, ".gitignore"), "nested-ignore.md\n");
      const nestedFile = path.join(docsDir, "nested-ignore.md");
      fs.writeFileSync(nestedFile, "x");
      const relNested = path
        .relative(process.cwd(), nestedFile)
        .split(path.sep)
        .join("/");
      const okNested = shouldHandleFile(relNested, tmp);
      assert.equal(okNested, false);

      // .git/info/exclude
      const gitInfoDir = path.join(tmp, ".git", "info");
      fs.mkdirSync(gitInfoDir, { recursive: true });
      fs.writeFileSync(path.join(gitInfoDir, "exclude"), "exclude-me.md\n");
      const excl = path.join(tmp, "exclude-me.md");
      fs.writeFileSync(excl, "y");
      const relExcl = path
        .relative(process.cwd(), excl)
        .split(path.sep)
        .join("/");
      const okExcl = shouldHandleFile(relExcl, tmp);
      assert.equal(okExcl, false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("accepts non-ignored configured docs markdown", () => {
    const ok = shouldHandleFile(
      ".kb/requirements/NOT_IGNORED.md",
      process.cwd(),
    );
    assert.equal(ok, true);
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
    assert.equal(
      stripToRoot("kibi-docs/requirements/**/*.md"),
      "kibi-docs/requirements",
    );
  });

  it("handles path without glob", () => {
    assert.equal(stripToRoot("data/symbols.yaml"), "data/symbols.yaml");
  });
});

// implements REQ-opencode-kibi-plugin-v1
describe("getKbExistenceTargets normalization contract", () => {
  it("reports canonical .kb/ lanes regardless of leftover config.json paths", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-norm-1-"));
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({
        paths: {
          requirements: "kibi-docs/requirements/**/*.md",
          symbols: "kibi-docs/symbols.yaml",
        },
      }),
    );
    const targets = getKbExistenceTargets(tmpDir);
    const req = targets.find((t) => t.key === "requirements");
    assert.ok(req, "requirements target should exist");
    assert.equal(req.relativePath, ".kb/requirements");
    assert.equal(req.kind, "dir");
    const symbols = targets.find((t) => t.key === "symbols");
    assert.equal(symbols?.relativePath, ".kb/symbols.yaml");
    assert.equal(symbols?.kind, "file");
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("strips glob patterns from canonical lane patterns", () => {
    const targets = getKbExistenceTargets("/nonexistent");
    const req = targets.find((t) => t.key === "requirements");
    assert.ok(req);
    assert.equal(req.relativePath, ".kb/requirements");
    assert.equal(req.kind, "dir");
  });

  it("keeps symbols.yaml as a file target", () => {
    const targets = getKbExistenceTargets("/nonexistent");
    const symbols = targets.find((t) => t.key === "symbols");
    assert.ok(symbols);
    assert.equal(symbols.relativePath, ".kb/symbols.yaml");
    assert.equal(symbols.kind, "file");
  });
});
