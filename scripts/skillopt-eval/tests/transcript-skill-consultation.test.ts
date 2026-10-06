import { describe, expect, test } from "bun:test";
import { transcriptOrdering } from "../runtime/transcript-evidence";

describe("governing consultation excludes skill discovery", () => {
  for (const action of ["list", "load", "read"]) {
    test(`${action} does not count as governing consultation`, () => {
      const events = [
        {
          type: "item.completed",
          item: {
            id: "skills",
            type: "mcp_tool_call",
            tool: "kb_skills",
            arguments: { action },
          },
        },
        {
          type: "item.completed",
          item: {
            id: "edit",
            type: "file_change",
            changes: [{ path: "src/example.ts" }],
          },
        },
      ];
      const result = transcriptOrdering(
        events.map((event) => JSON.stringify(event)).join("\n"),
      );
      expect(result.kibiCallsBeforeFirstEdit).toBe(0);
      expect(result.firstKbSearchIndex).toBeNull();
      expect(result.firstEditIndex).toBe(1);
    });

    test(`${action} preserves the count of subsequent governing lookups`, () => {
      const events = [
        {
          type: "item.completed",
          item: {
            id: "skills",
            type: "mcp_tool_call",
            tool: "kb_skills",
            arguments: { action },
          },
        },
        {
          type: "item.completed",
          item: { id: "search", type: "mcp_tool_call", tool: "kb_search" },
        },
        {
          type: "item.completed",
          item: { id: "query", type: "mcp_tool_call", tool: "kb_query" },
        },
        {
          type: "item.completed",
          item: {
            id: "edit",
            type: "file_change",
            changes: [{ path: "src/example.ts" }],
          },
        },
      ];
      const result = transcriptOrdering(
        events.map((event) => JSON.stringify(event)).join("\n"),
      );
      expect(result.kibiCallsBeforeFirstEdit).toBe(2);
      expect(result.firstKbSearchIndex).toBe(1);
      expect(result.firstEditIndex).toBe(3);
    });
  }
});
