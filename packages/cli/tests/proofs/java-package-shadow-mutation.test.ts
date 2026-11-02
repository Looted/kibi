// executable_for TEST-kibi-tree-sitter-references
import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createShadowRowFilter } from "../../src/operations/proof/java-package-shadow.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(tmpdir(), "kibi-shadow-m-"));
  roots.push(root);
  write(root, files);
  return root;
}

function write(root: string, files: Record<string, string>): void {
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
}

/** A file the project lists but nobody can read. */
function dangling(root: string, file: string): void {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.symlinkSync(path.join(root, "no-such-target"), path.join(root, file));
}

const includeRow = (header = "config.h") => ({
  line: 1,
  text: `${header} may define macros or function pointers this file uses: #include "${header}"`,
});

/** Whether the include row of src/a.c stays for that header and code. */
function cKept(
  header: string,
  code: string,
  more: Record<string, string> = {},
): boolean {
  const root = project({
    "src/a.c": `#include "config.h"\n${code}\n`,
    "src/config.h": header,
    ...more,
  });
  return createShadowRowFilter(root)("src/a.c", [includeRow()]).length === 1;
}

const CALLS_LIMIT = "int f(void) { return LIMIT(1); }";
const CALLS_LOG_LINE = 'void f(void) { log_line("x"); }';
const CALLS_RUN_HOOK = 'void f(void) { run_hook("x"); }';
const LOG_LINE_MACRO = "#define log_line(m) system(m)\n";

const C_KEYWORDS = [
  "defined",
  "sizeof",
  "int",
  "char",
  "long",
  "short",
  "unsigned",
  "signed",
  "void",
  "const",
  "volatile",
  "struct",
  "union",
  "enum",
  "float",
  "double",
  "do",
  "while",
  "if",
  "else",
  "for",
  "return",
  "typeof",
  "_Bool",
  "bool",
  "_Static_assert",
  "static_assert",
  "_Alignof",
  "alignof",
  "inline",
  "static",
  "extern",
  "register",
  "restrict",
];

const PURE_BUILTINS = [
  "expect",
  "expect_with_probability",
  "constant_p",
  "unreachable",
  "trap",
  "assume",
  "offsetof",
  "types_compatible_p",
  "object_size",
  "dynamic_object_size",
  "clz",
  "clzll",
  "ctz",
  "ctzl",
  "ffs",
  "ffsll",
  "popcount",
  "popcountll",
  "parity",
  "parityl",
  "bswap",
  "bswap32",
  "huge_val",
  "huge_valf",
  "inf",
  "inff",
  "nan",
  "nanf",
  "isnan",
  "isinf",
  "isinf_sign",
  "signbit",
  "signbitf",
  "LINE",
  "FILE",
  "FUNCTION",
  "va_arg",
  "va_start",
  "va_end",
  "va_copy",
];

