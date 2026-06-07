import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  type SessionEditEntry,
  createSessionEditState,
} from "../src/session-edit-state";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

function setup(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ses-edit-state-"));
  return tmpDir;
}

function teardown(): void {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/** Write a file relative to tmpDir, creating intermediate dirs. */
function writeFile(rel: string, content: string): void {
  const abs = path.join(tmpDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf-8");
}

/** Delete a file relative to tmpDir. */
function removeFile(rel: string): void {
  const abs = path.join(tmpDir, rel);
  try {
    fs.unlinkSync(abs);
  } catch {
    // already gone
  }
}

/** SHA-256 of content, matching the implementation. */
function hash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createSessionEditState", () => {
  beforeEach(() => setup());
  afterEach(() => teardown());

  test("factory returns required methods", () => {
    const state = createSessionEditState({ worktree: tmpDir });
    assert.equal(typeof state.recordEventHint, "function");
    assert.equal(typeof state.reconcilePath, "function");
    assert.equal(typeof state.reconcileKnownPaths, "function");
    assert.equal(typeof state.getSessionEdits, "function");
    assert.equal(typeof state.getFocusEdit, "function");
    assert.equal(typeof state.hasSessionEdits, "function");
  });

  // -------------------------------------------------------------------------
  // Path handling: relative / absolute
  // -------------------------------------------------------------------------
  test("reconcilePath resolves relative path and tracks edits correctly", () => {
    writeFile("src/foo.ts", "original");
    const state = createSessionEditState({ worktree: tmpDir });

    // First reconcile: lazy baseline = hash("original"), no edit yet
    state.reconcilePath("src/foo.ts");
    assert.equal(state.hasSessionEdits(), false);

    // Modify and reconcile: now diverges from baseline
    writeFile("src/foo.ts", "changed");
    state.reconcilePath("src/foo.ts");

    const edits = state.getSessionEdits();
    assert.equal(edits.length, 1);
    assert.equal(edits[0]?.filePath, "src/foo.ts");
    assert.equal(edits[0]?.currentHash, hash("changed"));
    assert.equal(edits[0]?.baselineHash, hash("original"));
  });

  test("reconcilePath normalizes absolute path to relative", () => {
    writeFile("src/bar.ts", "hello");
    const abs = path.join(tmpDir, "src/bar.ts");
    const state = createSessionEditState({ worktree: tmpDir });

    state.reconcilePath(abs);

    // Unchanged → no edit. Modify to verify path stored as relative.
    writeFile("src/bar.ts", "world");
    state.reconcilePath(abs);

    const edits = state.getSessionEdits();
    assert.equal(edits.length, 1);
    assert.equal(edits[0]?.filePath, "src/bar.ts");
  });

  test("reconcilePath deduplicates same file via relative and absolute", () => {
    writeFile("src/dup.ts", "content");
    const abs = path.join(tmpDir, "src/dup.ts");
    const state = createSessionEditState({ worktree: tmpDir });

    state.reconcilePath("src/dup.ts");
    state.reconcilePath(abs);

    // Both resolve to same relative path → single tracked entry
    writeFile("src/dup.ts", "changed");
    state.reconcilePath(abs);

    assert.equal(state.getSessionEdits().length, 1);
    assert.equal(state.getSessionEdits()[0]?.filePath, "src/dup.ts");
  });

  // -------------------------------------------------------------------------
  // Startup-dirty: pre-existing files that haven't changed are excluded
  // -------------------------------------------------------------------------
  test("startup-dirty file is excluded until content diverges", () => {
    const content = "startup-content";
    writeFile("src/existing.ts", content);
    const state = createSessionEditState({ worktree: tmpDir });

    // Record hint + reconcile (baseline = current hash)
    state.recordEventHint("src/existing.ts", "file.edited", 100);
    state.reconcilePath("src/existing.ts");

    // Content unchanged => no session edit
    assert.equal(state.hasSessionEdits(), false);
    assert.deepEqual(state.getSessionEdits(), []);

    // Now change the file
    writeFile("src/existing.ts", "modified-content");
    state.reconcilePath("src/existing.ts");

    assert.equal(state.hasSessionEdits(), true);
    const edits = state.getSessionEdits();
    assert.equal(edits.length, 1);
    assert.equal(edits[0]?.filePath, "src/existing.ts");
  });

  // -------------------------------------------------------------------------
  // Add then revert: file returns to startup content => removed from edits
  // -------------------------------------------------------------------------
  test("file added then reverted to baseline is removed from session edits", () => {
    const original = "original-content";
    writeFile("src/revert.ts", original);

    const state = createSessionEditState({ worktree: tmpDir });

    // First reconcile establishes baseline
    state.reconcilePath("src/revert.ts");
    assert.equal(state.hasSessionEdits(), false);

    // Modify
    writeFile("src/revert.ts", "changed");
    state.reconcilePath("src/revert.ts");
    assert.equal(state.hasSessionEdits(), true);

    // Revert
    writeFile("src/revert.ts", original);
    state.reconcilePath("src/revert.ts");
    assert.equal(state.hasSessionEdits(), false);
    assert.deepEqual(state.getSessionEdits(), []);
  });

  // -------------------------------------------------------------------------
  // New file (not at startup) becomes session edit after creation
  // Baseline captured as sentinel (file missing), then created → diverges
  // -------------------------------------------------------------------------
  test("new file created during session appears as session edit", () => {
    const state = createSessionEditState({ worktree: tmpDir });

    // Reconcile when file doesn't exist → baseline = sentinel
    state.reconcilePath("src/brand-new.ts");

    // Sentinel = sentinel → no edit yet
    assert.equal(state.hasSessionEdits(), false);

    // Create the file
    writeFile("src/brand-new.ts", "fresh content");
    state.reconcilePath("src/brand-new.ts");

    // Now current ≠ sentinel → session edit
    assert.equal(state.hasSessionEdits(), true);
    assert.equal(state.getSessionEdits().length, 1);
    assert.equal(state.getSessionEdits()[0]?.filePath, "src/brand-new.ts");
    assert.equal(state.getSessionEdits()[0]?.baselineHash, "<deleted>");
    assert.equal(
      state.getSessionEdits()[0]?.currentHash,
      hash("fresh content"),
    );
  });

  // -------------------------------------------------------------------------
  // Delete/recreate behavior
  // -------------------------------------------------------------------------
  test("deleted file uses sentinel hash and appears as session edit", () => {
    writeFile("src/to-delete.ts", "some content");
    const state = createSessionEditState({ worktree: tmpDir });

    // Establish baseline
    state.reconcilePath("src/to-delete.ts");
    // File is at baseline, no edit yet
    assert.equal(state.hasSessionEdits(), false);

    // Delete the file
    removeFile("src/to-delete.ts");
    state.reconcilePath("src/to-delete.ts");

    // Deleted file diverges from baseline => session edit
    assert.equal(state.hasSessionEdits(), true);
    const edits = state.getSessionEdits();
    assert.equal(edits.length, 1);
    assert.equal(edits[0]?.currentHash, "<deleted>");
  });

  test("recreated file with same content as startup is NOT a session edit", () => {
    const original = "original";
    writeFile("src/recreate.ts", original);
    const state = createSessionEditState({ worktree: tmpDir });

    // Baseline
    state.reconcilePath("src/recreate.ts");
    assert.equal(state.hasSessionEdits(), false);

    // Delete
    removeFile("src/recreate.ts");
    state.reconcilePath("src/recreate.ts");
    assert.equal(state.hasSessionEdits(), true);

    // Recreate with same content
    writeFile("src/recreate.ts", original);
    state.reconcilePath("src/recreate.ts");
    assert.equal(state.hasSessionEdits(), false);
  });

  test("recreated file with different content IS a session edit", () => {
    const original = "original";
    writeFile("src/recreate2.ts", original);
    const state = createSessionEditState({ worktree: tmpDir });

    // Baseline
    state.reconcilePath("src/recreate2.ts");

    // Delete
    removeFile("src/recreate2.ts");
    state.reconcilePath("src/recreate2.ts");
    assert.equal(state.hasSessionEdits(), true);

    // Recreate with different content
    writeFile("src/recreate2.ts", "different");
    state.reconcilePath("src/recreate2.ts");
    assert.equal(state.hasSessionEdits(), true);
    assert.equal(state.getSessionEdits()[0]?.currentHash, hash("different"));
  });

  // -------------------------------------------------------------------------
  // Focus edit = last reconciled surviving edit
  // -------------------------------------------------------------------------
  test("getFocusEdit returns the last reconciled surviving edit", () => {
    let clock = 0;
    const state = createSessionEditState({
      worktree: tmpDir,
      now: () => clock,
    });

    writeFile("src/a.ts", "a-content");
    writeFile("src/b.ts", "b-content");

    // Establish baselines
    state.reconcilePath("src/a.ts");
    state.reconcilePath("src/b.ts");

    // Modify both to create edits
    clock = 10;
    writeFile("src/a.ts", "a-modified");
    state.reconcilePath("src/a.ts");
    clock = 20;
    writeFile("src/b.ts", "b-modified");
    state.reconcilePath("src/b.ts");

    // Focus = last reconciled surviving edit = b
    const focus = state.getFocusEdit();
    assert.ok(focus);
    assert.equal(focus.filePath, "src/b.ts");
  });

  test("getFocusEdit returns null when no session edits exist", () => {
    const state = createSessionEditState({ worktree: tmpDir });
    assert.equal(state.getFocusEdit(), null);
  });

  test("focus edit updates as later files are reconciled", () => {
    const state = createSessionEditState({ worktree: tmpDir, now: () => 0 });

    // Create file, reconcile baseline, then modify to create edit
    writeFile("src/first.ts", "first");
    state.reconcilePath("src/first.ts");
    writeFile("src/first.ts", "first-mod");
    state.reconcilePath("src/first.ts");
    assert.equal(state.getFocusEdit()?.filePath, "src/first.ts");

    writeFile("src/second.ts", "second");
    state.reconcilePath("src/second.ts");
    writeFile("src/second.ts", "second-mod");
    state.reconcilePath("src/second.ts");
    assert.equal(state.getFocusEdit()?.filePath, "src/second.ts");
  });

  // -------------------------------------------------------------------------
  // Session edits are sorted by last reconciled timestamp
  // -------------------------------------------------------------------------
  test("getSessionEdits returns entries sorted by lastReconciledAt ascending", () => {
    let clock = 0;
    const state = createSessionEditState({
      worktree: tmpDir,
      now: () => clock,
    });

    writeFile("src/z.ts", "z");
    writeFile("src/a.ts", "a");
    writeFile("src/m.ts", "m");

    // Establish baselines at t=0
    state.reconcilePath("src/z.ts");
    state.reconcilePath("src/a.ts");
    state.reconcilePath("src/m.ts");

    // Modify all files to create edits at different times
    writeFile("src/z.ts", "z-mod");
    clock = 10;
    state.reconcilePath("src/z.ts");
    writeFile("src/a.ts", "a-mod");
    clock = 20;
    state.reconcilePath("src/a.ts");
    writeFile("src/m.ts", "m-mod");
    clock = 30;
    state.reconcilePath("src/m.ts");

    const edits = state.getSessionEdits();
    assert.equal(edits.length, 3);
    assert.equal(edits[0]?.filePath, "src/z.ts");
    assert.equal(edits[0]?.lastReconciledAt, 10);
    assert.equal(edits[1]?.filePath, "src/a.ts");
    assert.equal(edits[1]?.lastReconciledAt, 20);
    assert.equal(edits[2]?.filePath, "src/m.ts");
    assert.equal(edits[2]?.lastReconciledAt, 30);
  });

  // -------------------------------------------------------------------------
  // reconcileKnownPaths rechecks all tracked paths
  // -------------------------------------------------------------------------
  test("reconcileKnownPaths re-evaluates all tracked files", () => {
    const original = "original";
    writeFile("src/batch.ts", original);
    const state = createSessionEditState({ worktree: tmpDir });

    // Track via hint
    state.recordEventHint("src/batch.ts", "file.edited", 0);
    state.reconcilePath("src/batch.ts");
    assert.equal(state.hasSessionEdits(), false);

    // Change the file but don't reconcile individually
    writeFile("src/batch.ts", "changed");

    // reconcileKnownPaths should pick up the change
    state.reconcileKnownPaths();
    assert.equal(state.hasSessionEdits(), true);
    assert.equal(state.getSessionEdits()[0]?.filePath, "src/batch.ts");
  });

  // -------------------------------------------------------------------------
  // recordEventHint stores path for later reconciliation
  // -------------------------------------------------------------------------
  test("recordEventHint tracks file path for later reconciliation", () => {
    const state = createSessionEditState({ worktree: tmpDir });

    writeFile("src/hinted.ts", "content");
    state.recordEventHint("src/hinted.ts", "file.edited", 42);

    // Not yet reconciled → no baseline comparison yet
    assert.equal(state.hasSessionEdits(), false);

    // Reconcile: baseline = hash("content"), current = hash("content") → no edit
    state.reconcilePath("src/hinted.ts");
    assert.equal(state.hasSessionEdits(), false);

    // Modify → now diverges from baseline
    writeFile("src/hinted.ts", "changed");
    state.reconcilePath("src/hinted.ts");
    assert.equal(state.hasSessionEdits(), true);
  });

  // -------------------------------------------------------------------------
  // Lazy baseline: hash computed on first sight only
  // -------------------------------------------------------------------------
  test("baseline hash is computed lazily on first reconcile", () => {
    const content = "lazy-content";
    writeFile("src/lazy.ts", content);
    const state = createSessionEditState({ worktree: tmpDir });

    // Reconcile establishes baseline
    state.reconcilePath("src/lazy.ts");
    assert.equal(state.hasSessionEdits(), false);

    // Modify file
    writeFile("src/lazy.ts", "modified");

    // Re-reconcile: now diverges from baseline
    state.reconcilePath("src/lazy.ts");
    assert.equal(state.hasSessionEdits(), true);

    // Revert to original content (same as baseline)
    writeFile("src/lazy.ts", content);
    state.reconcilePath("src/lazy.ts");
    assert.equal(state.hasSessionEdits(), false);
  });

  // -------------------------------------------------------------------------
  // Multiple independent instances don't share state
  // -------------------------------------------------------------------------
  test("separate factory instances do not share state", () => {
    const dir1 = path.join(tmpDir, "w1");
    const dir2 = path.join(tmpDir, "w2");
    fs.mkdirSync(dir1, { recursive: true });
    fs.mkdirSync(dir2, { recursive: true });

    writeFile("w1/shared.ts", "content1");
    writeFile("w2/shared.ts", "content2");

    const state1 = createSessionEditState({ worktree: dir1 });
    const state2 = createSessionEditState({ worktree: dir2 });

    // Establish baselines
    state1.reconcilePath("shared.ts");
    state2.reconcilePath("shared.ts");

    // Both at baseline → no edits
    assert.equal(state1.hasSessionEdits(), false);
    assert.equal(state2.hasSessionEdits(), false);

    // Modify state1's file
    writeFile("w1/shared.ts", "changed1");
    state1.reconcilePath("shared.ts");

    assert.equal(state1.hasSessionEdits(), true);
    assert.equal(state2.hasSessionEdits(), false); // state2 unaffected
  });

  // -------------------------------------------------------------------------
  // Missing file uses sentinel hash
  // -------------------------------------------------------------------------
  test("deleted-then-tracked file shows sentinel current hash", () => {
    writeFile("src/existed.ts", "existed");
    const state = createSessionEditState({ worktree: tmpDir });

    // Baseline established from existing file
    state.reconcilePath("src/existed.ts");
    assert.equal(state.hasSessionEdits(), false);

    // Delete → diverges from baseline
    removeFile("src/existed.ts");
    state.reconcilePath("src/existed.ts");

    assert.equal(state.hasSessionEdits(), true);
    assert.equal(state.getSessionEdits()[0]?.currentHash, "<deleted>");
    assert.equal(state.getSessionEdits()[0]?.baselineHash, hash("existed"));
  });

  // -------------------------------------------------------------------------
  // Entry shape verification
  // -------------------------------------------------------------------------
  test("SessionEditEntry has expected shape", () => {
    writeFile("src/shape.ts", "content");
    const state = createSessionEditState({ worktree: tmpDir, now: () => 123 });

    state.reconcilePath("src/shape.ts");
    // Modify to create an edit
    writeFile("src/shape.ts", "modified");
    state.reconcilePath("src/shape.ts");

    const editOrUndefined = state.getSessionEdits()[0];
    if (editOrUndefined === undefined) {
      throw new Error("Expected first session edit entry to exist");
    }
    const edit = editOrUndefined;
    assert.ok(edit.filePath);
    assert.equal(edit.baselineHash, hash("content"));
    assert.equal(edit.currentHash, hash("modified"));
    assert.equal(typeof edit.lastReconciledAt, "number");
    assert.equal(edit.lastReconciledAt, 123);
  });
});
