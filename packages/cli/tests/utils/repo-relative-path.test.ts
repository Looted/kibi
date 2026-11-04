/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, test } from "bun:test";
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
} from "../../src/utils/repo-relative-path.js";

const ROOT = path.resolve("/ci/runner/work/kibi");

describe("normalizeRepoRelativePath", () => {
  test("gives every spelling of an in-repo path one repo-relative form", () => {
    for (const spelling of [
      "packages/cli/src/a.ts",
      "./packages/cli/src/a.ts",
      "packages//cli/./src/a.ts",
      "packages\\cli\\src\\a.ts",
      ".\\packages\\cli\\src\\a.ts",
      "packages/cli/lib/../src/a.ts",
      "packages/cli/src/a.ts/",
      path.join(ROOT, "packages", "cli", "src", "a.ts"),
    ]) {
      expect(normalizeRepoRelativePath(ROOT, spelling)).toBe(
        "packages/cli/src/a.ts",
      );
    }
  });

  test("refuses locations that exist on one machine only", () => {
    for (const outside of [
      "",
      "   ",
      ".",
      "..",
      "../sibling/a.ts",
      "packages/../../a.ts",
      "..\\a.ts",
      ROOT,
      path.resolve("/home/dev/kibi/packages/cli/src/a.ts"),
      path.join(ROOT, "..", "kibi-other", "a.ts"),
    ]) {
      expect(normalizeRepoRelativePath(ROOT, outside)).toBeNull();
    }
  });

  test.skipIf(path.sep !== "/")(
    "treats another platform's drive and share paths as outside the repository",
    () => {
      expect(
        normalizeRepoRelativePath(ROOT, "C:\\work\\kibi\\a.ts"),
      ).toBeNull();
      expect(normalizeRepoRelativePath(ROOT, "c:/work/kibi/a.ts")).toBeNull();
      expect(
        normalizeRepoRelativePath(ROOT, "\\\\server\\share\\a.ts"),
      ).toBeNull();
    },
  );

  test("keeps the recorded Unicode form so the checked-out bytes stay readable", () => {
    const decomposed = "docs/cafe\u0301.md";
    expect(normalizeRepoRelativePath(ROOT, `./${decomposed}`)).toBe(decomposed);
  });
});

describe("resolveWorkspaceSourceAbsolute", () => {
  test("resolves in-repo relative and absolute spellings under the workspace", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-ws-source-"));
    try {
      mkdirSync(path.join(root, "src"), { recursive: true });
      const file = path.join(root, "src", "a.ts");
      writeFileSync(file, "export const a = 1;\n", "utf8");
      const expected = realpathSync.native(file);
      expect(resolveWorkspaceSourceAbsolute(root, "src/a.ts")).toBe(expected);
      expect(resolveWorkspaceSourceAbsolute(root, file)).toBe(expected);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a file whose name starts with two dots stays inside the workspace", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-ws-dots-"));
    try {
      const file = path.join(root, "..config.ts");
      writeFileSync(file, "export const a = 1;\n", "utf8");
      expect(resolveWorkspaceSourceAbsolute(root, "..config.ts")).toBe(
        realpathSync.native(file),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("refuses absolute and relative escapes so coordinate refresh cannot oracle outside files", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-ws-escape-"));
    const outside = mkdtempSync(path.join(tmpdir(), "kibi-outside-"));
    try {
      const secret = path.join(outside, "secret.ts");
      writeFileSync(secret, 'export const API_SECRET_TOKEN = "x";\n', "utf8");
      expect(resolveWorkspaceSourceAbsolute(root, secret)).toBeNull();
      expect(
        resolveWorkspaceSourceAbsolute(
          root,
          path.join("..", path.basename(outside), "secret.ts"),
        ),
      ).toBeNull();
      expect(resolveWorkspaceSourceAbsolute(root, "/etc/passwd")).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("normalizeRepoRelativePath edge spellings", () => {
  test.skipIf(path.sep !== "/")(
    "refuses drive and share paths even when they would resolve under the working directory",
    () => {
      const cwd = process.cwd();
      expect(normalizeRepoRelativePath(cwd, "C:\\work\\a.ts")).toBeNull();
      expect(
        normalizeRepoRelativePath(cwd, "\\\\server\\share\\a.ts"),
      ).toBeNull();
    },
  );

  test("a drive-like or doubled segment inside a relative path is kept", () => {
    expect(normalizeRepoRelativePath(ROOT, "docs/C:/x.md")).toBe(
      "docs/C:/x.md",
    );
    expect(normalizeRepoRelativePath(ROOT, "docs//")).toBe("docs");
  });

  test("re-expresses an absolute in-root path with POSIX separators", () => {
    expect(normalizeRepoRelativePath(ROOT, `${ROOT}/docs\\a.md`)).toBe(
      "docs/a.md",
    );
    expect(normalizeRepoRelativePath(ROOT, `${ROOT}/`)).toBeNull();
  });
});

describe("resolveWorkspaceSourceAbsolute symlink confinement", () => {
  test("refuses a symlink whose target leaves the workspace", () => {
    const base = realpathSync(
      mkdtempSync(path.join(tmpdir(), "kibi-ws-link-")),
    );
    try {
      const root = path.join(base, "repo");
      mkdirSync(root);
      writeFileSync(path.join(base, "secret.ts"), "x", "utf8");
      symlinkSync(path.join(base, "secret.ts"), path.join(root, "leak.ts"));
      symlinkSync(base, path.join(root, "up"));
      mkdirSync(path.join(root, "src"));
      writeFileSync(path.join(root, "src", "a.ts"), "x", "utf8");
      symlinkSync(path.join(root, "src", "a.ts"), path.join(root, "alias.ts"));
      expect(resolveWorkspaceSourceAbsolute(root, "leak.ts")).toBeNull();
      expect(resolveWorkspaceSourceAbsolute(root, "up")).toBeNull();
      expect(resolveWorkspaceSourceAbsolute(root, "up/secret.ts")).toBeNull();
      expect(resolveWorkspaceSourceAbsolute(root, "alias.ts")).toBe(
        path.join(root, "src", "a.ts"),
      );
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("a missing file resolves lexically under the workspace", () => {
    expect(resolveWorkspaceSourceAbsolute(ROOT, "./src/../missing.ts")).toBe(
      path.join(ROOT, "missing.ts"),
    );
    expect(resolveWorkspaceSourceAbsolute(ROOT, "../missing.ts")).toBeNull();
  });
});
