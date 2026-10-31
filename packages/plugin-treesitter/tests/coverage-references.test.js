// executable_for TEST-kibi-tree-sitter-references
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateReferenceExtractionResult } from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterReferenceExtractor } = await import("../dist/index.js");
const extractor = createTreeSitterReferenceExtractor();

/** Read one extract of an inline file; members are sorted, lines unique. */
async function read(path, content, extract, options = {}) {
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

const go = (body) => `package a\n${body}\n`;

describe("Go reference reader edge cases", () => {
  it("reads raw, escaped and missing environment names", async () => {
    const source = go(
      [
        'import "os"',
        "func f() {",
        "\t_ = os.Getenv(`RAW`)",
        '\t_ = os.Getenv("\\x41")',
        "\t_ = os.Getenv()",
        "\t_ = (os.Getenv)(name)",
        "\t_ = strings.ToUpper(name)",
        "}",
      ].join("\n"),
    );
    const env = await read("a.go", source, "env");
    assert.deepEqual(env.members, ["RAW"]);
    // An escape JSON cannot decode, no argument and a computed name: refused.
    assert.deepEqual(env.lines, [5, 6, 7]);
  });

  it("names parenthesized and generic-instantiation calls and ignores func literals", async () => {
    const source = go(
      [
        "func f() {",
        "\t(g)()",
        "\th[int](1)",
        '\tconv[string]("tag")',
        "\tfunc() {}()",
        "}",
      ].join("\n"),
    );
    const calls = await read("a.go", source, "calls");
    assert.deepEqual(calls.members, ["conv", "g", "h"]);
    assert.deepEqual(calls.lines, []);
    const tags = await read("a.go", source, "string_args", { callee: "conv" });
    assert.deepEqual(tags.members, ["tag"]);
    assert.deepEqual(await read("a.go", source, "env"), {
      members: [],
      lines: [],
    });
  });

  it("matches string_args callees exactly when qualified and refuses computed values", async () => {
    const source = go(
      [
        'import "fmt"',
        "func f() {",
        '\tfmt.Printf("a")',
        "\tfmt.Printf(format)",
        '\tlog.Printf("b")',
        "}",
      ].join("\n"),
    );
    const exact = await read("a.go", source, "string_args", {
      callee: "fmt.Printf",
    });
    assert.deepEqual(exact.members, ["a"]);
    assert.deepEqual(exact.lines, [5]);
    const otherPackage = await read("a.go", source, "string_args", {
      callee: "os.Printf",
    });
    assert.deepEqual(otherPackage, { members: [], lines: [] });
  });

  it("reads panics with a named call and refuses unknown values", async () => {
    const source = go(
      [
        "func f() {",
        '\tpanic(fmt.Sprintf("x"))',
        "\tpanic(err)",
        "\tpanic(handlers[0].Err())",
        "\tpanic(make()())",
        "}",
      ].join("\n"),
    );
    const thrown = await read("a.go", source, "thrown");
    assert.deepEqual(thrown.members, ["fmt.Sprintf"]);
    assert.deepEqual(thrown.lines, [4, 5, 6]);
  });

  it("reads keyed values by field or string key and refuses computed ones", async () => {
    const source = go(
      [
        "var c = Conf{",
        "\tMode: v,",
        '\tOther: "y",',
        "}",
        'var m = map[string]string{"Mode": "strict"}',
      ].join("\n"),
    );
    const property = await read("a.go", source, "property", { key: "Mode" });
    assert.deepEqual(property.members, ["strict"]);
    assert.deepEqual(property.lines, [3]);
  });

  it("refuses an import path it cannot decode, and what it may bring in", async () => {
    const source = go(
      'import o "\\x6fs"\nfunc f() { _ = o.Getenv("A"); _ = Getenv("B"); g() }',
    );
    assert.deepEqual(await read("a.go", source, "imports"), {
      members: [],
      lines: [2],
    });
    assert.deepEqual((await read("a.go", source, "env")).lines, [2]);
    const calls = await read("a.go", source, "calls");
    assert.deepEqual(calls.lines, [2]);
    assert.ok(calls.members.includes("g"));
  });

  it("lists package functions used as values but not fields of values", async () => {
    const source = go(
      'import "strings"\nfunc f(cfg Conf) { up := strings.ToUpper; mode := cfg.Mode; _, _ = up, mode }',
    );
    const calls = await read("a.go", source, "calls");
    assert.deepEqual(calls.members, ["strings.ToUpper"]);
    assert.deepEqual(calls.lines, []);
  });

  it("refuses reflect method calls only when reflect is imported", async () => {
    const withReflect = go(
      'import "reflect"\nfunc f(v reflect.Value) { v.Call(nil); g() }',
    );
    assert.deepEqual((await read("a.go", withReflect, "calls")).lines, [3]);
    const without = go("func f() { v.Call(nil) }");
    const calls = await read("a.go", without, "calls");
    assert.deepEqual(calls.members, ["v.Call"]);
    assert.deepEqual(calls.lines, []);
  });
});

describe("Java reference reader edge cases", () => {
  it("names receivers it can and marks the rest as any receiver", async () => {
    const source = [
      "class A {",
      "  void f() {",
      "    items[0].list.add(1);",
      "    (a).run();",
      "    ((Runnable) r).run();",
      "    super.close();",
      "    other.MethodHandles.lookup();",
      "  }",
      "}",
    ].join("\n");
    const calls = await read("A.java", source, "calls");
    assert.deepEqual(calls.members, ["*.add", "*.run", "a.run", "super.close"]);
    // A qualified spelling of a reflection entry point is still reflection.
    assert.deepEqual(calls.lines, [7]);
  });

  it("lists method references by target and refuses nothing it can name", async () => {
    const source = [
      "class A {",
      "  void f() {",
      "    r = super::m;",
      "    r = foo()::bar;",
      "    r = List<String>::<X>new;",
      "    r = ArrayList::new;",
      "  }",
      "}",
    ].join("\n");
    const calls = await read("A.java", source, "calls");
    assert.deepEqual(calls.members, ["*.bar", "*.new", "foo", "super.m"]);
    assert.deepEqual(calls.lines, []);
  });

  it("reads text blocks as unresolved and other method references as harmless for env", async () => {
    const source = [
      "class A {",
      "  void f() {",
      '    System.getenv("""',
      '      PORT""");',
      "    java.util.function.Function<Object, String> g = String::valueOf;",
      "    java.util.function.Supplier<Object> h = ArrayList::new;",
      "    log.info(1);",
      "  }",
      "}",
    ].join("\n");
    const env = await read("A.java", source, "env");
    assert.deepEqual(env.members, []);
    assert.deepEqual(env.lines, [3]);
  });

  it("lists single-name imports and skips static imports it cannot name", async () => {
    const source = "import Foo;\nimport static X;\nclass A {}\n";
    const imports = await read("A.java", source, "imports");
    assert.deepEqual(imports.members, ["Foo", "X"]);
    const calls = await read("A.java", source, "calls");
    assert.deepEqual(calls, { members: [], lines: [] });
  });

  it("reads thrown factories and refuses throws of unknown values", async () => {
    const source = [
      "class A {",
      "  void f() throws Exception {",
      '    if (a) throw failure("x");',
      "    if (b) throw errors[0].make();",
      "    if (c) throw saved;",
      "    try { g(); } catch (Exception e) { throw e; }",
      "  }",
      "}",
    ].join("\n");
    const thrown = await read("A.java", source, "thrown");
    assert.deepEqual(thrown.members, ["failure"]);
    assert.deepEqual(thrown.lines, [4, 5]);
  });
});

describe("C# reference reader edge cases", () => {
  it("names this, base, generic, parenthesized and element receivers", async () => {
    const source = [
      "class A {",
      "  void F() {",
      "    this.X();",
      "    base.Y();",
      "    Make<int>();",
      "    List<int>.Create();",
      "    (a).B();",
      "    a[0].C();",
      "    a?.D();",
      "    nameof(F);",
      "    (() => 1)();",
      "    ((System.Func<int>)(() => 1))();",
      "    other.Activator.CreateInstance();",
      "  }",
      "}",
    ].join("\n");
    const calls = await read("A.cs", source, "calls");
    assert.deepEqual(calls.members, [
      "*.C",
      "List.Create",
      "Make",
      "a.B",
      "base.Y",
      "this.X",
    ]);
    // A conditional access, a cast result and qualified reflection: refused.
    assert.deepEqual(calls.lines, [9, 12, 13]);
  });

  it("lists method groups it can name and skips ones it cannot", async () => {
    const source =
      "class A { void F() { Run(Helpers.Format); Run(items[0].Format); } }\n";
    const calls = await read("A.cs", source, "calls");
    assert.deepEqual(calls.members, ["Helpers.Format", "Run"]);
    assert.deepEqual(calls.lines, []);
  });

  it("decodes verbatim strings and refuses raw, UTF-8 and commented arguments", async () => {
    const source = [
      "class A {",
      "  void F() {",
      '    System.Environment.GetEnvironmentVariable(@"VERBATIM");',
      '    System.Environment.GetEnvironmentVariable("""RAW""");',
      '    System.Environment.GetEnvironmentVariable("U8"u8);',
      '    System.Environment.GetEnvironmentVariable(/* why */ "COMMENTED");',
      "  }",
      "}",
    ].join("\n");
    const env = await read("A.cs", source, "env");
    assert.deepEqual(env.members, ["VERBATIM"]);
    assert.deepEqual(env.lines, [4, 5, 6]);
  });

  it("lists an aliased using under the namespace it names", async () => {
    const source = "using E = System.Environment;\nclass A {}\n";
    const imports = await read("A.cs", source, "imports");
    assert.deepEqual(imports.members, ["System.Environment"]);
  });

  it("reads thrown factories, rethrows and caught names, and refuses unknown values", async () => {
    const source = [
      "class A {",
      "  void F() {",
      '    if (a) throw Failure("x");',
      "    if (b) throw errors[0].Make();",
      "    if (c) throw saved;",
      "    try { G(); } catch (System.Exception e) { throw e; }",
      "    try { G(); } catch (System.Exception) { throw; }",
      "    try { G(); } catch { throw; }",
      "  }",
      "}",
    ].join("\n");
    const thrown = await read("A.cs", source, "thrown");
    assert.deepEqual(thrown.members, ["Failure"]);
    assert.deepEqual(thrown.lines, [4, 5]);
  });

  it("reads collection, indexer and object initializers by key and refuses unknown values", async () => {
    const source = [
      "class A {",
      "  void F() {",
      '    var a = new D { { "Mode", "one" }, { "Other", "x" }, { 1, "row" }, { "a", "b", "c" } };',
      '    var b = new D { { k, "x" } };',
      '    var c = new D { { "Mode", v } };',
      '    var d = new D { ["Mode"] = "two", ["Other"] = "x", ["a", "b"] = "c" };',
      '    var e = new D { ["Mode"] = v };',
      '    var f = new C { Mode = "three", Other = "x" };',
      "    var g = new C { Mode = v };",
      "  }",
      "}",
    ].join("\n");
    const property = await read("A.cs", source, "property", { key: "Mode" });
    assert.deepEqual(property.members, ["one", "three", "two"]);
    assert.deepEqual(property.lines, [4, 5, 6, 7, 9]);
  });
});

describe("Rust reference reader edge cases", () => {
  it("lists aliased, wildcard and rootless use trees and extern crates", async () => {
    const source = [
      "use std::env::var as getvar;",
      "use std::{*};",
      "use std::io::*;",
      "use ::{alpha, beta};",
      "use std::io::Write as _;",
      "use std::fmt::{self as f};",
      "extern crate serde;",
    ].join("\n");
    const imports = await read("a.rs", source, "imports");
    assert.deepEqual(imports.members, [
      "alpha",
      "beta",
      "serde",
      "std::*",
      "std::env::var",
      "std::fmt",
      "std::io::*",
      "std::io::Write",
    ]);
    assert.deepEqual(imports.lines, []);
  });

  it("refuses a macro in item position for imports", async () => {
    const source = "use std::io;\nimports! {}\nfn f() { inner!(); }\n";
    const imports = await read("a.rs", source, "imports");
    assert.deepEqual(imports.members, ["std::io"]);
    assert.deepEqual(imports.lines, [2]);
  });

  it("refuses bare calls after a rootless wildcard use", async () => {
    const source = 'use {std::env::*};\nfn f() { let _ = var("A"); }\n';
    assert.deepEqual((await read("a.rs", source, "env")).lines, [1]);
    assert.deepEqual((await read("a.rs", source, "calls")).lines, [1]);
  });

  it("reads env macros and raw strings and refuses byte strings", async () => {
    const source = [
      "fn f() {",
      '    let _ = env!("BUILD");',
      '    let _ = option_env!(concat!("A", "B"));',
      "    let _ = env![];",
      '    let _ = std::env::var("FULL");',
      '    let _ = std::env::var(b"BYTES");',
      '    let _ = std::env::var(r#"RAW"#);',
      "}",
    ].join("\n");
    const env = await read("a.rs", source, "env");
    assert.deepEqual(env.members, ["BUILD", "FULL", "RAW"]);
    assert.deepEqual(env.lines, [3, 4, 6]);
  });

  it("names parenthesized and nested-generic calls and ignores closures", async () => {
    const source = [
      "fn f() {",
      "    (g)();",
      "    let _ = Vec::<Vec<u8>>::new();",
      "    (|x: u8| x)(1);",
      "}",
    ].join("\n");
    const calls = await read("a.rs", source, "calls");
    assert.deepEqual(calls.members, ["Vec::new", "g"]);
    assert.deepEqual(calls.lines, []);
  });

  it("lists paths used as values but not qualified-self paths", async () => {
    const source =
      "trait T { fn m(); }\nstruct S;\nfn f() { let a = helpers::format; let b = <S as T>::m; }\n";
    const calls = await read("a.rs", source, "calls");
    assert.deepEqual(calls.members, ["helpers::format"]);
    assert.deepEqual(calls.lines, []);
  });

  it("treats lint attributes and an empty derive as inert", async () => {
    const source = [
      "#[rustfmt::skip]",
      '#[clippy::cognitive_complexity = "100"]',
      "#[derive]",
      "struct S;",
      "fn f() { let _ = S; }",
    ].join("\n");
    // An attribute is not a call: its path is not listed.
    assert.deepEqual(await read("a.rs", source, "calls"), {
      members: [],
      lines: [],
    });
  });

  it("refuses an attribute macro without listing its path as a call", async () => {
    const source = '#[tracing::instrument(level = "debug")]\nfn f() { g(); }\n';
    assert.deepEqual(await read("a.rs", source, "calls"), {
      members: ["g"],
      lines: [1],
    });
  });
});
