// executable_for TEST-kibi-tree-sitter-language-packs
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateSourceAnalysisResultV2 } from "kibi-plugin-sdk";

const { createTreeSitterSymbolExtractor } = await import("../dist/index.js");
const { blankHeaderIdioms } = await import("../dist/preprocessor-idioms.js");
const extractor = createTreeSitterSymbolExtractor();

async function analyze(path, content, language) {
  const input = { path, content, ...(language ? { language } : {}) };
  const result = await extractor.analyze(input);
  assert.deepEqual(validateSourceAnalysisResultV2(result, input), result);
  return result;
}
const codesOf = (result) => result.diagnostics.map((entry) => entry.code);

const HEADER = `/* match.h: scoring */
#ifndef MATCH_H
#define MATCH_H MATCH_H

#ifdef __cplusplus
extern "C" {
#endif

typedef double score_t;

int has_match(const char *needle, const char *haystack);

#if 0
int retired(void);
#endif

#ifdef __cplusplus
}
#endif

#endif /* MATCH_H */
`;

describe("C and C++ header idioms", () => {
  it("reads a guarded header as the code the compiler sees", async () => {
    for (const [path, language] of [
      ["src/match.h", "c"],
      ["src/match.h", "cpp"],
      ["src/match.hpp", undefined],
    ]) {
      const result = await analyze(path, HEADER, language);
      assert.equal(result.status, "ok", JSON.stringify(result.diagnostics));
      assert.deepEqual(
        result.symbols.map((entry) => [entry.name, entry.startLine]),
        [
          ["score_t", 9],
          ["has_match", 11],
        ],
      );
    }
  });

  it("keeps every line and column where it was", () => {
    const blanked = blankHeaderIdioms(HEADER);
    assert.equal(blanked.length, HEADER.length);
    assert.deepEqual(
      blanked.split("\n").map((line) => line.length),
      HEADER.split("\n").map((line) => line.length),
    );
    assert.equal(blanked.split("\n")[8], "typedef double score_t;");
    assert.equal(blanked.split("\n")[1].trim(), "");
    assert.equal(
      blankHeaderIdioms("a\r\n#if 0\r\nb\r\n#endif\r\n"),
      "a\r\n     \r\n \r\n      \r\n",
    );
  });

  it("leaves a guard whose #define has a body, and lexes comments and digraphs", () => {
    const body = "#ifndef run\n#define run system\nint f(void);\n#endif\n";
    assert.equal(blankHeaderIdioms(body), body);
    for (const guard of ["#define G 1", "#define G G"])
      assert.equal(blankHeaderIdioms(`#ifndef G\n${guard}\nint f(void);\n#endif\n`).split("\n")[1].trim(), "");
    // `%:endif` closes `#if 0`; a `//` comment ending in `\` goes on.
    assert.equal(blankHeaderIdioms("#if 0\n%:endif\nint f(void);\n").split("\n")[2], "int f(void);");
    const spliced = "#if 0\n// a\\\n#endif\nint g;\n#endif\n";
    assert.equal(blankHeaderIdioms(spliced).split("\n")[4], "      ");
  });

  it("accepts the defined() spellings of both guards", () => {
    for (const open of ["#if !defined(G)", "#if !defined G", "# ifndef G"]) {
      const text = `${open}\n#define G\nint f(void);\n#endif\n`;
      assert.equal(blankHeaderIdioms(text).split("\n")[2], "int f(void);");
      assert.equal(blankHeaderIdioms(text).split("\n")[0].trim(), "");
    }
    for (const open of [
      "#if defined(__cplusplus)",
      "#if defined __cplusplus",
    ]) {
      const text = `${open}\n}\n#endif\n`;
      assert.equal(blankHeaderIdioms(text).trim(), "");
    }
  });

  it("leaves conditions it cannot decide as written", () => {
    const cases = [
      // The guard has an #else branch.
      "#ifndef G\n#define G\nint a;\n#else\nint b;\n#endif\n",
      // The define names another macro.
      "#ifndef G\n#define H\nint a;\n#endif\n",
      // Code follows the guard's #endif.
      "#ifndef G\n#define G\nint a;\n#endif\nint b;\n",
      // A continued directive line.
      "#ifndef G\n#define G \\\n 1\nint a;\n#endif\n",
      "#if 0 \\\n|| 1\nint a;\n#endif\n",
      "#if 0\n#define X \\\n 1\n#endif\n",
      // A __cplusplus block that declares something.
      '#ifdef __cplusplus\nextern "C" {\nint a;\n#endif\n',
      // __cplusplus with an else branch, and an unclosed #if 0.
      '#ifdef __cplusplus\nextern "C" {\n#else\n#endif\n',
      "#if 0\nint a;\n",
      // A guard-shaped file that never closes.
      "#ifndef G\n#define G\nint a;\n",
      // Only one code line.
      "#ifndef G\n",
    ];
    for (const text of cases) {
      assert.equal(blankHeaderIdioms(text), text, text);
    }
  });

  it("ignores directive-like text in comments and strings", () => {
    const text =
      '// #if 0\nconst char *s = "#if 0";\n/* #ifndef G\n#define G */\nint a;\n';
    assert.equal(blankHeaderIdioms(text), text);
    // An unterminated comment or string reads to the end without failing.
    assert.equal(blankHeaderIdioms("/* open"), "/* open");
    assert.equal(blankHeaderIdioms("char c = 'a\\'"), "char c = 'a\\'");
    assert.equal(blankHeaderIdioms("// end"), "// end");
  });

  it("still reports a condition it does not decide", async () => {
    const result = await analyze(
      "a.c",
      "#ifdef FEATURE\nint feature(void);\n#endif\n",
    );
    assert.deepEqual(codesOf(result), [
      "TREESITTER_PREPROCESSOR_CONDITION_UNRESOLVED",
    ]);
  });
});

