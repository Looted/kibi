import { describe, expect, test } from "bun:test";
import { convertTap } from "../../src/proof/producers/tap-adapter.js";

const bindings = [
  {
    symbol_id: "SYM-ONE",
    target: "default",
    native_id: "saves a draft",
  },
  {
    symbol_id: "SYM-TWO",
    target: "default",
    native_id: "rejects empty title",
  },
  {
    symbol_id: "SYM-SKIP",
    target: "default",
    native_id: "pending wizard",
  },
];

describe("convertTap", () => {
  test("maps TAP assertions including skip/todo and diagnostics", () => {
    const tap = [
      "TAP version 13",
      "1..5",
      "# a comment",
      "",
      "ok 1 - saves a draft",
      "not ok 2 - rejects empty title",
      "ok 3 - pending wizard # SKIP not implemented",
      "ok 4 - later # TODO",
      "not ok 5 - pending wizard # SKIP",
      "ok 7 - unbound case",
      "ok",
      "Bail out! stop",
    ].join("\r\n");
    const converted = convertTap(tap, bindings);
    expect(converted.results).toEqual([
      expect.objectContaining({
        symbol_id: "SYM-ONE",
        outcome: "passed",
        native_id: "saves a draft",
        attempts: { status: "unavailable" },
      }),
      expect.objectContaining({
        symbol_id: "SYM-TWO",
        outcome: "failed",
        native_id: "rejects empty title",
      }),
      expect.objectContaining({
        symbol_id: "SYM-SKIP",
        outcome: "skipped",
        native_id: "pending wizard",
      }),
    ]);
    expect(converted.diagnostics).toEqual([
      "unbound TAP assertion ignored: later",
      "duplicate TAP result for pending wizard; ignored",
      "unbound TAP assertion ignored: unbound case",
    ]);
  });
});
