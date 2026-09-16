// Behavioral contracts for the Cursor plugin: hook input parsing, locked
// state storage, guided-path state, MCP tool-call extraction, path policy,
// guidance/advisory messages, and the hook runner. Each assertion pins
// observable output or error contracts so the mutation suite fails if a
// contract breaks.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import { readGuidance, writeGuidance } from "../src/guidance";
import {
  type HookStopStatus,
  parseHookInput,
  parseStdinJson,
  readStdin,
} from "../src/hook-input";
import { isInvokedAsCli, main, runHook, runHookCli } from "../src/hook-runner";
import {
  addDirtyPaths,
  clearSessionHookState,
  hasGuidedPath,
  loadHookState,
  recordKbMcpTool,
  recordPlanDelivered,
  rememberGuidedPath,
  resolveStateDir,
} from "../src/hook-state";
import {
  maxDirtyPaths,
  maxGuidedPaths,
  mergeStringPaths,
  normalizePath,
  saveHookState,
  updateHookState,
} from "../src/hook-state-storage";
import cursorPlugin from "../src/index";
import {
  extractKbMcpToolCall,
  extractKbMcpToolName,
  resolveKibiInterface,
} from "../src/kb-mcp-tools";
import {
  BOOTSTRAP_REMINDER,
  DIRECT_KB_EDIT_WARNING,
  interfaceAdvisory,
  stopFollowupMessage,
} from "../src/messages";
import {
  extractExplicitPathFields,
  isDirectKbPath,
  isDocumentationTrackedPath,
  isKbFreshnessRelevantPath,
  isMeaningfulTrackedPath,
  isSourceImpactRelevantPath,
  toRepoRelativePath,
} from "../src/path-policy";

function createTempRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const tempRoots: string[] = [];

function tempDir(prefix: string): string {
  const dir = createTempRoot(prefix);
  tempRoots.push(dir);
  return dir;
}

const EMPTY_HOOK_STATE: import("../src/hook-state").HookState = {
  mcpState: "unknown",
  dirtyPaths: [],
  guidedReadPaths: [],
  guidedWritePaths: [],
  kbMutationTools: [],
  kbCheckRun: false,
  impactCheckRun: false,
  impactCheckedPaths: [],
  planDelivered: false,
};

beforeEach(() => {
  for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"]) {
    delete process.env[key];
  }
});

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function stateFile(stateDir: string): string {
  return path.join(stateDir, "hook-state.json");
}

describe("Cursor plugin manifest export", () => {
  test("the default export identifies the plugin", () => {
    expect(cursorPlugin).toEqual({
      name: "kibi-cursor",
      adapterKind: "cursor-plugin",
    });
  });
});

describe("Cursor hook input parsing", () => {
  test("non-record inputs degrade to an unknown event", () => {
    for (const bad of [null, 42, "text", [], true]) {
      expect(parseHookInput(bad)).toStrictEqual({ event: "" });
    }
    expect(parseHookInput({})).toStrictEqual({ event: "" });
  });

  test("event aliases are honored and normalized to camelCase", () => {
    expect(parseHookInput({ event: "SessionStart" }).event).toBe(
      "sessionStart",
    );
    expect(parseHookInput({ hook_event: "PostToolUse" }).event).toBe(
      "postToolUse",
    );
    expect(parseHookInput({ hookEvent: "Stop" }).event).toBe("stop");
    expect(parseHookInput({ hook_event_name: "BeforeReadFile" }).event).toBe(
      "beforeReadFile",
    );
    expect(parseHookInput({ name: "PreToolUse" }).event).toBe("preToolUse");
    expect(parseHookInput({ event: " Stop " })).toStrictEqual({
      event: "stop",
    });
    expect(parseHookInput({ event: "   " })).toStrictEqual({ event: "" });
  });

  test("field aliases are honored for every parsed field", () => {
    expect(parseHookInput({ cwd: "/w" })).toStrictEqual({
      event: "",
      cwd: "/w",
    });
    expect(parseHookInput({ workspace: "/w" })).toStrictEqual({
      event: "",
      cwd: "/w",
    });
    expect(parseHookInput({ workspace_roots: ["/a"] })).toStrictEqual({
      event: "",
      workspaceRoots: ["/a"],
    });
    expect(parseHookInput({ workspaceRoots: ["/a"] })).toStrictEqual({
      event: "",
      workspaceRoots: ["/a"],
    });
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
    expect(parseHookInput({ conversation_id: "c1" })).toStrictEqual({
      event: "",
      conversationId: "c1",
    });
    expect(parseHookInput({ conversationId: "c1" })).toStrictEqual({
      event: "",
      conversationId: "c1",
    });
    expect(parseHookInput({ file_path: "/f.ts" })).toStrictEqual({
      event: "",
      filePath: "/f.ts",
    });
    expect(parseHookInput({ filePath: "/f.ts" })).toStrictEqual({
      event: "",
      filePath: "/f.ts",
    });
    expect(parseHookInput({ path: "/f.ts" })).toStrictEqual({
      event: "",
      filePath: "/f.ts",
    });
  });

  test("absent optional fields stay absent", () => {
    expect(parseHookInput({ event: "stop" })).toStrictEqual({ event: "stop" });
  });

  test("statuses are validated against the known set", () => {
    expect(parseHookInput({ event: "stop", status: "completed" }).status).toBe(
      "completed",
    );
    expect(parseHookInput({ event: "stop", status: "aborted" }).status).toBe(
      "aborted",
    );
    expect(parseHookInput({ event: "stop", status: "error" }).status).toBe(
      "error",
    );
    expect(
      parseHookInput({ event: "stop", status: "other" }).status,
    ).toBeUndefined();
  });

  test("workspace root lists drop non-strings, empties, and nested arrays", () => {
    expect(
      parseHookInput({ workspaceRoots: [["x"], " /a ", ""] }).workspaceRoots,
    ).toStrictEqual([" /a "]);
    expect(
      parseHookInput({ workspaceRoots: "nope" }).workspaceRoots,
    ).toBeUndefined();
    expect(
      parseHookInput({ workspaceRoots: [42] }).workspaceRoots,
    ).toBeUndefined();
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
    expect(parseStdinJson('{"event":"stop"}')).toStrictEqual({ event: "stop" });
  });
});

