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
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "../../../..");

function readPackageJson(relativePath: string): {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} {
  return JSON.parse(
    readFileSync(join(REPO_ROOT, relativePath), "utf8"),
  ) as ReturnType<typeof readPackageJson>;
}

function dependencyNames(pkg: ReturnType<typeof readPackageJson>): Set<string> {
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
}

// executable_for TEST-capability-plugin-host-resolution-v1
describe("default CLI/MCP dependency trees exclude optional Jev", () => {
  // executable_for TEST-capability-plugin-host-resolution-v1
  test("kibi-cli and kibi-mcp do not depend on kibi-plugin-jev or @typesafe-ai/sdk", () => {
    const cli = dependencyNames(readPackageJson("packages/cli/package.json"));
    const mcp = dependencyNames(readPackageJson("packages/mcp/package.json"));
    const runtime = dependencyNames(
      readPackageJson("packages/runtime/package.json"),
    );

    for (const names of [cli, mcp, runtime]) {
      expect(names.has("kibi-plugin-jev")).toBe(false);
      expect(names.has("@typesafe-ai/sdk")).toBe(false);
    }

    expect(cli.has("kibi-plugin-builtin")).toBe(true);
    expect(cli.has("kibi-plugin-sdk")).toBe(true);
  });
});
