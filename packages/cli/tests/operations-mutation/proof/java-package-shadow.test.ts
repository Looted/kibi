import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createShadowRowFilter,
  javaCode,
} from "../../../src/operations/proof/java-package-shadow.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A temporary folder with these files; a name ending in "/" is a folder. */
function project(files: Record<string, string>, base?: string): string {
  const root =
    base ?? realpathSync(mkdtempSync(path.join(os.tmpdir(), "kibi-shadow-")));
  if (base === undefined) roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    const absolute = path.join(root, file);
    if (file.endsWith("/")) {
      mkdirSync(absolute, { recursive: true });
      continue;
    }
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, text);
  }
  return root;
}

/** Whether the filter keeps a row of `file` with this text. */
function kept(root: string, file: string, text: string, line = 1): boolean {
  return createShadowRowFilter(root)(file, [{ line, text }]).length === 1;
}

const JAVA = (pkg: string) => `System may be a class of package ${pkg}: System.getenv`;
const GO_IMPORT = "config may be a package of the project: config.Get";
const GO_CALL = "helper may be a function of another file of the package: helper()";
const GO_NAME = "getenv may be declared in another file of the package: getenv()";
const RUST = "println may be a macro_rules! macro of the crate: println!()";
const CSHARP = "Environment may be a type of the project: Environment.GetEnvironmentVariable";
const ENV_GO = 'package env\nimport "os"\nfunc Get() string { return os.Getenv("X") }\n';
const PLAIN_GO = "package plain\nfunc Get() string { return \"\" }\n";

describe("row patterns", () => {
  test("match only at the start of a row", () => {
    const root = project({ "p/A.java": "package p;\n" });
    for (const text of [
      `x ${JAVA("p")}`,
      `x ${RUST}`,
      `x ${CSHARP}`,
      `x ${GO_NAME}`,
      `x ${GO_IMPORT}`,
      `x ${GO_CALL}`,
    ])
      expect([text, kept(root, "p/A.java", text)]).toStrictEqual([text, true]);
    expect(kept(root, "p/A.java", JAVA("p"))).toBe(false);
  });
});

describe("javaCode", () => {
  test("blanks comments and literals, also unterminated ones", () => {
    expect(javaCode("a // class System")).toBe("a  ");
    expect(javaCode("a /* class System")).toBe("a  ");
    expect(javaCode("/*/ class System */b")).toBe(" b");
    expect(javaCode('a "class System')).toBe('a ""');
    expect(javaCode("a 'x\\'y' b")).toBe("a '' b");
    expect(javaCode('a "x\\')).toBe('a ""');
    expect(javaCode('a """ text')).toBe('a ""');
  });
});

describe("Java rows", () => {
  test("a type hidden in an unterminated comment declares nothing", () => {
    for (const text of ["// class System", "/* class System", "/*/ class System */"]) {
      const root = project({ "p/A.java": "package p;\n", "p/B.java": text });
      expect([text, kept(root, "p/A.java", JAVA("p"))]).toStrictEqual([text, false]);
    }
  });

  test("an escape-spelled type may be any type", () => {
    const root = project({
      "p/A.java": "package p;\n",
      "p/B.java": "package p;\nclass \\u0053ystem {}\n",
    });
    expect(kept(root, "p/A.java", JAVA("p"))).toBe(true);
  });

  test("reads the declared package with its escapes and spacing", () => {
    for (const [declaration, pkg] of [
      ["package a\\uu0062;", "ab"],
      ["package  ab ;", "ab"],
      ["package a .\n b;", "a.b"],
    ] as const) {
      const root = project({
        "x/A.java": "package x;\n",
        "y/B.java": `${declaration}\nclass System {}\n`,
      });
      expect([declaration, kept(root, "x/A.java", JAVA(pkg))]).toStrictEqual([
        declaration,
        true,
      ]);
    }
  });

  test("an escaped backslash starts no escape", () => {
    const root = project({
      "x/A.java": "package x;\n",
      "y/B.java": "\\\\u0022 package b; \\\\u0022\nclass Foo {}\n",
    });
    expect(kept(root, "x/A.java", JAVA("b"))).toBe(true);
  });

  test("reads only .java files, and keeps the row when one is unreadable", () => {
    const notes = project({
      "x/A.java": "package x;\n",
      "y/notes.txt": "package b;\nclass System {}\n",
    });
    expect(kept(notes, "x/A.java", JAVA("b"))).toBe(false);
    const broken = project({ "x/A.java": "package x;\n" });
    symlinkSync(path.join(broken, "missing"), path.join(broken, "Bad.java"));
    expect(kept(broken, "x/A.java", JAVA("b"))).toBe(true);
  });
});

