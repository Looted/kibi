import { describe, expect, test } from "bun:test";

import { parseHookInput, parseStdinJson } from "../src/hook-input";

describe("Cursor hook input", () => {
  test("Given non-object input When parsing Then an empty event is returned", () => {
    expect(parseHookInput(null)).toEqual({ event: "" });
    expect(parseHookInput([])).toEqual({ event: "" });
  });

  test("Given alternate Cursor fields When parsing Then fields are normalized", () => {
    expect(
      parseHookInput({
        hookEvent: "PostToolUse",
        current_working_directory: "/repo",
        workspace_roots: ["/repo", "", 42],
        tool: "Write",
        input: { file_path: "src/a.ts" },
        conversation_id: "conversation-1",
        path: "src/a.ts",
        status: "completed",
      }),
    ).toEqual({
      event: "postToolUse",
      cwd: "/repo",
      workspaceRoots: ["/repo"],
      toolName: "Write",
      toolInput: { file_path: "src/a.ts" },
      conversationId: "conversation-1",
      filePath: "src/a.ts",
      status: "completed",
    });
  });

  test("Given empty event and empty workspace roots When parsing Then optional fields are omitted", () => {
    expect(
      parseHookInput({
        name: "   ",
        workspaceRoots: ["", 1],
        tool_input: undefined,
        conversationId: 7,
      }),
    ).toEqual({ event: "" });
  });

  test("Given raw stdin JSON When parsing Then blank input becomes an empty object", () => {
    expect(parseStdinJson("  \n")).toEqual({});
    expect(parseStdinJson('{"event":"stop"}')).toEqual({ event: "stop" });
  });

  test("Given stop status When parsing Then only completed aborted and error are kept", () => {
    expect(
      parseHookInput({ hook_event_name: "stop", status: "aborted" }),
    ).toEqual({
      event: "stop",
      status: "aborted",
    });
    expect(
      parseHookInput({ hook_event_name: "stop", status: "error" }),
    ).toEqual({
      event: "stop",
      status: "error",
    });
    expect(
      parseHookInput({ hook_event_name: "stop", status: "cancelled" }),
    ).toEqual({ event: "stop" });
  });
});
