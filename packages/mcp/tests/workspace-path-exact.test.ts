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

import {
  normalizeRepoRelativePath,
  resolveWorkspaceSourceAbsolute,
} from "../src/workspace-path.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function temp(prefix: string): string {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), prefix)));
  dirs.push(dir);
  return dir;
}

describe("normalizeRepoRelativePath on POSIX", () => {
  const cases: Array<[string, string | null]> = [
    ["", null],
    ["   ", null],
    ["a\\b.ts", "a/b.ts"],
    ["src/", "src"],
    ["src//", "src"],
    ["./src/./a.ts", "src/a.ts"],
    ["a//", "a"],
    ["a/..", null],
    [".", null],
    ["..", null],
    ["../x", null],
    ["a/../../x", null],
    ["..foo/x", "..foo/x"],
    ["/ws/src/a.ts", "src/a.ts"],
    // The original text is resolved, so POSIX reads backslashes literally.
    ["\\ws\\src\\a.ts", null],
    ["/ws", null],
    ["/ws/", null],
    ["/other/x", null],
    ["C:/x", null],
    ["c:\\x", null],
    ["xC:/x", "xC:/x"],
    ["1:/x", "1:/x"],
    ["//ws/x", null],
  ];
  for (const [candidate, expected] of cases) {
    test(`${JSON.stringify(candidate)} -> ${JSON.stringify(expected)}`, () => {
      expect(normalizeRepoRelativePath("/ws", candidate)).toBe(expected);
    });
  }

  test("a UNC path is refused even when it resolves inside the root", () => {
    expect(normalizeRepoRelativePath("/server", "//server/x")).toBeNull();
    expect(normalizeRepoRelativePath("/server", "/server/x")).toBe("x");
  });

  test("the root is resolved before it is compared", () => {
    expect(normalizeRepoRelativePath("/ws/sub/..", "/ws/a")).toBe("a");
  });
});

describe("normalizeRepoRelativePath on Windows", () => {
  const win = path.win32;
  const cases: Array<[string, string | null]> = [
    ["C:\\ws\\src\\a.ts", "src/a.ts"],
    ["c:/ws/src/a.ts", "src/a.ts"],
    ["C:\\ws", null],
    ["D:\\x", null],
    ["C:\\other\\x", null],
    ["\\\\server\\share\\x", null],
    ["src\\a.ts", "src/a.ts"],
  ];
  for (const [candidate, expected] of cases) {
    test(`${JSON.stringify(candidate)} -> ${JSON.stringify(expected)}`, () => {
      expect(normalizeRepoRelativePath("C:\\ws", candidate, win)).toBe(
        expected,
      );
    });
  }
});

describe("resolveWorkspaceSourceAbsolute", () => {
  test("a symlink out of the workspace is refused", () => {
    const root = temp("kibi-mcp-wsx-");
    const outside = temp("kibi-mcp-outx-");
    writeFileSync(path.join(outside, "secret.ts"), "x");
    symlinkSync(path.join(outside, "secret.ts"), path.join(root, "link.ts"));
    mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "src", "a.ts"), "a");
    symlinkSync(path.join(root, "src", "a.ts"), path.join(root, "inner.ts"));
    expect(resolveWorkspaceSourceAbsolute(root, "link.ts")).toBeNull();
    expect(resolveWorkspaceSourceAbsolute(root, "inner.ts")).toBe(
      path.join(root, "src", "a.ts"),
    );
  });

  test("a symlink to a folder named like a parent is refused", () => {
    const root = temp("kibi-mcp-wsy-");
    const outside = temp("kibi-mcp-outy-");
    mkdirSync(path.join(outside, ".."), { recursive: true });
    symlinkSync(outside, path.join(root, "up"));
    writeFileSync(path.join(outside, "f.ts"), "f");
    expect(resolveWorkspaceSourceAbsolute(root, "up/f.ts")).toBeNull();
  });

  test("a missing file resolves under the workspace", () => {
    const root = temp("kibi-mcp-wsz-");
    expect(resolveWorkspaceSourceAbsolute(root, "src/missing.ts")).toBe(
      path.join(root, "src", "missing.ts"),
    );
    expect(resolveWorkspaceSourceAbsolute(root, "../x")).toBeNull();
  });
});
