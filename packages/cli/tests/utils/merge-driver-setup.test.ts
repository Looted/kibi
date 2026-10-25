// executable_for TEST-cli-doctor-workflows
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
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
