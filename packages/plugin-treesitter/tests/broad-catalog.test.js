// executable_for TEST-source-analysis-v2-contract
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { validateSourceAnalysisResultV2 } from "kibi-plugin-sdk";

// Keep the test offline even if a future runtime path accidentally fetches.
globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterSymbolExtractor } = await import("../dist/index.js");
const extractor = createTreeSitterSymbolExtractor();
const fixture = (relativePath) =>
  readFile(new URL(`./fixtures/${relativePath}`, import.meta.url), "utf8");

function symbol(result, qualifiedName) {
  return result.symbols.find((item) => item.qualifiedName === qualifiedName);
}

function assertValid(result, input) {
  assert.deepEqual(validateSourceAnalysisResultV2(result, input), result);
}

function assertUniqueLocators(result) {
  assert.equal(
    new Set(result.symbols.map((item) => item.qualifiedName)).size,
    result.symbols.length,
  );
}

describe("qualified offline Tree-sitter catalog", () => {
  it("supports aliases and keeps ambiguous C/C++ headers explicit-only", () => {
    assert.equal(extractor.supports({ path: "src/Outer.java" }), true);
    assert.equal(extractor.supports({ path: "src/Outer.cs" }), true);
    assert.equal(extractor.supports({ path: "src/Mixed.php" }), true);
    assert.equal(extractor.supports({ path: "src/file.sh" }), true);
    assert.equal(extractor.supports({ path: "src/main.tf" }), true);
    assert.equal(extractor.supports({ path: "src/values.hcl" }), true);
    assert.equal(extractor.supports({ path: "src/shared.h" }), false);
    assert.equal(
      extractor.supports({ path: "src/shared.h", language: "c++" }),
      true,
    );
    assert.equal(
      extractor.supports({ path: "src/shared.h", language: " C " }),
      true,
    );
    assert.equal(extractor.supports({ path: "src/values.tfvars" }), false);
    assert.equal(
      extractor.supports({ path: "source.txt", language: "C-Sharp" }),
      true,
    );
    for (const language of ["constructor", "toString", "__proto__"]) {
      assert.equal(
        extractor.supports({ path: "source.txt", language }),
        false,
        `inherited property ${language} is not a language alias`,
      );
    }
  });

  it("keeps signature-bearing Java, C#, and C++ locators stable when overloads are added", async () => {
    const javaBefore = {
      path: "Engine.java",
      content: "package demo; class Engine { void run(int value) {} }",
    };
    const javaAfter = {
      ...javaBefore,
      content:
        "package demo; class Engine { void run(int value) {} void run(String value) {} }",
    };
    const javaFirst = await extractor.analyze(javaBefore);
    const javaSecond = await extractor.analyze(javaAfter);
    assert.equal(javaFirst.status, "ok");
    assert.equal(javaSecond.status, "ok");
    assert(symbol(javaFirst, "demo.Engine.run(int)"));
    assert(symbol(javaSecond, "demo.Engine.run(int)"));

    const csharpBefore = {
      path: "Engine.cs",
      content: "namespace Demo; public class Engine { public void Run() {} }",
    };
    const csharpAfter = {
      ...csharpBefore,
      content:
        "namespace Demo; public class Engine { public void Run() {} public void Run(int value) {} }",
    };
    const csharpFirst = await extractor.analyze(csharpBefore);
    const csharpSecond = await extractor.analyze(csharpAfter);
    assert.equal(csharpFirst.status, "ok");
    assert.equal(csharpSecond.status, "ok");
    assert(symbol(csharpFirst, "Demo.Engine.Run()"));
    assert(symbol(csharpSecond, "Demo.Engine.Run()"));

    const cppBefore = {
      path: "engine.cpp",
      content: "int run(int value) { return value; }",
    };
    const cppAfter = {
      ...cppBefore,
      content:
        "int run(int value) { return value; } double run(double value) { return value; }",
    };
    const cppFirst = await extractor.analyze(cppBefore);
    const cppSecond = await extractor.analyze(cppAfter);
    assert.equal(cppFirst.status, "ok");
    assert.equal(cppSecond.status, "ok");
    assert(symbol(cppFirst, "run(int)"));
    assert(symbol(cppSecond, "run(int)"));
  });

  it("rejects known non-Bash shebang dialects instead of parsing them as Bash", async () => {
    for (const dialect of ["zsh", "fish", "ksh", "sh"]) {
      const input = {
        path: "script.sh",
        content: `#!/usr/bin/env ${dialect}\nfunction task() { :; }\n`,
      };
      const result = await extractor.analyze(input);
      assert.equal(result.status, "unsupported");
      assertValid(result, input);
      assert.equal(result.symbols.length, 0);
      assert(
        result.diagnostics.some(
          (item) => item.code === "TREESITTER_SHELL_DIALECT_UNSUPPORTED",
        ),
      );
    }
    const bashInput = {
      path: "script.sh",
      content: "#!/usr/bin/env bash\nfunction task() { :; }\n",
    };
    const bashResult = await extractor.analyze(bashInput);
    assert.equal(bashResult.status, "ok");
    assertValid(bashResult, bashInput);
    assert(symbol(bashResult, "task"));
  });

  it("recognizes Bash after bounded env split-string options and operands", async () => {
    for (const envArguments of [
      "-S -u TRACE bash",
      "-S -i bash",
      "-S TRACE=value bash",
      "--split-string='-u TRACE bash'",
      "-u TRACE -S bash",
      "-i -S bash",
    ]) {
      const input = {
        path: "script.sh",
        content: `#!/usr/bin/env ${envArguments}\nfunction task() { :; }\n`,
      };
      const result = await extractor.analyze(input);
      assert.equal(result.status, "ok", envArguments);
      assertValid(result, input);
      assert(symbol(result, "task"));
    }

    for (const envArguments of ["-S -x TRACE bash", "-S zsh"]) {
      const input = {
        path: "script.sh",
        content: `#!/usr/bin/env ${envArguments}\nfunction task() { :; }\n`,
      };
      const result = await extractor.analyze(input);
      assert.equal(result.status, "unsupported", envArguments);
      assertValid(result, input);
      assert.equal(result.symbols.length, 0);
      assert(
        result.diagnostics.some(
          (item) => item.code === "TREESITTER_SHELL_DIALECT_UNSUPPORTED",
        ),
      );
    }
  });

  it("keeps Java and C# namespace, nested-type, and overload identities distinct", async () => {
    const javaContent = await fixture("java/Declarations.java");
    const javaInput = { path: "Declarations.java", content: javaContent };
    const java = await extractor.analyze(javaInput);
    assert.equal(java.status, "ok");
    assertValid(java, javaInput);
    assertUniqueLocators(java);
    assert.equal(
      symbol(java, "demo.catalog.Outer.same(int)")?.signature,
      "(int)",
    );
    assert.equal(
      symbol(java, "demo.catalog.Outer.same(String)")?.signature,
      "(String)",
    );
    assert.equal(symbol(java, "demo.catalog.Outer.Inner")?.kind, "class");
    assert.equal(symbol(java, "demo.catalog.Outer.Mode")?.kind, "enum");

    const javaConstructorInput = {
      path: "Factory.java",
      language: "java",
      content:
        "package sample; class Factory { Factory(int value) {} Factory(String value) {} }",
    };
    const javaConstructors = await extractor.analyze(javaConstructorInput);
    assert.equal(javaConstructors.status, "ok");
    assertValid(javaConstructors, javaConstructorInput);
    assert(symbol(javaConstructors, "sample.Factory.Factory(int)"));
    assert(symbol(javaConstructors, "sample.Factory.Factory(String)"));

    const csharpContent = await fixture("csharp/Declarations.cs");
    const csharpInput = { path: "Declarations.cs", content: csharpContent };
    const csharp = await extractor.analyze(csharpInput);
    assert.equal(csharp.status, "ok");
    assertValid(csharp, csharpInput);
    assertUniqueLocators(csharp);
    assert.equal(symbol(csharp, "Demo.Tools.Engine.Run(int)")?.kind, "method");
    assert.equal(
      symbol(csharp, "Demo.Tools.Engine.Run(string)")?.signature,
      "(string)",
    );
    assert.equal(symbol(csharp, "Demo.Tools.Engine.Count")?.kind, "property");
    assert.equal(symbol(csharp, "Demo.Tools.Envelope")?.kind, "class");

    const csharpConstructorInput = {
      path: "Factory.cs",
      language: "csharp",
      content:
        "namespace Sample { class Factory { public Factory(int value) {} public Factory(string value) {} } }",
    };
    const csharpConstructors = await extractor.analyze(csharpConstructorInput);
    assert.equal(csharpConstructors.status, "ok");
    assertValid(csharpConstructors, csharpConstructorInput);
    assert(symbol(csharpConstructors, "Sample.Factory.Factory(int)"));
    assert(symbol(csharpConstructors, "Sample.Factory.Factory(string)"));
  });

  it("captures C++ destructors and C# finalizers instead of reporting silent omissions", async () => {
    const cppInput = {
      path: "sample.cpp",
      content: "class X { public: X() {} ~X() {} void f() {} };",
    };
    const cpp = await extractor.analyze(cppInput);
    assert.equal(cpp.status, "ok");
    assertValid(cpp, cppInput);
    assert(symbol(cpp, "X.~X()"));
    assert(symbol(cpp, "X.f()"));

    const outOfLineCppInput = {
      path: "sample.cpp",
      content: "class X { public: ~X(); }; X::~X() {}",
    };
    const outOfLineCpp = await extractor.analyze(outOfLineCppInput);
    assert.equal(outOfLineCpp.status, "ok");
    assertValid(outOfLineCpp, outOfLineCppInput);
    assert.equal(
      outOfLineCpp.symbols.filter((item) => item.qualifiedName === "X.~X()")
        .length,
      1,
    );

    const assertCsharpFinalizer = async (content, expectedSpan) => {
      const input = { path: "sample.cs", content };
      const result = await extractor.analyze(input);
      assert.equal(result.status, "ok");
      assertValid(result, input);
      const finalizer = symbol(result, "X.~X()");
      assert(finalizer);
      assert.equal(finalizer.name, "~X");
      assert(finalizer.nameRange);
      assert.equal(
        input.content.slice(
          finalizer.nameRange.startColumn,
          finalizer.nameRange.endColumn,
        ),
        expectedSpan,
      );
      return result;
    };
    const csharp = await assertCsharpFinalizer(
      "class X { ~X() {} public void F() {} }",
      "~X",
    );
    await assertCsharpFinalizer("class X { [System.Obsolete] ~X() {} }", "~X");
    await assertCsharpFinalizer("class X { ~ X() {} }", "~ X");
    assert(symbol(csharp, "X.F()"));
  });

  it("parses mixed PHP/HTML while preserving namespace and method identities", async () => {
    const content = await fixture("php/Mixed.php");
    const input = { path: "Mixed.php", content };
    const result = await extractor.analyze(input);
    assert.equal(result.status, "ok");
    assertValid(result, input);
    assertUniqueLocators(result);
    assert.equal(symbol(result, "Catalog.Product")?.kind, "class");
    assert.equal(symbol(result, "Catalog.Product.id")?.kind, "method");
    assert.equal(symbol(result, "Catalog.helper")?.kind, "function");

    const bracketedInput = {
      path: "Bracketed.php",
      content: "<?php namespace Demo { function task() { return 1; } }",
    };
    const bracketed = await extractor.analyze(bracketedInput);
    assert.equal(bracketed.status, "ok");
    assertValid(bracketed, bracketedInput);
    assert(symbol(bracketed, "Demo.task"));
    assert.equal(symbol(bracketed, "Demo.Demo.task"), undefined);
  });

  it("collapses exact C/C++ declarations and preserves overload signatures", async () => {
    const cContent = await fixture("c/Declarations.c");
    const cInput = { path: "Declarations.c", content: cContent };
    const c = await extractor.analyze(cInput);
    assert.equal(c.status, "partial");
    assertValid(c, cInput);
    assertUniqueLocators(c);
    assert.equal(
      c.symbols.filter((item) => item.name === "repeated").length,
      1,
    );
    assert.equal(symbol(c, "repeated")?.signature, "(int)");
    assert.equal(symbol(c, "struct.Widget")?.kind, "class");
    assert.equal(symbol(c, "typedef.Widget")?.kind, "type");
    assert(
      c.diagnostics.some(
        (item) => item.code === "TREESITTER_PREPROCESSOR_INCLUDE_UNAVAILABLE",
      ),
    );
    assert(
      c.diagnostics.some(
        (item) => item.code === "TREESITTER_PREPROCESSOR_CONDITION_UNRESOLVED",
      ),
    );
    assert(
      c.diagnostics.some(
        (item) => item.code === "TREESITTER_MACRO_EXPANSION_UNAVAILABLE",
      ),
    );
    assert(
      c.diagnostics.some(
        (item) => item.code === "TREESITTER_LOCATOR_COLLISION",
      ),
    );
    assert.equal(
      c.symbols.filter((item) => item.name === "branch_symbol").length,
      2,
    );
    assert.equal(symbol(c, "pointer_func")?.signature, "(const char*)");

    const cppContent = await fixture("cpp/Declarations.cpp");
    const cppInput = { path: "Declarations.cpp", content: cppContent };
    const cpp = await extractor.analyze(cppInput);
    assert.equal(cpp.status, "partial");
    assertValid(cpp, cppInput);
    assertUniqueLocators(cpp);
    assert.equal(cpp.symbols.filter((item) => item.name === "free").length, 2);
    assert.equal(symbol(cpp, "api.free(int)")?.kind, "function");
    assert.equal(symbol(cpp, "api.free(double)")?.kind, "function");
    assert.equal(
      cpp.symbols.filter((item) => item.qualifiedName === "api.Widget.run(int)")
        .length,
      1,
    );
    assert.equal(
      cpp.symbols.filter((item) => item.name === "branch_symbol").length,
      2,
    );

    const cvContent =
      "struct X { int f(); int f() const; }; int X::f() { return 0; }";
    const cvInput = { path: "cv.cpp", content: cvContent };
    const cv = await extractor.analyze(cvInput);
    assert.equal(cv.status, "ok");
    assertValid(cv, cvInput);
    assertUniqueLocators(cv);
    assert.equal(cv.symbols.filter((item) => item.name === "f").length, 2);
    assert.equal(symbol(cv, "X.f()")?.signature, "()");
    assert.equal(symbol(cv, "X.f() const")?.signature, "() const");
    const definition = symbol(cv, "X.f()");
    assert(definition);
    assert.equal(definition.startColumn, cvContent.indexOf("int X::f()"));
    assert.equal(definition.endColumn, cvContent.length);

    const operatorsInput = {
      path: "operators.cpp",
      content:
        "struct X { int operator()(int x) { return x; } int operator[](int x) { return x; } };",
    };
    const operators = await extractor.analyze(operatorsInput);
    assert.equal(operators.status, "ok");
    assertValid(operators, operatorsInput);
    assertUniqueLocators(operators);
    assert.equal(symbol(operators, "X.operator()(int)")?.kind, "method");
    assert.equal(symbol(operators, "X.operator[](int)")?.kind, "method");

    const bodyBefore = {
      path: "body.cpp",
      content: "int body(void) { return 1; }\n",
    };
    const bodyAfter = {
      path: "body.cpp",
      content: "int body(void) {\n return 1;\n return 2;\n}\n",
    };
    const before = await extractor.analyze(bodyBefore);
    const after = await extractor.analyze(bodyAfter);
    assert.equal(before.status, "ok");
    assert.equal(after.status, "ok");
    assertValid(before, bodyBefore);
    assertValid(after, bodyAfter);
    assert.equal(symbol(before, "body(void)")?.endLine, 1);
    assert.equal(symbol(after, "body(void)")?.endLine, 4);

    const damagedInput = {
      path: "damaged.c",
      content:
        "int clean(void) { return 1; }\nint damaged(void) {\n return ; broken syntax @;\n}\n",
    };
    const damaged = await extractor.analyze(damagedInput);
    assert.equal(damaged.status, "partial");
    assertValid(damaged, damagedInput);
    assert(symbol(damaged, "clean"));
    assert.equal(symbol(damaged, "damaged"), undefined);
    assert(
      damaged.diagnostics.some(
        (item) => item.code === "TREESITTER_DECLARATION_PARSE_ERROR",
      ),
    );

    const qualifiedInput = {
      path: "qualified.cpp",
      language: "cpp",
      content:
        "namespace api { int convert(const char* value); int convert(char* value); }",
    };
    const qualified = await extractor.analyze(qualifiedInput);
    assert.equal(qualified.status, "ok");
    assertValid(qualified, qualifiedInput);
    assert.equal(
      symbol(qualified, "api.convert(const char*)")?.signature,
      "(const char*)",
    );
    assert.equal(symbol(qualified, "api.convert(char*)")?.signature, "(char*)");
  });

  it("reports Ruby dynamic definitions and Bash redefinitions as partial", async () => {
    const rubyContent = await fixture("ruby/Dynamic.rb");
    const rubyInput = { path: "Dynamic.rb", content: rubyContent };
    const ruby = await extractor.analyze(rubyInput);
    assert.equal(ruby.status, "partial");
    assertValid(ruby, rubyInput);
    assertUniqueLocators(ruby);
    assert.equal(ruby.symbols.filter((item) => item.name === "id").length, 2);
    assert(
      ruby.diagnostics.some(
        (item) => item.code === "TREESITTER_RUBY_DYNAMIC_METHODS_UNAVAILABLE",
      ),
    );
    assert(
      ruby.diagnostics.some(
        (item) => item.code === "TREESITTER_LOCATOR_COLLISION",
      ),
    );

    const rubyRedefinitionInput = {
      path: "Redefinition.rb",
      content: "class X\n def f(x)\n end\n def f(x,y)\n end\nend\n",
    };
    const rubyRedefinition = await extractor.analyze(rubyRedefinitionInput);
    assert.equal(rubyRedefinition.status, "partial");
    assertValid(rubyRedefinition, rubyRedefinitionInput);
    assert.equal(
      rubyRedefinition.symbols.filter((item) => item.name === "f").length,
      2,
    );
    assert(
      rubyRedefinition.symbols
        .filter((item) => item.name === "f")
        .every(
          (item) =>
            item.signature === undefined && item.qualifiedName.includes("@"),
        ),
    );
    assertUniqueLocators(rubyRedefinition);

    const rubyDirectiveInput = {
      path: "Directive.rb",
      content:
        "class Annotated\n  # implements REQ-source-analysis-v2\n  def run\n  end\nend\n",
    };
    const rubyDirective = await extractor.analyze(rubyDirectiveInput);
    assert.equal(rubyDirective.status, "ok");
    assertValid(rubyDirective, rubyDirectiveInput);
    assert.equal(
      symbol(rubyDirective, "Annotated.run")?.directiveText,
      "# implements REQ-source-analysis-v2",
    );

    const phpRedefinitionInput = {
      path: "Redefinition.php",
      content:
        "<?php class X { function f(int $x) {} function f(string $x) {} }",
    };
    const phpRedefinition = await extractor.analyze(phpRedefinitionInput);
    assert.equal(phpRedefinition.status, "partial");
    assertValid(phpRedefinition, phpRedefinitionInput);
    assert.equal(
      phpRedefinition.symbols.filter((item) => item.name === "f").length,
      2,
    );
    assert(
      phpRedefinition.symbols
        .filter((item) => item.name === "f")
        .every((item) => item.qualifiedName.includes("@")),
    );
    assertUniqueLocators(phpRedefinition);

    const bashContent = await fixture("bash-functions.sh");
    const bashInput = { path: "functions.sh", content: bashContent };
    const bash = await extractor.analyze(bashInput);
    assert.equal(bash.status, "partial");
    assertValid(bash, bashInput);
    assertUniqueLocators(bash);
    assert.equal(
      bash.symbols.filter((item) => item.name === "plain_fn").length,
      2,
    );
    assert(
      bash.diagnostics.some(
        (item) => item.code === "TREESITTER_LOCATOR_COLLISION",
      ),
    );

    const dynamic = await extractor.analyze({
      path: "runtime.bash",
      content:
        "source ./functions.sh\neval 'made() { :; }'\nif true; then guarded() { :; }; fi\n",
    });
    assert.equal(dynamic.status, "partial");
    assert(
      dynamic.diagnostics.some(
        (item) =>
          item.code === "TREESITTER_BASH_DYNAMIC_DECLARATIONS_UNAVAILABLE",
      ),
    );
    assert(
      dynamic.diagnostics.some(
        (item) =>
          item.code === "TREESITTER_BASH_CONDITIONAL_FUNCTION_UNAVAILABLE",
      ),
    );
  });

  it("returns honest Terraform/HCL structure with injective label locators", async () => {
    const tfContent = await fixture("terraform-structure.tf");
    const tfInput = { path: "main.tf", content: tfContent };
    const tf = await extractor.analyze(tfInput);
    assert.equal(tf.status, "partial");
    assertValid(tf, tfInput);
    assertUniqueLocators(tf);
    assert.equal(
      symbol(tf, 'terraform:resource["aws_instance","web"]')?.kind,
      "unknown",
    );
    assert.equal(symbol(tf, 'terraform:local["service"]')?.kind, "variable");
    assert(!tf.symbols.some((item) => item.kind === "function"));
    assert(
      !tf.symbols.some(
        (item) => item.nativeKind === "terraform:block:provider",
      ),
    );
    assert(
      tf.diagnostics.some(
        (item) => item.code === "TREESITTER_LOCATOR_COLLISION",
      ),
    );
    assert(
      tf.diagnostics.some(
        (item) => item.code === "TREESITTER_TERRAFORM_NESTED_BLOCK_OMITTED",
      ),
    );

    const hclContent = await fixture("hcl/labels.hcl");
    const hclInput = { path: "labels.hcl", content: hclContent };
    const hcl = await extractor.analyze(hclInput);
    assert.equal(hcl.status, "partial");
    assertValid(hcl, hclInput);
    assertUniqueLocators(hcl);
    assert.equal(
      symbol(hcl, 'hcl:["resource","api.edge","worker.eu"]')?.kind,
      "unknown",
    );
    assert.equal(
      symbol(hcl, 'hcl:["resource","api","edge.worker.eu"]')?.kind,
      "unknown",
    );
    assert(
      hcl.diagnostics.some(
        (item) => item.code === "TREESITTER_HCL_NESTED_BLOCK_OMITTED",
      ),
    );

    const dynamicContent = await fixture("hcl/dynamic-labels.hcl");
    const dynamicInput = {
      path: "dynamic-labels.hcl",
      content: dynamicContent,
    };
    const dynamic = await extractor.analyze(dynamicInput);
    assert.equal(dynamic.status, "partial");
    assertValid(dynamic, dynamicInput);
    assert.equal(dynamic.symbols.length, 0);
    assert(
      dynamic.diagnostics.some(
        (item) => item.code === "TREESITTER_HCL_DYNAMIC_LABEL_OMITTED",
      ),
    );
  });

  it("marks malformed fixtures partial and omits damaged declarations", async () => {
    const cases = [
      ["java", "java/Incomplete.java"],
      ["csharp", "csharp/Incomplete.cs"],
      ["php", "php/Incomplete.php"],
      ["c", "c/Incomplete.c"],
      ["cpp", "cpp/Incomplete.cpp"],
      ["ruby", "ruby/Incomplete.rb"],
      ["bash", "bash-incomplete.sh"],
      ["terraform", "terraform-incomplete.tf"],
      ["hcl", "hcl/incomplete.hcl"],
    ];
    for (const [language, path] of cases) {
      const content = await fixture(path);
      const input = { path, language, content };
      const result = await extractor.analyze(input);
      assert.equal(
        result.status,
        "partial",
        `${language} parse damage is partial`,
      );
      assertValid(result, input);
      assert(
        result.diagnostics.some(
          (item) => item.code === "TREESITTER_SYNTAX_ERROR",
        ),
      );
      assert(
        result.uncoveredRanges.some(
          (item) => item.reason === "syntax-error-may-hide-declarations",
        ),
      );
      assert(
        !result.symbols.some((item) =>
          item.name.toLowerCase().includes("unfinished"),
        ),
      );
      if (language === "hcl") {
        assert(symbol(result, 'hcl:["resource","aws_instance","clean"]'));
      }
    }
  });
});
