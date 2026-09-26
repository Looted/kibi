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

  function captureConsoleLog(action: () => void): string[] {
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (...args: Parameters<typeof console.log>) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      action();
    } finally {
      console.log = originalLog;
    }
    return lines;
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
    if (result === undefined) {
      throw new Error("installGitHooks did not report the pre-commit hook");
    }
    expect(["skipped-symlink", "skipped-unsupported"]).toContain(result);
    expect(existsSync(path.join(outside, "pre-commit"))).toBe(false);
  });

  test("success summary lists only hooks installed or updated", () => {
    writeFileSync(preCommitPath(), "#!/bin/sh\necho user hook\n");
    symlinkSync(
      externalTarget("post-checkout", "#!/bin/sh\necho external\n"),
      path.join(hooksDir, "post-checkout"),
    );
    mkdirSync(path.join(hooksDir, "post-merge"));

    let results: ReturnType<typeof installGitHooks> = [];
    const output = captureConsoleLog(() => {
      results = installGitHooks(hooksDir);
    });
    const successLine = output.find((line) =>
      line.startsWith("✓ Installed/updated Kibi git hooks at "),
    );

    expect(results.map((entry) => [entry.hook, entry.result])).toEqual([
      ["post-checkout", "skipped-symlink"],
      ["post-merge", "skipped-unsupported"],
      ["post-rewrite", "installed"],
      ["pre-commit", "skipped-foreign"],
    ]);
    expect(successLine).toContain("(post-rewrite)");
    expect(successLine).not.toContain("post-checkout");
    expect(successLine).not.toContain("post-merge");
    expect(successLine).not.toContain("pre-commit");
    expect(
      output.some((line) => line.includes("No Kibi git hooks installed")),
    ).toBe(false);
  });

  test("reports no hooks installed when every hook is skipped", () => {
    writeFileSync(preCommitPath(), "#!/bin/sh\necho user pre-commit\n");
    symlinkSync(
      externalTarget("post-checkout", "#!/bin/sh\necho external\n"),
      path.join(hooksDir, "post-checkout"),
    );
    mkdirSync(path.join(hooksDir, "post-merge"));
    writeFileSync(
      path.join(hooksDir, "post-rewrite"),
      "#!/bin/sh\necho user post-rewrite\n",
    );

    let results: ReturnType<typeof installGitHooks> = [];
    const output = captureConsoleLog(() => {
      results = installGitHooks(hooksDir);
    });

    expect(results.every((entry) => entry.result.startsWith("skipped-"))).toBe(
      true,
    );
    expect(output).toContain(
      `! No Kibi git hooks installed at ${hooksDir} (all hooks were skipped).`,
    );
    expect(
      output.some((line) =>
        line.startsWith("✓ Installed/updated Kibi git hooks at "),
      ),
    ).toBe(false);
  });

  test("still updates a regular managed hook idempotently", () => {
    const first = installGitHooks(hooksDir);
    expect(first.find((r) => r.hook === "pre-commit")?.result).toBe(
      "installed",
    );
    const before = readFileSync(preCommitPath(), "utf8");

    let second: ReturnType<typeof installGitHooks> = [];
    const output = captureConsoleLog(() => {
      second = installGitHooks(hooksDir);
    });
    expect(second.find((r) => r.hook === "pre-commit")?.result).toBe("updated");
    expect(output).toContain(
      `✓ Installed/updated Kibi git hooks at ${hooksDir} (post-checkout, post-merge, post-rewrite, pre-commit)`,
    );
    expect(readFileSync(preCommitPath(), "utf8")).toBe(before);
  });
});
