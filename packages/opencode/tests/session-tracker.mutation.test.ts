import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { resetClient, setClient } from "../src/logger";
import { SessionTracker } from "../src/session-tracker";

type Line = [string, string];
let lines: Line[] = [];

beforeEach(() => {
  lines = [];
  setClient({
    app: {
      log: async (payload) => {
        const body = payload.body as { level: string; message: string };
        lines.push([body.level, body.message]);
      },
    },
  });
});

afterEach(() => {
  resetClient();
  setSystemTime();
});

describe("SessionTracker expiry", () => {
  test("expires strictly after thirty minutes by default", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    setSystemTime(start);
    const tracker = new SessionTracker();
    setSystemTime(new Date(start.getTime() + 30 * 60 * 1000));
    expect(tracker.isSessionExpired()).toBe(false);
    setSystemTime(new Date(start.getTime() + 30 * 60 * 1000 + 1));
    expect(tracker.isSessionExpired()).toBe(true);
    expect(tracker.isSessionExpired(31 * 60 * 1000)).toBe(false);
  });
});

describe("SessionTracker warnings", () => {
  test("kb-edit and bootstrap-needed warn, the rest log info", () => {
    const tracker = new SessionTracker();
    tracker.recordWarning("kb-edit", "a.md", "m1");
    tracker.recordWarning("bootstrap-needed", "b.md", "m2");
    tracker.recordWarning("missing-traceability", "c.ts", "m3");
    tracker.recordWarning("long-comment-missed-fact", "d.ts", "m4");
    expect(lines).toStrictEqual([
      ["warn", "[kb-edit] m1"],
      ["warn", "[bootstrap-needed] m2"],
      ["info", "[missing-traceability] m3"],
      ["info", "[long-comment-missed-fact] m4"],
    ]);
  });

  test("the third warning of one category reports a repeated pattern once", () => {
    const tracker = new SessionTracker();
    tracker.recordWarning("kb-edit", "a", "x");
    tracker.recordWarning("missing-traceability", "a", "y");
    tracker.recordWarning("kb-edit", "a", "x");
    tracker.recordWarning("missing-traceability", "a", "y");
    expect(lines.filter(([, m]) => m.startsWith("pattern."))).toStrictEqual([]);
    tracker.recordWarning("kb-edit", "a", "x");
    tracker.recordWarning("kb-edit", "a", "x");
    expect(lines.filter(([, m]) => m.startsWith("pattern."))).toStrictEqual([
      [
        "warn",
        "pattern.repeat: kb-edit has occurred 3 times. Consider addressing this pattern systematically.",
      ],
    ]);
  });
});

describe("SessionTracker summary", () => {
  test("sorts repeated patterns and the top five files by count", () => {
    const tracker = new SessionTracker();
    for (let i = 0; i < 3; i++) tracker.recordWarning("kb-edit", "f1", "x");
    for (let i = 0; i < 4; i++) {
      tracker.recordWarning("missing-traceability", `f${i + 2}`, "y");
    }
    for (let i = 0; i < 2; i++) tracker.recordWarning("kb-edit", "f6", "z");
    tracker.recordWarning("kb-edit", "f5", "z");
    const summary = tracker.generateSummary();
    expect(summary.totalWarnings).toBe(10);
    expect(summary.repeatedPatterns).toStrictEqual([
      { category: "kb-edit", count: 6 },
      { category: "missing-traceability", count: 4 },
    ]);
    expect(summary.topFilesWithWarnings).toStrictEqual([
      { path: "f1", count: 3 },
      { path: "f5", count: 2 },
      { path: "f6", count: 2 },
      { path: "f2", count: 1 },
      { path: "f3", count: 1 },
    ]);
  });

  test("a later category with more warnings sorts first", () => {
    const tracker = new SessionTracker();
    for (let i = 0; i < 3; i++) tracker.recordWarning("kb-edit", "a", "x");
    for (let i = 0; i < 4; i++) {
      tracker.recordWarning("bootstrap-needed", "a", "y");
    }
    expect(tracker.generateSummary().repeatedPatterns).toStrictEqual([
      { category: "bootstrap-needed", count: 4 },
      { category: "kb-edit", count: 3 },
    ]);
  });

  test("logs nothing but a note when there are no warnings", () => {
    new SessionTracker().logSummary();
    expect(lines).toStrictEqual([
      ["info", "session.summary: No warnings recorded"],
    ]);
  });

  test("logs totals, non-zero categories and repeated patterns", () => {
    const tracker = new SessionTracker();
    for (let i = 0; i < 3; i++) tracker.recordWarning("kb-edit", "a", "x");
    tracker.recordWarning("missing-traceability", "b", "y");
    lines = [];
    tracker.logSummary();
    expect(lines).toStrictEqual([
      ["info", "session.summary: 4 total warnings"],
      ["info", "  kb-edit: 3"],
      ["info", "  missing-traceability: 1"],
      ["warn", "session.patterns: Repeated anti-patterns detected:"],
      ["warn", "  kb-edit: 3 occurrences"],
    ]);
  });

  test("no repeated patterns logs no pattern lines", () => {
    const tracker = new SessionTracker();
    tracker.recordWarning("kb-edit", "a", "x");
    lines = [];
    tracker.logSummary();
    expect(lines).toStrictEqual([
      ["info", "session.summary: 1 total warnings"],
      ["info", "  kb-edit: 1"],
    ]);
  });
});
