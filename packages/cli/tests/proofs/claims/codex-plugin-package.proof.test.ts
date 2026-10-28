import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import type { SourceSpec } from "../../../src/public/proof-sources.js";

// implements REQ-codex-plugin-package

/**
 * What the published kibi-codex package contains.
 * Each certificate reads a package file and proves one claim of REQ-codex-plugin-package.
 */
const WORKSPACE = `${import.meta.dir}/../../../../..`;

/** The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories. */
export function codexPublishedPartsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-codex-published-parts" });
}

/** The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields. */
export function codexManifestFieldsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-codex-manifest-fields" });
}

/** The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills. */
export function codexSkillsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-codex-skills" });
}

/** The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks. */
export function codexLifecycleHooksCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-codex-lifecycle-hooks" });
}

/** The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies. */
export function codexPeerDependenciesCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-codex-peer-dependencies" });
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

describe("What the published kibi-codex package contains", () => {
  test("The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories", async () => {
    writeCodeCertificate(codexPublishedPartsCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/codex/package.json",
        path: "/files",
        select: "items",
      },
      "includes",
      [".codex-plugin", ".mcp.json", "bin", "hooks", "skills"],
    );
  });
  test("The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields", async () => {
    writeCodeCertificate(codexManifestFieldsCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/codex/.codex-plugin/plugin.json",
        path: "",
        select: "keys",
      },
      "includes",
      ["hooks", "mcpServers", "skills"],
    );
  });
  test("The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills", async () => {
    writeCodeCertificate(codexSkillsCertificate());
    await expectSource(
      {
        reader: "glob",
        pattern: "packages/codex/skills/*/SKILL.md",
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
  test("The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks", async () => {
    writeCodeCertificate(codexLifecycleHooksCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/codex/hooks/hooks.json",
        path: "/hooks",
        select: "keys",
      },
      "includes",
      ["PostToolUse", "PreToolUse", "SessionStart", "Stop", "UserPromptSubmit"],
    );
  });
  test("The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies", async () => {
    writeCodeCertificate(codexPeerDependenciesCertificate());
    await expectSource(
      {
        reader: "json",
        file: "packages/codex/package.json",
        path: "/peerDependencies",
        select: "keys",
      },
      "eq",
      ["kibi-cli", "kibi-mcp"],
    );
  });
});
