import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  type AuditCursor,
  computeAuditDelta,
  getLatestAuditCursor,
  guardBranchChanged,
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
      fs.writeFileSync(
        auditPath,
        `${`
changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-001',req-[id='REQ-001',title='Test']).
changeset('2026-04-25T10:01:00+00:00',upsert_rel,'REQ-001->SCEN-001',rel-[from='REQ-001',to='SCEN-001']).
      `.trim()}
`,
        "utf-8",
      );

      const result = computeAuditDelta(tmpDir, "main", null);
      expect(result.hasChanges).toBe(true);
      expect(result.entries.length).toBe(2);
      expect(result.entries[0].entityId).toBe("REQ-001");
      expect(result.entries[1].entityId).toBe("REQ-001->SCEN-001");
    });

    it("retains parsed payload metadata for enriched and legacy entity audit entries", () => {
      const auditPath = resolveAuditLogPath(tmpDir, "main");
      fs.mkdirSync(path.dirname(auditPath), { recursive: true });
      fs.writeFileSync(
        auditPath,
        `${`
changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-001',req-[id='REQ-001',title='  Test Requirement  ',source='documentation/requirements/REQ-001.md',text_ref='documentation/requirements/REQ-001.md#L1',change_kind=created,created_at='2026-04-25T10:00:00Z',updated_at='2026-04-25T10:00:00Z']).
changeset('2026-04-25T10:00:01+00:00',delete,'REQ-002',req-[id='REQ-002',title='Legacy Requirement',source='documentation/requirements/REQ-002.md',text_ref='documentation/requirements/REQ-002.md#L2']).
changeset('2026-04-25T10:00:02+00:00',upsert,'REQ-003',req-[id='REQ-003',title='Legacy Shape']).
        `.trim()}
`,
        "utf-8",
      );

      const result = computeAuditDelta(tmpDir, "main", null);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0]?.payload).toEqual({
        kind: "entity",
        entityType: "req",
        changeKind: "created",
        title: "  Test Requirement  ",
        source: "documentation/requirements/REQ-001.md",
        textRef: "documentation/requirements/REQ-001.md#L1",
        properties: {
          id: "REQ-001",
          title: "  Test Requirement  ",
          source: "documentation/requirements/REQ-001.md",
          text_ref: "documentation/requirements/REQ-001.md#L1",
          change_kind: "created",
          created_at: "2026-04-25T10:00:00Z",
          updated_at: "2026-04-25T10:00:00Z",
        },
      });
      expect(result.entries[1]?.payload).toMatchObject({
        kind: "entity",
        entityType: "req",
        title: "Legacy Requirement",
        source: "documentation/requirements/REQ-002.md",
        textRef: "documentation/requirements/REQ-002.md#L2",
      });
      expect(result.entries[2]?.payload).toMatchObject({
        kind: "entity",
        entityType: "req",
        title: "Legacy Shape",
      });
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
      fs.writeFileSync(
        auditPath,
        `changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-001',req-[id='REQ-001']).`,
        "utf-8",
      );

      // First read to get cursor
      const firstResult = computeAuditDelta(tmpDir, "main", null);
      const oldCursor = firstResult.newCursor;

      // Append new entry
      fs.appendFileSync(
        auditPath,
        `\nchangeset('2026-04-25T10:01:00+00:00',upsert,'REQ-002',req-[id='REQ-002']).`,
        "utf-8",
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
      fs.writeFileSync(
        auditPath,
        `${`
changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-001',req-[id='REQ-001']).
changeset('2026-04-25T10:00:01+00:00',query,'REQ-001',req-[id='REQ-001']).
changeset('2026-04-25T10:00:02+00:00',upsert_rel,'REQ-001->SCEN-001',rel-[from='REQ-001']).
changeset('2026-04-25T10:00:03+00:00',delete,'REQ-002',null).
      `.trim()}
`,
        "utf-8",
      );

      const result = computeAuditDelta(tmpDir, "main", null);
      // query operations should be filtered out
      expect(result.entries.length).toBe(3);
      expect(result.entries.map((e) => e.operation)).toEqual([
        "upsert",
        "upsert_rel",
        "delete",
      ]);
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
      fs.writeFileSync(
        path.join(briefsDir, "1234567890_brief.json"),
        JSON.stringify({
          branch: "other-branch",
          auditCursor: { lastTimestamp: "test" },
        }),
        "utf-8",
      );

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
        summary: {
          requirementsAdded: 1,
          relationshipsAdded: 0,
          entitiesDeleted: 0,
        },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: { tldr: "test", promptBlock: "", citations: [] },
        contentHash: "abc123",
      };
      fs.writeFileSync(
        path.join(briefsDir, "1234567890_brief.json"),
        JSON.stringify(brief),
        "utf-8",
      );

      const cursor = getLatestAuditCursor(tmpDir, "main");
      expect(cursor).not.toBe(null);
      expect(cursor?.lastTimestamp).toBe("2026-04-25T10:00:00+00:00");
      expect(cursor?.entryCount).toBe(5);
    });

    it("prefers newest brief by immutable ordering after read rewrite", () => {
      const briefsDir = path.join(tmpDir, ".kb", "briefs");
      fs.mkdirSync(briefsDir, { recursive: true });

      const olderTimestamp = 1000000000;
      const newerTimestamp = 2000000000;

      const olderBrief = {
        schemaVersion: "1.0" as const,
        briefId: "older-brief",
        type: "success" as const,
        sessionId: "session-1",
        branch: "main",
        createdAt: "2026-04-25T09:00:00Z",
        unread: false,
        auditCursor: {
          lastTimestamp: "2026-04-25T09:00:00+00:00",
          lastOperation: "upsert",
          entryCount: 3,
          fileSize: 512,
        },
        summary: {
          requirementsAdded: 1,
          relationshipsAdded: 0,
          entitiesDeleted: 0,
        },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: { tldr: "older", promptBlock: "", citations: [] },
        contentHash: "older-hash",
      };

      const newerBrief = {
        schemaVersion: "1.0" as const,
        briefId: "newer-brief",
        type: "success" as const,
        sessionId: "session-2",
        branch: "main",
        createdAt: "2026-04-25T10:00:00Z",
        unread: false,
        auditCursor: {
          lastTimestamp: "2026-04-25T10:00:00+00:00",
          lastOperation: "upsert_rel",
          entryCount: 7,
          fileSize: 2048,
        },
        summary: {
          requirementsAdded: 2,
          relationshipsAdded: 1,
          entitiesDeleted: 0,
        },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: { tldr: "newer", promptBlock: "", citations: [] },
        contentHash: "newer-hash",
      };

      // Write both briefs
      fs.writeFileSync(
        path.join(briefsDir, `${olderTimestamp}_brief.json`),
        JSON.stringify(olderBrief),
        "utf-8",
      );
      fs.writeFileSync(
        path.join(briefsDir, `${newerTimestamp}_brief.json`),
        JSON.stringify(newerBrief),
        "utf-8",
      );

      // First call: should return newer brief's cursor
      const cursorBefore = getLatestAuditCursor(tmpDir, "main");
      expect(cursorBefore).not.toBe(null);
      expect(cursorBefore?.lastTimestamp).toBe("2026-04-25T10:00:00+00:00");
      expect(cursorBefore?.entryCount).toBe(7);

      // Simulate mark-read on the OLDER brief (rewrite its file, changing mtime)
      const rewrittenOlder = { ...olderBrief, unread: true };
      fs.writeFileSync(
        path.join(briefsDir, `${olderTimestamp}_brief.json`),
        JSON.stringify(rewrittenOlder),
        "utf-8",
      );

      // Second call: should STILL return newer brief's cursor (not the older one whose mtime changed)
      const cursorAfter = getLatestAuditCursor(tmpDir, "main");
      expect(cursorAfter).not.toBe(null);
      expect(cursorAfter?.lastTimestamp).toBe("2026-04-25T10:00:00+00:00");
      expect(cursorAfter?.entryCount).toBe(7);
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

  describe("session-baseline behavior", () => {
    it("computeAuditDelta with session baseline cursor returns only post-baseline entries", () => {
      // Simulate pre-existing audit history (before session started)
      const auditPath = resolveAuditLogPath(tmpDir, "main");
      fs.mkdirSync(path.dirname(auditPath), { recursive: true });
      fs.writeFileSync(
        auditPath,
        `changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-001',req-[id='REQ-001']).\n` +
          `changeset('2026-04-25T10:01:00+00:00',upsert,'REQ-002',req-[id='REQ-002']).\n` +
          `changeset('2026-04-25T10:02:00+00:00',upsert_rel,'REQ-001->SCEN-001',rel-[from='REQ-001']).`,
        "utf-8",
      );

      // First read captures baseline cursor (simulating session start)
      const baselineResult = computeAuditDelta(tmpDir, "main", null);
      const sessionBaseline = baselineResult.newCursor;
      expect(baselineResult.entries.length).toBe(3);

      // Simulate new activity after session started
      fs.appendFileSync(
        auditPath,
        `\nchangeset('2026-04-25T10:03:00+00:00',upsert,'REQ-003',req-[id='REQ-003']).`,
        "utf-8",
      );

      // Second read with session baseline should only return post-baseline entry
      const delta = computeAuditDelta(tmpDir, "main", sessionBaseline);
      expect(delta.hasChanges).toBe(true);
      expect(delta.entries.length).toBe(1);
      expect(delta.entries[0].entityId).toBe("REQ-003");
    });

    it("fresh session with no prior briefs uses null baseline (entire audit tail)", () => {
      const auditPath = resolveAuditLogPath(tmpDir, "main");
      fs.mkdirSync(path.dirname(auditPath), { recursive: true });
      fs.writeFileSync(
        auditPath,
        `changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-001',req-[id='REQ-001']).`,
        "utf-8",
      );

      // getLatestAuditCursor returns null when no briefs exist
      const baseline = getLatestAuditCursor(tmpDir, "main");
      expect(baseline).toBeNull();

      // computeAuditDelta with null cursor returns all entries
      const delta = computeAuditDelta(tmpDir, "main", null);
      expect(delta.hasChanges).toBe(true);
      expect(delta.entries.length).toBe(1);
    });

    it("session baseline captured from audit tail ignores pre-existing briefs", () => {
      // Write a pre-existing brief (from a prior session)
      const briefsDir = path.join(tmpDir, ".kb", "briefs");
      fs.mkdirSync(briefsDir, { recursive: true });
      const priorBrief = {
        schemaVersion: "1.0",
        briefId: "prior-1",
        type: "success",
        sessionId: "old-session",
        branch: "main",
        createdAt: "2026-04-25T09:00:00Z",
        unread: false,
        auditCursor: {
          lastTimestamp: "2026-04-25T09:00:00+00:00",
          lastOperation: "upsert",
          entryCount: 1,
          fileSize: 100,
        },
        summary: {
          requirementsAdded: 1,
          relationshipsAdded: 0,
          entitiesDeleted: 0,
        },
        validation: { violations: [], count: 0, diagnostics: [] },
        briefing: { tldr: "old", promptBlock: "", citations: [] },
        contentHash: "old-hash",
      };
      fs.writeFileSync(
        path.join(briefsDir, "1000000000_brief.json"),
        JSON.stringify(priorBrief),
        "utf-8",
      );

      // Write audit log with entries AFTER the prior brief cursor
      const auditPath = resolveAuditLogPath(tmpDir, "main");
      fs.mkdirSync(path.dirname(auditPath), { recursive: true });
      fs.writeFileSync(
        auditPath,
        `changeset('2026-04-25T09:00:00+00:00',upsert,'REQ-OLD',req-[id='REQ-OLD']).\n` +
          `changeset('2026-04-25T10:00:00+00:00',upsert,'REQ-NEW',req-[id='REQ-NEW']).`,
        "utf-8",
      );

      // getLatestAuditCursor returns prior brief cursor
      const priorCursor = getLatestAuditCursor(tmpDir, "main");
      expect(priorCursor).not.toBeNull();
      expect(priorCursor?.lastTimestamp).toBe("2026-04-25T09:00:00+00:00");

      // Using the prior cursor, delta should only return post-prior entries
      const delta = computeAuditDelta(tmpDir, "main", priorCursor);
      expect(delta.hasChanges).toBe(true);
      expect(delta.entries.length).toBe(1);
      expect(delta.entries[0].entityId).toBe("REQ-NEW");
    });
  });
});
