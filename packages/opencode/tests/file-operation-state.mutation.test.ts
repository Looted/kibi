import { describe, expect, test } from "bun:test";
import {
  type FileLifecycle,
  createFileOperationState,
} from "../src/file-operation-state";

function coalesce(...events: FileLifecycle[]): FileLifecycle | undefined {
  const state = createFileOperationState({ worktree: "/w", now: () => 1 });
  for (const event of events) state.recordLifecycle("a.ts", event);
  return state.peekPending("a.ts")?.lifecycle;
}

describe("lifecycle coalescing", () => {
  test.each([
    [["edited"], "edited"],
    [["created", "edited"], "created"],
    [["edited", "created"], "created"],
    [["edited", "edited"], "edited"],
    [["created", "deleted"], "deleted"],
    [["edited", "deleted"], "deleted"],
    [["deleted", "edited"], "deleted"],
    [["deleted", "created"], "deleted"],
    [["deleted", "deleted"], "deleted"],
    [["created", "created"], "created"],
  ] as const)("%p -> %s", (events, expected) => {
    expect(coalesce(...events)).toBe(expected);
  });
});

describe("paths and peeking", () => {
  test("relative paths are normalized", () => {
    const state = createFileOperationState({ worktree: "/w" });
    expect(state.normalizePath("./a/b.ts")).toBe("a/b.ts");
    expect(state.normalizePath("./")).toBe("");
    expect(state.normalizePath("../")).toBe("../");
    expect(state.normalizePath("/w/a.ts")).toBe("a.ts");
    expect(state.normalizePath("/x/a.ts")).toBe("/x/a.ts");
  });

  test("the most recent event wins, and the first of equal ones", () => {
    const state = createFileOperationState({ worktree: "/w" });
    state.recordLifecycle("a.ts", "edited", 5);
    state.recordLifecycle("b.ts", "edited", 5);
    state.recordLifecycle("c.ts", "edited", 3);
    expect(state.peekPending()?.normalizedPath).toBe("a.ts");
    state.recordLifecycle("d.ts", "edited", 6);
    state.recordLifecycle("e.ts", "edited", 4);
    expect(state.peekPending()?.normalizedPath).toBe("d.ts");
  });
});
