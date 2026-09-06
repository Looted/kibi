// implements REQ-cli-staged-impact-enforcement
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { collectSourceChanges } from "../../src/public/impact/source-changes.js";
import {
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("source-changes remaining working-tree hunk catch", () => {
  test("returns no hunks when the second git diff throws", () => {
    restores.push(isolateKibiEnv());
    const root = createGitWorkspace();
    roots.push(root);
    const sourceFile = "src/app.ts";
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, sourceFile), "export const value = 1;\n");
    const original = childProcess.execSync.bind(childProcess);
    let diffCalls = 0;
    const spy = spyOn(childProcess, "execSync").mockImplementation(
      ((command: string, options?: childProcess.ExecSyncOptions) => {
        if (typeof command === "string" && command.includes("git diff -U0")) {
          diffCalls += 1;
          if (diffCalls > 1) throw new Error("hunk diff failed");
          return [
            "diff --git a/src/app.ts b/src/app.ts",
            "@@ -1 +1 @@",
            "-export const value = 1;",
            "+export const value = 2;",
            "",
          ].join("\n");
        }
        return original(command, options as never);
      }) as typeof childProcess.execSync,
    );
    spies.push(spy);
    expect(
      collectSourceChanges({
        workspaceRoot: root,
        sourceFiles: [sourceFile],
        includeWorkingTreeDiff: true,
      }),
    ).toEqual([]);
  });
});
