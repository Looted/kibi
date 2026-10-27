import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import type { SourceSpec } from "../../../src/public/proof-sources.js";

// implements REQ-cursor-agent-plugin-package

/**
 * The layout and fields of the kibi-cursor portable Agent Plugin artifact.
 * Each certificate reads an artifact file and proves one claim of REQ-cursor-agent-plugin-package.
 */
const WORKSPACE = `${import.meta.dir}/../../../../..`;

/** The kibi-cursor package must publish its agent-plugin directory alongside its .cursor-plugin manifest directory. */
export function agentPluginPublishedCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-agent-plugin-published" });
}

/** The root plugin.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 plugin schema. */
export function agentPluginManifestSchemaCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-agent-plugin-plugin-schema" });
}

/** The root plugin.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema, name, version, description, author, homepage, repository, license, keywords and extensions fields. */
export function agentPluginManifestFieldsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-agent-plugin-plugin-fields" });
}

/** The kibi-cursor portable Agent Plugin artifact must package the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills under its skills directory. */
export function agentPluginSkillsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-agent-plugin-skills" });
}

/** The mcp.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 MCP schema. */
export function agentPluginMcpSchemaCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-agent-plugin-mcp-schema" });
}

/** The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields. */
export function agentPluginMcpFieldsCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-cursor-agent-plugin-mcp-fields" });
}

/** What each source holds, checked the way Kibi checks the claim's fact. */
async function expectSource(source: SourceSpec, operator: string, members: string[]) {
  const read = new Set((await readProjectSource(source, WORKSPACE)).members);
  if (operator === "eq") expect([...read].sort()).toEqual([...members].sort());
  if (operator === "includes" || operator === "eq") for (const m of members) expect(read.has(m)).toBe(true);
  if (operator === "subset_of") for (const m of read) expect(members).toContain(m);
  if (operator === "excludes") for (const m of members) expect(read.has(m)).toBe(false);
}

describe("The layout and fields of the kibi-cursor portable Agent Plugin artifact", () => {
  test("The kibi-cursor package must publish its agent-plugin directory alongside its .cursor-plugin manifest directory", async () => {
    writeCodeCertificate(agentPluginPublishedCertificate());
    await expectSource({"reader": "json", "file": "packages/cursor/package.json", "path": "/files", "select": "items"}, "includes", [".cursor-plugin", "agent-plugin"]);
  });
  test("The root plugin.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 plugin schema", async () => {
    writeCodeCertificate(agentPluginManifestSchemaCertificate());
    await expectSource({"reader": "json", "file": "packages/cursor/agent-plugin/plugin.json", "path": "/$schema"}, "eq", ["https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"]);
  });
  test("The root plugin.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema, name, version, description, author, homepage, repository, license, keywords and extensions fields", async () => {
    writeCodeCertificate(agentPluginManifestFieldsCertificate());
    await expectSource({"reader": "json", "file": "packages/cursor/agent-plugin/plugin.json", "path": "", "select": "keys"}, "subset_of", ["$schema", "author", "description", "extensions", "homepage", "keywords", "license", "name", "repository", "version"]);
  });
  test("The kibi-cursor portable Agent Plugin artifact must package the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills under its skills directory", async () => {
    writeCodeCertificate(agentPluginSkillsCertificate());
    await expectSource({"reader": "glob", "pattern": "packages/cursor/agent-plugin/skills/*/SKILL.md", "capture": true}, "includes", ["kibi-bootstrap", "kibi-commit-review", "kibi-decisions", "kibi-freshness", "kibi-traceability", "kibi-usage"]);
  });
  test("The mcp.json of the kibi-cursor portable Agent Plugin artifact must declare the Agent Plugins 1.0.0 MCP schema", async () => {
    writeCodeCertificate(agentPluginMcpSchemaCertificate());
    await expectSource({"reader": "json", "file": "packages/cursor/agent-plugin/mcp.json", "path": "/$schema"}, "eq", ["https://agent-plugins.org/schemas/1.0.0/mcp.schema.json"]);
  });
  test("The mcp.json of the kibi-cursor portable Agent Plugin artifact must use only the $schema and mcpServers fields", async () => {
    writeCodeCertificate(agentPluginMcpFieldsCertificate());
    await expectSource({"reader": "json", "file": "packages/cursor/agent-plugin/mcp.json", "path": "", "select": "keys"}, "subset_of", ["$schema", "mcpServers"]);
  });
});
