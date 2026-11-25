/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

// End to end through the CLI: kibi init records the Kibi level, a plain
// kibi check runs the verification rules only at level test, level remember
// reports and refuses a tested floor, and at level test the commit gate
// reports a new requirement below its floor without refusing the commit.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDefaultRules } from "../../src/utils/rule-registry.js";
import { spawnSync } from "../helpers/isolated-env.js";

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");
const TIMEOUT_MS = 240_000;

function runKibi(args: string[], cwd: string) {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function git(cwd: string, ...args: string[]): void {
  spawnSync("git", args, { cwd, encoding: "utf8" });
}

function write(root: string, relative: string, content: string): void {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function upsert(root: string, id: string, properties: object = {}) {
  write(
    root,
    "upsert.json",
    JSON.stringify({
      type: "req",
      id,
      properties: {
        title: `${id} keeps the review canvas editable`,
        status: "open",
        priority: "should",
        ...properties,
      },
      document: {
        body: `${id} keeps the review canvas editable for its owner.\n\n## Context\n\nA fixture requirement an agent wrote for the Kibi level test; the person who asked gave no reason, so the reason is not stated.\n`,
      },
    }),
  );
  const result = runKibi(["upsert", "--input", "upsert.json"], root);
  rmSync(path.join(root, "upsert.json"));
  return result;
}

type CheckData = {
  data: {
    violations: { rule: string }[];
    qualityDiagnostics: { id: string; blocking: boolean }[];
    evaluated: { ruleCount: number; rules?: string[] };
  };
};

/** kibi check through its JSON route: the rules it ran and its findings. */
function check(root: string): {
  ruleCount: number;
  ruleNames: string[] | undefined;
  rules: string[];
  advice: string[];
} {
  write(root, "check.json", "{}");
  const result = runKibi(["check", "--input", "check.json"], root);
  rmSync(path.join(root, "check.json"));
  const { data } = JSON.parse(result.stdout) as CheckData;
  return {
    ruleCount: data.evaluated.ruleCount,
    ruleNames: data.evaluated.rules,
    rules: data.violations.map((finding) => finding.rule),
    advice: data.qualityDiagnostics
      .filter((diagnostic) => !diagnostic.blocking)
      .map((diagnostic) => diagnostic.id),
  };
}

describe("Kibi levels through the CLI", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-test-levels-")),
    );
    git(root, "init", "-b", "main");
    git(root, "config", "user.email", "test@example.com");
    git(root, "config", "user.name", "Kibi Test");
    git(root, "commit", "--allow-empty", "-m", "init");
  });

  afterEach(() => {
    runKibi(["engine", "stop"], root);
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  test(
    "init without a terminal records test, or the --level it is given, and refuses an unknown one",
    () => {
      write(root, "package.json", '{\n  "name": "app"\n}\n');
      const refused = runKibi(["init", "--no-hooks", "--level", "prove"], root);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain(
        "unknown --level 'prove'. Expected one of: remember, test.",
      );
      expect(existsSync(path.join(root, ".kb"))).toBe(false);
      const init = runKibi(["init", "--no-hooks"], root);
      expect(init.status).toBe(0);
      expect(init.stdout).toContain(
        "✓ Recorded Kibi level test in package.json",
      );
      expect(
        JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).kibi
          .level,
      ).toBe("test");
      // A recorded level is kept; --level changes it.
      expect(runKibi(["init", "--no-hooks"], root).stdout).not.toContain(
        "Recorded Kibi level",
      );
      expect(
        runKibi(["init", "--no-hooks", "--level", "remember"], root).stdout,
      ).toContain("✓ Recorded Kibi level remember in package.json");
    },
    TIMEOUT_MS,
  );

  test(
    "at remember a plain check runs no verification rule, reports a tested floor, and kb_upsert refuses to raise one",
    () => {
      expect(
        runKibi(["init", "--no-hooks", "--level", "test"], root).status,
      ).toBe(0);
      expect(
        upsert(root, "REQ-floor", { required_evidence: "tested" }).status,
      ).toBe(0);
      const tested = check(root);
      expect(tested.ruleCount).toBe(getDefaultRules("test").size);
      expect(tested.rules).toContain("evidence-floor");
      expect(tested.advice).not.toContain("rule.required-evidence-above-level");
      // The person chooses remember: the floor is reported, not enforced.
      const init = runKibi(["init", "--no-hooks", "--level", "remember"], root);
      expect(init.stdout).toContain(
        "✓ Recorded Kibi level remember in .kb/setup.json",
      );
      const remember = check(root);
      expect(remember.ruleCount).toBe(getDefaultRules("remember").size);
      // A full run at the level is a count, not a narrowed list.
      expect(remember.ruleNames).toBeUndefined();
      expect(remember.advice).toContain("rule.required-evidence-above-level");
      expect(remember.rules).toEqual([]);
      expect(remember.rules).not.toContain("evidence-floor");
      // Raising a floor is refused; keeping one is not.
      const refused = upsert(root, "REQ-other", {
        required_evidence: "tested",
      });
      expect(refused.status).not.toBe(0);
      expect(refused.stdout).toContain(
        "REQ-other asks for required_evidence tested, but the project's Kibi level is remember",
      );
      expect(upsert(root, "REQ-other").status).toBe(0);
      expect(
        upsert(root, "REQ-floor", { required_evidence: "tested" }).status,
      ).toBe(0);
    },
    TIMEOUT_MS,
  );

  test(
    "at test the commit gate reports, and does not refuse, a requirement the commit adds below its floor",
    () => {
      expect(
        runKibi(["init", "--no-hooks", "--level", "test"], root).status,
      ).toBe(0);
      git(root, "add", "-A");
      git(root, "commit", "-q", "-m", "kibi");
      expect(
        upsert(root, "REQ-new-floor", { required_evidence: "tested" }).status,
      ).toBe(0);
      git(root, "add", "-A");
      const staged = runKibi(["check", "--staged"], root);
      expect(staged.stdout).toContain(
        "non-blocking evidence floor violation(s) introduced by the staged changes",
      );
      expect(staged.stdout).toContain("[evidence-floor] REQ-new-floor");
      expect(staged.status).toBe(0);
    },
    TIMEOUT_MS,
  );
});
