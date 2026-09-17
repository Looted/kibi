// Behavioral contracts for the Codex plugin: hook input parsing, state
// journaling, MCP tool-call extraction, path policy, workspace opt-in,
// reminders, and the hook runner. Each assertion pins observable output or
// error contracts so the mutation suite fails if a contract breaks.
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import { parseHookInput, parseStdinJson, readStdin } from "../src/hook-input";
import { isInvokedAsCli, main, runHook, runHookCli } from "../src/hook-runner";
import {
  addDirtyPaths,
  clearDirtyPaths,
  loadHookState,
  recordKbMcpTool,
  resolveWorkspaceStateDir,
  saveHookState,
} from "../src/hook-state";
import { extractKbMcpToolCall } from "../src/kb-mcp-tools";
import {
  DIRECT_KB_EDIT_WARNING,
  freshnessReminder,
  impactCheckReminder,
} from "../src/messages";
import {
  extractExplicitPathFields,
  isDirectKbPath,
  isMeaningfulTrackedPath,
  isSourceImpactRelevantPath,
} from "../src/path-policy";
import {
  KIBI_WORKSPACE_ENV_KEYS,
  resolveKibiWorkspace,
} from "../src/workspace-optin";

function createTempRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function optInWorkspace(root: string): void {
  fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
}

const tempRoots: string[] = [];
const savedEnv = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    savedEnv.set(key, process.env[key]);
    delete process.env[key];
  }
});

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  for (const [key, value] of savedEnv) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  savedEnv.clear();
});

function journalFile(pluginData: string): string {
  return path.join(pluginData, "hook-state.events.jsonl");
}

function appendJournal(pluginData: string, events: unknown[]): void {
  fs.mkdirSync(pluginData, { recursive: true });
  fs.appendFileSync(
    journalFile(pluginData),
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
    "utf8",
  );
}

describe("Codex hook input parsing", () => {
  test("non-record inputs degrade to an unknown event", () => {
    for (const bad of [null, 42, "text", [], true]) {
      expect(parseHookInput(bad)).toStrictEqual({ event: "" });
    }
    expect(parseHookInput({})).toStrictEqual({ event: "" });
  });

  test("every event alias is honored", () => {
    expect(parseHookInput({ event: "Stop" })).toStrictEqual({ event: "Stop" });
    expect(parseHookInput({ hook_event: "Stop" })).toStrictEqual({
      event: "Stop",
    });
    expect(parseHookInput({ hookEvent: "Stop" })).toStrictEqual({
      event: "Stop",
    });
    expect(parseHookInput({ name: "Stop" })).toStrictEqual({ event: "Stop" });
  });

  test("every cwd alias is honored", () => {
    expect(parseHookInput({ cwd: "/w" })).toStrictEqual({
      event: "",
      cwd: "/w",
    });
    expect(parseHookInput({ current_working_directory: "/w" })).toStrictEqual({
      event: "",
      cwd: "/w",
    });
    expect(parseHookInput({ workspace: "/w" })).toStrictEqual({
      event: "",
      cwd: "/w",
    });
  });

  test("every tool name alias is honored", () => {
    expect(parseHookInput({ toolName: "Edit" })).toStrictEqual({
      event: "",
      toolName: "Edit",
    });
    expect(parseHookInput({ tool_name: "Edit" })).toStrictEqual({
      event: "",
      toolName: "Edit",
    });
    expect(parseHookInput({ tool: "Edit" })).toStrictEqual({
      event: "",
      toolName: "Edit",
    });
  });

  test("tool input aliases are honored and absent fields stay absent", () => {
    expect(
      parseHookInput({ event: "Stop", toolInput: { a: 1 } }),
    ).toStrictEqual({ event: "Stop", toolInput: { a: 1 } });
    expect(
      parseHookInput({ event: "Stop", tool_input: { a: 1 } }),
    ).toStrictEqual({ event: "Stop", toolInput: { a: 1 } });
    expect(parseHookInput({ event: "Stop", input: { a: 1 } })).toStrictEqual({
      event: "Stop",
      toolInput: { a: 1 },
    });
    expect(parseHookInput({ event: "Stop" })).toStrictEqual({ event: "Stop" });
  });

  test("non-string alias values are ignored", () => {
    expect(parseHookInput({ event: 42, cwd: 7, toolName: [] })).toStrictEqual({
      event: "",
    });
  });

  test("readStdin concatenates string and buffer chunks", async () => {
    const original = Object.getOwnPropertyDescriptor(process, "stdin");
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: Readable.from(["hello ", Buffer.from("buffer world")]),
    });
    try {
      expect(await readStdin()).toBe("hello buffer world");
    } finally {
      if (original) {
        Object.defineProperty(process, "stdin", original);
      }
    }
  });

  test("empty stdin parses to an empty record", () => {
    expect(parseStdinJson("   ")).toStrictEqual({});
    expect(parseStdinJson('{"event":"Stop"}')).toStrictEqual({
      event: "Stop",
    });
  });
});