describe("Cursor hook state storage", () => {
  test("mergeStringPaths normalizes, drops blanks, dedupes, and bounds", () => {
    expect(
      mergeStringPaths([" src\\a.ts ", "src/a.ts"], ["   ", "", "src/b.ts"]),
    ).toEqual(["src/a.ts", "src/b.ts"]);
    const many = Array.from({ length: maxGuidedPaths + 10 }, (_, i) => `p${i}`);
    const merged = mergeStringPaths([], many);
    expect(merged).toHaveLength(maxGuidedPaths);
    expect(merged[0]).toBe("p10");
  });

  test("normalizePath trims and flips separators", () => {
    expect(normalizePath("  src\\a.ts  ")).toBe("src/a.ts");
  });

  test("coercion filters non-strings and preserves typed flags", () => {
    const stateDir = tempDir("kibi-cursor-storage-");
    fs.writeFileSync(
      stateFile(stateDir),
      JSON.stringify({
        dirtyPaths: [1, " src/a.ts "],
        guidedReadPaths: [2, " src/r.ts "],
        guidedWritePaths: [3, " src/w.ts "],
        kbMutationTools: [4, " kb_upsert "],
        impactCheckedPaths: [5, " src/c.ts "],
        mcpState: "bogus",
        kbCheckRun: "yes",
        impactCheckRun: 1,
        planDelivered: "true",
      }),
      "utf8",
    );
    expect(loadHookState(stateDir)).toStrictEqual({
      ...EMPTY_HOOK_STATE,
      dirtyPaths: ["src/a.ts"],
      guidedReadPaths: ["src/r.ts"],
      guidedWritePaths: ["src/w.ts"],
      kbMutationTools: ["kb_upsert"],
      impactCheckedPaths: ["src/c.ts"],
    });
  });

  test("missing lists coerce to empty instead of placeholder data", () => {
    const stateDir = tempDir("kibi-cursor-storage-");
    fs.writeFileSync(
      stateFile(stateDir),
      JSON.stringify({ kbCheckRun: true }),
      "utf8",
    );
    expect(loadHookState(stateDir)).toStrictEqual({
      ...EMPTY_HOOK_STATE,
      kbCheckRun: true,
    });
  });

  test("snapshot lists are bounded during coercion", () => {
    const stateDir = tempDir("kibi-cursor-storage-");
    fs.writeFileSync(
      stateFile(stateDir),
      JSON.stringify({
        dirtyPaths: Array.from(
          { length: maxDirtyPaths + 5 },
          (_, i) => `src/d${i}.ts`,
        ),
        guidedWritePaths: Array.from(
          { length: maxGuidedPaths + 5 },
          (_, i) => `src/w${i}.ts`,
        ),
        impactCheckedPaths: Array.from(
          { length: maxGuidedPaths + 5 },
          (_, i) => `src/c${i}.ts`,
        ),
      }),
      "utf8",
    );
    const state = loadHookState(stateDir);
    expect(state.dirtyPaths).toHaveLength(maxDirtyPaths);
    expect(state.dirtyPaths[0]).toBe("src/d5.ts");
    expect(state.guidedWritePaths).toHaveLength(maxGuidedPaths);
    expect(state.guidedWritePaths[0]).toBe("src/w5.ts");
    expect(state.impactCheckedPaths).toHaveLength(maxGuidedPaths);
    expect(state.impactCheckedPaths[0]).toBe("src/c5.ts");
  });

  test("true flags coerce to true through a snapshot", () => {
    const stateDir = tempDir("kibi-cursor-storage-");
    fs.writeFileSync(
      stateFile(stateDir),
      JSON.stringify({ impactCheckRun: true, planDelivered: true }),
      "utf8",
    );
    const state = loadHookState(stateDir);
    expect(state.impactCheckRun).toBe(true);
    expect(state.planDelivered).toBe(true);
  });

  test("observed mcp state survives a round trip", () => {
    const stateDir = tempDir("kibi-cursor-storage-");
    fs.writeFileSync(
      stateFile(stateDir),
      JSON.stringify({ ...EMPTY_HOOK_STATE, mcpState: "observed" }),
      "utf8",
    );
    expect(loadHookState(stateDir).mcpState).toBe("observed");
  });

  test("unwritable state dirs fall back to in-memory updates", () => {
    const stateDir = tempDir("kibi-cursor-storage-");
    const lockedDir = path.join(stateDir, "locked");
    fs.mkdirSync(lockedDir, { recursive: true });
    fs.symlinkSync(
      path.join(stateDir, "does-not-exist"),
      path.join(lockedDir, "hook-state.lock"),
    );
    const result = updateHookState(lockedDir, (state) => ({
      ...state,
      dirtyPaths: ["src/a.ts"],
    }));
    expect(result.dirtyPaths).toEqual(["src/a.ts"]);
    expect(fs.existsSync(stateFile(lockedDir))).toBe(false);
  });

  test("a fresh external lock prevents persistence", () => {
    const stateDir = tempDir("kibi-cursor-storage-");
    fs.mkdirSync(stateDir, { recursive: true });
    fs.closeSync(fs.openSync(path.join(stateDir, "hook-state.lock"), "wx"));
    const result = updateHookState(stateDir, (state) => ({
      ...state,
      dirtyPaths: ["src/a.ts"],
    }));
    expect(result.dirtyPaths).toEqual(["src/a.ts"]);
    expect(fs.existsSync(stateFile(stateDir))).toBe(false);
  });

  test("a stale external lock is reclaimed and the update persists", () => {
    const stateDir = tempDir("kibi-cursor-storage-");
    fs.mkdirSync(stateDir, { recursive: true });
    const lock = path.join(stateDir, "hook-state.lock");
    fs.closeSync(fs.openSync(lock, "wx"));
    const stale = new Date(Date.now() - 60_000);
    fs.utimesSync(lock, stale, stale);
    const result = updateHookState(stateDir, (state) => ({
      ...state,
      dirtyPaths: ["src/a.ts"],
    }));
    expect(result.dirtyPaths).toEqual(["src/a.ts"]);
    expect(loadHookState(stateDir).dirtyPaths).toEqual(["src/a.ts"]);
    expect(fs.existsSync(lock)).toBe(false);
  });

  test("state lists are bounded to their maximum sizes", () => {
    const stateDir = tempDir("kibi-cursor-storage-");
    const dirty = Array.from(
      { length: maxDirtyPaths + 10 },
      (_, i) => `src/d${i}.ts`,
    );
    let state = addDirtyPaths(stateDir, dirty);
    expect(state.dirtyPaths).toHaveLength(maxDirtyPaths);
    expect(state.dirtyPaths[0]).toBe("src/d10.ts");

    for (let i = 0; i < maxGuidedPaths + 10; i++) {
      state = rememberGuidedPath(stateDir, "read", `src/g${i}.ts`);
    }
    expect(state.guidedReadPaths).toHaveLength(maxGuidedPaths);
    expect(state.guidedReadPaths[0]).toBe("src/g10.ts");
  });

  test("loading undefined state dirs yields empty state", () => {
    expect(loadHookState(undefined)).toEqual(EMPTY_HOOK_STATE);
    expect(resolveStateDir(undefined, undefined)).toBeUndefined();
    expect(resolveStateDir("data", undefined)).toBe("data");
    expect(
      resolveStateDir(undefined, "conversation/with:weird chars")?.startsWith(
        path.join(os.tmpdir(), "kibi-cursor-hook-state"),
      ),
    ).toBe(true);
  });
});

