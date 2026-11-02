// executable_for TEST-kibi-tree-sitter-language-packs
import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

// A catalog entry without a pack names a grammar shipped in the plugin's own
// assets. The shipped catalog has none, so this process reads a catalog with
// Python's pack taken out before the plugin first reads it (the catalog is
// read once per process, so this lives in a file of its own).
const nodeOnly =
  process.versions.bun !== undefined && "needs Node live builtin bindings";

describe("a catalog entry without a pack", { skip: nodeOnly }, () => {
  it("is read from the grammar shipped in the plugin's own assets", async () => {
    const catalogUrl = new URL("../catalog.json", import.meta.url);
    const catalog = JSON.parse(fs.readFileSync(catalogUrl, "utf8"));
    const builtIn = JSON.stringify({
      ...catalog,
      languages: catalog.languages.map(({ pack, packVersion, ...rest }) =>
        rest.id === "python" ? rest : { ...rest, pack, packVersion },
      ),
    });
    const original = fs.readFileSync;
    mock.method(fs, "readFileSync", (path, ...rest) =>
      String(path) === fileURLToPath(catalogUrl) ||
      String(path) === catalogUrl.href
        ? builtIn
        : original.call(fs, path, ...rest),
    );
    syncBuiltinESMExports();
    let packs;
    try {
      packs = await import("../dist/language-packs.js");
      packs.languagePacks();
    } finally {
      mock.restoreAll();
      syncBuiltinESMExports();
    }
    assert.equal(packs.languagePackOf("python"), undefined);
    assert.equal(packs.languagePackProblem("python"), undefined);
    assert.equal(
      packs.languagePacks().some((pack) => pack.languages.includes("python")),
      false,
    );
    assert.deepEqual(packs.languagePackOf("go"), {
      package: "kibi-lang-go",
      version: "1.0.0",
    });
    assert.equal(
      packs.grammarSource("python"),
      fileURLToPath(new URL("../tree-sitter-python.wasm", import.meta.url)),
    );
  });
});
