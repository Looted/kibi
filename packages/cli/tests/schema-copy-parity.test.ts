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
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../..");

// `kibi init` copies packages/cli/schema into a project's .kb/schema. The copy
// must match the authoritative packages/core/schema, otherwise new projects
// document relationship types (such as restates) that the engine accepts but
// their schema snapshot omits.
describe("packaged schema copy", () => {
  for (const file of ["entities.pl", "relationships.pl", "validation.pl"]) {
    test(`${file} matches packages/core/schema`, () => {
      expect(
        readFileSync(join(repoRoot, "packages/cli/schema", file), "utf8"),
      ).toBe(
        readFileSync(join(repoRoot, "packages/core/schema", file), "utf8"),
      );
    });
  }
});