describe("Cursor guided path state", () => {
  test("read and write buckets are tracked independently", () => {
    const stateDir = tempDir("kibi-cursor-guided-");
    rememberGuidedPath(stateDir, "read", "src/a.ts");
    expect(hasGuidedPath(loadHookState(stateDir), "read", "src/a.ts")).toBe(
      true,
    );
    expect(hasGuidedPath(loadHookState(stateDir), "write", "src/a.ts")).toBe(
      false,
    );
    rememberGuidedPath(stateDir, "write", "src\\a.ts ");
    expect(hasGuidedPath(loadHookState(stateDir), "write", "src/a.ts")).toBe(
      true,
    );
  });

  test("blank guided paths never write state", () => {
    const stateDir = tempDir("kibi-cursor-guided-");
    const state = rememberGuidedPath(stateDir, "read", "   ");
    expect(state.guidedReadPaths).toEqual([]);
  });

  test("plan delivery is recorded once and clear resets the session", () => {
    const stateDir = tempDir("kibi-cursor-guided-");
    recordPlanDelivered(stateDir);
    expect(loadHookState(stateDir).planDelivered).toBe(true);
    recordPlanDelivered(stateDir);
    expect(loadHookState(stateDir).planDelivered).toBe(true);

    addDirtyPaths(stateDir, ["src/a.ts"]);
    const cleared = clearSessionHookState(stateDir);
    expect(cleared).toEqual(EMPTY_HOOK_STATE);
    expect(loadHookState(stateDir)).toEqual(EMPTY_HOOK_STATE);
    expect(clearSessionHookState(undefined)).toEqual(EMPTY_HOOK_STATE);
  });

  test("kb tool records observe mcp and distinguish check semantics", () => {
    const stateDir = tempDir("kibi-cursor-guided-");

    const observed = recordKbMcpTool(stateDir, " kb_skills_list ");
    expect(observed.mcpState).toBe("observed");
    expect(observed.kbCheckRun).toBe(false);

    const unchecked = recordKbMcpTool(stateDir, "kb_check", {});
    expect(unchecked.kbCheckRun).toBe(true);
    expect(unchecked.impactCheckRun).toBe(false);
    expect(unchecked.impactCheckedPaths).toEqual([]);

    const checked = recordKbMcpTool(stateDir, "kb_check", {
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
    expect(checked.impactCheckRun).toBe(true);
    expect(checked.impactCheckedPaths).toEqual(["src/a.ts"]);

    const mutations = recordKbMcpTool(stateDir, "kb_upsert");
    expect(mutations.kbMutationTools).toEqual(["kb_upsert"]);

    expect(recordKbMcpTool(stateDir, "   ")).toEqual(loadHookState(stateDir));

    const trimmedDir = tempDir("kibi-cursor-guided-trim-");
    const trimmedCheck = recordKbMcpTool(trimmedDir, "  kb_check  ", {
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
    expect(trimmedCheck.kbCheckRun).toBe(true);
    expect(trimmedCheck.impactCheckedPaths).toEqual(["src/a.ts"]);

    const noFilesDir = tempDir("kibi-cursor-guided-nofiles-");
    const noFiles = recordKbMcpTool(noFilesDir, "kb_check", {
      impactCheckRun: true,
    });
    expect(noFiles.impactCheckRun).toBe(true);
    expect(noFiles.impactCheckedPaths).toEqual([]);
  });
});

describe("Cursor kb mcp tool call extraction", () => {
  test("direct kb tool names survive non-record tool input", () => {
    expect(extractKbMcpToolCall(" kb_check ", null)).toEqual({
      toolName: "kb_check",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(extractKbMcpToolCall("kb_status", undefined)).toEqual({
      toolName: "kb_status",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(extractKbMcpToolCall(undefined, null)).toBeUndefined();
  });

  test("tool name aliases inside tool input are honored", () => {
    expect(extractKbMcpToolCall(undefined, { toolName: "kb_status" })).toEqual({
      toolName: "kb_status",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(extractKbMcpToolCall(undefined, { tool_name: "kb_status" })).toEqual(
      {
        toolName: "kb_status",
        impactCheckRun: false,
        sourceFiles: [],
      },
    );
    expect(extractKbMcpToolCall(undefined, { name: "kb_status" })).toEqual({
      toolName: "kb_status",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(
      extractKbMcpToolCall(undefined, { unrelated: true }),
    ).toBeUndefined();
  });

  test("nested tool names are extracted without impact flags", () => {
    expect(
      extractKbMcpToolCall(undefined, { arguments: { name: "kb_upsert" } }),
    ).toEqual({
      toolName: "kb_upsert",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(
      extractKbMcpToolCall(undefined, { args: { tool_name: "kb_delete" } }),
    ).toEqual({
      toolName: "kb_delete",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(
      extractKbMcpToolName(undefined, { arguments: { name: "kb_upsert" } }),
    ).toBe("kb_upsert");
    expect(extractKbMcpToolName(undefined, { arguments: {} })).toBeUndefined();
    expect(extractKbMcpToolName(undefined, null)).toBeUndefined();
  });

  test("impact checks require kb_check, both flags, and source files", () => {
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
      extractKbMcpToolCall("kb_check", {
        arguments: {
          includeImpactDiagnostics: true,
          includeWorkingTreeDiff: true,
          sourceFiles: [],
        },
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: false,
      sourceFiles: [],
    });
  });

  test("boolean flags accept snake case aliases and source lists are filtered", () => {
    expect(
      extractKbMcpToolCall("kb_check", {
        arguments: {
          include_impact_diagnostics: true,
          include_working_tree_diff: true,
          source_files: [["x"], "src/a.ts", ""],
        },
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
    expect(
      extractKbMcpToolCall("kb_check", {
        arguments: { sourceFiles: "nope" },
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: false,
      sourceFiles: [],
    });
  });

  test("extractKbMcpToolName falls back to trimmed direct tool names", () => {
    expect(extractKbMcpToolName(" kb_upsert ", {})).toBe("kb_upsert");
    expect(extractKbMcpToolName("Edit", {})).toBeUndefined();
  });

  test("interface selection follows observed mcp state and trust", () => {
    expect(resolveKibiInterface("observed", false)).toBe("mcp");
    expect(resolveKibiInterface("observed", true)).toBe("mcp");
    expect(resolveKibiInterface("unknown", true)).toBe("cli");
    expect(resolveKibiInterface("unknown", false)).toBe("setup");
  });
});

describe("Cursor path policy", () => {
  test("freshness lanes cover every canonical kb lane and manifest file", () => {
    for (const lane of [
      "requirements",
      "scenarios",
      "tests",
      "facts",
      "adr",
      "flags",
      "events",
      "symbols.yaml",
      "symbol-coordinates.yaml",
    ]) {
      expect(isKbFreshnessRelevantPath(`.kb/${lane}`)).toBe(true);
    }
    expect(isKbFreshnessRelevantPath(".kb/random")).toBe(false);
    expect(isKbFreshnessRelevantPath("documentation/x.md")).toBe(true);
    expect(isKbFreshnessRelevantPath("packages/core/src/kb.pl")).toBe(true);
    expect(isKbFreshnessRelevantPath("vendor/core/src/kb.pl")).toBe(false);
    expect(isKbFreshnessRelevantPath("packages/other/src/kb.pl")).toBe(false);
    expect(isKbFreshnessRelevantPath("packages/core/lib/kb.pl")).toBe(false);
    expect(isKbFreshnessRelevantPath("packages/core/logic/kb.pl")).toBe(false);
    expect(isKbFreshnessRelevantPath("packages/cli/src/x.ts")).toBe(false);
    expect(isKbFreshnessRelevantPath("src/a.ts")).toBe(false);
    expect(isKbFreshnessRelevantPath("tests/requirements")).toBe(false);
    expect(isKbFreshnessRelevantPath(".kb/random/x.md")).toBe(false);
  });

  test("extracts explicit path fields recursively with dedupe", () => {
    expect(
      extractExplicitPathFields({
        absolute_path: "/abs/a.ts",
        file: "src/file.ts",
        file_path: "src/fp.ts",
        FILEPATH: "src/fp2.ts",
        new_path: "src/new.ts",
        old_path: "src/old.ts",
        path: "src/p.ts",
        paths: ["src/p1.ts", { relative_path: "src/rp.ts" }],
        target_path: [["src/target.ts"]],
        url: "skip-me",
        FILE_PATH: "src/fp.ts",
      }),
    ).toEqual([
      "/abs/a.ts",
      "src/file.ts",
      "src/fp.ts",
      "src/fp2.ts",
      "src/new.ts",
      "src/old.ts",
      "src/p.ts",
      "src/p1.ts",
      "src/rp.ts",
      "src/target.ts",
    ]);
    expect(extractExplicitPathFields({ path: "   " })).toEqual([]);
    expect(extractExplicitPathFields("just a string")).toEqual([]);
    expect(extractExplicitPathFields(null)).toEqual([]);
  });

  test("detects direct .kb paths anywhere in the segment list", () => {
    expect(isDirectKbPath(".kb/requirements/REQ-1.md")).toBe(true);
    expect(isDirectKbPath("project/.kb/facts/FACT-1.md")).toBe(true);
    expect(isDirectKbPath("kbb/requirements/x.md")).toBe(false);
  });

  test("classifies meaningful tracked paths across all supported extensions", () => {
    const extensions = [
      ".c",
      ".cc",
      ".cpp",
      ".cs",
      ".css",
      ".go",
      ".h",
      ".hpp",
      ".html",
      ".java",
      ".js",
      ".jsx",
      ".kt",
      ".lua",
      ".mjs",
      ".mts",
      ".php",
      ".pl",
      ".py",
      ".rb",
      ".rs",
      ".scala",
      ".sh",
      ".swift",
      ".ts",
      ".tsx",
      ".vue",
    ];
    for (const extension of extensions) {
      expect(isMeaningfulTrackedPath(`src/module${extension}`)).toBe(true);
    }
    for (const extension of [".md", ".mdx", ".rst", ".txt"]) {
      expect(isMeaningfulTrackedPath(`docs/notes${extension}`)).toBe(true);
    }
    for (const lane of [
      "requirements",
      "scenarios",
      "tests",
      "facts",
      "adr",
      "flags",
      "events",
    ]) {
      expect(isMeaningfulTrackedPath(`.kb/${lane}/thing.md`)).toBe(true);
    }
    expect(isMeaningfulTrackedPath("documentation/guide.rst")).toBe(true);
    expect(isMeaningfulTrackedPath("x/requirements/.kb")).toBe(false);
    expect(isMeaningfulTrackedPath("README.md/")).toBe(true);

    const cases: Array<[string, boolean]> = [
      ["src/asset.bin", false],
      ["src/md", false],
      ["src/a.test.tsx", true],
      ["dist/README.md", false],
      ["docs/build.ts", false],
      ["nested/dist/a.ts", false],
      ["README.md", true],
      ["test/x.py", true],
      ["tests/x.py", true],
      [".kb/requirements/REQ-1.md", true],
      [".kb/symbols.yaml", true],
      [".kb/symbol-coordinates.yaml", true],
      [".kb/random/thing.md", false],
      ["tests/scenarios", false],
      ["unrelated/file.md", false],
      ["unrelated/README.md", true],
      ["src//intermediate.ts", true],
      ["", false],
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
      ["src/ts", false],
      ["src/a.min.js", true],
      ["lib/a.ts", false],
      ["src/asset.bin", false],
      ["tests/src/a.ts", false],
      ["test/src/a.ts", false],
      ["docs/src/a.ts", false],
      ["documentation/src/a.ts", false],
      ["dist/src/a.ts", false],
      [".kb/requirements/x.ts", false],
      [".kb/src/a.ts", false],
    ];
    for (const [candidate, expected] of cases) {
      expect(isSourceImpactRelevantPath(candidate)).toBe(expected);
    }
  });

  test("classifies documentation tracked paths", () => {
    expect(isDocumentationTrackedPath("docs/x.bin")).toBe(true);
    expect(isDocumentationTrackedPath("documentation/x")).toBe(true);
    expect(isDocumentationTrackedPath("notes/x.md")).toBe(true);
    expect(isDocumentationTrackedPath("notes/x.rst")).toBe(true);
    expect(isDocumentationTrackedPath("notes/x.txt")).toBe(true);
    expect(isDocumentationTrackedPath("notes/x.mdx")).toBe(true);
    expect(isDocumentationTrackedPath("notes/x.yaml")).toBe(false);
    expect(isDocumentationTrackedPath("notes/md")).toBe(false);
    expect(isDocumentationTrackedPath("deep/a.min.md")).toBe(true);
  });

  test("toRepoRelativePath strips the cwd prefix when present", () => {
    expect(toRepoRelativePath("/repo/src/a.ts", "/repo")).toBe("src/a.ts");
    expect(toRepoRelativePath("other/src/a.ts", "/repo")).toBe(
      "other/src/a.ts",
    );
    expect(toRepoRelativePath("  src\\a.ts  ", undefined)).toBe("src/a.ts");
    expect(toRepoRelativePath("/repo/src/a.ts", undefined)).toBe(
      "/repo/src/a.ts",
    );
  });
});

describe("Cursor guidance and advisories", () => {
  const trustedContext = {
    cwd: "/repo",
    hasKibi: true,
    mcpState: "unknown" as const,
    workspaceTrusted: true,
  };

  test("read guidance lists the discovery contract", () => {
    expect(
      readGuidance("/repo/src/a.ts", {
        ...trustedContext,
        mcpState: "observed",
      }),
    ).toBe(
      [
        "Kibi read guidance: before changing this file, discover linked knowledge through the selected MCP or CLI JSON route.",
        'Start with kb_search, then kb_query with sourceFile="src/a.ts".',
        "Prefer Kibi facts and requirements over long inline comments for durable knowledge.",
      ].join("\n"),
    );
    expect(
      readGuidance("/repo/src/a.ts", {
        ...trustedContext,
        workspaceTrusted: false,
      }),
    ).toContain(
      "Kibi MCP has not been observed in this session and workspace trust is unknown.",
    );
  });

  test("write guidance differs for documentation paths", () => {
    expect(writeGuidance("/repo/docs/guide.md", trustedContext)).toBe(
      [
        interfaceAdvisory("unknown", true) ?? "",
        "Kibi write guidance: keep REQ, SCEN, and TEST artifacts separate.",
        "Query before mutate. Update KB entities through kb_upsert sequentially. Run kb_check before completion.",
        "Do not read or edit `.kb/` files directly.",
      ].join("\n"),
    );
    const codeGuidance = writeGuidance("/repo/src/a.ts", {
      ...trustedContext,
      mcpState: "observed",
    });
    expect(codeGuidance).toBeDefined();
    expect(codeGuidance).toContain(
      'kb_check({sourceFiles:["src/a.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})',
    );
    expect(codeGuidance).toContain(
      'resolve freshness with kb_search/kb_query for sourceFile="src/a.ts"',
    );
    expect(codeGuidance).toContain(
      "Prefer symbol manifest + executable_for or // implements REQ-xxx for traceability.",
    );
    expect(codeGuidance?.split("\n")[0]).toBe(
      "Kibi write guidance: use the selected MCP or CLI JSON route to link production symbols to requirements.",
    );
    expect(codeGuidance).toContain(
      "Do not read or edit `.kb/` files directly. Query before mutate; run kb_upsert sequentially and kb_check before completion.",
    );
  });

  test("guidance is withheld outside kibi workspaces or tracked paths", () => {
    expect(
      readGuidance("/repo/src/a.ts", { ...trustedContext, hasKibi: false }),
    ).toBeUndefined();
    expect(readGuidance("/repo/untracked.bin", trustedContext)).toBeUndefined();
    expect(
      writeGuidance("/repo/untracked.bin", trustedContext),
    ).toBeUndefined();
  });

  test("guidance prepends the advisory as its own line", () => {
    const readAdvisory = readGuidance("/repo/src/a.ts", trustedContext);
    expect(readAdvisory?.split("\n")).toHaveLength(4);
    expect(readAdvisory?.split("\n")[0]).toBe(
      "Kibi MCP has not been observed in this session. In this explicitly trusted workspace, the project-local CLI is an advisory fallback: use npx --no-install kibi or bunx --no-install kibi. Do not use global or installing runners.",
    );

    const docAdvisory = writeGuidance("/repo/docs/guide.md", {
      ...trustedContext,
      mcpState: "observed",
    });
    expect(docAdvisory?.split("\n")).toHaveLength(3);

    const codeAdvisory = writeGuidance("/repo/src/a.ts", trustedContext);
    expect(codeAdvisory?.split("\n")).toHaveLength(6);
  });

  test("interface advisories match the selected interface", () => {
    expect(interfaceAdvisory("observed", true)).toBeUndefined();
    expect(interfaceAdvisory("unknown", true)).toBe(
      "Kibi MCP has not been observed in this session. In this explicitly trusted workspace, the project-local CLI is an advisory fallback: use npx --no-install kibi or bunx --no-install kibi. Do not use global or installing runners.",
    );
    expect(interfaceAdvisory("unknown", false)).toBe(
      "Kibi MCP has not been observed in this session and workspace trust is unknown. Do not probe or execute a CLI fallback; ask the operator to enable MCP or explicitly approve the trusted project-local CLI workflow.",
    );
  });
});

describe("Cursor stop followup messages", () => {
  test("kb mutations announce the recorded tools", () => {
    expect(
      stopFollowupMessage({
        ...EMPTY_HOOK_STATE,
        kbMutationTools: ["kb_upsert", "kb_upsert", "kb_delete"],
      }),
    ).toBe("Kibi KB updated (kb_upsert, kb_delete).");
  });

  test("unchecked source paths request an impact-enabled kb_check", () => {
    const message = stopFollowupMessage({
      ...EMPTY_HOOK_STATE,
      dirtyPaths: ["src/a.ts", "src/b.ts"],
    });
    expect(message).toBe(
      [
        "Kibi: run impact-enabled kb_check after 2 edited source files.",
        'Use kb_check({sourceFiles:["src/a.ts","src/b.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}).',
        "Review symbol granularity and semantic review of linked requirements/tests before stopping.",
      ].join("\n"),
    );
    expect(
      stopFollowupMessage({
        ...EMPTY_HOOK_STATE,
        dirtyPaths: ["src/only.ts"],
      }),
    ).toContain("after 1 edited source file.");
    expect(
      stopFollowupMessage({
        ...EMPTY_HOOK_STATE,
        dirtyPaths: Array.from({ length: 12 }, (_, i) => `src/f${i}.ts`),
      }),
    ).toContain(
      JSON.stringify(Array.from({ length: 10 }, (_, i) => `src/f${i}.ts`)),
    );
  });

  test("checked or fresh paths produce a sync reminder instead", () => {
    expect(
      stopFollowupMessage({
        ...EMPTY_HOOK_STATE,
        dirtyPaths: [".kb/requirements/REQ-1.md"],
        kbCheckRun: true,
      }),
    ).toBeUndefined();
    expect(
      stopFollowupMessage({
        ...EMPTY_HOOK_STATE,
        dirtyPaths: [".kb/requirements/REQ-1.md"],
      }),
    ).toBe("Kibi: sync or record no-impact after 1 edited file.");
    expect(
      stopFollowupMessage({
        ...EMPTY_HOOK_STATE,
        dirtyPaths: ["documentation/guide.md", ".kb/requirements/REQ-1.md"],
      }),
    ).toBe("Kibi: sync or record no-impact after 2 edited files.");
  });

  test("a delivered plan with no followup work stops silently", () => {
    expect(
      stopFollowupMessage({
        ...EMPTY_HOOK_STATE,
        planDelivered: true,
        kbCheckRun: true,
      }),
    ).toBeUndefined();
    expect(
      stopFollowupMessage({
        ...EMPTY_HOOK_STATE,
        planDelivered: true,
        dirtyPaths: ["documentation/guide.md"],
      }),
    ).toBe("Kibi: sync or record no-impact after 1 edited file.");
  });
});

describe("Cursor hook runner decisions", () => {
  function optIn(cwd: string): void {
    fs.mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");
  }

  test("sessionStart bootstraps unconfigured workspaces with the right advisory", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");

    const untrusted = await runHook(
      { event: "sessionStart", cwd },
      { pluginData },
    );
    expect(untrusted.additional_context).toBe(
      `${BOOTSTRAP_REMINDER}\n${interfaceAdvisory("unknown", false)}`,
    );

    const trusted = await runHook(
      { event: "sessionStart", cwd },
      {
        pluginData,
        workspaceTrusted: true,
      },
    );
    expect(trusted.additional_context).toBe(
      `${BOOTSTRAP_REMINDER}\n${interfaceAdvisory("unknown", true)}`,
    );
  });

  test("sessionStart still bootstraps when .kb exists without a manifest", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    fs.mkdirSync(path.join(cwd, ".kb"), { recursive: true });

    const result = await runHook(
      { event: "sessionStart", cwd },
      {
        pluginData,
      },
    );
    expect(
      result.additional_context?.startsWith("Kibi config was not found"),
    ).toBe(true);
  });

  test("sessionStart stays quiet in configured workspaces once mcp is observed", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);
    recordKbMcpTool(resolveStateDir(pluginData, undefined), "kb_skills_list");

    const result = await runHook(
      { event: "sessionStart", cwd },
      {
        pluginData,
        workspaceTrusted: false,
      },
    );
    expect(result).toStrictEqual({});
  });

  test("preToolUse warns only for editable tools touching the kb", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);

    for (const toolName of [
      "Edit",
      "MultiEdit",
      "Write",
      "StrReplace",
      "apply_patch",
      "EditNotebook",
      undefined,
    ]) {
      const result = await runHook(
        {
          event: "preToolUse",
          cwd,
          toolName,
          toolInput: { file_path: ".kb/requirements/REQ-1.md" },
        },
        { pluginData },
      );
      expect(result.agent_message).toBe(DIRECT_KB_EDIT_WARNING);
    }

    const nonEditable = await runHook(
      {
        event: "preToolUse",
        cwd,
        toolName: "Bash",
        toolInput: { file_path: ".kb/requirements/REQ-1.md" },
      },
      { pluginData },
    );
    expect(nonEditable).toStrictEqual({});

    const mixedPaths = await runHook(
      {
        event: "preToolUse",
        cwd,
        toolName: "Write",
        toolInput: { file_path: ["src/a.ts", ".kb/facts/F.md"] },
      },
      { pluginData },
    );
    expect(mixedPaths.agent_message).toBe(DIRECT_KB_EDIT_WARNING);
  });

  test("beforeReadFile guides once per path and allows repeats", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);

    const skipped = await runHook(
      { event: "beforeReadFile", cwd },
      { pluginData },
    );
    expect(skipped).toStrictEqual({ permission: "allow" });

    const untracked = await runHook(
      { event: "beforeReadFile", cwd, filePath: "untracked.bin" },
      { pluginData },
    );
    expect(untracked).toStrictEqual({ permission: "allow" });

    const first = await runHook(
      { event: "beforeReadFile", cwd, filePath: "/repo/src/a.ts" },
      { pluginData },
    );
    expect(first.permission).toBe("allow");
    expect(first.agent_message).toContain("Kibi read guidance:");

    const second = await runHook(
      { event: "beforeReadFile", cwd, filePath: "/repo/src/a.ts" },
      { pluginData },
    );
    expect(second).toStrictEqual({ permission: "allow" });

    const state = loadHookState(resolveStateDir(pluginData, undefined));
    expect(hasGuidedPath(state, "read", "/repo/src/a.ts")).toBe(true);
    expect(hasGuidedPath(state, "write", "/repo/src/a.ts")).toBe(false);
  });

  test("postToolUse tracks meaningful edits and guides on read-like tools", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);
    const stateDir = resolveStateDir(pluginData, undefined) as string;

    await runHook(
      {
        event: "postToolUse",
        cwd,
        toolName: "Write",
        toolInput: { file_path: "untracked.bin" },
      },
      { pluginData },
    );
    expect(fs.existsSync(stateFile(stateDir))).toBe(false);

    await runHook(
      {
        event: "postToolUse",
        cwd,
        toolName: "Write",
        toolInput: { file_path: `${cwd}/src/a.ts` },
      },
      { pluginData },
    );
    expect(loadHookState(stateDir).dirtyPaths).toEqual(["src/a.ts"]);

    const readGuided = await runHook(
      {
        event: "postToolUse",
        cwd,
        toolInput: { file_path: `${cwd}/src/b.ts` },
      },
      { pluginData },
    );
    expect(readGuided.additional_context).toContain("Kibi read guidance:");

    const repeat = await runHook(
      {
        event: "postToolUse",
        cwd,
        toolInput: { file_path: `${cwd}/src/b.ts` },
      },
      { pluginData },
    );
    expect(repeat).toStrictEqual({});

    const writeGuided = await runHook(
      {
        event: "postToolUse",
        cwd,
        toolName: "Write",
        toolInput: { file_path: `${cwd}/src/b.ts` },
      },
      { pluginData },
    );
    expect(writeGuided.additional_context).toContain("Kibi write guidance:");

    const writeRepeat = await runHook(
      {
        event: "postToolUse",
        cwd,
        toolName: "Write",
        toolInput: { file_path: `${cwd}/src/b.ts` },
      },
      { pluginData },
    );
    expect(writeRepeat).toStrictEqual({});

    await runHook(
      {
        event: "postToolUse",
        cwd,
        toolName: "Read",
        toolInput: { file_path: `${cwd}/src/c.ts` },
      },
      { pluginData },
    );
    expect(hasGuidedPath(loadHookState(stateDir), "read", "src/c.ts")).toBe(
      true,
    );

    for (const planTool of ["CreatePlan", "create_plan", "createPlan"]) {
      const planData = tempDir("kibi-cursor-data-plan-");
      await runHook(
        { event: "postToolUse", cwd, toolName: planTool },
        { pluginData: planData },
      );
      expect(
        loadHookState(resolveStateDir(planData, undefined)).planDelivered,
      ).toBe(true);
    }
  });

  test("postToolUse untracked read-like tools stay silent", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);
    const stateDir = resolveStateDir(pluginData, undefined) as string;

    const untrackedRead = await runHook(
      {
        event: "postToolUse",
        cwd,
        toolInput: { file_path: "untracked.bin" },
      },
      { pluginData },
    );
    expect(untrackedRead).toStrictEqual({});
    expect(loadHookState(stateDir).guidedReadPaths).toEqual([]);
  });

  test("postToolUse read-like tools guide on tracked paths", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);

    const untrackedRead = await runHook(
      {
        event: "postToolUse",
        cwd,
        toolInput: { file_path: "untracked.bin" },
      },
      { pluginData },
    );
    expect(untrackedRead).toStrictEqual({});

    const tabData = tempDir("kibi-cursor-data-tab-");
    const tabGuided = await runHook(
      {
        event: "postToolUse",
        cwd,
        toolName: "TabRead",
        toolInput: { file_path: `${cwd}/src/d.ts` },
      },
      { pluginData: tabData },
    );
    expect(tabGuided.additional_context).toContain("Kibi read guidance:");
    expect(
      hasGuidedPath(
        loadHookState(resolveStateDir(tabData, undefined)),
        "read",
        "src/d.ts",
      ),
    ).toBe(true);
  });

  test("stop issues followups and clears the session exactly once", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);
    const stateDir = resolveStateDir(pluginData, undefined) as string;

    addDirtyPaths(stateDir, ["src/a.ts"]);
    const impact = await runHook({ event: "stop", cwd }, { pluginData });
    expect(
      impact.followup_message?.startsWith("Kibi: run impact-enabled"),
    ).toBe(true);
    expect(loadHookState(stateDir)).toEqual(EMPTY_HOOK_STATE);

    addDirtyPaths(stateDir, ["documentation/b.md"]);
    const freshness = await runHook(
      { event: "stop", cwd, status: "completed" },
      { pluginData },
    );
    expect(freshness.followup_message).toBe(
      "Kibi: sync or record no-impact after 1 edited file.",
    );
    expect(loadHookState(stateDir)).toEqual(EMPTY_HOOK_STATE);
  });

  test("aborted or errored stops clear silently without followups", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);
    const stateDir = resolveStateDir(pluginData, undefined) as string;

    for (const status of ["aborted", "error"] as const) {
      addDirtyPaths(stateDir, ["src/a.ts"]);
      const result = await runHook(
        { event: "stop", cwd, status: status satisfies HookStopStatus },
        { pluginData },
      );
      expect(result).toStrictEqual({});
      expect(loadHookState(stateDir)).toEqual(EMPTY_HOOK_STATE);
    }
  });

  test("stop clears a mutation-only session without a followup", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);
    const stateDir = resolveStateDir(pluginData, undefined) as string;

    recordKbMcpTool(stateDir, "kb_upsert");
    const result = await runHook({ event: "stop", cwd }, { pluginData });
    expect(result).toEqual({
      followup_message: "Kibi KB updated (kb_upsert).",
    });
    expect(loadHookState(stateDir)).toEqual(EMPTY_HOOK_STATE);
  });

  test("an aborted stop on a fresh session writes no state", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);
    const stateDir = resolveStateDir(pluginData, undefined) as string;

    const result = await runHook(
      { event: "stop", cwd, status: "aborted" },
      { pluginData },
    );
    expect(result).toStrictEqual({});
    expect(fs.existsSync(stateFile(stateDir))).toBe(false);
  });

  test("a quiet stop leaves untouched state alone", async () => {
    const cwd = tempDir("kibi-cursor-cwd-");
    const pluginData = tempDir("kibi-cursor-data-");
    optIn(cwd);
    const stateDir = resolveStateDir(pluginData, undefined) as string;
    fs.mkdirSync(stateDir, { recursive: true });

    const result = await runHook(
      { event: "stop", cwd, status: "completed" },
      { pluginData },
    );
    expect(result).toStrictEqual({});
    expect(fs.existsSync(stateFile(stateDir))).toBe(false);
  });
});

