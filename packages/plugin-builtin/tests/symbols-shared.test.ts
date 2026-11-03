import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Scope, ScriptKind, SyntaxKind } from "ts-morph";
import { collectGranularityCandidates } from "../src/symbols/ts-morph-granularity.js";
import { tsMorph } from "../src/symbols/ts-morph-runtime.js";
import {
  SUPPORTED_SOURCE_EXTENSIONS,
  chooseScriptKind,
  formatMethodSymbolName,
  isPrivateClassMember,
  onlyCandidate,
} from "../src/symbols/ts-morph-shared.js";
import { resolveWorkspaceSourceAbsolute } from "../src/symbols/workspace-path.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function tempRoot(): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "kibi-sym-ws-")));
  roots.push(root);
  return root;
}

describe("ts-morph shared helpers", () => {
  test("supported source extensions are exactly the JS and TS family", () => {
    expect([...SUPPORTED_SOURCE_EXTENSIONS]).toStrictEqual([
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mts",
      ".cts",
      ".mjs",
      ".cjs",
    ]);
  });

  test("the runtime loader returns one cached ts-morph module", () => {
    expect(tsMorph()).toBe(tsMorph());
    expect(tsMorph().SyntaxKind.ClassExpression).toBe(
      SyntaxKind.ClassExpression,
    );
  });

  test("chooseScriptKind maps each extension case-insensitively", () => {
    const cases: Array<[string, ScriptKind]> = [
      ["a.tsx", ScriptKind.TSX],
      ["A.TSX", ScriptKind.TSX],
      ["a.ts", ScriptKind.TS],
      ["A.TS", ScriptKind.TS],
      ["a.mts", ScriptKind.TS],
      ["a.cts", ScriptKind.TS],
      ["a.jsx", ScriptKind.JSX],
      ["A.JSX", ScriptKind.JSX],
      ["a.js", ScriptKind.JS],
      ["a.mjs", ScriptKind.JS],
      ["a.cjs", ScriptKind.JS],
      ["a.vue", ScriptKind.JS],
      [".tsx.js", ScriptKind.JS],
      [".ts.js", ScriptKind.JS],
      [".mts.js", ScriptKind.JS],
      [".cts.js", ScriptKind.JS],
      [".jsx.js", ScriptKind.JS],
    ];
    for (const [file, kind] of cases) {
      expect([file, chooseScriptKind(file)]).toStrictEqual([file, kind]);
    }
  });

  test("formatMethodSymbolName qualifies only with a class name", () => {
    expect(formatMethodSymbolName("Box", "run")).toBe("Box.run");
    expect(formatMethodSymbolName(undefined, "run")).toBe("run");
    expect(formatMethodSymbolName("", "run")).toBe("run");
  });

  test("isPrivateClassMember checks the name, then modifiers, then scope", () => {
    expect(isPrivateClassMember({ getName: () => "#secret" })).toBe(true);
    expect(
      isPrivateClassMember({
        getName: () => "#secret",
        hasModifier: () => false,
      }),
    ).toBe(true);
    const seen: SyntaxKind[] = [];
    expect(
      isPrivateClassMember({
        getName: () => "open",
        hasModifier: (kind) => {
          seen.push(kind);
          return kind === SyntaxKind.PrivateKeyword;
        },
        getScope: () => Scope.Public,
      }),
    ).toBe(true);
    expect(seen).toStrictEqual([SyntaxKind.PrivateKeyword]);
    expect(
      isPrivateClassMember({
        getName: () => "open",
        hasModifier: () => false,
        getScope: () => Scope.Private,
      }),
    ).toBe(false);
    expect(
      isPrivateClassMember({ getName: () => "x", getScope: () => "private" }),
    ).toBe(true);
    expect(
      isPrivateClassMember({ getName: () => "x", getScope: () => "public" }),
    ).toBe(false);
    expect(isPrivateClassMember({ getScope: () => Scope.Private })).toBe(true);
    expect(isPrivateClassMember({ getName: () => "x" })).toBe(false);
    expect(isPrivateClassMember({})).toBe(false);
  });

  test("onlyCandidate returns the single candidate only", () => {
    expect(onlyCandidate([])).toBeUndefined();
    expect(onlyCandidate(["one"])).toBe("one");
    expect(onlyCandidate(["one", "two"])).toBeUndefined();
  });
});

