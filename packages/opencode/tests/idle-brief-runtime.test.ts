import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { ToastCapableClient } from "../src/toast";
import type { BriefingWorkspaceCtx } from "../src/briefing-runtime";
import type { AuditDelta } from "../src/idle-brief-audit";
import { generateIdleBrief, type CheckResult, type IdleBriefingResult } from "../src/idle-brief-runtime";
import { resolveBriefFilePath, resolveBriefsDir } from "../src/idle-brief-paths";

function createMockSessionApi(checkResult: CheckResult, briefingResult: IdleBriefingResult) {
  let sessionId = "mock-session-123";

  return {
    session: {
      create: async () => {
        sessionId = `worker-${Date.now()}`;
        return { id: sessionId };
      },
      prompt: async (params: { tools?: Record<string, boolean> }) => {
        const tool = params?.tools ? Object.keys(params.tools)[0] : "";
        const result = tool === "kb_check" ? checkResult : briefingResult;
        return {
          data: {
            parts: [
              {
                type: "text",
                text: JSON.stringify(result),
              },
            ],
          },
        };
      },
    },
  };
}

function createWorkspaceCtx(workspaceRoot: string): BriefingWorkspaceCtx {
  return {
    workspaceRoot,
    branch: "main",
  };
}

function createAuditDelta(
  entries: Array<{ timestamp: string; operation: string; entityId: string }>
): AuditDelta {
  return {
    hasChanges: entries.length > 0,
    entries,
    newCursor: {
      lastTimestamp: entries[entries.length - 1]?.timestamp ?? "",
      lastOperation: entries[entries.length - 1]?.operation ?? "",
      entryCount: entries.length,
      fileSize: 100,
    },
    contentHash: "abc123",
  };
}