describe("Terraform blocks without an address", () => {
  it("reads nested blocks as part of their resource and skips state refactoring blocks", async () => {
    const result = await analyze(
      "main.tf",
      [
        'variable "name" {',
        "  validation {",
        "    condition = true",
        '    error_message = "x"',
        "  }",
        "}",
        'resource "aws_s3_bucket" "this" {',
        "  lifecycle {",
        "    prevent_destroy = true",
        "  }",
        '  dynamic "rule" {',
        "    for_each = []",
        "    content {}",
        "  }",
        "}",
        "moved {",
        "  from = aws_s3_bucket.old",
        "  to   = aws_s3_bucket.this",
        "}",
        "import {",
        "  to = aws_s3_bucket.this",
        '  id = "b"',
        "}",
        "removed {",
        "  from = aws_s3_bucket.gone",
        "}",
        'check "health" {',
        "  assert {",
        "    condition     = true",
        '    error_message = "x"',
        "  }",
        "}",
      ].join("\n"),
    );
    assert.equal(result.status, "ok", JSON.stringify(result.diagnostics));
    assert.deepEqual(
      result.symbols.map((entry) => [entry.qualifiedName, entry.startLine]),
      [
        ['terraform:variable["name"]', 1],
        ['terraform:resource["aws_s3_bucket","this"]', 7],
      ],
    );
  });

  it("keeps resources between nested HCL blocks bound past the diagnostic cap", async () => {
    // 70 generic HCL blocks with a nested block each, so 70 local gaps: the
    // coalesced ranges must not cover the block headers.
    const content = Array.from(
      { length: 70 },
      (_, index) => `job "j${index}" {\n  task {\n    a = 1\n  }\n}`,
    ).join("\n");
    const result = await analyze("jobs.hcl", content);
    assert.equal(result.diagnostics.length, 64);
    assert.equal(result.symbols.length, 70);
    const swallowed = result.symbols.filter((entry) =>
      result.uncoveredRanges.some(
        (range) =>
          entry.startLine >= range.startLine &&
          entry.startLine <= range.endLine,
      ),
    );
    // Six merges are needed, and each swallows exactly one header; without
    // the symbol-aware order one span would cover every later block.
    assert.equal(swallowed.length, 6);
  });

  it("merges overlapping and same-line gaps before closing any gap between them", async () => {
    const nested = Array.from(
      { length: 40 },
      (_, index) =>
        `job "j${index}" {\n  task {\n    inner {\n      a = 1\n    }\n  }\n}`,
    ).join("\n");
    const result = await analyze("jobs.hcl", nested);
    assert.equal(result.diagnostics.length, 40);
    assert.equal(result.symbols.length, 40);
    assert(
      result.diagnostics.every(
        (entry) => entry.code === "TREESITTER_LOCAL_GAPS_SUMMARIZED",
      ),
    );
    const sameLine = Array.from(
      { length: 70 },
      (_, index) => `exec("a${index}"); exec("b${index}")`,
    ).join("\n");
    const python = await analyze("exec.py", sameLine);
    assert.equal(python.diagnostics.length, 64);
    assert.equal(python.diagnostics[0].range.startColumn, 0);
  });

  it("keeps whole-file findings before the cap as they are when coalescing", async () => {
    const content = [
      "x = (",
      "y = )",
      ...Array.from({ length: 70 }, (_, index) => `exec("a${index}")`),
    ].join("\n");
    const result = await analyze("a.py", content);
    assert.equal(result.diagnostics.length, 64);
    assert.deepEqual(
      result.diagnostics.slice(0, 3).map((entry) => entry.code),
      [
        "TREESITTER_DECLARATION_PARSE_ERROR",
        "TREESITTER_SYNTAX_ERROR",
        "TREESITTER_LOCAL_GAPS_SUMMARIZED",
      ],
    );
  });
});
