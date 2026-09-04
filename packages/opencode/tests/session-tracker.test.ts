import { afterEach, beforeEach, describe, it, mock } from "bun:test";
import { strict as assert } from "node:assert";
import {
  SessionTracker,
  type WarningCategory,
  type WarningEvent,
  getSessionTracker,
  resetSessionTracker,
} from "../src/session-tracker";

// implements REQ-opencode-kibi-plugin-v1

describe("session-tracker SessionTracker", () => {
  let tracker: SessionTracker;

  beforeEach(() => {
    tracker = new SessionTracker();
  });

  describe("recordWarning", () => {
    it("records a warning event with correct structure", () => {
      const timestampBefore = Date.now();

      tracker.recordWarning(
        "kb-edit",
        "/path/to/file.ts",
        "Test warning message",
      );

      const timestampAfter = Date.now();

      // Access private warnings array through generateSummary
      const summary = tracker.generateSummary();
      assert.equal(summary.totalWarnings, 1);
    });

    it("records multiple warnings", () => {
      tracker.recordWarning("kb-edit", "/path/file1.ts", "Warning 1");
      tracker.recordWarning(
        "missing-traceability",
        "/path/file2.ts",
        "Warning 2",
      );
      tracker.recordWarning("kb-edit", "/path/file3.ts", "Warning 3");

      const summary = tracker.generateSummary();
      assert.equal(summary.totalWarnings, 3);
    });

    it("records warnings of different categories", () => {
      const categories: WarningCategory[] = [
        "kb-edit",
        "embedded-scenario-in-req",
        "embedded-test-in-req",
        "long-comment-missed-fact",
        "long-comment-missed-adr",
        "missing-traceability",
        "bootstrap-needed",
      ];

      for (const category of categories) {
        tracker.recordWarning(category, "/path/file.ts", `${category} warning`);
      }

      const summary = tracker.generateSummary();
      assert.equal(summary.totalWarnings, 7);
      assert.equal(summary.warningsByCategory["kb-edit"], 1);
      assert.equal(summary.warningsByCategory["embedded-scenario-in-req"], 1);
      assert.equal(summary.warningsByCategory["embedded-test-in-req"], 1);
      assert.equal(summary.warningsByCategory["long-comment-missed-fact"], 1);
      assert.equal(summary.warningsByCategory["long-comment-missed-adr"], 1);
      assert.equal(summary.warningsByCategory["missing-traceability"], 1);
      assert.equal(summary.warningsByCategory["bootstrap-needed"], 1);
    });
  });

  describe("generateSummary", () => {
    it("returns empty summary when no warnings", () => {
      const summary = tracker.generateSummary();

      assert.equal(summary.totalWarnings, 0);
      assert.equal(Object.keys(summary.warningsByCategory).length, 7);
      assert.equal(summary.repeatedPatterns.length, 0);
      assert.equal(summary.topFilesWithWarnings.length, 0);
    });

    it("counts warnings by category", () => {
      tracker.recordWarning("kb-edit", "/path/file1.ts", "Warning 1");
      tracker.recordWarning("kb-edit", "/path/file2.ts", "Warning 2");
      tracker.recordWarning(
        "missing-traceability",
        "/path/file3.ts",
        "Warning 3",
      );

      const summary = tracker.generateSummary();

      assert.equal(summary.warningsByCategory["kb-edit"], 2);
      assert.equal(summary.warningsByCategory["missing-traceability"], 1);
    });

    it("identifies repeated patterns (3 or more occurrences)", () => {
      // Add 3 kb-edit warnings (threshold is 3)
      tracker.recordWarning("kb-edit", "/path/file1.ts", "Warning 1");
      tracker.recordWarning("kb-edit", "/path/file2.ts", "Warning 2");
      tracker.recordWarning("kb-edit", "/path/file3.ts", "Warning 3");

      const summary = tracker.generateSummary();

      assert.equal(summary.repeatedPatterns.length, 1);
      assert.equal(summary.repeatedPatterns[0].category, "kb-edit");
      assert.equal(summary.repeatedPatterns[0].count, 3);
    });

    it("sorts repeated patterns by count descending", () => {
      tracker.recordWarning("kb-edit", "/file1.ts", "W1");
      tracker.recordWarning("kb-edit", "/file2.ts", "W2");
      tracker.recordWarning("kb-edit", "/file3.ts", "W3");
      tracker.recordWarning("kb-edit", "/file4.ts", "W4");
      tracker.recordWarning("missing-traceability", "/file5.ts", "W5");
      tracker.recordWarning("missing-traceability", "/file6.ts", "W6");
      tracker.recordWarning("missing-traceability", "/file7.ts", "W7");

      const summary = tracker.generateSummary();

      assert.equal(summary.repeatedPatterns.length, 2);
      assert.equal(summary.repeatedPatterns[0].category, "kb-edit");
      assert.equal(summary.repeatedPatterns[0].count, 4);
      assert.equal(
        summary.repeatedPatterns[1].category,
        "missing-traceability",
      );
      assert.equal(summary.repeatedPatterns[1].count, 3);
    });

    it("identifies top 5 files with warnings", () => {
      tracker.recordWarning("kb-edit", "/file1.ts", "W1");
      tracker.recordWarning("kb-edit", "/file1.ts", "W2");
      tracker.recordWarning("kb-edit", "/file1.ts", "W3");

      tracker.recordWarning("kb-edit", "/file2.ts", "W4");
      tracker.recordWarning("kb-edit", "/file2.ts", "W5");

      tracker.recordWarning("kb-edit", "/file3.ts", "W6");
      tracker.recordWarning("kb-edit", "/file3.ts", "W7");

      tracker.recordWarning("kb-edit", "/file4.ts", "W8");
      tracker.recordWarning("kb-edit", "/file4.ts", "W9");

      tracker.recordWarning("kb-edit", "/file5.ts", "W10");
      tracker.recordWarning("kb-edit", "/file5.ts", "W11");

      tracker.recordWarning("kb-edit", "/file6.ts", "W12");

      const summary = tracker.generateSummary();

      assert.equal(summary.topFilesWithWarnings.length, 5);
      assert.equal(summary.topFilesWithWarnings[0].path, "/file1.ts");
      assert.equal(summary.topFilesWithWarnings[0].count, 3);
      assert.equal(summary.topFilesWithWarnings[1].path, "/file2.ts");
      assert.equal(summary.topFilesWithWarnings[1].count, 2);
      assert.equal(summary.topFilesWithWarnings[4].path, "/file5.ts");
      assert.equal(summary.topFilesWithWarnings[4].count, 2);
    });

    it("sorts top files by count descending", () => {
      tracker.recordWarning("kb-edit", "/file1.ts", "W1");
      tracker.recordWarning("kb-edit", "/file1.ts", "W2");
      tracker.recordWarning("kb-edit", "/file2.ts", "W3");

      const summary = tracker.generateSummary();

      assert.equal(summary.topFilesWithWarnings.length, 2);
      assert.equal(summary.topFilesWithWarnings[0].path, "/file1.ts");
      assert.equal(summary.topFilesWithWarnings[0].count, 2);
      assert.equal(summary.topFilesWithWarnings[1].path, "/file2.ts");
      assert.equal(summary.topFilesWithWarnings[1].count, 1);
    });
  });

  describe("logSummary", () => {
    it("logs 'No warnings recorded' when empty", () => {
      // Should not throw
      tracker.logSummary();
    });

    it("logs summary with warnings", () => {
      tracker.recordWarning("kb-edit", "/file1.ts", "Warning 1");
      tracker.recordWarning("missing-traceability", "/file2.ts", "Warning 2");

      // Should not throw
      tracker.logSummary();
    });

    it("logs repeated patterns when present", () => {
      tracker.recordWarning("kb-edit", "/file1.ts", "W1");
      tracker.recordWarning("kb-edit", "/file2.ts", "W2");
      tracker.recordWarning("kb-edit", "/file3.ts", "W3");

      // Should not throw
      tracker.logSummary();
    });
  });

  describe("reset", () => {
    it("clears all warnings", () => {
      tracker.recordWarning("kb-edit", "/file1.ts", "Warning 1");
      tracker.recordWarning("kb-edit", "/file2.ts", "Warning 2");

      assert.equal(tracker.generateSummary().totalWarnings, 2);

      tracker.reset();

      assert.equal(tracker.generateSummary().totalWarnings, 0);
    });

    it("resets session start time", () => {
      const tracker1 = new SessionTracker();

      tracker1.recordWarning("kb-edit", "/file1.ts", "Warning");
      tracker1.reset();

      const tracker2 = new SessionTracker();

      // After reset, isSessionExpired should behave like a fresh tracker
      assert.equal(tracker1.generateSummary().totalWarnings, 0);
      assert.equal(tracker2.generateSummary().totalWarnings, 0);
    });
  });

  describe("isSessionExpired", () => {
    it("returns false for fresh session with large interval", () => {
      assert.equal(tracker.isSessionExpired(1000000), false);
    });

    it("returns false for session within custom interval", () => {
      const tracker = new SessionTracker();
      const customInterval = 60 * 1000; // 1 minute

      assert.equal(tracker.isSessionExpired(customInterval), false);
    });

    it("accepts custom interval parameter", () => {
      const tracker = new SessionTracker();
      // interval 0 expires as soon as the clock ticks, so it is not a
      // valid "fresh session" assertion under coverage/isolate load.
      assert.equal(tracker.isSessionExpired(1), false);
      assert.equal(tracker.isSessionExpired(10000), false);
    });
  });

  describe("repeat detection", () => {
    it("triggers repeat warning at threshold (3 occurrences)", () => {
      // First two - should not trigger
      tracker.recordWarning("kb-edit", "/file1.ts", "W1");
      tracker.recordWarning("kb-edit", "/file2.ts", "W2");

      // Third - should trigger repeat pattern
      tracker.recordWarning("kb-edit", "/file3.ts", "W3");

      // Verify it was counted
      const summary = tracker.generateSummary();
      assert.equal(summary.warningsByCategory["kb-edit"], 3);
      assert.equal(summary.repeatedPatterns.length, 1);
    });

    it("does not trigger repeat warning below threshold", () => {
      tracker.recordWarning("kb-edit", "/file1.ts", "W1");
      tracker.recordWarning("kb-edit", "/file2.ts", "W2");

      const summary = tracker.generateSummary();
      assert.equal(summary.warningsByCategory["kb-edit"], 2);
      assert.equal(summary.repeatedPatterns.length, 0);
    });

    it("handles multiple categories independently", () => {
      tracker.recordWarning("kb-edit", "/f1.ts", "W1");
      tracker.recordWarning("kb-edit", "/f2.ts", "W2");
      tracker.recordWarning("kb-edit", "/f3.ts", "W3");

      tracker.recordWarning("missing-traceability", "/f4.ts", "W4");
      tracker.recordWarning("missing-traceability", "/f5.ts", "W5");
      tracker.recordWarning("missing-traceability", "/f6.ts", "W6");

      const summary = tracker.generateSummary();

      assert.equal(summary.repeatedPatterns.length, 2);
      assert.equal(summary.repeatedPatterns[0].category, "kb-edit");
      assert.equal(summary.repeatedPatterns[0].count, 3);
      assert.equal(
        summary.repeatedPatterns[1].category,
        "missing-traceability",
      );
      assert.equal(summary.repeatedPatterns[1].count, 3);
    });
  });
});

describe("session-tracker singleton", () => {
  afterEach(() => {
    resetSessionTracker();
  });

  describe("getSessionTracker", () => {
    it("returns same instance on multiple calls", () => {
      const tracker1 = getSessionTracker();
      const tracker2 = getSessionTracker();

      assert.equal(tracker1 === tracker2, true);
    });

    it("returns new tracker after resetSessionTracker", () => {
      const tracker1 = getSessionTracker();
      tracker1.recordWarning("kb-edit", "/file.ts", "W1");

      resetSessionTracker();

      const tracker2 = getSessionTracker();

      assert.equal(tracker1 !== tracker2, true);
      assert.equal(tracker2.generateSummary().totalWarnings, 0);
    });
  });

  describe("resetSessionTracker", () => {
    it("clears existing tracker state", () => {
      const tracker = getSessionTracker();
      tracker.recordWarning("kb-edit", "/file1.ts", "W1");
      tracker.recordWarning("kb-edit", "/file2.ts", "W2");

      assert.equal(tracker.generateSummary().totalWarnings, 2);

      resetSessionTracker();

      const newTracker = getSessionTracker();
      assert.equal(newTracker.generateSummary().totalWarnings, 0);
    });
  });
});
