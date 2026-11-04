// implements REQ-codex-kibi-hooks
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runHook } from "../src/hook-runner";

const tempRoots: string[] = [];

function tempRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

function optedInWorkspace(): string {
  const cwd = tempRoot("kibi-codex-advisory-");
  fs.mkdirSync(path.join(cwd, ".kb"));
  fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");
  fs.mkdirSync(path.join(cwd, "src"));
  fs.writeFileSync(path.join(cwd, "src", "a.ts"), "export const a = 1;\n");
  return cwd;
}

/** Tool input whose file_path read throws on the reads `failOn` selects. */
function flakyToolInput(failOn: (read: number) => boolean) {
  let reads = 0;
  return {
    get file_path(): string {
      reads += 1;
      if (failOn(reads)) throw new Error("tool input unreadable");
      return "src/a.ts";
    },
  };
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("codex hook runner advisory failures", () => {
  test("a PreToolUse whose requirement context throws allows the edit silently", async () => {
    const cwd = optedInWorkspace();
    const pluginData = tempRoot("kibi-codex-advisory-data-");
    const result = await runHook(
      {
        event: "PreToolUse",
        cwd,
        toolName: "Write",
        // The direct-.kb check reads the path; the context lookup then fails.
        toolInput: flakyToolInput((read) => read > 1),
      },
      { pluginData },
    );
    expect(result).toStrictEqual({ continue: true });

    // Without the failure the same edit gets the unlinked-source note.
    const control = await runHook(
      {
        event: "PreToolUse",
        cwd,
        toolName: "Write",
        toolInput: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    expect(control.hookSpecificOutput?.hookEventName).toBe("PreToolUse");
  });

  test("a PostToolUse whose telemetry throws still returns the impact note", async () => {
    const cwd = optedInWorkspace();
    const pluginData = tempRoot("kibi-codex-advisory-data-");
    const result = await runHook(
      {
        event: "PostToolUse",
        cwd,
        toolName: "Write",
        // Only the telemetry's read fails; the dirty-path read succeeds.
        toolInput: flakyToolInput((read) => read === 1),
      },
      { pluginData, env: { KIBI_DIAGNOSTIC_MODE: "1" } },
    );
    expect(result).toStrictEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          'Kibi impact review: run kb_check({sourceFiles:["src/a.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) while this edit is fresh.\nCheck whether the linked requirements, scenarios and tests still cover the changed behavior.',
      },
    });
  });
});
