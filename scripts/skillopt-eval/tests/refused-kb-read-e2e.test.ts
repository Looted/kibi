import { describe, expect, test } from "bun:test";
import { claudeStreamToCodexJsonl } from "../runtime/claude-code-host";
import { deniedReadScore } from "../runtime/codex-episode";
import { normalizeCodexJsonl } from "../runtime/codex-events";
import type { CellReceipt } from "../scoring/cell";

// TEST-skillopt-refused-kb-read-not-critical

const RESULT = {
  type: "result",
  subtype: "success",
  is_error: false,
  num_turns: 2,
  total_cost_usd: 0.01,
  structured_output: { completed: true, answer: "Split recorded." },
  usage: { input_tokens: 1, output_tokens: 1 },
};

const CELL = {
  score: 100,
  components: { finalState: 60, protocol: 25, isolation: 15 },
} as unknown as CellReceipt;

function hostStream(readResult: Record<string, unknown>): string {
  return `${[
    {
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            id: "read-1",
            name: "Read",
            input: { file_path: "/w/.kb/requirements/REQ-a.md" },
          },
        ],
      },
    },
    {
      type: "user",
      message: {
        content: [
          { type: "tool_result", tool_use_id: "read-1", ...readResult },
        ],
      },
    },
    RESULT,
  ]
    .map((event) => JSON.stringify(event))
    .join("\n")}\n`;
}

function scoreFromHost(readResult: Record<string, unknown>) {
  const normalized = normalizeCodexJsonl(
    claudeStreamToCodexJsonl(hostStream(readResult)),
    { hiddenMarkers: [], forbiddenRoots: [] },
  );
  return {
    violations: normalized.violations,
    score:
      normalized.violations.length > 0
        ? 0
        : deniedReadScore(CELL.score, CELL, normalized.deniedKbReads),
  };
}

describe("refused .kb/ reads (end to end)", () => {
  test("a host-refused .kb/ read costs only the isolation points, and a completed one zeroes the cell", () => {
    // Given a Read of a .kb/ file that the host refused
    const refused = scoreFromHost({
      is_error: true,
      content:
        "<tool_use_error>File is in a directory that is denied by your permission settings.</tool_use_error>",
    });
    // Then it is not direct access and the cell loses only isolation
    expect(refused).toEqual({ violations: [], score: 85 });

    // Given the same Read returning the file
    const completed = scoreFromHost({ content: "---\nid: REQ-a\n---\n" });
    // Then it is direct access and the cell scores 0
    expect(completed).toEqual({ violations: ["direct_kb_access"], score: 0 });
  });
});
