// executable_for TEST-kibi-fresh-clone-setup
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  MISSING_HOOKS_NOTE,
  hasKibiPreCommitGate,
  kibiHooksMissing,
  missingHooksNote,
} from "../src/checkout-hooks";

let root: string;

function git(...args: string[]): void {
  spawnSync("git", args, { cwd: root, encoding: "utf8" });
}

beforeEach(() => {
  root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "kibi-hooks-note-")));
  git("init", "-q", "-b", "main");
  mkdirSync(path.join(root, ".kb"));
  writeFileSync(path.join(root, ".kb", "manifest.json"), "{}\n");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("checkout hooks note", () => {
  test("names the missing hooks in a Kibi checkout without them", () => {
    expect(kibiHooksMissing(root)).toBe(true);
    expect(missingHooksNote(root)).toBe(MISSING_HOOKS_NOTE);
    expect(MISSING_HOOKS_NOTE).toContain("kibi hooks install");
  });

  test("stays quiet once the pre-commit hook runs kibi check", () => {
    writeFileSync(
      path.join(root, ".git", "hooks", "pre-commit"),
      '#!/bin/sh\n"$KIBI_BIN" check --staged\n',
    );
    expect(hasKibiPreCommitGate(root)).toBe(true);
    expect(missingHooksNote(root)).toBeNull();
  });

  test("stays quiet where Kibi is not initialized or a hook manager owns the hooks", () => {
    rmSync(path.join(root, ".kb"), { recursive: true });
    expect(missingHooksNote(root)).toBeNull();

    mkdirSync(path.join(root, ".kb"));
    writeFileSync(path.join(root, ".kb", "manifest.json"), "{}\n");
    writeFileSync(path.join(root, "lefthook.yml"), "pre-commit: {}\n");
    expect(missingHooksNote(root)).toBeNull();

    rmSync(path.join(root, "lefthook.yml"));
    git("config", "core.hooksPath", ".husky/_");
    expect(missingHooksNote(root)).toBeNull();
  });
});