describe("C header macros", () => {
  it("treats every keyword in a macro body as harmless", () => {
    // A header that spells `typeof` is not read at all, so each keyword is
    // tried in a project macro the header's macro names.
    for (const keyword of C_KEYWORDS)
      expect([
        keyword,
        cKept("#define LIMIT COLOR\n", "int f(void) { return LIMIT; }", {
          "src/other.h": `#define COLOR (${keyword} 1)\n`,
        }),
      ]).toEqual([keyword, false]);
    // A keyword at the end of an object-like macro is no function alias.
    expect(
      cKept("#define CAST unsigned\n", "int f(void) { return CAST(1); }"),
    ).toBe(false);
  });

  it("treats only the pure compiler builtins as calling nothing", () => {
    for (const builtin of PURE_BUILTINS)
      expect([
        builtin,
        cKept(`#define LIMIT(x) __builtin_${builtin}(x)\n`, CALLS_LIMIT),
      ]).toEqual([builtin, false]);
    for (const name of [
      "__builtin_strcpy",
      "my__builtin_expect",
      "__builtin_expectx",
      "__builtin_bswapx",
    ])
      expect([
        name,
        cKept(`#define LIMIT(x) ${name}(x)\n`, CALLS_LIMIT),
      ]).toEqual([name, true]);
  });

  it("skips compiler attribute keywords, but only those exact names", () => {
    expect(cKept("#define LIMIT(x) __extension__ (x)\n", CALLS_LIMIT)).toBe(
      false,
    );
    expect(cKept("#define LIMIT(x) my__inline__ x\n", CALLS_LIMIT)).toBe(true);
    expect(cKept("#define LIMIT(x) __inline__x x\n", CALLS_LIMIT)).toBe(true);
  });

  it("reads a #define only at the start of a line, after any spaces", () => {
    expect(cKept(`int a; ${LOG_LINE_MACRO}`, CALLS_LOG_LINE)).toBe(false);
    expect(
      cKept("#pragma define log_line(m) system(m)\n", CALLS_LOG_LINE),
    ).toBe(false);
    expect(cKept("#define  log_line(m) system(m)\n", CALLS_LOG_LINE)).toBe(
      true,
    );
  });

  it("ignores names inside string and character literals of a macro body", () => {
    expect(cKept('#define LIMIT(x) ("hello world" x)\n', CALLS_LIMIT)).toBe(
      false,
    );
    expect(cKept('#define LIMIT(x) ("say \\"hi\\"" x)\n', CALLS_LIMIT)).toBe(
      false,
    );
    expect(cKept("#define LIMIT(x) ('ab' x)\n", CALLS_LIMIT)).toBe(false);
  });

  it("counts a whole upper-case name as a constant, not a part of one", () => {
    expect(
      cKept("#define logLIMIT 1\n", "int f(void) { return logLIMIT; }"),
    ).toBe(true);
    expect(cKept("#define LIMITx 1\n", "int f(void) { return LIMITx; }")).toBe(
      true,
    );
  });

  it("counts no macro as harmless when a project source cannot be read", () => {
    const root = project({
      "src/a.c": '#include "config.h"\nint f(void) { return LIMIT; }\n',
      "src/config.h": "#define LIMIT 10\n",
    });
    expect(createShadowRowFilter(root)("src/a.c", [includeRow()])).toEqual([]);
    dangling(root, "src/broken.h");
    expect(createShadowRowFilter(root)("src/a.c", [includeRow()])).toEqual([
      includeRow(),
    ]);
  });

  it("needs every project definition of a constant a macro names to be harmless", () => {
    for (const other of [
      "#define COLOR 33\n#define COLOR system\n",
      "#define COLOR system\n#define COLOR 33\n",
    ])
      expect(
        cKept("#define LIMIT COLOR\n", "int f(void) { return LIMIT; }", {
          "src/other.h": other,
        }),
      ).toBe(true);
    expect(
      cKept("#define LIMIT COLOR\n", "int f(void) { return LIMIT; }", {
        "src/other.h": "#define COLOR 33\n#define COLOR 34\n",
      }),
    ).toBe(false);
  });

  it("lets a macro index arrays, but not a project name, an unindexed name or the environment", () => {
    expect(
      cKept("#define LIMIT(i) (table[i])\n", CALLS_LIMIT, {
        "src/other.h": "#define table environ\n",
      }),
    ).toBe(true);
    expect(cKept("#define LIMIT(i) (table + arr[0])\n", CALLS_LIMIT)).toBe(
      true,
    );
    expect(cKept("#define LIMIT(i) (table [i])\n", CALLS_LIMIT)).toBe(false);
    expect(cKept("#define LIMIT(i) (my_environ[i])\n", CALLS_LIMIT)).toBe(
      false,
    );
    expect(cKept("#define LIMIT(i) (environment[i])\n", CALLS_LIMIT)).toBe(
      false,
    );
    expect(cKept("#define LIMIT(i) (__environ[i])\n", CALLS_LIMIT)).toBe(true);
  });

  it("reads which object-like macros may stand for a function", () => {
    const calls = (name: string) => `void f(void) { ${name}(d); }`;
    for (const [header, code, kept] of [
      // A function-like macro with a parameter names no function by itself.
      ["#define F(x) SHA256\n", calls("F"), false],
      ["#define HASH() SHA256\n", calls("HASH"), true],
      // Two macros naming each other end the chain.
      ["#define A B\n#define B A\n", calls("A"), false],
      ["#define HASH SHA256 + 1\n", calls("HASH"), false],
      ["#define FLAG (MODE != BIT)\n", calls("FLAG"), false],
      ["#define FLAG (MODE == BIT)\n", calls("FLAG"), false],
      ["#define HASH (&SHA256 )\n", calls("HASH"), true],
      ["#define HASH (&SHA256) \n", calls("HASH"), true],
      ["#define NEG (-BIT)\n", calls("NEG"), true],
      ["#define NEG -(BIT)\n", calls("NEG"), true],
      ["#define HASH &SHA256\n", calls("HASH"), true],
      ["#define HASH (MODE += SHA256)\n", calls("HASH"), true],
      ["#define SHIFT (1 >> BIT)\n", calls("SHIFT"), false],
      ["#define OR (MODE | BIT)\n", calls("OR"), false],
      ["#define LE (MODE <= BIT)\n", calls("LE"), false],
    ] as const)
      expect([header, cKept(header, code)]).toEqual([header, kept]);
    // Any project definition of the name it ends with may be a function.
    for (const other of [
      "#define ALG 3\n#define ALG SHA256\n",
      "#define ALG SHA256\n#define ALG 3\n",
    ])
      expect(
        cKept("#define HASH ALG\n", calls("HASH"), { "src/other.h": other }),
      ).toBe(true);
    expect(
      cKept("#define HASH ALG\n", calls("HASH"), {
        "src/other.h": "#define ALG 3\n#define ALG 4\n",
      }),
    ).toBe(false);
  });

  it("takes a header guard outside the project's sources for no function alias", () => {
    const row = includeRow("config.cfg");
    const root = project({
      "src/a.c": '#include "config.cfg"\nint GUARD(void);\n',
      "src/config.cfg": "#define GUARD GUARD\n",
    });
    expect(createShadowRowFilter(root)("src/a.c", [row])).toEqual([]);
  });

  it("refuses a header that pastes a name into a function pointer, and nothing else for ##", () => {
    expect(cKept("#define CAT(a, b) a##b\n", "int f(void) { return 0; }")).toBe(
      false,
    );
    expect(cKept("#define LIMIT(x) (*x)\n", "int f(void) { return 0; }")).toBe(
      false,
    );
    for (const header of [
      "#define HOOK(n) int (*n##_hook)(void)\nHOOK(git);\n",
      "#define HOOK(n) int ( *n##_hook)(void)\nHOOK(git);\n",
    ])
      expect(cKept(header, "int f(void) { return git_hook(); }")).toBe(true);
  });

  it("reads the names a pointer-declaring macro declares", () => {
    const callsRunHook = "void f(void) { run_hook(); }";
    expect(
      cKept(
        "#define DECL(name, t) extern t (*name)(void)\nDECL(run_hook, int);\n",
        callsRunHook,
      ),
    ).toBe(true);
    expect(
      cKept("#define FP int (*)(void)\nFP(run_hook);\n", callsRunHook),
    ).toBe(false);
    expect(
      cKept(
        "#define DECL$(n) extern int (*n)(void)\nDECL$(run_hook);\n",
        callsRunHook,
      ),
    ).toBe(true);
    expect(
      cKept(
        "#define DECL(n$) extern int (*n$)(void)\nDECL(run_hook);\n",
        callsRunHook,
      ),
    ).toBe(true);
  });

  it("reads #undef only at the start of a line, with any spacing", () => {
    expect(cKept("int a; #undef log_line\n", CALLS_LOG_LINE)).toBe(false);
    for (const header of [
      "  #undef log_line\n",
      "#undef  log_line\n",
      "# undef log_line\n",
    ])
      expect([header, cKept(header, CALLS_LOG_LINE)]).toEqual([header, true]);
  });

  it("reads function pointers with any spacing, qualifiers and conventions", () => {
    for (const header of [
      "extern int ( *run_hook)(const char *);\n",
      "extern int (CALLBACK  *run_hook)(const char *);\n",
      "extern int (**run_hook)(const char *);\n",
      "extern int (* const  run_hook)(const char *);\n",
      "extern int (*run_hook )(const char *);\n",
      "extern int (*run_hook) (const char *);\n",
    ])
      expect([header, cKept(header, CALLS_RUN_HOOK)]).toEqual([header, true]);
  });

  it("reads function types and what is declared with them", () => {
    expect(
      cKept(
        "typedef int runner_fn (const char *);\nextern runner_fn *run_hook;\n",
        CALLS_RUN_HOOK,
      ),
    ).toBe(true);
    expect(
      cKept("typedef int runner_fn(const char *);\n", "void f(runner_fn *cb);"),
    ).toBe(true);
    expect(
      cKept(
        "typedef int run$fn(const char *);\nextern run$fn *run_hook;\n",
        CALLS_RUN_HOOK,
      ),
    ).toBe(true);
  });

  it("reads function pointer typedefs with any spacing, qualifiers and conventions", () => {
    for (const typedef of [
      "typedef int (*runner_t)(const char *);",
      "typedef int ( *runner_t)(const char *);",
      "typedef int (CALLBACK *runner_t)(const char *);",
      "typedef int (CALLBACK  *runner_t)(const char *);",
      "typedef int (**runner_t)(const char *);",
      "typedef int (* runner_t)(const char *);",
      "typedef int (*const  runner_t)(const char *);",
      "typedef int (*const runner_t)(const char *);",
      "typedef int (*runner_t )(const char *);",
      "typedef int (*runner_t) (const char *);",
    ])
      expect([
        typedef,
        cKept(`${typedef}\nextern runner_t log_line;\n`, CALLS_LOG_LINE),
      ]).toEqual([typedef, true]);
    expect(
      cKept(
        "typedef int (*run$t)(const char *);\nextern run$t log_line;\n",
        CALLS_LOG_LINE,
      ),
    ).toBe(true);
  });

  it("follows #include lines as the preprocessor spells them", () => {
    const shims = { "src/shims.h": LOG_LINE_MACRO };
    expect(cKept('int a; #include "shims.h"\n', CALLS_LOG_LINE, shims)).toBe(
      false,
    );
    for (const header of [
      '  #include "shims.h"\n',
      '# include "shims.h"\n',
      '#include"shims.h"\n',
    ])
      expect([header, cKept(header, CALLS_LOG_LINE, shims)]).toEqual([
        header,
        true,
      ]);
    expect(cKept("#include<stdio.h>\n", CALLS_LOG_LINE)).toBe(false);
    const harmless = { "src/shims.h": "#define OTHER 1\n" };
    expect(cKept('#include\f"shims.h"\n', CALLS_LOG_LINE, harmless)).toBe(
      false,
    );
    expect(cKept('#include FOO "shims.h"\n', CALLS_LOG_LINE, harmless)).toBe(
      true,
    );
    expect(cKept("#include FOO <stdio.h>\n", CALLS_LOG_LINE)).toBe(true);
  });

  it("reads each header once, even when headers include each other", () => {
    expect(
      cKept('#include "a.h"\n#include "b.h"\n', CALLS_LOG_LINE, {
        "src/a.h": '#include "b.h"\n#define A_ONE 1\n',
        "src/b.h": '#include "a.h"\n#define B_ONE 1\n',
      }),
    ).toBe(false);
  });

  it("keeps an angle include when the project cannot be listed", () => {
    const base = fs.mkdtempSync(path.join(tmpdir(), "kibi-shadow-m-"));
    roots.push(base);
    write(base, {
      "src/a.c": '#include <shims.h>\nvoid f(void) { log_line("x"); }\n',
      "src/b.c": '#include "config.h"\nvoid f(void) { log_line("x"); }\n',
      "src/config.h": "#include <shims.h>\n",
    });
    // The workspace folder is gone; the file is still read through its path.
    const missing = path.join(base, "missing");
    const angled = {
      line: 1,
      text: "shims.h may define macros or function pointers this file uses: #include <shims.h>",
    };
    const filter = createShadowRowFilter(missing);
    expect(filter("../src/a.c", [angled])).toEqual([angled]);
    expect(filter("../src/b.c", [includeRow()])).toEqual([includeRow()]);
  });
});

