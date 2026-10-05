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
import path from "node:path";
import { normalizeRepoRelativePath } from "../../src/utils/repo-relative-path.js";

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
