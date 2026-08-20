/**
 * Isolated MCP mutation tests call upsert/delete against the host workspace
 * or a non-git temp directory. GitHub Actions checkouts are detached HEAD,
 * and Kibi no longer infers a branch. Isolated bun processes also cannot
 * inherit KIBI_BRANCH from a sibling file.
 *
 * Import this helper only from mutation tests that need a synthetic identity.
 * Do not preload it for the whole MCP suite: spawn/session tests must keep
 * the Git identity of their temporary repositories.
 *
 * Tests that exercise branch resolution must set or clear KIBI_BRANCH after
 * this helper runs.
 */
export const MCP_UNIT_TEST_BRANCH = "mcp-unit-test";

export function ensureMcpUnitTestBranchIdentity(): void {
  if (!process.env.KIBI_BRANCH?.trim()) {
    process.env.KIBI_BRANCH = MCP_UNIT_TEST_BRANCH;
  }
}

ensureMcpUnitTestBranchIdentity();
