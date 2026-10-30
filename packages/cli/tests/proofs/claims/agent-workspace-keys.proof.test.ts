import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { KIBI_WORKSPACE_ENV_KEYS } from "../../../../claude/src/workspace-optin.js";
import { KIBI_WORKSPACE_ARGUMENT } from "../../../../agent-core/src/kb-mcp-tools.js";

// implements REQ-agent-workspace-opt-in-keys

/**
 * The environment variables an agent plugin reads the Kibi workspace from, and the tool argument it passes the workspace in. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A Claude plugin workspace variable shall be KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT. */
export async function claudeWorkspaceEnvKeysCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-claude-workspace-env-keys",
    domain: {
      symbolId: "SYM-claude-KIBI_WORKSPACE_ENV_KEYS",
      members: [...KIBI_WORKSPACE_ENV_KEYS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** An agent host shall pass the workspace to Kibi tools as workspaceRoot. */
export function agentWorkspaceArgumentCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-agent-workspace-argument",
    symbolId: "SYM-agent-core-KIBI_WORKSPACE_ARGUMENT",
    value: KIBI_WORKSPACE_ARGUMENT,
  });
}

describe("Agent plugin workspace variables", () => {
  test("A Claude plugin workspace variable shall be KIBI_WORKSPACE, KIBI_PROJECT_ROOT or KIBI_ROOT", async () => {
    writeCodeCertificate(await claudeWorkspaceEnvKeysCertificate());
    expect([...KIBI_WORKSPACE_ENV_KEYS].sort()).toEqual([
      "KIBI_PROJECT_ROOT",
      "KIBI_ROOT",
      "KIBI_WORKSPACE",
    ]);
  });

  test("An agent host shall pass the workspace to Kibi tools as workspaceRoot", () => {
    writeCodeCertificate(agentWorkspaceArgumentCertificate());
    expect(KIBI_WORKSPACE_ARGUMENT).toBe("workspaceRoot");
  });
});
