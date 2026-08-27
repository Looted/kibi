import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  _resetSessionDepsForTests,
  ensureBranchKbExists,
  resetSessionStateForTests,
} from "../../src/server/session.js";

const tempWorkspaces: string[] = [];

afterEach(() => {
  for (const workspace of tempWorkspaces.splice(0)) {
    rmSync(workspace, { recursive: true, force: true });
  }
});

describe("session direct coverage smoke", () => {
  test("calls the directly imported session module", () => {
    resetSessionStateForTests();
    _resetSessionDepsForTests();

    const workspace = mkdtempSync(join(tmpdir(), "kibi-session-smoke-"));
    tempWorkspaces.push(workspace);

    expect(() => ensureBranchKbExists(workspace, "direct-smoke")).not.toThrow();
  });
});
