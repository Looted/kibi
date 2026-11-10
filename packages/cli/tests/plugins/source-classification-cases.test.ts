import { describe, expect, test } from "bun:test";
import {
  type SourceClassification,
  classifiedExtensions,
  classifySource,
  extensionLanguage,
  isQualifiedSourcePath,
  isTsJsSourcePath,
} from "../../src/plugins/source-classification.js";

type Source = "extension" | "shebang" | "explicit" | "content";

const lang = (language: string, source: Source): SourceClassification => ({
  kind: "language",
  language,
  source,
});
const fileLevel = (
  language: string,
  source: Source,
  reason = `${language} is retained as a file-level classification; no syntax extractor is selected.`,
): SourceClassification => ({ kind: "file-level", language, source, reason });
const shellDialect = (name: string): SourceClassification => ({
  kind: "file-level",
  language: "shell",
  source: "shebang",
  reason: `The ${name} shell dialect is retained as file-level source.`,
});
const unknownInterpreter = (name: string): SourceClassification => ({
  kind: "unknown",
  language: "unknown",
  reason: `The '${name}' interpreter is not in the executable source catalog.`,
});
const noSignal: SourceClassification = {
  kind: "unknown",
  language: "unknown",
  reason: "No recognized source extension or shebang is present.",
};
const malformedEnv = unknownInterpreter("malformed-env-shebang");
const ambiguousPl: SourceClassification = {
  kind: "ambiguous",
  language: "perl-or-prolog",
  candidates: ["perl", "prolog"],
  reason: "The '.pl' extension does not select one language.",
};

/** Classification of an extensionless script with the given shebang line. */
const script = (line: string) => classifySource("bin/tool", `${line}\nbody\n`);

