// Exact persistence semantics of the hook-state snapshot and event journal.
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  type HookState,
  addDirtyPaths,
  clearDirtyPaths,
  loadHookState,
  recordKbMcpTool,
  resolvePluginDataDir,
  resolveSessionStateDir,
  resolveWorkspaceStateDir,
  saveHookState,
} from "../src/hook-state";

const EMPTY: HookState = {
  dirtyPaths: [],
  kbCheckRun: false,
  impactCheckRun: false,
  impactCheckedPaths: [],
};

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function pluginDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-zcode-journal-"));
  roots.push(root);
  return root;
}

const journalFile = (dir: string) => path.join(dir, "hook-state.events.jsonl");
const snapshotFile = (dir: string) => path.join(dir, "hook-state.json");

function writeJournal(dir: string, lines: readonly unknown[]): void {
  fs.writeFileSync(
    journalFile(dir),
    `${lines.map((line) => (typeof line === "string" ? line : JSON.stringify(line))).join("\n")}\n`,
  );
}

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

describe("plugin data directory", () => {
  test("prefers the explicit directory, then trimmed host variables", () => {
    expect(resolvePluginDataDir("/explicit", { ZCODE_PLUGIN_DATA: "/z" })).toBe(
      "/explicit",
    );
    expect(
      resolvePluginDataDir(undefined, {
        ZCODE_PLUGIN_DATA: " /z ",
        CLAUDE_PLUGIN_DATA: "/c",
      }),
    ).toBe("/z");
    expect(
      resolvePluginDataDir("", {
        ZCODE_PLUGIN_DATA: "   ",
        CLAUDE_PLUGIN_DATA: " /c ",
      }),
    ).toBe("/c");
  });

  test("falls back to a per-user temp directory", () => {
    const original = Object.getOwnPropertyDescriptor(process, "getuid");
    try {
      Object.defineProperty(process, "getuid", {
        configurable: true,
        value: () => 1234,
      });
      expect(resolvePluginDataDir(undefined, { CLAUDE_PLUGIN_DATA: " " })).toBe(
        path.join(os.tmpdir(), "kibi-zcode-1234"),
      );
      Object.defineProperty(process, "getuid", {
        configurable: true,
        value: undefined,
      });
      expect(resolvePluginDataDir(undefined, {})).toBe(
        path.join(os.tmpdir(), "kibi-zcode-user"),
      );
    } finally {
      if (original) Object.defineProperty(process, "getuid", original);
    }
  });

  test("reads process.env by default", () => {
    const saved = process.env.ZCODE_PLUGIN_DATA;
    process.env.ZCODE_PLUGIN_DATA = "/from-env";
    try {
      expect(resolvePluginDataDir(undefined)).toBe("/from-env");
    } finally {
      if (saved === undefined)
        Reflect.deleteProperty(process.env, "ZCODE_PLUGIN_DATA");
      else process.env.ZCODE_PLUGIN_DATA = saved;
    }
  });
});

describe("state directories", () => {
  test("no plugin data means no state directory", () => {
    expect(resolveWorkspaceStateDir(undefined, "/repo")).toBeUndefined();
    expect(resolveWorkspaceStateDir("", "/repo")).toBeUndefined();
    expect(resolveSessionStateDir(undefined, "/repo", "s")).toBeUndefined();
  });

  test("workspace and session keys are exact hashes", () => {
    const workspaceDir = path.join("/data", "workspaces", sha("/repo"));
    expect(resolveWorkspaceStateDir("/data", "/repo/./")).toBe(workspaceDir);
    expect(resolveSessionStateDir("/data", "/repo", " abc ")).toBe(
      path.join(workspaceDir, "sessions", sha("abc").slice(0, 32)),
    );
    for (const sessionId of [undefined, "", "   "]) {
      expect(resolveSessionStateDir("/data", "/repo", sessionId)).toBe(
        path.join(workspaceDir, "sessions", "unattributed"),
      );
    }
  });
});