describe("the C file that includes the header", () => {
  it("reads its code as the preprocessor does: splices, comments and literals", () => {
    const macro = { header: LOG_LINE_MACRO };
    for (const [code, kept] of [
      ['void f(void) { log_??/\nline("x"); }', true],
      ['void f(void) { // log_line("x")\n}', false],
      ['void f(void) { g("a//b"); log_line("x"); }', true],
      ["void f(void) { g('//'); log_line(\"x\"); }", true],
      ['void f(void) { my/**/log_line("x"); }', true],
    ] as const)
      expect([code, cKept(macro.header, code)]).toEqual([code, kept]);
  });

  it("keeps the row when its line includes nothing Kibi can read", () => {
    const root = project({
      "src/a.c": 'int x;\n#include "config.h"\n',
      "src/config.h": "#define OTHER 1\n",
    });
    const filter = createShadowRowFilter(root);
    expect(filter("src/a.c", [{ ...includeRow(), line: 2 }])).toEqual([]);
    expect(filter("src/a.c", [includeRow()])).toEqual([includeRow()]);
    const past = { ...includeRow(), line: 99 };
    expect(filter("src/a.c", [past])).toEqual([past]);
  });

  it("reads the include on its line with any spacing", () => {
    for (const line of ['#include"config.h"', '# include "config.h"']) {
      const root = project({
        "src/a.c": `${line}\nint f(void) { return 0; }\n`,
        "src/config.h": "#define OTHER 1\n",
      });
      expect(createShadowRowFilter(root)("src/a.c", [includeRow()])).toEqual(
        [],
      );
    }
  });

  it("reads an angle include only from a project file at that path", () => {
    const angled = {
      line: 1,
      text: "shims.h may define macros or function pointers this file uses: #include <shims.h>",
    };
    const root = project({
      "src/a.c": '#include <shims.h>\nvoid f(void) { log_line("x"); }\n',
      "inc/other.h": LOG_LINE_MACRO,
    });
    expect(createShadowRowFilter(root)("src/a.c", [angled])).toEqual([]);
  });

  it("reads project macros from C sources and headers only", () => {
    expect(
      cKept("#define LIMIT COLOR\n", "int f(void) { return LIMIT; }", {
        "notes.txt": "#define COLOR system\n",
      }),
    ).toBe(false);
  });

  it("reads each file and each project scan once per filter", () => {
    const angled = {
      line: 1,
      text: "shims.h may define macros or function pointers this file uses: #include <shims.h>",
    };
    const root = project({
      "src/a.c": '#include <shims.h>\nvoid f(void) { log_line("x"); }\n',
      "src/b.c": '#include "config.h"\nint f(void) { return LIMIT; }\n',
      "src/c.c": '#include "config.h"\nint g(void) { return LIMIT; }\n',
      "src/config.h": "#define LIMIT COLOR\n",
    });
    const filter = createShadowRowFilter(root);
    expect(filter("src/a.c", [angled])).toEqual([]);
    expect(filter("src/b.c", [includeRow()])).toEqual([]);
    write(root, {
      "inc/shims.h": LOG_LINE_MACRO,
      "src/other.h": "#define COLOR system\n",
      "src/b.c": '#include "config.h"\nint f(void) { return 0; }\n',
    });
    // Files written after the first look are not seen by this filter.
    expect(filter("src/a.c", [angled])).toEqual([]);
    expect(filter("src/c.c", [includeRow()])).toEqual([]);
    expect(filter("src/b.c", [includeRow()])).toEqual([]);
    // A new filter sees them.
    const fresh = createShadowRowFilter(root);
    expect(fresh("src/a.c", [angled])).toEqual([angled]);
    expect(fresh("src/c.c", [includeRow()])).toEqual([includeRow()]);
  });

  it("reads each file's own text, not another file's", () => {
    const root = project({
      "src/a.c": '#include "config.h"\nint f(void) { return 0; }\n',
      "src/b.c": '#include "config.h"\nvoid f(void) { log_line("x"); }\n',
      "src/config.h": LOG_LINE_MACRO,
    });
    const filter = createShadowRowFilter(root);
    expect(filter("src/a.c", [includeRow()])).toEqual([]);
    expect(filter("src/b.c", [includeRow()])).toEqual([includeRow()]);
  });
});

