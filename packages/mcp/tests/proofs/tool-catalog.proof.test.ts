import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "kibi-cli/proof-certificates";
import { OPTIONAL_TOOL_NAMES, TOOLS } from "../../src/tools-config.js";

// implements REQ-kibi-mcp-tool-catalog

/**
 * The size and members of the MCP tool registry. Kibi reads TOOLS and
 * OPTIONAL_TOOL_NAMES itself at ingest (value_source and domain_source), so
 * each certificate is checked against the registry, not the numbers here.
 */

/** The default Kibi MCP tool catalog shall hold 16 tools. */
export function mcpDefaultToolCountCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-mcp-default-tool-count",
    variable: "default_tool_count",
    valueType: "int",
    assumptions: [{ operator: "eq", value: TOOLS.length }],
    claim: { operator: "eq", value: 16 },
  });
}

/** The optional Kibi MCP tools shall be kb_sparql_remote and kb_job_status. */
export async function mcpOptionalToolsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-mcp-optional-tools",
    domain: {
      symbolId: "SYM-mcp-optional-tool-names",
      members: [...OPTIONAL_TOOL_NAMES],
    },
    check: (name) => {
      expect(TOOLS.some((tool) => tool.name === name)).toBe(false);
    },
  });
}

describe("the MCP tool registry", () => {
  test("the default catalog holds 16 tools", () => {
    writeCodeCertificate(mcpDefaultToolCountCertificate());
    expect(TOOLS).toHaveLength(16);
  });

  test("the optional tools are kb_sparql_remote and kb_job_status", async () => {
    writeCodeCertificate(await mcpOptionalToolsCertificate());
    expect([...OPTIONAL_TOOL_NAMES].sort()).toEqual([
      "kb_job_status",
      "kb_sparql_remote",
    ]);
  });
});
