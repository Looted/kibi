// executable_for TEST-cli-doctor-workflows
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MERGE_DRIVER_SETUP,
  localKibiCommand,
  manifestMergeDriverGaps,
  mergeDriverSetup,
} from "../../src/utils/merge-driver-setup.js";

function git(root: string, args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

describe("manifest merge driver setup", () => {
  test("names each missing piece until both are wired", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-merge-driver-setup-"));
    try {
      expect(manifestMergeDriverGaps(root)).toBeNull();
      git(root, ["init", "-b", "main"]);
      mkdirSync(join(root, ".kb"));
      writeFileSync(join(root, ".kb", "symbols.yaml"), "symbols: []\n");
      // Nothing to merge until the manifest holds a record.
      expect(manifestMergeDriverGaps(root)).toBeNull();
      writeFileSync(
        join(root, ".kb", "symbols.yaml"),
        "symbols:\n  - id: SYM-a\n    title: a\n",
      );
      expect(manifestMergeDriverGaps(root)).toEqual([
        ".kb/symbols.yaml is not routed to merge=kibi",
        "merge.kibi.driver is not set",
      ]);
      writeFileSync(
        join(root, ".gitattributes"),
        ".kb/symbols.yaml merge=kibi\n.kb/relationships/*.yaml merge=kibi\n",
      );
      expect(manifestMergeDriverGaps(root)).toEqual([
        "merge.kibi.driver is not set",
      ]);
      git(root, [
        "config",
        "merge.kibi.driver",
        "npm exec --no -- kibi merge-driver %O %A %B",
      ]);
      expect(manifestMergeDriverGaps(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("names the project's package manager in the driver command", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-merge-driver-pm-"));
    try {
      expect(localKibiCommand(root)).toBe("npm exec --no -- kibi");
      writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: 9\n");
      expect(localKibiCommand(root)).toBe("pnpm exec kibi");
      expect(mergeDriverSetup(root)).toContain(
        'git config merge.kibi.driver "pnpm exec kibi merge-driver %O %A %B"',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("merge driver setup details", () => {
  test("each lockfile picks its package manager, pnpm first", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-merge-driver-lock-"));
    try {
      for (const [file, command] of [
        ["bun.lockb", "bunx --no-install kibi"],
        ["bun.lock", "bunx --no-install kibi"],
        ["yarn.lock", "yarn exec kibi"],
        ["pnpm-lock.yaml", "pnpm exec kibi"],
      ] as const) {
        writeFileSync(join(root, file), "");
        expect(localKibiCommand(root)).toBe(command);
      }
      rmSync(join(root, "pnpm-lock.yaml"));
      rmSync(join(root, "yarn.lock"));
      rmSync(join(root, "bun.lock"));
      expect(localKibiCommand(root)).toBe("bunx --no-install kibi");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the default setup text names npm", () => {
    const expected =
      'Add to .gitattributes: ".kb/symbols.yaml merge=kibi" and ".kb/relationships/*.yaml merge=kibi"; then run: git config merge.kibi.driver "npm exec --no -- kibi merge-driver %O %A %B" (see docs/cli-reference.md#kibi-merge-driver-base-current-other).';
    expect(mergeDriverSetup()).toBe(expected);
    expect(MERGE_DRIVER_SETUP).toBe(expected);
  });

  test("outside a Git work tree there is nothing to report", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-merge-driver-nogit-"));
    try {
      mkdirSync(join(root, ".kb"));
      writeFileSync(join(root, ".kb", "symbols.yaml"), "- id: SYM-a\n");
      expect(manifestMergeDriverGaps(root)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("only a symbol record line counts as something to merge", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-merge-driver-records-"));
    try {
      git(root, ["init", "-b", "main"]);
      git(root, ["config", "merge.kibi.driver", "kibi merge-driver %O %A %B"]);
      writeFileSync(
        join(root, ".gitattributes"),
        ".kb/symbols.yaml merge=kibi\n",
      );
      expect(manifestMergeDriverGaps(root)).toBeNull();
      mkdirSync(join(root, ".kb"));
      const manifest = join(root, ".kb", "symbols.yaml");
      for (const text of ["a: - id: x\n", "-id: x\n", "- idx: y\n"]) {
        writeFileSync(manifest, text);
        expect(manifestMergeDriverGaps(root)).toBeNull();
      }
      for (const text of ["x: 1\n  -  id : SYM-a\n", "- id: SYM-a\n"]) {
        writeFileSync(manifest, text);
        expect(manifestMergeDriverGaps(root)).toStrictEqual([]);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