describe("journal replay", () => {
  test("blank, torn, null, and unknown lines are skipped", () => {
    const dir = pluginDir();
    writeJournal(dir, [
      { kind: "add_dirty_paths", dirtyPaths: ["src/a.ts"] },
      "",
      "   ",
      "null",
      "[1]",
      "5",
      '{"kind":"add_dirty_paths","dirtyPa',
      { kind: "unknown", state: { dirtyPaths: [] } },
      { kind: 7 },
      { kind: "add_dirty_paths", dirtyPaths: ["src/b.ts"] },
    ]);
    expect(loadHookState(dir)).toStrictEqual({
      ...EMPTY,
      dirtyPaths: ["src/a.ts", "src/b.ts"],
    });
  });

  test("a legacy clear line empties the state", () => {
    const dir = pluginDir();
    writeJournal(dir, [
      { kind: "record_kb_check", impactCheckRun: true, sourceFiles: ["x"] },
      { kind: "add_dirty_paths", dirtyPaths: ["src/a.ts"] },
      { kind: "clear" },
      { kind: "add_dirty_paths", dirtyPaths: ["src/b.ts"] },
    ]);
    expect(loadHookState(dir)).toStrictEqual({
      ...EMPTY,
      dirtyPaths: ["src/b.ts"],
    });
  });

  test("a replace line coerces its state, and a missing list empties it", () => {
    const dir = pluginDir();
    for (const state of [
      undefined,
      null,
      "text",
      5,
      [],
      {},
      { dirtyPaths: "x", kbCheckRun: true },
    ]) {
      writeJournal(dir, [
        { kind: "add_dirty_paths", dirtyPaths: ["src/a.ts"] },
        { kind: "replace", state },
      ]);
      expect(loadHookState(dir)).toStrictEqual(EMPTY);
    }
    writeJournal(dir, [
      { kind: "add_dirty_paths", dirtyPaths: ["src/a.ts"] },
      {
        kind: "replace",
        state: {
          dirtyPaths: [1, "", " src\\b.ts ", "src/b.ts", "src/c.ts"],
          kbCheckRun: "true",
          impactCheckRun: true,
          impactCheckedPaths: [2, " ", "src\\c.ts"],
        },
      },
    ]);
    expect(loadHookState(dir)).toStrictEqual({
      dirtyPaths: ["src/b.ts", "src/c.ts"],
      kbCheckRun: false,
      impactCheckRun: true,
      impactCheckedPaths: ["src/c.ts"],
    });
    writeJournal(dir, [
      {
        kind: "replace",
        state: { dirtyPaths: [], kbCheckRun: true, impactCheckedPaths: "x" },
      },
    ]);
    expect(loadHookState(dir)).toStrictEqual({ ...EMPTY, kbCheckRun: true });
  });

  test("replaced and merged lists keep the newest fifty entries", () => {
    const dir = pluginDir();
    const many = Array.from({ length: 60 }, (_, index) => `src/f${index}.ts`);
    writeJournal(dir, [
      {
        kind: "replace",
        state: { dirtyPaths: many, impactCheckedPaths: many },
      },
    ]);
    expect(loadHookState(dir)).toStrictEqual({
      ...EMPTY,
      dirtyPaths: many.slice(10),
      impactCheckedPaths: many.slice(10),
    });
    writeJournal(dir, [
      { kind: "add_dirty_paths", dirtyPaths: many },
      { kind: "record_kb_check", impactCheckRun: true, sourceFiles: many },
    ]);
    expect(loadHookState(dir)).toStrictEqual({
      dirtyPaths: many.slice(10),
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: many.slice(10),
    });
  });

  test("add lines keep only non-empty string paths, normalized", () => {
    const dir = pluginDir();
    writeJournal(dir, [
      { kind: "add_dirty_paths", dirtyPaths: [3, "", "  ", " src\\a.ts "] },
      { kind: "add_dirty_paths", dirtyPaths: "src/b.ts" },
      { kind: "add_dirty_paths" },
    ]);
    expect(loadHookState(dir)).toStrictEqual({
      ...EMPTY,
      dirtyPaths: ["src/a.ts"],
    });
  });

  test("kb_check lines record only an exact impact flag and string sources", () => {
    const dir = pluginDir();
    writeJournal(dir, [
      { kind: "record_kb_check", impactCheckRun: "yes", sourceFiles: ["a"] },
    ]);
    expect(loadHookState(dir)).toStrictEqual({ ...EMPTY, kbCheckRun: true });
    writeJournal(dir, [
      {
        kind: "record_kb_check",
        impactCheckRun: true,
        sourceFiles: [4, "", " src\\a.ts "],
      },
      {
        kind: "record_kb_check",
        impactCheckRun: true,
        sourceFiles: "src/b.ts",
      },
      {
        kind: "record_kb_check",
        impactCheckRun: false,
        sourceFiles: ["src/c.ts"],
      },
    ]);
    expect(loadHookState(dir)).toStrictEqual({
      ...EMPTY,
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/a.ts"],
    });
  });

  test("an edit invalidates only the impact checks of the edited paths", () => {
    const dir = pluginDir();
    recordKbMcpTool(dir, "kb_check", {
      impactCheckRun: true,
      sourceFiles: ["src/a.ts", "src/b.ts"],
    });
    expect(addDirtyPaths(dir, [" src\\a.ts "])).toStrictEqual({
      dirtyPaths: ["src/a.ts"],
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/b.ts"],
    });
  });
});

