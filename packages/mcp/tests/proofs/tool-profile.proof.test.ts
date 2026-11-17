import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "kibi-cli/proof-certificates";
import {
  BOOTSTRAP_TOOLS,
  DEFAULT_PROFILE_TOOLS,
  TOOLS,
} from "../../src/tools-config.js";

/**
 * The tools the default profile lists, and the bootstrap tools it adds while
 * the knowledge base is empty. Kibi reads DEFAULT_PROFILE_TOOLS and
 * BOOTSTRAP_TOOLS itself at ingest (domain_source), so each certificate is
 * checked against the constants, not the names here.
 */

/** The default profile shall list the six core tools. */
export async function mcpDefaultProfileToolsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-mcp-default-profile-tools",
    domain: {
      symbolId: "SYM-mcp-DEFAULT_PROFILE_TOOLS",
      members: [...DEFAULT_PROFILE_TOOLS],
    },
    check: (name) => {
      expect(TOOLS.some((tool) => tool.name === name)).toBe(true);
    },
  });
}

/** An empty knowledge base shall add kb_plan_bootstrap and kb_apply_plan. */
export async function mcpBootstrapToolsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-mcp-bootstrap-tools",
    domain: {
      symbolId: "SYM-mcp-BOOTSTRAP_TOOLS",
      members: [...BOOTSTRAP_TOOLS],
    },
    check: (name) => {
      expect(TOOLS.some((tool) => tool.name === name)).toBe(true);
      expect((DEFAULT_PROFILE_TOOLS as readonly string[]).includes(name)).toBe(
        false,
      );
    },
  });
}

describe("the MCP default tool profile", () => {
  test("the default profile lists the six core tools", async () => {
    writeCodeCertificate(await mcpDefaultProfileToolsCertificate());
    expect([...DEFAULT_PROFILE_TOOLS].sort()).toEqual([
      "kb_check",
      "kb_query",
      "kb_search",
      "kb_skills",
      "kb_status",
      "kb_upsert",
    ]);
  });

  test("an empty knowledge base adds the two bootstrap tools", async () => {
    writeCodeCertificate(await mcpBootstrapToolsCertificate());
    expect([...BOOTSTRAP_TOOLS].sort()).toEqual([
      "kb_apply_plan",
      "kb_plan_bootstrap",
    ]);
  });
});
