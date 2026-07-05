import { describe, expect, test } from "bun:test";

import {
  _resetSessionDepsForTests,
  ensureBranchKbExists,
  resetSessionStateForTests,
} from "../../src/server/session.js";

describe("session direct coverage smoke", () => {
  test("calls the directly imported session module", () => {
    resetSessionStateForTests();
    _resetSessionDepsForTests();

    expect(() => ensureBranchKbExists(process.cwd(), "direct-smoke")).not.toThrow();
  });
});
