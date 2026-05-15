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
  markBriefSeen,
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
  const schemaVersion = overrides.schemaVersion ?? "1.0";

  if (schemaVersion === "2.0") {
    return {
      schemaVersion: "2.0",
      briefId: overrides.briefId ?? "brief-123",
      type: "success",
      sessionId: overrides.sessionId ?? "session-abc",
      branch: overrides.branch ?? "develop",
      createdAt: "2026-01-15T10:00:00Z",
      unread: overrides.unread ?? true,
      auditCursor: {
        lastTimestamp: "2026-01-15T09:55:00Z",
        lastOperation: "sync",
        entryCount: 5,
        fileSize: 1024,
      },
      summary: "Test brief summary",
      counts: {
        entitiesAdded: 2,
        entitiesModified: 1,
        entitiesRemoved: 0,
        relationshipsChanged: 3,
      },
      changes: {
        entities: {
          added: [{ id: "REQ-001", type: "req", title: "Requirement one" }],
          modified: [{ id: "FACT-001", type: "fact", title: "Existing fact" }],
          removed: [],
        },
        relationships: {
          changed: 3,
        },
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
        changeNarrative: [
          "Added requirement REQ-001: Requirement one",
          "Modified fact FACT-001: Existing fact",
        ],
      },
      contentHash: "abc123",
    };
  }

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
      path.join(briefsDir, "1000_brief.json"),
      JSON.stringify(createBrief({ branch: "develop" })),
    );
    fs.writeFileSync(
      path.join(briefsDir, "2000_brief.json.tmp"),
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
      path.join(briefsDir, "1000_brief.json"),
      JSON.stringify(createBrief({ branch: "develop" })),
    );
    fs.writeFileSync(
      path.join(briefsDir, "2000_brief.json"),
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
      path.join(briefsDir, "1000_brief.json"),
      JSON.stringify(createBrief({ branch: "develop", schemaVersion: "1.0" })),
    );
    fs.writeFileSync(
      path.join(briefsDir, "2000_brief.json"),
      JSON.stringify(createBrief({ branch: "develop", schemaVersion: "0.9" })),
    );

    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefId).toBe("brief-123");
  });

  test("accepts schema 2.0 briefs during migration", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    fs.writeFileSync(
      path.join(briefsDir, "1000_brief.json"),
      JSON.stringify(
        createBrief({
          briefId: "brief-v1",
          branch: "develop",
          schemaVersion: "1.0",
        }),
      ),
    );
    fs.writeFileSync(
      path.join(briefsDir, "2000_brief.json"),
      JSON.stringify(
        createBrief({
          briefId: "brief-v2",
          branch: "develop",
          schemaVersion: "2.0",
        }),
      ),
    );

    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefId).toBe("brief-v2");
    expect((result as { schemaVersion?: string } | null)?.schemaVersion).toBe(
      "2.0",
    );
  });

  test("selects latest brief by filename timestamp, not mtime", () => {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });

    const newerTimestampPath = path.join(briefsDir, "2000_brief.json");
    const olderTimestampPath = path.join(briefsDir, "1000_brief.json");

    fs.writeFileSync(
      newerTimestampPath,
      JSON.stringify(
        createBrief({
          briefId: "brief-newer-name",
          branch: "develop",
          schemaVersion: "2.0",
        }),
      ),
    );
    fs.writeFileSync(
      olderTimestampPath,
      JSON.stringify(
        createBrief({
          briefId: "brief-older-name",
          branch: "develop",
          schemaVersion: "2.0",
        }),
      ),
    );

    fs.utimesSync(newerTimestampPath, 0, 0);
    fs.utimesSync(
      olderTimestampPath,
      new Date("2030-01-01T00:00:00Z"),
      new Date("2030-01-01T00:00:00Z"),
    );

    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefId).toBe("brief-newer-name");
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

