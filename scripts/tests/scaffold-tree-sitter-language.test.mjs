import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";

const cli = resolve("scripts/scaffold-tree-sitter-language.mjs");
let temporaryDirectory;

async function makeTempDirectory() {
  temporaryDirectory = await mkdtemp(join(tmpdir(), "kibi-language-scaffold-"));
  return temporaryDirectory;
}

function runCli(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 10_000,
  });
}

const liveLanguageSupport = [
  "packages/plugin-treesitter/catalog.json",
  "packages/plugin-treesitter/integrity.json",
  "packages/plugin-treesitter/package.json",
];

async function snapshotLiveLanguageSupport() {
  const entries = await Promise.all(
    liveLanguageSupport.map(async (path) => [
      path,
      createHash("sha256")
        .update(await readFile(resolve(path)))
        .digest("hex"),
    ]),
  );
  return Object.fromEntries(entries);
}

afterEach(async () => {
  if (temporaryDirectory !== undefined) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("Tree-sitter language author scaffold CLI", () => {
  it("writes observable draft files and preserves a Unicode display name", async () => {
    const liveBefore = await snapshotLiveLanguageSupport();
    const root = await makeTempDirectory();
    const output = join(root, "drafts");
    const result = runCli([
      "sample-lang",
      output,
      "--display-name",
      "Sample 🧩 language",
      "--extension",
      ".smp",
    ]);

    assert.equal(result.status, 0, result.stderr);
    const target = join(output, "sample-lang");
    const files = await readdir(target);
    assert.deepEqual(files.sort(), [
      "README.md",
      "catalog-entry.template.json",
      "license-review.template.md",
      "operator-inputs.json",
      "qualification-checklist.md",
      "queries",
      "src",
      "tests",
    ]);

    const catalog = JSON.parse(
      await readFile(join(target, "catalog-entry.template.json"), "utf8"),
    );
    assert.equal(catalog.id, "sample-lang");
    assert.deepEqual(catalog.extensions, [".smp"]);
    assert.equal(catalog.license, null);
    assert.equal(catalog.npmIntegrity, null);
    assert.equal(catalog.assetSha256, null);
    assert.equal(catalog.querySha256, null);

    const operatorInputs = JSON.parse(
      await readFile(join(target, "operator-inputs.json"), "utf8"),
    );
    assert.equal(operatorInputs.displayName, "Sample 🧩 language");
    assert.deepEqual(operatorInputs.extensions, [".smp"]);

    assert.deepEqual(
      await snapshotLiveLanguageSupport(),
      liveBefore,
      "scaffolding a draft must not modify live language support",
    );

    const readme = await readFile(join(target, "README.md"), "utf8");
    assert.match(readme, /UNQUALIFIED/u);

    const entry = await readFile(
      join(target, "src/language-entry.template.ts"),
      "utf8",
    );
    assert.match(entry, /sample-lang/u);
    assert.match(entry, /\.smp/u);
    assert.match(entry, /UNQUALIFIED/u);

    const query = await readFile(join(target, "queries/tags.scm"), "utf8");
    assert.match(query, /UNQUALIFIED/u);
    assert.doesNotMatch(query, /\(.*@(?:definition|name|function)/u);

    const fixtures = await readFile(
      join(target, "tests/fixtures/README.md"),
      "utf8",
    );
    assert.match(fixtures, /partial analysis/u);
    assert.match(fixtures, /Unicode/u);
    assert.match(fixtures, /establishes only the tested syntax subset/u);

    const licenseReview = await readFile(
      join(target, "license-review.template.md"),
      "utf8",
    );
    assert.match(licenseReview, /No license decision has been made/u);
    assert.match(licenseReview, /External scanner, if present/u);
    assert.match(licenseReview, /not an SPDX record/u);

    const checklist = await readFile(
      join(target, "qualification-checklist.md"),
      "utf8",
    );
    assert.match(checklist, /Node and Bun/u);
    assert.match(checklist, /final npm tarball/u);
    assert.match(checklist, /native Windows and macOS remain unqualified/u);
  });

  it("rejects unsafe identifiers and malformed options without creating output", async () => {
    const root = await makeTempDirectory();
    const output = join(root, "drafts");
    const invalidIds = [
      "../escape",
      "part/name",
      "rø-lang",
      "con",
      "__proto__",
    ];

    for (const id of invalidIds) {
      const result = runCli([
        id,
        output,
        "--display-name",
        "Sample",
        "--extension",
        ".smp",
      ]);
      assert.notEqual(result.status, 0, id);
      assert.match(result.stderr, /Language id/u, id);
    }
    assert.equal(
      await lstat(output).then(
        () => "created",
        () => "missing",
      ),
      "missing",
    );

    const invalidExtension = runCli([
      "sample-lang",
      output,
      "--display-name",
      "Sample",
      "--extension",
      "../escape",
    ]);
    assert.notEqual(invalidExtension.status, 0);
    assert.match(invalidExtension.stderr, /Invalid extension/u);
    assert.equal(
      await lstat(output).then(
        () => "created",
        () => "missing",
      ),
      "missing",
    );

    const missingName = runCli(["sample-lang", output, "--extension", ".smp"]);
    assert.notEqual(missingName.status, 0);
    assert.match(missingName.stderr, /--display-name is required/u);
  });

  it("refuses an existing language directory without overwriting its files", async () => {
    const root = await makeTempDirectory();
    const output = join(root, "drafts");
    const target = join(output, "sample-lang");
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "README.md"), "operator data\n", "utf8");
    await writeFile(join(target, "keep.txt"), "keep\n", "utf8");

    const result = runCli([
      "sample-lang",
      output,
      "--display-name",
      "Sample",
      "--extension",
      ".smp",
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /already exists|EEXIST/u);
    assert.equal(
      await readFile(join(target, "README.md"), "utf8"),
      "operator data\n",
    );
    assert.deepEqual((await readdir(target)).sort(), ["README.md", "keep.txt"]);
  });

  it("reports an output-root filesystem error with a nonzero exit", async () => {
    const root = await makeTempDirectory();
    const outputFile = join(root, "not-a-directory");
    await writeFile(outputFile, "preserve\n", "utf8");

    const result = runCli([
      "sample-lang",
      outputFile,
      "--display-name",
      "Sample",
      "--extension",
      ".smp",
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Error:/u);
    assert.equal(await readFile(outputFile, "utf8"), "preserve\n");
  });
});
