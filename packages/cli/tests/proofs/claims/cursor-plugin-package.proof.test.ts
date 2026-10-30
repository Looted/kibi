import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import type { SourceSpec } from "../../../src/public/proof-sources.js";

// implements REQ-cursor-plugin-package

/**
 * What the published kibi-cursor package contains.
 * Each certificate reads a package file and proves one claim of REQ-cursor-plugin-package.
 */
const WORKSPACE = `${import.meta.dir}/../../../../..`;

/** The kibi-cursor package must publish its .cursor-plugin manifest directory, its mcp.json configuration and its bin, hooks, skills, rules and commands directories. */
export function cursorPublishedPartsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-published-parts" });
}

/** The kibi-cursor plugin manifest must declare the skills, rules, commands, hooks and mcpServers fields. */
export function cursorManifestFieldsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-manifest-fields" });
}

/** The kibi-cursor plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills. */
export function cursorSkillsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-skills" });
}

/** The kibi-cursor plugin must ship the kibi-traceability and kibi-workflow rules. */
export function cursorRulesCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-rules" });
}

/** The kibi-cursor plugin must ship a kibi-bootstrap command. */
export function cursorCommandsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-commands" });
}

/** The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder. */
export function cursorMcpLauncherCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-mcp-launcher" });
}

/** The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks. */
export function cursorLifecycleHooksCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-lifecycle-hooks" });
}

/** The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies. */
export function cursorPeerDependenciesCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-peer-dependencies" });
}

/** What each source holds, checked the way Kibi checks the claim's fact. */
async function expectSource(
  source: SourceSpec,
  operator: string,
  members: string[],
) {
  const read = new Set((await readProjectSource(source, WORKSPACE)).members);
  if (operator === "eq") expect([...read].sort()).toEqual([...members].sort());
  if (operator === "includes" || operator === "eq")
    for (const m of members) expect(read.has(m)).toBe(true);
  if (operator === "subset_of")
    for (const m of read) expect(members).toContain(m);
  if (operator === "excludes")
    for (const m of members) expect(read.has(m)).toBe(false);
}

describe("What the published kibi-cursor package contains", () => {
  test("The kibi-cursor package must publish its .cursor-plugin manifest directory, its mcp.json configuration and its bin, hooks, skills, rules and commands directories", async () => {
    writeCodeCertificate(cursorPublishedPartsCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/cursor/package.json",
        path: "/files",
        select: "items",
      },
      "includes",
      [
        ".cursor-plugin",
        "bin",
        "commands",
        "hooks",
        "mcp.json",
        "rules",
        "skills",
      ],
    );
  });
  test("The kibi-cursor plugin manifest must declare the skills, rules, commands, hooks and mcpServers fields", async () => {
    writeCodeCertificate(cursorManifestFieldsCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/cursor/.cursor-plugin/plugin.json",
        path: "",
        select: "keys",
      },
      "includes",
      ["commands", "hooks", "mcpServers", "rules", "skills"],
    );
  });
  test("The kibi-cursor plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills", async () => {
    writeCodeCertificate(cursorSkillsCertificate());
    await expectSource(
      {
        reader: "glob",
        pattern: "packages/cursor/skills/*/SKILL.md",
        capture: true,
      },
      "includes",
      [
        "kibi-bootstrap",
        "kibi-commit-review",
        "kibi-decisions",
        "kibi-freshness",
        "kibi-traceability",
        "kibi-usage",
      ],
    );
  });
  test("The kibi-cursor plugin must ship the kibi-traceability and kibi-workflow rules", async () => {
    writeCodeCertificate(cursorRulesCertificate());
    await expectSource(
      { reader: "glob", pattern: "packages/cursor/rules/*.mdc", capture: true },
      "includes",
      ["kibi-traceability", "kibi-workflow"],
    );
  });
  test("The kibi-cursor plugin must ship a kibi-bootstrap command", async () => {
    writeCodeCertificate(cursorCommandsCertificate());
    await expectSource(
      {
        reader: "glob",
        pattern: "packages/cursor/commands/*.md",
        capture: true,
      },
      "includes",
      ["kibi-bootstrap"],
    );
  });
  test("The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder", async () => {
    writeCodeCertificate(cursorMcpLauncherCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/cursor/mcp.json",
        path: "/mcpServers/kibi/args",
        select: "items",
      },
      "eq",
      ["${CURSOR_PLUGIN_ROOT}/bin/launch-kibi-mcp.mjs", "${workspaceFolder}"],
    );
  });
  test("The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks", async () => {
    writeCodeCertificate(cursorLifecycleHooksCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/cursor/hooks/hooks.json",
        path: "/hooks",
        select: "keys",
      },
      "includes",
      [
        "beforeReadFile",
        "beforeSubmitPrompt",
        "postToolUse",
        "preToolUse",
        "sessionStart",
        "stop",
      ],
    );
  });
  test("The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies", async () => {
    writeCodeCertificate(cursorPeerDependenciesCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/cursor/package.json",
        path: "/peerDependencies",
        select: "keys",
      },
      "eq",
      ["kibi-cli", "kibi-mcp"],
    );
  });
});
