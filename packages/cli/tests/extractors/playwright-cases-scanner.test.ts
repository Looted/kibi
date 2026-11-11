import { describe, expect, test } from "bun:test";
import { extractPlaywrightCases } from "../../src/extractors/playwright-cases.js";
import { playwrightCaseId } from "../../src/proof/producers/playwright-case-id.js";

const IMPORT = 'import { test } from "@playwright/test";\n';
const titles = (body: string, header = IMPORT): string[] =>
  extractPlaywrightCases("e2e/a.spec.ts", `${header}${body}`).symbols.map(
    (symbol) => symbol.title,
  );

describe("Playwright module detection", () => {
  test("only modules that load @playwright/test are scanned", () => {
    const body = 'test("t", fn);\n';
    expect(titles(body, "")).toEqual([]);
    expect(titles(body, 'import { test } from "vitest";\n')).toEqual([]);
    for (const header of [
      'import { test } from "@playwright/test";\n',
      "import { test } from '@playwright/test';\n",
      'import { test } from  "@playwright/test";\n',
      'const { test } = require("@playwright/test");\n',
      "const { test } = require( '@playwright/test');\n",
      'const { test } = require(\n  "@playwright/test/reporter");\n',
    ]) {
      expect(titles(body, header)).toEqual(["t"]);
    }
  });

  test("a module that loads nothing yields no symbols and no diagnostics", () => {
    expect(extractPlaywrightCases("a.ts", "test(name, fn);")).toEqual({
      symbols: [],
      diagnostics: [],
    });
  });
});

describe("Playwright case symbols", () => {
  test("a case records its exact span and identity", () => {
    const source = `${IMPORT}\n  test("first", fn);\n\ttest.only(\n    "second",\n    fn,\n  );`;
    expect(extractPlaywrightCases("e2e/a.spec.ts", source)).toEqual({
      symbols: [
        {
          id: playwrightCaseId("e2e/a.spec.ts", "first"),
          title: "first",
          sourceFile: "e2e/a.spec.ts",
          sourceLine: 3,
          sourceColumn: 3,
          sourceEndLine: 3,
          sourceEndColumn: 21,
          symbol_role: "behavioral",
          tags: ["test-case", "playwright"],
        },
        {
          id: playwrightCaseId("e2e/a.spec.ts", "second"),
          title: "second",
          sourceFile: "e2e/a.spec.ts",
          sourceLine: 4,
          sourceColumn: 2,
          sourceEndLine: 5,
          sourceEndColumn: 14,
          symbol_role: "behavioral",
          tags: ["test-case", "playwright"],
        },
      ],
      diagnostics: [],
    });
  });

  test("a case on the first line starts at column one", () => {
    const [symbol] = extractPlaywrightCases(
      "a.ts",
      'test("x", fn); // from "@playwright/test"\nmore();\n',
    ).symbols;
    expect(symbol).toMatchObject({
      sourceLine: 1,
      sourceColumn: 1,
      sourceEndLine: 1,
      sourceEndColumn: 42,
    });
  });

  test("a case on the last line ends at the end of the module", () => {
    const [symbol] = extractPlaywrightCases(
      "a.ts",
      `${IMPORT}test("z", fn);`,
    ).symbols;
    expect(symbol).toMatchObject({
      sourceLine: 2,
      sourceEndLine: 2,
      sourceEndColumn: 15,
    });
  });

  test("a multi-line title spans to the end of its closing line", () => {
    const [symbol] = extractPlaywrightCases(
      "a.ts",
      `${IMPORT}test(\`one\ntwo\`, fn); // tail\nnext();`,
    ).symbols;
    expect(symbol).toMatchObject({
      title: "one\ntwo",
      sourceLine: 2,
      sourceColumn: 1,
      sourceEndLine: 3,
      sourceEndColumn: 19,
    });
  });

  test("a dynamic title is reported instead of extracted", () => {
    const result = extractPlaywrightCases(
      "e2e/a.spec.ts",
      `${IMPORT}\ntest(name, fn);\ntest(\`\${a}\`.trim(), fn);\ntest("ok", fn);`,
    );
    expect(result.symbols.map((symbol) => symbol.title)).toEqual([
      "${a}",
      "ok",
    ]);
    expect(result.diagnostics).toEqual([
      {
        code: "dynamic_test_case_unresolved",
        sourceFile: "e2e/a.spec.ts",
        sourceLine: 3,
        detail:
          "The Playwright test title is computed at runtime and cannot enter a verification contract.",
      },
    ]);
  });

  test("a title must be the first argument", () => {
    expect(titles('test(name, "late");\ntest( \n "spaced", fn);')).toEqual([
      "spaced",
    ]);
  });
});

