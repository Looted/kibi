import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSessionEditState } from "../src/session-edit-state";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function setup() {
  const worktree = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-edits-"));
  dirs.push(worktree);
  let clock = 0;
  const state = createSessionEditState({ worktree, now: () => clock });
  const write = (rel: string, content: string) => {
    fs.mkdirSync(path.dirname(path.join(worktree, rel)), { recursive: true });
    fs.writeFileSync(path.join(worktree, rel), content);
  };
  return {
    worktree,
    state,
    write,
    tick: (to: number) => {
      clock = to;
    },
  };
}

describe("session edits", () => {
  test("a hint keeps its path for later reconciliation without resetting it", () => {
    const { state, write, tick } = setup();
    write("a.ts", "one");
    tick(1);
    state.reconcilePath("a.ts");
    write("a.ts", "two");
    state.recordEventHint("a.ts", "file.edited", 1);
    state.recordEventHint("b.ts", "file.edited", 1);
    expect(state.getSessionEdits()).toStrictEqual([]);
    tick(2);
    state.reconcileKnownPaths();
    expect(
      state.getSessionEdits().map((e) => [e.filePath, e.lastReconciledAt]),
    ).toStrictEqual([["a.ts", 2]]);
    expect(state.hasSessionEdits()).toBe(true);
  });

  test("a hinted path is reconciled with the known paths", () => {
    const { state, write, tick } = setup();
    write("c.ts", "before");
    state.recordEventHint("c.ts", "file.edited");
    state.reconcileKnownPaths();
    write("c.ts", "after");
    tick(3);
    state.reconcileKnownPaths();
    expect(
      state.getSessionEdits().map((e) => [e.filePath, e.lastReconciledAt]),
    ).toStrictEqual([["c.ts", 3]]);
  });

  test("relative paths are taken relative to the worktree, not the cwd", () => {
    const { worktree, state, write } = setup();
    const sub = path.join(worktree, "sub");
    fs.mkdirSync(sub);
    write("x.ts", "x");
    const cwd = process.cwd();
    process.chdir(sub);
    try {
      state.forceEdit("x.ts");
    } finally {
      process.chdir(cwd);
    }
    expect(state.getSessionEdits().map((e) => e.filePath)).toStrictEqual([
      "x.ts",
    ]);
  });

  test("edits sort oldest first and the focus is the newest", () => {
    const { state, write, tick } = setup();
    for (const name of ["a.ts", "b.ts", "c.ts"]) {
      write(name, "base");
      state.reconcilePath(name);
    }
    for (const [name, at] of [
      ["b.ts", 5],
      ["a.ts", 9],
      ["c.ts", 7],
    ] as const) {
      write(name, "changed");
      tick(at);
      state.reconcilePath(name);
    }
    expect(state.getSessionEdits().map((e) => e.filePath)).toStrictEqual([
      "b.ts",
      "c.ts",
      "a.ts",
    ]);
    expect(state.getFocusEdit()?.filePath).toBe("a.ts");
  });

  test("returned entries are copies", () => {
    const { state, write } = setup();
    write("a.ts", "one");
    state.reconcilePath("a.ts");
    write("a.ts", "two");
    state.reconcilePath("a.ts");
    const [edit] = state.getSessionEdits();
    expect(edit?.filePath).toBe("a.ts");
    if (edit) edit.currentHash = edit.baselineHash;
    expect(state.hasSessionEdits()).toBe(true);
  });

  test("no edits: no focus", () => {
    const { state } = setup();
    expect(state.getFocusEdit()).toBeNull();
    expect(state.hasSessionEdits()).toBe(false);
  });

  test("paths are kept relative to the worktree, outside paths stay absolute", () => {
    const { state, worktree, write } = setup();
    write("src/a.ts", "x");
    state.reconcilePath(path.join(worktree, "src/a.ts"));
    write("src/a.ts", "y");
    state.reconcilePath("src/a.ts");
    const outside = path.join(path.dirname(worktree), "outside-kibi.ts");
    state.forceEdit(outside, "file.edited", 3);
    expect(
      state
        .getSessionEdits()
        .map((e) => e.filePath)
        .sort(),
    ).toStrictEqual([outside, "src/a.ts"].sort());
  });

  test("relative paths do not depend on the process directory", () => {
    const { state, write } = setup();
    write("rel.ts", "x");
    state.reconcilePath("rel.ts");
    write("rel.ts", "y");
    state.reconcilePath("rel.ts");
    expect(state.getSessionEdits().map((e) => e.filePath)).toStrictEqual([
      "rel.ts",
    ]);
  });
});

describe("forceEdit", () => {
  test("forces an edit even for an empty file, at the given time", () => {
    const { state, write, tick } = setup();
    write("empty.ts", "");
    tick(99);
    state.forceEdit("empty.ts", "file.edited", 5);
    expect(
      state.getSessionEdits().map((e) => [e.filePath, e.lastReconciledAt]),
    ).toStrictEqual([["empty.ts", 5]]);
    state.forceEdit("empty.ts");
    expect(state.getFocusEdit()?.lastReconciledAt).toBe(99);
  });

  test("keeps a real baseline taken earlier", () => {
    const { state, write } = setup();
    write("a.ts", "same");
    state.reconcilePath("a.ts");
    state.forceEdit("a.ts", "file.edited", 1);
    expect(state.hasSessionEdits()).toBe(false);
  });
});
