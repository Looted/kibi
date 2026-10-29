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

import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analysisCacheDir } from "../../../src/public/operations/check-executor.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import type { BranchAttachment } from "../../../src/utils/branch-resolver.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function git(root: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

/** A git repository on `main` with two commits. */
function repository(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-check-cache-dir-"));
  roots.push(root);
  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "kibi@example.test");
  git(root, "config", "user.name", "Kibi Test");
  for (const version of ["one", "two"]) {
    writeFileSync(join(root, "file.txt"), version);
    git(root, "add", "file.txt");
    git(root, "commit", "-q", "-m", version);
  }
  return root;
}

function context(
  workspaceRoot: string,
  branchAttachment?: BranchAttachment,
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: { now: () => new Date(0) },
    ...(branchAttachment ? { branchAttachment } : {}),
  } as unknown as OperationContext;
}

const attached: BranchAttachment = {
  gitBranch: "main",
  kbBranch: "main",
  storePath: "/stores/main",
  kind: "exact",
  migrationRequired: false,
};

describe("source analysis cache location for a check", () => {
  test("an attached branch store holds the cache", () => {
    expect(
      analysisCacheDir(context("/nowhere", attached), "/nowhere", {}),
    ).toBe("/stores/main");
  });

  test("a read-only detached snapshot gets no cache", () => {
    const detached = {
      ...attached,
      kind: "detached_snapshot",
      readOnly: { head: "abc", branchesAtHead: [], notice: "detached" },
    } as unknown as BranchAttachment;
    expect(
      analysisCacheDir(context("/nowhere", detached), "/nowhere", {
        branchStoreAttached: true,
      }),
    ).toBeUndefined();
  });

  test("an explicit KB path, with no attached branch store, gets no cache", () => {
    const root = repository();
    expect(analysisCacheDir(context(root), root, {})).toBeUndefined();
    expect(
      analysisCacheDir(context(root), root, { branchStoreAttached: false }),
    ).toBeUndefined();
  });

  test("an attached store with no recorded attachment resolves the branch", () => {
    const root = repository();
    const dir = analysisCacheDir(context(root), root, {
      branchStoreAttached: true,
    });
    expect(dir).toContain(join(root, ".kb", "branches"));
  });

  test("a detached HEAD with no recorded attachment gets no cache", () => {
    const root = repository();
    git(root, "checkout", "-q", "--detach", "HEAD~1");
    expect(
      analysisCacheDir(context(root), root, { branchStoreAttached: true }),
    ).toBeUndefined();
  });

  test("a branch resolution that throws gets no cache", () => {
    const root = repository();
    // A file where the migration journal directory belongs: listing it throws.
    mkdirSync(join(root, ".kb", "recovery"), { recursive: true });
    writeFileSync(join(root, ".kb", "recovery", "branch-migrations"), "");
    expect(
      analysisCacheDir(context(root), root, { branchStoreAttached: true }),
    ).toBeUndefined();
  });

  test("a branch that cannot be resolved gets no cache", () => {
    const root = repository();
    const journals = join(root, ".kb", "recovery", "branch-migrations");
    mkdirSync(journals, { recursive: true });
    writeFileSync(join(journals, "stuck.json"), "{ not json");
    expect(
      analysisCacheDir(context(root), root, { branchStoreAttached: true }),
    ).toBeUndefined();
  });
});
