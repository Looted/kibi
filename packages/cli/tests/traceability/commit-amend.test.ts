import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "../helpers/isolated-env.js";

const moduleUrl = new URL(
  "../../src/traceability/commit-amend.ts",
  import.meta.url,
).pathname;
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function git(root: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

/** A repository whose pre-commit hook records amendsRootCommit() for HEAD. */
function repositoryWithProbe(): { root: string; probe: () => string } {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-amend-"));
  roots.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "Test");
  const result = path.join(root, ".git", "probe-result");
  const hook = path.join(root, ".git", "hooks", "pre-commit");
  writeFileSync(
    hook,
    `#!/bin/sh
head=$(git rev-parse -q --verify HEAD || true)
exec "${process.execPath}" -e 'const { amendsRootCommit } = await import(process.argv[1]); require("node:fs").writeFileSync(process.argv[2], String(amendsRootCommit(process.cwd(), process.argv[3] || null)));' "${moduleUrl}" "${result}" "$head"
`,
  );
  chmodSync(hook, 0o755);
  return { root, probe: () => readFileSync(result, "utf8") };
}

describe("amendsRootCommit", () => {
  test("is true only while amending a branch's root commit", () => {
    const { root, probe } = repositoryWithProbe();
    writeFileSync(path.join(root, "a.txt"), "a\n");
    git(root, "add", "a.txt");
    git(root, "commit", "-q", "-m", "root");
    expect(probe()).toBe("false");

    writeFileSync(path.join(root, "b.txt"), "b\n");
    git(root, "add", "b.txt");
    git(root, "commit", "-q", "--amend", "-m", "root amended");
    expect(probe()).toBe("true");

    writeFileSync(path.join(root, "c.txt"), "c\n");
    git(root, "add", "c.txt");
    git(root, "commit", "-q", "-m", "second");
    expect(probe()).toBe("false");

    writeFileSync(path.join(root, "d.txt"), "d\n");
    git(root, "add", "d.txt");
    git(root, "commit", "-q", "--amend", "-m", "second amended");
    expect(probe()).toBe("false");
  });
});
