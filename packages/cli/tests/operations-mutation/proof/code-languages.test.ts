import { describe, expect, test } from "bun:test";
import {
  CODE_LANGUAGE_NAMES,
  PLUGIN_LANGUAGE_PACKS,
  PLUGIN_REFERENCE_LANGUAGE_NAMES,
  PLUGIN_REFERENCE_LANGUAGES,
  codeLanguage,
  languageName,
  pluginReferenceLanguage,
  prologLoadSpecs,
  stripPrologExtension,
  unsupportedLanguageReason,
} from "../../../src/operations/proof/code-languages.js";

describe("codeLanguage", () => {
  test("maps every JavaScript and TypeScript extension", () => {
    for (const ext of ["js", "jsx", "ts", "tsx", "mjs", "cjs", "mts", "cts", "MJSX", "TS"]) {
      expect(codeLanguage(`a/b.${ext}`)).toBe("js");
    }
  });

  test("maps Python and Prolog and nothing else", () => {
    expect(codeLanguage("x.py")).toBe("python");
    expect(codeLanguage("x.PY")).toBe("python");
    expect(codeLanguage("x.pl")).toBe("prolog");
    expect(codeLanguage("x.PLT")).toBe("prolog");
    for (const file of [
      "x.ts.bak",
      "x.pyc",
      "x.plx",
      "x.pro",
      "x.xjs",
      "x.json",
      "x.ats",
      "x.s",
      "ts",
      "x.pyi",
      "x.p",
    ]) {
      expect(codeLanguage(file)).toBeNull();
    }
  });
});

describe("prologLoadSpecs", () => {
  test("reads each load directive form", () => {
    const source = [
      ":- use_module(library( lists )).",
      ":- ensure_loaded('src/a.pl').",
      ':- consult("src/b").',
      ":- load_files(rules/c, []).",
      ":- reexport (library(apply)).",
      ":- include( d ).",
      ":- [e, 'f.pl', \"g\",  ].",
      ":- ['h'].",
    ].join("\n");
    expect(prologLoadSpecs(source)).toStrictEqual([
      { library: "lists" },
      { path: "src/a.pl" },
      { path: "src/b" },
      { path: "rules/c" },
      { library: "apply" },
      { path: "d" },
      { path: "e" },
      { path: "f.pl" },
      { path: "g" },
      { path: "h" },
    ]);
  });

  test("ignores look-alikes and empty specs", () => {
    expect(
      prologLoadSpecs(
        "xuse_module(a). use_module(Var). use_module(''). use_module(\"\"). consult_all(x). :- [ , ].",
      ),
    ).toStrictEqual([]);
  });

  test("keeps going after a match", () => {
    expect(prologLoadSpecs("use_module(a), use_module(b)")).toStrictEqual([
      { path: "a" },
      { path: "b" },
    ]);
    expect(prologLoadSpecs(":- [a].\n:- [b].")).toStrictEqual([
      { path: "a" },
      { path: "b" },
    ]);
  });

  test("reads a load list without spacing and strips only edge quotes", () => {
    expect(prologLoadSpecs(":-[a].")).toStrictEqual([{ path: "a" }]);
    expect(prologLoadSpecs(":- ['a\'b\"c\"].")).toStrictEqual([
      { path: "a'b\"c" },
    ]);
  });

  test("reads library names and paths up to their delimiter", () => {
    expect(
      prologLoadSpecs(
        "use_module(library(http/json)) use_module(a_b/c9) use_module('it''s')",
      ),
    ).toStrictEqual([{ library: "http/json" }, { path: "a_b/c9" }, { path: "it" }]);
    // A malformed library spec falls through to the plain-atom form.
    expect(prologLoadSpecs("use_module(library(x y))")).toStrictEqual([
      { path: "library" },
    ]);
  });
});

describe("stripPrologExtension", () => {
  test("normalizes and strips Prolog extensions only", () => {
    expect(stripPrologExtension("a/./b/../c.pl")).toBe("a/c");
    expect(stripPrologExtension("c.PLT")).toBe("c");
    expect(stripPrologExtension("c.pro")).toBe("c");
    expect(stripPrologExtension("c.pl.bak")).toBe("c.pl.bak");
    expect(stripPrologExtension("c.py")).toBe("c.py");
  });
});