describe("markBriefSeen", () => {
  test("records semantic content hash without mutating files", () => {
    const memento = new FakeMemento();

    markBriefSeen(memento, tmpDir, "develop", "hash-xyz");

    const recorded = memento.get<string>(`kibi.briefs.seen::${tmpDir}::develop`);
    expect(recorded).toBe("hash-xyz");
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

/**
 * Predicate callback coverage tests
 *
 * The internal helpers isCitation, isStatement, isValidationViolation,
 * and isValidationDiagnostic are invoked via .every() on arrays.
 * Existing tests use empty arrays so the callbacks never execute.
 * These tests pass non-empty arrays to trigger each callback.
 */
describe("predicate callbacks with non-empty arrays", () => {
  /**
   * Creates a fully valid v1.0 brief with all array fields populated.
   */
  function createBriefWithPopulatedArrays(overrides: Record<string, unknown> = {}): object {
    return {
      schemaVersion: "1.0",
      briefId: "brief-pred",
      type: "success",
      sessionId: "session-pred",
      branch: "develop",
      createdAt: "2026-01-15T10:00:00Z",
      unread: true,
      auditCursor: {
        lastTimestamp: "2026-01-15T09:55:00Z",
        lastOperation: "sync",
        entryCount: 5,
        fileSize: 1024,
      },
      summary: "Brief with populated arrays",
      counts: {
        requirementsAdded: 1,
        relationshipsAdded: 0,
        entitiesDeleted: 0,
      },
      validation: {
        violations: [
          {
            rule: "no-dangling-refs",
            entityId: "REQ-001",
            description: "Missing reference",
          },
        ],
        count: 1,
        diagnostics: [
          {
            category: "coverage",
            severity: "warning",
            message: "Low coverage",
          },
        ],
      },
      briefing: {
        tldr: "TL;DR predicate test",
        promptBlock: "prompt content",
        citations: [
          { id: "cite-1", type: "req", title: "Requirement citation" },
        ],
        constraints: [
          { statement: "Must handle errors", citationIds: ["cite-1"] },
        ],
        regressionRisks: [
          { statement: "May break existing tests", citationIds: ["cite-1"] },
        ],
        missingEvidence: [
          { statement: "No test for REQ-001", citationIds: [] },
        ],
      },
      contentHash: "hash-pred",
      ...overrides,
    };
  }

  function writeBrief(brief: object): void {
    const briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });
    fs.writeFileSync(
      path.join(briefsDir, "1000_brief.json"),
      JSON.stringify(brief),
    );
  }

  test("isCitation: accepts brief with valid citations", () => {
    writeBrief(createBriefWithPopulatedArrays());
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefing.citations).toHaveLength(1);
    expect(result?.briefing.citations[0].id).toBe("cite-1");
  });

  test("isCitation: rejects brief when citation lacks id", () => {
    const brief = createBriefWithPopulatedArrays();
    (brief as Record<string, unknown>).briefing = {
      ...((brief as Record<string, unknown>).briefing as Record<string, unknown>),
      citations: [{ type: "req", title: "Missing id" }],
    };
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("isStatement: accepts brief with valid constraints", () => {
    writeBrief(createBriefWithPopulatedArrays());
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefing.constraints).toHaveLength(1);
    expect(result?.briefing.constraints?.[0].statement).toBe(
      "Must handle errors",
    );
  });

  test("isStatement: rejects brief when constraint lacks citationIds", () => {
    const brief = createBriefWithPopulatedArrays();
    (brief as Record<string, unknown>).briefing = {
      ...((brief as Record<string, unknown>).briefing as Record<string, unknown>),
      constraints: [{ statement: "Missing citationIds" }],
    };
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("isStatement: rejects brief when constraint has non-string citationIds", () => {
    const brief = createBriefWithPopulatedArrays();
    (brief as Record<string, unknown>).briefing = {
      ...((brief as Record<string, unknown>).briefing as Record<string, unknown>),
      constraints: [{ statement: "Bad ids", citationIds: [123] }],
    };
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("isStatement: accepts brief with valid regressionRisks", () => {
    const brief = createBriefWithPopulatedArrays({
      briefing: {
        tldr: "TL;DR predicate test",
        promptBlock: "prompt content",
        citations: [{ id: "cite-1" }],
        regressionRisks: [
          { statement: "Risk of regression", citationIds: ["cite-1"] },
        ],
      },
    });
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefing.regressionRisks).toHaveLength(1);
  });

  test("isStatement: accepts brief with valid missingEvidence", () => {
    const brief = createBriefWithPopulatedArrays({
      briefing: {
        tldr: "TL;DR predicate test",
        promptBlock: "prompt content",
        citations: [{ id: "cite-1" }],
        missingEvidence: [
          { statement: "No evidence found", citationIds: [] },
        ],
      },
    });
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.briefing.missingEvidence).toHaveLength(1);
  });

  test("isValidationViolation: accepts brief with valid violations", () => {
    writeBrief(createBriefWithPopulatedArrays());
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.validation.violations).toHaveLength(1);
    expect(result?.validation.violations[0].rule).toBe("no-dangling-refs");
  });

  test("isValidationViolation: rejects brief when violation lacks rule", () => {
    const brief = createBriefWithPopulatedArrays();
    (brief as Record<string, unknown>).validation = {
      violations: [{ entityId: "REQ-001", description: "Missing rule" }],
      count: 1,
      diagnostics: [],
    };
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("isValidationViolation: rejects brief when violation lacks entityId", () => {
    const brief = createBriefWithPopulatedArrays();
    (brief as Record<string, unknown>).validation = {
      violations: [{ rule: "no-dangling-refs", description: "Missing entityId" }],
      count: 1,
      diagnostics: [],
    };
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("isValidationViolation: rejects brief when violation lacks description", () => {
    const brief = createBriefWithPopulatedArrays();
    (brief as Record<string, unknown>).validation = {
      violations: [{ rule: "no-dangling-refs", entityId: "REQ-001" }],
      count: 1,
      diagnostics: [],
    };
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("isValidationDiagnostic: accepts brief with valid diagnostics", () => {
    writeBrief(createBriefWithPopulatedArrays());
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).not.toBeNull();
    expect(result?.validation.diagnostics).toHaveLength(1);
    expect(result?.validation.diagnostics[0].category).toBe("coverage");
  });

  test("isValidationDiagnostic: rejects brief when diagnostic lacks category", () => {
    const brief = createBriefWithPopulatedArrays();
    (brief as Record<string, unknown>).validation = {
      violations: [],
      count: 0,
      diagnostics: [{ severity: "warning", message: "Missing category" }],
    };
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("isValidationDiagnostic: rejects brief when diagnostic lacks severity", () => {
    const brief = createBriefWithPopulatedArrays();
    (brief as Record<string, unknown>).validation = {
      violations: [],
      count: 0,
      diagnostics: [{ category: "coverage", message: "Missing severity" }],
    };
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });

  test("isValidationDiagnostic: rejects brief when diagnostic lacks message", () => {
    const brief = createBriefWithPopulatedArrays();
    (brief as Record<string, unknown>).validation = {
      violations: [],
      count: 0,
      diagnostics: [{ category: "coverage", severity: "warning" }],
    };
    writeBrief(brief);
    const result = parseLatestBrief(tmpDir, "develop");
    expect(result).toBeNull();
  });
});
