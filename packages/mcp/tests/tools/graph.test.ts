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
  type IsolatedCoreFixture,
  setupIsolatedCore,
} from "./discovery-root-fixture.js";

const KB_GRAPH_INTEGRATION_TIMEOUT_MS = 15_000;

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

  test(
    "returns edges for all requested relationship types (issue #113)",
    async () => {
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
    },
    KB_GRAPH_INTEGRATION_TIMEOUT_MS,
  );

  test(
    "returns scenario to test traversal edges for validates and verified_by",
    async () => {
      await handleKbUpsert(prolog, {
        type: "scenario",
        id: "SCEN-GRAPH-TRACE-001",
        properties: { title: "Graph trace scenario", status: "active" },
      });
      await handleKbUpsert(prolog, {
        type: "test",
        id: "TEST-GRAPH-TRACE-001",
        properties: { title: "Graph trace test", status: "passing" },
      });
      await handleKbUpsert(prolog, {
        type: "test",
        id: "TEST-GRAPH-TRACE-002",
        properties: { title: "Graph trace verified test", status: "passing" },
      });
      await handleKbUpsert(prolog, {
        type: "scenario",
        id: "SCEN-GRAPH-TRACE-001",
        properties: { title: "Graph trace scenario", status: "active" },
        relationships: [
          {
            type: "verified_by",
            from: "SCEN-GRAPH-TRACE-001",
            to: "TEST-GRAPH-TRACE-002",
          },
        ],
      });
      await handleKbUpsert(prolog, {
        type: "test",
        id: "TEST-GRAPH-TRACE-001",
        properties: { title: "Graph trace test", status: "passing" },
        relationships: [
          {
            type: "validates",
            from: "TEST-GRAPH-TRACE-001",
            to: "SCEN-GRAPH-TRACE-001",
          },
        ],
      });

      const outgoing = await handleKbGraph(prolog, {
        seedIds: ["SCEN-GRAPH-TRACE-001"],
        relationships: ["verified_by"],
        direction: "outgoing",
        depth: 1,
      });
      const incoming = await handleKbGraph(prolog, {
        seedIds: ["SCEN-GRAPH-TRACE-001"],
        relationships: ["validates"],
        direction: "incoming",
        depth: 1,
      });

      const outgoingEdges = outgoing.structuredContent?.edges ?? [];
      const incomingEdges = incoming.structuredContent?.edges ?? [];
      expect(outgoingEdges).toContainEqual({
        type: "verified_by",
        from: "SCEN-GRAPH-TRACE-001",
        to: "TEST-GRAPH-TRACE-002",
      });
      expect(incomingEdges).toContainEqual({
        type: "validates",
        from: "TEST-GRAPH-TRACE-001",
        to: "SCEN-GRAPH-TRACE-001",
      });
    },
    KB_GRAPH_INTEGRATION_TIMEOUT_MS,
  );
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

  test(
    "graph succeeds from isolated core root with repeated calls",
    async () => {
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
    },
    KB_GRAPH_INTEGRATION_TIMEOUT_MS,
  );
});

