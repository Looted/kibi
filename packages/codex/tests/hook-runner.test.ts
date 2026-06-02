import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runHook } from "../src/hook-runner";
import { loadHookState } from "../src/hook-state";

function createTempRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("Codex hook runner", () => {
  test("SessionStart reminds when cwd has no Kibi config", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);

    const result = await runHook(
      { event: "SessionStart", cwd },
      { pluginData },
    );

    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain("Kibi is not initialized");
  });

  test("SessionStart stays quiet when cwd has Kibi config", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "config.json"), "{}");

    expect(
      await runHook({ event: "SessionStart", cwd }, { pluginData }),
    ).toEqual({ continue: true });
  });

  test("PreToolUse warns on explicit direct .kb path edits without blocking", async () => {
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);

    const result = await runHook(
      {
        event: "PreToolUse",
        toolName: "Write",
        toolInput: { file_path: ".kb/config.json" },
      },
      { pluginData },
    );

    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain("Avoid direct edits to .kb/");
  });

  test("PreToolUse does not parse Bash command text for .kb paths", async () => {
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);

    expect(
      await runHook(
        {
          event: "PreToolUse",
          toolName: "Bash",
          toolInput: { command: "cat .kb/config.json" },
        },
        { pluginData },
      ),
    ).toEqual({ continue: true });
  });

  test("PostToolUse tracks only explicit meaningful paths", async () => {
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);

    await runHook(
      {
        event: "PostToolUse",
        toolName: "Bash",
        toolInput: { command: "touch src/ignored.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        event: "PostToolUse",
        toolName: "Edit",
        toolInput: { file_path: "packages/codex/src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        event: "PostToolUse",
        toolName: "Write",
        toolInput: { file_path: "package.json" },
      },
      { pluginData },
    );

    expect(loadHookState(pluginData).dirtyPaths).toEqual([
      "packages/codex/src/hook-runner.ts",
    ]);
  });

  test("Stop returns freshness reminder once and clears tracked paths", async () => {
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        event: "PostToolUse",
        toolName: "Write",
        toolInput: { file_path: "docs/codex.md" },
      },
      { pluginData },
    );

    const result = await runHook({ event: "Stop" }, { pluginData });

    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain("Kibi freshness reminder");
    expect(result.systemMessage).toContain("docs/codex.md");
    expect(loadHookState(pluginData).dirtyPaths).toEqual([]);
    expect(await runHook({ event: "Stop" }, { pluginData })).toEqual({
      continue: true,
    });
  });

  test("unknown hook events continue without messages", async () => {
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);

    expect(await runHook({ event: "FutureHookEvent" }, { pluginData })).toEqual(
      { continue: true },
    );
  });
});