describe("Codex hook state journal", () => {
  test("coercion of a corrupt snapshot never throws and clears state", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    expect(() =>
      saveHookState(pluginData, {
        dirtyPaths: "not-an-array" as unknown as string[],
        kbCheckRun: true,
        impactCheckRun: true,
        impactCheckedPaths: [],
      }),
    ).not.toThrow();
    expect(loadHookState(pluginData)).toEqual({
      dirtyPaths: [],
      kbCheckRun: false,
      impactCheckRun: false,
      impactCheckedPaths: [],
    });
  });

  test("dirty paths are normalized, deduped, and empties dropped", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    const state = addDirtyPaths(pluginData, [
      " src\\a.ts ",
      "src/a.ts",
      "   ",
      "",
      "src/b.ts",
    ]);
    expect(state.dirtyPaths).toStrictEqual(["src/a.ts", "src/b.ts"]);
  });

  test("coercion filters non-string and blank entries from both lists", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    fs.writeFileSync(
      path.join(pluginData, "hook-state.json"),
      JSON.stringify({
        dirtyPaths: [1, " src/a.ts ", "", "src/b.ts"],
        kbCheckRun: true,
        impactCheckRun: false,
        impactCheckedPaths: [2, " src/c.ts ", "   ", "src/d.ts"],
      }),
      "utf8",
    );
    expect(loadHookState(pluginData)).toStrictEqual({
      dirtyPaths: ["src/a.ts", "src/b.ts"],
      kbCheckRun: true,
      impactCheckRun: false,
      impactCheckedPaths: ["src/c.ts", "src/d.ts"],
    });
  });

  test("absent optional lists coerce to empty instead of placeholder data", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    fs.writeFileSync(
      path.join(pluginData, "hook-state.json"),
      JSON.stringify({ dirtyPaths: [], kbCheckRun: false }),
      "utf8",
    );
    expect(loadHookState(pluginData)).toStrictEqual({
      dirtyPaths: [],
      kbCheckRun: false,
      impactCheckRun: false,
      impactCheckedPaths: [],
    });
  });

  test("dirty path lists are bounded to the last 50 entries", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    const paths = Array.from({ length: 60 }, (_, index) => `src/p${index}.ts`);
    const state = addDirtyPaths(pluginData, paths);
    expect(state.dirtyPaths).toHaveLength(50);
    expect(state.dirtyPaths[0]).toBe("src/p10.ts");
    expect(state.dirtyPaths.at(-1)).toBe("src/p59.ts");

    const impactState = recordKbMcpTool(pluginData, "kb_check", {
      impactCheckRun: true,
      sourceFiles: Array.from({ length: 60 }, (_, index) => `src/s${index}.ts`),
    });
    expect(impactState.impactCheckedPaths).toHaveLength(50);
    expect(impactState.impactCheckedPaths[0]).toBe("src/s10.ts");
  });

  test("snapshot lists are bounded during coercion", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    fs.writeFileSync(
      path.join(pluginData, "hook-state.json"),
      JSON.stringify({
        dirtyPaths: Array.from({ length: 60 }, (_, i) => `src/d${i}.ts`),
        kbCheckRun: false,
        impactCheckRun: true,
        impactCheckedPaths: Array.from(
          { length: 60 },
          (_, i) => `src/c${i}.ts`,
        ),
      }),
      "utf8",
    );
    const state = loadHookState(pluginData);
    expect(state.dirtyPaths).toHaveLength(50);
    expect(state.dirtyPaths[0]).toBe("src/d10.ts");
    expect(state.impactCheckedPaths).toHaveLength(50);
    expect(state.impactCheckedPaths[0]).toBe("src/c10.ts");
  });

  test("record_kb_check with impactCheckRun false keeps checks unset", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    appendJournal(pluginData, [
      { kind: "record_kb_check", impactCheckRun: false, sourceFiles: [] },
    ]);
    expect(loadHookState(pluginData)).toStrictEqual({
      dirtyPaths: [],
      kbCheckRun: true,
      impactCheckRun: false,
      impactCheckedPaths: [],
    });
  });

  test("journal clear resets a replaced state", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    appendJournal(pluginData, [
      {
        kind: "replace",
        state: { dirtyPaths: ["src/a.ts"], kbCheckRun: true },
      },
      { kind: "clear" },
    ]);
    expect(loadHookState(pluginData)).toEqual({
      dirtyPaths: [],
      kbCheckRun: false,
      impactCheckRun: false,
      impactCheckedPaths: [],
    });
  });

  test("replace events adopt the recorded state exactly", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    appendJournal(pluginData, [
      { kind: "add_dirty_paths", dirtyPaths: ["src/old.ts"] },
      {
        kind: "replace",
        state: {
          dirtyPaths: ["src/new.ts"],
          kbCheckRun: true,
          impactCheckRun: true,
          impactCheckedPaths: ["src/new.ts"],
        },
      },
    ]);
    expect(loadHookState(pluginData)).toStrictEqual({
      dirtyPaths: ["src/new.ts"],
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/new.ts"],
    });
  });

  test("clear events never adopt a smuggled state payload", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    appendJournal(pluginData, [
      { kind: "add_dirty_paths", dirtyPaths: ["src/a.ts"] },
      {
        kind: "mystery",
        state: { dirtyPaths: ["src/hijack.ts"], kbCheckRun: true },
      },
    ]);
    const state = loadHookState(pluginData);
    expect(state.dirtyPaths).toEqual(["src/a.ts"]);
    expect(state.kbCheckRun).toBe(false);
  });

  test("unknown event kinds never flip the kb check flag", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    appendJournal(pluginData, [
      { kind: "add_dirty_paths", dirtyPaths: ["src/a.ts"] },
      { kind: "mystery" },
    ]);
    const state = loadHookState(pluginData);
    expect(state.dirtyPaths).toEqual(["src/a.ts"]);
    expect(state.kbCheckRun).toBe(false);
    expect(state.impactCheckRun).toBe(false);
  });

  test("record_kb_check ignores dirty-path arrays on its own events", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    appendJournal(pluginData, [
      {
        kind: "record_kb_check",
        impactCheckRun: false,
        sourceFiles: [],
        dirtyPaths: ["src/sneaky.ts"],
      },
    ]);
    expect(loadHookState(pluginData).dirtyPaths).toStrictEqual([]);
  });

  test("add_dirty_paths drops non-string and blank entries", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    appendJournal(pluginData, [
      { kind: "add_dirty_paths", dirtyPaths: [1, " src/a.ts ", ""] },
    ]);
    expect(loadHookState(pluginData).dirtyPaths).toStrictEqual(["src/a.ts"]);
  });

  test("record_kb_check filters non-string source files", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    appendJournal(pluginData, [
      {
        kind: "record_kb_check",
        impactCheckRun: true,
        sourceFiles: [1, " src/a.ts ", "   "],
      },
    ]);
    expect(loadHookState(pluginData).impactCheckedPaths).toStrictEqual([
      "src/a.ts",
    ]);
  });

  test("record_kb_check without source files keeps the checked list empty", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    appendJournal(pluginData, [
      { kind: "record_kb_check", impactCheckRun: true },
    ]);
    expect(loadHookState(pluginData).impactCheckedPaths).toStrictEqual([]);
  });

  test("a kb_check without the impact option leaves impact state unset", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    const state = {
      dirtyPaths: ["src/a.ts"],
      kbCheckRun: true,
      impactCheckRun: true,
      impactCheckedPaths: ["src/a.ts"],
    };
    saveHookState(pluginData, state);
    expect(
      fs.readFileSync(path.join(pluginData, "hook-state.json"), "utf8"),
    ).toBe(`${JSON.stringify(state)}\n`);

    fs.rmSync(journalFile(pluginData));
    expect(loadHookState(pluginData)).toEqual(state);
  });

  test("journal entries without a snapshot restore prior state", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    addDirtyPaths(pluginData, ["src/a.ts"]);
    fs.rmSync(path.join(pluginData, "hook-state.json"), { force: true });
    expect(loadHookState(pluginData).dirtyPaths).toStrictEqual(["src/a.ts"]);
  });

  test("clearing keeps an emptied snapshot even without a journal", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    addDirtyPaths(pluginData, ["src/a.ts"]);
    clearDirtyPaths(pluginData);
    fs.rmSync(journalFile(pluginData));
    expect(fs.existsSync(path.join(pluginData, "hook-state.json"))).toBe(true);
    expect(loadHookState(pluginData)).toEqual({
      dirtyPaths: [],
      kbCheckRun: false,
      impactCheckRun: false,
      impactCheckedPaths: [],
    });
  });

  test("recordKbMcpTool trims the tool name before matching kb_check", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    const state = recordKbMcpTool(pluginData, "  kb_check  ", {
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
    expect(state.kbCheckRun).toBe(true);
    expect(state.impactCheckRun).toBe(true);
    expect(state.impactCheckedPaths).toEqual(["src/a.ts"]);
  });

  test("blank tool names never write a kb check record", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    const state = recordKbMcpTool(pluginData, "   ");
    expect(state.kbCheckRun).toBe(false);
    expect(fs.existsSync(journalFile(pluginData))).toBe(false);
  });

  test("an impact check without source files keeps the checked list empty", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    const state = recordKbMcpTool(pluginData, "kb_check", {
      impactCheckRun: true,
    });
    expect(state.impactCheckRun).toBe(true);
    expect(state.impactCheckedPaths).toStrictEqual([]);
  });

  test("an impact check without source files keeps the fallback list empty", () => {
    expect(
      recordKbMcpTool(undefined, "kb_check", { impactCheckRun: true })
        .impactCheckedPaths,
    ).toStrictEqual([]);
  });

  test("Stop clears checked-but-unbounded state even without a check flag", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    optInWorkspace(cwd);
    const stateDir = resolveWorkspaceStateDir(pluginData, cwd);

    saveHookState(stateDir, {
      dirtyPaths: ["src/a.ts"],
      kbCheckRun: false,
      impactCheckRun: false,
      impactCheckedPaths: ["src/a.ts"],
    });
    const result = await runHook({ event: "Stop", cwd }, { pluginData });
    expect(result).toEqual({ continue: true });
    expect(loadHookState(stateDir).dirtyPaths).toEqual([]);
  });

  test("a kb_check without the impact option leaves impact state unset", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    const state = recordKbMcpTool(pluginData, "kb_check", {});
    expect(state.kbCheckRun).toBe(true);
    expect(state.impactCheckRun).toBe(false);
    expect(state.impactCheckedPaths).toStrictEqual([]);
  });

  test("non-check tools never flip the kb check flag", () => {
    expect(recordKbMcpTool(undefined, "kb_skills_list").kbCheckRun).toBe(false);
    expect(recordKbMcpTool(undefined, "kb_check", {}).kbCheckRun).toBe(true);
    expect(recordKbMcpTool(undefined, "kb_check").impactCheckRun).toBe(false);
    expect(
      recordKbMcpTool(undefined, "kb_check").impactCheckedPaths,
    ).toStrictEqual([]);
  });
});

