// executable_for TEST-source-analysis-v2-contract
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateSourceAnalysisResultV2 } from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterSymbolExtractor } = await import("../dist/index.js");
const extractor = createTreeSitterSymbolExtractor();

async function analyze(path, content) {
  const input = { path, content };
  const result = await extractor.analyze(input);
  assert.deepEqual(validateSourceAnalysisResultV2(result, input), result);
  return result;
}

/** `kind qualifiedName [signature]` per symbol, in source order. */
const symbolsOf = (result) =>
  result.symbols.map((symbol) =>
    [symbol.kind, symbol.qualifiedName, symbol.signature]
      .filter((part) => part !== undefined)
      .join(" "),
  );
const codesOf = (result) => result.diagnostics.map((entry) => entry.code);
const linesOf = (result, code) =>
  result.diagnostics
    .filter((entry) => entry.code === code)
    .map((entry) => entry.range.startLine);

describe("symbol kinds and scopes", () => {
  it("reads a Python module assignment as a variable", async () => {
    const result = await analyze("a.py", "LIMIT = 1\nclass A:\n    pass\n");
    assert.equal(result.status, "ok");
    assert.deepEqual(symbolsOf(result), ["variable LIMIT", "class A"]);
  });

  it("classifies Rust enums, aliases and unions and scopes items by module", async () => {
    const result = await analyze(
      "a.rs",
      "mod m {\n    fn f() {}\n}\nenum E { A }\ntype T = u8;\nunion U { a: u8 }\n",
    );
    assert.equal(result.status, "ok");
    assert.deepEqual(symbolsOf(result), [
      "method m.f ()",
      "enum E",
      "type T",
      "type U",
    ]);
    assert.equal(result.symbols[0].containerName, "m");
  });

  it("scopes C++ out-of-line definitions inside and across namespaces", async () => {
    const result = await analyze(
      "a.cpp",
      [
        "namespace N {",
        "void N::own() {}",
        "void N::M::deeper() {}",
        "void M::across() {}",
        "}",
        "namespace { void hidden() {} }",
        "void ::G::rooted() {}",
      ].join("\n"),
    );
    assert.equal(result.status, "ok");
    assert.deepEqual(symbolsOf(result), [
      "function N.own() ()",
      "function N.M.deeper() ()",
      "function N.M.across() ()",
      "function hidden() ()",
      "function G.rooted() ()",
    ]);
  });

  it("puts PHP functions after an unnamed namespace block in the global namespace", async () => {
    const result = await analyze(
      "a.php",
      "<?php\nnamespace {\n}\nfunction h($a) {}\n",
    );
    assert.equal(result.status, "ok");
    assert.deepEqual(symbolsOf(result), ["function h (?)"]);
  });
});

describe("parameter signatures", () => {
  it("normalizes C++ declarators and reference qualifiers", async () => {
    const result = await analyze(
      "a.cpp",
      [
        "void byRef(int &r) {}",
        "void byArray(int a[]) {}",
        "void byPointers(int * const * p) {}",
        "void byConst(const int a) {}",
        "void unnamed(int) {}",
        "struct S { void m() &; void n() &&; void o() const &; };",
      ].join("\n"),
    );
    assert.equal(result.status, "ok");
    assert.deepEqual(symbolsOf(result), [
      "function byRef(int&) (int&)",
      "function byArray(int[]) (int[])",
      "function byPointers(int*const *) (int*const *)",
      "function byConst(const int) (const int)",
      "function unnamed(int) (int)",
      "class struct.S",
      "method S.m() & () &",
      "method S.n() && () &&",
      "method S.o() const& () const&",
    ]);
  });

  it("leaves a C++ signature out when a parameter declares a function", async () => {
    const result = await analyze(
      "a.cpp",
      "void callback(int (*cb)(int)) {}\nvoid factory(int *make(int)) {}\n",
    );
    const callback = result.symbols.find(
      (symbol) => symbol.name === "callback",
    );
    const factory = result.symbols.find((symbol) => symbol.name === "factory");
    assert.equal(callback?.signature, undefined);
    assert.equal(factory?.signature, undefined);
  });

  it("writes PHP untyped and variadic parameters and skips comments", async () => {
    const result = await analyze(
      "a.php",
      "<?php\nfunction f($a, int ...$b) {}\nfunction g(int $a, /* c */ $b) {}\n",
    );
    assert.equal(result.status, "ok");
    assert.deepEqual(symbolsOf(result), [
      "function f (?,...)",
      "function g (int,?)",
    ]);
  });

  it("keeps an overload without a signature distinct from a signed one", async () => {
    const result = await analyze(
      "A.java",
      "class A { void f(int a) {} void f(String... a) {} }\n",
    );
    assert.equal(result.status, "ok");
    assert.deepEqual(symbolsOf(result), [
      "class A",
      "method A.f(int) (int)",
      "method A.f",
    ]);
  });
});

