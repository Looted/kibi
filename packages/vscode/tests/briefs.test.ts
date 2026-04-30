/**
 * Tests for briefs.ts - Brief loading, parsing, and read-state management
 *
 * Tests all functions in briefs.ts using pure functions where possible,
 * with a simple fake Memento for workspace state tests.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Memento } from "vscode";
import {
  markBriefRead,
  parseLatestBrief,
  readBriefId,
  selectLatestBrief,
} from "../src/briefs";

/**
 * Simple fake Memento implementation for tests
 */
class FakeMemento implements Memento {
  private store = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T;
  }

  update(key: string, value: unknown): Thenable<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }

  keys(): readonly string[] {
    return Array.from(this.store.keys());
  }
}

/**
 * Creates a minimal valid brief JSON object
 */
function createBrief(
  overrides: Partial<{
    briefId: string;
    branch: string;
    unread: boolean;
    sessionId: string;
    schemaVersion: string;
  }> = {},
): object {
  return {
    schemaVersion: "1.0",
    briefId: "brief-123",
    type: "success",
    sessionId: "session-abc",
    branch: "develop",
    createdAt: "2026-01-15T10:00:00Z",
    unread: true,
    auditCursor: {
      lastTimestamp: "2026-01-15T09:55:00Z",
      lastOperation: "sync",
      entryCount: 5,
      fileSize: 1024,
    },
    summary: "Test brief summary",
    counts: {
      requirementsAdded: 2,
      relationshipsAdded: 3,
      entitiesDeleted: 0,
    },
    validation: {
      violations: [],
      count: 0,
      diagnostics: [],
    },
    briefing: {
      tldr: "TL;DR test",
      promptBlock: "prompt block content",
      citations: [],
    },
    contentHash: "abc123",
    ...overrides,
  };
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-briefs-test-"));
});

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe("parseLatestBrief", () => {
  test("returns null when no briefs directory exists", () => {
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("returns null when briefs directory is empty", () => {
    fs.mkdirSync(path.join(tmpDir, ".kb", "briefs"), { recursive: true });
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("filters briefs by branch name", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    // Create brief for different branch
    fs.writeFileSync(
      path.join(briefsDir, "brief-1_brief.json"),
      JSON.stringify(createBrief({ branch: "feature-x" })),
    );

    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("ignores .tmp files", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    // Create both a normal brief and a .tmp file
    fs.writeFileSync(
      path.join(briefsDir, "brief-1_brief.json"),
      JSON.stringify(createBrief({ branch: "develop" })),
    );
    fs.writeFileSync(
      path.join(briefsDir, "brief-2_brief.json.tmp"),
      JSON.stringify(createBrief({ branch: "develop" })),
    );

    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefId).toBe("brief-123");
  });

  test("ignores invalid JSON files", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    // Create a valid brief and an invalid one
    fs.writeFileSync(
      path.join(briefsDir, "brief-1_brief.json"),
      JSON.stringify(createBrief({ branch: "develop" })),
    );
    fs.writeFileSync(
      path.join(briefsDir, "brief-2_brief.json"),
      "not valid json{",
    );

    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefId).toBe("brief-123");
  });

  test("ignores briefs with wrong schema version", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    // Create a valid brief and one with wrong schema version
    fs.writeFileSync(
      path.join(briefsDir, "brief-1_brief.json"),
      JSON.stringify(createBrief({ branch: "develop", schemaVersion: "1.0" })),
    );
    fs.writeFileSync(
      path.join(briefsDir, "brief-2_brief.json"),
      JSON.stringify(createBrief({ branch: "develop", schemaVersion: "0.9" })),
    );

    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefId).toBe("brief-123");
  });

  test("selects latest brief by mtime when multiple valid briefs exist", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    // Brief 1 is older
    fs.writeFileSync(
      path.join(briefsDir, "brief-old_brief.json"),
      JSON.stringify(createBrief({ briefId: "brief-old", branch: "develop" })),
    );
    const oldPath = path.join(briefsDir, "brief-old_brief.json");
    fs.utimesSync(oldPath, 0, 0); // Set to epoch

    // Brief 2 is newer
    fs.writeFileSync(
      path.join(briefsDir, "brief-new_brief.json"),
      JSON.stringify(createBrief({ briefId: "brief-new", branch: "develop" })),
    );
    // New file gets current mtime by default

    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefId).toBe("brief-new");
  });
});

