// executable_for TEST-kibi-tree-sitter-references
import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createShadowRowFilter,
  javaCode,
} from "../../src/operations/proof/java-package-shadow.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(tmpdir(), "kibi-shadow-"));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

const systemRow = {
  line: 3,
  text: 'System may be a class of package e3: System.getenv("X")',
};
const runtimeRow = {
  line: 4,
  text: "Runtime may be a class of the default package: Runtime.getRuntime()",
};
const otherRow = { line: 5, text: "Class.forName(name)" };
const macroRow = {
  line: 2,
  text: 'println may be a macro_rules! macro of the crate: println!("hello")',
};

describe("rows about a name another file of the project may bind", () => {
  it("strips Java comments and literal contents, even unterminated ones", () => {
    expect(
      javaCode(
        'a /* class System */ b // class System\nc "class System // x" d',
      ),
    ).toBe('a   b  \nc "" d');
    expect(javaCode("char q = '\\''; char s = 'S'; class A {}")).toBe(
      "char q = ''; char s = ''; class A {}",
    );
    expect(javaCode('String t = """\nclass System\n""";')).toBe(
      'String t = "";',
    );
    expect(javaCode('x = "open\nclass Y')).toBe('x = ""class Y');
    expect(javaCode("a /* open")).toBe("a  ");
    expect(javaCode('t = """ open')).toBe('t = ""');
  });

  it("drops a Java row only when no file of the package declares that type", () => {
    const root = project({
      "src/e3/L04.java":
        'package e3;\nclass L04 { String a() { return System.getenv("X"); } }\n',
      "src/e3/Notes.java":
        'package e3;\n// class System is not here\nclass Notes { String s = "class System"; /* enum Runtime */ }\n',
      "src/e3/readme.txt": "class System {}\n",
    });
    const filter = createShadowRowFilter(root);
    expect(
      filter("src/e3/L04.java", [systemRow, runtimeRow, otherRow]),
    ).toEqual([otherRow]);
  });

  it("keeps a Java row when the package declares the type, may spell it by an escape, or cannot be read", () => {
    const root = project({
      "src/e3/L04.java": "package e3;\nclass L04 {}\n",
      "src/e3/System.java":
        "package e3;\npublic class System { public static String getenv(String k) { return k; } }\n",
      "src/e4/A.java": "package e4;\nclass A {}\n",
      "src/e4/B.java": "package e4;\nclass B {}\nrecord Runtime(int a) {}\n",
      "src/e5/A.java": "package e5;\nclass \\u0053ystem {}\n",
    });
    const filter = createShadowRowFilter(root);
    expect(filter("src/e3/L04.java", [systemRow, runtimeRow])).toEqual([
      systemRow,
    ]);
    const e4Row = { ...systemRow, text: systemRow.text.replace("e3", "e4") };
    expect(filter("src/e4/A.java", [e4Row, runtimeRow])).toEqual([runtimeRow]);
    expect(filter("src/e5/A.java", [systemRow])).toEqual([systemRow]);
    expect(filter("src/missing/A.java", [systemRow])).toEqual([systemRow]);
  });

  const qRow = {
    line: 2,
    text: 'System may be a class of package q: System.getenv("Q_NOT_ENV")',
  };
  const qRuntimeRow = {
    line: 3,
    text: "Runtime may be a class of package q: Runtime.getRuntime()",
  };

  it("keeps a Java row when the package declares the type in another source root", () => {
    const main = {
      "src/main/java/q/A.java":
        'package q;\nclass A { String a() { return System.getenv("Q_NOT_ENV"); } }\n',
    };
    for (const [file, text] of [
      [
        "src/gen/java/q/System.java",
        "package q;\npublic class System { public static String getenv(String k) { return k; } }\n",
      ],
      [
        "target/generated-sources/annotations/q/System.java",
        "@Generated\npackage /* gen */ q ;\nclass System {}\n",
      ],
      ["elsewhere/Odd.java", "package q;\nclass Odd {}\nclass System {}\n"],
      ["src/test/java/q/T.java", "package \\u0071;\nclass System {}\n"],
    ]) {
      const root = project({ ...main, [file as string]: text as string });
      expect(
        createShadowRowFilter(root)("src/main/java/q/A.java", [qRow]),
      ).toEqual([qRow]);
    }
    const defaultRoot = project({
      "src/main/java/D.java":
        "class D { void x() { Runtime.getRuntime().exit(1); } }\n",
      "src/gen/java/Runtime.java": "public class Runtime {}\n",
    });
    expect(
      createShadowRowFilter(defaultRoot)("src/main/java/D.java", [runtimeRow]),
    ).toEqual([runtimeRow]);
  });

  it("drops a Java row when no source root's file of the package declares the type", () => {
    const root = project({
      "src/main/java/q/A.java":
        'package q;\nclass A { String a() { return System.getenv("Q_NOT_ENV"); } }\n',
      "src/gen/java/q/Gen.java": "package q;\nclass Gen {}\n",
      "src/gen/java/r/System.java": "package r;\nclass System {}\n",
      "src/gen/java/qq/System.java": "package q.q;\nclass System {}\n",
      "src/gen/java/D.java": "class Runtime {}\n",
      "node_modules/x/q/System.java": "package q;\nclass System {}\n",
      ".cache/q/System.java": "package q;\nclass System {}\n",
    });
    expect(
      createShadowRowFilter(root)("src/main/java/q/A.java", [
        qRow,
        qRuntimeRow,
      ]),
    ).toEqual([]);
  });

  it("drops a Rust macro row only when the crate defines no macro of that name", () => {
    const root = project({
      "crates/app/Cargo.toml": "[package]\nname = 'app'\n",
      "crates/app/src/user.rs": 'pub fn x() { println!("hello"); }\n',
      "crates/app/src/other.rs":
        'macro_rules! printer { () => {}; }\nconst S: &str = "println";\n',
      "crates/app/target/gen.rs": "macro_rules! println { () => {}; }\n",
      "crates/app/.hidden/gen.rs": "macro_rules! println { () => {}; }\n",
      "crates/app/node_modules/gen.rs": "macro_rules! println { () => {}; }\n",
      "crates/lib/Cargo.toml": "[package]\nname = 'lib'\n",
      "crates/lib/src/macros.rs": "macro_rules! println { () => {}; }\n",
    });
    const filter = createShadowRowFilter(root);
    expect(filter("crates/app/src/user.rs", [macroRow, otherRow])).toEqual([
      otherRow,
    ]);
  });

  it("keeps a Rust macro row for a definition, a generated macro_rules!, #[macro_use] extern crate or an unreadable crate", () => {
    for (const definition of [
      "macro_rules! /* shadow */ println { () => {}; }\n",
      "macro_rules!\n// named below\nr#println { () => {}; }\n",
      "macro_rules! make { ($n:ident) => { macro_rules! $n { () => {}; } }; }\n",
      "#[macro_use]\npub extern crate other;\n",
    ]) {
      const root = project({
        "src/user.rs": 'pub fn x() { println!("hello"); }\n',
        "src/macros.rs": definition,
      });
      expect(createShadowRowFilter(root)("src/user.rs", [macroRow])).toEqual([
        macroRow,
      ]);
    }
    const missing = path.join(tmpdir(), "kibi-shadow-missing-root");
    expect(createShadowRowFilter(missing)("src/user.rs", [macroRow])).toEqual([
      macroRow,
    ]);
  });

  const getenvRow = {
    line: 85,
    text: 'getenv may be declared in another file of the package: getenv("ADMIN_TOKEN")',
  };
  const helperRow = {
    line: 86,
    text: 'getEnv may be declared in another file of the package: getEnv("ADMIN_TOKEN", "")',
  };

  it("drops a Go package row only when no other file of the package can read the environment through that name", () => {
    // main.go's own getter does not count, nor does a test file of the
    // package for a production file, nor another package's directory.
    const quiet = project({
      "app/main.go":
        'package main\nimport "os"\nfunc main() { _ = os.Getenv("A"); getenv("X") }\n',
      "app/env.go": "package main\nfunc getenv(k string) string { return k }\n",
      "app/env_test.go":
        'package main\nimport "os"\nfunc init() { _ = os.Getenv("T"); getenv("T") }\n',
      "app/sub/x.go": 'package sub\nimport "os"\nvar getenv = os.Getenv\n',
    });
    expect(
      createShadowRowFilter(quiet)("app/main.go", [getenvRow, otherRow]),
    ).toEqual([otherRow]);
    // Another file reads the environment but never names getenv.
    const unrelated = project({
      "app/main.go": 'package main\nfunc main() { getenv("X") }\n',
      "app/other.go":
        'package main\nimport "os"\nfunc other() string { return os.Getenv("B") }\n',
    });
    expect(
      createShadowRowFilter(unrelated)("app/main.go", [getenvRow]),
    ).toEqual([]);
  });

  it("keeps a Go package row when another file of the package holds a getter or wrapper, or the package cannot be read", () => {
    for (const declaration of [
      'package main\nimport "os"\nvar getenv = os.Getenv\n',
      'package main\nimport "os"\nfunc getEnv(k, d string) string { if v, ok := os.LookupEnv(k); ok { return v }; return d }\n',
      'package main\nimport o "os"\nfunc getenv(k string) string { return o.Getenv(k) }\n',
      'package main\nimport "syscall"\nfunc getenv(k string) (string, bool) { return syscall.Getenv(k) }\n',
      'package main\nimport "os"\nfunc getenv(k string) string { return os.ExpandEnv("$" + k) }\n',
      'package main\n// #include <stdlib.h>\nimport "C"\nfunc getenv(k string) string { return k }\n',
      'package main\nimport _ "unsafe"\n//go:linkname getenv os.Getenv\nfunc getenv(string) string\n',
    ]) {
      const root = project({
        "app/main.go":
          'package main\nfunc main() { _ = getenv("ADMIN_TOKEN"); _ = getEnv("ADMIN_TOKEN", "") }\n',
        "app/env.go": declaration,
      });
      expect(
        createShadowRowFilter(root)("app/main.go", [getenvRow, helperRow])
          .length,
      ).toBeGreaterThan(0);
    }
    // A helper calling another file's getter wrapper is followed too.
    const chain = project({
      "app/main.go":
        'package main\nfunc main() { _ = getenv("ADMIN_TOKEN") }\n',
      "app/a.go":
        "package main\nfunc getenv(k string) string { return inner(k) }\n",
      "app/b.go":
        'package main\nimport "os"\nfunc inner(k string) string { return os.Getenv(k) }\n',
    });
    expect(createShadowRowFilter(chain)("app/main.go", [getenvRow])).toEqual([
      getenvRow,
    ]);
    // A test file reads its package's test files too.
    const tests = project({
      "app/main_test.go":
        'package main\nfunc TestX() { _ = getenv("ADMIN_TOKEN") }\n',
      "app/env_test.go": 'package main\nimport "os"\nvar getenv = os.Getenv\n',
    });
    expect(
      createShadowRowFilter(tests)("app/main_test.go", [getenvRow]),
    ).toEqual([getenvRow]);
    expect(
      createShadowRowFilter(path.join(tmpdir(), "kibi-shadow-missing-root"))(
        "app/main.go",
        [getenvRow],
      ),
    ).toEqual([getenvRow]);
  });

  const MODULE = "github.com/bxcodec/go-clean-arch";
  const importing = (...paths: string[]) =>
    `package main\nimport (\n${paths.map((p) => `\t"${p}"`).join("\n")}\n)\nfunc main() {}\n`;
  /** The row the reader gives the import on line 3 (the first one). */
  const importRow = (name: string, spelled: string) => ({
    line: 3,
    text: `${name} may be a package of the project: "${spelled}"`.slice(0, 80),
  });

  it("keeps a Go import row when that project package, or one it imports, can read the environment", () => {
    const cases: [Record<string, string>, string][] = [
      // A helper wrapping os.Getenv, and a getter variable.
      [
        {
          "internal/config/config.go":
            'package config\nimport "os"\nfunc Get(k string) string { return os.Getenv(k) }\n',
        },
        `${MODULE}/internal/config`,
      ],
      [
        {
          "internal/config/config.go":
            'package config\nimport "os"\nvar Get = os.Getenv\n',
        },
        `${MODULE}/internal/config`,
      ],
      // A package-level value read at init.
      [
        {
          "internal/config/config.go":
            'package config\nimport "os"\nvar Token = os.Getenv("ADMIN_TOKEN")\n',
        },
        `${MODULE}/internal/config`,
      ],
      // Through another package of the project.
      [
        {
          "internal/config/config.go": `package config\nimport "${MODULE}/internal/env"\nfunc Get(k string) string { return env.Get(k) }\n`,
          "internal/env/env.go":
            'package env\nimport "syscall"\nfunc Get(k string) string { v, _ := syscall.Getenv(k); return v }\n',
        },
        `${MODULE}/internal/config`,
      ],
      // A local replace, and another module of the workspace.
      [
        {
          "go.mod": `module ${MODULE}\n\nreplace example.com/cfg v1.0.0 => ./third/cfg\n`,
          "third/cfg/cfg.go":
            'package cfg\nimport "os"\nfunc Get(k string) string { return os.Getenv(k) }\n',
        },
        "example.com/cfg",
      ],
      [
        {
          "lib/go.mod": "module example.com/lib\n",
          "lib/env/env.go":
            'package env\nimport "os"\nfunc Get(k string) string { return os.Getenv(k) }\n',
        },
        "example.com/lib/env",
      ],
      // A relative import.
      [
        {
          "app/config/config.go":
            'package config\nimport "os"\nfunc Get(k string) string { return os.Getenv(k) }\n',
        },
        "./config",
      ],
      // cgo in the imported package.
      [
        {
          "internal/c/c.go":
            'package c\n// #include <stdlib.h>\nimport "C"\nfunc Get() {}\n',
        },
        `${MODULE}/internal/c`,
      ],
    ];
    for (const [files, spelled] of cases) {
      const root = project({
        "go.mod": `module ${MODULE}\n`,
        "app/main.go": importing(spelled),
        ...files,
      });
      const row = importRow("config", spelled);
      expect(createShadowRowFilter(root)("app/main.go", [row])).toEqual([row]);
    }
    // GOPATH layout: no go.mod, the import is a folder under an ancestor.
    const gopath = project({
      "src/app/main.go": importing("app/config"),
      "src/app/config/config.go":
        'package config\nimport "os"\nvar Get = os.Getenv\n',
    });
    const row = importRow("config", "app/config");
    expect(createShadowRowFilter(gopath)("src/app/main.go", [row])).toEqual([
      row,
    ]);
    // The importing file cannot be read.
    expect(
      createShadowRowFilter(path.join(tmpdir(), "kibi-shadow-missing-root"))(
        "app/main.go",
        [row],
      ),
    ).toEqual([row]);
  });

  it("drops a Go import row for the standard library, a third-party package or a project package that cannot read the environment", () => {
    const root = project({
      "go.mod": `module ${MODULE}\n\nrequire github.com/sirupsen/logrus v1.9.0\n`,
      "app/main.go": importing(
        `${MODULE}/internal/rest`,
        "fmt",
        "github.com/sirupsen/logrus",
        `${MODULE}/internal/missing`,
        `${MODULE}/go.mod`,
      ),
      // Its test files are not compiled into the importer.
      "internal/rest/rest.go":
        'package rest\nimport "net/http"\nfunc New() *http.Server { return nil }\n',
      "internal/rest/rest_test.go":
        'package rest\nimport "os"\nvar _ = os.Getenv("T")\n',
      // A vendored or downloaded copy is not the project's.
      "vendor/github.com/sirupsen/logrus/env.go":
        'package logrus\nimport "os"\nvar _ = os.Getenv("L")\n',
    });
    const rows = [
      importRow("rest", `${MODULE}/internal/rest`),
      { line: 4, text: 'fmt may be a package of the project: "fmt"' },
      {
        line: 5,
        text: 'logrus may be a package of the project: "github.com/sirupsen/logrus"',
      },
      // No folder of the module holds such a package: it does not build.
      { line: 6, text: "missing may be a package of the project: ..." },
      { line: 7, text: "go.mod may be a package of the project: ..." },
    ];
    expect(createShadowRowFilter(root)("app/main.go", rows)).toEqual([]);
    // A row without a path on its line stays.
    const odd = { line: 1, text: "x may be a package of the project: x" };
    expect(createShadowRowFilter(root)("app/main.go", [odd])).toEqual([odd]);
  });

  it("keeps a Go package row when another file of the package imports a project package that reads the environment", () => {
    const root = project({
      "go.mod": `module ${MODULE}\n`,
      "app/main.go":
        'package main\nfunc main() { _ = getenv("ADMIN_TOKEN") }\n',
      "app/env.go": `package main\nimport "${MODULE}/internal/config"\nfunc getenv(k string) string { return config.Get(k) }\n`,
      "internal/config/config.go":
        'package config\nimport "os"\nfunc Get(k string) string { return os.Getenv(k) }\n',
    });
    expect(createShadowRowFilter(root)("app/main.go", [getenvRow])).toEqual([
      getenvRow,
    ]);
    // A string that names no package of the project is no such import.
    const strings = project({
      "go.mod": `module ${MODULE}\n`,
      "app/main.go":
        'package main\nfunc main() { _ = getenv("ADMIN_TOKEN") }\n',
      "app/env.go":
        'package main\nimport "os"\nfunc getenv(k string) string { b, _ := os.ReadFile("./data.json"); return k + string(b) + "../app" }\n',
    });
    expect(createShadowRowFilter(strings)("app/main.go", [getenvRow])).toEqual(
      [],
    );
  });

  const environmentRow = {
    line: 5,
    text: 'Environment may be a type of the project: Environment.GetEnvironmentVariable("U02")',
  };

  it("drops a C# row only when no file of the project declares that type or a global alias of it", () => {
    const root = project({
      "src/App/U02.cs":
        'namespace App.Shadow { class U02 { string E() => Environment.GetEnvironmentVariable("U02"); } }\n',
      "src/App/Notes.cs":
        'class Notes { string S = "Environment"; class EnvironmentX {} void M() => Environment.Exit(1); }\n',
      "src/App/readme.txt": "class Environment {}\n",
      "node_modules/x/Environment.cs": "class Environment {}\n",
    });
    expect(
      createShadowRowFilter(root)("src/App/U02.cs", [environmentRow, otherRow]),
    ).toEqual([otherRow]);
  });

  it("keeps a C# row when another file declares the type, a global alias, may spell it by an escape, or the project cannot be read", () => {
    for (const declaration of [
      "namespace App.Shadow { static class Environment { public static string GetEnvironmentVariable(string k) => k; } }\n",
      "public record struct Environment(int A);\n",
      "namespace App;\ninternal enum Environment { Dev }\n",
      "public delegate void Environment(int code);\n",
      "class @Environment {}\n",
      "class \\u0045nvironment {}\n",
      "global using Environment = Lib.FakeEnvironment;\n",
    ]) {
      const root = project({
        "src/App/U02.cs": "namespace App.Shadow { class U02 {} }\n",
        "obj/Generated/U01.cs": declaration,
      });
      expect(
        createShadowRowFilter(root)("src/App/U02.cs", [environmentRow]),
      ).toEqual([environmentRow]);
    }
    const missing = path.join(tmpdir(), "kibi-shadow-missing-root");
    expect(
      createShadowRowFilter(missing)("src/App/U02.cs", [environmentRow]),
    ).toEqual([environmentRow]);
  });

  it("drops a PHP namespace row only when no project file declares that function there", () => {
    const row = {
      line: 3,
      text: "getenv may be a function of namespace App\\Svc: getenv('X')",
    };
    const root = project({
      "src/a.php": "<?php\nnamespace App\\Svc;\ngetenv('X');\n",
      "src/b.php": "<?php\nnamespace Other;\nfunction getenv($n) {}\n",
      "vendor/x/c.php": "<?php\nnamespace App\\Svc;\nfunction getenv($n) {}\n",
    });
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([]);
    fs.writeFileSync(
      path.join(root, "src/d.php"),
      "<?php\nnamespace App \\ Svc {\n  function &GETENV($n) {}\n}\n",
    );
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([row]);
  });

  it("drops a C include row only when the header defines no macro the file uses", () => {
    const row = {
      line: 1,
      text: 'config.h may define macros or function pointers this file uses: #include "config.h"',
    };
    const root = project({
      "src/a.c": '#include "config.h"\nint main(void) { return run(); }\n',
      "src/config.h":
        '#ifndef CONFIG_H\n#define CONFIG_H\n#include <stdio.h>\n#include "inner.h"\nint run(void);\n#endif\n',
      "src/inner.h": "#define UNUSED 1\n",
    });
    expect(createShadowRowFilter(root)("src/a.c", [row])).toEqual([]);
    // A macro the file uses, a header not next to the file, or an include
    // Kibi cannot follow keeps the row.
    fs.writeFileSync(path.join(root, "src/inner.h"), "#define run system\n");
    expect(createShadowRowFilter(root)("src/a.c", [row])).toEqual([row]);
    fs.writeFileSync(path.join(root, "src/inner.h"), "#include CONFIGURED\n");
    expect(createShadowRowFilter(root)("src/a.c", [row])).toEqual([row]);
    fs.rmSync(path.join(root, "src/config.h"));
    expect(createShadowRowFilter(root)("src/a.c", [row])).toEqual([row]);
    expect(createShadowRowFilter(root)("src/missing.c", [row])).toEqual([row]);
  });

  it("reads C headers the way the preprocessor does", () => {
    const row = {
      line: 1,
      text: 'config.h may define macros or function pointers this file uses: #include "config.h"',
    };
    const uses = (header: string, more: Record<string, string> = {}) => {
      const root = project({
        "src/a.c": '#include "config.h"\nint main(void) { log_line("x"); return LIMIT; }\n',
        "src/config.h": header,
        ...more,
      });
      return createShadowRowFilter(root)("src/a.c", [row]).length === 1;
    };
    // A macro of numbers or strings renames nothing.
    expect(uses('#define LIMIT 10\n#define NAME "x"\n')).toBe(false);
    expect(uses("/* shims */ #define log_line(m) system(m)\n")).toBe(true);
    expect(uses("#/**/define log_line(m) system(m)\n")).toBe(true);
    expect(uses("#define \\\nlog_line(m) system(m)\n")).toBe(true);
    expect(uses("%:define log_line(m) system(m)\n")).toBe(true);
    expect(uses("extern int (*log_line)(const char *);\n")).toBe(true);
    expect(uses('#import "shims.h"\n', { "src/shims.h": "#define log_line(m) system(m)\n" })).toBe(true);
    expect(uses('#include_next "shims.h"\n', { "src/shims.h": "#define log_line(m) system(m)\n" })).toBe(true);
    expect(uses("#include <proj/shims.h>\n", { "include/proj/shims.h": "#define log_line(m) system(m)\n" })).toBe(true);
    expect(uses("#include <stdio.h>\n")).toBe(false);
    // `<...>` in the file itself reaches a project header too.
    const angled = { line: 1, text: "shims.h may define macros or function pointers this file uses: #include <shims.h>" };
    const root = project({
      "src/b.c": '#include <shims.h>\nvoid f(void) { log_line("x"); }\n',
      "inc/shims.h": "#define log_line(m) system(m)\n",
    });
    expect(createShadowRowFilter(root)("src/b.c", [angled])).toEqual([angled]);
    fs.writeFileSync(path.join(root, "inc/shims.h"), "#define OTHER 1\n");
    expect(createShadowRowFilter(root)("src/b.c", [angled])).toEqual([]);
  });

  it("keeps a Laravel Env row only when the project names the class", () => {
    const row = {
      line: 2,
      text: "Cache may be Illuminate\\Support\\Env or a class that extends it: Cache::get('k')",
    };
    const root = project({
      "src/a.php": "<?php\nCache::get('k');\n",
      "vendor/laravel/Env.php": "<?php\nnamespace Illuminate\\Support;\nclass Env {}\n",
    });
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([]);
    fs.writeFileSync(
      path.join(root, "src/helpers.inc"),
      "<?php\nuse Illuminate\\Support\\Env;\nclass Cache extends Env {}\n",
    );
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([row]);
  });

  it("finds a PHP function declared in an included file with comments in it", () => {
    const row = {
      line: 3,
      text: "exec may be a function of namespace Svc: exec('rm')",
    };
    const root = project({
      "src/a.php": "<?php\nnamespace Svc;\nexec('rm');\n",
      "lib/shim.inc": "<?php\nnamespace /* c */ Svc;\nfunction exec /* shim */ ($c) {}\n",
    });
    expect(createShadowRowFilter(root)("src/a.php", [row])).toEqual([row]);
  });
});
