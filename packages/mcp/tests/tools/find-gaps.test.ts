import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbFindGaps } from "../../src/tools/find-gaps.js";

describe("MCP find-gaps tool handler", () => {
  test("returns matching rows with relationship counts", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          rows: [
            {
              id: "REQ-001",
              type: "req",
              title: "User authentication",
              status: "open",
              missingRelationships: ["specified_by"],
              presentRelationships: [],
              relationshipCounts: { specified_by: 0, verified_by: 1 },
              source: "documentation/requirements/REQ-001.md",
            },
          ],
          count: 1,
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
    const result = await handleKbFindGaps(prolog, {
      type: "req",
      missingRelationships: ["specified_by"],
    });

    expect(result.structuredContent?.count).toBe(1);
    expect(result.structuredContent?.rows[0]?.id).toBe("REQ-001");
    expect(result.content[0]?.text).toContain("REQ-001");
  });
});