describe("selectLatestBrief", () => {
  test("returns same result as parseLatestBrief", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    fs.writeFileSync(
      path.join(briefsDir, "brief-1_brief.json"),
      JSON.stringify(createBrief({ branch: "develop" })),
    );

    const parsed = parseLatestBrief(tmpDir, "develop");
    const selected = selectLatestBrief(tmpDir, "develop");

    expect(selected).toEqual(parsed);
  });

  test("returns null when no briefs", () => {
    const result = selectLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });
});

describe("readBriefId", () => {
  test("returns undefined when no brief recorded", () => {
    const memento = new FakeMemento();
    const result = readBriefId(memento, tmpDir, "develop");
    expect(result).toBeUndefined();
  });

  test("returns recorded brief ID", () => {
    const memento = new FakeMemento();
    memento.update(`kibi.briefs.seen::${tmpDir}::develop`, "brief-456");

    const result = readBriefId(memento, tmpDir, "develop");
    expect(result).toBe("brief-456");
  });

  test("uses correct key format for different branches", () => {
    const memento = new FakeMemento();
    memento.update(`kibi.briefs.seen::${tmpDir}::main`, "brief-main");

    const developResult = readBriefId(memento, tmpDir, "develop");
    const mainResult = readBriefId(memento, tmpDir, "main");

    expect(developResult).toBeUndefined();
    expect(mainResult).toBe("brief-main");
  });
});

describe("markBriefRead", () => {
  test("updates workspaceState with brief ID", () => {
    const memento = new FakeMemento();
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const briefPath = path.join(briefsDir, "brief-1_brief.json");
    fs.writeFileSync(
      briefPath,
      JSON.stringify(createBrief({ briefId: "brief-789", branch: "develop" })),
    );

    markBriefRead(memento, tmpDir, "develop", "brief-789", briefPath);

    const recorded = memento.get<string>(
      `kibi.briefs.seen::${tmpDir}::develop`,
    );
    expect(recorded).toBe("brief-789");
  });

  test("atomically updates JSON file unread field to false", () => {
    const memento = new FakeMemento();
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const briefPath = path.join(briefsDir, "brief-1_brief.json");
    fs.writeFileSync(
      briefPath,
      JSON.stringify(
        createBrief({ briefId: "brief-atom", branch: "develop", unread: true }),
      ),
    );

    markBriefRead(memento, tmpDir, "develop", "brief-atom", briefPath);

    // Verify file was updated
    const updated = JSON.parse(fs.readFileSync(briefPath, "utf-8"));
    expect(updated.unread).toBe(false);
  });

  test("creates temp file before rename for atomic update", () => {
    const memento = new FakeMemento();
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const briefPath = path.join(briefsDir, "brief-1_brief.json");
    fs.writeFileSync(
      briefPath,
      JSON.stringify(createBrief({ briefId: "brief-tmp", branch: "develop" })),
    );

    markBriefRead(memento, tmpDir, "develop", "brief-tmp", briefPath);

    // Temp file should not exist after update
    const tempPath = `${briefPath}.tmp`;
    expect(fs.existsSync(tempPath)).toBe(false);
    // Main file should exist
    expect(fs.existsSync(briefPath)).toBe(true);
  });

  test("handles file update failure gracefully", () => {
    const memento = new FakeMemento();
    // Don't create briefs directory - file update should fail
    const nonexistentPath = path.join(tmpDir, ".kb", "briefs", "missing.json");

    // This should not throw - workspaceState still records the read
    markBriefRead(memento, tmpDir, "develop", "brief-fail", nonexistentPath);

    const recorded = memento.get<string>(
      `kibi.briefs.seen::${tmpDir}::develop`,
    );
    expect(recorded).toBe("brief-fail");
  });
});
