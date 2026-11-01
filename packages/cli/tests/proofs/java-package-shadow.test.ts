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
});