describe("C# rows", () => {
  test("a type declaration spelled with an escape may be any type", () => {
    const root = project({ "A.cs": "class X : \\u0042ase {}\n" });
    expect(kept(root, "A.cs", CSHARP)).toBe(true);
    expect(kept(project({ "A.cs": "class X : Base {}\n" }), "A.cs", CSHARP)).toBe(false);
  });
});

describe("Go import rows", () => {
  test("read raw-string imports", () => {
    const root = project({
      "go.mod": "module example.com/app\n",
      "main.go": "import cfg `example.com/app/plain`\n",
      "plain/a.go": PLAIN_GO,
    });
    expect(kept(root, "main.go", GO_IMPORT)).toBe(false);
  });

  test("a Go import row matches only at the start of a row", () => {
    const root = project({
      "go.mod": "module example.com/app\n",
      "main.go": 'import "example.com/app/plain"\n',
      "plain/a.go": PLAIN_GO,
    });
    expect(kept(root, "main.go", GO_IMPORT)).toBe(false);
    expect(kept(root, "main.go", `x ${GO_IMPORT}`)).toBe(true);
  });

  test("keep a row whose file cannot be read", () => {
    const root = project({ "x/": "" });
    expect(kept(root, "x/missing.go", GO_IMPORT)).toBe(true);
  });

  test("each file is read for its own row", () => {
    const root = project({
      "go.mod": "module example.com/app\n",
      "a.go": 'import "example.com/app/env"\n',
      "b.go": 'import "example.com/app/plain"\n',
      "env/a.go": ENV_GO,
      "plain/a.go": PLAIN_GO,
    });
    const filter = createShadowRowFilter(root);
    expect(filter("a.go", [{ line: 1, text: GO_IMPORT }])).toHaveLength(1);
    expect(filter("b.go", [{ line: 1, text: GO_IMPORT }])).toHaveLength(0);
  });

  test("a package reached once stays reached", () => {
    const root = project({
      "go.mod": "module example.com/app\n",
      "a.go": 'import "example.com/app/env"\n',
      "b.go": 'import "example.com/app/env"\n',
      "env/a.go": ENV_GO,
    });
    const filter = createShadowRowFilter(root);
    expect(filter("a.go", [{ line: 1, text: GO_IMPORT }])).toHaveLength(1);
    expect(filter("b.go", [{ line: 1, text: GO_IMPORT }])).toHaveLength(1);
  });

  test("reads the module path a go.mod declares", () => {
    for (const [goMod, reach] of [
      ["module example.com/app\n", true],
      ["  module example.com/app\n", true],
      ["module  example.com/app\n", true],
      ["xmodule example.com/evil\nmodule example.com/app\n", true],
      ["// module example.com/evil\nmodule example.com/app\n", true],
      ["module example.com/app// note\n", true],
    ] as const) {
      const root = project({
        "go.mod": goMod,
        "main.go": 'import "example.com/app/env"\n',
        "env/a.go": ENV_GO,
      });
      expect([goMod, kept(root, "main.go", GO_IMPORT)]).toStrictEqual([goMod, reach]);
    }
    const commented = project({
      "go.mod": "// module example.com/evil\nmodule example.com/app\n",
      "main.go": 'import "example.com/evil/x"\n',
      "x/a.go": ENV_GO,
    });
    expect(kept(commented, "main.go", GO_IMPORT)).toBe(false);
  });

  test("reads only go.mod files as module files", () => {
    const root = project({
      "go.mod": "module example.com/app\n",
      "docs/notes.txt": "module example.com/app/x\n",
      "docs/a.go": ENV_GO,
      "main.go": 'import "example.com/app/x"\n',
    });
    expect(kept(root, "main.go", GO_IMPORT)).toBe(false);
  });

  test("reads local replace directives", () => {
    for (const [goMod, reach] of [
      ["module m\nreplace example.com/lib => ./lib\n", true],
      ["module m\n  replace example.com/lib v1 => ./lib\n", true],
      ["module m\nreplace (\n\texample.com/lib v1.0.0 => ./lib\n)\n", true],
      ["module m\nreplace  example.com/lib => ./lib\n", true],
      ["module m\nreplace example.com/lib  v1 => ./lib\n", true],
      ["module m\nreplace example.com/lib=>./lib\n", true],
      ["module m\nreplace example.com/lib =>  ./lib\n", true],
      ["module m\nrequire example.com/lib v1.0.0 => ./lib\n", false],
      ["replace example.com/lib => ./lib\n", true],
    ] as const) {
      const root = project({
        "go.mod": goMod,
        "main.go": 'import "example.com/lib"\n',
        "lib/a.go": ENV_GO,
      });
      expect([goMod, kept(root, "main.go", GO_IMPORT)]).toStrictEqual([goMod, reach]);
    }
  });

  test("a go.mod without a module path still lists its replaces", () => {
    const root = project({
      "go.mod": "replace example.com/lib => ./lib\n",
      "main.go": 'import "example.com/lib"\n',
      "lib/a.go": PLAIN_GO,
    });
    expect(kept(root, "main.go", GO_IMPORT)).toBe(false);
  });

  test("an import spelled like a placeholder module is no module", () => {
    const root = project({
      "go.mod": "module example.com/app\n",
      "main.go": 'import "undefined/x"\n',
    });
    expect(kept(root, "main.go", GO_IMPORT)).toBe(false);
  });

  test("the longest matching module wins, the first of equals", () => {
    for (const goMod of [
      "module example.com/app\nreplace example.com/app/sub => ./other\n",
      "module example.com/zzz\nreplace example.com/app/sub => ./other\nreplace example.com/app => ./base\n",
      "module example.com/zzz\nreplace example.com/app/sub => ./other\nreplace example.com/app/sub => ./base/sub\n",
    ]) {
      const root = project({
        "go.mod": goMod,
        "main.go": 'import "example.com/app/sub/env"\n',
        "other/env/a.go": ENV_GO,
        "base/sub/env/a.go": PLAIN_GO,
        "sub/env/a.go": PLAIN_GO,
      });
      expect([goMod, kept(root, "main.go", GO_IMPORT)]).toStrictEqual([goMod, true]);
    }
  });

  test("an import outside every module is not the project's", () => {
    const root = project({
      "go.mod": "module a.b\n",
      "main.go": 'import "zzzenv"\n',
      "env/a.go": ENV_GO,
    });
    expect(kept(root, "main.go", GO_IMPORT)).toBe(false);
  });

  test("relative imports resolve from the importing folder", () => {
    const parent = project({
      "go.mod": "module m\n",
      "a.go": ENV_GO,
      "sub/main.go": 'import ".."\n',
    });
    expect(kept(parent, "sub/main.go", GO_IMPORT)).toBe(true);
    const dotted = project({
      "go.mod": "module m\n",
      "main.go": 'import "a./b"\n',
      "a./b/x.go": ENV_GO,
    });
    expect(kept(dotted, "main.go", GO_IMPORT)).toBe(false);
  });

  test("the module list is read once per filter", () => {
    const root = project({
      "go.mod": "module example.com/app\n",
      "a.go": 'import "example.com/app/env"\n',
      "b.go": 'import "example.com/other/env"\n',
      "env/a.go": ENV_GO,
    });
    const filter = createShadowRowFilter(root);
    expect(filter("a.go", [{ line: 1, text: GO_IMPORT }])).toHaveLength(1);
    writeFileSync(path.join(root, "go.mod"), "module example.com/other\n");
    expect(filter("b.go", [{ line: 1, text: GO_IMPORT }])).toHaveLength(0);
  });

  test("module mode needs a go.mod within the workspace", () => {
    const parent = project({ "go.mod": "module outer\n" });
    const root = project({ "ws/main.go": 'import "lib"\n', "ws/lib/a.go": ENV_GO }, parent);
    expect(kept(path.join(root, "ws"), "main.go", GO_IMPORT)).toBe(true);
  });

  test("GOPATH lookups stay within the workspace", () => {
    const parent = project({ "lib/a.go": ENV_GO, "ws/main.go": 'import "lib"\n' });
    expect(kept(path.join(parent, "ws"), "main.go", GO_IMPORT)).toBe(false);
  });

  test("a file outside the workspace walks up to the filesystem root", () => {
    const parent = project({ "ws/": "", "o/a.go": 'import "nothing/here"\n' });
    expect(kept(path.join(parent, "ws"), "../o/a.go", GO_IMPORT)).toBe(false);
    const rust = project({ "ws/": "", "o/a.rs": "fn main() {}\n" });
    expect(kept(path.join(rust, "ws"), "../o/a.rs", RUST)).toBe(false);
  });

  test("a package that reads only through a cycle reads nothing", () => {
    const root = project({
      "go.mod": "module m\n",
      "main.go": 'import "m/a"\n',
      "a/a.go": 'package a\nimport "m/b"\n',
      "b/b.go": 'package b\nimport "m/a"\n',
    });
    expect(kept(root, "main.go", GO_IMPORT)).toBe(false);
  });

  test("a package reads the environment through any of its Go files", () => {
    const notGo = project({
      "go.mod": "module m\n",
      "main.go": 'import "m/p"\n',
      "p/a.go": PLAIN_GO,
      "p/notes.txt": "Getenv",
    });
    expect(kept(notGo, "main.go", GO_IMPORT)).toBe(false);
    const one = project({
      "go.mod": "module m\n",
      "main.go": 'import "m/p"\n',
      "p/a.go": PLAIN_GO,
      "p/b.go": ENV_GO,
    });
    expect(kept(one, "main.go", GO_IMPORT)).toBe(true);
  });

  test("an unreadable package may read the environment", () => {
    const root = project({
      "go.mod": "module m\n",
      "main.go": 'import "m/p"\n',
      "p/a.go/": "",
    });
    expect(kept(root, "main.go", GO_IMPORT)).toBe(true);
  });

  test("an import of the file's own package reads nothing new", () => {
    const root = project({
      "go.mod": "module m\n",
      "main.go": 'import "."\n',
      "other.go": ENV_GO,
    });
    expect(kept(root, "main.go", GO_IMPORT)).toBe(false);
  });
});

