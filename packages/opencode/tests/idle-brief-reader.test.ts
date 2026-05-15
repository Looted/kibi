import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  markBriefRead,
  selectLatestPersistedBrief,
  selectLatestUnreadBrief,
} from "../src/idle-brief-reader";
import type {
  IdleBriefEnvelope,
  IdleBriefEnvelopeV1,
} from "../src/idle-brief-store";

type FutureIdleBriefEnvelopeV2 = {
  schemaVersion: "2.0";
  briefId: string;
  type: "success" | "warning";
  sessionId: string;
  branch: string;
  createdAt: string;
  unread: boolean;
  auditCursor: {
    lastTimestamp: string;
    lastOperation: string;
    entryCount: number;
    fileSize: number;
  };
  summary: string;
  counts: {
    entitiesAdded: number;
    entitiesModified: number;
    entitiesRemoved: number;
    relationshipsChanged: number;
  };
  changes: {
    entities: {
      added: Array<{ id: string; type: string; title?: string }>;
      modified: Array<{ id: string; type: string; title?: string }>;
      removed: Array<{ id: string; type: string; title?: string }>;
    };
    relationships: {
      changed: number;
    };
  };
  validation: {
    violations: Array<{
      rule: string;
      entityId: string;
      description: string;
      suggestion?: string;
      source?: string;
    }>;
    count: number;
    diagnostics: Array<{
      category: string;
      severity: string;
      message: string;
      file?: string;
      suggestion?: string;
    }>;
  };
  briefing: {
    tldr: string;
    promptBlock: string;
    citations: Array<{
      id: string;
      type?: string;
      title?: string;
      source?: string;
      textRef?: string;
    }>;
    changeNarrative: string[];
  };
  contentHash: string;
};

