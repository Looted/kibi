import { describe, expect, test } from "bun:test";

import { parseHookInput, parseStdinJson, readStdin } from "../src/hook-input";
import { Readable } from "node:stream";

describe("Codex hook input", () => {
  test("Given non-object input When parsing Then an empty event is returned", () => {
    expect(parseHookInput(null)).toEqual({ event: "" });
    expect(parseHookInput([])).toEqual({ event: "" });
  });

  test("Given alternate Codex fields When parsing Then fields are normalized", () => {
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
});
