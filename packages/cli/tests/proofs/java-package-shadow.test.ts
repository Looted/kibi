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
    expect(filter("src/e4/A.java", [systemRow, runtimeRow])).toEqual([
      runtimeRow,
    ]);
    expect(filter("src/e5/A.java", [systemRow])).toEqual([systemRow]);
    expect(filter("src/missing/A.java", [systemRow])).toEqual([systemRow]);
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
