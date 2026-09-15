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
    ]);
  });

  test("rejects bailouts and plan mismatches without projecting partial results", () => {
    const converted = convertTap(
      ["TAP version 13", "1..2", "ok 1 - saves a draft", "Bail out! stop"].join(
        "\n",
      ),
      bindings,
    );
    expect(converted.results).toEqual([]);
    expect(converted.fatal).toBe(true);
    expect(converted.diagnostics).toEqual([
      "TAP bailout: stop",
      "TAP plan mismatch: expected 2 assertion(s), observed 1",
    ]);
  });

  test("materializes nested headings before processing child headings", () => {
    const nestedBindings = [
      {
        symbol_id: "SYM-DEEP",
        target: "default",
        native_id: "outer > inner > leaf > leaf body",
      },
      {
        symbol_id: "SYM-SIBLING-A",
        target: "default",
        native_id: "outer-a > shared > works",
      },
      {
        symbol_id: "SYM-SIBLING-B",
        target: "default",
        native_id: "outer-b > shared > works",
      },
    ];
    const converted = convertTap(
      [
        "TAP version 13",
        "# Subtest: outer",
        "    # Subtest: inner",
        "        # Subtest: leaf",
        "            1..1",
        "            ok 1 - leaf body",
        "        1..1",
        "        ok 1 - inner result",
        "    1..1",
        "    ok 1 - outer result",
        "ok 1 - outer",
        "# Subtest: outer-a",
        "    # Subtest: shared",
        "        1..1",
        "        ok 1 - works",
        "    1..1",
        "    ok 1 - outer-a result",
        "ok 2 - outer-a",
        "# Subtest: outer-b",
        "    # Subtest: shared",
        "        1..1",
        "        ok 1 - works",
        "    1..1",
        "    ok 1 - outer-b result",
        "ok 3 - outer-b",
        "1..3",
      ].join("\n"),
      nestedBindings,
    );
    expect(converted.fatal).toBeUndefined();
    expect(converted.results).toEqual([
      expect.objectContaining({
        symbol_id: "SYM-DEEP",
        native_id: "outer > inner > leaf > leaf body",
      }),
      expect.objectContaining({
        symbol_id: "SYM-SIBLING-A",
        native_id: "outer-a > shared > works",
      }),
      expect.objectContaining({
        symbol_id: "SYM-SIBLING-B",
        native_id: "outer-b > shared > works",
      }),
    ]);
  });

  test("accepts an all-skipped zero-test TAP plan", () => {
    const converted = convertTap(
      ["TAP version 13", "1..0 # SKIP no compatible tests"].join("\n"),
      bindings,
    );
    expect(converted.fatal).toBeUndefined();
    expect(converted.results).toEqual([]);
    expect(converted.diagnostics).toEqual([]);
  });
});
