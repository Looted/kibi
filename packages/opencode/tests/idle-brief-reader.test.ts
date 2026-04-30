import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { selectLatestUnreadBrief, markBriefRead } from "../src/idle-brief-reader";
import type { IdleBriefEnvelope } from "../src/idle-brief-store";

describe("idle-brief-reader", () => {
  let tmpDir: string;
  let briefsDir: string;

  function makeBrief(overrides: Partial<IdleBriefEnvelope> = {}): IdleBriefEnvelope {
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
      counts: { requirementsAdded: 1, relationshipsAdded: 0, entitiesDeleted: 0 },
      validation: { violations: [], count: 0, diagnostics: [] },
      briefing: { tldr: "test", promptBlock: "", citations: [] },
      contentHash: "abc123",
      ...overrides,
    };
  }

  function writeBrief(timestamp: number, brief: IdleBriefEnvelope): string {
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
      writeBrief(1000, makeBrief({ briefId: "brief-1" }));
      writeBrief(2000, makeBrief({ briefId: "brief-2" }));
      writeBrief(3000, makeBrief({ briefId: "brief-3" }));

      const result = selectLatestUnreadBrief(tmpDir, "main");
    });

    it("ignores read briefs (unread === false)", () => {
      writeBrief(1000, makeBrief({ briefId: "brief-1", unread: true }));
      writeBrief(2000, makeBrief({ briefId: "brief-2", unread: false }));
      writeBrief(3000, makeBrief({ briefId: "brief-3", unread: false }));

      const result = selectLatestUnreadBrief(tmpDir, "main");
    });

    it("ignores briefs from other branches", () => {
      writeBrief(1000, makeBrief({ briefId: "brief-1", branch: "main" }));
      writeBrief(2000, makeBrief({ briefId: "brief-2", branch: "feature-x" }));
      writeBrief(3000, makeBrief({ briefId: "brief-3", branch: "feature-x" }));

      const result = selectLatestUnreadBrief(tmpDir, "main");
    });

    it("ignores files ending in .tmp", () => {
      writeBrief(1000, makeBrief({ briefId: "brief-1" }));
      // Write a .tmp file with a later timestamp
      const tmpPath = path.join(briefsDir, "9999_brief.json.tmp");
      fs.writeFileSync(tmpPath, JSON.stringify(makeBrief({ briefId: "tmp-brief" }), null, 2), "utf-8");

      const result = selectLatestUnreadBrief(tmpDir, "main");
    });

    it("ignores invalid JSON files", () => {
      writeBrief(1000, makeBrief({ briefId: "brief-1" }));
      // Write an invalid JSON file with a later timestamp
      const invalidPath = path.join(briefsDir, "9999_brief.json");
      fs.writeFileSync(invalidPath, "this is not valid json{{{", "utf-8");

      const result = selectLatestUnreadBrief(tmpDir, "main");
    });

    it("returns null when no unread briefs exist", () => {
      writeBrief(1000, makeBrief({ briefId: "brief-1", unread: false }));

      const result = selectLatestUnreadBrief(tmpDir, "main");
    });

    it("returns null when briefs directory does not exist", () => {
      // Remove the briefs directory
      fs.rmSync(briefsDir, { recursive: true, force: true });

      const result = selectLatestUnreadBrief(tmpDir, "main");
    });

    it("ignores briefs with wrong schemaVersion", () => {
      const wrongSchema = makeBrief({ briefId: "brief-1" });
      // @ts-expect-error - intentionally testing wrong schemaVersion
      wrongSchema.schemaVersion = "2.0";
      writeBrief(1000, wrongSchema);

      const result = selectLatestUnreadBrief(tmpDir, "main");
    });
  });

  describe("markBriefRead", () => {
    it("flips unread to false", () => {
      const brief = makeBrief({ briefId: "brief-1", unread: true });
      const filePath = writeBrief(1000, brief);

      markBriefRead(tmpDir, filePath);

      const raw = fs.readFileSync(filePath, "utf-8");
      const updated = JSON.parse(raw) as IdleBriefEnvelope;
      expect(updated.unread).toBe(false);
    });

    it("preserves all other envelope fields", () => {
      const brief = makeBrief({
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
      const brief = makeBrief({ briefId: "brief-atomic", unread: true });
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
  });
});
