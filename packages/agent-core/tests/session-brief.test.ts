import { describe, expect, test } from "bun:test";
import * as entry from "../src/index.js";
import {
  NO_GIT_FINISH_LINE,
  REMEMBER_FINISH_LINE,
  SESSION_BRIEF,
  SESSION_BRIEF_LINES,
  sessionBriefFor,
  sessionBriefWith,
} from "../src/session-brief.js";

describe("session brief", () => {
  test("names the three steps of a change, when to take them, and the conflict rule", () => {
    expect(SESSION_BRIEF_LINES).toHaveLength(5);
    const [lead, search, record, check, conflict] = SESSION_BRIEF_LINES;
    expect(lead).toBe(
      "Kibi records this repository's requirements and decisions with their reasons.",
    );
    expect(search).toStartWith("- Before changing behaviour, kb_search");
    expect(search).toContain("kb_query the requirement that governs it");
    expect(record).toStartWith(
      "- Record a rule the person states with kb_record",
    );
    expect(record).toContain("in the same turn, with their reason");
    expect(record).toEndWith("it needs no permission.");
    expect(check).toStartWith(
      "- Before your final message, run the tests linked",
    );
    expect(check).toContain("kb_check with changed: true");
    expect(conflict).toContain(
      "would make a recorded requirement or decision false",
    );
    expect(conflict).toEndWith(
      "is a question, not a task: name the rule and ask.",
    );
  });

  test("is one block of its lines, short enough for every host's context", () => {
    expect(SESSION_BRIEF).toBe(SESSION_BRIEF_LINES.join("\n"));
    expect(SESSION_BRIEF.split("\n")).toStrictEqual([...SESSION_BRIEF_LINES]);
    // Claude Code caps hook context near 1,200 characters; the brief leaves
    // room for the host's own lines.
    expect(SESSION_BRIEF.length).toBeLessThanOrEqual(600);
  });

  test("puts host lines after the brief and drops empty ones", () => {
    expect(sessionBriefWith([])).toBe(SESSION_BRIEF);
    expect(sessionBriefWith(["", ""])).toBe(SESSION_BRIEF);
    expect(sessionBriefWith(["host one", "", "host two"])).toBe(
      `${SESSION_BRIEF}\nhost one\nhost two`,
    );
    expect(sessionBriefWith([" "])).toBe(`${SESSION_BRIEF}\n `);
    const rememberLines = sessionBriefWith(["host"], "remember").split("\n");
    expect(rememberLines[3]).toBe(REMEMBER_FINISH_LINE);
    expect(rememberLines.at(-1)).toBe("host");
  });

  test("is exported from the package entry point", () => {
    expect(entry.SESSION_BRIEF).toBe(SESSION_BRIEF);
    expect(entry.sessionBriefWith).toBe(sessionBriefWith);
  });
});

describe("sessionBriefFor", () => {
  test("is the session brief in a Git workspace", () => {
    expect(sessionBriefFor(false)).toBe(SESSION_BRIEF);
  });

  test("finishes with kibi check outside Git", () => {
    const brief = sessionBriefFor(true).split("\n");
    expect(brief).toHaveLength(SESSION_BRIEF_LINES.length);
    expect(brief[3]).toBe(NO_GIT_FINISH_LINE);
    expect(brief.join("\n")).not.toContain("--staged");
  });
});