describe("Go call rows", () => {
  test("the file's own variables do not count", () => {
    const root = project({ "main.go": "package main\nvar helper = run\n" });
    expect(kept(root, "main.go", GO_CALL)).toBe(false);
  });

  test("a variable declared on a later line of a block counts", () => {
    const root = project({
      "main.go": "package main\n",
      "vars.go": "package main\nvar (\n\thelper func()\n)\n",
    });
    expect(kept(root, "main.go", GO_CALL)).toBe(true);
  });

  test("any other file may bind the name", () => {
    const root = project({
      "main.go": "package main\n",
      "a.go": "package main\n",
      "b.go": "package main\nvar helper = run\n",
    });
    expect(kept(root, "main.go", GO_CALL)).toBe(true);
  });

  test("each file lists its own package", () => {
    const root = project({
      "x/main.go": "package main\n",
      "x/vars.go": "package main\nvar helper = run\n",
      "y/main.go": "package main\n",
    });
    for (const text of [GO_CALL, GO_NAME]) {
      const filter = createShadowRowFilter(root);
      expect(filter("x/main.go", [{ line: 1, text }])).toHaveLength(
        text === GO_CALL ? 1 : 0,
      );
      expect(filter("y/main.go", [{ line: 1, text }])).toHaveLength(0);
    }
  });
});

describe("Rust rows", () => {
  test("the crate root is the nearest folder holding a Cargo.toml file", () => {
    const root = project({
      "macros.rs": "macro_rules! println { () => {} }\n",
      "sub/Cargo.toml/": "",
      "sub/main.rs": "fn main() {}\n",
    });
    expect(kept(root, "sub/main.rs", RUST)).toBe(true);
  });

  test("the crate root stays within the workspace", () => {
    const parent = project({
      "Cargo.toml": "[package]\n",
      "macros.rs": "macro_rules! println { () => {} }\n",
      "ws/main.rs": "fn main() {}\n",
    });
    expect(kept(path.join(parent, "ws"), "main.rs", RUST)).toBe(false);
  });
});

describe("Go name rows", () => {
  test("each file reads the package's other files", () => {
    const root = project({
      "a.go": `package p\nimport "os"\nfunc getenv() string { return os.Getenv("X") }\n`,
      "b.go": "package p\n",
    });
    const filter = createShadowRowFilter(root);
    expect(filter("a.go", [{ line: 1, text: GO_NAME }])).toHaveLength(0);
    expect(filter("b.go", [{ line: 1, text: GO_NAME }])).toHaveLength(1);
  });
});