describe("collectGranularityCandidates", () => {
  test("collects exported declarations and public members, sorted by name", () => {
    const content = [
      "export function zeta() {}",
      "function hidden() {}",
      "export default function () {}",
      "export class Box {",
      "  run() {}",
      "  shared() {}",
      "  private hide() {}",
      "  #secret() {}",
      "  size = 1;",
      "  private weight = 2;",
      "  get label() { return 1; }",
      "  set label(value) {}",
      "  private get code() { return 1; }",
      "}",
      "export class Crate { shared() {} }",
      "class Internal { solo() {} visible = 1; get tag() { return 1; } }",
      "export interface Shape { id: string }",
      "interface InternalShape { id: string }",
      "export type Alias = string;",
      "type InternalAlias = string;",
      "export enum Color { Red }",
      "enum InternalColor { Blue }",
      "export const alpha = 1, beta = 2;",
      "const gamma = 3;",
    ].join("\n");
    expect(collectGranularityCandidates("src/box.ts", content)).toStrictEqual([
      { name: "Alias", kind: "type" },
      { name: "alpha", kind: "variable" },
      { name: "beta", kind: "variable" },
      { name: "Box", kind: "class" },
      { name: "Box.label", kind: "accessor" },
      { name: "Box.label", kind: "accessor" },
      { name: "Box.run", kind: "method" },
      { name: "Box.shared", kind: "method" },
      { name: "Box.size", kind: "property" },
      { name: "Color", kind: "enum" },
      { name: "Crate", kind: "class" },
      { name: "Crate.shared", kind: "method" },
      { name: "run", kind: "method" },
      { name: "Shape", kind: "interface" },
      { name: "zeta", kind: "function" },
    ]);
  });

  test("an anonymous default class contributes only its bare unique methods", () => {
    const content = [
      "export default class {",
      "  run() {}",
      "  size = 1;",
      "  get label() { return 1; }",
      "}",
    ].join("\n");
    expect(collectGranularityCandidates("src/anon.ts", content)).toStrictEqual([
      { name: "run", kind: "method" },
    ]);
  });

  test("parses with the script kind of the file extension", () => {
    // A generic arrow parses as TypeScript in .ts and as JSX elsewhere; the
    // JSX parse swallows the following declaration.
    const content =
      "export const el = <T>(x) => x;\nexport function after() {}\n";
    expect(collectGranularityCandidates("src/a.ts", content)).toStrictEqual([
      { name: "after", kind: "function" },
      { name: "el", kind: "variable" },
    ]);
    for (const file of ["src/a.tsx", "src/a.jsx", "src/a.js", "src/a.vue"]) {
      expect(collectGranularityCandidates(file, content)).toStrictEqual([
        { name: "el", kind: "variable" },
      ]);
    }
  });

  test("ignores a file of the same path on disk", () => {
    const root = tempRoot();
    const file = path.join(root, "a.ts");
    // The in-memory file path carries a suffix; a file there must not win.
    writeFileSync(`${file}::granularity`, "export const disk = 1;\n");
    writeFileSync(file, "export const disk = 1;\n");
    expect(
      collectGranularityCandidates(file, "export const only = 1;"),
    ).toStrictEqual([{ name: "only", kind: "variable" }]);
  });
});

