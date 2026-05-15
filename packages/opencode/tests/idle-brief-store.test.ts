import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  atomicWriteBrief,
  resolveAuditLogPath,
  resolveBriefFilePath,
  resolveBriefsDir,
  resolveTempBriefPath,
} from "../src/idle-brief-paths";
import { computeContentHash, createBriefId } from "../src/idle-brief-store";

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
      auditCursor: {
        lastTimestamp: "2026-04-30T10:00:00Z",
        lastOperation: "upsert",
        entryCount: 1,
        fileSize: 100,
      },
      summary: "Test summary",
      counts: {
        requirementsAdded: 1,
        relationshipsAdded: 0,
        entitiesDeleted: 0,
      },
      validation: { violations: [], count: 0, diagnostics: [] },
      briefing: {
        tldr: "TLDR",
        promptBlock: "prompt block",
        citations: [{ id: "REQ-001", title: "Test req" }],
      },
      contentHash: "",
    };

    const baseEnvelopeV2 = {
      schemaVersion: "2.0" as const,
      briefId: "brief-2",
      type: "success" as const,
      sessionId: "session-2",
      branch: "main",
      createdAt: "2026-05-01T10:00:00Z",
      unread: true,
      auditCursor: {
        lastTimestamp: "2026-05-01T10:00:00Z",
        lastOperation: "upsert",
        entryCount: 4,
        fileSize: 256,
      },
      summary: "Test summary",
      counts: {
        entitiesAdded: 1,
        entitiesModified: 1,
        entitiesRemoved: 0,
        relationshipsChanged: 2,
      },
      changes: {
        entities: {
          added: [{ id: "REQ-001", type: "req", title: "Test Requirement" }],
          modified: [{ id: "FACT-001", type: "fact", title: "Existing Fact" }],
          removed: [],
        },
        relationships: {
          changed: 2,
        },
      },
      validation: { violations: [], count: 0, diagnostics: [] },
      briefing: {
        tldr: "TLDR",
        promptBlock: "prompt block",
        citations: [
          {
            id: "REQ-001",
            type: "req",
            title: "Test req",
            source: "documentation/requirements/REQ-001.md",
            textRef: "documentation/requirements/REQ-001.md#L1",
          },
        ],
        changeNarrative: [
          "Added requirement REQ-001: Test Requirement",
          "Modified fact FACT-001: Existing Fact",
        ],
      },
      contentHash: "",
    };

    const baseEnvelopeV2WithReasons = {
      ...baseEnvelopeV2,
      briefing: {
        ...baseEnvelopeV2.briefing,
        deliveryReasons: {
          version: 1 as const,
          toast: {
            title: "Kibi Knowledge Update",
            summary: "  Added  requirement REQ-001  ",
            whyItMatters: "Keeps traceability fresh",
          },
          items: [
            {
              kind: "entity_added" as const,
              text: "  Added requirement REQ-001  ",
              entityIds: ["REQ-001"],
            },
          ],
        },
      },
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
      const env1 = {
        ...baseEnvelope,
        briefId: "brief-alpha",
        createdAt: "2026-01-01T00:00:00Z",
        sessionId: "sess-1",
        unread: true,
      };
      const env2 = {
        ...baseEnvelope,
        briefId: "brief-beta",
        createdAt: "2026-12-31T23:59:59Z",
        sessionId: "sess-2",
        unread: false,
      };
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
      const env1 = {
        ...baseEnvelope,
        briefing: { ...baseEnvelope.briefing, tldr: "Same" },
      };
      const env2 = {
        ...baseEnvelope,
        briefing: { ...baseEnvelope.briefing, tldr: "Different" },
      };
      expect(computeContentHash(env1)).not.toBe(computeContentHash(env2));
    });

    it("detects change when validation violations differ", () => {
      const env1 = {
        ...baseEnvelope,
        validation: { violations: [], count: 0, diagnostics: [] },
      };
      const env2 = {
        ...baseEnvelope,
        validation: {
          violations: [
            {
              rule: "no-dangling-refs",
              entityId: "REQ-001",
              description: "Dangling ref",
            },
          ],
          count: 1,
          diagnostics: [],
        },
      };
      expect(computeContentHash(env1)).not.toBe(computeContentHash(env2));
    });

    it("schema 2.0 hash changes when changeNarrative differs", () => {
      const env1 = {
        ...baseEnvelopeV2,
        briefing: {
          ...baseEnvelopeV2.briefing,
          changeNarrative: ["Added requirement REQ-001: Test Requirement"],
        },
      };
      const env2 = {
        ...baseEnvelopeV2,
        briefing: {
          ...baseEnvelopeV2.briefing,
          changeNarrative: ["Added requirement REQ-001: Renamed Requirement"],
        },
      };

      expect(computeContentHash(env1)).not.toBe(computeContentHash(env2));
    });

    it("schema 2.0 hash changes when structured changes differ", () => {
      const env1 = baseEnvelopeV2;
      const env2 = {
        ...baseEnvelopeV2,
        changes: {
          ...baseEnvelopeV2.changes,
          entities: {
            ...baseEnvelopeV2.changes.entities,
            modified: [
              { id: "FACT-001", type: "fact", title: "Existing Fact" },
              { id: "REQ-002", type: "req", title: "Another Requirement" },
            ],
          },
        },
      };

      expect(computeContentHash(env1)).not.toBe(computeContentHash(env2));
    });

    it("schema 2.0 envelope with deliveryReasons loads and hashes deterministically", () => {
      const env = baseEnvelopeV2WithReasons;

      expect(env.briefing.deliveryReasons.version).toBe(1);
      expect(computeContentHash(env)).toBe(computeContentHash(env));
    });

    it("schema 2.0 envelope without deliveryReasons still loads", () => {
      expect(computeContentHash(baseEnvelopeV2)).toBe(
        computeContentHash(baseEnvelopeV2),
      );
    });

    it("changing canonical deliveryReasons items text changes contentHash", () => {
      const env1 = baseEnvelopeV2WithReasons;
      const env2 = {
        ...baseEnvelopeV2WithReasons,
        briefing: {
          ...baseEnvelopeV2WithReasons.briefing,
          deliveryReasons: {
            ...baseEnvelopeV2WithReasons.briefing.deliveryReasons,
            items: [
              {
                ...baseEnvelopeV2WithReasons.briefing.deliveryReasons.items[0],
                text: "Added requirement REQ-001 with a different reason",
              },
            ],
          },
        },
      };

      expect(computeContentHash(env1)).not.toBe(computeContentHash(env2));
    });

    it("normalizes whitespace-only deliveryReasons changes", () => {
      const env1 = baseEnvelopeV2WithReasons;
      const env2 = {
        ...baseEnvelopeV2WithReasons,
        briefing: {
          ...baseEnvelopeV2WithReasons.briefing,
          deliveryReasons: {
            ...baseEnvelopeV2WithReasons.briefing.deliveryReasons,
            toast: {
              ...baseEnvelopeV2WithReasons.briefing.deliveryReasons.toast,
              summary: "Added requirement REQ-001",
            },
            items: [
              {
                ...baseEnvelopeV2WithReasons.briefing.deliveryReasons.items[0],
                text: "Added   requirement   REQ-001",
              },
            ],
          },
        },
      };

      expect(computeContentHash(env1)).toBe(computeContentHash(env2));
    });

    it("treats empty deliveryReasons items as absent", () => {
      const env1 = baseEnvelopeV2;
      const env2 = {
        ...baseEnvelopeV2,
        briefing: {
          ...baseEnvelopeV2.briefing,
          deliveryReasons: {
            version: 1 as const,
            toast: {
              title: "Kibi Knowledge Update",
              summary: "Added requirement REQ-001",
              whyItMatters: "Keeps traceability fresh",
            },
            items: [],
          },
        },
      };

      expect(computeContentHash(env1)).toBe(computeContentHash(env2));
    });

    it("schema 2.0 ignores volatile fields: briefId, createdAt, sessionId, unread, auditCursor", () => {
      const env1 = {
        ...baseEnvelopeV2,
        briefId: "brief-alpha",
        createdAt: "2026-01-01T00:00:00Z",
        sessionId: "sess-1",
        unread: true,
      };
      const env2 = {
        ...baseEnvelopeV2,
        briefId: "brief-beta",
        createdAt: "2026-12-31T23:59:59Z",
        sessionId: "sess-2",
        unread: false,
      };

      expect(computeContentHash(env1)).toBe(computeContentHash(env2));
    });

    it("same deliveryReasons across envelopes with different volatile fields produces same contentHash", () => {
      const reasons = {
        version: 1 as const,
        toast: {
          title: "Kibi Knowledge Update",
          summary: "Added requirement REQ-099",
          whyItMatters: "Entities were updated.",
        },
        items: [
          {
            kind: "entity_added" as const,
            text: "Added requirement REQ-099",
            entityIds: ["REQ-099"],
          },
        ],
      };

      const env1 = {
        ...baseEnvelopeV2,
        briefId: "brief-volatile-1",
        createdAt: "2026-01-01T00:00:00Z",
        sessionId: "sess-volatile-1",
        unread: true,
        briefing: {
          ...baseEnvelopeV2.briefing,
          deliveryReasons: reasons,
        },
      };
      const env2 = {
        ...baseEnvelopeV2,
        briefId: "brief-volatile-2",
        createdAt: "2026-12-31T23:59:59Z",
        sessionId: "sess-volatile-2",
        unread: false,
        briefing: {
          ...baseEnvelopeV2.briefing,
          deliveryReasons: reasons,
        },
      };

      expect(computeContentHash(env1)).toBe(computeContentHash(env2));
    });
  });
});

describe("idle-brief-paths", () => {
  const workspaceRoot = "/fake/workspace";

  it("resolveBriefsDir returns .kb/briefs path", () => {
    expect(resolveBriefsDir(workspaceRoot)).toBe(
      path.join(workspaceRoot, ".kb", "briefs"),
    );
  });

  it("resolveAuditLogPath includes branch", () => {
    expect(resolveAuditLogPath(workspaceRoot, "main")).toBe(
      path.join(workspaceRoot, ".kb", "branches", "main", "audit.log"),
    );
  });

  it("resolveBriefFilePath uses timestamp", () => {
    const ts = 1234567890;
    expect(resolveBriefFilePath(workspaceRoot, ts)).toBe(
      path.join(workspaceRoot, ".kb", "briefs", `${ts}_brief.json`),
    );
  });

  it("resolveTempBriefPath uses .tmp suffix", () => {
    const ts = 1234567890;
    expect(resolveTempBriefPath(workspaceRoot, ts)).toBe(
      path.join(workspaceRoot, ".kb", "briefs", `${ts}_brief.json.tmp`),
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