describe("PHP rows", () => {
  const row = {
    line: 3,
    text: "getenv may be a function of namespace App: getenv('X')",
  };
  const caller = "<?php\nnamespace App;\ngetenv('X');\n";

  it("reads only a row that starts with the function name", () => {
    const odd = {
      line: 3,
      text: "x.getenv may be a function of namespace App: getenv('X')",
    };
    const root = project({ "src/a.php": caller });
    expect(createShadowRowFilter(root)("src/a.php", [odd])).toEqual([odd]);
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([]);
  });

  it("matches the namespace without regard to case", () => {
    const root = project({
      "src/a.php": caller,
      "src/b.php": "<?php\nnamespace app;\nfunction getenv($n) {}\n",
    });
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([row]);
  });

  it("keeps the row when a project file cannot be read, and skips .git", () => {
    const root = project({
      "src/a.php": caller,
      ".git/hooks/x.php": "<?php\nnamespace App;\nfunction getenv($n) {}\n",
    });
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([]);
    dangling(root, "lib/broken.php");
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([row]);
  });

  it("reads the project's PHP files once per filter", () => {
    const root = project({ "src/a.php": caller, "src/c.php": caller });
    const filter = createShadowRowFilter(root);
    expect(filter("src/a.php", [row])).toEqual([]);
    write(root, {
      "src/b.php": "<?php\nnamespace App;\nfunction getenv($n) {}\n",
    });
    expect(filter("src/c.php", [row])).toEqual([]);
    expect(createShadowRowFilter(root)("src/c.php", [row])).toEqual([row]);
  });
});

