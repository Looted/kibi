// executable_for TEST-kibi-tree-sitter-references
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { validateKibiPlugin, validateReferenceExtractionResult } from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterReferenceExtractor, default: plugin } = await import("../dist/index.js");
const extractor = createTreeSitterReferenceExtractor();
const fixture = (relativePath) =>
  readFile(new URL(`./fixtures/${relativePath}`, import.meta.url), "utf8");

async function read(path, extract, options = {}) {
  const result = await extractor.extract({ path, content: await fixture(path), extract, ...options });
  assert.deepEqual(validateReferenceExtractionResult(result), result);
  return result;
}

async function members(path, extract, options) {
  const result = await read(path, extract, options);
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.deepEqual(result.unresolved, [], JSON.stringify(result.unresolved));
  return [...new Set(result.members)].sort();
}

async function unresolvedLines(path, extract, options) {
  const result = await read(path, extract, options);
  assert.equal(result.status, "ok", JSON.stringify(result));
  return [...new Set(result.unresolved.map((row) => row.line))].sort((a, b) => a - b);
}

describe("offline Tree-sitter reference extractor", () => {
  it("is declared by the plugin next to symbol extraction", () => {
    const validated = validateKibiPlugin(plugin);
    assert.equal(validated.capabilities.referenceExtractor?.id, "kibi-plugin-treesitter.references.v1");
    for (const path of ["a.go", "A.java", "A.cs", "a.rs"])
      assert.equal(extractor.supports({ path }), true, path);
    for (const path of ["a.py", "a.rb", "a.ts", "a.pl"])
      assert.equal(extractor.supports({ path }), false, path);
  });

  it("reads Go imports, calls, environment variables, panics and keyed literals", async () => {
    const file = "go/refs-clean.go";
    assert.deepEqual(await members(file, "imports"), ["fmt", "net/http", "os"]);
    assert.deepEqual(await members(file, "calls"), [
      "fmt.Printf",
      "http.ListenAndServe",
      "os.Getenv",
      "os.LookupEnv",
      "panic",
    ]);
    assert.deepEqual(await members(file, "env"), ["APP_DEBUG", "PORT"]);
    assert.deepEqual(await members(file, "thrown"), ["ConfigError"]);
    assert.deepEqual(await members(file, "string_args", { callee: "Printf" }), ["listening on %s %v %v\n"]);
    assert.deepEqual(await members(file, "property", { key: "Mode" }), ["strict"]);
  });

  it("refuses a computed Go environment name and reflective calls", async () => {
    const file = "go/refs-dynamic.go";
    assert.deepEqual(await unresolvedLines(file, "env"), [9]);
    assert.deepEqual(await unresolvedLines(file, "calls"), [13]);
  });

  it("reads Java imports, calls (with method references), environment variables and throws", async () => {
    const file = "java/RefsClean.java";
    assert.deepEqual(await members(file, "imports"), ["java.util.List", "java.util.concurrent.*"]);
    assert.deepEqual(await members(file, "calls"), [
      "*.forEach",
      "List.of",
      "System.getenv",
      "System.out.println",
      "log",
    ]);
    assert.deepEqual(await members(file, "env"), ["PORT"]);
    // A rethrow of the caught exception is not a new error.
    assert.deepEqual(await members(file, "thrown"), ["IllegalStateException"]);
    const property = await read(file, "property", { key: "x" });
    assert.equal(property.status, "unsupported");
  });

  it("refuses Java reflection and a computed environment name", async () => {
    const file = "java/RefsDynamic.java";
    assert.deepEqual(await unresolvedLines(file, "calls"), [6]);
    assert.deepEqual(await unresolvedLines(file, "env"), [5]);
  });

  it("reads C# usings, calls, environment variables, throws and initializer values", async () => {
    const file = "csharp/RefsClean.cs";
    assert.deepEqual(await members(file, "imports"), ["System", "System.Net.Http"]);
    assert.deepEqual(await members(file, "calls"), ["Console.WriteLine", "Environment.GetEnvironmentVariable"]);
    assert.deepEqual(await members(file, "env"), ["PORT"]);
    assert.deepEqual(await members(file, "thrown"), ["InvalidOperationException"]);
    assert.deepEqual(await members(file, "property", { key: "Mode" }), ["strict"]);
  });

  it("refuses C# conditional compilation and reflection", async () => {
    const file = "csharp/RefsDynamic.cs";
    assert.deepEqual(await unresolvedLines(file, "imports"), [9]);
    assert.deepEqual(await unresolvedLines(file, "calls"), [9, 12, 13]);
  });

  it("reads Rust use trees, calls and environment variables, skipping cfg(test) items", async () => {
    const file = "rust/refs-clean.rs";
    assert.deepEqual(await members(file, "imports"), ["std::env", "std::io", "std::io::Write"]);
    assert.deepEqual(await members(file, "calls"), [
      "*.unwrap_or_default",
      "env::var",
      "io::stdout",
      "out.flush",
      "out.write_all",
      "port.as_bytes",
    ]);
    assert.deepEqual(await members(file, "env"), ["PORT"]);
    assert.deepEqual(await members(file, "thrown"), []);
  });

  it("refuses Rust calls and panics in a file with a macro, and cfg-gated items everywhere", async () => {
    const file = "rust/refs-dynamic.rs";
    assert.deepEqual(await unresolvedLines(file, "calls"), [5, 8]);
    assert.deepEqual(await unresolvedLines(file, "thrown"), [5, 8]);
    assert.deepEqual(await unresolvedLines(file, "env"), [8]);
  });

  it("refuses a file that does not parse, and a language it has no reader for", async () => {
    const broken = await extractor.extract({ path: "src/a.go", content: "package a\nfunc (\n", extract: "calls" });
    assert.equal(broken.status, "failed");
    assert.match(broken.message, /is not valid Go/);
    const other = await extractor.extract({ path: "a.rb", content: "puts 1\n", extract: "calls" });
    assert.equal(other.status, "unsupported");
  });
});
