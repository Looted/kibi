import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { BriefingWorkspaceCtx } from "../src/briefing-runtime";
import type { AuditDelta, AuditEntry } from "../src/idle-brief-audit";
import {
  resolveBriefFilePath,
  resolveBriefsDir,
} from "../src/idle-brief-paths";
import {
  type CheckResult,
  type IdleBriefingResult,
  generateIdleBrief,
} from "../src/idle-brief-runtime";

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
  briefing: {
    tldr: string;
    promptBlock: string;
    citations: Array<{ id: string; title?: string }>;
    changeNarrative: string[];
  };
};

function createMockClient(
  checkResult: CheckResult,
  briefingResult: IdleBriefingResult,
) {
  return {
    session: {
      create: async () => ({
        data: { id: "worker-session-1" },
      }),
      prompt: async (parameters: {
        sessionID: string;
        parts: Array<{ type: string; text: string }>;
      }) => {
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

function createAuditDelta(entries: AuditEntry[]): AuditDelta {
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

function createEntityEntry(
  entityId: string,
  options: {
    timestamp: string;
    entityType: string;
    changeKind: "created" | "updated";
    title?: string;
    source?: string;
    textRef?: string;
  },
): AuditEntry {
  return {
    timestamp: options.timestamp,
    operation: "upsert",
    entityId,
    payload: {
      kind: "entity",
      entityType: options.entityType,
      changeKind: options.changeKind,
      ...(options.title ? { title: options.title } : {}),
      ...(options.source ? { source: options.source } : {}),
      ...(options.textRef ? { textRef: options.textRef } : {}),
      properties: {
        id: entityId,
        ...(options.title ? { title: options.title } : {}),
        ...(options.source ? { source: options.source } : {}),
        ...(options.textRef ? { text_ref: options.textRef } : {}),
        change_kind: options.changeKind,
      },
    },
  };
}

function createRelationshipEntry(
  timestamp: string,
  entityId: string,
): AuditEntry {
  return {
    timestamp,
    operation: "upsert_rel",
    entityId,
  };
}

function createDeleteEntry(timestamp: string, entityId: string): AuditEntry {
  return {
    timestamp,
    operation: "delete",
    entityId,
    payload: null,
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
        createEntityEntry("REQ-001", {
          timestamp: "2024-01-01T00:00:00Z",
          entityType: "req",
          changeKind: "created",
          title: "First requirement",
        }),
        createEntityEntry("REQ-002", {
          timestamp: "2024-01-01T00:00:01Z",
          entityType: "req",
          changeKind: "created",
          title: "Second requirement",
        }),
        createEntityEntry("REQ-003", {
          timestamp: "2024-01-01T00:00:02Z",
          entityType: "req",
          changeKind: "created",
          title: "Third requirement",
        }),
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
      const result = await generateIdleBrief(
        client,
        workspaceCtx,
        auditDelta,
        "session-1",
      );
      const envelope = result.envelope as FutureIdleBriefEnvelopeV2 | null;

      expect(result.success).toBe(true);
      expect(result.briefPath).not.toBeNull();
      expect(envelope).not.toBeNull();
      expect(envelope?.schemaVersion).toBe("2.0");
      expect(envelope?.type).toBe("success");
      expect(envelope?.summary).toContain("3 entities changed");
      expect(envelope?.summary).toContain("clean");
      expect(envelope?.counts).toEqual({
        entitiesAdded: 3,
        entitiesModified: 0,
        entitiesRemoved: 0,
        relationshipsChanged: 0,
      });
      expect(envelope?.changes.entities.added.map((item) => item.id)).toEqual([
        "REQ-001",
        "REQ-002",
        "REQ-003",
      ]);
      expect(envelope?.briefing.changeNarrative).toEqual([
        "Added requirement REQ-001: First requirement",
        "Added requirement REQ-002: Second requirement",
        "Added requirement REQ-003: Third requirement",
      ]);
    });

    it("returns warning brief with violations", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        {
          timestamp: "2024-01-01T00:00:00Z",
          operation: "upsert",
          entityId: "REQ-001",
        },
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
      const result = await generateIdleBrief(
        client,
        workspaceCtx,
        auditDelta,
        "session-1",
      );

      expect(result.success).toBe(true);
      expect(result.envelope?.type).toBe("warning");
      expect(result.envelope?.validation.count).toBe(1);
    });

    it("skips when no changes detected", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([]);

      const client = createMockClient(
        { violations: [], count: 0, diagnostics: [] },
        {
          briefingState: "no_briefing",
          tldr: "",
          promptBlock: "",
          citations: [],
        },
      );

      const result = await generateIdleBrief(
        client,
        workspaceCtx,
        auditDelta,
        "session-1",
      );

      expect(result.success).toBe(true);
      expect(result.envelope).toBeNull();
    });

    it("handles shell errors gracefully", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        {
          timestamp: "2024-01-01T00:00:00Z",
          operation: "upsert",
          entityId: "REQ-001",
        },
      ]);

      const failingClient = {
        session: {
          create: async () => {
            throw new Error("Command failed");
          },
          prompt: async () => {
            throw new Error("Command failed");
          },
        },
      };

      const result = await generateIdleBrief(
        failingClient,
        workspaceCtx,
        auditDelta,
        "session-1",
      );

      expect(result.success).toBe(true);
      expect(result.envelope).not.toBeNull();
      expect(result.envelope?.validation.count).toBe(0);
    });

    it("creates brief file on disk", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        createEntityEntry("REQ-001", {
          timestamp: "2024-01-01T00:00:00Z",
          entityType: "req",
          changeKind: "created",
          title: "Test requirement",
        }),
      ]);

      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "Test brief",
        promptBlock: "",
        citations: [],
      };

      const client = createMockClient(checkResult, briefingResult);
      const result = await generateIdleBrief(
        client,
        workspaceCtx,
        auditDelta,
        "session-1",
      );

      expect(result.briefPath).not.toBeNull();
      // duplicate block removed
      if (result.briefPath) {
        expect(fs.existsSync(result.briefPath)).toBe(true);
        const content = fs.readFileSync(result.briefPath, "utf-8");
        const parsed = JSON.parse(content) as FutureIdleBriefEnvelopeV2;
        expect(parsed.schemaVersion).toBe("2.0");
        expect(parsed.type).toBe("success");
        expect(parsed.briefing.tldr).toBe("Test brief");
        expect(parsed.briefing.changeNarrative).toEqual([
          "Added requirement REQ-001: Test requirement",
        ]);
      }
    });

    it("computes content hash for deduplication", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        {
          timestamp: "2024-01-01T00:00:00Z",
          operation: "upsert",
          entityId: "REQ-001",
        },
      ]);

      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "Test",
        promptBlock: "",
        citations: [],
      };

      const client = createMockClient(checkResult, briefingResult);
      const result = await generateIdleBrief(
        client,
        workspaceCtx,
        auditDelta,
        "session-1",
      );

      expect(result.envelope?.contentHash).toBeDefined();
      expect(result.envelope?.contentHash.length).toBe(64); // SHA-256 hex
    });

    it("uses accurate display wording: entities changed, relationships changed, entities deleted", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      // Mixed delta: upsert + upsert_rel + delete
      const auditDelta = createAuditDelta([
        createEntityEntry("REQ-001", {
          timestamp: "2024-01-01T00:00:00Z",
          entityType: "req",
          changeKind: "created",
          title: "First requirement",
        }),
        createRelationshipEntry("2024-01-01T00:00:01Z", "REQ-001->SCEN-001"),
        createEntityEntry("REQ-002", {
          timestamp: "2024-01-01T00:00:02Z",
          entityType: "req",
          changeKind: "created",
          title: "Second requirement",
        }),
        createEntityEntry("TEST-003", {
          timestamp: "2024-01-01T00:00:03Z",
          entityType: "test",
          changeKind: "updated",
          title: "Legacy test",
        }),
        createDeleteEntry("2024-01-01T00:00:04Z", "TEST-003"),
      ]);

      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "",
        promptBlock: "",
        citations: [],
      };

      const client = createMockClient(checkResult, briefingResult);
      const result = await generateIdleBrief(
        client,
        workspaceCtx,
        auditDelta,
        "session-1",
      );

      expect(result.success).toBe(true);
      expect(result.envelope).not.toBeNull();
      // Display text must say "entities changed" not "requirements added"
      expect(result.envelope?.summary).toContain("2 entities changed");
      expect(result.envelope?.summary).toContain("1 relationship changed");
      expect(result.envelope?.summary).toContain("1 entity deleted");
      // Must NOT contain old misleading wording
      expect(result.envelope?.summary).not.toContain("requirement");
      expect(result.envelope?.summary).not.toContain("added");
      const envelope = result.envelope as FutureIdleBriefEnvelopeV2 | null;
      expect(envelope?.counts).toEqual({
        entitiesAdded: 2,
        entitiesModified: 0,
        entitiesRemoved: 1,
        relationshipsChanged: 1,
      });
      expect(envelope?.changes.entities.removed).toEqual([
        { id: "TEST-003", type: "test", title: "Legacy test" },
      ]);
    });

    it("relationship-only delta shows only relationships in summary", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        {
          timestamp: "2024-01-01T00:00:00Z",
          operation: "upsert_rel",
          entityId: "REQ-001->SCEN-001",
        },
        {
          timestamp: "2024-01-01T00:00:01Z",
          operation: "upsert_rel",
          entityId: "REQ-001->TEST-001",
        },
      ]);

      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "",
        promptBlock: "",
        citations: [],
      };

      const client = createMockClient(checkResult, briefingResult);
      const result = await generateIdleBrief(
        client,
        workspaceCtx,
        auditDelta,
        "session-1",
      );

      expect(result.success).toBe(true);
      expect(result.envelope?.summary).toContain("2 relationships changed");
      expect(result.envelope?.summary).not.toContain("entities changed");
      const envelope = result.envelope as FutureIdleBriefEnvelopeV2 | null;
      expect(envelope?.counts).toEqual({
        entitiesAdded: 0,
        entitiesModified: 0,
        entitiesRemoved: 0,
        relationshipsChanged: 2,
      });
    });

    it("singular forms for single items", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        createEntityEntry("REQ-001", {
          timestamp: "2024-01-01T00:00:00Z",
          entityType: "req",
          changeKind: "created",
          title: "Single requirement",
        }),
      ]);

      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "",
        promptBlock: "",
        citations: [],
      };

      const client = createMockClient(checkResult, briefingResult);
      const result = await generateIdleBrief(
        client,
        workspaceCtx,
        auditDelta,
        "session-1",
      );

      expect(result.envelope?.summary).toContain("1 entity changed");
      // Must NOT be plural
      expect(result.envelope?.summary).not.toContain("1 entities changed");
    });

    it("persists constraints, regressionRisks, and missingEvidence through the envelope", async () => {
      const workspaceCtx = createWorkspaceCtx(tempDir);
      const auditDelta = createAuditDelta([
        {
          timestamp: "2024-01-01T00:00:00Z",
          operation: "upsert",
          entityId: "REQ-001",
        },
      ]);

      const checkResult: CheckResult = {
        violations: [],
        count: 0,
        diagnostics: [],
      };
      const briefingResult: IdleBriefingResult = {
        briefingState: "ready",
        tldr: "Brief with constraints",
        promptBlock: "- REQ-001: Respect constraints.",
        citations: [{ id: "REQ-001", type: "req", title: "Test" }],
        constraints: [
          { statement: "Keep tool read-only.", citationIds: ["ADR-001"] },
        ],
        regressionRisks: [
          { statement: "Preserve ordering.", citationIds: ["TEST-001"] },
        ],
        missingEvidence: [],
      };

      const client = createMockClient(checkResult, briefingResult);
      const result = await generateIdleBrief(
        client,
        workspaceCtx,
        auditDelta,
        "session-1",
      );

      expect(result.success).toBe(true);
      expect(result.envelope?.briefing.constraints).toEqual([
        { statement: "Keep tool read-only.", citationIds: ["ADR-001"] },
      ]);
      expect(result.envelope?.briefing.regressionRisks).toEqual([
        { statement: "Preserve ordering.", citationIds: ["TEST-001"] },
      ]);
      // missingEvidence is empty so should be omitted (spread only if non-empty)
      expect(result.envelope?.briefing.missingEvidence).toBeUndefined();
    });
  });
});
