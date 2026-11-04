---
title: 'KB dependencies from git: lock, fetch, status, scoped reads over CLI and MCP, and every refusal'
status: passing
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-04T10:43:11.892Z'
id: TEST-kb-dependencies-git
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kb-dependencies-git-verifier
      target: default
  success_policy: all_required_first_attempt
---
Creates real Git repositories holding Kibi KBs, declares them as dependencies of a project and runs `kibi deps lock`, `kibi deps fetch` and `kibi deps status`; checks tag, branch and commit pins, the detached cached checkout, lock updates, schema 6 and the refusal of older or newer schemas, the scoped `--kb` CLI reads and JSON routes, and that the MCP server answers a `kb` read from a separate routed child for the dependency (packages/cli/tests/dependencies/kb-dependencies.test.ts, packages/cli/tests/dependencies/kb-dependency-commands.test.ts, packages/mcp/tests/server/workspace-router-dependency.test.ts, packages/mcp/tests/server/add-tool-paths.test.ts).