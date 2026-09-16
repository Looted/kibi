// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import path from "node:path";

import {
  classifySupersedesHistory,
  firstGitAdditionCommit,
  validateStrictLanePairing,
} from "../../src/operations/mutation/relationships.js";
import type { PrologPort } from "../../src/public/operations/runtime-types.js";
import {
  createGitWorkspace,
  git,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const tempDirs: string[] = [];
let previousExitCode: string | number | undefined | null;

afterEach(() => {
  process.exitCode = previousExitCode ?? 0;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) removeTempDir(dir);
  }
});

function prolog(query: PrologPort["query"]): PrologPort {
  return {
    query,
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
}

describe("relationships remaining git ancestry and requires_rule success", () => {
  test("gitIsAncestor classifies valid, reversed, and unknown history", () => {
    previousExitCode = process.exitCode;
    const cwd = createGitWorkspace();
    tempDirs.push(cwd);
    writeFileSync(path.join(cwd, "tracked.md"), "one\n");
    git(cwd, "add tracked.md");
    git(cwd, "commit --allow-empty --no-verify -m first-file");
    const older = git(cwd, "rev-parse HEAD").trim();
    writeFileSync(path.join(cwd, "tracked.md"), "two\n");
    git(cwd, "add tracked.md");
    git(cwd, "commit --no-verify -m second");
    const newer = git(cwd, "rev-parse HEAD").trim();

    expect(classifySupersedesHistory(cwd, newer, older)).toBe("valid");
    expect(classifySupersedesHistory(cwd, older, newer)).toBe("reversed");
    expect(classifySupersedesHistory(cwd, "deadbeefdeadbeef", newer)).toBe(
      "unknown",
    );
    expect(firstGitAdditionCommit(cwd, "tracked.md")).toBe(older);
  });

  test("validateStrictLanePairing continues after a successful requires_rule check", async () => {
    previousExitCode = process.exitCode;
    await validateStrictLanePairing(
      prolog(async () => ({ success: true, bindings: {} })),
      [
        { type: "requires_rule", from: "REQ-1", to: "FACT-RULE" },
        { type: "relates_to", from: "REQ-1", to: "REQ-2" },
      ],
    );
  });

  test("rejects constrains and requires_property targets of the wrong fact kind", async () => {
    previousExitCode = process.exitCode;
    await expect(
      validateStrictLanePairing(
        prolog(async () => ({ success: true, bindings: {} })),
        [{ type: "constrains", from: "REQ-1", to: "FACT-PROPERTY" }],
      ),
    ).rejects.toThrow(/[Pp]roperty_value facts cannot be direct targets/);
    await expect(
      validateStrictLanePairing(
        prolog(async () => ({ success: true, bindings: {} })),
        [{ type: "requires_property", from: "REQ-1", to: "FACT-SUBJECT" }],
      ),
    ).rejects.toThrow(/Subject facts cannot be direct targets/);
  });
});
