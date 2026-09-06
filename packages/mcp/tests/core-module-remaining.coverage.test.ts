// implements REQ-002
import { afterEach, describe, expect, test } from "bun:test";
import { parseMaybeDoubleEncodedJson } from "../src/tools/core-module.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("mcp core-module leftover double JSON parse", () => {
  test("parses a JSON string that itself contains JSON", () => {
    expect(parseMaybeDoubleEncodedJson('"{\\"ok\\":true}"')).toEqual({
      ok: true,
    });
    expect(parseMaybeDoubleEncodedJson('{"ok":true}')).toEqual({ ok: true });
  });
});
