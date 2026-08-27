/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  expectedRepositoryUrl,
  normalizeRepositoryUrl,
  repositoryMatches,
  verifyPublishMetadata,
} from "../verify-publish-metadata";

const repoRoot = join(import.meta.dir, "..", "..");
const packagesRoot = join(repoRoot, "packages");

describe("normalizeRepositoryUrl", () => {
  test("strips git+ prefix, protocol, and .git suffix", () => {
    expect(
      normalizeRepositoryUrl("git+https://github.com/Looted/kibi.git"),
    ).toBe("github.com/Looted/kibi");
  });

  test("handles string shorthand and trailing slashes", () => {
    expect(normalizeRepositoryUrl("github:Looted/kibi")).toBe(
      "github.com/Looted/kibi",
    );
    expect(normalizeRepositoryUrl("https://github.com/Looted/kibi/")).toBe(
      "github.com/Looted/kibi",
    );
  });

  test("does not invent a missing path", () => {
    expect(normalizeRepositoryUrl("https://github.com/Looted")).toBe(
      "github.com/Looted",
    );
  });
});

describe("repositoryMatches", () => {
  test("accepts the canonical variants npm allows", () => {
    const expected = "https://github.com/Looted/kibi";
    for (const url of [
      "https://github.com/Looted/kibi.git",
      "git+https://github.com/Looted/kibi.git",
      "https://github.com/Looted/kibi",
    ]) {
      expect(repositoryMatches(url, expected)).toBe(true);
    }
    expect(repositoryMatches("https://github.com/other/repo", expected)).toBe(
      false,
    );
  });
});

describe("expectedRepositoryUrl", () => {
  test("defaults to Looted/kibi outside CI", () => {
    expect(expectedRepositoryUrl({})).toBe("https://github.com/Looted/kibi");
  });

  test("derives the expected repository from GITHUB_REPOSITORY", () => {
    expect(expectedRepositoryUrl({ GITHUB_REPOSITORY: "Looted/kibi" })).toBe(
      "https://github.com/Looted/kibi",
    );
  });
});

describe("verifyPublishMetadata", () => {
  test("current repository manifests pass against the provenance repository", () => {
    expect(verifyPublishMetadata(packagesRoot)).toEqual([]);
  });

  test("rejects a manifest without repository information", () => {
    const original = readFileSync(
      join(packagesRoot, "runtime", "package.json"),
      "utf8",
    );
    const broken = JSON.stringify({
      name: "kibi-runtime",
      version: "1.0.1",
    });
    const issues = verifyWithTempManifest("runtime", original, broken);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.pkg).toBe("runtime");
    expect(issues[0]?.problem).toContain("E422");
  });

  test("rejects a mismatched repository.url", () => {
    const original = readFileSync(
      join(packagesRoot, "runtime", "package.json"),
      "utf8",
    );
    const broken = JSON.stringify({
      name: "kibi-runtime",
      version: "1.0.1",
      repository: { type: "git", url: "https://github.com/other/repo.git" },
    });
    const issues = verifyWithTempManifest("runtime", original, broken);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.problem).toContain("does not match");
  });

  test("rejects private publishable packages", () => {
    const original = readFileSync(
      join(packagesRoot, "runtime", "package.json"),
      "utf8",
    );
    const manifest = JSON.parse(original);
    const broken = JSON.stringify({ ...manifest, private: true });
    const issues = verifyWithTempManifest("runtime", original, broken);
    expect(issues.some((issue) => issue.problem.includes("private"))).toBe(
      true,
    );
  });
});

/** Swap a manifest on disk, run the verifier, then restore the original. */
function verifyWithTempManifest(dir: string, original: string, broken: string) {
  const manifestPath = join(packagesRoot, dir, "package.json");
  writeFileSync(manifestPath, broken);
  try {
    return verifyPublishMetadata(packagesRoot, {});
  } finally {
    writeFileSync(manifestPath, original);
  }
}
