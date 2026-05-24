import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbDelete } from "../../src/tools/delete.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

type QueryResult = {
  success: boolean;
  bindings?: Record<string, string | undefined>;
  error?: string;
};

function createMockProlog(
  handler: (goal: string) => Promise<QueryResult> | QueryResult,
) {
  const query = mock(async (goal: string) => {
    const result = await handler(goal);
    return { bindings: {}, ...result };
  });
  const invalidateCache = mock(() => {});

  return {
    query,
    invalidateCache,
    prolog: {
      query,
      invalidateCache,
    } as unknown as PrologProcess,
  };
}

describe("brief pending markers", () => {
  const initialWorkspace = process.env.KIBI_WORKSPACE;
  const initialBranch = process.env.KIBI_BRANCH;
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-mcp-marker-"));
    await fs.mkdir(path.join(workspaceRoot, ".kb", "branches", "develop"), {
      recursive: true,
    });
    process.env.KIBI_WORKSPACE = workspaceRoot;
    process.env.KIBI_BRANCH = "develop";
  });

  afterEach(async () => {
    if (initialWorkspace === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    } else {
      process.env.KIBI_WORKSPACE = initialWorkspace;
    }
    if (initialBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = initialBranch;
    }
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  test("kb_upsert writes a pending marker and deduplicates by session", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-MARKER-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_relationship_upsert(specified_by,")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-MARKER-001",
      properties: {
        title: "Marker requirement",
        status: "open",
        source: "test://marker",
      },
      relationships: [
        {
          type: "specified_by",
          from: "REQ-MARKER-001",
          to: "SCEN-MARKER-001",
        },
      ],
      _requestId: "session-marker-1",
    } as Parameters<typeof handleKbUpsert>[1]);

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-MARKER-001",
      properties: {
        title: "Marker requirement",
        status: "open",
        source: "test://marker",
      },
      relationships: [
        {
          type: "specified_by",
          from: "REQ-MARKER-001",
          to: "SCEN-MARKER-001",
        },
      ],
      _requestId: "session-marker-1",
    } as Parameters<typeof handleKbUpsert>[1]);

    const pendingDir = path.join(workspaceRoot, ".kb", "briefs", "pending");
    const files = await fs.readdir(pendingDir);

    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^session-marker-1-\d+\.json$/);

    const marker = JSON.parse(
      await fs.readFile(path.join(pendingDir, files[0] ?? ""), "utf8"),
    ) as {
      sessionId: string;
      timestamp: number;
      branch: string;
      operation: string;
      entityIds: string[];
      relationships: Array<{ from: string; to: string; type: string }>;
    };

    expect(marker.sessionId).toBe("session-marker-1");
    expect(marker.branch).toBe("develop");
    expect(marker.operation).toBe("upsert");
    expect(marker.timestamp).toBeTypeOf("number");
    expect(marker.entityIds).toEqual(["REQ-MARKER-001"]);
    expect(marker.relationships).toEqual([
      {
        from: "REQ-MARKER-001",
        to: "SCEN-MARKER-001",
        type: "specified_by",
      },
    ]);
  });

  test("kb_delete writes deleted ids and relationship endpoints to a pending marker", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-DELETE-MARKER-001', _, _))") {
        return { success: true };
      }
      if (
        goal ===
        "findall([Type,'REQ-DELETE-MARKER-001',To], (member(Type, [depends_on, verified_by, validates, specified_by, relates_to, guards, publishes, consumes, implements, covered_by, executable_for, constrains, requires_property, supersedes, constrained_by]), kb_relationship(Type, 'REQ-DELETE-MARKER-001', To)), Relationships)"
      ) {
        return {
          success: true,
          bindings: {
            Relationships: "[[specified_by,'REQ-DELETE-MARKER-001','SCEN-DELETE-001']]",
          },
        };
      }
      if (
        goal ===
        "findall(['REQ-DELETE-MARKER-001',Type,Props], kb_entity('REQ-DELETE-MARKER-001', Type, Props), Results)"
      ) {
        return {
          success: true,
          bindings: {
            Results:
              "[['REQ-DELETE-MARKER-001',req,[id='REQ-DELETE-MARKER-001', title=\"Delete marker\", source=\"test://marker\"]]]",
          },
        };
      }
      if (
        goal.includes("kb_relationship") &&
        goal.includes("'REQ-DELETE-MARKER-001'") &&
        goal.includes("Dependents")
      ) {
        return { success: true, bindings: { Dependents: "[]" } };
      }
      if (
        goal ===
        "kb_retract_entity('REQ-DELETE-MARKER-001', req, [id='REQ-DELETE-MARKER-001', title=\"Delete marker\", source=\"test://marker\"] )"
      ) {
        return { success: true };
      }
      if (
        goal ===
        "kb_retract_entity('REQ-DELETE-MARKER-001', req, [id='REQ-DELETE-MARKER-001', title=\"Delete marker\", source=\"test://marker\"])"
      ) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await handleKbDelete(prolog, {
      ids: ["REQ-DELETE-MARKER-001"],
      _requestId: "session-delete-1",
    } as Parameters<typeof handleKbDelete>[1]);

    const pendingDir = path.join(workspaceRoot, ".kb", "briefs", "pending");
    const files = await fs.readdir(pendingDir);
    expect(files.length).toBe(1);

    const marker = JSON.parse(
      await fs.readFile(path.join(pendingDir, files[0] ?? ""), "utf8"),
    ) as {
      sessionId: string;
      branch: string;
      operation: string;
      entityIds: string[];
      relationships: Array<{ from: string; to: string; type: string }>;
    };

    expect(marker.sessionId).toBe("session-delete-1");
    expect(marker.branch).toBe("develop");
    expect(marker.operation).toBe("delete");
    expect(marker.entityIds).toEqual(["REQ-DELETE-MARKER-001"]);
    expect(marker.relationships).toEqual([
      {
        from: "REQ-DELETE-MARKER-001",
        to: "SCEN-DELETE-001",
        type: "specified_by",
      },
    ]);
  });

  test("does not write a marker when the mutation fails", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-MARKER-FAIL-001', _, _))") {
        return { success: false };
      }
      if (goal.startsWith("rdf_transaction((kb_assert_entity_no_audit(req,")) {
        return { success: true };
      }
      if (goal.startsWith("kb_log_entity_upsert(created, req,")) {
        return { success: true };
      }
      if (goal === "kb_save") {
        return { success: false, error: "disk full" };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(
      handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-MARKER-FAIL-001",
        properties: {
          title: "Marker failure",
          status: "open",
          source: "test://marker",
        },
        _requestId: "session-fail-1",
      } as Parameters<typeof handleKbUpsert>[1]),
    ).rejects.toThrow("Failed to save KB after upsert: disk full");

    const pendingDir = path.join(workspaceRoot, ".kb", "briefs", "pending");
    await expect(fs.readdir(pendingDir)).rejects.toThrow();
  });
});
