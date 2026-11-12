import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { extractScriptReferences } from "../../src/operations/proof/source-code-readers.js";
import {
  type SourceSpec,
  matchWorkspaceFiles,
} from "../../src/public/proof-sources.js";

function extract(extractKind: string, text: string) {
  return extractScriptReferences(ts, "src/file.ts", text, {
    reader: "references",
    extract: extractKind,
  } as unknown as SourceSpec);
}

describe("script references: import-equals declarations", () => {
  test("a module bound by import = require() is followed for calls", () => {
    const result = extract(
      "calls",
      'import cp = require("node:child_process");\ncp.execSync("ls");\n',
    );
    expect(result.members).toContain("child_process.execSync");
    expect(result.unresolved).toEqual([]);
  });

  test("an import = require() with a non-literal module binds nothing", () => {
    const result = extract(
      "calls",
      "import cp = require(name);\ncp.execSync('ls');\n",
    );
    expect(result.members).not.toContain("child_process.execSync");
  });

  test("the imports extract lists both spellings of an import = require()", () => {
    const result = extract("imports", 'import fs = require("node:fs");\n');
    expect(result.members).toEqual(["node:fs", "fs"]);
  });

  test("the imports extract skips an import = require() of a non-literal", () => {
    expect(extract("imports", "import fs = require(name);\n").members).toEqual(
      [],
    );
  });
});

describe("script references: shadowed globals", () => {
  test("a destructured parameter named process is not the global", () => {
    const result = extract(
      "env",
      "function f({ process }: { process: unknown }) { send(process); }\nfunction g([, process]: unknown[]) { send(process); }\n",
    );
    expect(result.unresolved).toEqual([]);
  });

  test("a local declared without a value shadows the global", () => {
    const result = extract("env", "let process;\nsend(process);\n");
    expect(result.unresolved).toEqual([]);
  });

  test("a function or class of the same name shadows the global", () => {
    expect(
      extract("env", "function process() {}\nsend(process);\n").unresolved,
    ).toEqual([]);
    expect(
      extract("env", "class globalThis {}\nsend(globalThis);\n").unresolved,
    ).toEqual([]);
  });

  test("the global handed on is unresolved", () => {
    expect(extract("env", "send(process);\n").unresolved).toHaveLength(1);
  });

  test("a local whose value binds no name shadows the global", () => {
    const result = extract(
      "env",
      "function f() {\n  const window = pick();\n  if (!window) return;\n  send(window);\n}\n",
    );
    expect(result.unresolved).toEqual([]);
  });

  test("a local bound to the global object still reads through it", () => {
    const result = extract("env", "const g = globalThis;\nsend(g);\n");
    expect(result.unresolved).toHaveLength(1);
  });

  test("typeof a global or the environment hands nothing on", () => {
    const result = extract(
      "env",
      "if (typeof window === 'undefined') {}\nconst t = typeof globalThis;\nconst e = typeof process.env;\nconst p = typeof (window as unknown);\n",
    );
    expect(result.unresolved).toEqual([]);
  });

  test("a literal key tested with in on the global object hands nothing on", () => {
    const result = extract(
      "env",
      "const ok = 'Notification' in window && 'PushManager' in globalThis;\n",
    );
    expect(result.unresolved).toEqual([]);
  });

  test("in on the global object with process, Bun or a computed key is unresolved", () => {
    expect(
      extract("env", "const a = 'process' in window;\n").unresolved,
    ).toHaveLength(1);
    expect(
      extract("env", "const b = 'Bun' in globalThis;\n").unresolved,
    ).toHaveLength(1);
    expect(extract("env", "const c = key in self;\n").unresolved).toHaveLength(
      1,
    );
  });

  test("in on the environment object itself stays unresolved", () => {
    expect(
      extract("env", "const a = 'HOME' in process.env;\n").unresolved,
    ).toHaveLength(1);
  });

  test("a type position is not a read", () => {
    const result = extract(
      "env",
      "let p: typeof process.env;\nlet q: Array<typeof globalThis>;\n",
    );
    expect(result.unresolved).toEqual([]);
  });
});

describe("script references: modules loaded in place", () => {
  test("process loaded in place and handed on reads unknown variables", () => {
    const result = extract("env", 'send(require("node:process"));\n');
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0]?.text).toBe('require("node:process")');
  });

  test("a module loaded from a computed name is unresolved", () => {
    const result = extract("calls", "send(require(name));\n");
    expect(result.unresolved.map((entry) => entry.text)).toEqual([
      "require(name)",
    ]);
  });

  test("a built-in module handed on may have any member called", () => {
    expect(extract("calls", 'send(require("fs"));\n').members).toContain(
      "fs.*",
    );
  });

  test("a third-party module handed on is not listed", () => {
    const result = extract("calls", 'send(require("left-pad"));\n');
    expect(
      result.members.filter((name) => name.startsWith("left-pad")),
    ).toEqual([]);
    expect(result.unresolved).toEqual([]);
  });

  test("a member of a module loaded in place is called directly", () => {
    expect(
      extract("calls", 'require("fs").readFileSync("x");\n').members,
    ).toContain("fs.readFileSync");
  });
});

describe("script references: destructured environment", () => {
  test("an array pattern over the environment reads any variable", () => {
    const result = extract("env", "const [first] = process.env;\n");
    expect(result.unresolved.map((entry) => entry.text)).toEqual(["[first]"]);
  });

  test("an object pattern over the environment lists its keys", () => {
    expect(extract("env", "const { PORT } = process.env;\n").members).toEqual([
      "PORT",
    ]);
  });
});

describe("workspace file matching", () => {
  test("a link to a file is that file; a dangling link or a folder link is not", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-match-files-"));
    try {
      mkdirSync(path.join(root, "src", "nested"), { recursive: true });
      writeFileSync(path.join(root, "src", "a.ts"), "export {};\n");
      symlinkSync(
        path.join(root, "src", "a.ts"),
        path.join(root, "src", "linked.ts"),
      );
      symlinkSync(
        path.join(root, "src", "gone.ts"),
        path.join(root, "src", "dangling.ts"),
      );
      symlinkSync(
        path.join(root, "src", "nested"),
        path.join(root, "src", "folder.ts"),
      );
      expect(matchWorkspaceFiles(root, ["src/*.ts"])).toEqual([
        "src/a.ts",
        "src/linked.ts",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
