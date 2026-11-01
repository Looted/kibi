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

/**
 * Rows the host drops once it has checked the project's other files (a
 * `System` class of the same Java package, a crate's `macro_rules!` named
 * like a std macro); the tests that are about them assert them directly.
 */
const SHADOW_ROW =
  /^(?:\w+ may be a class of (?:package [\w.]+|the default package)|\w+ may be a macro_rules! macro of the crate|\w+ may be a type of the project|\w+ may be declared in another file of the package): /;
const readRows = (result) =>
  result.unresolved.filter((row) => !SHADOW_ROW.test(row.text));

async function members(path, extract, options) {
  const result = await read(path, extract, options);
  assert.equal(result.status, "ok", JSON.stringify(result));
  assert.deepEqual(readRows(result), [], JSON.stringify(result.unresolved));
  return [...new Set(result.members)].sort();
}

async function unresolvedLines(path, extract, options) {
  const result = await read(path, extract, options);
  assert.equal(result.status, "ok", JSON.stringify(result));
  return [...new Set(readRows(result).map((row) => row.line))].sort(
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
      // An imported type is named by its import too.
      "java.util.List.of",
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
  const lines = (rows) =>
    [...new Set(rows.map((row) => row.line))].sort((a, b) => a - b);
  const shadows = result.unresolved.filter((row) => SHADOW_ROW.test(row.text));
  return {
    members: [...new Set(result.members)].sort(),
    lines: lines(readRows(result)),
    ...(shadows.length === 0 ? {} : { shadows: lines(shadows) }),
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

describe("round-2 agent-test regressions: exact or refuse", () => {
  const go = (lines) => `package a\n${lines.join("\n")}\n`;

  it("does not take a Go local os in a block, parameter, closure, range or type switch for the package", async () => {
    const source = go([
      'import "os"',
      "func f(v any) {",
      '\t_ = os.Getenv("REAL_BEFORE")',
      '\t{ os := fake{}; _ = os.Getenv("BLOCK") }',
      '\tg := func(os fake) { _ = os.Getenv("CLOSURE") }',
      '\tfor _, os := range fakes { _ = os.Getenv("RANGE") }',
      '\tswitch os := v.(type) { case fake: _ = os.Getenv("SWITCH") }',
      '\tselect { case os := <-ch: _ = os.Getenv("RECEIVE") }',
      '\tif os := (fake{}); true { _ = os.Getenv("IF") }',
      '\tfor os := (fake{}); ok; { _ = os.Getenv("FOR") }',
      '\t{ var os, b = fake{}, 1; _ = os.Getenv("VAR"); _ = b }',
      "\t{",
      "\t\tvar (",
      "\t\t\tos = fake{}",
      "\t\t)",
      '\t\t_ = os.Getenv("GROUP")',
      "\t}",
      "\t{ const os = 1; type c = int }",
      "\t_ = g",
      '\tos := os.Getenv("SELF")',
      "\t_ = os",
      "}",
      'func h(os fake) string { return os.Getenv("PARAM") }',
      'func (os fake) m() string { return os.Getenv("RECEIVER") }',
    ]);
    const env = await inline("a.go", source, "env");
    // `os := os.Getenv("SELF")` reads the package: a name binds after its
    // declaration ends.
    assert.deepEqual(env.members, ["REAL_BEFORE", "SELF"]);
    assert.deepEqual(env.lines, []);
    const calls = await inline("a.go", source, "calls");
    assert.ok(calls.members.includes("*.Getenv"), String(calls.members));
    assert.ok(calls.members.includes("os.Getenv"), String(calls.members));
  });

  it("does not take a Go package imported as os, or a non-standard os, for the standard library", async () => {
    const aliased = go([
      'import os "github.com/joho/godotenv"',
      'func f() { _ = os.Getenv("NOT_STD") }',
    ]);
    assert.deepEqual(await inline("a.go", aliased, "env"), {
      members: [],
      lines: [],
    });
    assert.deepEqual((await inline("a.go", aliased, "calls")).members, [
      '"github.com/joho/godotenv".Getenv',
    ]);
    const path = go([
      'import "example.com/fake/os"',
      'func f() { _ = os.Getenv("NOT_STD") }',
    ]);
    assert.deepEqual((await inline("a.go", path, "env")).members, []);
    const renamed = go([
      'import e "example.com/x/os"',
      'func f() { _ = e.Getenv("NOT_STD") }',
    ]);
    assert.deepEqual((await inline("a.go", renamed, "env")).members, []);
    // A versioned module path is used under its package name.
    const versioned = go([
      'import "github.com/go-chi/chi/v5"',
      'import "gopkg.in/yaml.v3"',
      "func f() { chi.NewRouter(); yaml.Marshal(nil) }",
    ]);
    assert.deepEqual((await inline("a.go", versioned, "calls")).members, [
      "chi.NewRouter",
      "yaml.Marshal",
    ]);
  });

  it("refuses Go env reads through cgo, linkname and an Environ method", async () => {
    const cgo = go([
      "// #include <stdlib.h>",
      'import "C"',
      'func f() { _ = C.GoString(C.getenv(C.CString("ADMIN_TOKEN"))) }',
    ]);
    assert.deepEqual((await inline("a.go", cgo, "env")).lines, [3]);
    const environ = go([
      'import "os/exec"',
      "func f() {",
      '\t_ = exec.Command("true").Environ()',
      '\tcmd := exec.Command("x")',
      "\t_ = cmd.Environ()",
      "\tenv := cmd.Environ",
      "\t_ = env",
      "}",
    ]);
    assert.deepEqual((await inline("a.go", environ, "env")).lines, [4, 6, 7]);
    const linkname = go([
      'import _ "unsafe"',
      "//go:linkname getenv os.Getenv",
      "func getenv(string) string",
      'func f() { getenv("X") }',
    ]);
    assert.deepEqual((await inline("a.go", linkname, "env")).lines, [3]);
    assert.deepEqual((await inline("a.go", linkname, "calls")).lines, [3]);
  });

  it("lists a Go method on a logger from a package under that package too", async () => {
    const source = go([
      'import "github.com/sirupsen/logrus"',
      "type service struct { log *logrus.Logger }",
      "type plain struct{ n int }",
      "func (s *service) Do(err error, p *plain) {",
      "\tlogrus.StandardLogger().Error(err)",
      "\tl := logrus.StandardLogger()",
      '\tl.Errorf("%v", err)',
      '\tlogrus.WithField("k", 1).WithError(err)',
      "\ts.log.Warn(err)",
      "\t(*logrus.Logger).Fatal(l, err)",
      "\t_ = err.Error()",
      "\tp.Close()",
      "\tlogrus.Infoln(err)",
      "\tundeclared.Run()",
      "\t(&logrus.Logger{}).Panic(err)",
      "\t[]plain{}[0].Open()",
      "}",
    ]);
    const calls = await inline("a.go", source, "calls");
    for (const name of [
      "logrus.Error",
      "logrus.Errorf",
      "logrus.WithError",
      "logrus.Warn",
      "logrus.Fatal",
      "logrus.Infoln",
      "logrus.Panic",
    ])
      assert.ok(calls.members.includes(name), `${name}: ${calls.members}`);
    // A method on a value of no package is only `*.name`.
    assert.ok(!calls.members.includes("logrus.Close"), String(calls.members));
    assert.ok(!calls.members.includes("logrus.Open"), String(calls.members));
    assert.ok(calls.members.includes("*.Close"), String(calls.members));
    // An undeclared qualifier is a package-level value of another file (or
    // a package whose name the reader cannot guess): an unknown receiver.
    assert.ok(calls.members.includes("*.Run"), String(calls.members));
    assert.ok(!calls.members.includes("undeclared.Run"), String(calls.members));
    assert.deepEqual(calls.lines, []);
    const args = go([
      'import "github.com/sirupsen/logrus"',
      'func f() { l := logrus.New(); l.Error("boom") }',
    ]);
    assert.deepEqual(
      (await inline("a.go", args, "string_args", { callee: "logrus.Error" }))
        .members,
      ["boom"],
    );
  });

  it("names Java receivers by their declared type, cast or factory and refuses unknown ones for JDK callees", async () => {
    const source = [
      "class K {",
      "  Runtime field;",
      "  void f(Runtime p, String... rest) {",
      '    String a = ((System) null).getenv("K_NULLCAST");',
      "    Runtime.getRuntime().exit(2);",
      "    java.lang.Runtime.getRuntime().halt(2);",
      "    Runtime r = Runtime.getRuntime();",
      "    r.exit(4);",
      "    p.exit(5);",
      "    this.field.exit(6);",
      "    for (Runtime e : all) { e.exit(7); }",
      "    new Thread(task).start();",
      "  }",
      "}",
    ].join("\n");
    assert.deepEqual(await inline("A.java", source, "env"), {
      members: ["K_NULLCAST"],
      lines: [],
      // Another file of the default package may declare a System class.
      shadows: [4],
    });
    const calls = await inline("A.java", source, "calls");
    for (const name of [
      "Runtime.exit",
      "java.lang.Runtime.exit",
      "Runtime.halt",
      "System.getenv",
      "Thread.start",
    ])
      assert.ok(calls.members.includes(name), `${name}: ${calls.members}`);
    assert.deepEqual(calls.lines, []);
    // An unknown receiver of a JDK callee's method may be that callee.
    const unknown = [
      "class K {",
      "  void f(java.util.function.Supplier<Runtime> s) {",
      "    s.get().exit(5);",
      "    var v = Runtime.getRuntime();",
      '    v.exec("rm");',
      "    inherited.halt(1);",
      "    Helper.exit(1);",
      '    java.util.function.Function<Cfg, String> fn = x -> x.getenv("L");',
      '    try (var t = open()) { t.load("lib"); } catch (Exception ex) { ex.exit(); }',
      "    other.list();",
      "    this.exit();",
      "    this.missing.exit();",
      "    (r).run.exit();",
      "    java.util.function.BiConsumer<A, B> bc = (u, w) -> w.halt(1);",
      "  }",
      "}",
    ].join("\n");
    assert.deepEqual(
      (await inline("A.java", unknown, "calls")).lines,
      [3, 5, 6, 7, 8, 9, 12, 13, 14],
    );
    assert.deepEqual((await inline("A.java", unknown, "env")).lines, [8]);
    assert.deepEqual(
      (
        await inline("A.java", unknown, "string_args", {
          callee: "Runtime.exec",
        })
      ).lines,
      [5],
    );
  });

  it("reads Java imports without comments or spaces and lets an import or a declared class shadow java.lang", async () => {
    const imports = [
      "import java.sql./*x*/Connection;",
      "import java . sql . Driver;",
      "import static java . lang . System . getenv;",
      'class A { void f() { getenv("S"); } }',
    ].join("\n");
    assert.deepEqual((await inline("A.java", imports, "imports")).members, [
      "java.lang.System.getenv",
      "java.sql.Connection",
      "java.sql.Driver",
    ]);
    assert.deepEqual((await inline("A.java", imports, "env")).members, ["S"]);
    const other =
      'import other.System;\nclass A { String a() { return System.getenv("K_OTHER"); } }\n';
    assert.deepEqual(await inline("A.java", other, "env"), {
      members: [],
      lines: [],
    });
    assert.deepEqual((await inline("A.java", other, "calls")).members, [
      "other.System.getenv",
    ]);
    const nested = [
      "package p;",
      "class J12 {",
      "  static class System { static String getenv(String k) { return k; } }",
      '  String a() { return System.getenv("SHADOWED"); }',
      "}",
      'class B { String b() { return System.getenv("REAL"); } }',
    ].join("\n");
    assert.deepEqual(await inline("A.java", nested, "env"), {
      members: ["REAL"],
      lines: [],
      shadows: [6],
    });
    assert.ok(
      (await inline("A.java", nested, "calls")).members.includes(
        "p.J12.System.getenv",
      ),
    );
    const unnamed =
      'class J12 { static class System {} String a() { return System.getenv("N"); } }\n';
    assert.deepEqual((await inline("A.java", unnamed, "calls")).members, [
      "J12.System.getenv",
    ]);
    // A top-level System of the default package has no other name: refused.
    const top =
      'class System { static String getenv(String k) { return k; } String a() { return System.getenv("X"); } }\n';
    assert.deepEqual((await inline("A.java", top, "env")).lines, [1]);
    // A local variable named System obscures the type.
    const local =
      'class A { String a() { Cfg System = new Cfg(); return System.getenv("L"); } }\n';
    assert.deepEqual(await inline("A.java", local, "env"), {
      members: [],
      lines: [1],
    });
  });

  it("refuses a C# bare call the file cannot place and qualifies one it can", async () => {
    const source = [
      "using static App.Program;",
      "namespace App.Events",
      "{",
      "    class ReadyEvent",
      "    {",
      "        System.Func<int> handler;",
      "        async void Run(System.Action done)",
      "        {",
      '            await RunShellCommand("git pull");',
      "            Helper();",
      "            done();",
      "            handler();",
      "            void Local() {}",
      "            Local();",
      "            System.Action<int> cb = (n) => n.ToString();",
      "            System.Action<int> cb2 = n => n.ToString();",
      "            System.Action<System.Action> cb3 = x => x();",
      "            foreach (var f in handlers) { f(); }",
      "            global::Tools.Run();",
      "            System.Start();",
      "        }",
      "        void Helper() {}",
      "    }",
      "}",
    ].join("\n");
    const calls = await inline("A.cs", source, "calls");
    assert.deepEqual(calls.lines, [9]);
    for (const name of [
      "Helper",
      "ReadyEvent.Helper",
      "App.Events.ReadyEvent.Helper",
      "done",
      "handler",
      "Local",
      "x",
      "f",
      "global::Tools.Run",
      "Tools.Run",
      "Start",
    ])
      assert.ok(calls.members.includes(name), `${name}: ${calls.members}`);
    assert.ok(
      !calls.members.includes("App.Program.RunShellCommand"),
      String(calls.members),
    );
    assert.deepEqual(
      (
        await inline("A.cs", source, "string_args", {
          callee: "App.Helpers.ShellCommand.RunShellCommand",
        })
      ).lines,
      [9],
    );
    // A file-scoped namespace names the owner too.
    const scoped =
      "namespace N.M;\nclass A { void F() { G(); } void G() {} }\n";
    assert.ok(
      (await inline("A.cs", scoped, "calls")).members.includes("N.M.A.G"),
    );
  });

  it("refuses C# env reads a project-wide using static or alias may supply", async () => {
    const global = [
      "class C16",
      "{",
      "    void F()",
      "    {",
      '        var a = GetEnvironmentVariable("C_VIA_GLOBAL_STATIC");',
      '        var b = GE.GetEnvironmentVariable("C_VIA_GLOBAL_ALIAS");',
      "        Run(GetEnvironmentVariables);",
      "    }",
      "}",
    ].join("\n");
    assert.deepEqual(await inline("A.cs", global, "env"), {
      members: [],
      lines: [5, 6, 7],
    });
    assert.deepEqual((await inline("A.cs", global, "calls")).lines, [5, 6, 7]);
    assert.deepEqual(
      (
        await inline("A.cs", global, "string_args", {
          callee: "System.Environment.GetEnvironmentVariable",
        })
      ).lines,
      [5, 6],
    );
    // Two `using static` types may both own the name.
    const two = [
      "using static System.Environment;",
      "using static App.Program;",
      'class C { void F() { GetEnvironmentVariable("TWO"); } }',
    ].join("\n");
    assert.deepEqual((await inline("A.cs", two, "env")).lines, [3]);
    // A method the file declares is the file's own.
    const own =
      'class C { string GetEnvironmentVariable(string k) => k; void F() { GetEnvironmentVariable("OWN"); var x = nameof(GetEnvironmentVariable); } }\n';
    assert.deepEqual(await inline("A.cs", own, "env"), {
      members: [],
      lines: [],
    });
  });

  it("lists a C# using static method group and reads verbatim identifiers", async () => {
    const group = [
      "using static System.Environment;",
      'class C05 { void F() { System.Func<string, string?> g = GetEnvironmentVariable; g("X"); } }',
    ].join("\n");
    const calls = await inline("A.cs", group, "calls");
    assert.ok(
      calls.members.includes("System.Environment.GetEnvironmentVariable"),
      String(calls.members),
    );
    assert.deepEqual((await inline("A.cs", group, "env")).lines, [2]);
    const verbatim = [
      "using @System;",
      "class N04",
      "{",
      '    void F() { @Environment.@GetEnvironmentVariable("N_VERBATIM_ID"); }',
      "    System.Func<string, string?> G() { return Environment.GetEnvironmentVariable; }",
      "}",
    ].join("\n");
    assert.deepEqual((await inline("A.cs", verbatim, "env")).members, [
      "N_VERBATIM_ID",
    ]);
    const verbatimCalls = (await inline("A.cs", verbatim, "calls")).members;
    assert.ok(
      verbatimCalls.includes("System.Environment.GetEnvironmentVariable"),
      String(verbatimCalls),
    );
    assert.ok(
      (await inline("A.cs", verbatim, "imports")).members.includes("System"),
    );
  });

  it("refuses Rust env reads and imports a project macro, include! or nested env! may hide", async () => {
    const env = [
      "use std::env;",
      'macro_rules! secret { () => { env::var("SECRET_TOKEN") }; }',
      "fn f() {",
      "    let _t = secret!();",
      '    include!("hidden.inc");',
      '    let _n = concat!(env!("CARGO_PKG_NAME"), "-", env!("HIDDEN"));',
      '    let _v = env::var_os("SHOWN");',
      '    println!("{}", 1);',
      "}",
    ].join("\n");
    assert.deepEqual(await inline("a.rs", env, "env"), {
      members: ["SHOWN"],
      lines: [4, 5, 6],
      shadows: [6, 8],
    });
    const imports = [
      "macro_rules! bring_env { () => { use std::env; }; }",
      'fn f() -> bool { bring_env!(); env::var_os("HOME").is_some() }',
    ].join("\n");
    assert.deepEqual((await inline("a.rs", imports, "imports")).lines, [2]);
    // Known crates' formatting macros, by the path the file gives them.
    const crates = [
      "use anyhow::bail;",
      'fn f() -> anyhow::Result<()> { log::info!("x"); anyhow::ensure!(true, "y"); bail!("z") }',
      'mod m { pub fn g() { bail!("unbound here"); } }',
    ].join("\n");
    assert.deepEqual((await inline("a.rs", crates, "env")).lines, [3]);
    const named = [
      "use anyhow::{anyhow, Result};",
      'fn f() -> Result<()> { Err(anyhow!("x")) }',
      "#[derive(clap::Parser)]",
      "struct Cli {",
      '    #[arg(long, env = "CLI_TOKEN")]',
      "    token: String,",
      "    #[allow(dead_code)]",
      "    plain: u8,",
      "}",
    ].join("\n");
    // clap's derive reads the environment where its helper says `env`.
    assert.deepEqual((await inline("a.rs", named, "env")).lines, [5]);
    // A file's own macro named like a standard one is the file's.
    const shadow =
      'macro_rules! println { () => { std::env::var("X") }; }\nfn f() { println!(); }\n';
    assert.deepEqual((await inline("a.rs", shadow, "env")).lines, [2]);
    assert.deepEqual(
      (
        await inline("a.rs", shadow, "string_args", {
          callee: "Command::new",
        })
      ).lines,
      [2],
    );
  });

  it("follows Rust aliases, re-exports in the file, extern crate and self, and refuses what it cannot follow", async () => {
    const args = [
      "use std::process::Command as C;",
      'fn f() { C::new("git"); dbg!(C::new("rm")); }',
    ].join("\n");
    assert.deepEqual(
      await inline("a.rs", args, "string_args", { callee: "Command::new" }),
      { members: ["git"], lines: [2], shadows: [2] },
    );
    const followed = [
      "extern crate std as s;",
      "use std::env;",
      "mod helper { pub use std::env::var as read_it; }",
      "mod m { pub use std::env; pub mod deep { pub use super::env as e; } }",
      "fn f() {",
      '    helper::read_it("REEXPORT");',
      '    m::env::var("MODULE");',
      '    m::deep::e::var("SUPER");',
      '    s::env::var("EXTERN");',
      '    self::env::var("SELF");',
      '    ::std::env::var("ABSOLUTE");',
      "}",
    ].join("\n");
    assert.deepEqual(await inline("a.rs", followed, "env"), {
      members: ["ABSOLUTE", "EXTERN", "MODULE", "REEXPORT", "SELF", "SUPER"],
      lines: [],
    });
    const calls = await inline("a.rs", followed, "calls");
    assert.ok(calls.members.includes("std::env::var"), String(calls.members));
    assert.ok(calls.members.includes("helper::read_it"), String(calls.members));
    const local = [
      "use std::env;",
      'fn f() { mod env { pub fn var(_: &str) {} } env::var("SHADOWED"); }',
      'fn g() { env::var("REAL"); }',
      'mod inner { use std::env; pub fn h() { env::var("INNER"); } }',
    ].join("\n");
    assert.deepEqual(await inline("a.rs", local, "env"), {
      members: ["INNER", "REAL"],
      lines: [],
    });
    const unknown = [
      "mod config;",
      "fn f() {",
      '    crate::settings::var("CRATE");',
      '    dotenvy::var("OTHER_CRATE");',
      '    super::env::var("SUPER");',
      '    config::var("MODULE_FILE");',
      '    Config::new("ok");',
      '    ::other::var("ABSOLUTE");',
      "}",
    ].join("\n");
    assert.deepEqual(await inline("a.rs", unknown, "env"), {
      members: [],
      lines: [3, 4, 5, 6, 8],
    });
    assert.deepEqual(
      (await inline("a.rs", unknown, "calls")).lines,
      [3, 4, 5, 6, 8],
    );
    assert.deepEqual(
      (await inline("a.rs", unknown, "string_args", { callee: "env::var" }))
        .lines,
      [3, 4, 5, 6, 8],
    );
  });
});

describe("round-3 agent-test regressions: exact or refuse", () => {
  const go = (lines) => `package a\n${lines.join("\n")}\n`;

  it("reads Go x/sys/unix and x/sys/windows environment getters by import path", async () => {
    const source = go([
      'import "golang.org/x/sys/unix"',
      'import w "golang.org/x/sys/windows"',
      "func f() {",
      '\t_, _ = unix.Getenv("UNIX_ENV")',
      '\t_, _ = w.Getenv("WIN_ENV")',
      "\t_ = unix.Environ()",
      "\t_ = w.Environ()",
      "}",
    ]);
    assert.deepEqual(await inline("a.go", source, "env"), {
      members: ["UNIX_ENV", "WIN_ENV"],
      lines: [7, 8],
    });
    // Another package used under the name unix is not x/sys/unix.
    const other = go([
      'import "example.com/unix"',
      'func f() { _ = unix.Getenv("OTHER") }',
    ]);
    assert.deepEqual(await inline("a.go", other, "env"), {
      members: [],
      lines: [],
    });
    assert.deepEqual((await inline("a.go", other, "calls")).members, [
      '"example.com/unix".Getenv',
    ]);
  });

  it("lists a Go logger held in a package var, returned by a helper or bound as a method value", async () => {
    const source = go([
      'import "github.com/sirupsen/logrus"',
      "var log = logrus.New()",
      "func f(err error) {",
      "\tlog.Error(err)",
      "\tother.Warn(err)",
      "\tlogger().Info(err)",
      "\tl := logrus.StandardLogger()",
      "\tg := l.Errorf",
      "\th(l.Fatal, T{F: u.Debug})",
      "\tu.n = 1",
      "\tg(err)",
      "}",
    ]);
    const calls = await inline("a.go", source, "calls");
    for (const name of [
      "logrus.Error",
      "logrus.Errorf",
      "logrus.Fatal",
      "*.Warn",
      "*.Info",
      "*.Debug",
    ])
      assert.ok(calls.members.includes(name), `${name}: ${calls.members}`);
    // A qualifier no import names is never listed as a package.
    for (const name of ["log.Error", "other.Warn", "u.Debug", "*.n"])
      assert.ok(!calls.members.includes(name), `${name}: ${calls.members}`);
    assert.deepEqual(calls.lines, []);
  });

  it("reads a Rust path with a comment inside as the path", async () => {
    const source = [
      "use std::/* process environment */env;",
      "fn f() {",
      '    std::/*c*/env::var_os("BLOCK");',
      "    std:://c",
      '    env::var("LINE");',
      '    env::var("VIA_USE");',
      '    println!("http://{}", std::/*x*/env::var("IN_MACRO"));',
      "}",
    ].join("\n");
    assert.deepEqual((await inline("a.rs", source, "imports")).members, [
      "std::env",
    ]);
    assert.deepEqual(await inline("a.rs", source, "env"), {
      members: ["BLOCK", "LINE", "VIA_USE"],
      lines: [7],
      shadows: [7],
    });
    assert.ok(
      (await inline("a.rs", source, "calls")).members.includes(
        "std::env::var_os",
      ),
    );
  });

  it("marks a bare Rust std macro another file's macro_rules! may shadow, and refuses one a glob may bring", async () => {
    const source = [
      "fn f() {",
      '    println!("hello");',
      '    std::println!("qualified");',
      '    let _ = std::env::var("SHOWN");',
      "}",
    ].join("\n");
    for (const extract of ["env", "imports"])
      assert.deepEqual(await inline("a.rs", source, extract), {
        members: extract === "env" ? ["SHOWN"] : [],
        lines: [],
        shadows: [2],
      });
    assert.deepEqual(
      (await inline("a.rs", source, "string_args", { callee: "Command::new" }))
        .shadows,
      [2],
    );
    const globbed = [
      "use crate::macros::*;",
      "use std::io::*;",
      'fn f() { println!("hello"); std::println!("qualified"); }',
    ].join("\n");
    assert.deepEqual(await inline("a.rs", globbed, "env"), {
      members: [],
      lines: [3],
    });
  });

  it("follows a Rust type alias and refuses string_args through one it cannot follow or a qualified self", async () => {
    const source = [
      "type C = std::process::Command;",
      "type G<T> = Wrapper<T>;",
      'fn f() { C::new("rm"); G::new("hidden"); <std::process::Command>::new("ls"); <S as T>::new("x"); }',
    ].join("\n");
    assert.deepEqual(
      await inline("a.rs", source, "string_args", {
        callee: "std::process::Command::new",
      }),
      { members: ["rm"], lines: [3] },
    );
    const rows = await extractor.extract({
      path: "a.rs",
      content: source,
      extract: "string_args",
      callee: "Command::new",
    });
    assert.deepEqual(
      rows.unresolved.map((row) => row.text.slice(0, 12)),
      ['G::new("hidd', "<std::proces", "<S as T>::ne"],
    );
    // Another callee's name is not refused.
    assert.deepEqual(
      await inline("a.rs", source, "string_args", { callee: "Other::open" }),
      { members: [], lines: [] },
    );
  });

  it("refuses Rust env through a local glob re-export and a procedural attribute", async () => {
    const glob = [
      "mod inner { pub use std::env::var; }",
      "use inner::*;",
      'pub fn x() -> bool { var("R23").is_ok() }',
      "fn y() { helper(); }",
    ].join("\n");
    assert.deepEqual(await inline("a.rs", glob, "env"), {
      members: [],
      lines: [3],
    });
    assert.deepEqual(
      (await inline("a.rs", glob, "string_args", { callee: "env::var" })).lines,
      [2, 3],
    );
    // A glob in a `#[cfg(test)]` module is not read with it.
    const tests = [
      'pub fn x() -> bool { std::env::var("REAL").is_ok() }',
      "#[cfg(test)]",
      "mod tests { use super::*; fn t() { x(); } }",
    ].join("\n");
    assert.deepEqual(await inline("a.rs", tests, "env"), {
      members: ["REAL"],
      lines: [],
    });
    assert.deepEqual((await inline("a.rs", tests, "calls")).lines, []);
    const attributes = [
      "use my_macros::inject_env;",
      "#[inject_env]",
      "pub fn x() -> bool { true }",
      "#[derive(my_macros::FromEnv)]",
      "pub struct Cfg { pub token: String }",
      "#[derive(Debug, Clone)]",
      "#[allow(dead_code)]",
      "pub struct Plain;",
    ].join("\n");
    assert.deepEqual(await inline("a.rs", attributes, "env"), {
      members: [],
      lines: [2, 4],
    });
    // The known crates' derives and their helpers generate no reads,
    // unless a helper says `env` or names the callee.
    const known = [
      "use serde::Deserialize;",
      "use my::value;",
      "#[derive(Clone, Deserialize, serde::Serialize, clap::Parser)]",
      "struct Cli {",
      '    #[serde(rename = "x")]',
      '    #[arg(long, env = "CLI_TOKEN")]',
      '    #[error("{}", Command::new("rm"))]',
      "    #[value]",
      "    token: String,",
      "}",
    ].join("\n");
    assert.deepEqual((await inline("a.rs", known, "env")).lines, [6, 8]);
    assert.deepEqual(
      (await inline("a.rs", known, "string_args", { callee: "Command::new" }))
        .lines,
      [6, 7, 8],
    );
    assert.deepEqual(
      (
        await inline("a.rs", attributes, "string_args", {
          callee: "Command::new",
        })
      ).lines,
      [2, 4],
    );
  });

  it("lists a Java call on an imported type under its fully qualified name too", async () => {
    const source = [
      "import java.io.File;",
      "class L21 {",
      '  void b() { File f = new File("y"); f.delete(); }',
      '  void c() { new File("z").delete(); File.createTempFile("a", "b"); }',
      "}",
    ].join("\n");
    const calls = await inline("A.java", source, "calls");
    assert.deepEqual(calls.members, [
      "File.createTempFile",
      "File.delete",
      "java.io.File.createTempFile",
      "java.io.File.delete",
    ]);
  });

  it("marks a Java System or Runtime another file of the package may declare", async () => {
    const source = [
      "package e3;",
      "class L04 {",
      '  String a() { return System.getenv("L_SAMEPKG"); }',
      "  void b() { Runtime.getRuntime().exit(1); }",
      "  void c() { list.forEach(System.out::println); }",
      "  void d() { Math.max(1, 2); }",
      "}",
    ].join("\n");
    const rows = await extractor.extract({
      path: "A.java",
      content: source,
      extract: "env",
    });
    // The read is as usual; the row is dropped by the host once it has
    // found no System class in the package.
    assert.deepEqual(rows.members, ["L_SAMEPKG"]);
    assert.deepEqual(rows.unresolved, [
      {
        line: 3,
        text: 'System may be a class of package e3: System.getenv("L_SAMEPKG")',
      },
    ]);
    assert.deepEqual(
      (await inline("A.java", source, "calls")).shadows,
      [3, 4, 5],
    );
    assert.deepEqual(
      (
        await inline("A.java", source, "string_args", {
          callee: "System.getenv",
        })
      ).shadows,
      [3],
    );
    // Imported or qualified, it is java.lang's.
    for (const spelled of [
      'import java.lang.System;\nclass A { String a() { return System.getenv("X"); } }',
      'class A { String a() { return java.lang.System.getenv("X"); } }',
    ])
      assert.deepEqual(await inline("A.java", spelled, "env"), {
        members: ["X"],
        lines: [],
      });
  });

  it("refuses a Java System a supertype, an interface field or a static import may name", async () => {
    const inherited = [
      "package e3;",
      "class Base5 { static class System { static String getenv(String k) { return k; } } }",
      'class L05 extends Base5 { String a() { return System.getenv("INHERITED"); } }',
      "interface HasSys { Env System = new Env(); }",
      'class L24 implements HasSys { String a() { return System.getenv("IFACE"); } }',
      'class Ext extends Unknown<String> { String a() { return System.getenv("EXTERNAL"); } }',
      "class Plain extends Base5.Other {}",
      'class Anon { Object o = new Unknown() { String a() { return System.getenv("ANON"); } }; }',
      'class Arg { Object o = new Known(System.getenv("ARG")) { }; }',
      "class Known {}",
      'enum En implements HasSys { X; String a() { return System.getenv("ENUM"); } }',
      "interface I2 extends HasSys {}",
      'record R(int a) implements I2 { String b() { return System.getenv("RECORD"); } }',
      "interface P {} interface Q extends P {}",
      'class D implements Q, P { String d() { return System.getenv("DIAMOND"); } }',
    ].join("\n");
    const env = await inline("A.java", inherited, "env");
    // A supertype the file declares and that names no System is read
    // through, however often it is reached.
    assert.deepEqual(env.members, ["ARG", "DIAMOND"]);
    assert.deepEqual(env.lines, [3, 5, 6, 8, 11, 13]);
    const field = [
      "package e3;",
      "import static e3.Holder.System;",
      'class L26 { String a() { return System.getenv("STATIC_FIELD"); } }',
    ].join("\n");
    assert.deepEqual(await inline("A.java", field, "env"), {
      members: [],
      lines: [3],
    });
  });

  it("lets a Java member method shadow a static import, and refuses one a supertype may declare", async () => {
    const own = [
      "import static java.lang.System.getenv;",
      "import static java.lang.System.exit;",
      "class J13 {",
      '  static String getenv(String k) { return "local"; }',
      '  String a() { return getenv("FAKE"); }',
      "  static class Inner { static void exit(int c) {} void b() { exit(15); } }",
      "}",
    ].join("\n");
    assert.deepEqual(await inline("A.java", own, "env"), {
      members: [],
      lines: [],
    });
    assert.deepEqual((await inline("A.java", own, "calls")).members, [
      "exit",
      "getenv",
    ]);
    const inherited = [
      "import static java.lang.System.getenv;",
      "class Base { static String getenv(String k) { return k; } }",
      'class A extends Base { String a() { return getenv("BASE"); } }',
      'class B extends Unknown { String b() { return getenv("UNKNOWN"); } }',
      'class C { String c() { return getenv("REAL"); } }',
    ].join("\n");
    assert.deepEqual(await inline("A.java", inherited, "env"), {
      members: ["REAL"],
      lines: [4],
    });
    assert.deepEqual((await inline("A.java", inherited, "calls")).lines, [4]);
    assert.deepEqual(
      (
        await inline("A.java", inherited, "string_args", {
          callee: "System.getenv",
        })
      ).lines,
      [4],
    );
    assert.deepEqual(
      (
        await inline("A.java", inherited, "string_args", {
          callee: "Other.run",
        })
      ).lines,
      [],
    );
    // Any other static import there is a method of an unknown owner.
    const guava = [
      "import static com.google.common.base.Strings.isNullOrEmpty;",
      'class J extends Json { boolean a() { return isNullOrEmpty("s"); } }',
    ].join("\n");
    assert.deepEqual(await inline("A.java", guava, "calls"), {
      members: ["*.isNullOrEmpty"],
      lines: [],
    });
    assert.deepEqual(
      (
        await inline("A.java", guava, "string_args", {
          callee: "Strings.isNullOrEmpty",
        })
      ).lines,
      [2],
    );
    assert.deepEqual(
      (
        await inline("A.java", guava, "string_args", {
          callee: "Strings.repeat",
        })
      ).lines,
      [],
    );
  });

  it("lists a C# method group in a cast, a ternary or an initializer", async () => {
    const source = [
      "using System;",
      "using static Lib.Shell;",
      "class A {",
      "  void M(bool b) {",
      "    var a = (Action<string>)Run;",
      "    var c = (Func<string, string>)(Helpers.Format);",
      "    Func<string, string> f = b ? Helpers.Trim : (s => s);",
      "    var h = new Action[] { Stop };",
      "    Call(name: b);",
      "    var t = b ? 1 : 2;",
      "  }",
      "}",
    ].join("\n");
    const calls = await inline("A.cs", source, "calls");
    assert.deepEqual(calls.members, [
      "*.Run",
      "*.Stop",
      "Helpers.Format",
      "Helpers.Trim",
    ]);
    // `Call` itself is a bare call no binding places; its named argument
    // `name` is not a value.
    assert.deepEqual(calls.lines, [9]);
    const env = [
      "using System;",
      "class Q {",
      "  void M(bool b) {",
      '    var f = (Func<string, string?>)Environment.GetEnvironmentVariable; f("Q01");',
      "    Func<string, string?> g = b ? Environment.GetEnvironmentVariable : (s => s);",
      "  }",
      "}",
    ].join("\n");
    assert.deepEqual((await inline("A.cs", env, "env")).lines, [4, 5]);
  });

  it("does not read a C# value or type named Environment as System.Environment", async () => {
    const source = [
      "using System;",
      "class Fake { public void Exit(int c) {} }",
      "class T01 {",
      "  Fake Environment2 { get; }",
      "  void M(Fake p) {",
      "    var Environment = new Fake();",
      "    Environment.Exit(1);",
      '    Environment.GetEnvironmentVariable("T01_FAKE");',
      "    Func<int> g = Environment.GetHashCode;",
      "  }",
      "}",
      "class T03 {",
      "  Fake Environment { get; }",
      "  bool Dev() => Environment.IsDevelopment();",
      "}",
    ].join("\n");
    const calls = await inline("A.cs", source, "calls");
    assert.ok(calls.members.includes("*.Exit"), String(calls.members));
    assert.ok(calls.members.includes("*.IsDevelopment"), String(calls.members));
    assert.ok(calls.members.includes("*.GetHashCode"), String(calls.members));
    assert.ok(
      !calls.members.some((name) => name.startsWith("System.")),
      String(calls.members),
    );
    assert.deepEqual(await inline("A.cs", source, "env"), {
      members: [],
      lines: [8],
    });
    const ownType = [
      "namespace App.Inner { static class Environment { public static string GetEnvironmentVariable(string k) => k; } }",
      'class T04 { string A() => App.Inner.Environment.GetEnvironmentVariable("A") + Environment.GetEnvironmentVariable("T04"); }',
    ].join("\n");
    assert.deepEqual((await inline("A.cs", ownType, "env")).lines, [1, 2]);
    // In a class whose base type the file does not show, Environment may
    // be an inherited member.
    const inherited = [
      "using System;",
      "class Local {}",
      'class W : Local { string A() => Environment.GetEnvironmentVariable("KNOWN_BASE"); }',
      'class V : Controller { string A() => Environment.GetEnvironmentVariable("UNKNOWN_BASE"); }',
      "class U { void M() { this.Run(); base.Stop(); } }",
    ].join("\n");
    assert.deepEqual(await inline("A.cs", inherited, "env"), {
      members: ["KNOWN_BASE"],
      lines: [4],
      // Environment may be a type another file of the project declares.
      shadows: [3],
    });
  });
});

describe("round-4 agent-test regressions: exact or refuse", () => {
  it("reads a Rust raw identifier in a path as the identifier it spells", async () => {
    const source = [
      "use std::r#env;",
      "use std::process::exit as r#quit;",
      "mod r#inner { pub fn r#run() {} }",
      "fn f(x: S) {",
      "    std::r#process::exit(1);",
      '    let _ = std::r#env::var("RAW_PATH");',
      '    let _ = r#env::var_os("RAW_USE");',
      "    std::process::r#exit(3);",
      "    r#quit(2);",
      "    x.r#method();",
      "    let g = std::r#process::abort;",
      "    r#inner::r#run();",
      '    let s = "r#not_a_path";',
      "}",
    ].join("\n");
    assert.deepEqual((await inline("a.rs", source, "imports")).members, [
      "std::env",
      "std::process::exit",
    ]);
    const calls = await inline("a.rs", source, "calls");
    for (const name of [
      "std::process::exit",
      "std::env::var",
      "std::env::var_os",
      "quit",
      "x.method",
      "std::process::abort",
      "inner::run",
    ])
      assert.ok(calls.members.includes(name), `${name}: ${calls.members}`);
    assert.ok(
      !calls.members.some((name) => name.includes("r#")),
      String(calls.members),
    );
    assert.deepEqual(await inline("a.rs", source, "env"), {
      members: ["RAW_PATH", "RAW_USE"],
      lines: [],
    });
    // A raw identifier inside a macro's tokens is the path it spells.
    const macro = 'fn f() { println!("{:?}", std::r#env::var("IN_MACRO")); }';
    assert.deepEqual((await inline("a.rs", macro, "env")).lines, [1]);
    // A raw string is not a raw identifier.
    const raw = 'fn f() { std::env::var(r#"RAW_STR"#); }';
    assert.deepEqual((await inline("a.rs", raw, "env")).members, ["RAW_STR"]);
  });

  it("lists a C# method group in a switch arm, ??, yield, lambda body, ! or collection as a call", async () => {
    const forms = [
      "Action<int> a = k switch { 1 => Environment.Exit, _ => c => { } };",
      "Action<int> a = g ?? Environment.Exit;",
      "Action<int> a = Environment.Exit ?? g;",
      "Run(() => Environment.Exit);",
      "Action<int> a = Environment.Exit!;",
      "Run(b ? Environment.Exit! : null!);",
      "var a = new { F = Environment.Exit };",
      "Action<int>[] a = [Environment.Exit];",
      "Run((Environment.Exit, 1));",
      "Run(k switch { 1 => Helpers.Stop, _ => Helpers.Go });",
    ];
    for (const form of forms) {
      const source = [
        "using System;",
        "class V {",
        `  static void M(int k, Action<int> g, bool b) { ${form} }`,
        "}",
      ].join("\n");
      const calls = await inline("A.cs", source, "calls");
      const expected = form.includes("Helpers")
        ? "Helpers.Stop"
        : "System.Environment.Exit";
      assert.ok(calls.members.includes(expected), `${form}: ${calls.members}`);
    }
    const yielded = [
      "using System;",
      "class V {",
      "  static IEnumerable<Action<int>> G() { yield return Environment.Exit; }",
      "}",
    ].join("\n");
    assert.ok(
      (await inline("A.cs", yielded, "calls")).members.includes(
        "System.Environment.Exit",
      ),
    );
    // The switch's subject and an arm's pattern are no method groups.
    const subject = [
      "using System;",
      "class V { static int M(Mode m) => m switch { Mode.A => 1, _ => 0 }; }",
    ].join("\n");
    assert.deepEqual((await inline("A.cs", subject, "calls")).members, []);
    // An environment getter as a method group in those forms refuses env.
    const env = [
      "using System;",
      "class V {",
      "  static void M(int k, Func<string, string?> g) {",
      "    var a = k switch { 1 => Environment.GetEnvironmentVariable, _ => g };",
      "    var b = g ?? Environment.GetEnvironmentVariable;",
      "    Run(() => Environment.GetEnvironmentVariable);",
      "    Func<string, string?> c = Environment.GetEnvironmentVariable!;",
      "  }",
      "  static IEnumerable<Func<string, string?>> G() { yield return Environment.GetEnvironmentVariable; }",
      "}",
    ].join("\n");
    assert.deepEqual(await inline("A.cs", env, "env"), {
      members: [],
      lines: [4, 5, 6, 7, 9],
      shadows: [4, 5, 6, 7, 9],
    });
  });

  it("does not read a C# Environment bound by a pattern, out var, deconstruction, query or primary constructor as System.Environment", async () => {
    const bindings = [
      ["void M(object o) { if (o is Fake Environment) ", " }"],
      ["void M(object o) { if (o is var Environment) ", " }"],
      ["void M(object o) { if (o is Fake { } Environment) ", " }"],
      ["void M() { if (Try(out var Environment)) ", " }"],
      ["void M() { if (Try(out Fake Environment)) ", " }"],
      ["void M() { var (Environment, z) = P(); ", " }"],
      [
        "void M(Fake[] xs) { var q = from Environment in xs select Environment; ",
        " }",
      ],
    ];
    for (const [head, tail] of bindings) {
      const source = [
        "using System;",
        `class U { ${head}Environment.Exit(1);${tail} }`,
        `class W { ${head}Environment.GetEnvironmentVariable("FAKE");${tail} }`,
      ].join("\n");
      const calls = await inline("A.cs", source, "calls");
      assert.ok(calls.members.includes("*.Exit"), `${head}: ${calls.members}`);
      assert.ok(
        !calls.members.some((name) => name.startsWith("System.Environment")),
        `${head}: ${calls.members}`,
      );
      assert.deepEqual(
        await inline("A.cs", source, "env"),
        { members: [], lines: [3] },
        head,
      );
    }
    const primary = [
      "using System;",
      "class U08(Fake Environment) {",
      "  void M() => Environment.Exit(10);",
      '  string E() => Environment.GetEnvironmentVariable("U08");',
      "}",
    ].join("\n");
    assert.ok(
      (await inline("A.cs", primary, "calls")).members.includes("*.Exit"),
    );
    assert.deepEqual(await inline("A.cs", primary, "env"), {
      members: [],
      lines: [4],
    });
  });

  it("does not read a C# using alias named Environment as System.Environment", async () => {
    const source = [
      "using Environment = Lib.FakeEnvironment;",
      "class U10 {",
      "  void M() { Environment.Exit(1); }",
      '  string E() => Environment.GetEnvironmentVariable("U10");',
      "}",
    ].join("\n");
    const calls = await inline("A.cs", source, "calls");
    assert.ok(
      calls.members.includes("Lib.FakeEnvironment.Exit"),
      String(calls.members),
    );
    assert.ok(
      !calls.members.some((name) => /^(?:System\.)?Environment\./.test(name)),
      String(calls.members),
    );
    assert.deepEqual(await inline("A.cs", source, "env"), {
      members: [],
      lines: [4],
    });
    // An alias that names System.Environment is read through.
    const real = [
      "using E = System.Environment;",
      'class A { string E1() => E.GetEnvironmentVariable("REAL"); void X() { E.Exit(1); } }',
    ].join("\n");
    assert.deepEqual((await inline("A.cs", real, "env")).members, ["REAL"]);
    assert.ok(
      (await inline("A.cs", real, "calls")).members.includes(
        "System.Environment.Exit",
      ),
    );
  });

  it("marks a C# System type name another file of the project may declare", async () => {
    const source = [
      "using System;",
      "namespace App.Shadow {",
      "  class U02 {",
      "    void M() { Environment.Exit(5); }",
      '    string E() => Environment.GetEnvironmentVariable("U02");',
      "    Action<int> G() => Environment.Exit;",
      "  }",
      "}",
    ].join("\n");
    const env = await inline("A.cs", source, "env");
    assert.deepEqual(env.members, ["U02"]);
    assert.deepEqual(env.shadows, [5]);
    const calls = await inline("A.cs", source, "calls");
    assert.deepEqual(calls.shadows, [4, 5, 6]);
    const rows = (
      await extractor.extract({ path: "A.cs", content: source, extract: "env" })
    ).unresolved;
    assert.deepEqual(rows, [
      {
        line: 5,
        text: 'Environment may be a type of the project: Environment.GetEnvironmentVariable("U02")'.slice(
          0,
          80,
        ),
      },
    ]);
    // A name the file binds or qualifies with global:: is not marked.
    const bound = [
      "using System;",
      "class U { void M(Fake Environment) { Environment.Exit(1); global::System.Environment.Exit(2); } }",
    ].join("\n");
    assert.equal((await inline("A.cs", bound, "calls")).shadows, undefined);
  });

  const go = (lines) => `package a\n${lines.join("\n")}\n`;

  it("lists a Go package used under a name another package is known by under its import path", async () => {
    const cases = [
      [
        'import logrus "github.com/other/notlogrus"',
        'func f() { logrus.Error("x"); l := logrus.New(); l.Warn("y") }',
        [
          '"github.com/other/notlogrus".Error',
          '"github.com/other/notlogrus".Warn',
        ],
        ["logrus.Error", "logrus.Warn"],
      ],
      [
        'import exec "github.com/fake/exec"',
        'func f() { exec.Command("rm").Run() }',
        ['"github.com/fake/exec".Command', '"github.com/fake/exec".Run'],
        ["exec.Command", "exec.Run"],
      ],
      [
        'import "github.com/charmbracelet/log"',
        'func f() { log.Fatal("x") }',
        ['"github.com/charmbracelet/log".Fatal'],
        ["log.Fatal"],
      ],
      [
        'import log "github.com/sirupsen/logrus"',
        "func f(err error) { log.Error(err) }",
        ["logrus.Error"],
        ["log.Error"],
      ],
      [
        'import "os/exec"\nimport x "os/exec"',
        'func f() { exec.Command("a"); x.Command("b") }',
        ["exec.Command"],
        [],
      ],
      [
        'import "github.com/sirupsen/logrus"\nimport "math/rand/v2"',
        "func f() { logrus.Info(1); rand.IntN(3) }",
        ["logrus.Info", "rand.IntN"],
        [],
      ],
    ];
    for (const [imports, body, present, absent] of cases) {
      const calls = await inline("a.go", go([imports, body]), "calls");
      for (const name of present)
        assert.ok(calls.members.includes(name), `${name}: ${calls.members}`);
      for (const name of absent)
        assert.ok(!calls.members.includes(name), `${name}: ${calls.members}`);
      assert.deepEqual(calls.lines, []);
    }
    const args = go([
      'import exec "github.com/fake/exec"',
      'func f() { exec.Command("rm") }',
    ]);
    assert.deepEqual(
      (await inline("a.go", args, "string_args", { callee: "exec.Command" }))
        .members,
      [],
    );
  });

  it("marks a Go package-level name another file of the package may bind for env", async () => {
    const source = [
      "package main",
      'import "os"',
      "type T[K any] struct{ k K }",
      "var local = 1",
      "const two = 2",
      "func f[K any](k K) K { return k }",
      "func main() {",
      '\t_ = os.Getenv("A")',
      '\t_ = getenv("ADMIN_TOKEN")',
      "\tvar c Config",
      "\t_ = T[int]{k: local + two}",
      "\tx := helper",
      "\t_, _ = x, c",
      "\tcfg.Port()",
      '\t_ = len(f("a")) + cap([]byte(nil))',
      "\tgoto L",
      "L:",
      "\tfor i, v := range []int{} { _, _ = i, v }",
      "\tfunc() { _ = true; _ = nil; var e error; _ = e }()",
      "}",
    ].join("\n");
    const env = await inline("a.go", source, "env");
    assert.deepEqual(env.members, ["A"]);
    assert.deepEqual(env.lines, []);
    assert.deepEqual(env.shadows, [9, 10, 12, 14]);
    const rows = (
      await extractor.extract({ path: "a.go", content: source, extract: "env" })
    ).unresolved;
    assert.deepEqual(
      rows.map((row) => row.text),
      [
        'getenv may be declared in another file of the package: getenv("ADMIN_TOKEN")',
        "Config may be declared in another file of the package: Config",
        "helper may be declared in another file of the package: helper",
        "cfg may be declared in another file of the package: cfg",
      ],
    );
    // Only env reads follow the package's other files.
    assert.equal((await inline("a.go", source, "calls")).shadows, undefined);
  });
});
