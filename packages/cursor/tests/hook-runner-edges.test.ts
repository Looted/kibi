// implements REQ-cursor-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runHook } from "../src/hook-runner.js";
import { BOOTSTRAP_REMINDER } from "../src/messages.js";

const tempRoots: string[] = [];

function tempRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("cursor hook runner edges", () => {
  test("sessionStart without Kibi config sends only the bootstrap reminder once MCP was observed", async () => {
    const cwd = tempRoot("kibi-cursor-edges-");
    const pluginData = tempRoot("kibi-cursor-edges-data-");
    await runHook(
      {
        hook_event_name: "postToolUse",
        cwd,
        conversation_id: "c1",
        tool_name: "kb_query",
        tool_input: {},
      },
      { pluginData },
    );
    expect(
      await runHook(
        { hook_event_name: "sessionStart", cwd, conversation_id: "c1" },
        { pluginData },
      ),
    ).toStrictEqual({ additional_context: BOOTSTRAP_REMINDER });
  });

  test("postToolUse whose telemetry throws still returns the impact note", async () => {
    const cwd = tempRoot("kibi-cursor-edges-");
    const pluginData = tempRoot("kibi-cursor-edges-data-");
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");
    let reads = 0;
    const toolInput = {
      // Only the telemetry's read of the path fails.
      get file_path(): string {
        reads += 1;
        if (reads === 1) throw new Error("tool input unreadable");
        return "src/a.ts";
      },
    };
    const result = await runHook(
      {
        hook_event_name: "postToolUse",
        cwd,
        conversation_id: "c2",
        tool_name: "Write",
        tool_input: toolInput,
      },
      { pluginData, env: { KIBI_DIAGNOSTIC_MODE: "1" } },
    );
    expect(reads).toBeGreaterThan(1);
    expect(result).toStrictEqual({
      additional_context:
        'Kibi MCP has not been observed in this session and workspace trust is unknown. Do not probe or execute a CLI fallback; ask the operator to enable MCP or explicitly approve the trusted project-local CLI workflow.\nKibi impact review: run kb_check({sourceFiles:["src/a.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) while this edit is fresh.\nCheck symbol granularity and whether linked requirements, scenarios, and tests still cover the changed behavior.\nPrefer symbol manifest + executable_for or // implements REQ-<area>-<behavior> for traceability.',
    });
  });
});
