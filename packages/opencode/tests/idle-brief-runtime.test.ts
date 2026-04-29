import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { BriefingWorkspaceCtx } from "../src/briefing-runtime";
import type { AuditDelta } from "../src/idle-brief-audit";
import { generateIdleBrief, type CheckResult, type IdleBriefingResult } from "../src/idle-brief-runtime";
import { resolveBriefFilePath, resolveBriefsDir } from "../src/idle-brief-paths";

function createMockClient(checkResult: CheckResult, briefingResult: IdleBriefingResult) {
  return {
    session: {
      create: async () => ({
        data: { id: "worker-session-1" },
      }),
      prompt: async (parameters: { sessionID: string; parts: Array<{ type: string; text: string }> }) => {
        const request = JSON.parse(parameters.parts[0]?.text ?? "{}");
        if (request.tool === "kb_check") {
          return {
            data: {
              info: { id: "msg-1", role: "assistant" },
              parts: [{ type: "text", text: JSON.stringify(checkResult) }],
            },
          };
        }
        if (request.tool === "kb_briefing_generate") {
          return {
            data: {
              info: { id: "msg-1", role: "assistant" },
              parts: [{ type: "text", text: JSON.stringify(briefingResult) }],
            },
          };
        }
        return {
          data: {
            info: { id: "msg-1", role: "assistant" },
            parts: [{ type: "text", text: "{}" }],
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
  entries: Array<{ timestamp: string; operation: string; entityId: string }
>): AuditDelta {
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
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-brief-test-"));
    fs.mkdirSync(path.join(tempDir, ".kb", "briefs"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("generateIdleBrief", () => {
    it("returns success brief with zero violations", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-002" },
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-003" },
      ]);

      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };

      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "3 requirements added",
        promptBlock: "Use /brief-kibi for full details",
        citations: [{ id: "REQ-001", title: "Test Requirement" }],
      };

      const client = createMockClient(checkResult, briefingResult);
      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.success).toBe(true);
      expect(result.briefPath).not.toBeNull();
      expect(result.envelope).not.toBeNull();
      expect(result.envelope?.type).toBe("success");
      expect(result.envelope?.summary).toContain("3 requirements added");
      expect(result.envelope?.summary).toContain("clean");
    });

    it("returns warning brief with violations", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
      ]);

      const checkResult: CheckResult = {
        violations: [
          {
            rule: "symbol-coverage",
            entityId: "REQ-001",
            description: "Missing test coverage",
            suggestion: "Add tests",
            source: "test.ts",
          },
        ],
        count: 1,
        diagnostics: [],
      };

      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "1 requirement added with issues",
        promptBlock: "",
        citations: [],
      };

      const client = createMockClient(checkResult, briefingResult);
      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.success).toBe(true);
      expect(result.envelope?.type).toBe("warning");
      expect(result.envelope?.validation.count).toBe(1);
    });

    it("skips when no changes detected", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([]);

      const client = createMockClient({ violations: [], count: 0, diagnostics: [] }, {
        briefingState: "no_briefing",
        tldr: "",
        promptBlock: "",
        citations: [],
      });

      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.success).toBe(true);
      expect(result.envelope).toBeNull();
    });

    it("handles shell errors gracefully", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
      ]);

      const failingClient = {
        session: {
          create: async () => { throw new Error("Command failed"); },
          prompt: async () => { throw new Error("Command failed"); },
        },
      };


      const result = await generateIdleBrief(failingClient, workspaceCtx, auditDelta, "session-1");

      expect(result.success).toBe(true);
      expect(result.envelope).not.toBeNull();
      expect(result.envelope?.validation.count).toBe(0);
    });

    it("creates brief file on disk", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
      ]);

      const checkResult: CheckResult = { violations: [], count: 0, diagnostics: [] };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "Test brief",
        promptBlock: "",
        citations: [],
      };

      const client = createMockClient(checkResult, briefingResult);
      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.briefPath).not.toBeNull();
      // duplicate block removed
      if (result.briefPath) {
        expect(fs.existsSync(result.briefPath)).toBe(true);
        const content = fs.readFileSync(result.briefPath, "utf-8");
        const parsed = JSON.parse(content);
        expect(parsed.schemaVersion).toBe("1.0");
        expect(parsed.type).toBe("success");
        expect(parsed.briefing.tldr).toBe("Test brief");
      }
    });

    it("computes content hash for deduplication", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        { timestamp: "2024-01-01T00:00:00Z", operation: "upsert", entityId: "REQ-001" },
      ]);

      const checkResult: CheckResult = { violations: [], count: 0, diagnostics: [] };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "Test",
        promptBlock: "",
        citations: [],
      };

      const client = createMockClient(checkResult, briefingResult);
      const result = await generateIdleBrief(client, workspaceCtx, auditDelta, "session-1");

      expect(result.envelope?.contentHash).toBeDefined();
      expect(result.envelope?.contentHash.length).toBe(64); // SHA-256 hex
    });
  });
});