describe("overload signatures", () => {
  it("keeps C++ rvalue-reference and variadic overloads apart", async () => {
    const result = await analyze(
      "a.cpp",
      [
        "void f(int &a) {}",
        "void f(int &&a) {}",
        "void g(int a) {}",
        "void g(int a, ...) {}",
      ].join("\n"),
    );
    assert.equal(result.status, "ok", JSON.stringify(result.diagnostics));
    assert.deepEqual(symbolsOf(result), [
      "function f(int&) (int&)",
      "function f(int&&) (int&&)",
      "function g(int) (int)",
      "function g(int,...) (int,...)",
    ]);
  });

  it("writes a C variadic parameter once", async () => {
    const result = await analyze("a.c", "int log(const char *f, ...);\n");
    assert.deepEqual(symbolsOf(result), ["function log (const char*,...)"]);
  });

  it("keeps pointers and references inside parenthesized declarators", async () => {
    const result = await analyze(
      "a.cpp",
      "void p(int (*q)) {}\nvoid r(int (&a)[3]) {}\nvoid s(int (*));\n",
    );
    assert.deepEqual(symbolsOf(result), [
      "function p(int*) (int*)",
      "function r(int[]&) (int[]&)",
      "function s(int*) (int*)",
    ]);
  });

  it("writes C# ref, out, in and params modifiers", async () => {
    const result = await analyze(
      "A.cs",
      [
        "class A {",
        "  void F(int a) {}",
        "  void F(ref int a) {}",
        "  void G(out int a) { a = 1; }",
        "  void H(in int a, ref readonly int b, this int c) {}",
        "  void P(int a, params int[] rest) {}",
        "}",
      ].join("\n"),
    );
    assert.equal(result.status, "ok", JSON.stringify(result.diagnostics));
    assert.deepEqual(symbolsOf(result), [
      "class A",
      "method A.F(int) (int)",
      "method A.F(ref int) (ref int)",
      "method A.G(out int) (out int)",
      "method A.H(in int,ref readonly int,int) (in int,ref readonly int,int)",
      "method A.P(int,params int[]) (int,params int[])",
    ]);
  });

  it("skips Java comments in parameter lists", async () => {
    const result = await analyze(
      "A.java",
      "class A {\n  void h(int a /* why */) {}\n  void h(\n    // what\n    String s) {}\n}\n",
    );
    assert.deepEqual(symbolsOf(result), [
      "class A",
      "method A.h(int) (int)",
      "method A.h(String) (String)",
    ]);
  });

  it("does not report C++ parameters that declare functions as symbols", async () => {
    const result = await analyze(
      "a.cpp",
      "template<void f(int)> struct X {};\nvoid g(int *h(int)) {}\n",
    );
    assert.equal(result.status, "ok");
    assert.deepEqual(
      result.symbols.map((symbol) => symbol.name),
      ["X", "g"],
    );
  });
});

