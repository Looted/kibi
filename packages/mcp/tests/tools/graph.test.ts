import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { PrologProcess as RealPrologProcess } from "kibi-cli/prolog";
import { handleKbGraph } from "../../src/tools/graph.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import {
  setupIsolatedCore,
  type IsolatedCoreFixture,
} from "./discovery-root-fixture.js";

describe("MCP graph tool handler", () => {
  test("returns bounded traversal results", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          nodes: [
            {
              id: "REQ-001",
              type: "req",
              title: "User authentication",
              status: "open",
            },
            {
              id: "SCEN-001",
              type: "scenario",
              title: "Login flow",
              status: "active",
            },
          ],
          edges: [{ type: "specified_by", from: "REQ-001", to: "SCEN-001" }],
          truncated: false,
          meta: {
            branch: "feature/discovery-bundle",
            snapshotId: "stamp:123",
            syncedAt: "2026-03-22T12:00:00Z",
            dirty: false,
          },
        }),
      },
    }));

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbGraph(prolog, {
      seedIds: ["REQ-001"],
      relationships: ["specified_by"],
      depth: 1,
    });

    expect(result.structuredContent?.nodes.length).toBe(2);
    expect(result.structuredContent?.edges[0]?.type).toBe("specified_by");
    expect(result.content[0]?.text).toContain("REQ-001");
  });
});

describe("kb_graph multi-relationship integration", () => {
  let prolog: RealPrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    prolog = new RealPrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
    testKbPath = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-graph-"));
  });

  beforeEach(async () => {
    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });
    await prolog.query(`kb_attach('${testKbPath}')`);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }
    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  test("returns edges for all requested relationship types (issue #113)", async () => {
    // Create seed entities
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-GRAPH-113",
      properties: { title: "Graph multi-rel test", status: "open" },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "SCEN-GRAPH-113",
      properties: { title: "Graph scenario", status: "active" },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "TEST-GRAPH-113",
      properties: { title: "Graph test", status: "passing" },
    });

    // Create relationships
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-GRAPH-113",
      properties: { title: "Graph multi-rel test", status: "open" },
      relationships: [
        { type: "specified_by", from: "REQ-GRAPH-113", to: "SCEN-GRAPH-113" },
        { type: "verified_by", from: "REQ-GRAPH-113", to: "TEST-GRAPH-113" },
      ],
    });

    // Query with both relationship types
    const result = await handleKbGraph(prolog, {
      seedIds: ["REQ-GRAPH-113"],
      relationships: ["specified_by", "verified_by"],
      direction: "outgoing",
      depth: 1,
    });

    const edges = result.structuredContent?.edges ?? [];
    const edgeTypes = edges.map((e) =>
      String((e as Record<string, unknown>).type),
    );

    // Should have edges of BOTH types
    expect(edgeTypes).toContain("specified_by");
    expect(edgeTypes).toContain("verified_by");
    expect(edges.length).toBe(2);

    // Reversing order should produce same result
    const reversed = await handleKbGraph(prolog, {
      seedIds: ["REQ-GRAPH-113"],
      relationships: ["verified_by", "specified_by"],
      direction: "outgoing",
      depth: 1,
    });
    expect(reversed.structuredContent?.edges?.length).toBe(2);
  });
});

describe("kb_graph isolated-core regression (issue #118)", () => {
  let prolog: RealPrologProcess;
  let fixture: IsolatedCoreFixture;

  beforeAll(async () => {
    fixture = setupIsolatedCore();
    prolog = new RealPrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
    await prolog.query(`kb_attach('${fixture.kbDataDir}')`);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }
    fixture.cleanup();
  });

  test("graph succeeds from isolated core root with repeated calls", async () => {
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-118-GRAPH",
      properties: { title: "Issue 118 graph regression", status: "open" },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "SCEN-118-GRAPH",
      properties: { title: "Issue 118 graph scenario", status: "active" },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "TEST-118-GRAPH",
      properties: { title: "Issue 118 graph test", status: "passing" },
    });
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-118-GRAPH",
      properties: { title: "Issue 118 graph regression", status: "open" },
      relationships: [
        { type: "specified_by", from: "REQ-118-GRAPH", to: "SCEN-118-GRAPH" },
        { type: "verified_by", from: "REQ-118-GRAPH", to: "TEST-118-GRAPH" },
      ],
    });

    const result1 = await handleKbGraph(prolog, {
      seedIds: ["REQ-118-GRAPH"],
      relationships: ["specified_by", "verified_by"],
      direction: "outgoing",
      depth: 1,
    });
    expect(result1.structuredContent?.nodes.length).toBe(3);
    expect(result1.structuredContent?.edges.length).toBe(2);

    const result2 = await handleKbGraph(prolog, {
      seedIds: ["REQ-118-GRAPH"],
      relationships: ["specified_by", "verified_by"],
      direction: "outgoing",
      depth: 1,
    });
    expect(result2.structuredContent?.nodes.length).toBe(3);
    expect(result2.structuredContent?.edges.length).toBe(2);
  });
});
