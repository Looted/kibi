import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  extractCliKbUsage,
  extractMcpKbUsage,
  unwrapKibiMcpCall,
  workspaceOverwrite,
} from "../src/kb-tools.js";
import {
  appendSessionEvents,
  loadSessionState,
  sessionDir,
  sessionJournal,
  workspaceDataDir,
} from "../src/session-state.js";
import { makeTempDir } from "./workspace-fixture.js";

describe("kibi-antigravity kb-tools edge cases", () => {
  test("unwraps lowercase and malformed call_mcp_tool arguments", () => {
    expect(
      unwrapKibiMcpCall("call_mcp_tool", {
        toolName: "kb_query",
        serverName: "kibi",
        arguments: { id: "REQ-1" },
      }),
    ).toEqual({
      operation: "kb_query",
      payload: { id: "REQ-1" },
      wrapped: true,
      argumentsKey: "arguments",
      argumentsAsJsonString: false,
    });
    expect(
      unwrapKibiMcpCall("call_mcp_tool", {
        ToolName: "kb_query",
        Arguments: "{",
      })?.payload,
    ).toEqual({});
    expect(
      unwrapKibiMcpCall("call_mcp_tool", {
        ToolName: "kb_query",
        Arguments: "[]",
      })?.payload,
    ).toEqual({});
    expect(
      unwrapKibiMcpCall("call_mcp_tool", { ToolName: "kb_query", Arguments: 3 })
        ?.argumentsAsJsonString,
    ).toBe(false);
    expect(
      unwrapKibiMcpCall("call_mcp_tool", { ToolName: 7, ServerName: "kibi" }),
    ).toBeUndefined();
    expect(
      workspaceOverwrite(
        "call_mcp_tool",
        { ToolName: "kb_query", Arguments: { id: "x" } },
        "/repo",
      ),
    ).toEqual({ Arguments: { id: "x", workspaceRoot: "/repo" } });
    expect(workspaceOverwrite("kibi_kb_query", {}, undefined)).toBeUndefined();
  });

  test("reads nested payloads of direct Kibi MCP calls", () => {
    expect(
      unwrapKibiMcpCall("kibi_kb_query", { arguments: { id: "A" } })?.payload,
    ).toEqual({ id: "A" });
    expect(
      unwrapKibiMcpCall("kibi_kb_query", { args: '{"id":"B"}' })?.payload,
    ).toEqual({ id: "B" });
    expect(
      unwrapKibiMcpCall("kibi_kb_query", { Arguments: "{bad" })?.payload,
    ).toEqual({ Arguments: "{bad" });
    expect(unwrapKibiMcpCall("kibi_kb_query", "text")?.payload).toEqual({});
    expect(
      extractMcpKbUsage("kibi_kb_check", {
        sourceLocations: [{ path: "src/a.ts" }, "bad"],
      })?.paths,
    ).toEqual(["src/a.ts"]);
    expect(
      extractMcpKbUsage("kibi_kb_check", { includeWorkingTreeDiff: true })
        ?.checkAll,
    ).toBe(true);
    expect(extractMcpKbUsage("read_file", {})).toBeUndefined();
  });

  test("falls back to flags when a CLI payload cannot be decoded", () => {
    const usage = extractCliKbUsage(
      "printf '%s\\n' '{bad json' | npx --no-install kibi check --input -",
    );
    expect(usage?.operation).toBe("kb_check");
    expect(usage?.checkAll).toBe(true);
    expect(extractCliKbUsage("ls -la")).toBeUndefined();
  });
});

describe("kibi-antigravity session journal", () => {
  test("keys sessions by id and replays every event kind", () => {
    const data = makeTempDir("kibi-agy-session-");
    expect(workspaceDataDir(undefined, "/repo")).toBeUndefined();
    const workspaceDir = workspaceDataDir(data, "/repo") as string;
    expect(sessionDir(undefined, "s")).toBeUndefined();
    expect(sessionDir(workspaceDir, "  ")).toBe(
      path.join(workspaceDir, "sessions", "unattributed"),
    );
    const dir = sessionDir(workspaceDir, "conv") as string;

    appendSessionEvents(dir, []);
    appendSessionEvents(dir, [
      { kind: "edited", path: "src/a.ts", pathKind: "source" },
      { kind: "edited", path: "src/b.ts", pathKind: "source" },
      { kind: "checked", paths: ["src/a.ts"], all: false },
      { kind: "reminded", paths: ["src/b.ts"] },
      { kind: "command_started", at: 5 },
      { kind: "command_started", at: 3 },
      { kind: "firm_asked", path: "src/a.ts", ids: ["REQ-1", "REQ-2"] },
      { kind: "firm_reviewed", path: "src/a.ts", ids: ["REQ-1"] },
      { kind: "firm_asked", path: "src/c.ts", ids: ["REQ-3"], edit: "e" },
      { kind: "firm_asked", path: "src/c.ts", ids: ["REQ-3"] },
      { kind: "firm_reviewed", path: "src/c.ts", ids: ["REQ-3"] },
    ]);
    fs.appendFileSync(path.join(dir, "session.jsonl"), "not json\n\n");
    const state = loadSessionState(dir);
    expect(state.pendingSource).toEqual(["src/b.ts"]);
    expect(state.reminded.has("src/b.ts")).toBe(true);
    expect(state.commandStartedAt).toBe(5);
    expect(state.firmAsked.get("src/a.ts")).toEqual(["REQ-2"]);
    expect(state.firmAsked.has("src/c.ts")).toBe(false);
    expect(state.firmAskedEdit.has("REQ-3")).toBe(false);

    appendSessionEvents(dir, [{ kind: "checked", paths: [], all: true }]);
    expect(loadSessionState(dir).pendingSource).toEqual([]);
    expect(sessionJournal(dir).length).toBeGreaterThan(0);
    expect(sessionJournal(undefined)).toEqual([]);
    expect(loadSessionState(undefined).kbUsed).toBe(false);

    // Writes into an unwritable place are best effort.
    const blocked = path.join(makeTempDir("kibi-agy-blocked-"), "file");
    fs.writeFileSync(blocked, "");
    appendSessionEvents(path.join(blocked, "sub"), [
      { kind: "notice", name: "x" },
    ]);
    expect(os.tmpdir().length).toBeGreaterThan(0);
  });
});