describe("idle-brief-runtime", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-idle-test-"));
    const briefsDir = resolveBriefsDir(tmpDir);
    fs.mkdirSync(briefsDir, { recursive: true });
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe("generateIdleBrief", () => {
    it("returns success with null envelope when no changes", async () => {
      const client = createMockSessionApi(
        { violations: [], count: 0, diagnostics: [] },
        { briefingState: "ready", tldr: "test", promptBlock: "block", citations: [] }
      ) as unknown as ToastCapableClient;
      const workspaceCtx = createWorkspaceCtx(tmpDir);
      const auditDelta = createAuditDelta([]);

      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.success).toBe(true);
      expect(result.briefPath).toBeNull();
      expect(result.envelope).toBeNull();
      expect(result.toastMessage).toBe("Kibi: No changes detected. Brief skipped.");
    });

    it("returns failure when worker session unavailable", async () => {
      const client = {} as ToastCapableClient;
      const workspaceCtx = createWorkspaceCtx(tmpDir);
      const auditDelta = createAuditDelta([
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
      ]);

      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.success).toBe(false);
      expect(result.briefPath).toBeNull();
      expect(result.envelope).toBeNull();
      expect(result.toastMessage).toBe("Kibi: Worker session unavailable. Brief failed.");
    });

    it("creates success brief with zero violations", async () => {
      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "Test TLDR",
        promptBlock: "- Test prompt block",
        citations: [{ id: "REQ-001", type: "req", title: "Test Requirement" }],
      };

      const client = createMockSessionApi(checkResult, briefingResult) as unknown as ToastCapableClient;
      const workspaceCtx = createWorkspaceCtx(tmpDir);
      const auditDelta = createAuditDelta([
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
        { timestamp: "2024-01-01T00:00:01Z", operation: "upsert", entityId: "REQ-002" },
        { timestamp: "2024-01-01T00:00:02Z", operation: "upsert", entityId: "REQ-003" },
      ]);

      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.success).toBe(true);
      expect(result.briefPath).not.toBeNull();
      expect(result.envelope).not.toBeNull();
      expect(result.envelope?.type).toBe("success");
      expect(result.envelope?.summary).toContain("3 requirements added");
      expect(result.envelope?.summary).toContain("KB validation: clean");
      expect(result.envelope?.validation.violations).toEqual([]);
      expect(result.envelope?.validation.count).toBe(0);
      expect(result.envelope?.briefing.tldr).toBe("Test TLDR");
      expect(result.envelope?.briefing.promptBlock).toBe("- Test prompt block");
      expect(result.envelope?.briefing.citations).toHaveLength(1);
      expect(result.envelope?.briefing.citations?.[0].id).toBe("REQ-001");
      expect(result.envelope?.unread).toBe(true);
      expect(result.envelope?.contentHash).not.toBe("");
      expect(result.envelope?.createdAt).not.toBe("");
      expect(result.toastMessage).toContain("3 changes detected");
      expect(result.toastMessage).toContain("KB healthy");
    });

    it("creates warning brief with violations", async () => {
      const checkResult: CheckResult = {
        violations: [
          {
            rule: "must-priority-coverage",
            entityId: "REQ-001",
            description: "Missing coverage for must-priority requirement",
          },
          {
            rule: "symbol-traceability",
            entityId: "SYM-login",
            description: "Missing implements link",
          },
        ],
        count: 2,
        diagnostics: [
          {
            category: "coverage",
            severity: "warning",
            message: "Test diagnostic",
          },
        ],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "no_briefing",
        tldr: "Briefing unavailable",
        promptBlock: "",
        citations: [],
      };

      const client = createMockSessionApi(checkResult, briefingResult) as unknown as ToastCapableClient;
      const workspaceCtx = createWorkspaceCtx(tmpDir);
      const auditDelta = createAuditDelta([
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
      ]);

      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.success).toBe(true);
      expect(result.briefPath).not.toBeNull();
      expect(result.envelope).not.toBeNull();
      expect(result.envelope?.type).toBe("warning");
      expect(result.envelope?.summary).toContain("1 requirement added");
      expect(result.envelope?.summary).toContain("2 violations found");
      expect(result.envelope?.validation.violations).toHaveLength(2);
      expect(result.envelope?.validation.count).toBe(2);
      expect(result.envelope?.validation.diagnostics).toHaveLength(1);
      expect(result.toastMessage).toContain("1 changes detected");
      expect(result.toastMessage).toContain("2 validation issues found");
    });

    it("writes brief file atomically", async () => {
      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "Test",
        promptBlock: "block",
        citations: [],
      };

      const client = createMockSessionApi(checkResult, briefingResult) as unknown as ToastCapableClient;
      const workspaceCtx = createWorkspaceCtx(tmpDir);
      const auditDelta = createAuditDelta([
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
      ]);

      const timestamp = Date.now();
      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.briefPath).not.toBeNull();
      if (result.briefPath) {
        expect(fs.existsSync(result.briefPath)).toBe(true);
        const content = fs.readFileSync(result.briefPath, "utf-8");
        const parsed = JSON.parse(content);
        expect(parsed.briefId).not.toBeUndefined();
        expect(parsed.type).toBe("success");
        expect(parsed.contentHash).not.toBe("");
      }
    });

    it("includes relationship counts in envelope", async () => {
      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "Test",
        promptBlock: "block",
        citations: [],
      };

      const client = createMockSessionApi(checkResult, briefingResult) as unknown as ToastCapableClient;
      const workspaceCtx = createWorkspaceCtx(tmpDir);
      const auditDelta: AuditDelta = {
        hasChanges: true,
        entries: [
          { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
          { timestamp: "2024-01-01T00:00:01Z", operation: "upsert_rel", entityId: "REQ-001->REQ-002" },
        ],
        newCursor: {
          lastTimestamp: "2024-01-01T00:00:01Z",
          lastOperation: "upsert_rel",
          entryCount: 2,
          fileSize: 200,
        },
        contentHash: "xyz",
      };

      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.envelope?.counts.requirementsAdded).toBe(1);
      expect(result.envelope?.counts.relationshipsAdded).toBe(1);
      expect(result.envelope?.counts.entitiesDeleted).toBe(0);
    });

    it("includes delete operation counts in envelope", async () => {
      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "Test",
        promptBlock: "block",
        citations: [],
      };

      const client = createMockSessionApi(checkResult, briefingResult) as unknown as ToastCapableClient;
      const workspaceCtx = createWorkspaceCtx(tmpDir);
      const auditDelta: AuditDelta = {
        hasChanges: true,
        entries: [
          { timestamp: "2024-01-01T00:00:00Z", operation: "delete", entityId: "REQ-001" },
        ],
        newCursor: {
          lastTimestamp: "2024-01-01T00:00:00Z",
          lastOperation: "delete",
          entryCount: 1,
          fileSize: 50,
        },
        contentHash: "del",
      };

      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.envelope?.counts.entitiesDeleted).toBe(1);
      expect(result.envelope?.counts.requirementsAdded).toBe(0);
    });

    it("has all required envelope fields", async () => {
      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "TL;DR",
        promptBlock: "Block",
        citations: [{ id: "TEST-001" }],
      };

      const client = createMockSessionApi(checkResult, briefingResult) as unknown as ToastCapableClient;
      const workspaceCtx = createWorkspaceCtx(tmpDir);
      const auditDelta = createAuditDelta([
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
      ]);

      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-123");

      expect(result.envelope).not.toBeNull();
      const env = result.envelope!;

      expect(env.schemaVersion).toBe("1.0");
      expect(env.briefId).toStartWith("brief-");
      expect(env.type).toBe("success");
      expect(env.sessionId).toBe("session-123");
      expect(env.branch).toBe("main");
      expect(env.createdAt).not.toBe("");
      expect(env.unread).toBe(true);
      expect(env.auditCursor).not.toBeUndefined();
      expect(env.summary).not.toBe("");
      expect(env.counts).not.toBeUndefined();
      expect(env.validation).not.toBeUndefined();
      expect(env.briefing).not.toBeUndefined();
      expect(env.contentHash).not.toBe("");
    });
  });
});