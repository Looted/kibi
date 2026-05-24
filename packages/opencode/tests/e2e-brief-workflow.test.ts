/// <reference types="bun-types" />
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AuditDelta } from "../src/idle-brief-audit";
import { generateIdleBrief } from "../src/idle-brief-runtime";
import type { IdleBriefEnvelopeV2 } from "../src/idle-brief-store";
import {
  loadPendingBriefMarkers,
  deletePendingBriefMarkers,
} from "../src/utils/brief-marker";

describe("e2e brief workflow: marker → idle → narrative brief", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-e2e-brief-wf-"));
  });

  afterEach(() => {
    mock.restore();
    mock.clearAllMocks();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  /** Helper to create a minimal audit delta with one entity change */
  function makeAuditDelta(overrides: Partial<AuditDelta> = {}): AuditDelta {
    return {
      hasChanges: true,
      entries: [
        {
          timestamp: new Date().toISOString(),
          operation: "upsert",
          entityId: "REQ-001",
          payload: {
            kind: "entity",
            entityType: "req",
            changeKind: "created",
            title: "User authentication requirement",
            source: "docs/requirements/auth.md",
            properties: {},
          },
        },
      ],
      newCursor: {
        lastTimestamp: new Date().toISOString(),
        lastOperation: "upsert",
        entryCount: 1,
        fileSize: 200,
      },
      contentHash: "abc123",
      ...overrides,
    };
  }

  /**
   * Create a mock client that simulates kb_query and kb_graph tool calls
   * via the session API (create + prompt).
   *
   * The graph narrator creates a worker session, then calls kb_query per entity
   * and kb_graph per entity. The idle brief runtime also creates a session for
   * kb_check and kb_briefing_generate.
   *
   * We detect which tool is being called by inspecting the prompt text.
   */
  function makeMockClient(
    entityResponses: Record<string, unknown[]> = {},
    graphResponses: Record<string, unknown> = {},
  ) {
    let callIndex = 0;
    const sessionIdCounter = `mock-session-${Date.now()}`;

    const create = mock(async () => ({
      id: sessionIdCounter,
    }));

    const prompt = mock(async (params: {
      parts: Array<{ type: string; text: string }>;
      tools: Record<string, boolean>;
    }) => {
      callIndex++;

      // Parse the tool call from parts
      const textPart = params.parts?.[0]?.text;
      let parsed: { tool: string; args: Record<string, unknown> } | null = null;
      try {
        parsed = JSON.parse(textPart ?? "");
      } catch {
        // Not a JSON tool call
      }

      // kb_check
      if (parsed?.tool === "kb_check") {
        return {
          data: {
            parts: [
              {
                type: "text",
                text: JSON.stringify({
                  violations: [],
                  count: 0,
                  diagnostics: [],
                }),
              },
            ],
          },
        };
      }

      // kb_briefing_generate
      if (parsed?.tool === "kb_briefing_generate") {
        return {
          data: {
            parts: [
              {
                type: "text",
                text: JSON.stringify({
                  briefingState: "ready",
                  tldr: "Requirements updated with new authentication flow",
                  promptBlock: "Review auth changes",
                  citations: [],
                }),
              },
            ],
          },
        };
      }

      // kb_query
      if (parsed?.tool === "kb_query") {
        const id = String(parsed.args.id ?? "");
        const response = entityResponses[id] ?? [
          {
            id,
            type: inferTypeFromId(id),
            properties: {
              title: `Entity ${id}`,
              status: "active",
              source: `docs/${id}.md`,
            },
          },
        ];
        return {
          data: {
            parts: [
              {
                type: "text",
                text: JSON.stringify(response),
              },
            ],
          },
        };
      }

      // kb_graph
      if (parsed?.tool === "kb_graph") {
        const seedIds = (parsed.args.seedIds as string[]) ?? [];
        const primaryId = seedIds[0] ?? "";
        const response = graphResponses[primaryId] ?? { edges: [] };
        return {
          data: {
            parts: [
              {
                type: "text",
                text: JSON.stringify(response),
              },
            ],
          },
        };
      }

      // Default
      return {
        data: {
          parts: [{ type: "text", text: JSON.stringify(null) }],
        },
      };
    });

    return {
      session: { create, prompt },
    };
  }

  function inferTypeFromId(id: string): string {
    const prefix = id.split("-")[0]?.toLowerCase() ?? "entity";
    if (["req", "scenario", "test", "adr", "flag", "event", "symbol", "fact"].includes(prefix)) {
      return prefix;
    }
    if (prefix === "scen") return "scenario";
    if (prefix === "sym") return "symbol";
    return prefix;
  }

  it("writes marker, loads it, generates brief with semantic narrative", async () => {
    // ── Step 1: Write marker JSON to pending dir ──
    const pendingDir = path.join(tmpDir, ".kb", "briefs", "pending");
    fs.mkdirSync(pendingDir, { recursive: true });

    const markerData = {
      sessionId: "test-session-1234567890",
      timestamp: Date.now(),
      branch: "main",
      operation: "upsert",
      entityIds: ["REQ-001", "SCEN-002"],
      relationships: [
        { from: "SCEN-002", to: "REQ-001", type: "specified_by" },
        { from: "SYM-auth-handler", to: "REQ-001", type: "implements" },
      ],
    };

    const markerPath = path.join(
      pendingDir,
      "test-session-1234567890.json",
    );
    fs.writeFileSync(markerPath, JSON.stringify(markerData), "utf8");

    // ── Step 2: Load markers (simulating idle handler consuming them) ──
    const markers = loadPendingBriefMarkers(tmpDir, "main");

    assert.deepEqual(markers.entityIds, ["REQ-001", "SCEN-002"]);
    assert.equal(markers.relationships.length, 2);
    assert.equal(markers.markerPaths.length, 1);

    // ── Step 3: Create mock client with entity data for narrative ──
    const client = makeMockClient(
      {
        "REQ-001": [
          {
            id: "REQ-001",
            type: "req",
            properties: {
              title: "User authentication must use OAuth 2.0",
              status: "active",
              source: "docs/requirements/auth.md",
              tags: ["security", "auth"],
            },
          },
        ],
        "SCEN-002": [
          {
            id: "SCEN-002",
            type: "scenario",
            properties: {
              title: "Successful OAuth login flow",
              status: "active",
              source: "docs/scenarios/auth-flow.md",
              tags: ["auth"],
            },
          },
        ],
        "SYM-auth-handler": [
          {
            id: "SYM-auth-handler",
            type: "symbol",
            properties: {
              title: "handleOAuthCallback",
              status: "active",
              source: "packages/opencode/src/auth.ts",
              tags: [],
            },
          },
        ],
      },
      {
        "REQ-001": {
          edges: [
            { from: "SYM-auth-handler", to: "REQ-001", type: "implements" },
          ],
        },
        "SCEN-002": {
          edges: [
            { from: "SCEN-002", to: "REQ-001", type: "specified_by" },
          ],
        },
        "SYM-auth-handler": {
          edges: [],
        },
      },
    );

    // ── Step 4: Generate brief with marker data ──
    const auditDelta = makeAuditDelta();

    const result = await generateIdleBrief(
      client,
      { workspaceRoot: tmpDir, branch: "main" },
      auditDelta,
      "test-session-idle",
      {
        sourceFiles: markers.entityIds,
        changedEntityIds: markers.entityIds,
        relationships: markers.relationships,
      },
    );

    // ── Step 5: Assert success and envelope shape ──
    assert.equal(result.success, true, "Brief generation should succeed");
    assert.ok(result.envelope, "Brief should have an envelope");

    const envelope = result.envelope as IdleBriefEnvelopeV2;
    assert.equal(envelope.schemaVersion, "2.0");
    assert.ok(envelope.briefing, "Envelope should have briefing section");

    // ── Step 6: Assert changeNarrative has semantic content ──
    const narrative = envelope.briefing.changeNarrative;
    assert.ok(
      Array.isArray(narrative),
      "changeNarrative should be an array",
    );
    assert.ok(
      narrative.length > 0,
      "changeNarrative should not be empty",
    );

    // The narrative should contain semantic descriptions, not raw file paths
    const narrativeText = narrative.join(" ");

    // Should mention semantic concepts from the graph narrator
    const hasSemanticContent =
      narrativeText.includes("implements") ||
      narrativeText.includes("specified") ||
      narrativeText.includes("requirement") ||
      narrativeText.includes("scenario") ||
      narrativeText.includes("superseded") ||
      narrativeText.includes("coverage") ||
      narrativeText.includes("verified") ||
      narrativeText.includes("constrains");

    assert.ok(
      hasSemanticContent,
      `changeNarrative should contain semantic narrative terms, got: ${JSON.stringify(narrative)}`,
    );

    // Should NOT be just raw file paths
    const looksLikeFilePaths = narrative.every(
      (line) =>
        line.startsWith("docs/") ||
        line.startsWith("packages/") ||
        line.startsWith("src/"),
    );
    assert.ok(
      !looksLikeFilePaths,
      "changeNarrative should not be just file paths",
    );

    // Verify relationship changes produce human-readable sentences
    const relationshipNarratives = narrative.filter(
      (line) =>
        line.includes("implements") ||
        line.includes("specified"),
    );
    assert.ok(
      relationshipNarratives.length > 0,
      "Narrative should describe relationship changes (implements, specified_by)",
    );

    // ── Step 7: Clean up consumed markers ──
    const deleteResult = await deletePendingBriefMarkers(markers.markerPaths);
    assert.equal(deleteResult.deletedCount, 1);
    assert.equal(fs.existsSync(markerPath), false);
  });

  it("generates narrative describing superseded requirement", async () => {
    const pendingDir = path.join(tmpDir, ".kb", "briefs", "pending");
    fs.mkdirSync(pendingDir, { recursive: true });

    const markerData = {
      sessionId: "test-session-supersede",
      timestamp: Date.now(),
      branch: "main",
      operation: "upsert",
      entityIds: ["REQ-100", "REQ-200"],
      relationships: [
        { from: "REQ-200", to: "REQ-100", type: "supersedes" },
      ],
    };

    const markerPath = path.join(pendingDir, "test-supersede.json");
    fs.writeFileSync(markerPath, JSON.stringify(markerData), "utf8");

    const markers = loadPendingBriefMarkers(tmpDir, "main");

    const client = makeMockClient(
      {
        "REQ-100": [
          {
            id: "REQ-100",
            type: "req",
            properties: {
              title: "Legacy password auth",
              status: "superseded",
              source: "docs/requirements/auth-legacy.md",
            },
          },
        ],
        "REQ-200": [
          {
            id: "REQ-200",
            type: "req",
            properties: {
              title: "Modern SSO authentication",
              status: "active",
              source: "docs/requirements/auth-sso.md",
            },
          },
        ],
      },
      {
        "REQ-100": { edges: [] },
        "REQ-200": {
          edges: [
            { from: "REQ-200", to: "REQ-100", type: "supersedes" },
          ],
        },
      },
    );

    const auditDelta = makeAuditDelta();

    const result = await generateIdleBrief(
      client,
      { workspaceRoot: tmpDir, branch: "main" },
      auditDelta,
      "test-session-supersede",
      {
        sourceFiles: markers.entityIds,
        changedEntityIds: markers.entityIds,
        relationships: markers.relationships,
      },
    );

    assert.equal(result.success, true);
    assert.ok(result.envelope);

    const envelope = result.envelope as IdleBriefEnvelopeV2;
    const narrative = envelope.briefing.changeNarrative;
    assert.ok(Array.isArray(narrative) && narrative.length > 0);

    const narrativeText = narrative.join(" ");
    assert.ok(
      narrativeText.includes("superseded"),
      `Narrative should mention superseded relationship, got: ${JSON.stringify(narrative)}`,
    );

    // Clean up
    await deletePendingBriefMarkers(markers.markerPaths);
  });

  it("generates narrative with domain-grouped entity changes", async () => {
    const pendingDir = path.join(tmpDir, ".kb", "briefs", "pending");
    fs.mkdirSync(pendingDir, { recursive: true });

    const markerData = {
      sessionId: "test-session-domains",
      timestamp: Date.now(),
      branch: "main",
      operation: "upsert",
      entityIds: ["REQ-300", "TEST-301"],
      relationships: [
        { from: "TEST-301", to: "REQ-300", type: "verified_by" },
      ],
    };

    const markerPath = path.join(pendingDir, "test-domains.json");
    fs.writeFileSync(markerPath, JSON.stringify(markerData), "utf8");

    const markers = loadPendingBriefMarkers(tmpDir, "main");

    const client = makeMockClient(
      {
        "REQ-300": [
          {
            id: "REQ-300",
            type: "req",
            properties: {
              title: "Rate limiting for API endpoints",
              status: "active",
              source: "packages/opencode/docs/reqs/rate-limit.md",
            },
          },
        ],
        "TEST-301": [
          {
            id: "TEST-301",
            type: "test",
            properties: {
              title: "Rate limit integration test",
              status: "passing",
              source: "packages/opencode/tests/rate-limit.test.ts",
            },
          },
        ],
      },
      {
        "REQ-300": {
          edges: [
            { from: "TEST-301", to: "REQ-300", type: "verified_by" },
          ],
        },
        "TEST-301": {
          edges: [
            { from: "TEST-301", to: "REQ-300", type: "verified_by" },
          ],
        },
      },
    );

    const auditDelta = makeAuditDelta();

    const result = await generateIdleBrief(
      client,
      { workspaceRoot: tmpDir, branch: "main" },
      auditDelta,
      "test-session-domains",
      {
        sourceFiles: markers.entityIds,
        changedEntityIds: markers.entityIds,
        relationships: markers.relationships,
      },
    );

    assert.equal(result.success, true);
    assert.ok(result.envelope);

    const envelope = result.envelope as IdleBriefEnvelopeV2;
    const narrative = envelope.briefing.changeNarrative;
    assert.ok(Array.isArray(narrative) && narrative.length > 0);

    const narrativeText = narrative.join(" ");
    // Should mention the verified_by relationship semantically
    assert.ok(
      narrativeText.includes("verified") || narrativeText.includes("verified by"),
      `Narrative should mention verification relationship, got: ${JSON.stringify(narrative)}`,
    );

    // Clean up
    await deletePendingBriefMarkers(markers.markerPaths);
  });
});
