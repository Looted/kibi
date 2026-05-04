import * as path from "node:path";
import * as fs from "node:fs";
import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import {
  createFileOperationState,
  type FileLifecycle,
  type ReminderKind,
} from "../src/file-operation-state";

describe("file-operation-state", () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), "test-file-operation-state-"));
  });

  after(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // Path normalization
  // -------------------------------------------------------------------------

  describe("normalizePath", () => {
    it("passes through relative paths unchanged", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      const result = state.normalizePath("src/file.ts");
      assert.equal(result, "src/file.ts");
    });

    it("converts absolute paths to relative to worktree", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      const absPath = path.join(tmpDir, "src", "file.ts");
      const result = state.normalizePath(absPath);
      assert.equal(result, path.normalize(path.join("src", "file.ts")));
    });

    it("normalizes leading ./ in paths", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      const result = state.normalizePath("./src/file.ts");
      assert.equal(result, "src/file.ts");
    });

    it("keeps absolute paths that escape worktree as-is", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      const otherDir = path.join(path.dirname(tmpDir), "other", "file.ts");
      const result = state.normalizePath(otherDir);
      assert.equal(result, otherDir);
    });
  });

  // -------------------------------------------------------------------------
  // Lifecycle coalescing
  // -------------------------------------------------------------------------

  describe("recordLifecycle coalescing", () => {
    it("created + edited -> created", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/file.ts", "created", 0);
      state.recordLifecycle("src/file.ts", "edited", 1);

      const pending = state.peekPending("src/file.ts");
      assert.ok(pending);
      assert.equal(pending?.lifecycle, "created");
    });

    it("edited + edited -> edited", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/file.ts", "edited", 0);
      state.recordLifecycle("src/file.ts", "edited", 1);

      const pending = state.peekPending("src/file.ts");
      assert.ok(pending);
      assert.equal(pending?.lifecycle, "edited");
    });

    it("created + deleted -> deleted", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/file.ts", "created", 0);
      state.recordLifecycle("src/file.ts", "deleted", 1);

      const pending = state.peekPending("src/file.ts");
      assert.ok(pending);
      assert.equal(pending?.lifecycle, "deleted");
    });

    it("edited + deleted -> deleted", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/file.ts", "edited", 0);
      state.recordLifecycle("src/file.ts", "deleted", 1);

      const pending = state.peekPending("src/file.ts");
      assert.ok(pending);
      assert.equal(pending?.lifecycle, "deleted");
    });

    it("deleted + created -> deleted", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/file.ts", "deleted", 0);
      state.recordLifecycle("src/file.ts", "created", 1);

      const pending = state.peekPending("src/file.ts");
      assert.ok(pending);
      assert.equal(pending?.lifecycle, "deleted");
    });

    it("deleted + edited -> deleted", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/file.ts", "deleted", 0);
      state.recordLifecycle("src/file.ts", "edited", 1);

      const pending = state.peekPending("src/file.ts");
      assert.ok(pending);
      assert.equal(pending?.lifecycle, "deleted");
    });

    it("tracks multiple independent files separately", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/one.ts", "created", 0);
      state.recordLifecycle("src/two.ts", "edited", 1);

      const pendingOne = state.peekPending("src/one.ts");
      const pendingTwo = state.peekPending("src/two.ts");
      assert.equal(pendingOne?.lifecycle, "created");
      assert.equal(pendingTwo?.lifecycle, "edited");
    });
  });

  // -------------------------------------------------------------------------
  // Pending lifecycle management
  // -------------------------------------------------------------------------

  describe("peekPending and consumePending", () => {
    it("returns null for paths with no pending events", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      const pending = state.peekPending("src/nonexistent.ts");
      assert.equal(pending, null);
    });

    it("prefers normalized preferred path when available", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/first.ts", "created", 0);
      state.recordLifecycle("src/second.ts", "edited", 1);

      const pending = state.peekPending("src/first.ts");
      assert.ok(pending);
      assert.equal(pending?.normalizedPath, "src/first.ts");
      assert.equal(pending?.lifecycle, "created");
    });

    it("returns most recent pending when no preferred match", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/first.ts", "created", 0);
      state.recordLifecycle("src/second.ts", "edited", 1);

      const pending = state.peekPending(); // No preferred path
      assert.ok(pending);
      assert.equal(pending?.normalizedPath, "src/second.ts"); // Most recent
      assert.equal(pending?.lifecycle, "edited");
    });

    it("removes pending event after consumePending", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/file.ts", "created", 0);

      assert.ok(state.peekPending("src/file.ts"));
      state.consumePending("src/file.ts");
      assert.equal(state.peekPending("src/file.ts"), null);
    });

    it("consumes only the specified path", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/first.ts", "created", 0);
      state.recordLifecycle("src/second.ts", "edited", 1);

      state.consumePending("src/first.ts");
      assert.equal(state.peekPending("src/first.ts"), null);
      assert.ok(state.peekPending("src/second.ts"));
    });
  });

  // -------------------------------------------------------------------------
  // Reminder suppression
  // -------------------------------------------------------------------------

  describe("hasShown and markShown", () => {
    it("returns false before marking reminder as shown", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      const result = state.hasShown("src/file.ts", "kibi_write");
      assert.equal(result, false);
    });

    it("returns true after marking reminder as shown", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.markShown("src/file.ts", "kibi_write");
      const result = state.hasShown("src/file.ts", "kibi_write");
      assert.equal(result, true);
    });

    it("suppresses per path and per reminder kind separately", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.markShown("src/file.ts", "kibi_write");

      assert.equal(state.hasShown("src/file.ts", "kibi_write"), true);
      assert.equal(state.hasShown("src/file.ts", "kibi_delete"), false);
      assert.equal(state.hasShown("src/other.ts", "kibi_write"), false);
    });

    it("tracks all four reminder kinds independently", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      const kinds: ReminderKind[] = [
        "kibi_write",
        "kibi_delete",
        "e2e_write",
        "e2e_delete",
      ];

      for (const kind of kinds) {
        assert.equal(state.hasShown("src/file.ts", kind), false);
        state.markShown("src/file.ts", kind);
        assert.equal(state.hasShown("src/file.ts", kind), true);
      }
    });

    it("does not suppress delete reminders just because write reminder fired", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.markShown("src/file.ts", "kibi_write");

      // Write reminder shown should NOT suppress delete reminder
      assert.equal(state.hasShown("src/file.ts", "kibi_delete"), false);
    });

    it("does not suppress e2e reminders based on kibi reminders", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.markShown("src/file.ts", "kibi_write");
      state.markShown("src/file.ts", "kibi_delete");

      // Kibi reminders shown should NOT suppress e2e reminders
      assert.equal(state.hasShown("src/file.ts", "e2e_write"), false);
      assert.equal(state.hasShown("src/file.ts", "e2e_delete"), false);
    });
  });

  // -------------------------------------------------------------------------
  // Per-instance state isolation
  // -------------------------------------------------------------------------

  describe("per-instance state isolation", () => {
    it("keeps state separate between instances", () => {
      const state1 = createFileOperationState({ worktree: tmpDir });
      const state2 = createFileOperationState({ worktree: tmpDir });

      state1.recordLifecycle("src/file.ts", "created", 0);
      state1.markShown("src/file.ts", "kibi_write");

      // State2 should not see state1's data
      assert.equal(state2.peekPending("src/file.ts"), null);
      assert.equal(state2.hasShown("src/file.ts", "kibi_write"), false);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe("edge cases", () => {
    it("coalesces multiple rapid events correctly", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      state.recordLifecycle("src/file.ts", "created", 0);
      state.recordLifecycle("src/file.ts", "edited", 1);
      state.recordLifecycle("src/file.ts", "edited", 2);
      state.recordLifecycle("src/file.ts", "deleted", 3);

      const pending = state.peekPending("src/file.ts");
      assert.equal(pending?.lifecycle, "deleted"); // deleted wins
    });

    it("uses provided timestamp when available", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      const customTime = 42;
      state.recordLifecycle("src/file.ts", "created", customTime);

      const pending = state.peekPending("src/file.ts");
      assert.equal(pending?.timestamp, customTime);
    });

    it("defaults timestamp to Date.now() when not provided", () => {
      const state = createFileOperationState({ worktree: tmpDir });
      const before = Date.now();
      state.recordLifecycle("src/file.ts", "created");
      const after = Date.now();

      const pending = state.peekPending("src/file.ts");
      assert.ok(pending?.timestamp! >= before);
      assert.ok(pending?.timestamp! <= after);
    });
  });
});
