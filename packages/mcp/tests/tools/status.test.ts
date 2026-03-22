import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbStatus } from "../../src/tools/status.js";

describe("MCP status tool handler", () => {
  test("returns branch, snapshot, and freshness metadata", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "feature/discovery-bundle",
          snapshotId: "stamp:123",
          syncedAt: "2026-03-22T12:00:00Z",
          dirty: false,
          syncState: "fresh",
          kbPath: ".kb/branches/feature-discovery-bundle",
        }),
      },
    }));

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbStatus(prolog, {});

    expect(result.structuredContent?.branch).toBe("feature/discovery-bundle");
    expect(result.structuredContent?.snapshotId).toBe("stamp:123");
    expect(result.structuredContent?.dirty).toBe(false);
    expect(result.content[0]?.text).toContain("fresh");
  });

  test("includes dirty flag in human-readable status text", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "main",
          snapshotId: "stamp:456",
          syncedAt: "2026-03-22T13:00:00Z",
          dirty: true,
          syncState: "stale",
        }),
      },
    }));

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbStatus(prolog, {});

    expect(result.content[0]?.text).toContain("dirty=true");
    expect(result.content[0]?.text).toContain("stale");
  });
});
