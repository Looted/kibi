import { describe, expect, test } from "bun:test";

import { Readable } from "node:stream";
import { parseHookInput, parseStdinJson, readStdin } from "../src/hook-input";

describe("ZCode hook input", () => {
  test("Given non-object input When parsing Then an empty event is returned", () => {
    expect(parseHookInput(null)).toEqual({ event: "" });
    expect(parseHookInput([])).toEqual({ event: "" });
  });

  test("Given ZCode snake_case fields When parsing Then fields are normalized", () => {
    expect(
      parseHookInput({
        hook_event_name: "PreToolUse",
        cwd: "/repo",
        tool_name: "Write",
        tool_input: { file_path: "src/a.ts" },
      }),
    ).toEqual({
      event: "PreToolUse",
      cwd: "/repo",
      toolName: "Write",
      toolInput: { file_path: "src/a.ts" },
    });
  });

  test("Given alternate host dialects When parsing Then fields are normalized", () => {
    expect(
      parseHookInput({
        hookEvent: "PostToolUse",
        current_working_directory: "/repo",
        tool: "Write",
        input: { file_path: "src/a.ts" },
      }),
    ).toEqual({
      event: "PostToolUse",
      cwd: "/repo",
      toolName: "Write",
      toolInput: { file_path: "src/a.ts" },
    });
  });

  test("Given optional fields with invalid values When parsing Then they are omitted", () => {
    expect(
      parseHookInput({
        name: "Stop",
        workspace: 42,
        tool_name: 7,
        tool_input: undefined,
      }),
    ).toEqual({ event: "Stop" });
  });

  test("Given raw stdin JSON When parsing Then blank input becomes an empty object", () => {
    expect(parseStdinJson("  \n")).toEqual({});
    expect(parseStdinJson('{"event":"Stop"}')).toEqual({ event: "Stop" });
  });

  test("Given stdin chunks When reading Then string and buffer chunks concatenate", async () => {
    const previous = Object.getOwnPropertyDescriptor(process, "stdin");
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: Readable.from(["hello ", Buffer.from("world")]),
    });
    try {
      expect(await readStdin()).toBe("hello world");
    } finally {
      if (previous) {
        Object.defineProperty(process, "stdin", previous);
      }
    }
  });

  test("Given each event alias When parsing Then the first present alias wins", () => {
    for (const key of [
      "hook_event_name",
      "event",
      "hook_event",
      "hookEvent",
      "name",
    ]) {
      expect(parseHookInput({ [key]: "Stop" })).toStrictEqual({
        event: "Stop",
      });
    }
    expect(
      parseHookInput({
        name: "E5",
        hookEvent: "E4",
        hook_event: "E3",
        event: "E2",
        hook_event_name: "E1",
      }),
    ).toStrictEqual({ event: "E1" });
    expect(parseHookInput({ event: 3, name: "Stop" })).toStrictEqual({
      event: "Stop",
    });
    expect(parseHookInput({})).toStrictEqual({ event: "" });
  });

  test("Given each cwd, session, and tool alias When parsing Then each is read", () => {
    for (const key of ["cwd", "current_working_directory", "workspace"]) {
      expect(parseHookInput({ [key]: "/w" })).toStrictEqual({
        event: "",
        cwd: "/w",
      });
    }
    expect(
      parseHookInput({
        workspace: "/c",
        current_working_directory: "/b",
        cwd: "/a",
      }),
    ).toStrictEqual({ event: "", cwd: "/a" });
    for (const key of ["session_id", "sessionId"]) {
      expect(parseHookInput({ [key]: "s1" })).toStrictEqual({
        event: "",
        sessionId: "s1",
      });
    }
    expect(parseHookInput({ sessionId: "b", session_id: "a" })).toStrictEqual({
      event: "",
      sessionId: "a",
    });
    for (const key of ["toolName", "tool_name", "tool"]) {
      expect(parseHookInput({ [key]: "Edit" })).toStrictEqual({
        event: "",
        toolName: "Edit",
      });
    }
    expect(
      parseHookInput({ tool: "C", tool_name: "B", toolName: "A" }),
    ).toStrictEqual({ event: "", toolName: "A" });
  });

  test("Given tool input aliases When parsing Then the first defined one wins", () => {
    expect(
      parseHookInput({ toolInput: 1, tool_input: 2, input: 3 }),
    ).toStrictEqual({
      event: "",
      toolInput: 1,
    });
    expect(parseHookInput({ tool_input: 2, input: 3 })).toStrictEqual({
      event: "",
      toolInput: 2,
    });
    expect(parseHookInput({ input: 3 })).toStrictEqual({
      event: "",
      toolInput: 3,
    });
    expect(parseHookInput({ toolInput: null, input: 3 })).toStrictEqual({
      event: "",
      toolInput: 3,
    });
  });

  test("Given prompt and stop flags When parsing Then only exact values are kept", () => {
    expect(
      parseHookInput({ prompt: "hi", stop_hook_active: true }),
    ).toStrictEqual({ event: "", prompt: "hi", stopHookActive: true });
    expect(
      parseHookInput({ prompt: "", stop_hook_active: "true" }),
    ).toStrictEqual({
      event: "",
      prompt: "",
    });
    expect(
      parseHookInput({ prompt: 5, stop_hook_active: false }),
    ).toStrictEqual({
      event: "",
    });
  });

  test("Given a non-plain value When parsing Then it is not a record", () => {
    expect(parseHookInput(undefined)).toStrictEqual({ event: "" });
    expect(parseHookInput("Stop")).toStrictEqual({ event: "" });
    expect(parseHookInput(["Stop"])).toStrictEqual({ event: "" });
  });

  test("Given padded stdin JSON When parsing Then it is trimmed and invalid JSON throws", () => {
    expect(parseStdinJson('  {"a":1}  ')).toStrictEqual({ a: 1 });
    expect(parseStdinJson("")).toStrictEqual({});
    expect(() => parseStdinJson("{bad")).toThrow();
  });
});