describe("Codex workspace state dir resolution", () => {
  test("state dirs are keyed by the resolved workspace root", () => {
    const pluginData = createTempRoot("kibi-codex-contracts-");
    tempRoots.push(pluginData);

    expect(resolveWorkspaceStateDir(undefined, "/anywhere")).toBeUndefined();
    const resolved = resolveWorkspaceStateDir(pluginData, "/anywhere");
    expect(resolved?.startsWith(path.join(pluginData, "workspaces"))).toBe(
      true,
    );
    expect(resolved).toBe(resolveWorkspaceStateDir(pluginData, "/anywhere/"));
  });
});

describe("Codex kb mcp tool call extraction", () => {
  test("non-record tool input still admits direct kb tool names", () => {
    expect(extractKbMcpToolCall(" kb_check ", null)).toEqual({
      toolName: "kb_check",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(extractKbMcpToolCall(undefined, null)).toBeUndefined();
  });

  test("tool name aliases inside tool input are honored", () => {
    const base = { arguments: {} };
    expect(
      extractKbMcpToolCall(undefined, { ...base, toolName: "kb_status" }),
    ).toEqual({
      toolName: "kb_status",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(
      extractKbMcpToolCall(undefined, { ...base, tool_name: "kb_status" }),
    ).toEqual({
      toolName: "kb_status",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(
      extractKbMcpToolCall(undefined, { ...base, name: "kb_status" }),
    ).toEqual({
      toolName: "kb_status",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(extractKbMcpToolCall(undefined, base)).toBeUndefined();
  });

  test("non-kb tool names never produce a call", () => {
    expect(extractKbMcpToolCall("Edit", { file_path: "x" })).toBeUndefined();
    expect(
      extractKbMcpToolCall(undefined, { name: "other_tool" }),
    ).toBeUndefined();
  });

  test("arguments records are preferred and non-records fall back", () => {
    const flags = {
      includeImpactDiagnostics: true,
      includeWorkingTreeDiff: true,
    };
    expect(
      extractKbMcpToolCall("kb_check", {
        arguments: { ...flags, sourceFiles: ["src/a.ts"] },
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
    expect(
      extractKbMcpToolCall("kb_check", {
        args: { ...flags, sourceFiles: ["src/a.ts"] },
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
    expect(
      extractKbMcpToolCall("kb_check", {
        arguments: "garbage",
        ...flags,
        sourceFiles: ["src/a.ts"],
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
  });

  test("source file lists drop non-strings and empties", () => {
    expect(
      extractKbMcpToolCall("kb_check", {
        arguments: { sourceFiles: [["nested"], "src/a.ts", ""] },
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: false,
      sourceFiles: ["src/a.ts"],
    });
    expect(
      extractKbMcpToolCall("kb_check", {
        arguments: { sourceFiles: "not-an-array" },
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: false,
      sourceFiles: [],
    });
  });

  test("impact checks require both flags and at least one source file", () => {
    const toolInput = (flags: Record<string, unknown>) => ({
      arguments: { sourceFiles: ["src/a.ts"], ...flags },
    });
    expect(
      extractKbMcpToolCall(
        "kb_check",
        toolInput({
          includeImpactDiagnostics: true,
          includeWorkingTreeDiff: true,
        }),
      )?.impactCheckRun,
    ).toBe(true);
    expect(
      extractKbMcpToolCall(
        "kb_skills_list",
        toolInput({
          includeImpactDiagnostics: true,
          includeWorkingTreeDiff: true,
        }),
      )?.impactCheckRun,
    ).toBe(false);
    expect(
      extractKbMcpToolCall(
        "kb_check",
        toolInput({ includeWorkingTreeDiff: true }),
      )?.impactCheckRun,
    ).toBe(false);
    expect(
      extractKbMcpToolCall(
        "kb_check",
        toolInput({ includeImpactDiagnostics: true }),
      )?.impactCheckRun,
    ).toBe(false);
    expect(
      extractKbMcpToolCall(
        "kb_check",
        toolInput({
          includeImpactDiagnostics: true,
          includeWorkingTreeDiff: true,
          sourceFiles: [],
        }),
      )?.impactCheckRun,
    ).toBe(false);
  });

  test("boolean flags accept snake case aliases", () => {
    expect(
      extractKbMcpToolCall("kb_check", {
        arguments: {
          include_impact_diagnostics: true,
          include_working_tree_diff: true,
          sourceFiles: ["src/a.ts"],
        },
      })?.impactCheckRun,
    ).toBe(true);
  });
});

describe("Codex path policy", () => {
  test("extracts explicit path fields recursively with dedupe", () => {
    expect(
      extractExplicitPathFields({
        absolute_path: "/abs/a.ts",
        file: "src/file.ts",
        file_path: "src/a.ts",
        filepath: "src/fp.ts",
        new_path: "src/new.ts",
        old_path: "src/old.ts",
        path: "src/p.ts",
        paths: ["src/b.ts", { relative_path: "src/rp.ts" }],
        target_path: [["src/target.ts"]],
        nested: {
          FILE_PATH: "src/a.ts",
          other: "skip.bin",
        },
        deep: [[{ old_path: "src\\d.ts" }]],
        url: "https://example.com/x",
      }),
    ).toEqual([
      "/abs/a.ts",
      "src/file.ts",
      "src/a.ts",
      "src/fp.ts",
      "src/new.ts",
      "src/old.ts",
      "src/p.ts",
      "src/b.ts",
      "src/rp.ts",
      "src/target.ts",
      "src/d.ts",
    ]);
    expect(extractExplicitPathFields({ path: "   " })).toEqual([]);
    expect(extractExplicitPathFields("just a string")).toEqual([]);
    expect(extractExplicitPathFields(null)).toEqual([]);
  });

  test("detects direct .kb paths anywhere in the segment list", () => {
    expect(isDirectKbPath(".kb/requirements/REQ-1.md")).toBe(true);
    expect(isDirectKbPath("project/.kb/facts/FACT-1.md")).toBe(true);
    expect(isDirectKbPath("kbb/requirements/REQ-1.md")).toBe(false);
    expect(isDirectKbPath("src/kb-mcp.ts")).toBe(false);
  });

  test("classifies meaningful tracked paths", () => {
    for (const lane of [
      "requirements",
      "scenarios",
      "tests",
      "facts",
      "adr",
      "flags",
      "events",
    ]) {
      expect(isMeaningfulTrackedPath(`.kb/${lane}/x.md`)).toBe(true);
    }
    expect(isMeaningfulTrackedPath("tests/scenarios")).toBe(false);
    expect(isMeaningfulTrackedPath("x/requirements/.kb")).toBe(false);
    expect(isMeaningfulTrackedPath("README.md/")).toBe(true);
    expect(isMeaningfulTrackedPath("src//a.ts")).toBe(true);
    expect(isMeaningfulTrackedPath("dist/README.md")).toBe(false);
    expect(isMeaningfulTrackedPath("src/md")).toBe(false);

    const cases: Array<[string, boolean]> = [
      ["src/a.ts", true],
      ["tests/a.py", true],
      ["test/a.go", true],
      ["app/src/a.rs", true],
      ["src/asset.bin", false],
      ["dist/a.ts", false],
      ["nested/dist/a.ts", false],
      ["docs/guide.md", true],
      ["documentation/guide.rst", true],
      ["docs/build.ts", false],
      ["README.md", true],
      ["nested/README.md", true],
      [".kb/requirements/REQ-1.md", true],
      [".kb/symbols.yaml", true],
      [".kb/symbol-coordinates.yaml", true],
      [".kb/random/thing.md", false],
      [".kb/proof/runs/x.json", false],
      ["unrelated/file.ts", false],
      ["unrelated/README.md", true],
      ["", false],
      ["src/", false],
    ];
    for (const [candidate, expected] of cases) {
      expect(isMeaningfulTrackedPath(candidate)).toBe(expected);
    }
  });

  test("classifies source impact relevant paths", () => {
    const cases: Array<[string, boolean]> = [
      ["src/a.ts", true],
      ["app/src/main.go", true],
      ["src/a.md", false],
      ["tests/a.ts", false],
      ["test/a.ts", false],
      ["docs/a.ts", false],
      ["documentation/a.ts", false],
      [".kb/requirements/x.ts", false],
      ["dist/a.ts", false],
      ["lib/a.ts", false],
      ["src/directory/a.tsx", true],
      ["src/asset.bin", false],
      ["dist/src/a.ts", false],
      ["tests/src/a.ts", false],
      ["test/src/a.ts", false],
      ["docs/src/a.ts", false],
      ["documentation/src/a.ts", false],
      [".kb/src/a.ts", false],
      ["src/a.min.js", true],
    ];
    for (const [candidate, expected] of cases) {
      expect(isSourceImpactRelevantPath(candidate)).toBe(expected);
    }
  });
});

describe("Codex workspace opt-in", () => {
  test("environment overrides win over the directory walk", () => {
    const withManifest = createTempRoot("kibi-codex-optin-");
    const withoutManifest = createTempRoot("kibi-codex-plain-");
    tempRoots.push(withManifest, withoutManifest);
    optInWorkspace(withManifest);

    for (const key of KIBI_WORKSPACE_ENV_KEYS) {
      const resolution = resolveKibiWorkspace(withoutManifest, {
        [key]: withManifest,
      } as NodeJS.ProcessEnv);
      expect(resolution).toEqual({ root: withManifest, optedIn: true });
    }
    expect(
      resolveKibiWorkspace(withManifest, {
        KIBI_WORKSPACE: `  ${withoutManifest}  `,
      } as NodeJS.ProcessEnv),
    ).toEqual({ root: withoutManifest, optedIn: false });
  });

  test("the walk stops at the first manifest or git boundary", () => {
    const opted = createTempRoot("kibi-codex-optin-");
    optInWorkspace(opted);
    const nested = path.join(opted, "src", "deep");
    fs.mkdirSync(nested, { recursive: true });
    expect(resolveKibiWorkspace(nested)).toEqual({
      root: opted,
      optedIn: true,
    });

    const plain = createTempRoot("kibi-codex-plain-");
    fs.mkdirSync(path.join(plain, ".git"), { recursive: true });
    const inner = path.join(plain, "src");
    fs.mkdirSync(inner, { recursive: true });
    expect(resolveKibiWorkspace(inner)).toEqual({
      root: plain,
      optedIn: false,
    });
  });

  test("blank start dirs fall back to the process cwd", () => {
    const opted = createTempRoot("kibi-codex-optin-");
    optInWorkspace(opted);
    const originalCwd = process.cwd();
    process.chdir(opted);
    try {
      expect(resolveKibiWorkspace(undefined)).toEqual({
        root: opted,
        optedIn: true,
      });
      expect(resolveKibiWorkspace("   ")).toEqual({
        root: opted,
        optedIn: true,
      });
    } finally {
      process.chdir(originalCwd);
    }
  });

  test("whitespace start dirs resolve literally, not as the workspace", () => {
    const opted = createTempRoot("kibi-codex-optin-");
    tempRoots.push(opted);
    optInWorkspace(opted);
    const plain = createTempRoot("kibi-codex-plain-");
    tempRoots.push(plain);
    fs.mkdirSync(path.join(plain, ".git"), { recursive: true });
    const literal = path.join(plain, "   ");
    fs.mkdirSync(path.join(literal, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(literal, ".kb", "manifest.json"), "{}");

    const originalCwd = process.cwd();
    process.chdir(plain);
    try {
      expect(resolveKibiWorkspace("   ")).toEqual({
        root: plain,
        optedIn: false,
      });
    } finally {
      process.chdir(originalCwd);
    }
    expect(resolveKibiWorkspace(literal)).toEqual({
      root: literal,
      optedIn: true,
    });
  });

  test("blank start dirs fall back to the process cwd", () => {
    const plain = createTempRoot("kibi-codex-plain-");
    tempRoots.push(plain);
    const originalCwd = process.cwd();
    process.chdir(plain);
    try {
      expect(resolveKibiWorkspace("   ")).toEqual({
        root: path.join(plain, "   "),
        optedIn: false,
      });
    } finally {
      process.chdir(originalCwd);
    }
  });
});

describe("Codex reminder messages", () => {
  test("freshness reminders list a preview and a remaining count", () => {
    const paths = Array.from({ length: 12 }, (_, i) => `src/f${i}.ts`);
    expect(freshnessReminder(paths)).toBe(
      [
        "Kibi freshness reminder: source, test, or documentation paths changed during this Codex session.",
        "Before finishing, use Kibi MCP tools to resolve KB freshness or record a no-impact rationale.",
        ...paths.slice(0, 10).map((p) => `- ${p}`),
        "- …and 2 more",
      ].join("\n"),
    );
    expect(freshnessReminder(["src/a.ts"])).toBe(
      [
        "Kibi freshness reminder: source, test, or documentation paths changed during this Codex session.",
        "Before finishing, use Kibi MCP tools to resolve KB freshness or record a no-impact rationale.",
        "- src/a.ts",
      ].join("\n"),
    );
  });

  test("impact reminders embed the exact kb_check invocation", () => {
    const paths = ["src/a.ts", "src/b.ts"];
    expect(impactCheckReminder(paths)).toBe(
      [
        "Kibi impact reminder: source paths changed during this Codex session.",
        `Run kb_check({sourceFiles:${JSON.stringify(paths)}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) before finishing.`,
        "Review symbol granularity and semantic review of linked requirements/tests before stopping.",
        "- src/a.ts",
        "- src/b.ts",
      ].join("\n"),
    );
    const many = Array.from({ length: 11 }, (_, i) => `src/s${i}.ts`);
    expect(impactCheckReminder(many).split("\n").at(-1)).toBe("- …and 1 more");
  });

  test("the direct edit warning keeps its exact copy", () => {
    expect(DIRECT_KB_EDIT_WARNING).toBe(
      "Avoid direct edits to .kb/. Use Kibi MCP tools for KB discovery and mutations so project memory stays valid.",
    );
  });
});

describe("Codex hook runner decisions", () => {
  test("PreToolUse warns only for editable tools touching the kb", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    optInWorkspace(cwd);

    const kbEdit = await runHook(
      {
        event: "PreToolUse",
        cwd,
        toolName: "Edit",
        toolInput: { file_path: [".kb/requirements/REQ-1.md"] },
      },
      { pluginData },
    );
    expect(kbEdit).toEqual({
      continue: true,
      systemMessage: DIRECT_KB_EDIT_WARNING,
    });

    const mixedPaths = await runHook(
      {
        event: "PreToolUse",
        cwd,
        toolName: "Write",
        toolInput: { file_path: ["src/a.ts", ".kb/facts/F.md"] },
      },
      { pluginData },
    );
    expect(mixedPaths.systemMessage).toBe(DIRECT_KB_EDIT_WARNING);

    const nonEditableTool = await runHook(
      {
        event: "PreToolUse",
        cwd,
        toolName: "Bash",
        toolInput: { file_path: ".kb/requirements/REQ-1.md" },
      },
      { pluginData },
    );
    expect(nonEditableTool).toEqual({ continue: true });

    const noKbPath = await runHook(
      {
        event: "PreToolUse",
      },
      { pluginData },
    );
    expect(noKbPath).toEqual({ continue: true });

    const sessionStart = await runHook(
      { event: "SessionStart", cwd },
      {
        pluginData,
      },
    );
    expect(sessionStart).toEqual({ continue: true });
  });

  test("an unknown tool name still warns on direct kb edits", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    optInWorkspace(cwd);

    const result = await runHook(
      {
        event: "PreToolUse",
        cwd,
        toolInput: { file_path: ".kb/requirements/REQ-1.md" },
      },
      { pluginData },
    );
    expect(result.systemMessage).toBe(DIRECT_KB_EDIT_WARNING);
  });

  test("every editable tool triggers the direct kb warning", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    optInWorkspace(cwd);

    for (const toolName of ["Edit", "MultiEdit", "Write", "apply_patch"]) {
      const result = await runHook(
        {
          event: "PreToolUse",
          cwd,
          toolName,
          toolInput: { file_path: ".kb/requirements/REQ-1.md" },
        },
        { pluginData },
      );
      expect(result.systemMessage).toBe(DIRECT_KB_EDIT_WARNING);
    }
  });

  test("Stop with only checked dirty paths clears silently", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    optInWorkspace(cwd);
    const stateDir = resolveWorkspaceStateDir(pluginData, cwd);

    addDirtyPaths(stateDir, ["src/a.ts"]);
    recordKbMcpTool(stateDir, "kb_check", {
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });

    const result = await runHook({ event: "Stop", cwd }, { pluginData });
    expect(result).toEqual({ continue: true });
    expect(loadHookState(stateDir).dirtyPaths).toEqual([]);
  });

  test("PostToolUse tracks only meaningful paths and records kb tools", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    optInWorkspace(cwd);

    await runHook(
      {
        event: "PostToolUse",
        cwd,
        toolName: "Write",
        toolInput: { file_path: "untracked.bin" },
      },
      { pluginData },
    );
    const stateDir = resolveWorkspaceStateDir(pluginData, cwd);
    expect(fs.existsSync(journalFile(stateDir ?? ""))).toBe(false);

    await runHook(
      {
        event: "PostToolUse",
        cwd,
        toolName: "Write",
        toolInput: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    expect(loadHookState(stateDir).dirtyPaths).toEqual(["src/a.ts"]);
  });

  test("Stop clears state once reminders are issued", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    optInWorkspace(cwd);
    const stateDir = resolveWorkspaceStateDir(pluginData, cwd);

    addDirtyPaths(stateDir, ["src/a.ts", "docs/b.md"]);
    recordKbMcpTool(stateDir, "kb_check", {
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });

    const result = await runHook({ event: "Stop", cwd }, { pluginData });
    expect(result.continue).toBe(true);
    expect(result.systemMessage?.startsWith("Kibi freshness reminder:")).toBe(
      true,
    );
    expect(result.systemMessage).toContain("- docs/b.md");
    expect(loadHookState(stateDir).dirtyPaths).toEqual([]);

    const unchecked = createTempRoot("kibi-codex-cwd2-");
    const uncheckedData = createTempRoot("kibi-codex-data2-");
    tempRoots.push(unchecked, uncheckedData);
    optInWorkspace(unchecked);
    const uncheckedDir = resolveWorkspaceStateDir(uncheckedData, unchecked);
    addDirtyPaths(uncheckedDir, ["src/a.ts"]);

    const impactResult = await runHook(
      { event: "Stop", cwd: unchecked },
      { pluginData: uncheckedData },
    );
    expect(
      impactResult.systemMessage?.startsWith("Kibi impact reminder:"),
    ).toBe(true);
    expect(loadHookState(uncheckedDir).dirtyPaths).toEqual([]);
  });

  test("Stop without outstanding work clears silently", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    optInWorkspace(cwd);
    const stateDir = resolveWorkspaceStateDir(pluginData, cwd);

    recordKbMcpTool(stateDir, "kb_skills_list");
    const journalPath = journalFile(stateDir as string);
    const journalWithOnlyNoise = `${JSON.stringify({ kind: "mystery" })}\n`;
    fs.mkdirSync(path.dirname(journalPath), { recursive: true });
    fs.writeFileSync(journalPath, journalWithOnlyNoise, "utf8");

    const result = await runHook({ event: "Stop", cwd }, { pluginData });
    expect(result).toEqual({ continue: true });
    expect(fs.readFileSync(journalPath, "utf8")).toBe(journalWithOnlyNoise);

    await runHook({ event: "Stop", cwd }, { pluginData });
    expect(loadHookState(stateDir).kbCheckRun).toBe(false);
  });

  test("a checked, empty state yields a plain continue", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    optInWorkspace(cwd);
    const stateDir = resolveWorkspaceStateDir(pluginData, cwd);

    recordKbMcpTool(stateDir, "kb_check", {
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
    const result = await runHook({ event: "Stop", cwd }, { pluginData });
    expect(result).toEqual({ continue: true });
    expect(loadHookState(stateDir)).toEqual({
      dirtyPaths: [],
      kbCheckRun: false,
      impactCheckRun: false,
      impactCheckedPaths: [],
    });
  });
});

describe("Codex hook CLI surface", () => {
  async function withStdin<T>(raw: string, fn: () => Promise<T>): Promise<T> {
    const original = Object.getOwnPropertyDescriptor(process, "stdin");
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: Readable.from([raw]),
    });
    try {
      return await fn();
    } finally {
      if (original) {
        Object.defineProperty(process, "stdin", original);
      }
    }
  }

  test("main writes the hook result as one json line", async () => {
    const writes: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(
        typeof chunk === "string" ? chunk : Buffer.from(chunk).toString(),
      );
      return true;
    }) as typeof process.stdout.write;
    try {
      await withStdin('{"event":"SessionStart"}', () => main());
    } finally {
      process.stdout.write = originalWrite;
    }
    expect(writes).toEqual(['{"continue":true}\n']);
  });

  test("runHookCli reports errors with continue true", async () => {
    const writes: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(
        typeof chunk === "string" ? chunk : Buffer.from(chunk).toString(),
      );
      return true;
    }) as typeof process.stdout.write;
    try {
      await withStdin("not json", () => runHookCli());
    } finally {
      process.stdout.write = originalWrite;
    }
    expect(writes).toHaveLength(1);
    const parsed = JSON.parse(writes[0] ?? "{}") as {
      continue: boolean;
      systemMessage: string;
    };
    expect(parsed.continue).toBe(true);
    expect(parsed.systemMessage).toContain("Kibi hook runner error");
  });

  test("non-error rejections report the unknown hook error copy", async () => {
    const writes: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(
        typeof chunk === "string" ? chunk : Buffer.from(chunk).toString(),
      );
      return true;
    }) as typeof process.stdout.write;
    const originalStdin = Object.getOwnPropertyDescriptor(process, "stdin");
    const explodingStdin: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        return {
          next: (): Promise<IteratorResult<string>> =>
            Promise.reject("non-error failure"),
        };
      },
    };
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: explodingStdin,
    });
    try {
      await runHookCli();
    } finally {
      process.stdout.write = originalWrite;
      if (originalStdin) {
        Object.defineProperty(process, "stdin", originalStdin);
      }
    }
    expect(writes.some((line) => line.includes("Unknown hook error"))).toBe(
      true,
    );
  });

  test("isInvokedAsCli requires a matching resolved argv1", () => {
    expect(isInvokedAsCli(undefined, "Stryker was here!")).toBe(false);
    expect(isInvokedAsCli(undefined, "file:///tmp/hook.ts")).toBe(false);
    expect(isInvokedAsCli("/tmp/hook.ts", "file:///tmp/hook.ts")).toBe(true);
  });
});

describe("Codex plugin manifest export", () => {
  test("the default export identifies the plugin", async () => {
    const plugin = (await import("../src/index")) as {
      default: { name: string; adapterKind: string };
    };
    expect(plugin.default).toEqual({
      name: "kibi-codex",
      adapterKind: "codex-plugin",
    });
  });
});
