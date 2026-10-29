import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { WORKSPACE_ROOT_ARGUMENT } from "../../../../mcp/src/server/workspace-router.js";

// implements REQ-mcp-workspace-root-argument

/**
 * The tool argument the MCP server routes a call to a workspace by. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** The MCP server shall route a call by its workspaceRoot argument. */
export function mcpWorkspaceRootArgumentCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-mcp-workspace-root-argument",
    symbolId: "SYM-mcp-WORKSPACE_ROOT_ARGUMENT",
    value: WORKSPACE_ROOT_ARGUMENT,
  });
}

describe("MCP workspace root argument", () => {
  test("The MCP server shall route a call by its workspaceRoot argument", () => {
    writeCodeCertificate(mcpWorkspaceRootArgumentCertificate());
    expect(WORKSPACE_ROOT_ARGUMENT).toBe("workspaceRoot");
  });
});
