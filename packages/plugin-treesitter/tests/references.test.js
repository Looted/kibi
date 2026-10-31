// executable_for TEST-kibi-tree-sitter-references
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  validateKibiPlugin,
  validateReferenceExtractionResult,
} from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterReferenceExtractor, default: plugin } = await import(
  "../dist/index.js"
);
const extractor = createTreeSitterReferenceExtractor();
const fixture = (relativePath) =>
  readFile(new URL(`./fixtures/${relativePath}`, import.meta.url), "utf8");

async function read(path, extract, options = {}) {
  const result = await extractor.extract({
    path,
    content: await fixture(path),
    extract,
    ...options,
  });
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
  return [...new Set(result.unresolved.map((row) => row.line))].sort(
    (a, b) => a - b,
  );
}

describe("offline Tree-sitter reference extractor", () => {
  it("is declared by the plugin next to symbol extraction", () => {
    const validated = validateKibiPlugin(plugin);
    assert.equal(
      validated.capabilities.referenceExtractor?.id,
      "kibi-plugin-treesitter.references.v1",
    );
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
    assert.deepEqual(await members(file, "string_args", { callee: "Printf" }), [
      "listening on %s %v %v\n",
    ]);
    assert.deepEqual(await members(file, "property", { key: "Mode" }), [
      "strict",
    ]);
  });

  it("refuses a computed Go environment name and reflective calls", async () => {
    const file = "go/refs-dynamic.go";
    // Reflection may reach a getter by any name, so env refuses there too.
    assert.deepEqual(await unresolvedLines(file, "env"), [9, 13]);
    assert.deepEqual(await unresolvedLines(file, "calls"), [13]);
  });

  it("reads Java imports, calls (with method references), environment variables and throws", async () => {
    const file = "java/RefsClean.java";
    assert.deepEqual(await members(file, "imports"), [
      "java.util.List",
      "java.util.concurrent.*",
    ]);
    assert.deepEqual(await members(file, "calls"), [
      "*.forEach",
      "List.of",
      "System.getenv",
      "System.out.println",
      "java.lang.System.getenv",
      "java.lang.System.out.println",
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
    assert.deepEqual(await unresolvedLines(file, "env"), [5, 6]);
  });

  it("reads C# usings, calls, environment variables, throws and initializer values", async () => {
    const file = "csharp/RefsClean.cs";
    assert.deepEqual(await members(file, "imports"), [
      "System",
      "System.Net.Http",
    ]);
    assert.deepEqual(await members(file, "calls"), [
      "Console.WriteLine",
      "Environment.GetEnvironmentVariable",
      "System.Console.WriteLine",
      "System.Environment.GetEnvironmentVariable",
    ]);
    assert.deepEqual(await members(file, "env"), ["PORT"]);
    assert.deepEqual(await members(file, "thrown"), [
      "InvalidOperationException",
    ]);
    assert.deepEqual(await members(file, "property", { key: "Mode" }), [
      "strict",
    ]);
  });

  it("refuses C# conditional compilation and reflection", async () => {
    const file = "csharp/RefsDynamic.cs";
    assert.deepEqual(await unresolvedLines(file, "imports"), [9]);
    assert.deepEqual(await unresolvedLines(file, "calls"), [9, 12, 13]);
  });

  it("reads Rust use trees, calls and environment variables, skipping cfg(test) items", async () => {
    const file = "rust/refs-clean.rs";
    assert.deepEqual(await members(file, "imports"), [
      "std::env",
      "std::io",
      "std::io::Write",
    ]);
    assert.deepEqual(await members(file, "calls"), [
      "*.unwrap_or_default",
      "env::var",
      "io::stdout",
      "out.flush",
      "out.write_all",
      "port.as_bytes",
      "std::env::var",
      "std::io::stdout",
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
    const broken = await extractor.extract({
      path: "src/a.go",
      content: "package a\nfunc (\n",
      extract: "calls",
    });
    assert.equal(broken.status, "failed");
    assert.match(broken.message, /is not valid Go/);
    const other = await extractor.extract({
      path: "a.rb",
      content: "puts 1\n",
      extract: "calls",
    });
    assert.equal(other.status, "unsupported");
  });
});

async function inline(path, content, extract, options = {}) {
  const result = await extractor.extract({
    path,
    content,
    extract,
    ...options,
  });
  assert.deepEqual(validateReferenceExtractionResult(result), result);
  assert.equal(result.status, "ok", JSON.stringify(result));
  return {
    members: [...new Set(result.members)].sort(),
    lines: [...new Set(result.unresolved.map((row) => row.line))].sort(
      (a, b) => a - b,
    ),
  };
}

describe("reads through names a file gives itself", () => {
  it("follows Go import aliases and refuses dot imports, handed-on getters and index calls", async () => {
    const aliased =
      'package a\nimport o "os"\nfunc f() { _ = o.Getenv("A"); _ = o.ExpandEnv("$B") }\n';
    const env = await inline("a.go", aliased, "env");
    assert.deepEqual(env.members, ["A"]);
    assert.deepEqual(env.lines, [3]);
    assert.ok(
      (await inline("a.go", aliased, "calls")).members.includes("os.Getenv"),
    );
    const dot = 'package a\nimport . "os"\nfunc f() { _ = Getenv("A") }\n';
    assert.deepEqual((await inline("a.go", dot, "env")).lines, [2]);
    assert.deepEqual((await inline("a.go", dot, "calls")).lines, [2]);
    const handed =
      'package a\nimport "os"\nfunc f() { g := os.Getenv; _ = g("A") }\n';
    assert.deepEqual((await inline("a.go", handed, "env")).lines, [3]);
    const indexed = "package a\nvar fs []func()\nfunc f() { fs[0]() }\n";
    assert.deepEqual((await inline("a.go", indexed, "calls")).lines, [3]);
    const plugin =
      'package a\nimport "plugin"\nfunc f() { p, _ := plugin.Open("x"); p.Lookup("F") }\n';
    assert.deepEqual((await inline("a.go", plugin, "calls")).lines, [3]);
  });

  it("follows Java static imports and qualified names, and refuses a getenv method reference", async () => {
    const single =
      'import static java.lang.System.getenv;\nclass A { void f() { getenv("A"); java.lang.System.getenv("B"); } }\n';
    const env = await inline("A.java", single, "env");
    assert.deepEqual(env.members, ["A", "B"]);
    assert.deepEqual(env.lines, []);
    const wildcard =
      'import static java.lang.System.*;\nclass A { void f() { getenv("A"); } }\n';
    assert.deepEqual((await inline("A.java", wildcard, "env")).lines, [1]);
    const reference =
      "class A { void f() { java.util.function.Function<String,String> g = System::getenv; } }\n";
    assert.deepEqual((await inline("A.java", reference, "env")).lines, [1]);
    const reflect =
      "class A { void f() throws Exception { java.lang.reflect.Method m = null; m.invoke(null); } }\n";
    assert.deepEqual((await inline("A.java", reflect, "calls")).lines, [1]);
  });

  it("follows C# using static and aliases, and refuses dynamic and handed-on getters", async () => {
    const usingStatic =
      'using static System.Environment;\nusing E = System.Environment;\nclass A { void F() { GetEnvironmentVariable("A"); E.GetEnvironmentVariable("B"); System.Environment.GetEnvironmentVariable("C"); } }\n';
    const env = await inline("A.cs", usingStatic, "env");
    assert.deepEqual(env.members, ["A", "B", "C"]);
    assert.deepEqual(env.lines, []);
    const expand =
      'class A { void F() { System.Environment.ExpandEnvironmentVariables("%X%"); } }\n';
    assert.deepEqual((await inline("A.cs", expand, "env")).lines, [1]);
    const group =
      "class A { void F() { System.Func<string,string> g = System.Environment.GetEnvironmentVariable; } }\n";
    assert.deepEqual((await inline("A.cs", group, "env")).lines, [1]);
    const dyn = "class A { void F(dynamic d) {\n var x = (dynamic)d;\n} }\n";
    assert.deepEqual((await inline("A.cs", dyn, "calls")).lines, [1, 2]);
    const create =
      'class A { void F() { System.Activator.CreateInstance(System.Type.GetType("X")); } }\n';
    assert.deepEqual((await inline("A.cs", create, "calls")).lines, [1]);
  });

  it("reads C# indexer and collection initializers", async () => {
    const source =
      'class A { void F() {\n var a = new System.Collections.Generic.Dictionary<string,string> { ["Mode"] = "strict" };\n var b = new System.Collections.Generic.Dictionary<string,string> { { "Mode", "loose" } };\n} }\n';
    assert.deepEqual(
      (await inline("A.cs", source, "property", { key: "Mode" })).members,
      ["loose", "strict"],
    );
  });

  it("follows Rust use bindings and refuses handed-on getters, qualified self paths and attribute macros", async () => {
    const bound =
      'use std::env::var;\nuse std::env::var as getvar;\nfn f() { let _ = var("A"); let _ = getvar("B"); }\n';
    const env = await inline("a.rs", bound, "env");
    assert.deepEqual(env.members, ["A", "B"]);
    assert.deepEqual(env.lines, []);
    const glob = 'use std::env::*;\nfn f() { let _ = var("A"); }\n';
    assert.deepEqual((await inline("a.rs", glob, "env")).lines, [1]);
    const handed =
      'use std::env;\nfn f() { let g = env::var; let _ = g("A"); }\n';
    assert.deepEqual((await inline("a.rs", handed, "env")).lines, [2]);
    const qualified =
      "trait T { fn m(); }\nstruct S;\nfn f() { <S as T>::m(); }\n";
    assert.deepEqual((await inline("a.rs", qualified, "calls")).lines, [3]);
    const attribute = "#[tokio::main]\nasync fn main() {}\n";
    assert.deepEqual((await inline("a.rs", attribute, "calls")).lines, [1]);
    const derive = "#[derive(serde::Serialize)]\nstruct S;\n";
    assert.deepEqual((await inline("a.rs", derive, "calls")).lines, [1]);
    const inert =
      "#[derive(Debug, Clone)]\n#[allow(dead_code)]\nstruct S;\nfn f() { let _ = S; }\n";
    assert.deepEqual((await inline("a.rs", inert, "calls")).lines, []);
  });
});

describe("agent-test regressions: no false proof", () => {
  it("refuses a Rust env read inside macro arguments", async () => {
    const source =
      'use std::env;\nfn f() {\n eprintln!("{}", env::var("SECRET_TOKEN").unwrap());\n let _ = env::var("A");\n}\n';
    const read = await inline("a.rs", source, "env");
    assert.deepEqual(read.members, ["A"]);
    assert.deepEqual(read.lines, [3]);
    const plain =
      'use std::env;\nfn f() { println!("{}", 1); let _ = env::var("A"); }\n';
    assert.deepEqual((await inline("a.rs", plain, "env")).lines, []);
    const args = 'fn f() { log!("x {}", target("y")); }\n';
    assert.deepEqual(
      (await inline("a.rs", args, "string_args", { callee: "target" })).lines,
      [1],
    );
  });

  it("reads Rust `self as` bindings and leaves a project module named env alone", async () => {
    const selfAs =
      'use std::env::{self as e2};\nfn f() { let _ = e2::var("A"); }\n';
    assert.deepEqual((await inline("a.rs", selfAs, "env")).members, ["A"]);
    const local =
      'mod env { pub fn var(_: &str) {} }\nfn f() { env::var("A"); }\n';
    assert.deepEqual((await inline("a.rs", local, "env")).members, []);
  });

  it("lists a Rust or Go function used as a value in calls", async () => {
    const rust = "use std::env;\nfn f() { let g = env::var; }\n";
    assert.ok(
      (await inline("a.rs", rust, "calls")).members.includes("std::env::var"),
    );
    const go =
      'package a\nimport "github.com/sirupsen/logrus"\nfunc f() { logf := logrus.Error; apply(logrus.Warn); _ = logf }\n';
    const calls = (await inline("a.go", go, "calls")).members;
    assert.ok(calls.includes("logrus.Error"), String(calls));
    assert.ok(calls.includes("logrus.Warn"), String(calls));
  });

  it("does not take a Go value named os for the os package", async () => {
    const source =
      'package a\ntype T struct{}\nfunc (T) Getenv(string) string { return "" }\nfunc f(os T) { _ = os.Getenv("A") }\n';
    assert.deepEqual((await inline("a.go", source, "env")).members, []);
    const imported =
      'package a\nimport "os"\nfunc f() { _ = os.Getenv("A") }\n';
    assert.deepEqual((await inline("a.go", imported, "env")).members, ["A"]);
  });

  it("lists Java and C# calls under both spellings", async () => {
    const java =
      'import static java.lang.System.getenv;\nclass A { void f() { getenv("A"); } }\n';
    const javaCalls = (await inline("A.java", java, "calls")).members;
    assert.ok(javaCalls.includes("java.lang.System.getenv"), String(javaCalls));
    assert.ok(javaCalls.includes("System.getenv"), String(javaCalls));
    const cs =
      'using static System.Environment;\nclass A { void F() { GetEnvironmentVariable("A"); } }\n';
    const csCalls = (await inline("A.cs", cs, "calls")).members;
    assert.ok(
      csCalls.includes("System.Environment.GetEnvironmentVariable"),
      String(csCalls),
    );
    const group =
      "class A { void F() { System.Func<string,string> g = System.Environment.GetEnvironmentVariable; } }\n";
    assert.ok(
      (await inline("A.cs", group, "calls")).members.includes(
        "Environment.GetEnvironmentVariable",
      ),
    );
  });

  it("reads C# global:: env reads and refuses env under reflection and dynamic", async () => {
    const qualified =
      'class A { void F() { global::System.Environment.GetEnvironmentVariable("A"); } }\n';
    assert.deepEqual((await inline("A.cs", qualified, "env")).members, ["A"]);
    const reflect =
      'class A { void F() { typeof(A).GetMethod("X").Invoke(null, null); System.Environment.GetEnvironmentVariable("B"); } }\n';
    assert.deepEqual((await inline("A.cs", reflect, "env")).lines, [1]);
    const dyn = "class A { void F(dynamic d) { d.Run(); } }\n";
    assert.deepEqual((await inline("A.cs", dyn, "env")).lines, [1]);
    const java =
      'class A { void f() throws Exception { Class.forName("X"); new ProcessBuilder("ls").environment(); } }\n';
    assert.deepEqual((await inline("A.java", java, "env")).lines, [1]);
  });
});