describe("plugin languages", () => {
  test("names each reference language", () => {
    const cases: Array<[string, string | null]> = [
      ["a.go", "Go"],
      ["a.java", "Java"],
      ["a.cs", "C#"],
      ["a.rs", "Rust"],
      ["a.php", "PHP"],
      ["a.c", "C"],
      ["a.H", "C"],
      ["a.bash", "Bash"],
      ["a.sh", "Bash"],
      ["a.tf", "Terraform/HCL"],
      ["a.HCL", "Terraform/HCL"],
      ["a.go.txt", null],
      ["a.cpp", null],
      ["a.ts", null],
    ];
    for (const [file, name] of cases) {
      expect(pluginReferenceLanguage(file)).toBe(name);
    }
    expect(PLUGIN_REFERENCE_LANGUAGES.map((language) => language.name)).toStrictEqual([
      "Go",
      "Java",
      "C#",
      "Rust",
      "PHP",
      "C",
      "Bash",
      "Terraform/HCL",
    ]);
    expect(PLUGIN_REFERENCE_LANGUAGE_NAMES).toBe(
      "Go, Java, C#, Rust, PHP, C, Bash and Terraform/HCL",
    );
  });

  test("maps files to language packs", () => {
    const pack = (file: string): string | null =>
      PLUGIN_LANGUAGE_PACKS.find((entry) => entry.pattern.test(file))?.pack ?? null;
    const cases: Array<[string, string | null]> = [
      ["a.go", "kibi-lang-go"],
      ["a.rs", "kibi-lang-rust"],
      ["a.java", "kibi-lang-java"],
      ["a.cs", "kibi-lang-csharp"],
      ["a.php", "kibi-lang-php"],
      ["a.c", "kibi-lang-c"],
      ["a.h", null],
      ["a.cc", "kibi-lang-cpp"],
      ["a.cpp", "kibi-lang-cpp"],
      ["a.cxx", "kibi-lang-cpp"],
      ["a.hh", "kibi-lang-cpp"],
      ["a.hpp", "kibi-lang-cpp"],
      ["a.HXX", "kibi-lang-cpp"],
      ["a.bash", "kibi-lang-bash"],
      ["a.sh", "kibi-lang-bash"],
      ["a.rb", "kibi-lang-ruby"],
      ["a.tf", "kibi-lang-hcl"],
      ["a.hcl", "kibi-lang-hcl"],
      ["a.py", "kibi-lang-python"],
      ["a.pyi", "kibi-lang-python"],
      ["a.pl", "kibi-lang-prolog"],
      ["a.plt", "kibi-lang-prolog"],
      ["a.go.bak", null],
      ["a.pyx", null],
    ];
    for (const [file, name] of cases) expect(pack(file)).toBe(name);
    expect(
      PLUGIN_LANGUAGE_PACKS.map(({ pack, name }) => [pack, name]),
    ).toStrictEqual([
      ["kibi-lang-go", "Go"],
      ["kibi-lang-rust", "Rust"],
      ["kibi-lang-java", "Java"],
      ["kibi-lang-csharp", "C#"],
      ["kibi-lang-php", "PHP"],
      ["kibi-lang-c", "C"],
      ["kibi-lang-cpp", "C++"],
      ["kibi-lang-bash", "Bash"],
      ["kibi-lang-ruby", "Ruby"],
      ["kibi-lang-hcl", "Terraform/HCL"],
      ["kibi-lang-python", "Python"],
      ["kibi-lang-prolog", "SWI-Prolog"],
    ]);
  });
});

describe("language names and refusals", () => {
  test("names a file's language", () => {
    expect(CODE_LANGUAGE_NAMES).toStrictEqual({
      js: "TypeScript or JavaScript",
      python: "Python",
      prolog: "SWI-Prolog",
    });
    expect(languageName("a.ts")).toBe("TypeScript or JavaScript");
    expect(languageName("a.py")).toBe("Python");
    expect(languageName("a.pl")).toBe("SWI-Prolog");
    expect(languageName("a.go")).toBe("an unsupported language");
  });

  test("lists the supported languages and the refused files", () => {
    expect(
      unsupportedLanguageReason("The reader", ["js", "python", "prolog"], [
        "a.go",
        "b.go",
        "c.go",
        "d.go",
        "e.go",
      ]),
    ).toBe(
      "The reader reads TypeScript, JavaScript, Python and SWI-Prolog files, not a.go, b.go, c.go and 2 more",
    );
    expect(unsupportedLanguageReason("R", ["python"], ["a.go", "b.go", "c.go"])).toBe(
      "R reads Python files, not a.go, b.go, c.go",
    );
    expect(unsupportedLanguageReason("R", ["js"], ["a.go", "b.go", "c.go", "d.go"])).toBe(
      "R reads TypeScript, JavaScript files, not a.go, b.go, c.go and 1 more",
    );
    expect(unsupportedLanguageReason("R", [], [])).toBe("R reads no files, not ");
  });
});
