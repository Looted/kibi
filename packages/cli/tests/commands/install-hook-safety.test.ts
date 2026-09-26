import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { installGitHooks } from "../../src/commands/init-helpers.js";

// executable_for TEST-git-hook-effective-install
// Symlinked hook files must never be edited through their target: the
// hooks-dir guard only constrains the directory, while read/write/chmod
// would otherwise follow a symlink to an arbitrary file outside it.

describe("installGitHooks hook-file write protection", () => {
  let tmpRoot: string;
  let outside: string;
  let hooksDir: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-hook-safety-"));
    outside = path.join(tmpRoot, "outside");
    mkdirSync(outside, { recursive: true });
    hooksDir = path.join(tmpRoot, "repo", ".git", "hooks");
    mkdirSync(hooksDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  function preCommitPath(): string {
    return path.join(hooksDir, "pre-commit");
  }

  function externalTarget(name: string, content: string): string {
    const target = path.join(outside, name);
    writeFileSync(target, content, { mode: 0o755 });
    return target;
  }

  function expectExternalUntouched(target: string, content: string): void {
    expect(readFileSync(target, "utf8")).toBe(content);
    expect(lstatSync(target).mode & 0o111).not.toBe(0);
  }

  test("refuses to edit a symlink pointing at an external plain hook", () => {
    const target = externalTarget("shared-hook", "#!/bin/sh\necho user\n");
    symlinkSync(target, preCommitPath());

    const results = installGitHooks(hooksDir);

    expect(results.find((r) => r.hook === "pre-commit")?.result).toBe(
      "skipped-symlink",
    );
    expectExternalUntouched(target, "#!/bin/sh\necho user\n");
  });

  test("refuses to edit a symlink whose target already contains a kibi block", () => {
    const target = externalTarget(
      "managed-elsewhere",
      "#!/bin/sh\n# BEGIN kibi-managed\nold\n# END kibi-managed\n",
    );
    symlinkSync(target, preCommitPath());

    const results = installGitHooks(hooksDir);

    expect(results.find((r) => r.hook === "pre-commit")?.result).toBe(
      "skipped-symlink",
    );
    expect(readFileSync(target, "utf8")).toContain("old\n# END kibi-managed");
  });

  test("treats a dangling symlink as untouchable and does not create the target", () => {
    symlinkSync(path.join(outside, "missing-target"), preCommitPath());

    const results = installGitHooks(hooksDir);

    expect(results.find((r) => r.hook === "pre-commit")?.result).toBe(
      "skipped-symlink",
    );
    expect(existsSync(path.join(outside, "missing-target"))).toBe(false);
  });

  test("refuses a hook path that is a symlink to a directory", () => {
    symlinkSync(outside, preCommitPath());

    const results = installGitHooks(hooksDir);

    const result = results.find((r) => r.hook === "pre-commit")?.result;
    expect(["skipped-symlink", "skipped-unsupported"]).toContain(result);
    expect(existsSync(path.join(outside, "pre-commit"))).toBe(false);
  });

  test("still updates a regular managed hook idempotently", () => {
    const first = installGitHooks(hooksDir);
    expect(first.find((r) => r.hook === "pre-commit")?.result).toBe(
      "installed",
    );
    const before = readFileSync(preCommitPath(), "utf8");

    const second = installGitHooks(hooksDir);
    expect(second.find((r) => r.hook === "pre-commit")?.result).toBe(
      "updated",
    );
    expect(readFileSync(preCommitPath(), "utf8")).toBe(before);
  });
});
