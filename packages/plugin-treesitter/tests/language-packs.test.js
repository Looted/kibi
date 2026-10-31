// executable_for TEST-kibi-tree-sitter-language-packs
import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

// The plugin is copied outside the workspace so only the packs placed next
// to it can resolve: a missing pack, another version, changed bytes, and a
// pack removed after a successful read.
const pluginRoot = fileURLToPath(new URL("..", import.meta.url));
const workspaceGo = dirname(
  createRequire(join(pluginRoot, "package.json")).resolve(
    "kibi-lang-go/package.json",
  ),
);
const webTreeSitter = join(pluginRoot, "node_modules", "web-tree-sitter");
const scratch = mkdtempSync(join(tmpdir(), "kibi-lang-packs-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

let copies = 0;
async function pluginWith(goPack) {
  const root = join(scratch, `plugin-${copies++}`);
  for (const entry of ["dist", "assets", "catalog.json", "package.json"])
    cpSync(join(pluginRoot, entry), join(root, entry), { recursive: true });
  mkdirSync(join(root, "node_modules"));
  symlinkSync(
    webTreeSitter,
    join(root, "node_modules", "web-tree-sitter"),
    "dir",
  );
  const goRoot = join(root, "node_modules", "kibi-lang-go");
  if (goPack !== undefined) {
    cpSync(workspaceGo, goRoot, { recursive: true, dereference: true });
    goPack(goRoot);
  }
  const module = await import(
    pathToFileURL(join(root, "dist", "index.js")).href
  );
  return { goRoot, extractor: module.createTreeSitterReferenceExtractor() };
}

const source = 'package a\nimport "os"\nfunc f() { _ = os.Getenv("PORT") }\n';
const read = (extractor) =>
  extractor.extract({ path: "a.go", content: source, extract: "env" });

describe("Tree-sitter language packs", () => {
  it("refuses Go without kibi-lang-go and names the install line", async () => {
    const { extractor } = await pluginWith(undefined);
    const result = await read(extractor);
    assert.equal(result.status, "unsupported");
    assert.match(
      result.message,
      /kibi-lang-go 1\.0\.0, which is not installed/,
    );
    assert.match(result.message, /npm install --save-dev kibi-lang-go@1\.0\.0/);
  });

  it("refuses another pack version even inside the peer range", async () => {
    const { extractor } = await pluginWith((goRoot) => {
      const manifest = JSON.parse(
        readFileSync(join(goRoot, "package.json"), "utf8"),
      );
      writeFileSync(
        join(goRoot, "package.json"),
        JSON.stringify({ ...manifest, version: "1.0.1" }),
      );
    });
    const result = await read(extractor);
    assert.equal(result.status, "unsupported");
    assert.match(result.message, /but 1\.0\.1 is installed/);
  });

  it("fails a pack whose grammar bytes changed", async () => {
    const { extractor } = await pluginWith((goRoot) => {
      const wasm = join(goRoot, "tree-sitter-go.wasm");
      const bytes = readFileSync(wasm);
      bytes[bytes.length - 1] ^= 1;
      writeFileSync(wasm, bytes);
    });
    const result = await read(extractor);
    assert.equal(result.status, "failed");
    assert.match(
      result.message,
      /TREESITTER_LANGUAGE_PACK_MISMATCH|is not the Go grammar/,
    );
  });

  it("reads Go with the pinned pack, and refuses again once it is removed", async () => {
    const { extractor, goRoot } = await pluginWith(() => {});
    const result = await read(extractor);
    assert.equal(result.status, "ok", JSON.stringify(result));
    assert.deepEqual(result.members, ["PORT"]);
    rmSync(goRoot, { recursive: true, force: true });
    const again = await read(extractor);
    assert.equal(again.status, "unsupported");
    assert.match(again.message, /not installed/);
  });
});
