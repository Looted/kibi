import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import claudePlugin, { adapterKind, packageName } from "../src/index";
import { searchTip, sessionStartContext, stopReminder } from "../src/snippets";
import { appendHookUsage, flushHookTelemetry } from "../src/usage-log";
import { cleanupTempDirs, tempDir } from "./fixture";

afterEach(cleanupTempDirs);

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dir, "..", "package.json"), "utf8"),
) as { name: string; version: string };

describe("package identity", () => {
  test("names the package and adapter kind", () => {
    expect(packageName).toBe("kibi-claude");
    expect(packageName).toBe(packageJson.name);
    expect(adapterKind).toBe("claude-code-plugin");
    expect(claudePlugin).toStrictEqual({
      name: "kibi-claude",
      adapterKind: "claude-code-plugin",
    });
  });
});

describe("Claude Code messages", () => {
  test("the search tip counts linked files", () => {
    expect(searchTip(3)).toBe(
      'Kibi tip: this repository records requirements, scenarios, decisions, and code ownership in a Kibi knowledge base (3 source files have requirement-linked symbols). For intent questions — why code exists, what it must do — kb_search answers from that knowledge, naming the governing requirements, facts, decisions and tests; kb_query({sourceFile:"<path>"}) lists what a file implements.',
    );
  });

  test("the session start context", () => {
    expect(sessionStartContext(2)).toBe(
      [
        "Kibi knowledge base is active in this workspace (2 source files have requirement-linked symbols).",
        "Kibi hooks add short requirement/test snippets (from the symbol manifest) before reads and edits of linked files; kb_query returns the authoritative detail.",
        "A request that conflicts with a recorded requirement or ADR is a question, not a task: name the rule and ask before changing the code or the rule, and change it only when the person says so.",
        "A file with no linked symbols gets a short note; no link is not no rule, so kb_search what it does (permissions, roles, limits, data).",
        "Recording new behavior (requirement, scenario, implements link) is part of the change and needs no permission.",
        "Operations: kb_search (ask it a question; the answer layer names governing requirements, must-stay-true facts, ADRs and tests), kb_query (exact id or sourceFile), kb_check (validation and edit impact), kb_upsert (writes). MCP tool names are host-prefixed (e.g. mcp__plugin_kibi-claude_kibi__kb_query); the project-local CLI (`npx --no-install kibi <route> --input -`) is the peer route.",
        "Workflow guidance lives in the kibi-claude:kibi-usage skill (also served by kb_skills with action load).",
      ].join("\n"),
    );
  });

  test("the stop reminder for one file", () => {
    expect(stopReminder(["src/a.ts"])).toBe(
      'Kibi: 1 source file changed this session without a Kibi impact check: src/a.ts.\nkb_check({sourceFiles:["src/a.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports requirement ownership, stale traceability, and symbol-manifest drift for it. If the change has no KB impact, a one-line no-impact rationale in the final report closes this out.',
    );
  });

  test("the stop reminder names at most eight files and counts the rest", () => {
    const eight = Array.from({ length: 8 }, (_, i) => `f${i}`);
    expect(stopReminder(eight)).toBe(
      `Kibi: 8 source files changed this session without a Kibi impact check: ${eight.join(", ")}.\nkb_check({sourceFiles:${JSON.stringify(eight)}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports requirement ownership, stale traceability, and symbol-manifest drift for them. If the change has no KB impact, a one-line no-impact rationale in the final report closes this out.`,
    );
    const ten = [...eight, "f8", "f9"];
    expect(stopReminder(ten)).toBe(
      `Kibi: 10 source files changed this session without a Kibi impact check: ${eight.join(", ")} +2.\nkb_check({sourceFiles:${JSON.stringify(eight)}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports requirement ownership, stale traceability, and symbol-manifest drift for them. If the change has no KB impact, a one-line no-impact rationale in the final report closes this out.`,
    );
  });
});

describe("hook usage rows", () => {
  test("a row names Claude Code and the plugin version", () => {
    const root = tempDir("kibi-claude-usage-");
    appendHookUsage(
      {
        workspaceRoot: root,
        event: "PreToolUse",
        sessionId: "s1",
        hostTool: "Read",
        trace: { action: "read_snippet" },
        startedAt: new Date(),
      },
      { KIBI_DIAGNOSTIC_MODE: "1", KIBI_TELEMETRY: "0" },
    );
    const row = JSON.parse(
      fs.readFileSync(path.join(root, ".kb", "usage.log"), "utf8"),
    ) as Record<string, unknown>;
    expect(row.host).toBe("claude-code");
    expect(row.package_version).toBe(packageJson.version);
    expect(row.hook_action).toBe("read_snippet");
  });

  test("flushing remembers the session for the workspace", async () => {
    const root = tempDir("kibi-claude-flush-root-");
    const telemetryDir = tempDir("kibi-claude-flush-");
    await flushHookTelemetry(
      { event: "PreToolUse", workspaceRoot: root, sessionId: "s1" },
      {
        KIBI_TELEMETRY: "1",
        KIBI_TELEMETRY_DIR: telemetryDir,
        KIBI_TELEMETRY_HOST: "http://127.0.0.1:9",
      },
    );
    expect(fs.readdirSync(telemetryDir).length).toBeGreaterThan(0);
  });
});