describe("extension catalog", () => {
  const catalog: [string, SourceClassification][] = [
    [".bash", lang("bash", "extension")],
    [".c", lang("c", "extension")],
    [".cc", lang("cpp", "extension")],
    [".cjs", lang("javascript", "extension")],
    [".cpp", lang("cpp", "extension")],
    [".cs", lang("csharp", "extension")],
    [".cts", lang("typescript", "extension")],
    [".cxx", lang("cpp", "extension")],
    [".go", lang("go", "extension")],
    [".h", lang("c", "content")],
    [".hcl", lang("hcl", "extension")],
    [".hh", lang("cpp", "extension")],
    [".hpp", lang("cpp", "extension")],
    [".hxx", lang("cpp", "extension")],
    [
      ".html",
      fileLevel(
        "html",
        "extension",
        "HTML is classified as a file-level document.",
      ),
    ],
    [".java", lang("java", "extension")],
    [".js", lang("javascript", "extension")],
    [".jsx", lang("javascript", "extension")],
    [
      ".json",
      fileLevel(
        "json",
        "extension",
        "JSON is classified as a file-level document.",
      ),
    ],
    [".kt", lang("kotlin", "extension")],
    [".mjs", lang("javascript", "extension")],
    [".mts", lang("typescript", "extension")],
    [".php", lang("php", "extension")],
    [".plt", lang("prolog", "extension")],
    [".pl", ambiguousPl],
    [".py", lang("python", "extension")],
    [".pyi", lang("python", "extension")],
    [".rb", lang("ruby", "extension")],
    [".rs", lang("rust", "extension")],
    [
      ".sh",
      fileLevel(
        "shell",
        "extension",
        "A .sh extension does not identify a shell dialect.",
      ),
    ],
    [
      ".sql",
      fileLevel(
        "sql",
        "extension",
        "SQL is classified as a file-level document.",
      ),
    ],
    [".swift", lang("swift", "extension")],
    [".ts", lang("typescript", "extension")],
    [".tsx", lang("typescript", "extension")],
    [".tf", lang("terraform", "extension")],
    [
      ".yaml",
      fileLevel(
        "yaml",
        "extension",
        "YAML is classified as a file-level document.",
      ),
    ],
    [
      ".yml",
      fileLevel(
        "yaml",
        "extension",
        "YAML is classified as a file-level document.",
      ),
    ],
    [
      ".css",
      fileLevel(
        "css",
        "extension",
        "CSS is classified as a file-level document.",
      ),
    ],
  ];

  test("classifies every catalogued extension", () => {
    for (const [extension, expected] of catalog)
      expect([
        extension,
        classifySource(`src/f${extension}`, ""),
      ]).toStrictEqual([extension, expected]);
    expect(classifiedExtensions()).toStrictEqual(
      catalog.map(([extension]) => extension).sort(),
    );
  });

  test("labels paths by extension alone", () => {
    expect(
      [
        "a.ts",
        "A.TS",
        "dir\\b.py",
        "c.h",
        "d.pl",
        "e.json",
        "f.zzz",
        "noext",
        ".bash",
        "a.ts/file",
      ].map(extensionLanguage),
    ).toStrictEqual([
      "typescript",
      "typescript",
      "python",
      "c-or-cpp",
      "perl-or-prolog",
      "json",
      "unknown",
      "unknown",
      "unknown",
      "unknown",
    ]);
    expect(
      ["a.ts", "a.mjs", "a.py", "a.json"].map(isTsJsSourcePath),
    ).toStrictEqual([true, true, false, false]);
    expect(
      [
        "a.ts",
        "a.js",
        "a.py",
        "a.go",
        "a.rs",
        "a.c",
        "a.java",
        "a.json",
        "a.h",
        "a",
      ].map(isQualifiedSourcePath),
    ).toStrictEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  test("an unknown extension is not a missing one", () => {
    expect(classifySource("a.zzz", "#!/usr/bin/python3\n")).toStrictEqual({
      kind: "unknown",
      language: "unknown",
      reason:
        "The file extension is not present in the source language catalog.",
    });
    expect(classifySource(".bash", "")).toStrictEqual(noSignal);
    expect(classifySource("a.ts/file", "")).toStrictEqual(noSignal);
  });
});

describe("explicit language hints", () => {
  test("canonicalize every known alias", () => {
    const aliases: [string, SourceClassification][] = [
      ["py", lang("python", "explicit")],
      ["Python", lang("python", "explicit")],
      ["python2", lang("python", "explicit")],
      [" python3 ", lang("python", "explicit")],
      ["bash", lang("bash", "explicit")],
      ["bash5", lang("bash", "explicit")],
      ["rb", lang("ruby", "explicit")],
      ["ruby", lang("ruby", "explicit")],
      ["ruby33", lang("ruby", "explicit")],
      ["ruby3.2.1", lang("ruby", "explicit")],
      ["ruby3.22", lang("ruby", "explicit")],
      ["ruby3.", lang("ruby3.", "explicit")],
      ["xruby3", lang("xruby3", "explicit")],
      ["ruby3x", lang("ruby3x", "explicit")],
      ["rubyx", lang("rubyx", "explicit")],
      ["ruby3.x", lang("ruby3.x", "explicit")],
      ["js", lang("javascript", "explicit")],
      ["javascript", lang("javascript", "explicit")],
      ["node", lang("javascript", "explicit")],
      ["nodejs", lang("javascript", "explicit")],
      ["ts", lang("typescript", "explicit")],
      ["typescript", lang("typescript", "explicit")],
      ["c++", lang("cpp", "explicit")],
      ["cpp", lang("cpp", "explicit")],
      ["cxx", lang("cpp", "explicit")],
      ["c#", lang("csharp", "explicit")],
      ["c-sharp", lang("csharp", "explicit")],
      ["csharp", lang("csharp", "explicit")],
      ["cs", lang("csharp", "explicit")],
      ["perl", fileLevel("perl", "explicit")],
      ["pl", fileLevel("perl", "explicit")],
      ["prolog", lang("prolog", "explicit")],
      ["swipl", lang("prolog", "explicit")],
      ["tf", lang("terraform", "explicit")],
      ["go", lang("go", "explicit")],
      ["css", fileLevel("css", "explicit")],
      ["html", fileLevel("html", "explicit")],
      ["json", fileLevel("json", "explicit")],
      ["shell", fileLevel("shell", "explicit")],
      ["sql", fileLevel("sql", "explicit")],
      ["yaml", fileLevel("yaml", "explicit")],
    ];
    for (const [hint, expected] of aliases)
      expect([hint, classifySource("bin/tool", "", hint)]).toStrictEqual([
        hint,
        expected,
      ]);
    expect(classifySource("a.ts", "", "  ")).toStrictEqual(
      lang("typescript", "extension"),
    );
  });

  test("must agree with the extension", () => {
    expect(classifySource("a.json", "", "json")).toStrictEqual(
      fileLevel("json", "explicit"),
    );
    expect(classifySource("a.json", "", "bash")).toStrictEqual({
      kind: "conflict",
      language: "unknown",
      reason:
        "The explicit language 'bash' conflicts with the file extension classification.",
      extensionLanguage: "json",
      explicitLanguage: "bash",
    });
    expect(classifySource("a.py", "", "ruby")).toStrictEqual({
      kind: "conflict",
      language: "unknown",
      reason:
        "The explicit language 'ruby' conflicts with the file extension classification.",
      extensionLanguage: "python",
      explicitLanguage: "ruby",
    });
    expect(classifySource("a.py", "#!/usr/bin/ruby\n", "ruby")).toStrictEqual({
      kind: "conflict",
      language: "unknown",
      reason:
        "The explicit language 'ruby' conflicts with the file extension classification.",
      extensionLanguage: "python",
      explicitLanguage: "ruby",
      shebangLanguage: "ruby",
    });
    expect(classifySource("a.pl", "", "prolog")).toStrictEqual(
      lang("prolog", "explicit"),
    );
    expect(classifySource("a.pl", "", "python")).toStrictEqual({
      kind: "conflict",
      language: "unknown",
      reason:
        "The explicit language 'python' conflicts with the file extension classification.",
      extensionLanguage: "perl-or-prolog",
      explicitLanguage: "python",
    });
    expect(classifySource("a.sh", "", "bash")).toStrictEqual(
      lang("bash", "explicit"),
    );
    expect(classifySource("a.sh", "", "shell")).toStrictEqual(
      fileLevel("shell", "explicit"),
    );
    expect(classifySource("a.sh", "", "python")).toMatchObject({
      kind: "conflict",
      extensionLanguage: "shell",
    });
    expect(classifySource("a.json", "", "yaml")).toMatchObject({
      kind: "conflict",
      extensionLanguage: "json",
    });
    expect(classifySource("a.json", "", "json")).toStrictEqual(
      fileLevel("json", "explicit"),
    );
  });

  test("must agree with the shebang", () => {
    expect(classifySource("a.py", "#!/usr/bin/python3\n", "py")).toStrictEqual(
      lang("python", "explicit"),
    );
    expect(classifySource("tool", "#!/bin/zsh\n", "shell")).toStrictEqual(
      fileLevel("shell", "explicit"),
    );
    expect(classifySource("tool", "#!/bin/zsh\n", "bash")).toStrictEqual({
      kind: "conflict",
      language: "unknown",
      reason:
        "The explicit language 'bash' conflicts with the snapshot shebang.",
      explicitLanguage: "bash",
    });
    expect(classifySource("a.py", "#!/usr/bin/ruby\n", "python")).toStrictEqual(
      {
        kind: "conflict",
        language: "unknown",
        reason:
          "The explicit language 'python' conflicts with the snapshot shebang.",
        extensionLanguage: "python",
        shebangLanguage: "ruby",
        explicitLanguage: "python",
      },
    );
    expect(classifySource("tool", "#!/usr/bin/ruby\n", "shell")).toMatchObject({
      kind: "conflict",
      shebangLanguage: "ruby",
    });
  });
});

describe("shebang interpreters", () => {
  test("map interpreter names to languages", () => {
    const cases: [string, SourceClassification][] = [
      ["#!/usr/bin/python", lang("python", "shebang")],
      ["#!/usr/bin/python3", lang("python", "shebang")],
      ["#!/usr/bin/python311", lang("python", "shebang")],
      ["#!/usr/bin/python3.11", lang("python", "shebang")],
      ["#!/usr/bin/python3.11.2", lang("python", "shebang")],
      ["#!'C:\\Python\\python.exe'", lang("python", "shebang")],
      ["#!C:\\Python\\python.exe", unknownInterpreter("c:pythonpython")],
      ["#!/usr/bin/PYTHON3.EXE", lang("python", "shebang")],
      ["#!/usr/bin/xpython", unknownInterpreter("xpython")],
      ["#!/usr/bin/python3x", unknownInterpreter("python3x")],
      ["#!/usr/bin/pythonx", unknownInterpreter("pythonx")],
      ["#!/usr/bin/exe.python", unknownInterpreter("exe.python")],
      ["#!/usr/bin/ruby", lang("ruby", "shebang")],
      ["#!/usr/bin/ruby33", lang("ruby", "shebang")],
      ["#!/usr/bin/ruby3.2.1", lang("ruby", "shebang")],
      ["#!/usr/bin/ruby3.22", lang("ruby", "shebang")],
      ["#!/usr/bin/rubyx", unknownInterpreter("rubyx")],
      ["#!/usr/bin/xruby", unknownInterpreter("xruby")],
      ["#!/usr/bin/ruby3x", unknownInterpreter("ruby3x")],
      ["#!/usr/bin/ruby3.x", unknownInterpreter("ruby3.x")],
      ["#!/usr/bin/node", lang("javascript", "shebang")],
      ["#!/usr/bin/nodejs", lang("javascript", "shebang")],
      ["#!/bin/bash", lang("bash", "shebang")],
      ["#!/bin/bash55", lang("bash", "shebang")],
      ["#!/bin/xbash5", unknownInterpreter("xbash5")],
      ["#!/bin/bash5x", unknownInterpreter("bash5x")],
      ["#!/bin/bashx", unknownInterpreter("bashx")],
      ["#!/usr/bin/perl", fileLevel("perl", "shebang")],
      ["#!/usr/bin/perl536", fileLevel("perl", "shebang")],
      ["#!/usr/bin/perl5.36.1", fileLevel("perl", "shebang")],
      ["#!/usr/bin/perl5.36", fileLevel("perl", "shebang")],
      ["#!/usr/bin/xperl", unknownInterpreter("xperl")],
      ["#!/usr/bin/perl5x", unknownInterpreter("perl5x")],
      ["#!/usr/bin/perlx", unknownInterpreter("perlx")],
      ["#!/usr/bin/perl5.x", unknownInterpreter("perl5.x")],
      ["#!/usr/bin/prolog", lang("prolog", "shebang")],
      ["#!/usr/bin/swipl", lang("prolog", "shebang")],
      ["#!/usr/bin/gprolog", lang("prolog", "shebang")],
      ["#!/usr/bin/", unknownInterpreter("unknown")],
      ["#!/usr/bin/awk -f", unknownInterpreter("awk")],
    ];
    for (const [line, expected] of cases)
      expect([line, script(line)]).toStrictEqual([line, expected]);
  });

  test("keep every shell dialect at file level", () => {
    for (const shell of [
      "ash",
      "busybox",
      "csh",
      "dash",
      "fish",
      "ksh",
      "mksh",
      "pwsh",
      "sh",
      "tcsh",
      "yash",
      "zsh",
    ])
      expect(script(`#!/bin/${shell}`)).toStrictEqual(shellDialect(shell));
  });

  test("read only the first line, after a byte order mark", () => {
    expect(classifySource("tool", "\uFEFF#!/usr/bin/python3\n")).toStrictEqual(
      lang("python", "shebang"),
    );
    expect(classifySource("tool", "#!/usr/bin/python3")).toStrictEqual(
      lang("python", "shebang"),
    );
    expect(classifySource("tool", "#!/usr/bin/env\r\npython3\n")).toStrictEqual(
      malformedEnv,
    );
    expect(classifySource("tool", "#!   /usr/bin/python3   \n")).toStrictEqual(
      lang("python", "shebang"),
    );
    expect(classifySource("tool", " #!/usr/bin/python3\n")).toStrictEqual(
      noSignal,
    );
  });

  test("reject an overlong first line and keep one at the limit", () => {
    const name = `p${"y".repeat(126)}`;
    const padded = `#!/${name}${" ".repeat(512 - 4 - name.length)}`;
    expect(padded.length).toBe(511);
    expect(classifySource("tool", `${padded}  `)).toStrictEqual(
      unknownInterpreter(name),
    );
    expect(classifySource("tool", `${padded}   `)).toStrictEqual(
      unknownInterpreter(name),
    );
    expect(classifySource("tool", `${padded}    `)).toStrictEqual(
      unknownInterpreter("overlong-shebang"),
    );
    expect(classifySource("tool", `\uFEFF${padded}  `)).toStrictEqual(
      unknownInterpreter(name),
    );
    expect(
      classifySource("tool", `${padded}  \n${"x".repeat(600)}`),
    ).toStrictEqual(unknownInterpreter(name));
    expect(classifySource("tool", `#!${"a".repeat(128)}\n`)).toStrictEqual(
      unknownInterpreter("a".repeat(128)),
    );
    expect(classifySource("tool", `#!${"a".repeat(129)}\n`)).toStrictEqual(
      unknownInterpreter("malformed-shebang"),
    );
  });

  test("bound each token and the token count", () => {
    const at = `#!/${"a".repeat(127)}`;
    expect(script(at)).toStrictEqual(unknownInterpreter("a".repeat(127)));
    expect(script(`${at}a`)).toStrictEqual(
      unknownInterpreter("malformed-shebang"),
    );
    const sixteen = `#!/usr/bin/awk ${Array(15).fill("x").join(" ")}`;
    expect(script(sixteen)).toStrictEqual(unknownInterpreter("awk"));
    expect(script(`${sixteen} `)).toStrictEqual(unknownInterpreter("awk"));
    expect(script(`${sixteen} x`)).toStrictEqual(
      unknownInterpreter("malformed-shebang"),
    );
    expect(script(`${sixteen} x `)).toStrictEqual(
      unknownInterpreter("malformed-shebang"),
    );
  });

  test("reject an empty or unterminated shebang", () => {
    for (const line of [
      "#!",
      "#!   ",
      "#!/bin/'sh",
      '#!/bin/"sh',
      "#!/bin/sh\\",
    ])
      expect([line, script(line)]).toStrictEqual([
        line,
        unknownInterpreter("malformed-shebang"),
      ]);
  });

  test("tokenize quotes and escapes like a shell", () => {
    const cases: [string, SourceClassification][] = [
      ['#!"/usr/bin/python3"', lang("python", "shebang")],
      ["#!'/usr/bin/py'thon3", lang("python", "shebang")],
      ["#!/usr/bin/py\\thon3", lang("python", "shebang")],
      ["#!/usr/bin/py\\ thon", unknownInterpreter("py thon")],
      ["#!'/usr/bin/py\\'", unknownInterpreter("unknown")],
      ['#!"/usr/bin/py\\"x"', unknownInterpreter('py"x')],
      ['#!""', unknownInterpreter("unknown")],
      ["#!\\\\", unknownInterpreter("unknown")],
      ['#!/usr/bin/env "" python3', unknownInterpreter("unknown")],
      ["#!/usr/bin/env  python3", lang("python", "shebang")],
      ['#!/usr/bin/env "py"thon3', lang("python", "shebang")],
    ];
    for (const [line, expected] of cases)
      expect([line, script(line)]).toStrictEqual([line, expected]);
  });
});

describe("env shebangs", () => {
  test("skip env options to find the command", () => {
    const python = lang("python", "shebang");
    const cases: [string, SourceClassification][] = [
      ["#!/usr/bin/env python3", python],
      ["#!/usr/bin/ENV python3", python],
      ["#!/usr/bin/env -- python3", python],
      ["#!/usr/bin/env -i -- python3", python],
      ["#!/usr/bin/env --", malformedEnv],
      ["#!/usr/bin/env", malformedEnv],
      ["#!/usr/bin/env -i", malformedEnv],
      ["#!/usr/bin/env -u FOO python3", python],
      ["#!/usr/bin/env --unset FOO python3", python],
      ["#!/usr/bin/env -C /tmp python3", python],
      ["#!/usr/bin/env --chdir /tmp python3", python],
      ["#!/usr/bin/env -a name python3", python],
      ["#!/usr/bin/env --argv0 name python3", python],
      ["#!/usr/bin/env -i python3", python],
      ["#!/usr/bin/env --ignore-environment python3", python],
      ["#!/usr/bin/env --unset=FOO python3", python],
      ["#!/usr/bin/env --chdir=/tmp python3", python],
      ["#!/usr/bin/env --argv0=x python3", python],
      ["#!/usr/bin/env FOO=1 _B2=x python3", python],
      ["#!/usr/bin/env -x=1 python3", malformedEnv],
      ["#!/usr/bin/env 1FOO=1 python3", unknownInterpreter("1foo=1")],
      ["#!/usr/bin/env -q python3", malformedEnv],
      ["#!/usr/bin/env x--unset= python3", unknownInterpreter("x--unset=")],
      ["#!/usr/bin/env x--chdir= python3", unknownInterpreter("x--chdir=")],
      ["#!/usr/bin/env x--argv0= python3", unknownInterpreter("x--argv0=")],
      ["#!/usr/bin/env q- python3", unknownInterpreter("q-")],
    ];
    for (const [line, expected] of cases)
      expect([line, script(line)]).toStrictEqual([line, expected]);
  });

  test("read a split-string command", () => {
    const python = lang("python", "shebang");
    const cases: [string, SourceClassification][] = [
      ["#!/usr/bin/env -S python3 -u", python],
      ["#!/usr/bin/env --split-string python3", python],
      ['#!/usr/bin/env "--split-string=python3 -u"', python],
      ["#!/usr/bin/env --split-string=python3", python],
      ["#!/usr/bin/env -S -i python3", python],
      ["#!/usr/bin/env -S --ignore-environment python3", python],
      ["#!/usr/bin/env -S -u FOO python3", python],
      ["#!/usr/bin/env -S --unset FOO python3", python],
      ["#!/usr/bin/env -S --unset=FOO python3", python],
      ["#!/usr/bin/env -S FOO=1 python3", python],
      ["#!/usr/bin/env -S -- python3", python],
      ["#!/usr/bin/env -S -i -- python3", python],
      ["#!/usr/bin/env -S --", malformedEnv],
      ["#!/usr/bin/env -S", malformedEnv],
      ["#!/usr/bin/env -S -i", malformedEnv],
      ["#!/usr/bin/env -S -u", malformedEnv],
      ['#!/usr/bin/env -S -u "" python3', malformedEnv],
      ["#!/usr/bin/env -S --unset= python3", malformedEnv],
      ["#!/usr/bin/env -S -C /tmp python3", malformedEnv],
      ["#!/usr/bin/env -S -x=1 python3", malformedEnv],
      ["#!/usr/bin/env -S 1A=1 python3", unknownInterpreter("1a=1")],
      ["#!/usr/bin/env -S q- python3", unknownInterpreter("q-")],
      [
        "#!/usr/bin/env -S x--unset=1 python3",
        unknownInterpreter("x--unset=1"),
      ],
      ["#!/usr/bin/env -S 'python3", unknownInterpreter("malformed-shebang")],
      [`#!/usr/bin/env -S '-u "" python3'`, malformedEnv],
      [`#!/usr/bin/env -S "python3 'x"`, malformedEnv],
    ];
    for (const [line, expected] of cases)
      expect([line, script(line)]).toStrictEqual([line, expected]);
  });
});

describe("ambiguous extensions", () => {
  const pl = (content: string) => classifySource("src/a.pl", content);
  const h = (content: string) => classifySource("include/a.h", content);

  test("read Prolog from its directives, clauses and facts", () => {
    const prolog = lang("prolog", "content");
    const cases: [string, SourceClassification][] = [
      [":- module(m, []).", prolog],
      [":-\tinitialization(main).", prolog],
      [" :- module(m, []).", ambiguousPl],
      [":-module(m, []).", ambiguousPl],
      ["head :- body.", prolog],
      ["head:- body.", prolog],
      ["head  :- body.", prolog],
      ["head :-", prolog],
      ["head :-body.", ambiguousPl],
      ["head --> body.", prolog],
      ["head_2B(X, Y) :- body(X).", prolog],
      ["head(X) --> [x].", prolog],
      ["Head :- body.", ambiguousPl],
      ["fact(a, b).", prolog],
      ["fact_2(a).  % note", prolog],
      ["fact(a).\t", prolog],
      ["fact(a). x", ambiguousPl],
      ["fact(a; b).", ambiguousPl],
      ["fact(a)", ambiguousPl],
      ["x fact(a).", ambiguousPl],
      ["fact(a)x.", ambiguousPl],
      ["\n\nfact(a).\n", prolog],
    ];
    for (const [content, expected] of cases)
      expect([content, pl(content)]).toStrictEqual([content, expected]);
  });

  test("read Perl from its pragmas, packages, subs and markers", () => {
    const perl = fileLevel("perl", "content");
    const cases: [string, SourceClassification][] = [
      ["use strict;", perl],
      ["  use warnings;", perl],
      ["use  utf8;", perl],
      ["use Foo::Bar qw(x);", perl],
      ["use F2;", perl],
      ["use strictly;", ambiguousPl],
      ["use foo;", ambiguousPl],
      ["use strict", ambiguousPl],
      ["xuse strict;", ambiguousPl],
      ["package Foo::Bar;", perl],
      ["  package _foo ;", perl],
      ["package  Foo;", perl],
      ["package Foo", ambiguousPl],
      ["package 1Foo;", ambiguousPl],
      ["sub foo {", perl],
      ["  sub _f2{", perl],
      ["sub  foo {", perl],
      ["sub 1f {", ambiguousPl],
      ["sub foo", ambiguousPl],
      ["my $x = 1;", perl],
      ["  my @list;", perl],
      ["my  %map;", perl],
      ["my x", ambiguousPl],
      ["=pod", perl],
      ["=head1 NAME", perl],
      ["=podx", ambiguousPl],
      [" =pod", ambiguousPl],
      ["__END__", perl],
      ["__DATA__", perl],
      ["__END__ x", ambiguousPl],
      ["x__END__", ambiguousPl],
    ];
    for (const [content, expected] of cases)
      expect([content, pl(content)]).toStrictEqual([content, expected]);
  });

  test("stay ambiguous when both or neither language matches", () => {
    expect(pl("use strict;\nfact(a).\n")).toStrictEqual(ambiguousPl);
    expect(pl("")).toStrictEqual(ambiguousPl);
    expect(pl(`${"x".repeat(65_536)}\nuse strict;\n`)).toStrictEqual(
      ambiguousPl,
    );
    expect(pl(`${"x".repeat(65_522)}\nuse strict;`)).toStrictEqual(
      fileLevel("perl", "content"),
    );
  });

  test("read C++ from constructs C lacks", () => {
    const cpp = lang("cpp", "content");
    const c = lang("c", "content");
    const cases: [string, SourceClassification][] = [
      ["class Foo {};", cpp],
      ["  namespace a {}", cpp],
      ["template <typename T> T f();", cpp],
      ["template<typename T> T f();", cpp],
      ["using namespace std;", cpp],
      ["using  namespace std;", cpp],
      ["usingnamespace x;", c],
      ["xclass Foo;", c],
      ["classy x;", c],
      ["int a; class Foo;", c],
      ["public:", cpp],
      ["  private :", cpp],
      ["protected  :", cpp],
      ["x public:", c],
      ["virtual void f();", cpp],
      ["constexpr int a = 1;", cpp],
      ["int *p = nullptr;", cpp],
      ["bool operator==(A a);", cpp],
      ["bool operator +(A a);", cpp],
      ["int operatorx;", c],
      ["int operator x;", c],
      ["x = static_cast<int>(y);", cpp],
      ["x = dynamic_cast<A*>(y);", cpp],
      ["x = reinterpret_cast<A*>(y);", cpp],
      ["void f() noexcept;", cpp],
      ["int xvirtual;", c],
      ["int virtualx;", c],
      ["std::size_t n;", cpp],
      ["xstd::1", c],
      ["Foo::~Foo() {}", cpp],
      ["_a2::b", cpp],
      ["a::1", c],
      ["x::y", cpp],
      ["public// note\n:", cpp],
      ["2::b", c],
      ['extern "C" { int f(void); }', c],
      ["/* class */ int a;", c],
      ["/*\nclass Foo;\n*/", c],
      ["/**/ int a; /* x */ class", c],
      ["std/* */::x", c],
      ["// class Foo", c],
      ['char *s = "class Foo";', c],
      ['char *s = "a\\"class";', c],
      ['a"x"::b', c],
      [`${"x".repeat(65_536)}\nclass Foo;`, c],
      [`${"x".repeat(65_530)}\nclass Foo;`, cpp],
    ];
    for (const [content, expected] of cases)
      expect([content.slice(0, 40), h(content)]).toStrictEqual([
        content.slice(0, 40),
        expected,
      ]);
  });

  test("resolve an ambiguous extension from its shebang", () => {
    expect(pl("#!/usr/bin/perl\n")).toStrictEqual(fileLevel("perl", "shebang"));
    expect(pl("#!/usr/bin/swipl\n")).toStrictEqual(lang("prolog", "shebang"));
    expect(pl("#!/usr/bin/python3\nuse strict;\n")).toStrictEqual({
      kind: "conflict",
      language: "unknown",
      reason:
        "The file extension is ambiguous and the shebang does not resolve it to a supported candidate.",
      extensionLanguage: "perl-or-prolog",
      shebangLanguage: "python",
    });
    expect(pl("#!/bin/sh\n")).toStrictEqual({
      kind: "conflict",
      language: "unknown",
      reason:
        "The file extension is ambiguous and the shebang does not resolve it to a supported candidate.",
      extensionLanguage: "perl-or-prolog",
    });
    expect(h("#!/usr/bin/perl\nclass A;")).toMatchObject({
      kind: "conflict",
      extensionLanguage: "c-or-cpp",
      shebangLanguage: "perl",
    });
  });
});

describe("shebangs against extensions", () => {
  test("a shell shebang fits only a shell extension", () => {
    expect(classifySource("a.sh", "#!/bin/dash\n")).toStrictEqual(
      shellDialect("dash"),
    );
    expect(classifySource("a.py", "#!/bin/dash\n")).toStrictEqual({
      kind: "conflict",
      language: "unknown",
      reason:
        "The dash shell shebang conflicts with the file extension language.",
      extensionLanguage: "python",
      shebangLanguage: "shell",
    });
  });

  test("a language shebang must match the extension", () => {
    expect(classifySource("a.sh", "#!/bin/bash\n")).toStrictEqual(
      lang("bash", "shebang"),
    );
    expect(classifySource("a.py", "#!/usr/bin/python3\n")).toStrictEqual(
      lang("python", "shebang"),
    );
    expect(classifySource("a.py", "#!/usr/bin/ruby\n")).toStrictEqual({
      kind: "conflict",
      language: "unknown",
      reason: "The ruby shebang conflicts with the file extension language.",
      extensionLanguage: "python",
      shebangLanguage: "ruby",
    });
    expect(classifySource("a.json", "#!/usr/bin/node\n")).toMatchObject({
      kind: "conflict",
      extensionLanguage: "json",
    });
  });

  test("an unqualified interpreter conflicts with any extension", () => {
    expect(classifySource("a.py", "#!/usr/bin/awk -f\n")).toStrictEqual({
      kind: "conflict",
      language: "unknown",
      reason:
        "The shebang interpreter 'awk' is not qualified for the file extension language.",
      extensionLanguage: "python",
      shebangLanguage: "awk",
    });
  });
});
