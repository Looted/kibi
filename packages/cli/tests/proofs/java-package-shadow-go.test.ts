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
  const root = fs.mkdtempSync(path.join(tmpdir(), "kibi-shadow-go-"));
  roots.push(root);
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

const callRow = {
  line: 2,
  text: 'helper may be a function of another file of the package: helper("ADMIN_TOKEN")',
};
const MAIN = 'package main\nfunc main() { _ = helper("ADMIN_TOKEN") }\n';

describe("Go call rows: a name another file of the package may bind", () => {
  it("keeps the row when another file holds a variable of that name", () => {
    for (const declaration of [
      "var helper = os.Getenv\n",
      "var (\n\thelper = os.Getenv\n)\n",
      "func init() { helper, other = os.Getenv, 1 }\n",
      "func init() { helper := os.Getenv; _ = helper }\n",
    ]) {
      const root = project({
        "app/main.go": MAIN,
        "app/env.go": `package main\nimport "os"\n${declaration}`,
      });
      expect(createShadowRowFilter(root)("app/main.go", [callRow])).toEqual([
        callRow,
      ]);
    }
  });

  it("drops the row when another file only declares the function", () => {
    const root = project({
      "app/main.go": MAIN,
      "app/helper.go":
        'package main\n// var helper = os.Getenv\nfunc helper(k string) string { return "x" + k }\n',
      "app/helper_test.go":
        'package main\nvar helper = func(string) string { return "" }\n',
      "app/notes.txt": "var helper = os.Getenv\n",
    });
    expect(createShadowRowFilter(root)("app/main.go", [callRow])).toEqual([]);
  });

  it("reads the test files of the package for a test file", () => {
    const root = project({
      "app/main_test.go": MAIN,
      "app/stub_test.go": "package main\nvar helper = os.Getenv\n",
    });
    expect(createShadowRowFilter(root)("app/main_test.go", [callRow])).toEqual([
      callRow,
    ]);
  });

  it("keeps the row when the package folder cannot be read", () => {
    expect(
      createShadowRowFilter(path.join(tmpdir(), "kibi-shadow-go-missing"))(
        "app/main.go",
        [callRow],
      ),
    ).toEqual([callRow]);
  });
});

describe("Go import rows when the project's go.mod files cannot be read", () => {
  it("keeps every import row", () => {
    const root = project({
      "go.mod": "module example.com/app\n",
      "app/main.go": 'package main\nimport (\n\t"fmt"\n)\nfunc main() {}\n',
    });
    // A go.mod that cannot be read: a link to nothing.
    fs.mkdirSync(path.join(root, "broken"));
    fs.symlinkSync(
      path.join(root, "nowhere", "go.mod"),
      path.join(root, "broken", "go.mod"),
    );
    const row = { line: 3, text: 'fmt may be a package of the project: "fmt"' };
    expect(createShadowRowFilter(root)("app/main.go", [row])).toEqual([row]);
  });
});
