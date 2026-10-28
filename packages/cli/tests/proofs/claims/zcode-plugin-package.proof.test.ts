import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import type { SourceSpec } from "../../../src/public/proof-sources.js";

// implements REQ-zcode-plugin-package

/**
 * The kibi-zcode package parts, proved against the files the package ships.
 * Kibi reads each source itself at ingest; the tests check the same reads.
 */
const WORKSPACE = `${import.meta.dir}/../../../../..`;

/** The kibi-zcode plugin manifest must declare the skills, commands, hooks and mcpServers fields. */
export function zcodeManifestFieldsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-zcode-manifest-fields" });
}

/** The kibi-zcode plugin must ship a kibi-bootstrap command. */
export function zcodeCommandsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-zcode-commands" });
}

/** The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills. */
export function zcodeSkillsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-zcode-skills" });
}

/** The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher. */
export function zcodeMcpLauncherCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-zcode-mcp-launcher" });
}

/** The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks. */
export function zcodeLifecycleHooksCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-zcode-lifecycle-hooks" });
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

describe("The kibi-zcode package parts, proved against the files the package ships", () => {
  test("The kibi-zcode plugin manifest must declare the skills, commands, hooks and mcpServers fields", async () => {
    writeCodeCertificate(zcodeManifestFieldsCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/zcode/.zcode-plugin/plugin.json",
        path: "",
        select: "keys",
      },
      "includes",
      ["commands", "hooks", "mcpServers", "skills"],
    );
  });
  test("The kibi-zcode plugin must ship a kibi-bootstrap command", async () => {
    writeCodeCertificate(zcodeCommandsCertificate());
    await expectSource(
      {
        reader: "glob",
        pattern: "packages/zcode/commands/*.md",
        capture: true,
      },
      "includes",
      ["kibi-bootstrap"],
    );
  });
  test("The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills", async () => {
    writeCodeCertificate(zcodeSkillsCertificate());
    await expectSource(
      {
        reader: "glob",
        pattern: "packages/zcode/skills/*/SKILL.md",
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
  test("The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher", async () => {
    writeCodeCertificate(zcodeMcpLauncherCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/zcode/.zcode-plugin/plugin.json",
        path: "/mcpServers/kibi/args",
        select: "items",
      },
      "eq",
      ["${ZCODE_PLUGIN_ROOT}/bin/mcp-launcher.cjs"],
    );
  });
  test("The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks", async () => {
    writeCodeCertificate(zcodeLifecycleHooksCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/zcode/hooks/hooks.json",
        path: "/hooks",
        select: "keys",
      },
      "includes",
      ["PostToolUse", "PreToolUse", "SessionStart", "Stop", "UserPromptSubmit"],
    );
  });
});