describe("snapshot", () => {
  test("a snapshot alone restores the saved state and leaves no temp file", () => {
    const dir = pluginDir();
    const state: HookState = {
      dirtyPaths: ["src/a.ts"],
      kbCheckRun: true,
      impactCheckRun: false,
      impactCheckedPaths: ["src/a.ts"],
    };
    saveHookState(dir, state);
    expect(fs.readdirSync(dir).sort()).toStrictEqual([
      "hook-state.events.jsonl",
      "hook-state.json",
    ]);
    expect(fs.readFileSync(snapshotFile(dir), "utf8")).toBe(
      `${JSON.stringify(state)}\n`,
    );
    fs.rmSync(journalFile(dir));
    expect(loadHookState(dir)).toStrictEqual(state);
  });

  test("saving supersedes earlier journal events", () => {
    const dir = pluginDir();
    addDirtyPaths(dir, ["src/a.ts"]);
    saveHookState(dir, { ...EMPTY, dirtyPaths: ["src/b.ts"] });
    expect(loadHookState(dir)).toStrictEqual({
      ...EMPTY,
      dirtyPaths: ["src/b.ts"],
    });
  });

  test("saving creates a missing plugin directory", () => {
    const dir = path.join(pluginDir(), "nested", "deeper");
    saveHookState(dir, { ...EMPTY, kbCheckRun: true });
    expect(loadHookState(dir)).toStrictEqual({ ...EMPTY, kbCheckRun: true });
  });

  test("clearing empties both the journal replay and the snapshot", () => {
    const dir = pluginDir();
    addDirtyPaths(dir, ["src/a.ts"]);
    recordKbMcpTool(dir, "kb_check");
    expect(clearDirtyPaths(dir)).toStrictEqual(EMPTY);
    expect(
      JSON.parse(fs.readFileSync(snapshotFile(dir), "utf8")),
    ).toStrictEqual(EMPTY);
    fs.rmSync(journalFile(dir));
    expect(loadHookState(dir)).toStrictEqual(EMPTY);
  });
});

describe("kb tool recording", () => {
  test("only a (trimmed) kb_check changes state", () => {
    const dir = pluginDir();
    addDirtyPaths(dir, ["src/a.ts"]);
    const before = loadHookState(dir);
    for (const toolName of ["", "  ", "kb_search", "kb_checks"]) {
      expect(
        recordKbMcpTool(dir, toolName, { impactCheckRun: true }),
      ).toStrictEqual(before);
    }
    expect(fs.readFileSync(journalFile(dir), "utf8").split("\n")).toHaveLength(
      2,
    );
    expect(recordKbMcpTool(dir, " kb_check ")).toStrictEqual({
      ...before,
      kbCheckRun: true,
    });
  });

  test("without plugin data a kb_check is applied to an empty state", () => {
    expect(recordKbMcpTool(undefined, "kb_search")).toStrictEqual(EMPTY);
    expect(recordKbMcpTool(undefined, "kb_check")).toStrictEqual({
      ...EMPTY,
      kbCheckRun: true,
    });
    expect(
      recordKbMcpTool(undefined, "kb_check", {
        impactCheckRun: false,
        sourceFiles: ["src/a.ts"],
      }),
    ).toStrictEqual({ ...EMPTY, kbCheckRun: true });
    expect(
      recordKbMcpTool(undefined, "kb_check", { impactCheckRun: true }),
    ).toStrictEqual({ ...EMPTY, kbCheckRun: true, impactCheckRun: true });
    expect(addDirtyPaths(undefined, [" src\\a.ts ", ""])).toStrictEqual({
      ...EMPTY,
      dirtyPaths: ["src/a.ts"],
    });
  });

  test("an impact check accumulates once checked", () => {
    const dir = pluginDir();
    recordKbMcpTool(dir, "kb_check", {
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
    expect(
      recordKbMcpTool(dir, "kb_check", { sourceFiles: ["src/b.ts"] }),
    ).toStrictEqual({
      ...EMPTY,
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/a.ts"],
    });
    expect(
      recordKbMcpTool(dir, "kb_check", { impactCheckRun: true }),
    ).toStrictEqual({
      ...EMPTY,
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/a.ts"],
    });
  });
});
