import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbGraph } from "../../src/tools/graph.js";

describe("MCP graph tool handler", () => {
  test("returns bounded traversal results", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          nodes: [
            { id: "REQ-001", type: "req", title: "User authentication", status: "open" },
            { id: "SCEN-001", type: "scenario", title: "Login flow", status: "active" },
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