describe("Cursor hook CLI surface", () => {
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

  function captureStdout(): { writes: string[]; restore: () => void } {
    const writes: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(
        typeof chunk === "string" ? chunk : Buffer.from(chunk).toString(),
      );
      return true;
    }) as typeof process.stdout.write;
    return {
      writes,
      restore: () => {
        process.stdout.write = originalWrite;
      },
    };
  }

  test("main parses stdin, applies the trusted flag, and prints one line", async () => {
    const cwd = tempDir("kibi-cursor-main-cwd-");
    const originalCwd = process.cwd();
    process.chdir(cwd);
    const originalArgv = process.argv;
    const { writes, restore } = captureStdout();
    try {
      process.argv = ["bun", "hook.ts", "--trusted-workspace"];
      await withStdin('{"event":"sessionStart"}', () => main());
    } finally {
      restore();
      process.argv = originalArgv;
      process.chdir(originalCwd);
    }
    expect(writes).toHaveLength(1);
    expect(writes[0]?.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(writes[0] ?? "null") as {
      additional_context?: string;
    };
    expect(parsed.additional_context).toContain(
      "the project-local CLI is an advisory fallback",
    );
  });

  test("runHookCli reports errors as additional context", async () => {
    const { writes, restore } = captureStdout();
    try {
      await withStdin("not json", () => runHookCli());
    } finally {
      restore();
    }
    expect(writes).toHaveLength(1);
    const parsed = JSON.parse(writes[0] ?? "null") as {
      additional_context: string;
    };
    expect(parsed.additional_context).toContain("Kibi hook runner error");
  });

  test("non-error rejections report the unknown hook error copy", async () => {
    const { writes, restore } = captureStdout();
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
      restore();
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