describe("dynamic declaration findings", () => {
  it("reports Python metaclasses and PHP includes and eval", async () => {
    const python = await analyze(
      "a.py",
      "class A(B, metaclass=M):\n    pass\n",
    );
    assert.equal(python.status, "partial");
    assert.deepEqual(codesOf(python), [
      "TREESITTER_METACLASS_EXPANSION_UNAVAILABLE",
    ]);
    const php = await analyze(
      "a.php",
      '<?php\ninclude "a.php";\nrequire_once "b.php";\neval("function g() {}");\n',
    );
    assert.equal(php.status, "partial");
    assert.deepEqual(codesOf(php), [
      "TREESITTER_PHP_INCLUDED_DECLARATIONS_UNAVAILABLE",
      "TREESITTER_PHP_INCLUDED_DECLARATIONS_UNAVAILABLE",
      "TREESITTER_PHP_EVAL_UNAVAILABLE",
    ]);
  });

  it("reports one parse error for C declarators that share a damaged declaration", async () => {
    const result = await analyze("a.c", "int f(int), g(int x;\nint h(void);\n");
    assert.equal(result.status, "partial");
    assert.deepEqual(symbolsOf(result), ["function h (void)"]);
    assert.deepEqual(
      linesOf(result, "TREESITTER_DECLARATION_PARSE_ERROR"),
      [1],
    );
  });
});

describe("HCL and Terraform omissions", () => {
  it("omits unlabeled, dynamic-label and nested HCL blocks", async () => {
    const result = await analyze(
      "a.hcl",
      'job {\n}\napp "x\\n" {\n}\napp "ok" {\n  inner "y" {}\n}\n',
    );
    assert.equal(result.status, "partial");
    assert.deepEqual(symbolsOf(result), ['unknown hcl:["app","ok"]']);
    assert.deepEqual(codesOf(result), [
      "TREESITTER_HCL_UNLABELED_BLOCK_OMITTED",
      "TREESITTER_HCL_DYNAMIC_LABEL_OMITTED",
      "TREESITTER_HCL_NESTED_BLOCK_OMITTED",
    ]);
  });

  it("omits Terraform blocks it cannot classify or identify", async () => {
    const result = await analyze(
      "a.tf",
      [
        'widget "x" {}',
        'resource "only_one" {}',
        'resource "a" "${var.b}" {}',
        'provider "aws" {}',
        'variable "v" {',
        "  validation {}",
        "}",
        'resource "a" /* c */ "b" {}',
        'locals "x" {',
        "  a = 1",
        "}",
      ].join("\n"),
    );
    assert.equal(result.status, "partial");
    assert.deepEqual(symbolsOf(result), ['unknown terraform:variable["v"]']);
    assert.deepEqual(
      result.diagnostics.map((entry) => [entry.code, entry.range.startLine]),
      [
        ["TREESITTER_TERRAFORM_BLOCK_UNCLASSIFIED", 1],
        ["TREESITTER_TERRAFORM_LABEL_COUNT_UNSUPPORTED", 2],
        ["TREESITTER_TERRAFORM_DYNAMIC_LABEL_OMITTED", 3],
        ["TREESITTER_TERRAFORM_NESTED_BLOCK_OMITTED", 6],
        ["TREESITTER_TERRAFORM_QUERY_CAPTURE_MISSING", 8],
        ["TREESITTER_TERRAFORM_LOCAL_QUERY_CAPTURE_MISSING", 10],
      ],
    );
  });

  it("words the label count for one-label Terraform blocks and accepts empty files", async () => {
    const result = await analyze("a.tf", 'output "a" "b" {}\n');
    assert.deepEqual(
      result.diagnostics.map((entry) => [entry.code, entry.message]),
      [
        [
          "TREESITTER_TERRAFORM_LABEL_COUNT_UNSUPPORTED",
          "Terraform 'output' blocks require 1 static label for structural identity.",
        ],
      ],
    );
    for (const path of ["empty.tf", "empty.hcl"]) {
      const empty = await analyze(path, "");
      assert.equal(empty.status, "ok", path);
      assert.deepEqual(empty.symbols, [], path);
    }
  });

  it("omits a Terraform local whose value does not parse", async () => {
    const result = await analyze(
      "a.tf",
      "locals {\n  ok = 1\n  inner {}\n  b = \n  c = 1\n}\n",
    );
    assert.equal(result.status, "partial");
    // A block inside locals is reported as nested, not read as a local.
    assert.deepEqual(symbolsOf(result), ['variable terraform:local["ok"]']);
    assert.deepEqual(
      linesOf(result, "TREESITTER_TERRAFORM_NESTED_BLOCK_OMITTED"),
      [3],
    );
    assert.ok(
      codesOf(result).includes("TREESITTER_TERRAFORM_LOCAL_PARSE_ERROR"),
      JSON.stringify(result.diagnostics),
    );
  });
});