describe("Laravel Env rows", () => {
  const row = {
    line: 2,
    text: "Cache may be Illuminate\\Support\\Env or a class that extends it: Cache::get('k')",
  };

  it("reads PHP files only, and keeps the row when one cannot be read", () => {
    const root = project({
      "src/a.php": "<?php\nCache::get('k');\n",
      "notes.txt": "Cache extends Illuminate\\Support\\Env\n",
    });
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([]);
    dangling(root, "lib/broken.php");
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([row]);
  });

  it("does not count a namespace statement left open as a declaration", () => {
    const root = project({
      "src/a.php": "<?php\nCache::get('k');\n",
      "vendor/x/Env.php": "<?php\nnamespace Illuminate\\Support",
    });
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([row]);
  });
});

describe("Bash $0 rows", () => {
  const row = {
    line: 1,
    text: 'run.sh may be sourced by another script, whose folder $0 names: source "$(dirname "$0")/lib.sh"',
  };
  const kept = (scripts: Record<string, string>) => {
    const root = project({
      "bin/run.sh": 'source "$(dirname "$0")/lib.sh"\n',
      ...scripts,
    });
    return createShadowRowFilter(root)("bin/run.sh", [row]).length === 1;
  };

  it("reads shell scripts and extensionless files only", () => {
    expect(kept({ "notes.txt": ". ./run.sh\n" })).toBe(false);
    expect(kept({ "lib/notes.sh.txt": ". ./run.sh\n" })).toBe(false);
    expect(kept({ "bin/tool.bash": "#!/bin/bash\n. ./run.sh\n" })).toBe(true);
  });

  it("reads a source on the first line, after --, with extra spaces, or of a computed path", () => {
    for (const script of [
      ". ./run.sh\n",
      "#!/bin/sh\n. -- ./run.sh\n",
      "#!/bin/sh\n.  ./run.sh\n",
      '#!/bin/sh\n. "$(pick)"\n',
    ])
      expect([script, kept({ "bin/main": script })]).toEqual([script, true]);
  });

  it("keeps the row when a project script cannot be read", () => {
    const root = project({ "bin/run.sh": "echo hi\n" });
    expect(createShadowRowFilter(root)("bin/run.sh", [row])).toEqual([]);
    dangling(root, "bin/broken.sh");
    expect(createShadowRowFilter(root)("bin/run.sh", [row])).toEqual([row]);
  });

  it("reads the project's scripts once per filter", () => {
    const root = project({ "bin/run.sh": "echo hi\n" });
    const filter = createShadowRowFilter(root);
    expect(filter("bin/run.sh", [row])).toEqual([]);
    write(root, { "bin/main": ". ./run.sh\n" });
    expect(filter("bin/run.sh", [row])).toEqual([]);
  });
});