describe("Playwright title literals", () => {
  test("each quote style delimits a title and may hold the others", () => {
    expect(
      titles(
        [
          `test("double 'single' \`tick\`", fn);`,
          `test('single "double"', fn);`,
          "test(`tick 'single' \"double\"`, fn);",
          'test("", fn);',
        ].join("\n"),
      ),
    ).toEqual([
      "double 'single' `tick`",
      'single "double"',
      "tick 'single' \"double\"",
      "",
    ]);
  });

  test("escaped quotes and backslashes are unescaped, other escapes kept", () => {
    expect(
      titles(
        [
          String.raw`test("say \"hi\"", fn);`,
          String.raw`test('it\'s', fn);`,
          "test(`a \\` b`, fn);",
          String.raw`test("back\\slash \n", fn);`,
        ].join("\n"),
      ),
    ).toEqual(['say "hi"', "it's", "a ` b", "back\\slash \\n"]);
  });
});

describe("Playwright test aliases", () => {
  test("calls through imported aliases are cases", () => {
    const header =
      'import { test as base, test  as  pw, test as $x } from "@playwright/test";\n';
    expect(
      titles(
        'base("one", fn);\npw("two", fn);\n$x("three", fn);\nother("no", fn);\n',
        header,
      ),
    ).toEqual(["one", "two", "three"]);
  });

  test("only and skip modifiers and spacing before the call are allowed", () => {
    expect(
      titles(
        'test.only("a", fn);\ntest.skip ("b", fn);\ntest.fixme("c", fn);\ncontest("d", fn);\n',
      ),
    ).toEqual(["a", "b"]);
  });

  test("a function declared with the test name is not a case", () => {
    expect(
      titles(
        'function test(x) { return x; }\nfunction  test("y") {}\nasync function f() {}\ntest("real", fn);\n',
      ),
    ).toEqual(["real"]);
  });
});

describe("Playwright describe nesting", () => {
  test("cases inside describe callbacks are qualified by their suites", () => {
    expect(
      titles(
        [
          'test.describe("Outer", () => {',
          '  test("a", fn);',
          '  test.describe.only("Inner", () => {',
          '    test("b", () => { const x = { y: 1 }; });',
          "  });",
          '  test("c", fn);',
          "});",
          'test("d", fn);',
        ].join("\n"),
      ),
    ).toEqual(["Outer > a", "Outer > Inner > b", "Outer > c", "d"]);
  });

  test("a describe after a case does not qualify it", () => {
    expect(
      titles('test("a", fn);\ntest.describe("Later", () => {});\n'),
    ).toEqual(["a"]);
  });

  test("a describe without a callback body scopes what follows at its depth", () => {
    expect(titles('test.describe("S");\ntest("t", fn);\n')).toEqual(["S > t"]);
    expect(
      titles('const o = {};\ntest.describe("S");\ntest("t", fn);\n'),
    ).toEqual(["S > t"]);
    expect(
      titles('function f() { test.describe("Inner"); }\ntest("t", fn);\n'),
    ).toEqual(["t"]);
  });

  test("a describe whose callback never closes scopes the rest", () => {
    expect(titles('test.describe("Open", () => {\n  test("t", fn);\n')).toEqual(
      ["Open > t"],
    );
  });

  test("a dynamically titled describe adds no suite", () => {
    expect(
      titles('test.describe(name, () => {\n  test("t", fn);\n});\n'),
    ).toEqual(["t"]);
    expect(titles('test.describe(name);\ntest("t", fn);\n')).toEqual(["t"]);
  });

  test("braces inside string literals do not change the depth", () => {
    for (const literal of [
      '"}"',
      "'}'",
      "`}`",
      '"x}"',
      "'x}'",
      "`x}`",
      String.raw`"\"}"`,
    ]) {
      expect(
        titles(
          `function f() { test.describe("S"); const s = ${literal}; test("t", fn); }\n`,
        ),
      ).toEqual(["S > t"]);
    }
    expect(
      titles(
        'function f() { test.describe("S"); const s = "\\\\"; } test("t", fn);\n',
      ),
    ).toEqual(["t"]);
    expect(
      titles('test.describe("S"); const s = "{"; test("t", fn);\n'),
    ).toEqual(["S > t"]);
  });

  test("an empty string literal closes at its second quote", () => {
    expect(
      titles(
        'const e = "";\nfunction f() {\n  test.describe("S");\n}\ntest("t", fn);\n// require("@playwright/test")\n',
        "",
      ),
    ).toEqual(["t"]);
  });

  test("closing braces before a describe callback are not its block", () => {
    expect(titles('test.describe("S"); }\n{ }\ntest("t", fn);\n')).toEqual([
      "t",
    ]);
  });

  test("a stray closing brace does not make the depth negative", () => {
    expect(
      titles('}\ntest.describe("S");\nfunction f() { test("t", fn); }\n'),
    ).toEqual(["S > t"]);
  });
});
