// implements REQ-opencode-file-context-guidance-v1
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  emptyLinkedTargets,
  getFileLinkedEntityIds,
} from "../src/file-entity-links.js";
import {
  createSessionEditState,
  pushEventHintIfKind,
} from "../src/session-edit-state.js";
import {
  adoptPrecomputedSuggestion,
  nextRecentCommentSuggestion,
  resetCommentSuggestion,
} from "../src/plugin.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("opencode remasure11 leftover helpers", () => {
  test("covers extracted leftover helpers and forceEdit kind", () => {
    expect(emptyLinkedTargets()).toEqual({ ids: [], source: "none" });
    expect(resetCommentSuggestion()).toBeNull();
    expect(nextRecentCommentSuggestion(false, { id: "skip" })).toBeNull();
    expect(nextRecentCommentSuggestion(true, null)).toBeNull();
    expect(nextRecentCommentSuggestion(true, { id: "keep" })).toEqual({
      id: "keep",
    });
    expect(adoptPrecomputedSuggestion(null, { id: "next" })).toEqual({
      id: "next",
    });
    expect(adoptPrecomputedSuggestion({ id: "kept" }, { id: "next" })).toEqual({
      id: "kept",
    });
    expect(adoptPrecomputedSuggestion(null, undefined)).toBeNull();
    const hints: Array<{ kind: string; timestamp: number }> = [];
    pushEventHintIfKind(hints, undefined, 1);
    expect(hints).toEqual([]);
    pushEventHintIfKind(hints, "file.edited", 2);
    expect(hints).toEqual([{ kind: "file.edited", timestamp: 2 }]);

    const worktree = mkdtempSync(join(tmpdir(), "kibi-r11-session-"));
    mkdirSync(join(worktree, "src"), { recursive: true });
    writeFileSync(join(worktree, "src", "forced.ts"), "export const x = 1;\n");
    const state = createSessionEditState({ worktree, now: () => 9 });
    state.forceEdit(join(worktree, "src", "forced.ts"), "file.edited", 11);
    expect(state.hasSessionEdits()).toBe(true);
    expect(getFileLinkedEntityIds(worktree, "src/missing.ts")).toEqual({
      ids: [],
      source: "none",
    });
    mkdirSync(join(worktree, ".kb"), { recursive: true });
    mkdirSync(join(worktree, ".kb", "symbols.yaml"));
    expect(getFileLinkedEntityIds(worktree, "src/forced.ts")).toEqual({
      ids: [],
      source: "none",
    });
  });
});
