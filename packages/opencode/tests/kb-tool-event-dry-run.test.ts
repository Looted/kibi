import { describe, expect, it } from "bun:test";
import {
  type KibiEventEnv,
  handleKbToolEvent,
} from "../src/smart-enforcement-events.js";

function envRecording(tools: string[]): KibiEventEnv {
  return {
    input: { worktree: "/repo", sessionId: "s1" },
    rootWorkContext: { branch: "main" },
    freshnessStore: {
      recordToolEvidence: (_scope: unknown, tool: string) => {
        tools.push(tool);
      },
    },
    log: { info: () => {}, warn: () => {} },
  } as unknown as KibiEventEnv;
}

describe("kb tool evidence", () => {
  it("records a dry-run upsert as validation, not a KB mutation", () => {
    const tools: string[] = [];
    const env = envRecording(tools);
    handleKbToolEvent(
      env,
      {
        type: "tool.execute.after",
        properties: { tool: "kb_upsert", args: { dryRun: true } },
      } as never,
      "s1",
    );
    handleKbToolEvent(
      env,
      {
        type: "tool.execute.after",
        properties: { tool: "kb_upsert", args: { id: "REQ-x" } },
      } as never,
      "s1",
    );
    expect(tools).toEqual(["kb_validate_upsert", "kb_upsert"]);
  });
});