describe("Go modules", () => {
  it("does not read a vendored module as the project's", () => {
    const module = "example.com/app";
    const root = project({
      "go.mod": `module ${module}\n`,
      "app/main.go":
        'package main\nimport (\n\t"github.com/sirupsen/logrus"\n)\nfunc main() {}\n',
      "vendor/github.com/sirupsen/logrus/go.mod":
        "module github.com/sirupsen/logrus\n",
      "vendor/github.com/sirupsen/logrus/env.go":
        'package logrus\nimport "os"\nvar _ = os.Getenv("L")\n',
    });
    const row = {
      line: 3,
      text: 'logrus may be a package of the project: "github.com/sirupsen/logrus"',
    };
    expect(createShadowRowFilter(root)("app/main.go", [row])).toEqual([]);
  });
});

describe("row forms and preprocessor spacing", () => {
  it("keeps a row whose text only continues one of the forms on a later line", () => {
    const root = project({
      "src/a.c": '#include "config.h"\nint f(void) { return 0; }\n',
      "src/config.h": "#define SIZE 4\n",
      "bin/run.sh": "echo hi\n",
    });
    const filter = createShadowRowFilter(root);
    const cRow = { line: 1, text: `x\n${includeRow().text}` };
    expect(filter("src/a.c", [cRow])).toEqual([cRow]);
    const zeroRow = {
      line: 1,
      text: "x\nrun.sh may be sourced by another script, whose folder $0 names: . ./lib.sh",
    };
    expect(filter("bin/run.sh", [zeroRow])).toEqual([zeroRow]);
  });

  it("treats a glibc redirect of any suffix as opaque", () => {
    expect(
      cKept(
        "extern int __REDIRECT_NTH (getenv_s, (const char *n), getenv);\n",
        "int f(void) { return 0; }",
      ),
    ).toBe(true);
  });

  it("reads a vertical tab before or after the directive's #", () => {
    for (const header of [
      "\v#define LIMIT(x) system(x)\n",
      "#\vdefine LIMIT(x) system(x)\n",
      "\v#undef LIMIT\n",
    ])
      expect([header, cKept(header, CALLS_LIMIT)]).toEqual([header, true]);
    const nested = '\v#include "inner.h"\n';
    expect(
      cKept(nested, CALLS_LIMIT, {
        "src/inner.h": "#define LIMIT(x) system(x)\n",
      }),
    ).toBe(true);
  });

  it("reads the file of an include row once per filter", () => {
    const root = project({
      "src/a.c": '#include "config.h"\nint f(void) { return 0; }\n',
      "src/config.h": "#define SIZE 4\n",
    });
    const filter = createShadowRowFilter(root);
    expect(filter("src/a.c", [includeRow()])).toEqual([]);
    fs.rmSync(path.join(root, "src/a.c"));
    expect(filter("src/a.c", [includeRow()])).toEqual([]);
  });
});