describe("SWI-Prolog clause heads and test units", () => {
  it("names operator, parenthesized, quoted and qualified heads and refuses the rest", async () => {
    const result = await analyze(
      "a.plt",
      [
        ":- module(m, []).",
        "X :- true.",
        "1 :- true.",
        "(paren) :- true.",
        "a + b :- true.",
        "- c :- true.",
        "'it''s'(1).",
        "M:dyn :- true.",
        "m:own(1).",
        "other:far(1).",
        "p(X), [a] --> [b].",
        "q(X), X > 0 => true.",
      ].join("\n"),
    );
    assert.equal(result.status, "partial");
    assert.deepEqual(symbolsOf(result), [
      "function paren/0",
      "function +/2",
      "function -/1",
      "function it's/1",
      "function own/1",
      "function other:far/1",
      "function p/3",
      "function q/1",
    ]);
    assert.deepEqual(
      linesOf(result, "TREESITTER_PROLOG_HEAD_UNSUPPORTED"),
      [2, 3, 8],
    );
  });

  it("reports unmatched and nested test units, names compound tests and skips other directives", async () => {
    const result = await analyze(
      "a.plt",
      [
        ":- dynamic seen/1.",
        ":- module(M, []).",
        ":- end_tests(none).",
        ":- begin_tests(u).",
        ":- begin_tests(v).",
        "test(foo(1)) :- true.",
        "test(bar, [true]) :- true.",
        ":- end_tests(u).",
      ].join("\n"),
    );
    assert.equal(result.status, "partial");
    assert.deepEqual(symbolsOf(result), [
      "class u",
      "method u:foo(1)",
      "method u:bar",
    ]);
    assert.deepEqual(
      result.diagnostics.map((entry) => [entry.code, entry.range.startLine]),
      [
        ["TREESITTER_PROLOG_TEST_UNIT_UNMATCHED", 3],
        ["TREESITTER_PROLOG_TEST_UNIT_NESTED", 5],
      ],
    );
  });
});

describe("output bounds", () => {
  it("caps symbols and says so", async () => {
    const content = `${Array.from(
      { length: 10_001 },
      (_, index) => `X${index} = 1`,
    ).join("; ")}\n`;
    const result = await analyze("many.py", content);
    assert.equal(result.status, "partial");
    assert.equal(result.symbols.length, 10_000);
    assert.deepEqual(codesOf(result), ["TREESITTER_SYMBOL_LIMIT"]);
  });

  it("replaces the last diagnostic slot with a limit finding over the whole file", async () => {
    const content = Array.from(
      { length: 70 },
      (_, index) => `exec("x${index} = 1")`,
    ).join("\n");
    const result = await analyze("exec.py", content);
    assert.equal(result.status, "partial");
    assert.equal(result.diagnostics.length, 64);
    const last = result.diagnostics.at(-1);
    assert.equal(last.code, "TREESITTER_DIAGNOSTIC_LIMIT");
    assert.deepEqual(last.range, {
      startLine: 1,
      startColumn: 0,
      endLine: 70,
      endColumn: 'exec("x69 = 1")'.length,
    });
    assert.equal(
      result.uncoveredRanges.at(-1).reason,
      "diagnostic-limit-may-hide-analysis-gaps",
    );
  });

  it("summarizes nested decorators past the cap over their whole span", async () => {
    // Method 66 holds a decorated helper that ends where the method ends.
    const methods = Array.from({ length: 70 }, (_, index) =>
      index === 66
        ? `    @d\n    def m${index}(self):\n        @d\n        def inner(): pass`
        : `    @d\n    def m${index}(self): pass`,
    ).join("\n");
    const content = `@d\nclass A:\n${methods}\n`;
    const result = await analyze("decorated.py", content);
    assert.equal(result.status, "partial");
    assert.equal(result.diagnostics.length, 64);
    assert.ok(
      result.diagnostics.every(
        (entry) => entry.code === "TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE",
      ),
    );
    // The outer class ends where its last method ends: line 2 + 2 * 70 + 2.
    const last = result.diagnostics.at(-1);
    assert.equal(last.range.endLine, 144);
    assert.match(
      last.message,
      /\(9 decorated declarations from line \d+ to 144;/,
    );
  });
});
