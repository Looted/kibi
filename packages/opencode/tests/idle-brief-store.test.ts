import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  createBriefId,
  computeContentHash,
} from "../src/idle-brief-store";
import {
  resolveBriefsDir,
  resolveAuditLogPath,
  resolveBriefFilePath,
  resolveTempBriefPath,
  atomicWriteBrief,
} from "../src/idle-brief-paths";

describe("idle-brief-store", () => {
  describe("createBriefId", () => {
    it("returns a string starting with brief-", () => {
      const id = createBriefId();
      expect(id.startsWith("brief-")).toBe(true);
    });

    it("returns unique ids", () => {
      const id1 = createBriefId();
      const id2 = createBriefId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("computeContentHash", () => {
    const baseEnvelope = {
      schemaVersion: "1.0" as const,
      briefId: "brief-1",
      type: "success" as const,
      sessionId: "session-1",
      branch: "main",
      createdAt: "2026-04-30T10:00:00Z",
      unread: true,
      auditCursor: { lastTimestamp: "2026-04-30T10:00:00Z", lastOperation: "upsert", entryCount: 1, fileSize: 100 },
      summary: "Test summary",
      counts: { requirementsAdded: 1, relationshipsAdded: 0, entitiesDeleted: 0 },
      validation: { violations: [], count: 0, diagnostics: [] },
      briefing: { tldr: "TLDR", promptBlock: "prompt block", citations: [{ id: "REQ-001", title: "Test req" }] },
      contentHash: "",
    };

    it("returns deterministic sha256 hex for same input", () => {
      const h1 = computeContentHash(baseEnvelope);
      const h2 = computeContentHash(baseEnvelope);
      expect(h1).toBe(h2);
      expect(h1.length).toBe(64);
    });

    it("returns different hash when visible content differs", () => {
      const env1 = { ...baseEnvelope, summary: "Summary A" };
      const env2 = { ...baseEnvelope, summary: "Summary B" };
      expect(computeContentHash(env1)).not.toBe(computeContentHash(env2));
    });

    it("ignores volatile fields: briefId, createdAt, sessionId, unread, auditCursor", () => {
      const env1 = { ...baseEnvelope, briefId: "brief-alpha", createdAt: "2026-01-01T00:00:00Z", sessionId: "sess-1", unread: true };
      const env2 = { ...baseEnvelope, briefId: "brief-beta", createdAt: "2026-12-31T23:59:59Z", sessionId: "sess-2", unread: false };
      expect(computeContentHash(env1)).toBe(computeContentHash(env2));
    });

    it("normalizes whitespace in string fields", () => {
      const env1 = { ...baseEnvelope, summary: "Hello  world" };
      const env2 = { ...baseEnvelope, summary: "  Hello   world  " };
      expect(computeContentHash(env1)).toBe(computeContentHash(env2));
    });

    it("produces same hash for same visible content across two envelopes with different briefIds", () => {
      const env1 = { ...baseEnvelope, briefId: "brief-aaa" };
      const env2 = { ...baseEnvelope, briefId: "brief-bbb" };
      expect(computeContentHash(env1)).toBe(computeContentHash(env2));
    });

    it("detects change when tldr differs", () => {
      const env1 = { ...baseEnvelope, briefing: { ...baseEnvelope.briefing, tldr: "Same" } };
      const env2 = { ...baseEnvelope, briefing: { ...baseEnvelope.briefing, tldr: "Different" } };
      expect(computeContentHash(env1)).not.toBe(computeContentHash(env2));
    });

    it("detects change when validation violations differ", () => {
      const env1 = { ...baseEnvelope, validation: { violations: [], count: 0, diagnostics: [] } };
      const env2 = { ...baseEnvelope, validation: { violations: [{ rule: "no-dangling-refs", entityId: "REQ-001", description: "Dangling ref" }], count: 1, diagnostics: [] } };
      expect(computeContentHash(env1)).not.toBe(computeContentHash(env2));
    });
  });
});


describe("idle-brief-paths", () => {
  const workspaceRoot = "/fake/workspace";

  it("resolveBriefsDir returns .kb/briefs path", () => {
    expect(resolveBriefsDir(workspaceRoot)).toBe(
      path.join(workspaceRoot, ".kb", "briefs")
    );
  });

  it("resolveAuditLogPath includes branch", () => {
    expect(resolveAuditLogPath(workspaceRoot, "main")).toBe(
      path.join(workspaceRoot, ".kb", "branches", "main", "audit.log")
    );
  });

  it("resolveBriefFilePath uses timestamp", () => {
    const ts = 1234567890;
    expect(resolveBriefFilePath(workspaceRoot, ts)).toBe(
      path.join(workspaceRoot, ".kb", "briefs", `${ts}_brief.json`)
    );
  });

  it("resolveTempBriefPath uses .tmp suffix", () => {
    const ts = 1234567890;
    expect(resolveTempBriefPath(workspaceRoot, ts)).toBe(
      path.join(workspaceRoot, ".kb", "briefs", `${ts}_brief.json.tmp`)
    );
  });

  it("atomicWriteBrief writes temp then renames", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    const ts = Date.now();
    const content = JSON.stringify({ test: true });

    atomicWriteBrief(tmpDir, ts, content);

    const finalPath = resolveBriefFilePath(tmpDir, ts);
    const tempPath = resolveTempBriefPath(tmpDir, ts);

    expect(fs.existsSync(finalPath)).toBe(true);
    expect(fs.existsSync(tempPath)).toBe(false);
    expect(fs.readFileSync(finalPath, "utf-8")).toBe(content);

    fs.unlinkSync(finalPath);
    fs.rmdirSync(path.join(tmpDir, ".kb", "briefs"));
    fs.rmdirSync(path.join(tmpDir, ".kb"));
    fs.rmdirSync(tmpDir);
  });
});
