import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  computeAuditDelta,
  getLatestAuditCursor,
  guardBranchChanged,
  type AuditCursor,
} from "../src/idle-brief-audit";
import { resolveAuditLogPath } from "../src/idle-brief-paths";
import { atomicWriteBrief } from "../src/idle-brief-paths";

describe("idle-brief-audit", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-audit-test-"));
  });

  afterEach(() => {
    // Cleanup
    try {
      fs.rmSync(path.join(tmpDir, ".kb"), { recursive: true, force: true });
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("computeAuditDelta", () => {
    it("returns hasChanges=false when no audit log exists", () => {
      const result = computeAuditDelta(tmpDir, "main", null);
      expect(result.hasChanges).toBe(false);
      expect(result.entries).toEqual([]);
      expect(result.newCursor.entryCount).toBe(0);
    });

    it("returns hasChanges=true on first read with entries", () => {
      // Create audit log with entries
      const auditPath = resolveAuditLogPath(tmpDir, "main");
      fs.mkdirSync(path.dirname(auditPath), { recursive: true });
      fs.writeFileSync(auditPath, `
changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-001',req-[id='REQ-001',title='Test']).
changeset('2026-04-25T10:01:00+00:00',upsert_rel,'REQ-001->SCEN-001',rel-[from='REQ-001',to='SCEN-001']).
      `.trim() + "\n", "utf-8");

      const result = computeAuditDelta(tmpDir, "main", null);
      expect(result.hasChanges).toBe(true);
      expect(result.entries.length).toBe(2);
      expect(result.entries[0].entityId).toBe("REQ-001");
      expect(result.entries[1].entityId).toBe("REQ-001->SCEN-001");
    });

    it("returns hasChanges=false when cursor unchanged", () => {
      // Create audit log
      const auditPath = resolveAuditLogPath(tmpDir, "main");
      fs.mkdirSync(path.dirname(auditPath), { recursive: true });
      const content = `changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-001',req-[id='REQ-001']).`;
      fs.writeFileSync(auditPath, content, "utf-8");

      // First read to get cursor
      const firstResult = computeAuditDelta(tmpDir, "main", null);
      const cursor = firstResult.newCursor;

      // Second read with same cursor - should return no changes
      const secondResult = computeAuditDelta(tmpDir, "main", cursor);
      expect(secondResult.hasChanges).toBe(false);
      expect(secondResult.entries).toEqual([]);
    });

    it("returns only new entries when file was appended to", () => {
      // Create initial audit log
      const auditPath = resolveAuditLogPath(tmpDir, "main");
      fs.mkdirSync(path.dirname(auditPath), { recursive: true });
      fs.writeFileSync(auditPath, 
        `changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-001',req-[id='REQ-001']).`,
        "utf-8"
      );

      // First read to get cursor
      const firstResult = computeAuditDelta(tmpDir, "main", null);
      const oldCursor = firstResult.newCursor;

      // Append new entry
      fs.appendFileSync(auditPath, 
        `\nchangeset('2026-04-25T10:01:00+00:00',upsert,'REQ-002',req-[id='REQ-002']).`,
        "utf-8"
      );

      // Second read should return only the new entry
      const secondResult = computeAuditDelta(tmpDir, "main", oldCursor);
      expect(secondResult.hasChanges).toBe(true);
      expect(secondResult.entries.length).toBe(1);
      expect(secondResult.entries[0].entityId).toBe("REQ-002");
    });

    it("filters out non-meaningful operations (only returns upsert/upsert_rel/delete)", () => {
      const auditPath = resolveAuditLogPath(tmpDir, "main");
      fs.mkdirSync(path.dirname(auditPath), { recursive: true });
      fs.writeFileSync(auditPath, `
changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-001',req-[id='REQ-001']).
changeset('2026-04-25T10:00:01+00:00',query,'REQ-001',req-[id='REQ-001']).
changeset('2026-04-25T10:00:02+00:00',upsert_rel,'REQ-001->SCEN-001',rel-[from='REQ-001']).
changeset('2026-04-25T10:00:03+00:00',delete,'REQ-002',null).
      `.trim() + "\n", "utf-8");

      const result = computeAuditDelta(tmpDir, "main", null);
      // query operations should be filtered out
      expect(result.entries.length).toBe(3);
      expect(result.entries.map(e => e.operation)).toEqual(["upsert", "upsert_rel", "delete"]);
    });
  });

  describe("getLatestAuditCursor", () => {
    it("returns null when briefs directory does not exist", () => {
      const cursor = getLatestAuditCursor(tmpDir, "main");
      expect(cursor).toBe(null);
    });

    it("returns null when no briefs for branch", () => {
      // Create briefs directory but no briefs for this branch
      const briefsDir = path.join(tmpDir, ".kb", "briefs");
      fs.mkdirSync(briefsDir, { recursive: true });
      fs.writeFileSync(path.join(briefsDir, "1234567890_brief.json"),
        JSON.stringify({ branch: "other-branch", auditCursor: { lastTimestamp: "test" } }), "utf-8");

      const cursor = getLatestAuditCursor(tmpDir, "main");
      expect(cursor).toBe(null);
    });

    it("reads cursor from existing brief files", () => {
      const briefsDir = path.join(tmpDir, ".kb", "briefs");
      fs.mkdirSync(briefsDir, { recursive: true });

      // Write a brief for main branch with cursor
      const brief = {
        schemaVersion: "1.0" as const,
        briefId: "test-1",
        type: "success" as const,
        sessionId: "session-1",
        branch: "main",
        createdAt: "2026-04-25T10:00:00Z",
        unread: false,
        auditCursor: {
          lastTimestamp: "2026-04-25T10:00:00+00:00",
          lastOperation: "upsert",
          entryCount: 5,
          fileSize: 1024,
        },
        summary: { requirementsAdded: 1, relationshipsAdded: 0, entitiesDeleted: 0 },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: { tldr: "test", promptBlock: "", citations: [] },
        contentHash: "abc123",
      };
      fs.writeFileSync(path.join(briefsDir, "1234567890_brief.json"),
        JSON.stringify(brief), "utf-8");

      const cursor = getLatestAuditCursor(tmpDir, "main");
      expect(cursor).not.toBe(null);
      expect(cursor?.lastTimestamp).toBe("2026-04-25T10:00:00+00:00");
      expect(cursor?.entryCount).toBe(5);
    });
  });

  describe("guardBranchChanged", () => {
    it("returns false when branches match", () => {
      expect(guardBranchChanged("main", "main")).toBe(false);
    });

    it("returns true when branches differ", () => {
      expect(guardBranchChanged("main", "feature-xyz")).toBe(true);
    });
  });
});