describe("resolveWorkspaceSourceAbsolute", () => {
  test("rejects empty and whitespace-only source paths", () => {
    const root = tempRoot();
    expect(resolveWorkspaceSourceAbsolute(root, "")).toBeNull();
    expect(resolveWorkspaceSourceAbsolute(root, "   ")).toBeNull();
  });

  test("resolves relative paths, normalizing separators and trailing slashes", () => {
    const root = tempRoot();
    expect(resolveWorkspaceSourceAbsolute(root, "src/a.ts")).toBe(
      path.join(root, "src", "a.ts"),
    );
    expect(resolveWorkspaceSourceAbsolute(root, "src\\a.ts")).toBe(
      path.join(root, "src", "a.ts"),
    );
    expect(resolveWorkspaceSourceAbsolute(root, "src//b/../a.ts")).toBe(
      path.join(root, "src", "a.ts"),
    );
    expect(resolveWorkspaceSourceAbsolute(root, "src/")).toBe(
      path.join(root, "src"),
    );
    expect(resolveWorkspaceSourceAbsolute(root, "src/a:/b.ts")).toBe(
      path.join(root, "src", "a:", "b.ts"),
    );
    expect(resolveWorkspaceSourceAbsolute(root, "..config.ts")).toBe(
      path.join(root, "..config.ts"),
    );
  });

  test("rejects the root itself and paths that escape it", () => {
    const root = tempRoot();
    for (const source of [
      ".",
      "./",
      "src/..",
      "..",
      "../",
      "../x.ts",
      "src/../../x.ts",
      "src/../..",
      root,
      `${root}/`,
      path.dirname(root),
      path.join(path.dirname(root), "x.ts"),
    ]) {
      expect([source, resolveWorkspaceSourceAbsolute(root, source)]).toEqual([
        source,
        null,
      ]);
    }
  });

  test("rejects parent paths even when the root does not exist", () => {
    const missingRoot = path.join(tempRoot(), "missing", "root");
    expect(resolveWorkspaceSourceAbsolute(missingRoot, "..")).toBeNull();
    expect(resolveWorkspaceSourceAbsolute(missingRoot, "../x.ts")).toBeNull();
    expect(resolveWorkspaceSourceAbsolute(missingRoot, "src/a.ts")).toBe(
      path.join(missingRoot, "src", "a.ts"),
    );
  });

  test("maps absolute paths inside the root to the root-relative file", () => {
    const root = tempRoot();
    expect(
      resolveWorkspaceSourceAbsolute(root, path.join(root, "src", "a.ts")),
    ).toBe(path.join(root, "src", "a.ts"));
    // A backslash is a file-name character on POSIX, but the root-relative
    // remainder is still normalized to forward slashes.
    expect(resolveWorkspaceSourceAbsolute(root, `${root}/src\\a.ts`)).toBe(
      path.join(root, "src", "a.ts"),
    );
  });

  test("rejects foreign absolute paths on POSIX", () => {
    const root = tempRoot();
    const cwd = process.cwd();
    process.chdir(root);
    try {
      for (const source of [
        "C:/repo/a.ts",
        "c:\\repo\\a.ts",
        "//server/share/a.ts",
        "\\\\server\\share\\a.ts",
      ]) {
        expect([source, resolveWorkspaceSourceAbsolute(root, source)]).toEqual([
          source,
          null,
        ]);
      }
    } finally {
      process.chdir(cwd);
    }
    expect(resolveWorkspaceSourceAbsolute("/", "//server/share/a.ts")).toBe(
      null,
    );
  });

  test("follows symlinks only while they stay inside the root", () => {
    const root = tempRoot();
    const outside = tempRoot();
    mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "src", "real.ts"), "export {};\n");
    writeFileSync(path.join(outside, "secret.ts"), "export {};\n");
    symlinkSync(
      path.join(root, "src", "real.ts"),
      path.join(root, "src", "alias.ts"),
    );
    symlinkSync(
      path.join(outside, "secret.ts"),
      path.join(root, "src", "leak.ts"),
    );
    symlinkSync(path.dirname(root), path.join(root, "up"));
    symlinkSync(path.join(root, "src"), path.join(root, "..src-link"));
    expect(resolveWorkspaceSourceAbsolute(root, "src/alias.ts")).toBe(
      path.join(root, "src", "real.ts"),
    );
    expect(resolveWorkspaceSourceAbsolute(root, "..src-link/real.ts")).toBe(
      path.join(root, "src", "real.ts"),
    );
    // Names that only start with two dots stay inside the root.
    writeFileSync(path.join(root, "..config.ts"), "export {};\n");
    expect(resolveWorkspaceSourceAbsolute(root, "..config.ts")).toBe(
      path.join(root, "..config.ts"),
    );
    expect(resolveWorkspaceSourceAbsolute(root, "src/leak.ts")).toBeNull();
    expect(resolveWorkspaceSourceAbsolute(root, "up")).toBeNull();
    // A root given through a symlink is compared by its real path.
    const linkedRoot = path.join(outside, "linked-root");
    symlinkSync(root, linkedRoot);
    expect(resolveWorkspaceSourceAbsolute(linkedRoot, "src/alias.ts")).toBe(
      path.join(root, "src", "real.ts"),
    );
  });
});
