import { describe, expect, test } from "bun:test";
import { queriedBeforeWrite } from "../runtime/codex-cell-defaults";

describe("symbol queried before write", () => {
  test("credits an exact read before the first write", () => {
    expect(queriedBeforeWrite(["kb_search", "kb_query", "kb_upsert"])).toBe(
      true,
    );
  });

  test("needs no read-back after the write", () => {
    expect(
      queriedBeforeWrite(["kb_query", "kb_upsert", "kb_check", "kb_status"]),
    ).toBe(true);
  });

  test("does not credit a read that only follows the write", () => {
    expect(queriedBeforeWrite(["kb_search", "kb_upsert", "kb_query"])).toBe(
      false,
    );
  });

  test("does not credit a session with no write", () => {
    expect(queriedBeforeWrite(["kb_search", "kb_query", "kb_check"])).toBe(
      false,
    );
  });

  test("does not credit a write that is the first call", () => {
    expect(queriedBeforeWrite(["kb_upsert", "kb_query"])).toBe(false);
  });
});
