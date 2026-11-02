// executable_for TEST-kibi-tree-sitter-script-references
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateReferenceExtractionResult } from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterReferenceExtractor } = await import("../dist/index.js");
const extractor = createTreeSitterReferenceExtractor();

/**
 * Every member in order and every unresolved row (`line: text`) of one read,
 * so that a reader that adds, drops or reorders anything fails.
 */
async function read(source, extract, options) {
  const result = await extractor.extract({
    path: "src/a.c",
    content: `${source.join("\n")}\n`,
    extract,
    ...options,
  });
  assert.deepEqual(validateReferenceExtractionResult(result), result);
  assert.equal(result.status, "ok", JSON.stringify(result));
  return {
    members: result.members,
    rows: result.unresolved.map((row) => `${row.line}: ${row.text}`),
  };
}

function check(name, extract, options, source, expected) {
  it(name, async () => {
    assert.deepEqual(await read(source, extract, options), expected);
  });
}

describe("C reader: names, strings and numbers", () => {
  check(
    "reads the variable getenv names",
    "env",
    {},
    ["void f(void) {", '  getenv("V");', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable secure_getenv names",
    "env",
    {},
    ["void f(void) {", '  secure_getenv("V");', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable __secure_getenv names",
    "env",
    {},
    ["void f(void) {", '  __secure_getenv("V");', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable _wgetenv names",
    "env",
    {},
    ["void f(void) {", '  _wgetenv("V");', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable GetEnvironmentVariable names",
    "env",
    {},
    ["void f(void) {", '  GetEnvironmentVariable("V", b, 9);', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable GetEnvironmentVariableA names",
    "env",
    {},
    ["void f(void) {", '  GetEnvironmentVariableA("V", b, 9);', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable GetEnvironmentVariableW names",
    "env",
    {},
    ["void f(void) {", '  GetEnvironmentVariableW("V", b, 9);', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable _dupenv_s names",
    "env",
    {},
    ["void f(void) {", '  _dupenv_s(&p, &n, "V");', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable _wdupenv_s names",
    "env",
    {},
    ["void f(void) {", '  _wdupenv_s(&p, &n, "V");', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable getenv_s names",
    "env",
    {},
    ["void f(void) {", '  getenv_s(&n, b, 9, "V");', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable _wgetenv_s names",
    "env",
    {},
    ["void f(void) {", '  _wgetenv_s(&n, b, 9, "V");', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable g_getenv names",
    "env",
    {},
    ["void f(void) {", '  g_getenv("V");', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable g_environ_getenv names",
    "env",
    {},
    ["void f(void) {", '  g_environ_getenv(e, "V");', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable uv_os_getenv names",
    "env",
    {},
    ["void f(void) {", '  uv_os_getenv("V", b, &n);', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable apr_env_get names",
    "env",
    {},
    ["void f(void) {", '  apr_env_get(&p, "V", pool);', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "reads the variable getenv_r names",
    "env",
    {},
    ["void f(void) {", '  getenv_r("V", b, 9);', "}"],
    { members: ["V"], rows: [] },
  );

  check(
    "refuses a macro that reads the whole environment",
    "env",
    {},
    [
      "#define W0 environ",
      "#define W1 __environ",
      "#define W2 _environ",
      "#define W3 _wenviron",
      "#define W4 GetEnvironmentStrings",
      "#define W5 GetEnvironmentStringsA",
      "#define W6 GetEnvironmentStringsW",
      "#define W7 ExpandEnvironmentStrings",
      "#define W8 ExpandEnvironmentStringsA",
      "#define W9 ExpandEnvironmentStringsW",
      "#define W10 _NSGetEnviron",
      "#define W11 g_get_environ",
      "#define W12 g_listenv",
      "#define W13 uv_os_environ",
      "void f(void) {",
      "  W0();",
      "  W1();",
      "  W2();",
      "  W3();",
      "  W4();",
      "  W5();",
      "  W6();",
      "  W7();",
      "  W8();",
      "  W9();",
      "  W10();",
      "  W11();",
      "  W12();",
      "  W13();",
      "}",
    ],
    {
      members: [],
      rows: [
        "16: W0()",
        "17: W1()",
        "18: W2()",
        "19: W3()",
        "20: W4()",
        "21: W5()",
        "22: W6()",
        "23: W7()",
        "24: W8()",
        "25: W9()",
        "26: W10()",
        "27: W11()",
        "28: W12()",
        "29: W13()",
      ],
    },
  );

  check(
    "refuses the environment declared as a variable",
    "env",
    {},
    [
      "extern char **environ;",
      "extern char **__environ;",
      "extern char **_environ;",
      "extern char **_wenviron;",
      "void f(void) {",
      "  use(environ);",
      "  use(__environ);",
      "  use(_environ);",
      "  use(_wenviron);",
      "}",
    ],
    {
      members: [],
      rows: ["6: environ", "7: __environ", "8: _environ", "9: _wenviron"],
    },
  );

  check(
    "refuses calls that look like getters",
    "env",
    {},
    [
      "void f(void) {",
      "  envget(1);",
      "  environment(1);",
      "  my_get_env(1);",
      "  SDL_getenv(1);",
      "}",
    ],
    {
      members: [],
      rows: ["2: envget(1)", "4: my_get_env(1)", "5: SDL_getenv(1)"],
    },
  );

  check(
    "knows library variables in a macro body",
    "calls",
    {},
    [
      "#define LIBS (stdin, stdout, stderr, errno, optarg, optind, opterr, optopt, timezone, daylight, tzname, signgam, sys_errlist, sys_nerr, program_invocation_name, program_invocation_short_name, NULL, true, false)",
      "void f(void) {",
      "  LIBS;",
      "}",
    ],
    { members: [], rows: [] },
  );

  check(
    "skips keywords in a macro body",
    "calls",
    {},
    [
      "#define KWS if else while for do switch case default return sizeof break continue goto typedef struct union enum static extern const volatile register auto inline restrict signed unsigned char short int long float double void _Bool bool _Alignof alignof _Static_assert static_assert _Generic __attribute__ __typeof__ typeof defined x",
      "void f(void) {",
      "  KWS;",
      "}",
    ],
    { members: ["x"], rows: [] },
  );

  check(
    "reads entry points that take the environment",
    "env",
    {},
    [
      "int _tmain(int argc, char **argv, char **envp) { return 0; }",
      "int wmain(int argc, char **argv) { return 0; }",
    ],
    { members: [], rows: ["1: (int argc, char **argv, char **envp)"] },
  );

  check(
    "reads escapes",
    "env",
    {},
    [
      "void f(void) {",
      '  getenv("A\\a\\b\\f\\v\\t\\r\\n\\\\\\"\\\'\\?B");',
      '  getenv("A\\012B");',
      '  getenv("A\\0");',
      '  getenv("A\\101\\x41");',
      '  getenv("A\\x4g");',
      "}",
    ],
    {
      members: ["A\u0007\b\f\u000b\t\r\n\\\"'?B", "A\nB", "AAA", "A\u0004g"],
      rows: ['4: getenv("A\\0")'],
    },
  );

  check(
    "refuses strings it cannot read",
    "env",
    {},
    [
      "void f(void) {",
      '  getenv("A\\qx41");',
      '  getenv("A\\q1");',
      "  getenv();",
      '  getenv("A??B");',
      '  getenv("A" == "B");',
      '  getenv("A B");',
      '  getenv(PREFIX "X");',
      '  getenv("A" /* c */ "B");',
      "}",
    ],
    {
      members: ["A??B", "A B"],
      rows: [
        '2: getenv("A\\qx41")',
        '3: getenv("A\\q1")',
        "4: getenv()",
        '6: getenv("A" == "B")',
        '8: getenv(PREFIX "X")',
        '9: getenv("A" /* c */ "B")',
      ],
    },
  );

  check(
    "refuses a trigraph",
    "env",
    {},
    ["void f(void) {", '  getenv("A??/B");', "}"],
    { members: [], rows: ['2: getenv("A??/B");', '2: getenv("A??/B")'] },
  );

  check(
    "reads numbers as the program holds them",
    "property",
    { key: "x" },
    [
      "struct s a = { .x = 123u };",
      "struct s a = { .x = 1ull };",
      "struct s a = { .x = 1uLL };",
      "struct s a = { .x = 1ul };",
      "struct s a = { .x = 1uL };",
      "struct s a = { .x = 1uwb };",
      "struct s a = { .x = 1uWB };",
      "struct s a = { .x = 1llu };",
      "struct s a = { .x = 1LLU };",
      "struct s a = { .x = 1lu };",
      "struct s a = { .x = 1Lu };",
      "struct s a = { .x = 1wbu };",
      "struct s a = { .x = 1WBu };",
      "struct s a = { .x = 1ll };",
      "struct s a = { .x = 1LL };",
      "struct s a = { .x = 1l };",
      "struct s a = { .x = 1L };",
      "struct s a = { .x = 1wb };",
      "struct s a = { .x = 1WB };",
      "struct s a = { .x = 0x1F };",
      "struct s a = { .x = 0b101 };",
      "struct s a = { .x = 017 };",
      "struct s a = { .x = 0 };",
      "struct s a = { .x = 12.5 };",
      "struct s a = { .x = 12e3 };",
      "struct s a = { .x = .25 };",
      "struct s a = { .x = 1e+2 };",
      "struct s a = { .x = 1e10 };",
      "struct s a = { .x = 1e-0000000000000005 };",
      "struct s a = { .x = 000000000000000001.5 };",
      "struct s a = { .x = 1000000000000000.5 };",
      "struct s a = { .x = 1.0000000000000005000 };",
      "struct s a = { .x = 1.5000000000000000000 };",
      "struct s a = { .x = 0.5 };",
      "struct s a = { .x = 1.23456789012345 };",
      "struct s a = { .x = 1.234567890123456 };",
      "struct s a = { .x = 1e21 };",
      "struct s a = { .x = 1e20 };",
      "struct s a = { .x = 1e400 };",
      "struct s a = { .x = 1.5f };",
      "struct s a = { .x = 2.0f };",
      "struct s a = { .x = 1e-7 };",
      "struct s a = { .x = -0 };",
      "struct s a = { .x = -1 };",
      "struct s a = { .x = -1e-7 };",
      "struct s a = { .x = - 0 };",
      "struct s a = { .x = - 1 };",
      "struct s a = { .x = - - 1 };",
      "struct s a = { .x = +1 };",
      "struct s a = { .x = (2) };",
      "struct s a = { .x = ( /* c */ 2) };",
      "struct s a = { .x = 'a' };",
      "struct s a = { .x = 0x1.8p1 };",
      "struct s a = { .x = 1'000 };",
      'struct s a = { .x = "s" };',
      'struct s a = { .x = u8"s" };',
      'struct s a = { .x = L"s" };',
      "struct s a = { .x = true };",
      "struct s a = { .x = false };",
      "struct s a = { .x = NULL };",
      "struct s a = { .x = (NULL) };",
      "struct s a = { .x = !1 };",
      "struct s a = { .x = - x };",
    ],
    {
      members: [
        "123",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "31",
        "5",
        "15",
        "0",
        "12.5",
        "12000",
        "0.25",
        "100",
        "10000000000",
        "0.00001",
        "1.5",
        "1.5",
        "0.5",
        "1.23456789012345",
        "100000000000000000000",
        "2",
        "0",
        "-1",
        "0",
        "-1",
        "2",
        "1000",
        "s",
        "s",
        "s",
        "true",
        "false",
        "NULL",
        "NULL",
      ],
      rows: [
        "31: .x = 1000000000000000.5",
        "32: .x = 1.0000000000000005000",
        "36: .x = 1.234567890123456",
        "37: .x = 1e21",
        "39: .x = 1e400",
        "40: .x = 1.5f",
        "42: .x = 1e-7",
        "45: .x = -1e-7",
        "48: .x = - - 1",
        "49: .x = +1",
        "51: .x = ( /* c */ 2)",
        "52: .x = 'a'",
        "53: .x = 0x1.8p1",
        "62: .x = !1",
        "63: .x = - x",
      ],
    },
  );

  check(
    "splices macro lines",
    "calls",
    {},
    [
      "#define A1 a_t\\",
      "(1)",
      "#define A4 d_t\\\r",
      "(1)",
      "#define A5 foo\\",
      "bar",
      "#define A6 x_t\\yz_t\\",
      "(1)",
      "void f(void) {",
      "  A1;",
      "  A4;",
      "  A5;",
      "  A6;",
      "}",
    ],
    {
      members: ["a_t", "d_t", "foo", "bar", "yz_t"],
      rows: ["5: #define A5 foo\\"],
    },
  );

  check(
    "reads calls and methods in a macro body",
    "calls",
    {},
    [
      "#define M1 e_t (1)",
      "#define M2 p->run(1); q. go (2); r->stop (3)",
      "void f(void) {",
      "  M1;",
      "  M2;",
      "}",
    ],
    {
      members: ["e_t", "p", "q", "go", "r", "*.run", "*.go", "*.stop"],
      rows: [],
    },
  );

  check(
    "blanks literals and comments in a macro body",
    "calls",
    {},
    [
      "#define M1 a / b // c d",
      '#define M2 f("x(y") g(\'"\') h("\\"k") i(\'\\\'\')',
      '#define M3 stdin ""',
      "#define M4 stdin//c",
      "#define M5 stdin /* c */",
      "void f(void) {",
      "  M1;",
      "  M2;",
      "  M3(1);",
      "  M4(1);",
      "  M5(1);",
      "}",
    ],
    {
      members: [
        "a",
        "b",
        "f",
        "g",
        "h",
        "i",
        "M3",
        "M4",
        "stdin",
        "M5",
        "stdin",
      ],
      rows: [],
    },
  );
});

describe("C reader: macros and declarations", () => {
  check(
    "refuses a macro whose _Pragma restores another",
    "calls",
    {},
    [
      '#define SAVE _Pragma("push_macro(\\"x\\")")',
      '#define ONCE _Pragma("once")',
      "#define STR(x) _Pragma(#x)",
      '#define MS __pragma(pop_macro("y"))',
      "#define EMPTY",
      "void f(void) {",
      "  EMPTY;",
      "  ONCE;",
      "}",
    ],
    {
      members: ["_Pragma"],
      rows: [
        '1: #define SAVE _Pragma("push_macro(\\"x\\")") ',
        "3: #define STR(x) _Pragma(#x) ",
        '4: #define MS __pragma(pop_macro("y")) ',
      ],
    },
  );

  check(
    "keeps a _Pragma macro out of imports",
    "imports",
    {},
    [
      '#define SAVE _Pragma("push_macro(\\"x\\")")',
      '#define ONCE _Pragma("once")',
      "#define STR(x) _Pragma(#x)",
      '#define MS __pragma(pop_macro("y"))',
      "#define EMPTY",
      "void f(void) {",
      "  EMPTY;",
      "  ONCE;",
      "}",
    ],
    { members: [], rows: [] },
  );

  check(
    "skips the parameters of a function-like macro",
    "calls",
    {},
    [
      "#define F(a, b, ...) g(a, b, c, __VA_ARGS__)",
      "void f(void) {",
      "  F(1, 2, 3);",
      "}",
    ],
    { members: ["F", "g", "c", "__VA_ARGS__"], rows: [] },
  );

  check(
    "ends a macro at #undef",
    "calls",
    {},
    [
      "#define X system",
      "#undef X",
      "#define Y popen",
      "# undef Y // note",
      "#define Z execl",
      "#undef 1 Z",
      "#undef",
      "#pragma Z",
      "void f(void) {",
      "  g(X);",
      "  g(Y);",
      "  g(Z);",
      "}",
      "#undef X",
      "#define W abort",
      "void h(void) {",
      "#undef W",
      "W();",
      "#define V exit",
      "#ifdef A",
      "#undef V",
      "V();",
      "#endif",
      "}",
    ],
    {
      members: ["g", "X", "g", "Y", "g", "execl", "W"],
      rows: ["22: V()", "20: #ifdef A #undef V V(); #endif"],
    },
  );

  check(
    "refuses a macro defined in any branch of a conditional",
    "calls",
    {},
    [
      "#if A",
      "#define C1 system",
      "#elif B",
      "#define C2 system",
      "#else",
      "#define C3 system",
      "#endif",
      "#ifdef D",
      "#define C4 system",
      "#elifdef E",
      "#define C5 system",
      "#endif",
      "void f(void) {",
      "  C1;",
      "  C2;",
      "  C3;",
      "  C4;",
      "  C5;",
      "}",
    ],
    { members: [], rows: ["14: C1", "15: C2", "16: C3", "17: C4", "18: C5"] },
  );

  check(
    "does not take struct fields for variables",
    "calls",
    {},
    [
      "struct s { int (*run)(void); int system; };",
      "void f(void) {",
      "  run();",
      '  system("x");',
      "}",
    ],
    { members: ["run", "system"], rows: [] },
  );

  check(
    "tells variables from functions of the same name",
    "calls",
    {},
    [
      "int cb(void);",
      "extern int cb;",
      "int cb2(void) { return 0; }",
      "int cb2;",
      "void o(void) { g(cb); g(cb2); cb(); cb2(); }",
    ],
    { members: ["g", "cb", "g", "cb2"], rows: ["5: cb()", "5: cb2()"] },
  );

  check(
    "keeps a local variable from a function of the same name 1",
    "calls",
    {},
    [
      "int run(void);",
      "void k(int run) { g(run); }",
      "void s(void) { g(run); }",
    ],
    { members: ["g", "g"], rows: [] },
  );

  check(
    "keeps a local variable from a function of the same name 2",
    "calls",
    {},
    [
      "int run(void);",
      "void m(run) int run; { g(run); }",
      "void s(void) { g(run); }",
    ],
    { members: ["g", "g"], rows: [] },
  );

  check(
    "keeps a local variable from a function of the same name 3",
    "calls",
    {},
    [
      "int run(void);",
      "void n(void) { int run; g(run); }",
      "void s(void) { g(run); }",
    ],
    { members: ["g", "g"], rows: [] },
  );

  check(
    "keeps a local variable from a function of the same name 4",
    "calls",
    {},
    [
      "int run(void);",
      "int *p(int run) { g(run); }",
      "void s(void) { g(run); }",
    ],
    { members: ["g", "g"], rows: [] },
  );

  check(
    "keeps a local variable from a function of the same name 5",
    "calls",
    {},
    [
      "int run(void);",
      "void q(int (*hook)(int run)) { g(run); }",
      "void s(void) { g(run); }",
    ],
    { members: ["g", "run", "g", "run"], rows: [] },
  );

  check(
    "keeps a local variable from a function of the same name 6",
    "calls",
    {},
    ["int run(void);", "void r(int run);", "void s(void) { g(run); }"],
    { members: ["g", "run"], rows: [] },
  );

  check(
    "keeps a local variable from a function of the same name 7",
    "calls",
    {},
    ["int run(void);", "int run;", "void s(void) { g(run); }"],
    { members: ["g", "run"], rows: [] },
  );

  check(
    "reads a prototype in a body for calls",
    "calls",
    {},
    ["void f(void) {", "  int n;", "  n * run(cmd);", "}"],
    { members: [], rows: ["3: n * run(cmd);"] },
  );

  check(
    "reads a prototype in a body for string_args",
    "string_args",
    { callee: "run" },
    ["void f(void) {", "  int n;", "  n * run(cmd);", "}"],
    { members: [], rows: ["3: n * run(cmd);"] },
  );

  check(
    "reads a prototype in a body for env",
    "env",
    {},
    ["void f(void) {", "  int n;", "  n * run(cmd);", "}"],
    { members: [], rows: ["3: n * run(cmd);"] },
  );

  check(
    "reads a prototype in a body for property",
    "property",
    { key: "x" },
    ["void f(void) {", "  int n;", "  n * run(cmd);", "}"],
    { members: [], rows: [] },
  );

  check(
    "reads a prototype in a body for imports",
    "imports",
    {},
    ["void f(void) {", "  int n;", "  n * run(cmd);", "}"],
    { members: [], rows: [] },
  );

  check(
    "knows enumerators as variables",
    "env",
    {},
    [
      "enum { my_getenv, B = my_getenv };",
      "void f(void) {",
      "  g(my_getenv);",
      "  int my_env_get;",
      "  g(my_env_get);",
      "  g(other_getenv);",
      "}",
    ],
    { members: [], rows: ["6: other_getenv"] },
  );

  check(
    "reads a macro only after its definition",
    "calls",
    {},
    [
      "void f(void) {",
      "  g(X);",
      "}",
      "#define X system",
      "void h(void) { g(X); }",
    ],
    { members: ["g", "X", "g", "system"], rows: [] },
  );

  check(
    "refuses a macro also defined under #ifdef",
    "calls",
    {},
    [
      "#ifdef A",
      "#define X a",
      "#endif",
      "#define X b",
      "void f(void) {",
      "  X;",
      "}",
    ],
    { members: [], rows: ["6: X"] },
  );

  check(
    "reads a macro used before a conditional #undef",
    "calls",
    {},
    [
      "#define X system",
      "void f(void) {",
      '  X("a");',
      "}",
      "#ifdef A",
      "#undef X",
      "#endif",
    ],
    { members: ["X", "system"], rows: [] },
  );

  check(
    "follows a call after a macro whose body ends with a name",
    "calls",
    {},
    [
      "#define F(x) G",
      "#define G(y) system(y)",
      "#define R G",
      "#define S G 1",
      "void f(void) {",
      "  F(1)(2);",
      "  R(2);",
      "  S(3);",
      "}",
    ],
    { members: ["F", "G", "R", "system", "S", "G"], rows: ["6: F(1)(2)"] },
  );

  check(
    "expands a name defined both ways",
    "calls",
    {},
    [
      "#define H system",
      "#define H(x) x",
      "#define M H",
      "void f(void) {",
      "  M;",
      "  p = H;",
      "}",
    ],
    { members: ["system", "system"], rows: [] },
  );

  check(
    "refuses a paste inside another macro",
    "calls",
    {},
    ["#define P a##b", "#define M P", "void f(void) {", "  M;", "}"],
    { members: [], rows: ["4: M"] },
  );

  check(
    "lists only names that may be functions",
    "calls",
    {},
    [
      "int count;",
      "#define M (my_type, size_t, count, stdin, run)",
      "void f(void) {",
      "  M;",
      "}",
    ],
    { members: ["my_type", "run"], rows: [] },
  );

  check(
    "refuses a macro that calls a pointer variable",
    "calls",
    {},
    [
      "int (*fp)(void);",
      "#define CALL fp()",
      "#define PASS g(fp)",
      "void f(void) {",
      "  CALL;",
      "  PASS;",
      "}",
    ],
    { members: ["g"], rows: ["5: CALL"] },
  );

  check(
    "matches a method callee in a macro",
    "string_args",
    { callee: "run" },
    [
      '#define M p->run("x")',
      '#define N p->walk("x")',
      "void f(void) {",
      "  M;",
      "  N;",
      '  M2("y");',
      "}",
    ],
    { members: [], rows: ["4: M"] },
  );

  check(
    "matches a callee named by a macro",
    "string_args",
    { callee: "run" },
    [
      "#define R run",
      "#define T (other, run)",
      "#define U other",
      "void f(void) {",
      '  R("x");',
      "  p = R;",
      "  p = T;",
      "  p = U;",
      '  U("y");',
      "}",
    ],
    { members: [], rows: ['5: R("x")', "6: R", "7: T"] },
  );

  check(
    "lists macro calls whatever the callee",
    "calls",
    { callee: "run" },
    [
      "#define R run",
      "#define L(x) run(x)",
      "void f(void) {",
      '  L("x");',
      "  p = R;",
      "  g(run);",
      "}",
    ],
    { members: ["L", "run", "run", "g", "run"], rows: [] },
  );
});

describe("C reader: calls, values and initializers", () => {
  check(
    "includes for calls",
    "calls",
    {},
    [
      "#include <a.h>",
      '#include "b.h"',
      "#include MACRO_H",
      "#  import   <c.h>  ",
      '#import "d.h" // note',
      "#include_next <e.h> /* note */",
      "#import x <f.h>",
      "#import <g.h> junk",
      "#import",
      '#pragma push_macro("X")',
      "#pragma",
      "#pragma once",
      "#warning push_macro",
    ],
    {
      members: [],
      rows: [
        "1: a.h may define macros or function pointers this file uses: #include <a.h> ",
        '2: b.h may define macros or function pointers this file uses: #include "b.h" ',
        "3: #include MACRO_H ",
        "4: c.h may define macros or function pointers this file uses: # import <c.h> ",
        '5: d.h may define macros or function pointers this file uses: #import "d.h" // note ',
        "6: e.h may define macros or function pointers this file uses: #include_next <e.h> /* note */ ",
        "7: #import x <f.h> ",
        "8: #import <g.h> junk ",
        "9: #import ",
        '10: #pragma push_macro("X") ',
      ],
    },
  );

  check(
    "includes for string_args",
    "string_args",
    { callee: "run" },
    [
      "#include <a.h>",
      '#include "b.h"',
      "#include MACRO_H",
      "#  import   <c.h>  ",
      '#import "d.h" // note',
      "#include_next <e.h> /* note */",
      "#import x <f.h>",
      "#import <g.h> junk",
      "#import",
      '#pragma push_macro("X")',
      "#pragma",
      "#pragma once",
      "#warning push_macro",
    ],
    {
      members: [],
      rows: [
        "1: a.h may define macros or function pointers this file uses: #include <a.h> ",
        '2: b.h may define macros or function pointers this file uses: #include "b.h" ',
        "3: #include MACRO_H ",
        "4: c.h may define macros or function pointers this file uses: # import <c.h> ",
        '5: d.h may define macros or function pointers this file uses: #import "d.h" // note ',
        "6: e.h may define macros or function pointers this file uses: #include_next <e.h> /* note */ ",
        "7: #import x <f.h> ",
        "8: #import <g.h> junk ",
        "9: #import ",
        '10: #pragma push_macro("X") ',
      ],
    },
  );

  check(
    "includes for env",
    "env",
    {},
    [
      "#include <a.h>",
      '#include "b.h"',
      "#include MACRO_H",
      "#  import   <c.h>  ",
      '#import "d.h" // note',
      "#include_next <e.h> /* note */",
      "#import x <f.h>",
      "#import <g.h> junk",
      "#import",
      '#pragma push_macro("X")',
      "#pragma",
      "#pragma once",
      "#warning push_macro",
    ],
    {
      members: [],
      rows: [
        "1: a.h may define macros or function pointers this file uses: #include <a.h> ",
        '2: b.h may define macros or function pointers this file uses: #include "b.h" ',
        "3: #include MACRO_H ",
        "4: c.h may define macros or function pointers this file uses: # import <c.h> ",
        '5: d.h may define macros or function pointers this file uses: #import "d.h" // note ',
        "6: e.h may define macros or function pointers this file uses: #include_next <e.h> /* note */ ",
        "7: #import x <f.h> ",
        "8: #import <g.h> junk ",
        "9: #import ",
        '10: #pragma push_macro("X") ',
      ],
    },
  );

  check(
    "includes for property",
    "property",
    { key: "x" },
    [
      "#include <a.h>",
      '#include "b.h"',
      "#include MACRO_H",
      "#  import   <c.h>  ",
      '#import "d.h" // note',
      "#include_next <e.h> /* note */",
      "#import x <f.h>",
      "#import <g.h> junk",
      "#import",
      '#pragma push_macro("X")',
      "#pragma",
      "#pragma once",
      "#warning push_macro",
    ],
    {
      members: [],
      rows: [
        "1: a.h may define macros, function pointers or unions this file uses: #include <a.h> ",
        '2: b.h may define macros, function pointers or unions this file uses: #include "b.h" ',
        "3: #include MACRO_H ",
        "4: c.h may define macros, function pointers or unions this file uses: # import <c.h> ",
        '5: d.h may define macros, function pointers or unions this file uses: #import "d.h" // note ',
        "6: e.h may define macros, function pointers or unions this file uses: #include_next <e.h> /* note */ ",
        "7: #import x <f.h> ",
        "8: #import <g.h> junk ",
        "9: #import ",
        '10: #pragma push_macro("X") ',
      ],
    },
  );

  check(
    "includes for imports",
    "imports",
    {},
    [
      "#include <a.h>",
      '#include "b.h"',
      "#include MACRO_H",
      "#  import   <c.h>  ",
      '#import "d.h" // note',
      "#include_next <e.h> /* note */",
      "#import x <f.h>",
      "#import <g.h> junk",
      "#import",
      '#pragma push_macro("X")',
      "#pragma",
      "#pragma once",
      "#warning push_macro",
    ],
    {
      members: ["a.h", "b.h", "c.h", "d.h", "e.h"],
      rows: [
        "3: #include MACRO_H ",
        "7: #import x <f.h> ",
        "8: #import <g.h> junk ",
        "9: #import ",
      ],
    },
  );

  check(
    "pointers, attributes and asm for calls",
    "calls",
    {},
    [
      "int (*fp)(const char *);",
      "void f(void) {",
      '  fp("x");',
      '  ops->run(getenv("A"));',
      "  make()->run(1);",
      '  tbl[getenv("B")]("x");',
      '  run("y");',
      "}",
      'int my(void) __attribute__((weakref("system")));',
      'int my2(void) __attribute__((alias("system")));',
      "int my3(void) __attribute__((unused));",
      'int my4(void) __asm__("getenv");',
    ],
    {
      members: [
        "getenv",
        "make",
        "getenv",
        "run",
        "weakref",
        "alias",
        "unused",
      ],
      rows: [
        '3: fp("x")',
        '4: ops->run(getenv("A"))',
        "5: make()->run(1)",
        '6: tbl[getenv("B")]("x")',
        '9: __attribute__((weakref("system")))',
        '10: __attribute__((alias("system")))',
        '12: __asm__("getenv")',
      ],
    },
  );

  check(
    "pointers, attributes and asm for string_args",
    "string_args",
    { callee: "run" },
    [
      "int (*fp)(const char *);",
      "void f(void) {",
      '  fp("x");',
      '  ops->run(getenv("A"));',
      "  make()->run(1);",
      '  tbl[getenv("B")]("x");',
      '  run("y");',
      "}",
      'int my(void) __attribute__((weakref("system")));',
      'int my2(void) __attribute__((alias("system")));',
      "int my3(void) __attribute__((unused));",
      'int my4(void) __asm__("getenv");',
    ],
    {
      members: ["y"],
      rows: [
        '3: fp("x")',
        '4: ops->run(getenv("A"))',
        "5: make()->run(1)",
        '6: tbl[getenv("B")]("x")',
        '9: __attribute__((weakref("system")))',
        '10: __attribute__((alias("system")))',
        '12: __asm__("getenv")',
      ],
    },
  );

  check(
    "pointers, attributes and asm for env",
    "env",
    {},
    [
      "int (*fp)(const char *);",
      "void f(void) {",
      '  fp("x");',
      '  ops->run(getenv("A"));',
      "  make()->run(1);",
      '  tbl[getenv("B")]("x");',
      '  run("y");',
      "}",
      'int my(void) __attribute__((weakref("system")));',
      'int my2(void) __attribute__((alias("system")));',
      "int my3(void) __attribute__((unused));",
      'int my4(void) __asm__("getenv");',
    ],
    {
      members: ["A", "B"],
      rows: [
        '3: fp("x")',
        '4: ops->run(getenv("A"))',
        "5: make()->run(1)",
        '6: tbl[getenv("B")]("x")',
        '9: __attribute__((weakref("system")))',
        '10: __attribute__((alias("system")))',
        '12: __asm__("getenv")',
      ],
    },
  );

  check(
    "pointers, attributes and asm for property",
    "property",
    { key: "x" },
    [
      "int (*fp)(const char *);",
      "void f(void) {",
      '  fp("x");',
      '  ops->run(getenv("A"));',
      "  make()->run(1);",
      '  tbl[getenv("B")]("x");',
      '  run("y");',
      "}",
      'int my(void) __attribute__((weakref("system")));',
      'int my2(void) __attribute__((alias("system")));',
      "int my3(void) __attribute__((unused));",
      'int my4(void) __asm__("getenv");',
    ],
    { members: [], rows: [] },
  );

  check(
    "pointers, attributes and asm for imports",
    "imports",
    {},
    [
      "int (*fp)(const char *);",
      "void f(void) {",
      '  fp("x");',
      '  ops->run(getenv("A"));',
      "  make()->run(1);",
      '  tbl[getenv("B")]("x");',
      '  run("y");',
      "}",
      'int my(void) __attribute__((weakref("system")));',
      'int my2(void) __attribute__((alias("system")));',
      "int my3(void) __attribute__((unused));",
      'int my4(void) __asm__("getenv");',
    ],
    { members: [], rows: [] },
  );

  check(
    "macros that the preprocessor decides for calls",
    "calls",
    {},
    [
      "#ifdef A",
      "#define F(x) g(x)",
      "#define O g",
      "#endif",
      '#define P _Pragma("push_macro(\\"x\\")")',
      "void f(void) {",
      '  F("x");',
      "  p = O;",
      '  _Pragma("push_macro(\\"x\\")");',
      '  __pragma("once");',
      '  my_pragma("push_macro");',
      "  __pragma_x(1);",
      "}",
    ],
    {
      members: ["my_pragma", "__pragma_x"],
      rows: [
        '5: #define P _Pragma("push_macro(\\"x\\")") ',
        '7: F("x")',
        "8: O",
        '9: _Pragma("push_macro(\\"x\\")")',
      ],
    },
  );

  check(
    "macros that the preprocessor decides for string_args",
    "string_args",
    { callee: "run" },
    [
      "#ifdef A",
      "#define F(x) g(x)",
      "#define O g",
      "#endif",
      '#define P _Pragma("push_macro(\\"x\\")")',
      "void f(void) {",
      '  F("x");',
      "  p = O;",
      '  _Pragma("push_macro(\\"x\\")");',
      '  __pragma("once");',
      '  my_pragma("push_macro");',
      "  __pragma_x(1);",
      "}",
    ],
    {
      members: [],
      rows: [
        '5: #define P _Pragma("push_macro(\\"x\\")") ',
        '7: F("x")',
        "8: O",
        '9: _Pragma("push_macro(\\"x\\")")',
      ],
    },
  );

  check(
    "macros that the preprocessor decides for env",
    "env",
    {},
    [
      "#ifdef A",
      "#define F(x) g(x)",
      "#define O g",
      "#endif",
      '#define P _Pragma("push_macro(\\"x\\")")',
      "void f(void) {",
      '  F("x");',
      "  p = O;",
      '  _Pragma("push_macro(\\"x\\")");',
      '  __pragma("once");',
      '  my_pragma("push_macro");',
      "  __pragma_x(1);",
      "}",
    ],
    {
      members: [],
      rows: [
        '5: #define P _Pragma("push_macro(\\"x\\")") ',
        '7: F("x")',
        "8: O",
        '9: _Pragma("push_macro(\\"x\\")")',
      ],
    },
  );

  check(
    "macros that the preprocessor decides for property",
    "property",
    { key: "x" },
    [
      "#ifdef A",
      "#define F(x) g(x)",
      "#define O g",
      "#endif",
      '#define P _Pragma("push_macro(\\"x\\")")',
      "void f(void) {",
      '  F("x");',
      "  p = O;",
      '  _Pragma("push_macro(\\"x\\")");',
      '  __pragma("once");',
      '  my_pragma("push_macro");',
      "  __pragma_x(1);",
      "}",
    ],
    {
      members: [],
      rows: [
        '5: #define P _Pragma("push_macro(\\"x\\")") ',
        '7: F("x")',
        '9: _Pragma("push_macro(\\"x\\")")',
      ],
    },
  );

  check(
    "macros that the preprocessor decides for imports",
    "imports",
    {},
    [
      "#ifdef A",
      "#define F(x) g(x)",
      "#define O g",
      "#endif",
      '#define P _Pragma("push_macro(\\"x\\")")',
      "void f(void) {",
      '  F("x");',
      "  p = O;",
      '  _Pragma("push_macro(\\"x\\")");',
      '  __pragma("once");',
      '  my_pragma("push_macro");',
      "  __pragma_x(1);",
      "}",
    ],
    { members: [], rows: [] },
  );

  check(
    "reads strings that name the environment file",
    "env",
    {},
    [
      "void f(void) {",
      '  fopen("/proc/1/env" "iron", "r");',
      '  fopen("/proc/a b/xenviron", "r");',
      '  fopen("environ", "r");',
      '  fopen("/etc/environment", "r");',
      '  fopen("xenviron", "r");',
      "}",
    ],
    {
      members: [],
      rows: [
        '2: "/proc/1/env" "iron"',
        '3: "/proc/a b/xenviron"',
        '4: "environ"',
      ],
    },
  );

  check(
    "refuses entry points that take the environment",
    "env",
    {},
    [
      "int add(int a, int b, int c) { int constructor = 0; return a; }",
      "int (main(int a, char **b, char **c)) { return 0; }",
      "void (*_tmain(int a, char **b, char **e))(int) { return 0; }",
      "char *wmain(int a, char **b, char **c) { return 0; }",
      "#ifdef W",
      "#define ENTRY main",
      "#endif",
      "int ENTRY(int a, char **b, char **c) { return 0; }",
      "#define ENTRY2 main other",
      "int ENTRY2(int a, char **b, char **c) { return 0; }",
      "#define ARGS int a, char **b, char **c",
      "int main(int x, ARGS) { return 0; }",
      "int main(int a, /* c */ char **b) { return 0; }",
      "int main(int a, char **b, ...) { return 0; }",
      "int main(a, b, c) int a; char **b, **c; { return 0; }",
      "void init(int a, char **b, char **c) __attribute__((constructor));",
      "void init(int a, char **b, char **c) { }",
      "__attribute__((constructor)) void init2(int a) { }",
      "int other(int a, char **b) { return 0; }",
    ],
    {
      members: [],
      rows: [
        "2: (int a, char **b, char **c)",
        "3: (int a, char **b, char **e)",
        "4: (int a, char **b, char **c)",
        "8: (int a, char **b, char **c)",
        "10: (int a, char **b, char **c)",
        "12: (int x, ARGS)",
        "14: (int a, char **b, ...)",
        "15: (a, b, c)",
        "17: (int a, char **b, char **c)",
      ],
    },
  );

  check(
    "refuses a constructor first in the file",
    "env",
    {},
    ["__attribute__((constructor)) void init(int a, char **b, char **c) { }"],
    { members: [], rows: ["1: (int a, char **b, char **c)"] },
  );

  check(
    "calls a parenthesized function, not a macro",
    "env",
    {},
    [
      "#define getenv(n) my(n)",
      "#define secure_getenv(n) my(n)",
      "#define secure_getenv other",
      "void f(void) {",
      '  (getenv)("A");',
      '  (/* c */ getenv)("B");',
      '  ((getenv))("C");',
      '  getenv("D");',
      '  (secure_getenv)("E");',
      '  LOG(getenv2("F"), (getenv)("G"));',
      "}",
    ],
    { members: ["A", "B", "C", "G"], rows: ['10: getenv2("F")'] },
  );

  check(
    "lists macro arguments",
    "calls",
    {},
    ["#define LOG(x) puts(x)", "void f(void) {", '  LOG(run("x"));', "}"],
    { members: ["LOG", "puts", "run"], rows: [] },
  );

  check(
    "reads values handed on",
    "calls",
    {},
    [
      "int run(void);",
      "struct s v = { run, .f = run };",
      "int w = run;",
      "int g(int c) {",
      "  &run;",
      "  p = &run;",
      "  p = (void *)run;",
      "  p = c ? run : 0;",
      "  p = (0, run);",
      "  run = 0;",
      "  p = run;",
      "  (run);",
      "  *run;",
      "  (*run)();",
      "  h(*(run));",
      "  p = __extension__ run;",
      "  p = _Generic(c, int: run);",
      "  p = ({ a; b; run; });",
      "  p = ({ run; /* c */ });",
      "  p = ({ run; b; });",
      "  run;",
      "  return run;",
      "}",
      "run;",
    ],
    {
      members: [
        "run",
        "run",
        "run",
        "run",
        "run",
        "run",
        "run",
        "run",
        "run",
        "run",
        "h",
        "run",
        "run",
        "run",
        "run",
        "run",
        "b",
        "run",
      ],
      rows: ["14: (*run)()"],
    },
  );

  check(
    "skips names a declaration declares",
    "env",
    {},
    [
      "char *getenv(const char *);",
      "extern char **environ;",
      "extern char *_environ[];",
      "char *(secure_getenv)(const char *);",
      "extern char **__environ [[maybe_unused]];",
      "char **_wenviron = 0;",
      "int environ, other;",
      "void f(int environ) { }",
      "enum { getenv_mode, B = getenv };",
      "char **e = environ;",
    ],
    { members: [], rows: ["9: getenv", "10: environ"] },
  );

  check(
    "reads designated initializers",
    "property",
    { key: "x" },
    [
      "struct s a = { .a[0].x = 1, .a[1].x = 2 };",
      "struct s b = { .a[0].x = 3, .a[0x0].x = 4 };",
      "struct s c = { .a[1 - 1].x = 5 };",
      "struct s d = { .a[N].x = 6 };",
      "struct s e = { .a[- 1].x = 7, .a[0].x = 8 };",
      "struct s g = { .a[0 /* c */].x = 9, .a[1].x = 10 };",
      "struct s h = { .a[0 ... 2].x = 11 };",
      "struct s i = { .t = { .x = 12 }, .u = { .y = 0 } };",
      "struct s j = { .a.x = 13, .b.x = 14 };",
      "struct s k = { .x = 15, .x.y = 16 };",
      "struct s l = { x: 17 };",
      "struct s m = { .y = 0, [0] = 1, .x = 18 };",
      "struct s n = { 1, .x = 19 };",
      "struct s o = { /* c */ .x = 20 };",
      "int p[2][2] = { { 1, 2 }, [1] = { 3, 4 } };",
      "struct s q = { .t = { 1, .x = 21 } };",
      "struct s r = { .a[0x1.8p1].x = 22, .a[1].x = 23 };",
      "struct s t = { .x = (struct s){ 1, 2 } };",
      "int u = (int){ 1 };",
    ],
    {
      members: [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23",
      ],
      rows: [
        "2: .a[0].x = 3",
        "2: .a[0x0].x = 4",
        "3: .a[1 - 1].x = 5",
        "4: .a[N].x = 6",
        "5: .a[- 1].x = 7",
        "5: .a[0].x = 8",
        "6: .a[0 /* c */].x = 9",
        "6: .a[1].x = 10",
        "7: .a[0 ... 2].x = 11",
        "8: .x = 12",
        "13: { 1, .x = 19 }",
        "16: { 1, .x = 21 }",
        "16: .x = 21",
        "17: .a[0x1.8p1].x = 22",
        "17: .a[1].x = 23",
        "18: .x = (struct s){ 1, 2 }",
        "18: { 1, 2 }",
        "19: { 1 }",
      ],
    },
  );

  check(
    "refuses a designated macro",
    "property",
    { key: "x" },
    [
      "#define y x",
      "#define true 0",
      "#define D { 0 }",
      "#define A B",
      "#define B A",
      "#define OUTER 1 + INNER",
      "#define INNER { .x = 1 }",
      "#define K a$b",
      "struct s a = { .y = 1, .x = true };",
      "struct s b = D;",
      "struct s c = A;",
      "struct s d = OUTER;",
      "struct s e = K;",
      "struct s f = A(1);",
      "struct s g = D(1);",
    ],
    {
      members: [],
      rows: ["9: .y = 1", "9: .x = true", "10: D", "12: OUTER", "15: D(1)"],
    },
  );

  check(
    "refuses a key with a dollar",
    "property",
    { key: "a$b" },
    ["#define K a$b", "#define L ab", "struct s e = K;", "struct s f = L;"],
    { members: [], rows: ["3: K"] },
  );

  check(
    "refuses a union",
    "property",
    { key: "x" },
    ["union u { int x; };", "union u a = { .x = 1 };"],
    { members: [], rows: ["2: .x = 1"] },
  );

  check(
    "reads no initializer outside property",
    "env",
    {},
    ["#define verify v2", "struct s a = { .verify = 0, 1 };"],
    { members: [], rows: [] },
  );
});

describe("C reader: lines, macro strings and callees", () => {
  check(
    "refuses lines the preprocessor splices differently",
    "calls",
    {},
    [
      "int x; // a\\ b",
      "#define A 1 \\  ",
      "",
      "#define A2 1 \\\u000b",
      "",
      "#define B1 in\\",
      "t_y",
      "#define B2 1 + \\",
      "  2",
      'char *s = "a\\n";',
      "int y2;",
      "#define B3 1 +\\",
      "3",
      "#define B4 a\\",
      " + b",
      "#define B6 a\\\r",
      "b",
      "  int a_very_long_name = 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1; /* ??= */",
    ],
    {
      members: [],
      rows: [
        "2: #define A 1 \\",
        "4: #define A2 1 \\",
        "6: #define B1 in\\",
        "16: #define B6 a\\",
        "18: int a_very_long_name = 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1",
      ],
    },
  );

  check(
    "reads strings that macros hold",
    "env",
    {},
    [
      '#define N1 "A"',
      '#define N2 "B" "C"',
      '#define N3 "D" x',
      '#define N4 "E\\x41"',
      "#define N5 1",
      '#define N6(x) "F"',
      '#define N7 "G"',
      '#define N7 "H"',
      '#define N8 "I"',
      "#ifdef Z",
      "#undef N8",
      "#endif",
      '#define N9 x "J"',
      "void f(void) {",
      "  getenv(N1);",
      "  getenv(N2);",
      "  getenv(N3);",
      "  getenv(N4);",
      "  getenv(N5);",
      "  getenv(N6);",
      "  getenv(N7);",
      "  getenv(N8);",
      "  getenv(N9);",
      "  getenv(N0);",
      "  getenv(f());",
      "}",
    ],
    {
      members: ["A", "BC"],
      rows: [
        "17: getenv(N3)",
        "18: getenv(N4)",
        "19: getenv(N5)",
        "20: getenv(N6)",
        "21: getenv(N7)",
        "22: getenv(N8)",
        "22: N8",
        "23: getenv(N9)",
        "24: getenv(N0)",
        "25: getenv(f())",
      ],
    },
  );

  check(
    "reads the first argument of the callee",
    "string_args",
    { callee: "run" },
    [
      '#define CMD "ls"',
      "int (*run2)(int);",
      "void f(void) {",
      "  run();",
      "  run(1);",
      "  run(CMD);",
      '  run("a\\0b");',
      "  run(x);",
      '  other("z");',
      "  run2(1);",
      '  run("ok", "no");',
      "}",
    ],
    {
      members: ["1", "ls", "ok"],
      rows: ['7: run("a\\0b")', "8: run(x)", "10: run2(1)"],
    },
  );

  check(
    "matches no callee that is not a name",
    "string_args",
    { callee: "Stryker was here" },
    ["#define M (a, b)", "void f(void) {", "  M;", "  g(M);", "}"],
    { members: [], rows: [] },
  );

  check(
    "refuses a pointer call for calls only",
    "property",
    { key: "x" },
    ["int (*fp)(void);", "void f(void) {", "  fp();", "}"],
    { members: [], rows: [] },
  );

  check(
    "refuses a pointer call for imports",
    "imports",
    {},
    ["int (*fp)(void);", "void f(void) {", "  fp();", "}"],
    { members: [], rows: [] },
  );

  check(
    "reads a getter macro called or handed on",
    "env",
    {},
    [
      "#define GE(x) getenv(x)",
      "#define GW environ",
      "#define OK other",
      "void f(void) {",
      '  GE("A");',
      "  p = GW;",
      "  p = OK;",
      '  OK("B");',
      "}",
    ],
    { members: [], rows: ['5: GE("A")', "6: GW"] },
  );
});

describe("C reader: more cases", () => {
  check(
    "reads an unclosed quote in a macro body",
    "calls",
    {},
    [
      "#define Q don't stop",
      '#define R say("hi',
      "void f(void) {",
      "  Q;",
      "  R;",
      "}",
    ],
    { members: ["don", "say"], rows: [] },
  );

  check(
    "reads what declarators declare",
    "calls",
    {},
    [
      "int f1(int)(int);",
      "int (f2(int));",
      "int f3 [[maybe_unused]];",
      "int * const f4 = 0;",
      "int (*(f5))(void);",
      "int *f6(int);",
      "void f(void) {",
      "  f1(1);",
      "  f2(1);",
      "  f3(1);",
      "  f4(1);",
      "  f5(1);",
      "  f6(1);",
      "}",
    ],
    {
      members: ["f6"],
      rows: ["8: f1(1)", "9: f2(1)", "10: f3(1)", "11: f4(1)", "12: f5(1)"],
    },
  );

  check(
    "refuses a const pointer entry point",
    "env",
    {},
    ["char *const wmain(int a, char **b, char **c) { return 0; }"],
    { members: [], rows: ["1: (int a, char **b, char **c)"] },
  );

  check(
    "refuses a block under #if",
    "calls",
    {},
    [
      "#if A",
      "void k(void) { run(); }",
      "#endif",
      "#ifdef B",
      "void m(void) { }",
      "#endif",
    ],
    { members: ["run"], rows: ["1: #if A void k(void) { run(); } #endif"] },
  );

  check(
    "follows every name of a macro for a key",
    "property",
    { key: "x" },
    [
      "#define INNER { .x = 1 }",
      "#define OUTER other + INNER",
      "struct s d = OUTER;",
    ],
    { members: [], rows: ["3: OUTER"] },
  );

  check(
    "reads an import with a block comment",
    "imports",
    {},
    ["#import <x.h> /* a", " b */", "#import <y.h> // c"],
    { members: ["x.h", "y.h"], rows: [] },
  );

  check(
    "skips variables an initializer or an enum declares",
    "env",
    {},
    ["int environ = 0;", "enum { _environ, B = 1 };", "int c = (_environ);"],
    { members: [], rows: ["3: _environ"] },
  );

  check(
    "reads a pointer initialized with a function",
    "calls",
    {},
    ["int run(void);", "int *q = run;", "int *r = *run;"],
    { members: ["run", "run"], rows: [] },
  );

  check(
    "refuses a field set inside a nested list",
    "property",
    { key: "x" },
    [
      "struct s v = { .x = 1, .a = { [i] = 2 } };",
      "struct s w = { .x = 3, .a = { [0] = 4 } };",
    ],
    { members: ["1", "3"], rows: ["1: .x = 1"] },
  );

  check(
    "lists the callee's first argument only for string_args",
    "calls",
    { callee: "run" },
    ["void f(void) {", '  run("x");', "}"],
    { members: ["run"], rows: [] },
  );
});
