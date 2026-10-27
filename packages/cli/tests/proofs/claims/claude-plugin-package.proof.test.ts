import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import type { SourceSpec } from "../../../src/public/proof-sources.js";

// implements REQ-claude-plugin-package

/**
 * What the published kibi-claude package contains.
 * Each certificate reads a package file and proves one claim of REQ-claude-plugin-package.
 */
const WORKSPACE = `${import.meta.dir}/../../../../..`;

/** The kibi-claude package must publish its .claude-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories. */
export function claudePublishedPartsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-claude-published-parts" });
}

/** The kibi-claude plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills. */
export function claudeSkillsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-claude-skills" });
}

/** The kibi MCP server in the kibi-claude MCP configuration must run only the bundled MCP launcher. */
export function claudeMcpLauncherCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-claude-mcp-launcher" });
}

/** The kibi-claude hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks. */
export function claudeLifecycleHooksCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-claude-lifecycle-hooks" });
}

/** What each source holds, checked the way Kibi checks the claim's fact. */
async function expectSource(source: SourceSpec, operator: string, members: string[]) {
  const read = new Set((await readProjectSource(source, WORKSPACE)).members);
  if (operator === "eq") expect([...read].sort()).toEqual([...members].sort());
  if (operator === "includes" || operator === "eq") for (const m of members) expect(read.has(m)).toBe(true);
  if (operator === "subset_of") for (const m of read) expect(members).toContain(m);
  if (operator === "excludes") for (const m of members) expect(read.has(m)).toBe(false);
}

describe("What the published kibi-claude package contains", () => {
  test("The kibi-claude package must publish its .claude-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories", async () => {
    writeCodeCertificate(claudePublishedPartsCertificate());
    await expectSource({"reader": "json", "file": "packages/claude/package.json", "path": "/files", "select": "items"}, "includes", [".claude-plugin", ".mcp.json", "bin", "hooks", "skills"]);
  });
  test("The kibi-claude plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills", async () => {
    writeCodeCertificate(claudeSkillsCertificate());
    await expectSource({"reader": "glob", "pattern": "packages/claude/skills/*/SKILL.md", "capture": true}, "includes", ["kibi-bootstrap", "kibi-commit-review", "kibi-decisions", "kibi-freshness", "kibi-traceability", "kibi-usage"]);
  });
  test("The kibi MCP server in the kibi-claude MCP configuration must run only the bundled MCP launcher", async () => {
    writeCodeCertificate(claudeMcpLauncherCertificate());
    await expectSource({"reader": "json", "file": "packages/claude/.mcp.json", "path": "/mcpServers/kibi/args", "select": "items"}, "eq", ["${CLAUDE_PLUGIN_ROOT}/bin/mcp-launcher.cjs"]);
  });
  test("The kibi-claude hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks", async () => {
    writeCodeCertificate(claudeLifecycleHooksCertificate());
    await expectSource({"reader": "json", "file": "packages/claude/hooks/hooks.json", "path": "/hooks", "select": "keys"}, "includes", ["PostToolUse", "PreToolUse", "SessionStart", "Stop", "UserPromptSubmit"]);
  });
});
