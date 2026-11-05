// executable_for TEST-cli-doctor-merge-driver-remediation
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "../helpers/isolated-env.js";

// implements REQ-cli-doctor-merge-driver-remediation

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");
const TIMEOUT_MS = 240_000;

function runKibi(args: string[], cwd: string, input?: string) {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    ...(input === undefined ? {} : { input }),
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function vcs(cwd: string, ...args: string[]): void {
  spawnSync("git", args, { cwd, encoding: "utf8" });
}

describe("doctor merge driver remediation", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-merge-hint-")),
    );
    vcs(root, "init", "-b", "main");
    vcs(root, "config", "user.email", "test@example.com");
    vcs(root, "config", "user.name", "Kibi Test");
    vcs(root, "commit", "--allow-empty", "-m", "init");
    expect(runKibi(["init", "--no-hooks"], root).status).toBe(0);
    writeFileSync(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: 9\n");
    writeFileSync(
      path.join(root, ".kb/symbols.yaml"),
      "symbols:\n  - id: SYM-a\n    title: a\n",
    );
  });

  afterEach(() => {
    runKibi(["engine", "stop"], root);
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  function mergeDriverLines(): string[] {
    const doctor = runKibi(["doctor"], root);
    const lines = doctor.stdout.split("\n");
    const start = lines.findIndex((line) =>
      line.includes("Manifest merge driver:"),
    );
    expect(start, doctor.stdout).toBeGreaterThanOrEqual(0);
    return lines.slice(start, start + 2);
  }

  test(
    "kibi doctor asks only for the driver command once .gitattributes routes the manifests",
    () => {
      const [unrouted, unroutedFix] = mergeDriverLines();
      expect(unrouted).toContain(
        ".kb/symbols.yaml is not routed to merge=kibi; merge.kibi.driver is not set",
      );
      expect(unroutedFix).toContain(
        'Add to .gitattributes: ".kb/symbols.yaml merge=kibi" and ".kb/relationships/*.yaml merge=kibi"; then run: git config merge.kibi.driver "pnpm exec kibi merge-driver %O %A %B"',
      );

      writeFileSync(
        path.join(root, ".gitattributes"),
        ".kb/symbols.yaml merge=kibi\n.kb/relationships/*.yaml merge=kibi\n",
      );
      const [routed, routedFix] = mergeDriverLines();
      expect(routed).toContain("Not configured: merge.kibi.driver is not set.");
      expect(routedFix).toContain(
        'Run: git config merge.kibi.driver "pnpm exec kibi merge-driver %O %A %B"',
      );
      expect(routedFix).not.toContain(".gitattributes");

      vcs(
        root,
        "config",
        "merge.kibi.driver",
        "pnpm exec kibi merge-driver %O %A %B",
      );
      expect(mergeDriverLines()[0]).toContain(
        "Manifest merge driver: Configured",
      );
    },
    TIMEOUT_MS,
  );
});