describe("kb_graph canonical traceability chain traversal", () => {
  let prolog: RealPrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    prolog = new RealPrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
    testKbPath = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-graph-chain-"));
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

  test(
    "traverses canonical chain: requirement → scenario → test",
    async () => {
      // Set up the canonical authored chain:
      // REQ-CHAIN-001 --specified_by--> SCEN-CHAIN-001 --verified_by--> TEST-CHAIN-001
      // TEST-CHAIN-001 --validates--> SCEN-CHAIN-001
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-CHAIN-001",
        properties: { title: "Chain requirement", status: "open" },
      });
      await handleKbUpsert(prolog, {
        type: "scenario",
        id: "SCEN-CHAIN-001",
        properties: { title: "Chain scenario", status: "active" },
      });
      await handleKbUpsert(prolog, {
        type: "test",
        id: "TEST-CHAIN-001",
        properties: { title: "Chain test", status: "passing" },
      });

      // Link requirement → scenario
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-CHAIN-001",
        properties: { title: "Chain requirement", status: "open" },
        relationships: [
          { type: "specified_by", from: "REQ-CHAIN-001", to: "SCEN-CHAIN-001" },
        ],
      });

      // Link scenario → test (verified_by)
      await handleKbUpsert(prolog, {
        type: "scenario",
        id: "SCEN-CHAIN-001",
        properties: { title: "Chain scenario", status: "active" },
        relationships: [
          { type: "verified_by", from: "SCEN-CHAIN-001", to: "TEST-CHAIN-001" },
        ],
      });

      // Link test → scenario (validates)
      await handleKbUpsert(prolog, {
        type: "test",
        id: "TEST-CHAIN-001",
        properties: { title: "Chain test", status: "passing" },
        relationships: [
          { type: "validates", from: "TEST-CHAIN-001", to: "SCEN-CHAIN-001" },
        ],
      });

      // Depth-2 traversal from requirement should reach test through scenario
      const result = await handleKbGraph(prolog, {
        seedIds: ["REQ-CHAIN-001"],
        relationships: ["specified_by", "verified_by", "validates"],
        direction: "outgoing",
        depth: 2,
      });

      const nodes = result.structuredContent?.nodes ?? [];
      const edges = result.structuredContent?.edges ?? [];
      const nodeIds = nodes
        .map((n) => (n as Record<string, unknown>).id)
        .filter(Boolean) as string[];

      // All three entities should be discovered via chain traversal
      expect(nodeIds).toContain("REQ-CHAIN-001");
      expect(nodeIds).toContain("SCEN-CHAIN-001");
      expect(nodeIds).toContain("TEST-CHAIN-001");

      // Edge from requirement to scenario
      expect(edges).toContainEqual({
        type: "specified_by",
        from: "REQ-CHAIN-001",
        to: "SCEN-CHAIN-001",
      });

      // Edge from scenario to test
      expect(edges).toContainEqual({
        type: "verified_by",
        from: "SCEN-CHAIN-001",
        to: "TEST-CHAIN-001",
      });
    },
    KB_GRAPH_INTEGRATION_TIMEOUT_MS,
  );

  test(
    "requirement → test fallback when no scenario present",
    async () => {
      // When no scenario exists, requirement → test via verified_by is the fallback path
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-FALLBACK-001",
        properties: { title: "Fallback requirement", status: "open" },
      });
      await handleKbUpsert(prolog, {
        type: "test",
        id: "TEST-FALLBACK-001",
        properties: { title: "Fallback test", status: "passing" },
      });

      // Direct req → test link (no scenario in between)
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-FALLBACK-001",
        properties: { title: "Fallback requirement", status: "open" },
        relationships: [
          {
            type: "verified_by",
            from: "REQ-FALLBACK-001",
            to: "TEST-FALLBACK-001",
          },
        ],
      });

      const result = await handleKbGraph(prolog, {
        seedIds: ["REQ-FALLBACK-001"],
        relationships: ["specified_by", "verified_by"],
        direction: "outgoing",
        depth: 1,
      });

      const edges = result.structuredContent?.edges ?? [];
      const nodes = result.structuredContent?.nodes ?? [];
      const nodeIds = nodes
        .map((n) => (n as Record<string, unknown>).id)
        .filter(Boolean) as string[];

      // Should have the direct req → test edge
      expect(edges).toContainEqual({
        type: "verified_by",
        from: "REQ-FALLBACK-001",
        to: "TEST-FALLBACK-001",
      });

      // Both entities reachable
      expect(nodeIds).toContain("REQ-FALLBACK-001");
      expect(nodeIds).toContain("TEST-FALLBACK-001");

      // No scenario entity in the result
      expect(nodeIds).not.toContain(expect.stringMatching(/^SCEN-/));
    },
    KB_GRAPH_INTEGRATION_TIMEOUT_MS,
  );

  test(
    "traverses executable_for relationship from symbol to test",
    async () => {
      await handleKbUpsert(prolog, {
        type: "symbol",
        id: "SYM-CHAIN-001",
        properties: { title: "Chain symbol", status: "active" },
      });
      await handleKbUpsert(prolog, {
        type: "test",
        id: "TEST-CHAIN-SYM-001",
        properties: { title: "Chain symbol test", status: "passing" },
      });

      const relResult = await prolog.query(
        "kb_assert_relationship(executable_for, 'SYM-CHAIN-001', 'TEST-CHAIN-SYM-001', [])",
      );
      expect(relResult.success).toBe(true);

      const result = await handleKbGraph(prolog, {
        seedIds: ["SYM-CHAIN-001"],
        relationships: ["executable_for"],
        direction: "outgoing",
        depth: 1,
      });

      const edges = result.structuredContent?.edges ?? [];
      expect(edges).toContainEqual({
        type: "executable_for",
        from: "SYM-CHAIN-001",
        to: "TEST-CHAIN-SYM-001",
      });
    },
    KB_GRAPH_INTEGRATION_TIMEOUT_MS,
  );
});