describe("idle-brief-reader", () => {
  let tmpDir: string;
  let briefsDir: string;

  function makeBriefV1(
    overrides: Partial<IdleBriefEnvelopeV1> = {},
  ): IdleBriefEnvelopeV1 {
    return {
      schemaVersion: "1.0",
      briefId: "test-brief",
      type: "success",
      sessionId: "session-1",
      branch: "main",
      createdAt: "2026-04-25T10:00:00Z",
      unread: true,
      auditCursor: {
        lastTimestamp: "2026-04-25T10:00:00+00:00",
        lastOperation: "upsert",
        entryCount: 1,
        fileSize: 100,
      },
      summary: "test summary",
      counts: {
        requirementsAdded: 1,
        relationshipsAdded: 0,
        entitiesDeleted: 0,
      },
      validation: { violations: [], count: 0, diagnostics: [] },
      briefing: { tldr: "test", promptBlock: "", citations: [] },
      contentHash: "abc123",
      ...overrides,
    };
  }

  function makeBriefV2(
    overrides: Partial<FutureIdleBriefEnvelopeV2> = {},
  ): FutureIdleBriefEnvelopeV2 {
    return {
      schemaVersion: "2.0",
      briefId: "test-brief-v2",
      type: "success",
      sessionId: "session-1",
      branch: "main",
      createdAt: "2026-04-25T10:00:00Z",
      unread: true,
      auditCursor: {
        lastTimestamp: "2026-04-25T10:00:00+00:00",
        lastOperation: "upsert",
        entryCount: 2,
        fileSize: 120,
      },
      summary: "test summary",
      counts: {
        entitiesAdded: 1,
        entitiesModified: 0,
        entitiesRemoved: 0,
        relationshipsChanged: 1,
      },
      changes: {
        entities: {
          added: [{ id: "REQ-001", type: "req", title: "Test requirement" }],
          modified: [],
          removed: [],
        },
        relationships: {
          changed: 1,
        },
      },
      validation: { violations: [], count: 0, diagnostics: [] },
      briefing: {
        tldr: "test",
        promptBlock: "",
        citations: [],
        changeNarrative: ["Added requirement REQ-001: Test requirement"],
      },
      contentHash: "abc123",
      ...overrides,
    };
  }

  function writeBrief(
    timestamp: number,
    brief: IdleBriefEnvelope | FutureIdleBriefEnvelopeV2,
  ): string {
    const filePath = path.join(briefsDir, `${timestamp}_brief.json`);
    fs.writeFileSync(filePath, JSON.stringify(brief, null, 2), "utf-8");
    return filePath;
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-brief-reader-test-"));
    briefsDir = path.join(tmpDir, ".kb", "briefs");
    fs.mkdirSync(briefsDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("selectLatestUnreadBrief", () => {
    it("selects the latest unread brief for the current branch", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-1" }));
      writeBrief(2000, makeBriefV1({ briefId: "brief-2" }));
      writeBrief(3000, makeBriefV1({ briefId: "brief-3" }));

      const result = selectLatestUnreadBrief(tmpDir, "main");
      expect(result).not.toBeNull();
      expect(result?.envelope.briefId).toBe("brief-3");
      expect(result?.filePath).toBe(path.join(briefsDir, "3000_brief.json"));
    });

    it("ignores read briefs (unread === false)", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-1", unread: true }));
      writeBrief(2000, makeBriefV1({ briefId: "brief-2", unread: false }));
      writeBrief(3000, makeBriefV1({ briefId: "brief-3", unread: false }));

      const result = selectLatestUnreadBrief(tmpDir, "main");
      expect(result).not.toBeNull();
      expect(result?.envelope.briefId).toBe("brief-1");
    });

    it("ignores briefs from other branches", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-1", branch: "main" }));
      writeBrief(
        2000,
        makeBriefV1({ briefId: "brief-2", branch: "feature-x" }),
      );
      writeBrief(
        3000,
        makeBriefV1({ briefId: "brief-3", branch: "feature-x" }),
      );

      const result = selectLatestUnreadBrief(tmpDir, "main");
      expect(result).not.toBeNull();
      expect(result?.envelope.briefId).toBe("brief-1");
    });

    it("ignores files ending in .tmp", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-1" }));
      // Write a .tmp file with a later timestamp
      const tmpPath = path.join(briefsDir, "9999_brief.json.tmp");
      fs.writeFileSync(
        tmpPath,
        JSON.stringify(makeBriefV1({ briefId: "tmp-brief" }), null, 2),
        "utf-8",
      );

      const result = selectLatestUnreadBrief(tmpDir, "main");
      expect(result).not.toBeNull();
      expect(result?.envelope.briefId).toBe("brief-1");
    });

    it("ignores invalid JSON files", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-1" }));
      // Write an invalid JSON file with a later timestamp
      const invalidPath = path.join(briefsDir, "9999_brief.json");
      fs.writeFileSync(invalidPath, "this is not valid json{{{", "utf-8");
      // }}}

      const result = selectLatestUnreadBrief(tmpDir, "main");
      expect(result).not.toBeNull();
      expect(result?.envelope.briefId).toBe("brief-1");
    });

    it("returns null when no unread briefs exist", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-1", unread: false }));

      const result = selectLatestUnreadBrief(tmpDir, "main");
      expect(result).toBeNull();
    });

    it("returns null when briefs directory does not exist", () => {
      // Remove the briefs directory
      fs.rmSync(briefsDir, { recursive: true, force: true });

      const result = selectLatestUnreadBrief(tmpDir, "main");
      expect(result).toBeNull();
    });

    it("accepts schema 2.0 briefs during migration", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-v1" }));
      writeBrief(2000, makeBriefV2({ briefId: "brief-v2" }));

      const result = selectLatestUnreadBrief(tmpDir, "main");
      const envelope = result?.envelope as
        | IdleBriefEnvelope
        | FutureIdleBriefEnvelopeV2
        | undefined;
      expect(result).not.toBeNull();
      expect(envelope?.briefId).toBe("brief-v2");
      expect(envelope?.schemaVersion).toBe("2.0");
    });

    it("ignores briefs with unsupported schemaVersion", () => {
      const wrongSchema = makeBriefV1({ briefId: "brief-1" });
      // @ts-expect-error - intentionally testing wrong schemaVersion
      wrongSchema.schemaVersion = "0.9";
      writeBrief(1000, wrongSchema);

      const result = selectLatestUnreadBrief(tmpDir, "main");
      expect(result).toBeNull();
    });
  });

  describe("markBriefRead", () => {
    it("flips unread to false", () => {
      const brief = makeBriefV1({ briefId: "brief-1", unread: true });
      const filePath = writeBrief(1000, brief);

      markBriefRead(tmpDir, filePath);

      const raw = fs.readFileSync(filePath, "utf-8");
      const updated = JSON.parse(raw) as IdleBriefEnvelope;
      expect(updated.unread).toBe(false);
    });

    it("preserves all other envelope fields", () => {
      const brief = makeBriefV1({
        briefId: "brief-preserve",
        unread: true,
        contentHash: "original-hash",
        auditCursor: {
          lastTimestamp: "2026-04-25T10:00:00+00:00",
          lastOperation: "upsert",
          entryCount: 5,
          fileSize: 500,
        },
      });
      const filePath = writeBrief(1000, brief);

      markBriefRead(tmpDir, filePath);

      const raw = fs.readFileSync(filePath, "utf-8");
      const updated = JSON.parse(raw) as IdleBriefEnvelope;

      expect(updated.unread).toBe(false);
      expect(updated.briefId).toBe("brief-preserve");
      expect(updated.contentHash).toBe("original-hash");
      expect(updated.auditCursor.entryCount).toBe(5);
      expect(updated.auditCursor.fileSize).toBe(500);
      expect(updated.schemaVersion).toBe("1.0");
      expect(updated.branch).toBe("main");
      expect(updated.sessionId).toBe("session-1");
    });

    it("uses atomic write pattern (temp file + rename)", () => {
      const brief = makeBriefV1({ briefId: "brief-atomic", unread: true });
      const filePath = writeBrief(2000, brief);

      // During the operation, a .tmp file should briefly exist
      // We verify the end state: no .tmp file remains, original file is updated
      markBriefRead(tmpDir, filePath);

      // Verify no .tmp file remains
      const tmpPath = `${filePath}.tmp`;
      expect(fs.existsSync(tmpPath)).toBe(false);

      // Verify the original file was updated
      const raw = fs.readFileSync(filePath, "utf-8");
      const updated = JSON.parse(raw) as IdleBriefEnvelope;
      expect(updated.unread).toBe(false);
      expect(updated.briefId).toBe("brief-atomic");
    });

    it("rejects paths outside .kb/briefs directory", () => {
      const brief = makeBriefV1({ briefId: "brief-security", unread: true });
      const filePath = writeBrief(1000, brief);
      const outsidePath = path.join(tmpDir, "outside.json");
      fs.writeFileSync(outsidePath, JSON.stringify(brief, null, 2), "utf-8");
      expect(() => markBriefRead(tmpDir, outsidePath)).toThrow("not inside");
      const raw = fs.readFileSync(filePath, "utf-8");
      const updated = JSON.parse(raw) as IdleBriefEnvelope;
      expect(updated.unread).toBe(true);
    });

    it("marks schema 2.0 briefs as read without altering structured fields", () => {
      const brief = makeBriefV2({
        briefId: "brief-v2-read",
        unread: true,
        briefing: {
          tldr: "TLDR",
          promptBlock: "",
          citations: [],
          changeNarrative: ["Added requirement REQ-001: Test requirement"],
        },
      });
      const filePath = writeBrief(3000, brief);

      markBriefRead(tmpDir, filePath);

      const raw = fs.readFileSync(filePath, "utf-8");
      const updated = JSON.parse(raw) as
        | IdleBriefEnvelope
        | FutureIdleBriefEnvelopeV2;

      expect(updated.schemaVersion).toBe("2.0");
      expect(updated.unread).toBe(false);
      expect("changes" in updated).toBe(true);
      if (updated.schemaVersion === "2.0") {
        expect(updated.changes.entities.added[0]?.id).toBe("REQ-001");
        expect(updated.briefing.changeNarrative).toEqual([
          "Added requirement REQ-001: Test requirement",
        ]);
      }
    });
  });

  describe("selectLatestPersistedBrief", () => {
    it("selects the latest persisted brief regardless of read status", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-1", unread: true }));
      writeBrief(2000, makeBriefV1({ briefId: "brief-2", unread: false }));
      writeBrief(3000, makeBriefV1({ briefId: "brief-3", unread: false }));

      const result = selectLatestPersistedBrief(tmpDir, "main");
      expect(result).not.toBeNull();
      expect(result?.envelope.briefId).toBe("brief-3");
      expect(result?.filePath).toBe(path.join(briefsDir, "3000_brief.json"));
    });

    it("selects latest brief when all briefs are already read", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-1", unread: false }));
      writeBrief(2000, makeBriefV1({ briefId: "brief-2", unread: false }));

      const result = selectLatestPersistedBrief(tmpDir, "main");
      expect(result).not.toBeNull();
      expect(result?.envelope.briefId).toBe("brief-2");
    });

    it("selects latest unread when unread ones exist", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-1", unread: true }));
      writeBrief(2000, makeBriefV1({ briefId: "brief-2", unread: false }));

      const result = selectLatestPersistedBrief(tmpDir, "main");
      expect(result).not.toBeNull();
      expect(result?.envelope.briefId).toBe("brief-2");
    });

    it("ignores briefs from other branches", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-1", branch: "main" }));
      writeBrief(
        2000,
        makeBriefV1({ briefId: "brief-2", branch: "feature-x" }),
      );
      writeBrief(
        3000,
        makeBriefV1({ briefId: "brief-3", branch: "feature-x" }),
      );

      const result = selectLatestPersistedBrief(tmpDir, "main");
      expect(result).not.toBeNull();
      expect(result?.envelope.briefId).toBe("brief-1");
    });

    it("returns null when no briefs exist", () => {
      const result = selectLatestPersistedBrief(tmpDir, "main");
      expect(result).toBeNull();
    });

    it("returns null when briefs directory does not exist", () => {
      fs.rmSync(briefsDir, { recursive: true, force: true });

      const result = selectLatestPersistedBrief(tmpDir, "main");
      expect(result).toBeNull();
    });

    it("supports schema 2.0 briefs", () => {
      writeBrief(1000, makeBriefV1({ briefId: "brief-v1", unread: false }));
      writeBrief(2000, makeBriefV2({ briefId: "brief-v2", unread: false }));

      const result = selectLatestPersistedBrief(tmpDir, "main");
      expect(result).not.toBeNull();
      expect(result?.envelope.briefId).toBe("brief-v2");
      expect(result?.envelope.schemaVersion).toBe("2.0");
    });

    it("ignores briefs with unsupported schemaVersion", () => {
      const wrongSchema = makeBriefV1({ briefId: "brief-1" });
      // @ts-expect-error - intentionally testing wrong schemaVersion
      wrongSchema.schemaVersion = "0.9";
      writeBrief(1000, wrongSchema);

      const result = selectLatestPersistedBrief(tmpDir, "main");
      expect(result).toBeNull();
    });
  });
});