describe("Rust crates", () => {
  const row = {
    line: 1,
    text: 'println may be a macro_rules! macro of the crate: println!("hello")',
  };

  it("reads each crate's own .rs files", () => {
    const root = project({
      "crates/app/Cargo.toml": "[package]\nname = 'app'\n",
      "crates/app/src/user.rs": 'pub fn x() { println!("hello"); }\n',
      "crates/app/README.md": "macro_rules! println { () => {}; }\n",
      "crates/lib/Cargo.toml": "[package]\nname = 'lib'\n",
      "crates/lib/src/macros.rs": "macro_rules! println { () => {}; }\n",
    });
    const filter = createShadowRowFilter(root);
    expect(filter("crates/lib/src/macros.rs", [row])).toEqual([row]);
    expect(filter("crates/app/src/user.rs", [row])).toEqual([]);
  });
});

describe("Laravel Env mentions", () => {
  it("counts a mention after the file's own namespace statement", () => {
    const row = {
      line: 2,
      text: "Cache may be Illuminate\\Support\\Env or a class that extends it: Cache::get('k')",
    };
    const root = project({
      "src/a.php": "<?php\nCache::get('k');\n",
      "src/Cache.php":
        "<?php\nnamespace App;\nuse Illuminate\\Support\\Env;\nclass Cache extends Env {}\n",
    });
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([row]);
  });
});
