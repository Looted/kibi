/// <reference types="bun-types" />
import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Agent Surface Policy Test
 *
 * This test enforces that agent-facing guidance never instructs
 * direct `kibi` CLI commands. Agents must use MCP tools only.
 *
 * Policy requirements:
 * 1. Agent-visible guidance must never instruct direct `kibi` CLI commands
 * 2. Guidance should explicitly prefer public MCP tools (kb_query, kb_upsert, kb_delete, kb_check)
 * 3. Bootstrap guidance should say to ask user/operator for setup if /init-kibi is insufficient
 * 4. /init-kibi is the only allowed kibi-related command in agent-facing content
 */

// Get repo root by going up from packages/opencode/tests
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, "..", "..", "..");

describe("agent surface policy", () => {
  // Agent-facing files that must comply with MCP-only policy
  const agentFacingFiles = [
    "packages/opencode/src/prompt.ts",
    "packages/opencode/README.md",
    "AGENTS.md",
    ".github/copilot-instructions.md",
    "docs/prompts/llm-rules.md",
    "documentation/requirements/REQ-opencode-kibi-plugin-v1.md",
    "documentation/requirements/REQ-opencode-agent-mcp-only.md",
    "documentation/scenarios/SCEN-010.md",
    "documentation/scenarios/SCEN-opencode-enforcement.md",
    "documentation/scenarios/SCEN-opencode-agent-mcp-only.md",
    "documentation/tests/TEST-opencode-kibi-plugin-v1.md",
    "documentation/tests/TEST-opencode-agent-mcp-only.md",
  ];

  // Forbidden CLI commands - these should never appear in agent-facing guidance
  const forbiddenCommands = [
    "kibi sync",
    "kibi init",
    "kibi doctor",
    "kibi query",
    "kibi upsert",
    "kibi check",
    "kibi branch",
    "kibi gc",
  ];

  // The only allowed kibi command reference in agent-facing content
  const allowedCommand = "/init-kibi";

  for (const relativePath of agentFacingFiles) {
    const fullPath = path.join(repoRoot, relativePath);

    test(`file exists: ${relativePath}`, () => {
      // Only check existence for files that are required to exist
      // Some files may be created later (documentation files)
      const exists = fs.existsSync(fullPath);
      if (!exists) {
        // Skip non-existent documentation files (they may not be created yet)
        if (relativePath.startsWith("documentation/")) {
          return;
        }
      }
      assert.ok(
        exists,
        `Required agent-facing file should exist: ${relativePath}`,
      );
    });

    test(`no forbidden CLI commands: ${relativePath}`, () => {
      if (!fs.existsSync(fullPath)) {
        // Skip if file doesn't exist
        return;
      }

      const content = fs.readFileSync(fullPath, "utf-8");

      for (const cmd of forbiddenCommands) {
        const msg = `${relativePath} contains forbidden CLI command "${cmd}". Agents must use MCP tools (kb_query, kb_upsert, kb_delete, kb_check) only. Only "/init-kibi" is allowed as an agent-facing command reference.`;
        assert.ok(!content.includes(cmd), msg);
      }
    });

    test(`allows /init-kibi: ${relativePath}`, () => {
      if (!fs.existsSync(fullPath)) {
        // Skip if file doesn't exist
        return;
      }

      const content = fs.readFileSync(fullPath, "utf-8");

      // The file should mention /init-kibi somewhere (except README which is user-facing)
      if (!relativePath.includes("README")) {
        // This is a soft check - not all files need to mention it
        // but we want to verify the pattern is allowed
      }

      // Verify /init-kibi is present if the file discusses bootstrap
      if (content.includes("bootstrap") || content.includes("init")) {
        const hasAllowedCmd = content.includes(allowedCommand);
        const hasNoKibiRefs =
          !content.includes("kibi") && !content.includes("KB");
        const msg = `${relativePath} discusses bootstrap but does not mention ${allowedCommand}. Agent-facing files should guide users to /init-kibi for bootstrapping.`;
        assert.ok(hasAllowedCmd || hasNoKibiRefs, msg);
      }
    });
  }

  test("policy allows explicit MCP tool references", () => {
    // This test validates the allowed patterns
    const promptPath = path.join(repoRoot, "packages/opencode/src/prompt.ts");
    if (!fs.existsSync(promptPath)) {
      return;
    }

    const content = fs.readFileSync(promptPath, "utf-8");

    // Should mention MCP tools
    assert.ok(
      content.includes("kb_query"),
      "prompt.ts should reference kb_query MCP tool",
    );
    assert.ok(
      content.includes("kb_upsert"),
      "prompt.ts should reference kb_upsert MCP tool",
    );
    assert.ok(
      content.includes("kb_delete"),
      "prompt.ts should reference kb_delete MCP tool",
    );
    assert.ok(
      content.includes("kb_check"),
      "prompt.ts should reference kb_check MCP tool",
    );
  });

  test("bootstrap guidance asks user/operator for setup if /init-kibi insufficient", () => {
    const promptPath = path.join(repoRoot, "packages/opencode/src/prompt.ts");
    if (!fs.existsSync(promptPath)) {
      return;
    }

    const content = fs.readFileSync(promptPath, "utf-8");

    // Check that bootstrap guidance mentions asking user/operator
    if (content.includes("Bootstrap required")) {
      assert.ok(
        content.includes("user/operator") ||
          content.includes("ask the user") ||
          content.includes("ask user"),
        "Bootstrap guidance should instruct agents to ask user/operator for setup if /init-kibi is insufficient",
      );
    }
  });

  test("traceability comments reference correct requirement IDs", () => {
    const promptPath = path.join(repoRoot, "packages/opencode/src/prompt.ts");
    if (!fs.existsSync(promptPath)) {
      return;
    }

    const content = fs.readFileSync(promptPath, "utf-8");

    // Check for traceability comments with the required requirement IDs
    assert.ok(
      content.includes("REQ-opencode-kibi-plugin-v1"),
      "prompt.ts should reference REQ-opencode-kibi-plugin-v1 in traceability",
    );
    assert.ok(
      content.includes("REQ-opencode-agent-mcp-only"),
      "prompt.ts should reference REQ-opencode-agent-mcp-only in traceability",
    );
  });
});
